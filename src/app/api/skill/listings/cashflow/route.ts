// src/app/api/skill/listings/cashflow/route.ts
//
// GET → active for-sale listings that cash-flow as rentals in an area, using
// the VPS-precomputed cashflowStats. Pure read via the shared cashflow-query lib
// (also used directly by the web-chat tool executor). Scope: listings:read.

import { NextRequest, NextResponse } from "next/server";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";
import { tenantNotReadyResponse } from "@/lib/skill/tenant-read";
import { findCashflowingListings, type SortBy } from "@/lib/listings/cashflow-query";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "listings:read");
  if (denied) return denied;
  if (auth.ok === false) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const rl = skillRateLimit(auth, "read");
  if (rl) return rl;
  // Per-tenant isolation: a tenant-bound token must not read the shared dogfood
  // dataset through this not-yet-ported route. Refuse cleanly (no leak).
  if (auth.ok && (auth as any).tenantId) return tenantNotReadyResponse("Cashflow search");

  const sp = req.nextUrl.searchParams;
  const num = (k: string) => {
    const v = sp.get(k);
    if (v == null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const result = await findCashflowingListings({
    city: sp.get("city") || undefined,
    postalCode: sp.get("postalCode") || undefined,
    subdivision: sp.get("subdivision") || undefined,
    downPaymentPct: num("downPaymentPct"),
    minMonthlyCashflow: num("minMonthlyCashflow"),
    maxPrice: num("maxPrice"),
    beds: num("beds"),
    mortgageRate: num("mortgageRate"),
    sortBy: (sp.get("sortBy") as SortBy) || undefined,
    limit: num("limit"),
  });

  return NextResponse.json(result, { headers: NO_STORE });
}
