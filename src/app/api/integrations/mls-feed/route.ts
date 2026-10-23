// src/app/api/integrations/mls-feed/route.ts
//
// The agent's own MLS replication key (BYOD).
//
// GET    → sanitized status (which feed, last 4, when verified). Never the key.
// POST   → validates against the agent's MLS FIRST, then encrypts and stores.
//          A key that fails the live test is never written.
// DELETE → removes the stored credentials entirely.
//
// Storage + validation live in src/lib/mls-feed.ts. Request bodies are never
// logged — they carry the plaintext key.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { clearMlsFeed, getMlsFeedStatus, normalizeInput, saveMlsFeed, testMlsFeed } from "@/lib/mls-feed";

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_FIELD_LEN = 4096;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }
  return NextResponse.json(await getMlsFeedStatus(session.user.id), { headers: NO_STORE });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "format", message: "Invalid request." }, { status: 400, headers: NO_STORE });
  }
  if (Object.values(body || {}).some((v) => typeof v === "string" && v.length > MAX_FIELD_LEN)) {
    return NextResponse.json(
      { ok: false, reason: "format", message: "One of the fields is far longer than any MLS key — check what was pasted." },
      { status: 400, headers: NO_STORE }
    );
  }

  const input = normalizeInput(body);
  if ("error" in input) {
    return NextResponse.json({ ok: false, reason: "format", message: input.error }, { status: 400, headers: NO_STORE });
  }

  // Validate before persisting — the same reason the Anthropic route does: a
  // stored key that doesn't work fails later, somewhere less obvious (a sync
  // that silently pulls nothing), long after the agent has moved on.
  const result = await testMlsFeed(input);
  if (!result.ok) {
    return NextResponse.json(result, { status: 200, headers: NO_STORE });
  }

  const status = await saveMlsFeed(session.user.id, input);
  return NextResponse.json({ ok: true, sampleCount: result.sampleCount, ...status }, { headers: NO_STORE });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }
  await clearMlsFeed(session.user.id);
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
