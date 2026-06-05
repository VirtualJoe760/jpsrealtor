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
    .select("_id name slug city county region cmaStats parentSubdivision hierarchyLevel")
    .lean();
  if (!sub) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  // Detect "parent subdivision with no real CMA". The nightly cron builds
  // cmaStats on leaf subdivisions only. Parents like "PGA West" carry the
  // old-schema empty totals; their actual market data is split across child
  // subdivisions (PGA Stadium, PGA Greg Norman, etc.). When this happens,
  // return a child list so the caller can pick one to drill into.
  const isParentWithoutCma =
    sub.cmaStats?.totals !== undefined &&
    !sub.cmaStats?.active?.count;

  let children: { name: string; slug: string }[] = [];
  if (isParentWithoutCma) {
    const kids: any[] = await Subdivision.find({ parentSubdivision: sub._id })
      .select("name slug")
      .sort({ name: 1 })
      .limit(50)
      .lean();
    children = kids
      .filter((k) => k.slug)
      .map((k) => ({ name: k.name, slug: k.slug }));
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
      // For parent subdivisions, list the children that DO have CMA data.
      // Call get_subdivision_cma with one of their slugs for real numbers.
      ...(isParentWithoutCma && children.length > 0
        ? {
            isParent: true,
            childSubdivisions: children,
            note: `${sub.name} is a parent subdivision — CMA stats live on its child courses/communities listed in childSubdivisions. Call get_subdivision_cma with one of those slugs for real data.`,
          }
        : {}),
    },
    { headers: NO_STORE }
  );
}
