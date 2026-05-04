// src/app/api/test-chat/preview/route.ts
// Sandbox wrapper around lib/chat-search/preview. See that file for the
// per-intent dispatcher; this route just unpacks the parsed query and
// passes the request origin through for the trend → /api/analytics/appreciation
// hop.

import { NextRequest, NextResponse } from "next/server";
import { runPreview } from "@/lib/chat-search/preview";

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    const body = await req.json();
    const parsed = body?.parsed;
    if (!parsed) {
      return NextResponse.json(
        { error: "missing parsed query" },
        { status: 400 }
      );
    }
    const result = await runPreview(parsed, { origin: req.nextUrl.origin });
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[preview] error:", err);
    return NextResponse.json(
      { error: err?.message || "preview failed", ms: Date.now() - t0 },
      { status: 500 }
    );
  }
}
