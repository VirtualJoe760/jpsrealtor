// src/app/api/skill/site/claim-code/route.ts
//
// POST → a one-time claim code for the calling agent's website key
// (src/lib/site-claim.ts). Called by the MCP tool `get_site_claim_code`, so the
// site Claude builds can get a key bound to the agent's SEEDED database without
// the key passing through the conversation. Requires an active (seeded) tenant.

import { NextRequest, NextResponse } from "next/server";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";
import { createSiteClaim } from "@/lib/site-claim";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status, headers: NO_STORE });
  }
  // listings:read, not site:manage: no Claude preset carries site:manage, so
  // gating on it hid this tool from almost every agent. The claimed key is
  // capped to the asking key's scopes (lib/site-claim.ts), so this grants
  // nothing new.
  const scopeError = requireScope(auth, "listings:read");
  if (scopeError) return scopeError;
  const rateLimited = skillRateLimit(auth, "write");
  if (rateLimited) return rateLimited;

  const userId = String((auth.user as any)._id);
  const claim = await createSiteClaim(userId, auth.scopes as string[]);
  if (!("code" in claim)) {
    return NextResponse.json({ ok: false, reason: claim.reason, message: claim.message }, { status: 409, headers: NO_STORE });
  }
  const f = (auth.user as any).mlsFeed || {};
  return NextResponse.json(
    {
      ok: true,
      code: claim.code,
      expiresAt: claim.expiresAt,
      // What the site will read once claimed — the agent's own seeded DB.
      database: {
        listings: f.sync?.dbRows ?? null,
        associations: f.networks ?? [],
        propertyTypes: f.propertyTypes ?? [],
        closedHistory: f.closedLookback ?? "none",
        lastSyncedAt: f.sync?.finishedAt ?? null,
      },
      claimUrl: "https://www.chatrealty.io/api/skill/site/claim",
    },
    { headers: NO_STORE }
  );
}
