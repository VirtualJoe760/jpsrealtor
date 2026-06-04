// src/app/api/integrations/anthropic/route.ts
//
// POST   → saves an Anthropic API key (validates first, then encrypts at rest).
// GET    → returns sanitized status (never the key itself).
// DELETE → clears the stored key.
//
// Storage: user.agentProfile.aiIntegrations.anthropic via src/lib/secrets.ts.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import Anthropic from "@anthropic-ai/sdk";
import { encryptSecret } from "@/lib/secrets";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  await dbConnect();
  const user = await User.findById(session.user.id).select("agentProfile.aiIntegrations.anthropic").lean();
  const anthropic = (user as any)?.agentProfile?.aiIntegrations?.anthropic;
  return NextResponse.json(
    {
      status: anthropic?.status || "disconnected",
      last4: anthropic?.last4 || null,
      model: anthropic?.model || "claude-sonnet-4-5-20250929",
      addedAt: anthropic?.addedAt || null,
      lastVerifiedAt: anthropic?.lastVerifiedAt || null,
    },
    { headers: NO_STORE }
  );
}

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

  // Validate before persisting. We re-validate here (rather than trust the
  // separate /test endpoint) because the client could skip the test step.
  try {
    const client = new Anthropic({ apiKey });
    await client.messages.create({
      model,
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }],
    });
  } catch (err: any) {
    const status = err?.status || 0;
    let reason = "unknown";
    if (status === 401 || status === 403) reason = "invalid";
    else if (status === 429) reason = "rate_limited";
    else if (!status) reason = "network";
    return NextResponse.json(
      { ok: false, reason, message: "Key validation failed — not saved." },
      { status: 200, headers: NO_STORE }
    );
  }

  await dbConnect();
  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404, headers: NO_STORE });
  }

  user.agentProfile = user.agentProfile || ({} as any);
  (user.agentProfile as any).aiIntegrations = (user.agentProfile as any).aiIntegrations || {};
  const now = new Date();
  (user.agentProfile as any).aiIntegrations.anthropic = {
    apiKeyEncrypted: encryptSecret(apiKey),
    last4: apiKey.slice(-4),
    model,
    status: "connected",
    addedAt: (user.agentProfile as any).aiIntegrations.anthropic?.addedAt || now,
    lastVerifiedAt: now,
  };
  user.markModified("agentProfile.aiIntegrations.anthropic");
  await user.save();

  return NextResponse.json(
    {
      ok: true,
      status: "connected",
      last4: apiKey.slice(-4),
      model,
      lastVerifiedAt: now.toISOString(),
    },
    { headers: NO_STORE }
  );
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }
  await dbConnect();
  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404, headers: NO_STORE });
  }
  if ((user.agentProfile as any)?.aiIntegrations?.anthropic) {
    (user.agentProfile as any).aiIntegrations.anthropic = {
      status: "disconnected",
    };
    user.markModified("agentProfile.aiIntegrations.anthropic");
    await user.save();
  }
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
