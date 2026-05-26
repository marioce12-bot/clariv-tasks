import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/admin";
import { generatePostFromContext, isAiConfigured } from "@/lib/server/ai";

export async function POST(request: Request) {
  const body = (await request.json()) as { uid?: string; journal?: string };
  if (!body.uid || !body.journal?.trim()) {
    return NextResponse.json({ error: "uid and journal are required" }, { status: 400 });
  }

  if (!isAiConfigured()) {
    return NextResponse.json({ error: "AI configuration is incomplete" }, { status: 503 });
  }

  const userSnap = await adminDb.collection("users").doc(body.uid).get();
  const user = userSnap.data() as {
    pseudo?: string;
    brand_voice?: string;
    style_tone?: string;
    preferred_posting_time?: string;
  } | undefined;

  const recentPostsSnap = await adminDb
    .collection("posts")
    .where("uid", "==", body.uid)
    .where("status", "==", "published")
    .orderBy("createdAt", "desc")
    .limit(7)
    .get();

  const recentAnalyticsSnap = await adminDb.collection("analytics").where("uid", "==", body.uid).orderBy("week_start", "desc").limit(1).get();
  const recommendations = recentAnalyticsSnap.docs[0]?.data()?.ai_recommendations as string | undefined;

  const generated = await generatePostFromContext({
    journal: body.journal,
    pseudo: user?.pseudo,
    brandVoice: user?.brand_voice,
    styleTone: user?.style_tone,
    recentPosts: recentPostsSnap.docs.map((doc) => String(doc.data().text ?? "")),
    recommendations
  });

  const scheduledAt = nextScheduledTimestamp(user?.preferred_posting_time);
  const postRef = await adminDb.collection("posts").add({
    uid: body.uid,
    text: generated.text,
    media_url: "",
    media_prompt: generated.mediaPrompt,
    scheduled_at: scheduledAt,
    status: "pending_review",
    notified_30min: false,
    createdAt: FieldValue.serverTimestamp()
  });

  return NextResponse.json({ postId: postRef.id });
}

function nextScheduledTimestamp(time = "18:30") {
  const [hours = "18", minutes = "30"] = time.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  if (date.getTime() < Date.now() + 10 * 60 * 1000) date.setDate(date.getDate() + 1);
  return Timestamp.fromDate(date);
}
