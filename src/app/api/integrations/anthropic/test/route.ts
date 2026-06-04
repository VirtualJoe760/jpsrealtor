// src/app/api/integrations/anthropic/test/route.ts
//
// POST { apiKey } → validates by sending a 1-token ping to Anthropic.
// Does NOT persist. Used by the Integrations tab "Test connection" button.
//
// Errors are sanitized — we never echo the apiKey back, and we mask
// Anthropic's error payload to a coarse reason ("invalid", "rate_limited",
// "network") so a misconfigured client can't accidentally log secrets.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  let body: { apiKey?: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE });
  }

  const apiKey = (body.apiKey || "").trim();
  const model = (body.model || "claude-sonnet-4-5-20250929").trim();

  if (!apiKey.startsWith("sk-ant-")) {
    return NextResponse.json(
      { ok: false, reason: "format", message: "Anthropic keys start with sk-ant-" },
      { status: 400, headers: NO_STORE }
    );
  }

  try {
    const client = new Anthropic({ apiKey });
    await client.messages.create({
      model,
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }],
    });
    return NextResponse.json(
      { ok: true, model, last4: apiKey.slice(-4) },
      { headers: NO_STORE }
    );
  } catch (err: any) {
    // Sanitize. Never echo Anthropic's full error (may include key fragments).
    const status = err?.status || 0;
    let reason: "invalid" | "rate_limited" | "network" | "unknown" = "unknown";
    if (status === 401 || status === 403) reason = "invalid";
    else if (status === 429) reason = "rate_limited";
    else if (!status) reason = "network";
    return NextResponse.json(
      { ok: false, reason, message: reasonMessage(reason) },
      { status: 200, headers: NO_STORE }
    );
  }
}

function reasonMessage(r: string): string {
  switch (r) {
    case "invalid":
      return "Anthropic rejected this key. Double-check it was copied correctly.";
    case "rate_limited":
      return "Anthropic rate limited the test. Try again in a moment.";
    case "network":
      return "Could not reach Anthropic. Network issue.";
    default:
      return "Test failed for an unknown reason.";
  }
}
