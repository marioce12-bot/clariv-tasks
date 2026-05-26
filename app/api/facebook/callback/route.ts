import { NextResponse } from "next/server";
import { exchangeFacebookCode, saveFacebookPage } from "@/lib/server/facebook";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const uid = url.searchParams.get("state");

  if (!code || !uid) {
    return NextResponse.redirect(new URL("/dashboard?facebook=missing_params", url.origin));
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL ?? url.origin}/api/facebook/callback`;
    const page = await exchangeFacebookCode(code, redirectUri);
    await saveFacebookPage(uid, page);
    return NextResponse.redirect(new URL("/dashboard?facebook=connected", url.origin));
  } catch (error) {
    console.error(error);
    return NextResponse.redirect(new URL("/dashboard?facebook=failed", url.origin));
  }
}
