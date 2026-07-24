// src/app/api/skill/market/stats/route.ts
//
// GET → quick market snapshot for a city / subdivision / property type:
// median list price, active count, median days on market. Aggregated
// server-side from the active UnifiedListing feed.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";
import UnifiedListing from "@/models/unified-listing";
import { applyPropertyTypeFilter } from "@/lib/property-type";
import { resolveAdapter } from "@/lib/tenant/resolve-connection";
import { mapErrorToResponse } from "@/lib/skill-api/errors";
import { statsFromListings } from "@/lib/skill/tenant-read";

const NO_STORE = { "Cache-Control": "no-store" };

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = nums.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export async function GET(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "market:read");
  if (denied) return denied;
  if (auth.ok === false) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const rl = skillRateLimit(auth, "read");
  if (rl) return rl;

  const sp = req.nextUrl.searchParams;
  const city = sp.get("city")?.trim();
  const subdivision = sp.get("subdivision")?.trim();
  const propertyType = sp.get("propertyType")?.trim();

  if (!city && !subdivision) {
    return NextResponse.json(
      { error: "validation_failed", message: "Provide city or subdivision" },
      { status: 400, headers: NO_STORE }
    );
  }

  // TENANT PATH (per-tenant read): a tenant-bound token reads its OWN database,
  // never the shared dogfood Mongo. Default property type "A" (sales).
  if (auth.tenantId) {
    const pt = propertyType && propertyType.toLowerCase() !== "all" ? propertyType : "A";
    const filter: import("@/lib/db/adapter").ListingFilter = { status: "Active" };
    if (city) (filter as any).city = city;
    if (subdivision) (filter as any).subdivision = subdivision;
    if (pt) (filter as any).propertyType = pt;
    try {
      const adapter = await resolveAdapter(auth.tenantId);
      const page = await adapter.listings.find(filter, { limit: 5000 });
      const s = statsFromListings(page.items as any);
      return NextResponse.json(
        {
          scope: { city: city || null, subdivision: subdivision || null, propertyType: pt },
          propertyTypeRecognized: true,
          ...s,
        },
        { headers: NO_STORE }
      );
    } catch (e) {
      return mapErrorToResponse(e);
    }
  }

  const query: Record<string, any> = { standardStatus: "Active" };
  if (city) query.city = city;
  if (subdivision) query.subdivisionName = subdivision;

  // Default to "A" (sales). Median list price + DOM are meaningless mixed
  // across $2k rentals and $1M sales. Caller can pass "all" or a specific
  // type ("Residential Lease" for the rental snapshot).
  const ptResult = applyPropertyTypeFilter(query, propertyType, "A");

  await dbConnect();
  const docs: any[] = await UnifiedListing.find(query)
    .select("listPrice daysOnMarket bedroomsTotal bathroomsTotalInteger livingArea")
    .lean();

  const prices = docs.map((d) => d.listPrice).filter((p) => typeof p === "number") as number[];
  const dom = docs.map((d) => d.daysOnMarket).filter((d) => typeof d === "number") as number[];

  return NextResponse.json(
    {
      scope: { city: city || null, subdivision: subdivision || null, propertyType: ptResult.applied },
      propertyTypeRecognized: ptResult.recognized,
      activeCount: docs.length,
      medianListPrice: median(prices),
      averageListPrice: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null,
      medianDaysOnMarket: median(dom),
      priceRange: prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null,
    },
    { headers: NO_STORE }
  );
}
