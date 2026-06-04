// src/app/api/skill/market/mortgage-rates/route.ts
//
// GET → live national 30/15-yr mortgage rates. Thin wrapper around the
// existing /api/mortgage-rates route (API Ninjas), so the skill surface
// gets the same hourly cache + fallback behavior.

import { NextRequest, NextResponse } from "next/server";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "market:read");
  if (denied) return denied;
  if (auth.ok === false) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const rl = skillRateLimit(auth, "read");
  if (rl) return rl;

  // Call the existing internal route. Use the absolute URL only when running
  // locally with NEXTAUTH_URL set; otherwise use the request origin.
  const origin = req.nextUrl.origin;
  try {
    const upstream = await fetch(`${origin}/api/mortgage-rates`);
    const data = await upstream.json();
    return NextResponse.json(data, { headers: NO_STORE });
  } catch (err: any) {
    return NextResponse.json(
      { error: "upstream_error", message: err?.message || "Failed to fetch rates" },
      { status: 502, headers: NO_STORE }
    );
  }
}
