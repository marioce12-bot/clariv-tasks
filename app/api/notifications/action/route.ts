import { NextResponse } from "next/server";
import { adminDb } from "@/lib/server/admin";

export async function POST(request: Request) {
  const body = (await request.json()) as { postId?: string; action?: "approve" | "edit" };
  if (!body.postId || !body.action) {
    return NextResponse.json({ error: "postId and action are required" }, { status: 400 });
  }

  if (body.action === "approve") {
    await adminDb.collection("posts").doc(body.postId).set({ status: "approved" }, { merge: true });
  }

  return NextResponse.json({ ok: true });
}
