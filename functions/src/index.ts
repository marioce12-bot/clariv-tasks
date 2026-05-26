import crypto from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";

initializeApp();

const db = getFirestore();
const messaging = getMessaging();
const graphBase = "https://graph.facebook.com/v20.0";

type UserConfig = {
  pseudo?: string;
  brand_voice?: string;
  style_tone?: string;
  fb_page_id?: string;
  fb_access_token?: string;
  preferred_posting_time?: string;
  fcm_token?: string;
  paused?: boolean;
};

type PostDoc = {
  uid: string;
  text: string;
  media_url?: string;
  media_prompt?: string;
  scheduled_at: Timestamp;
  status: "pending_review" | "approved" | "published" | "failed";
  notified_30min?: boolean;
  notification_sent_at?: Timestamp;
  fb_post_id?: string;
};

export const generatePostFromJournal = onDocumentWritten("journal_entries/{entryId}", async (event) => {
  const after = event.data?.after;
  if (!after?.exists) return;

  const entry = after.data() as { uid?: string; text?: string; processed?: boolean };
  if (!entry.uid || !entry.text || entry.processed) return;

  const user = await getUserConfig(entry.uid);
  const generated = await generatePost(entry.uid, entry.text, user);

  await db.collection("posts").add({
    uid: entry.uid,
    text: generated.text,
    media_url: "",
    media_prompt: generated.mediaPrompt,
    scheduled_at: nextScheduledTimestamp(user?.preferred_posting_time),
    status: "pending_review",
    notified_30min: false,
    createdAt: FieldValue.serverTimestamp()
  });

  await after.ref.set({ processed: true }, { merge: true });
});

