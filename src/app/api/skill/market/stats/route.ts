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

// Rounded on the way out: the even-length branch halves, and neither a half
// dollar nor half a day on market is a thing anyone means. Matches
// statsFromListings() in lib/skill/tenant-read.ts — the tenant path must agree
// with this one, and once did not (it took the upper middle value instead of
// averaging, which on a 2-listing market is simply the larger number).
function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = nums.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return Math.round(sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]);
}

// Days on market from the listing's on-market date. Accepts the ISO string the
// feed actually stores as well as a real Date.
function domFrom(onMarketDate: unknown): number | null {
  if (!onMarketDate) return null;
  const t = onMarketDate instanceof Date ? onMarketDate.getTime() : Date.parse(String(onMarketDate));
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
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
    .select("listPrice daysOnMarket onMarketDate bedroomsTotal bathroomsTotalInteger livingArea")
    .lean();

  const prices = docs.map((d) => d.listPrice).filter((p) => typeof p === "number") as number[];
  // daysOnMarket is essentially never sync'd into the doc, so this used to be
  // an empty array on every city and every consumer rendered "Median days on
  // market: —". Derive it from onMarketDate exactly as the search and detail
  // routes already do. onMarketDate is stored as an ISO string but declared as
  // a Date, so accept either shape.
  const dom = docs
    .map((d) => (typeof d.daysOnMarket === "number" ? d.daysOnMarket : domFrom(d.onMarketDate)))
    .filter((d): d is number => typeof d === "number");

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
