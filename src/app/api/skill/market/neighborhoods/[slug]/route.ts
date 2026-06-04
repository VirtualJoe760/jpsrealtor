// src/app/api/skill/market/neighborhoods/[slug]/route.ts
//
// GET → neighborhood / city overview: top-level location info, narrative,
// and (when present) point-of-interest snapshot.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { City } from "@/models/cities";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "market:read");
  if (denied) return denied;
  if (auth.ok === false) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const rl = skillRateLimit(auth, "read");
  if (rl) return rl;

  const { slug } = await params;
  await dbConnect();

  const city: any = await City.findOne({ slug })
    .select(
      "name slug county region state population area description narrative " +
      "schools parks dining shopping pointsOfInterest demographics"
    )
    .lean();
  if (!city) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  return NextResponse.json(
    {
      name: city.name,
      slug: city.slug,
      county: city.county || null,
      region: city.region || null,
      state: city.state || null,
      population: city.population ?? null,
      area: city.area ?? null,
      description: city.description || null,
      narrative: city.narrative || null,
      schools: city.schools || null,
      parks: city.parks || null,
      dining: city.dining || null,
      shopping: city.shopping || null,
      pointsOfInterest: city.pointsOfInterest || null,
      demographics: city.demographics || null,
    },
    { headers: NO_STORE }
  );
}
