// src/app/api/integrations/api-tokens/route.ts
//
// GET  → list this agent's API tokens (no plaintext).
// POST → mint a new token. The plaintext is returned ONCE in this response
//        and never again — only sha256(token) is persisted.
//
// Used by the Integrations tab to provision the desktop / Claude Code skill.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { generateApiToken } from "@/lib/secrets";
import { normalizeScopes, PRESETS, catalogForTier, FREE_TIER_SCOPES } from "@/lib/skill-scopes";
import { isFreeTier } from "@/lib/subscription-helpers";

const NO_STORE = { "Cache-Control": "no-store" };

const MAX_TOKENS_PER_USER = 10;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }
  await dbConnect();
  const user = await User.findById(session.user.id)
    .select("agentProfile.aiIntegrations.apiTokens")
    .lean();
  const tokens = ((user as any)?.agentProfile?.aiIntegrations?.apiTokens || [])
    .filter((t: any) => !t.revokedAt)
    .map((t: any, i: number) => ({
      // Use array index as id since these are subdocs without exposed _id.
      id: String(t._id || i),
      last4: t.last4,
      name: t.name,
      scopes: Array.isArray(t.scopes) ? t.scopes : [],
      createdAt: t.createdAt,
      lastUsedAt: t.lastUsedAt || null,
    }));
  // Tier-gate the mintable surface: Free sees only the "Website & listings"
  // preset + read scopes (ship-strategy §5). The UI renders whatever this
  // returns, so no separate client-side gating is needed.
  const free = await isFreeTier(session.user.id);
  const { presets, scopes } = catalogForTier(free);
  return NextResponse.json(
    { tokens, catalog: scopes, presets, isFreeTier: free },
    { headers: NO_STORE }
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  let body: { name?: string; scopes?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE });
  }

  const name = (body.name || "").trim().slice(0, 60);
  if (!name) {
    return NextResponse.json(
      { error: "name is required (e.g. 'MacBook', 'Office Desktop')" },
      { status: 400, headers: NO_STORE }
    );
  }

  // Scopes — accept array of scope strings; unknown values are silently
  // dropped (so a client typo doesn't grant the wrong scope).
  let scopes = normalizeScopes(body.scopes);

  // Tier enforcement (server-authoritative — the UI filter alone would be
  // cosmetic): Free may only mint the website read scopes. Out-of-tier
  // requests get an explicit 403 naming the offending scopes, not a silent
  // downgrade, so integrations fail loudly instead of mysteriously.
  const free = await isFreeTier(session.user.id);
  if (free) {
    const disallowed = scopes.filter((s) => !FREE_TIER_SCOPES.includes(s));
    if (disallowed.length > 0) {
      return NextResponse.json(
        {
          error: `Your plan can't mint tokens with: ${disallowed.join(", ")}. The free plan covers website scopes (${FREE_TIER_SCOPES.join(", ")}) — upgrade to unlock the rest.`,
          disallowed,
          allowed: FREE_TIER_SCOPES,
        },
        { status: 403, headers: NO_STORE }
      );
    }
  }

  // If empty after normalization, fall back to the tier's default preset.
  if (scopes.length === 0) {
    scopes = free ? [...PRESETS.website.scopes] : [...PRESETS.content_drafting.scopes];
  }

  await dbConnect();
  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404, headers: NO_STORE });
  }

  user.agentProfile = user.agentProfile || ({} as any);
  (user.agentProfile as any).aiIntegrations = (user.agentProfile as any).aiIntegrations || {};
  const tokens = ((user.agentProfile as any).aiIntegrations.apiTokens ||= []);

  const activeCount = tokens.filter((t: any) => !t.revokedAt).length;
  if (activeCount >= MAX_TOKENS_PER_USER) {
    return NextResponse.json(
      { error: `Token limit reached (${MAX_TOKENS_PER_USER}). Revoke an existing token first.` },
      { status: 429, headers: NO_STORE }
    );
  }

  const { plaintext, hash, last4 } = generateApiToken();
  tokens.push({
    tokenHash: hash,
    last4,
    name,
    scopes,
    createdAt: new Date(),
  });
  user.markModified("agentProfile.aiIntegrations.apiTokens");
  await user.save();

  return NextResponse.json(
    {
      // Plaintext returned ONCE. Client must surface this to the user immediately.
      token: plaintext,
      last4,
      name,
      scopes,
      createdAt: new Date().toISOString(),
    },
    { headers: NO_STORE }
  );
}
