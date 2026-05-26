import { NextResponse } from "next/server";
import { generatePseudoProposals } from "@/lib/server/ai";

export async function POST(request: Request) {
  const body = (await request.json()) as { answers?: Record<string, string> };
  const proposals = await generatePseudoProposals(body.answers ?? {});
  return NextResponse.json({ proposals });
}
