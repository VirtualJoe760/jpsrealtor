// src/app/api/skill/listings/[listingKey]/cashflow/route.ts
//
// GET → the full cash-flow breakdown for one listing (both down scenarios +
// fixedCosts to re-derive custom inputs). Scope: listings:read.

import { NextRequest, NextResponse } from "next/server";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";
import { tenantNotReadyResponse } from "@/lib/skill/tenant-read";
import { analyzeListingCashflow } from "@/lib/listings/cashflow-query";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest, { params }: { params: Promise<{ listingKey: string }> }) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "listings:read");
  if (denied) return denied;
  if (auth.ok === false) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const rl = skillRateLimit(auth, "read");
  if (rl) return rl;
  // Per-tenant isolation: a tenant-bound token must not read the shared dogfood
  // dataset through this not-yet-ported route. Refuse cleanly (no leak).
  if (auth.ok && (auth as any).tenantId) return tenantNotReadyResponse("Cashflow analysis");

  const { listingKey } = await params;
  const result = await analyzeListingCashflow(listingKey);
  if (!result) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }
  return NextResponse.json(result, { headers: NO_STORE });
}
