import { adminDb } from "./admin";
import { decryptToken, encryptToken } from "./crypto";

type FacebookPage = {
  id: string;
  name: string;
  access_token: string;
};

const graphBase = "https://graph.facebook.com/v20.0";

export async function exchangeFacebookCode(code: string, redirectUri: string) {
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) throw new Error("Facebook OAuth is not configured");

  const shortTokenUrl = `${graphBase}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`;
  const shortTokenResponse = await fetch(shortTokenUrl);
  const shortToken = await shortTokenResponse.json();

  const longTokenUrl = `${graphBase}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken.access_token}`;
  const longTokenResponse = await fetch(longTokenUrl);
  const longToken = await longTokenResponse.json();

  const pagesResponse = await fetch(`${graphBase}/me/accounts?access_token=${longToken.access_token}`);
  const pages = (await pagesResponse.json()) as { data?: FacebookPage[] };
  const page = pages.data?.[0];
  if (!page) throw new Error("No Facebook page found for this account");

  return page;
}

export async function saveFacebookPage(uid: string, page: FacebookPage) {
  await adminDb.collection("users").doc(uid).set(
    {
      fb_page_id: page.id,
      fb_page_name: page.name,
      fb_access_token: encryptToken(page.access_token)
    },
    { merge: true }
  );
}

export async function publishPostToFacebook(postId: string) {
  const postRef = adminDb.collection("posts").doc(postId);
  const postSnap = await postRef.get();
  if (!postSnap.exists) throw new Error("Post not found");

  const post = postSnap.data() as { uid: string; text: string; media_url?: string };
  const userSnap = await adminDb.collection("users").doc(post.uid).get();
  const user = userSnap.data() as { fb_page_id?: string; fb_access_token?: string; paused?: boolean } | undefined;

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

  await postRef.set(
    {
      status: "published",
      fb_post_id: result.post_id ?? result.id,
      published_at: new Date(),
      error: null
    },
    { merge: true }
  );

  return result;
}
