// src/app/api/skill/listings/closed/search/route.ts
//
// GET → search closed/sold listings (UnifiedClosedListing). Same filter
// surface as active search; for CMA narratives and historical comparisons.
//
// Defaults to the last 12 months to keep result sets sane. Capped at 50.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";
import { tenantNotReadyResponse } from "@/lib/skill/tenant-read";
import UnifiedClosedListing from "@/models/unified-closed-listing";
import { applyPropertyTypeFilter } from "@/lib/property-type";

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;
const DEFAULT_LOOKBACK_MONTHS = 12;

function num(v: string | null): number | undefined {
  if (v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  const denied = requireScope(auth, "listings:read");
  if (denied) return denied;
  if (auth.ok === false) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
  const rl = skillRateLimit(auth, "read");
  if (rl) return rl;
  // Per-tenant isolation: a tenant-bound token must not read the shared dogfood
  // dataset through this not-yet-ported route. Refuse cleanly (no leak).
  if (auth.ok && (auth as any).tenantId) return tenantNotReadyResponse("Closed-sale search");

  const sp = req.nextUrl.searchParams;
  const city = sp.get("city")?.trim();
  const subdivision = sp.get("subdivision")?.trim();
  const propertyType = sp.get("propertyType")?.trim();

  const minPrice = num(sp.get("minPrice"));
  const maxPrice = num(sp.get("maxPrice"));
  const minBeds = num(sp.get("minBeds"));
  const maxBeds = num(sp.get("maxBeds"));

  const lookbackMonths = Math.min(60, Math.max(1, num(sp.get("lookbackMonths")) || DEFAULT_LOOKBACK_MONTHS));
  const limit = Math.min(MAX_LIMIT, Math.max(1, num(sp.get("limit")) || DEFAULT_LIMIT));
  const skip = Math.max(0, num(sp.get("skip")) || 0);

  const since = new Date();
  since.setMonth(since.getMonth() - lookbackMonths);
  // closeDate is stored as either a real Date (newer docs) or an ISO
  // date-only string like "2021-06-17" (older 787k docs). Match both
  // via $or; native collection bypasses Mongoose's auto-casting that
  // would re-cast the string branch back to Date.
  const sinceIsoDay = since.toISOString().slice(0, 10);

  const query: Record<string, any> = {};
  if (city) query.city = city;
  if (subdivision) query.subdivisionName = subdivision;

  // Closed CMA work is almost always against sales — default to "A".
  // Pass "all" to mix; pass "Residential Lease" to look at expired/closed rentals.
  const ptResult = applyPropertyTypeFilter(query, propertyType, "A");

  if (minPrice !== undefined || maxPrice !== undefined) {
    query.closePrice = {};
    if (minPrice !== undefined) query.closePrice.$gte = minPrice;
    if (maxPrice !== undefined) query.closePrice.$lte = maxPrice;
  }
  // Match either bed field — UnifiedClosedListing has both bedsTotal and
  // bedroomsTotal populated by different MLS sources.
  const andClauses: Record<string, any>[] = [
    {
      $or: [
        { closeDate: { $gte: since } },
        { closeDate: { $gte: sinceIsoDay } },
      ],
    },
  ];
  if (minBeds !== undefined || maxBeds !== undefined) {
    const range: Record<string, number> = {};
    if (minBeds !== undefined) range.$gte = minBeds;
    if (maxBeds !== undefined) range.$lte = maxBeds;
    andClauses.push({ $or: [{ bedroomsTotal: range }, { bedsTotal: range }] });
  }
  query.$and = andClauses;

  await dbConnect();
  const items: any[] = await UnifiedClosedListing.collection
    .find(query, {
      projection: {
        listingKey: 1, unparsedAddress: 1, city: 1, subdivisionName: 1,
        propertyType: 1, propertyTypeLabel: 1, listPrice: 1, closePrice: 1,
        closeDate: 1, bedroomsTotal: 1, bedsTotal: 1, bathroomsTotalInteger: 1,
        livingArea: 1, daysOnMarket: 1,
      },
    })
    .sort({ closeDate: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  return NextResponse.json(
    {
      items: items.map((l) => ({
        listingKey: l.listingKey,
        address: l.unparsedAddress || null,
        city: l.city || null,
        subdivision: l.subdivisionName || null,
        propertyType: l.propertyTypeLabel || l.propertyType || null,
        listPrice: l.listPrice ?? null,
        closePrice: l.closePrice ?? null,
        closeDate: l.closeDate || null,
        beds: l.bedroomsTotal ?? l.bedsTotal ?? null,
        baths: l.bathroomsTotalInteger ?? null,
        sqft: l.livingArea ?? null,
        daysOnMarket: l.daysOnMarket ?? null,
      })),
      lookbackMonths,
      since,
      skip,
      limit,
      count: items.length,
      appliedPropertyType: ptResult.applied,
      propertyTypeRecognized: ptResult.recognized,
    },
    { headers: NO_STORE }
  );
}
