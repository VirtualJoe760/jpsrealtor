// src/app/api/skill/market/places/route.ts
//
// GET /api/skill/market/places?q=palm[&kind=cities|subdivisions|both]
//
// Type-ahead over the pre-aggregated cities and subdivisions collections, for a
// picker that sets the listing search's `cities=` / `subdivisions=`. The names
// returned are the exact strings those filters match (`city`, `subdivisionName`
// on the listing). A prefix against the indexed normalizedName; busiest first.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";
import { tenantNotReadyResponse } from "@/lib/skill/tenant-read";
import { City } from "@/models/cities";
import Subdivision from "@/models/subdivisions";

const NO_STORE = { "Cache-Control": "no-store" };
const LIMIT = 10;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "listings:read");
  if (denied) return denied;
  if (auth.ok === false) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const rl = skillRateLimit(auth, "read");
  if (rl) return rl;
  if (auth.ok && (auth as any).tenantId) return tenantNotReadyResponse("Place data");

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim().toLowerCase();
  const kind = (sp.get("kind") || "both").trim();
  if (q.length < 2) {
    return NextResponse.json({ error: "q_too_short", message: "Type at least two letters." }, { status: 422, headers: NO_STORE });
  }
  const prefix = { $regex: `^${escape(q)}` };

  await dbConnect();
  const [cities, subdivisions] = await Promise.all([
    kind === "subdivisions"
      ? []
      : City.collection
          .find({ normalizedName: prefix }, { projection: { name: 1, county: 1, region: 1, listingCount: 1 } })
          .sort({ listingCount: -1, name: 1 })
          .limit(LIMIT)
          .toArray(),
    kind === "cities"
      ? []
      : Subdivision.collection
          .find({ normalizedName: prefix }, { projection: { name: 1, city: 1, region: 1, listingCount: 1 } })
          .sort({ listingCount: -1, name: 1 })
          .limit(LIMIT)
          .toArray(),
  ]);

  return NextResponse.json(
    {
      cities: cities.map((c: any) => ({ name: c.name, county: c.county || null, region: c.region || null, listings: c.listingCount ?? 0 })),
      subdivisions: subdivisions.map((s: any) => ({ name: s.name, city: s.city || null, region: s.region || null, listings: s.listingCount ?? 0 })),
    },
    { headers: NO_STORE }
  );
}
