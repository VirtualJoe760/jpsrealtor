// src/app/api/skill/market/neighborhoods/[slug]/route.ts
//
// GET → city snapshot from the aggregated City model. The City model is
// built by the listings sync — it carries listing counts, price aggregates,
// property-type breakdown, features, and keywords. It does NOT carry
// population, demographics, schools, parks, etc. — those fields were
// promised by an earlier version of this route but never existed in the
// schema, so they were always null. Reshaped to return real data.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { City } from "@/models/cities";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";
import { tenantNotReadyResponse } from "@/lib/skill/tenant-read";

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
  // Per-tenant isolation: a tenant-bound token must not read the shared dogfood
  // dataset through this not-yet-ported route. Refuse cleanly (no leak).
  if (auth.ok && (auth as any).tenantId) return tenantNotReadyResponse("Neighborhood data");

  const { slug } = await params;
  await dbConnect();

  const city: any = await City.findOne({ slug })
    .select(
      "name slug county region coordinates " +
      "listingCount priceRange avgPrice medianPrice " +
      "propertyTypes features keywords subdivisionCount mlsSources " +
      "isOcean lastUpdated"
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
      coordinates: city.coordinates || null,

      // Market snapshot (the actually populated fields)
      activeListingCount: city.listingCount ?? null,
      priceRange: city.priceRange ?? null,
      avgListPrice: city.avgPrice ?? null,
      medianListPrice: city.medianPrice ?? null,
      propertyTypeBreakdown: city.propertyTypes ?? null,
      subdivisionCount: city.subdivisionCount ?? null,
      mlsSources: city.mlsSources ?? [],

      // Editorial-ish (often empty but populated for some cities)
      features: city.features?.length ? city.features : null,
      keywords: city.keywords?.length ? city.keywords : null,

      lastUpdated: city.lastUpdated || null,
    },
    { headers: NO_STORE }
  );
}
