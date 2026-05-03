// src/app/api/test-chat/parse/route.ts
// Test-only endpoint for /test-chat sandbox. Runs the Phase A query parser
// against an arbitrary message and returns the structured output. Not used
// by production chat — the live /api/chat-v2 has its own pipeline.

import { NextRequest, NextResponse } from "next/server";
import { parseQuery } from "@/lib/chat-v2/query-parser";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = String(body?.message || "").trim();
    if (!message) return NextResponse.json({ error: "missing message" }, { status: 400 });
    const parsed = await parseQuery(message);
    return NextResponse.json({ parsed });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "parse failed" }, { status: 500 });
  }
}
