// src/app/api/internal/domain-lookup/route.ts
// Internal API for middleware to resolve custom domains to target paths.
// Not meant for external use — called by Next.js middleware at the edge.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import DomainMapping from "@/models/DomainMapping";

/**
 * GET /api/internal/domain-lookup?domain=indianwellsccrealestate.com
 *
 * Returns the target path for a custom domain if it exists and is active.
 * Used by middleware to rewrite URLs for custom domain requests.
 */
export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain");

  if (!domain) {
    return NextResponse.json({ found: false }, { status: 400 });
  }

  await dbConnect();

  const mapping = await DomainMapping.findOne({
    domain: domain.toLowerCase(),
    status: "active",
  })
    .select("targetPath subdivisionName cityId subdivisionSlug agentEmail seoTitle seoDescription ogImage")
    .lean();

  if (!mapping) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({
    found: true,
    targetPath: mapping.targetPath,
    subdivisionName: mapping.subdivisionName,
    cityId: mapping.cityId,
    subdivisionSlug: mapping.subdivisionSlug,
    agentEmail: mapping.agentEmail,
    seoTitle: mapping.seoTitle,
    seoDescription: mapping.seoDescription,
    ogImage: mapping.ogImage,
  });
}
