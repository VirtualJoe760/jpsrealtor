// src/app/api/skill/rentals/area-cashflow/route.ts
//
// GET → the precomputed rental cash-flow rollup (cashflowProfile) for a whole
// area — a subdivision or a city — in one findOne. Scope: listings:read, same
// as the other cash-flow routes.
//
// Query: slug | name (+ city) [+ scope=subdivision|city].
//
// "Not found" and "no data" are 200s with found/available flags, not 404s: they
// are normal answers ("which Fallbrook?", "nothing scored here"), and an MCP
// error result makes Claude treat a routine miss as a bug to report.

import { NextRequest, NextResponse } from "next/server";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";
import { tenantNotReadyResponse } from "@/lib/skill/tenant-read";
import { getAreaCashflow, type AreaScope } from "@/lib/listings/cashflow-query";

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
  if (auth.ok && (auth as any).tenantId) return tenantNotReadyResponse("Area cash-flow analysis");

  const sp = req.nextUrl.searchParams;
  const slug = sp.get("slug") || undefined;
  const name = sp.get("name") || undefined;
  const city = sp.get("city") || undefined;
  const rawScope = sp.get("scope") || undefined;

  if (rawScope && rawScope !== "subdivision" && rawScope !== "city") {
    return NextResponse.json(
      { error: "bad_request", message: 'scope must be "subdivision" or "city".' },
      { status: 400, headers: NO_STORE }
    );
  }
  if (!slug && !name) {
    return NextResponse.json(
      { error: "bad_request", message: "Pass slug, or name (plus city for a subdivision)." },
      { status: 400, headers: NO_STORE }
    );
  }

  const result = await getAreaCashflow({ slug, name, city, scope: rawScope as AreaScope | undefined });
  return NextResponse.json(result, { headers: NO_STORE });
}
