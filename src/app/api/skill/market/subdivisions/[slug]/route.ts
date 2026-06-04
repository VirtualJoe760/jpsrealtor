// src/app/api/skill/market/subdivisions/[slug]/route.ts
//
// GET → full CMA stats for one subdivision (the 1,424-subdivision
// pre-built model). Backed by the nightly subdivision-CMA cron — see
// project_subdivision_cma_system in memory.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Subdivision from "@/models/subdivisions";
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

  const sub: any = await Subdivision.findOne({ slug })
    .select("name slug city county region cmaStats parentSubdivision hierarchyLevel")
    .lean();
  if (!sub) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  return NextResponse.json(
    {
      name: sub.name,
      slug: sub.slug,
      city: sub.city || null,
      county: sub.county || null,
      region: sub.region || null,
      parentSubdivision: sub.parentSubdivision || null,
      hierarchyLevel: sub.hierarchyLevel || null,
      cmaStats: sub.cmaStats || null,
    },
    { headers: NO_STORE }
  );
}
