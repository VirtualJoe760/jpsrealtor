// src/app/api/skill/listings/search/route.ts
//
// GET /api/skill/listings/search?city=Palm+Desert&status=Active&...
//
// Filter the active MLS feed (UnifiedListing). Returns a paginated list with
// just the fields Claude needs to talk about a listing — full detail comes
// from /api/skill/listings/[listingKey].
//
// Indexes the model already has cover (city, status, propertyType, beds,
// baths, listPrice), so common queries hit a compound index. Limit caps at 50.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { authenticateSkillRequest, requireScope, skillRateLimit } from "@/lib/skill-auth";
import UnifiedListing from "@/models/unified-listing";

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

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

  const sp = req.nextUrl.searchParams;

  const city = sp.get("city")?.trim();
  const subdivision = sp.get("subdivision")?.trim();
  const propertyType = sp.get("propertyType")?.trim();
  const status = (sp.get("status")?.trim() || "Active");

  const minPrice = num(sp.get("minPrice"));
  const maxPrice = num(sp.get("maxPrice"));
  const minBeds = num(sp.get("minBeds"));
  const maxBeds = num(sp.get("maxBeds"));
  const minBaths = num(sp.get("minBaths"));
  const maxBaths = num(sp.get("maxBaths"));

  const limit = Math.min(MAX_LIMIT, Math.max(1, num(sp.get("limit")) || DEFAULT_LIMIT));
  const skip = Math.max(0, num(sp.get("skip")) || 0);

  const query: Record<string, any> = { standardStatus: status };
  if (city) query.city = city;
  if (subdivision) query.subdivisionName = subdivision;
  if (propertyType) query.propertyType = propertyType;
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.listPrice = {};
    if (minPrice !== undefined) query.listPrice.$gte = minPrice;
    if (maxPrice !== undefined) query.listPrice.$lte = maxPrice;
  }

  // UnifiedListing carries two field names for beds and baths because
  // different MLS sources populate different fields. Match against either.
  const andClauses: Record<string, any>[] = [];
  if (minBeds !== undefined || maxBeds !== undefined) {
    const range: Record<string, number> = {};
    if (minBeds !== undefined) range.$gte = minBeds;
    if (maxBeds !== undefined) range.$lte = maxBeds;
    andClauses.push({ $or: [{ bedroomsTotal: range }, { bedsTotal: range }] });
  }
  if (minBaths !== undefined || maxBaths !== undefined) {
    const range: Record<string, number> = {};
    if (minBaths !== undefined) range.$gte = minBaths;
    if (maxBaths !== undefined) range.$lte = maxBaths;
    andClauses.push({ $or: [{ bathroomsTotalInteger: range }, { bathsTotal: range }] });
  }
  if (andClauses.length > 0) query.$and = andClauses;

  await dbConnect();
  const [items, total] = await Promise.all([
    UnifiedListing.find(query)
      .select(
        "listingKey unparsedAddress city subdivisionName propertyType propertyTypeLabel " +
        "standardStatus listPrice bedroomsTotal bedsTotal bathroomsTotalInteger bathsTotal " +
        "livingArea daysOnMarket onMarketDate media"
      )
      .sort({ onMarketDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    UnifiedListing.countDocuments(query),
  ]);

  return NextResponse.json(
    {
      items: items.map((l: any) => ({
        listingKey: l.listingKey,
        address: l.unparsedAddress || null,
        city: l.city || null,
        subdivision: l.subdivisionName || null,
        propertyType: l.propertyTypeLabel || l.propertyType || null,
        status: l.standardStatus || null,
        listPrice: l.listPrice ?? null,
        beds: l.bedroomsTotal ?? l.bedsTotal ?? null,
        baths: l.bathroomsTotalInteger ?? l.bathsTotal ?? null,
        sqft: l.livingArea ?? null,
        daysOnMarket: l.daysOnMarket ?? null,
        onMarketDate: l.onMarketDate || null,
        primaryPhotoUrl: l.media?.[0]?.MediaURL || l.media?.[0]?.Uri800 || null,
        slug: `/mls-listings/${l.listingKey}`,
      })),
      total,
      skip,
      limit,
      hasMore: skip + items.length < total,
    },
    { headers: NO_STORE }
  );
}
