// src/app/api/test-chat/narrate/route.ts
// Sandbox wrapper around lib/chat-search/narrate. The lib module owns the
// prompt and the Groq call; this route just unpacks the body and returns
// the JSON result for the test-chat UI.

import { NextRequest, NextResponse } from "next/server";
import { narrate } from "@/lib/chat-search/narrate";
import type { NarrationInput } from "@/lib/chat-search/types";

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    const body = (await req.json()) as NarrationInput;
    if (!body?.message) {
      return NextResponse.json({ error: "missing message" }, { status: 400 });
    }
    const result = await narrate(body);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[narrate] error:", err);
    return NextResponse.json(
      { error: err?.message || "narrate failed", ms: Date.now() - t0 },
      { status: 500 }
    );
  }
}
