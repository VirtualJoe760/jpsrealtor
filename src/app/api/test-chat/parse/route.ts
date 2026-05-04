// src/app/api/test-chat/parse/route.ts
// Sandbox wrapper around lib/chat-search/parse. The sandbox surface stays
// stable while the lib module is the canonical implementation reused by
// /api/chat-v3.

import { NextRequest, NextResponse } from "next/server";
import { parse } from "@/lib/chat-search/parse";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = String(body?.message || "").trim();
    if (!message) {
      return NextResponse.json({ error: "missing message" }, { status: 400 });
    }
    const parsed = await parse(message);
    return NextResponse.json({ parsed });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "parse failed" },
      { status: 500 }
    );
  }
}
