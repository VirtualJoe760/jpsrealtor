// src/app/api/skill/rentals/going-rate/route.ts
//
// GET → the market "going rate" for rentals in an area (subdivision rentStats
// first, else ZIP rent_rates). Scope: listings:read.

import { NextRequest, NextResponse } from "next/server";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";
import { getGoingRate } from "@/lib/listings/cashflow-query";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "listings:read");
  if (denied) return denied;
  if (auth.ok === false) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const rl = skillRateLimit(auth, "read");
  if (rl) return rl;

  const sp = req.nextUrl.searchParams;
  const rate = await getGoingRate({
    postalCode: sp.get("postalCode") || undefined,
    subdivision: sp.get("subdivision") || undefined,
    city: sp.get("city") || undefined,
  });

  if (!rate) {
    return NextResponse.json(
      { error: "not_found", message: "No going-rate data for that area yet." },
      { status: 404, headers: NO_STORE }
    );
  }
  return NextResponse.json(rate, { headers: NO_STORE });
}
