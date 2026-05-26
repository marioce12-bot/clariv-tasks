import { NextResponse } from "next/server";
import { adminDb } from "@/lib/server/admin";
import { publishPostToFacebook } from "@/lib/server/facebook";

export async function POST(request: Request) {
  const body = (await request.json()) as { postId?: string };
  if (!body.postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }

  try {
    const result = await publishPostToFacebook(body.postId);
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown publish error";
    await adminDb.collection("posts").doc(body.postId).set({ status: "failed", error: message }, { merge: true });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