export const publicationScheduler = onSchedule("every 10 minutes", async () => {
  const now = Timestamp.now();
  const inThirtyMinutes = Timestamp.fromMillis(Date.now() + 30 * 60 * 1000);
  const fiveMinutesAgo = Timestamp.fromMillis(Date.now() - 5 * 60 * 1000);
  const twentyFiveMinutesAgo = Timestamp.fromMillis(Date.now() - 25 * 60 * 1000);

  const notifySnap = await db
    .collection("posts")
    .where("status", "==", "pending_review")
    .where("notified_30min", "==", false)
    .where("scheduled_at", "<=", inThirtyMinutes)
    .where("scheduled_at", ">=", fiveMinutesAgo)
    .limit(50)
    .get();

  await Promise.all(
    notifySnap.docs.map(async (postDoc) => {
      const post = postDoc.data() as PostDoc;
      const user = await getUserConfig(post.uid);
      if (user?.paused) return;

      await sendPush(user, {
        title: "Publication dans 30 min",
        body: post.text.slice(0, 140),
        data: { postId: postDoc.id }
      });

      await postDoc.ref.set(
        {
          notified_30min: true,
          notification_sent_at: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    })
  );

  const autoApproveSnap = await db
    .collection("posts")
    .where("status", "==", "pending_review")
    .where("notified_30min", "==", true)
    .where("notification_sent_at", "<=", twentyFiveMinutesAgo)
    .limit(50)
    .get();

  await Promise.all(autoApproveSnap.docs.map((postDoc) => postDoc.ref.set({ status: "approved" }, { merge: true })));

  const publishSnap = await db.collection("posts").where("status", "==", "approved").where("scheduled_at", "<=", now).limit(50).get();

  await Promise.all(
    publishSnap.docs.map(async (postDoc) => {
      try {
        await publishToFacebook(postDoc.id, postDoc.data() as PostDoc);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown publish error";
        await postDoc.ref.set({ status: "failed", error: message }, { merge: true });
      }
    })
  );
});

export const weeklyAnalytics = onSchedule({ schedule: "0 20 * * 0", timeZone: "Europe/Paris" }, async () => {
  const usersSnap = await db.collection("users").get();
  const weekStart = startOfWeek(new Date());

  await Promise.all(
    usersSnap.docs.map(async (userDoc) => {
      const user = userDoc.data() as UserConfig;
      if (!user.fb_page_id || !user.fb_access_token) return;

      const postsSnap = await db
        .collection("posts")
        .where("uid", "==", userDoc.id)
        .where("status", "==", "published")
        .where("published_at", ">=", Timestamp.fromDate(weekStart))
        .get();

      const stats = await Promise.all(
        postsSnap.docs.map(async (postDoc) => {
          const post = postDoc.data() as PostDoc;
          if (!post.fb_post_id) return { postId: postDoc.id, unavailable: true };
          return getFacebookInsights(post.fb_post_id, user);
        })
      );

      const recommendations = await generateWeeklyRecommendations(stats);
      await db.collection("analytics").doc(`${userDoc.id}_${weekStart.toISOString().slice(0, 10)}`).set({
        uid: userDoc.id,
        week_start: Timestamp.fromDate(weekStart),
        posts_stats: stats,
        best_hour: inferBestHour(stats) ?? user.preferred_posting_time ?? "18:30",
        best_format: "texte_image",
        avg_engagement: averageEngagement(stats),
        ai_recommendations: recommendations,
        createdAt: FieldValue.serverTimestamp()
      });

      await sendPush(user, {
        title: "Rapport de la semaine pret",
        body: "Tes recommandations sont disponibles pour les prochains posts.",
        data: { route: "/dashboard" }
      });
    })
  );
});

async function getUserConfig(uid: string) {
  const userSnap = await db.collection("users").doc(uid).get();
  return userSnap.data() as UserConfig | undefined;
}

async function generatePost(uid: string, journal: string, user?: UserConfig) {
  if (!isAiConfigured()) {
    return {
      text: `Aujourd'hui, je retiens ceci : ${journal.slice(0, 700)}\n\nEt toi, qu'est-ce que cette journee t'apprend ?\n\n#journal #progression #clariv\n\n-${user?.pseudo ?? "Clariv"}`,
      mediaPrompt: "Portrait editorial lumineux, ambiance authentique, format social media vertical."
    };
  }

  const recentPostsSnap = await db.collection("posts").where("uid", "==", uid).where("status", "==", "published").orderBy("createdAt", "desc").limit(7).get();
  const analyticsSnap = await db.collection("analytics").where("uid", "==", uid).orderBy("week_start", "desc").limit(1).get();
  const recommendations = analyticsSnap.docs[0]?.data()?.ai_recommendations ?? "";

  const prompt = JSON.stringify({
    journal_du_jour: journal,
    sept_derniers_posts: recentPostsSnap.docs.map((doc) => doc.data().text),
    pseudo: user?.pseudo,
    style_de_marque: user?.brand_voice,
    ton: user?.style_tone,
    recommandations_stats: recommendations,
    format: "hook + corps + CTA + hashtags + signature pseudo"
  });

  const text = await callTextModel("Tu es un manager de reseaux sociaux. Genere uniquement le post Facebook final en francais.", prompt);
  const mediaPrompt = await callTextModel("Genere uniquement un prompt visuel court pour accompagner ce post.", text);
  return { text, mediaPrompt };
}

async function publishToFacebook(postId: string, post: PostDoc) {
  const user = await getUserConfig(post.uid);
  if (user?.paused) throw new Error("Automatic publishing is paused");
  if (!user?.fb_page_id || !user.fb_access_token) throw new Error("Facebook page or token missing");

  const accessToken = decryptToken(user.fb_access_token);
  const endpoint = post.media_url ? `${graphBase}/${user.fb_page_id}/photos` : `${graphBase}/${user.fb_page_id}/feed`;
  const body = new URLSearchParams({ access_token: accessToken });

  if (post.media_url) {
    body.set("url", post.media_url);
    body.set("caption", post.text);
  } else {
    body.set("message", post.text);
  }

  const response = await fetch(endpoint, { method: "POST", body });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message ?? "Facebook publish failed");

  await db.collection("posts").doc(postId).set(
    {
      status: "published",
      fb_post_id: result.post_id ?? result.id,
      published_at: FieldValue.serverTimestamp(),
      error: null
    },
    { merge: true }
  );

  const userConfig = await getUserConfig(post.uid);
  await sendPush(userConfig, { title: "Publie !", body: "Ta publication Facebook est en ligne.", data: { postId } });
}

async function getFacebookInsights(fbPostId: string, user: UserConfig) {
  const accessToken = decryptToken(user.fb_access_token);
  const metrics = "post_impressions,post_engaged_users,post_clicks";
  const response = await fetch(`${graphBase}/${fbPostId}/insights?metric=${metrics}&access_token=${accessToken}`);
  const data = await response.json();
  return { fbPostId, data };
}

async function sendPush(user: UserConfig | undefined, payload: { title: string; body: string; data?: Record<string, string> }) {
  if (!user?.fcm_token) return;

  await messaging.send({
    token: user.fcm_token,
    notification: { title: payload.title, body: payload.body },
    data: payload.data ?? {},
    webpush: {
      notification: {
        title: payload.title,
        body: payload.body,
        actions: [
          { action: "approve", title: "Publier" },
          { action: "edit", title: "Modifier" }
        ]
      }
    }
  });
}

async function generateWeeklyRecommendations(stats: unknown[]) {
  if (!isAiConfigured()) {
    return "Conserver une publication quotidienne, tester deux hooks plus directs et comparer les posts avec question finale.";
  }

  return callTextModel(
    "Tu analyses des stats Facebook. Genere un rapport court et des recommandations actionnables pour la semaine suivante.",
    JSON.stringify(stats)
  );
}

async function callTextModel(system: string, user: string) {
  const response = await fetch(chatCompletionsEndpoint(process.env.AI_BASE_URL ?? ""), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.AI_TEXT_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) throw new Error(`AI request failed: ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

function chatCompletionsEndpoint(baseUrl: string) {
  const normalized = baseUrl.replace(/\/$/, "");
  return normalized.endsWith("/chat/completions") ? normalized : `${normalized}/chat/completions`;
}

function isAiConfigured() {
  return Boolean(process.env.AI_API_KEY && process.env.AI_BASE_URL && process.env.AI_TEXT_MODEL);
}

function nextScheduledTimestamp(time = "18:30") {
  const [hours = "18", minutes = "30"] = time.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  if (date.getTime() < Date.now() + 10 * 60 * 1000) date.setDate(date.getDate() + 1);
  return Timestamp.fromDate(date);
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
  copy.setDate(diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function averageEngagement(stats: unknown[]) {
  const values = stats.flatMap((item) => {
    if (!item || typeof item !== "object" || !("data" in item)) return [];
    const rows = (item as { data?: { data?: Array<{ name: string; values?: Array<{ value?: number }> }> } }).data?.data ?? [];
    return rows.filter((row) => row.name === "post_engaged_users").map((row) => Number(row.values?.[0]?.value ?? 0));
  });

  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function inferBestHour(_stats: unknown[]) {
  return null;
}

function getKey() {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret) throw new Error("TOKEN_ENCRYPTION_KEY is required");
  return crypto.createHash("sha256").update(secret).digest();
}

function decryptToken(payload?: string) {
  if (!payload) return "";
  const [iv, tag, encrypted] = payload.split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
}
