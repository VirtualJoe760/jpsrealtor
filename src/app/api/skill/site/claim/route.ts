// src/app/api/skill/site/claim/route.ts
//
// POST { code } → { token } — trades a one-time claim code for the site's
// ChatRealty website key (src/lib/site-claim.ts). Called by a script running in
// the site's own folder, which writes the key straight into .env.local; the
// response is never meant for a chat transcript.
//
// PUBLIC on purpose (the code IS the credential) — /api/skill is exempt from
// the session gate in proxy.ts because every route there authenticates itself.
// Guards: 12-char code, 15-minute life, single use (atomic), per-IP rate limit.

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { redeemSiteClaim } from "@/lib/site-claim";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const limit = checkRateLimit(`site-claim:${ip}`, { max: 10, windowMs: 15 * 60 * 1000 });
  if (!limit.ok) {
    return NextResponse.json({ ok: false, reason: "rate_limited", message: "Too many attempts. Wait a few minutes." }, { status: 429, headers: NO_STORE });
  }
  const body = await req.json().catch(() => ({}));
  const result = await redeemSiteClaim(String(body?.code || ""));
  if (!("token" in result)) {
    return NextResponse.json({ ok: false, reason: result.reason, message: result.message }, { status: result.status, headers: NO_STORE });
  }
  return NextResponse.json(
    { ok: true, token: result.token, tenantId: result.tenantId, listings: result.listings, associations: result.associations },
    { headers: NO_STORE }
  );
}
