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
import { applyPropertyTypeFilter } from "@/lib/property-type";
import { geocodeAddress } from "@/lib/geocoding/geocode-service";

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

const DEFAULT_RADIUS_MILES = 10;
const MAX_RADIUS_MILES = 50;

function num(v: string | null): number | undefined {
  if (v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

// lat/lng degree box around a center (lat ~69mi/deg; lng shrinks toward poles).
function boundingBox(lat: number, lng: number, radiusMiles: number) {
  const dLat = radiusMiles / 69;
  const dLng = radiusMiles / (69 * Math.cos((lat * Math.PI) / 180));
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng };
}

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Resolve a `near` string to a center point. "lat,lng" is used verbatim;
// anything else (ZIP / city / neighborhood / street address) is geocoded.
async function resolveCenter(near: string): Promise<{ lat: number; lng: number } | null> {
  const m = near.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (m) {
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }
  const g = await geocodeAddress(near, undefined, "CA");
  return g ? { lat: g.latitude, lng: g.longitude } : null;
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
  // "true" / "false" — true requires a poolFeatures string; false excludes it.
  const hasPool = sp.get("hasPool")?.trim().toLowerCase();

  const minPrice = num(sp.get("minPrice"));
  const maxPrice = num(sp.get("maxPrice"));
  const minBeds = num(sp.get("minBeds"));
  const maxBeds = num(sp.get("maxBeds"));
  const minBaths = num(sp.get("minBaths"));
  const maxBaths = num(sp.get("maxBaths"));
  const minYearBuilt = num(sp.get("minYearBuilt"));
  const maxYearBuilt = num(sp.get("maxYearBuilt"));

  // Days-on-market filters work against onMarketDate (the DB doesn't
  // actually store daysOnMarket — see route comment above the response).
  // maxDaysOnMarket=2 → onMarketDate >= now - 2 days (new listings only).
  // minDaysOnMarket=30 → onMarketDate <= now - 30 days (stale listings).
  const maxDaysOnMarket = num(sp.get("maxDaysOnMarket"));
  const minDaysOnMarket = num(sp.get("minDaysOnMarket"));

  const limit = Math.min(MAX_LIMIT, Math.max(1, num(sp.get("limit")) || DEFAULT_LIMIT));
  const skip = Math.max(0, num(sp.get("skip")) || 0);

  // Geo radius search. `near` = ZIP / city / neighborhood / address / "lat,lng".
  const near = sp.get("near")?.trim();
  const radiusMiles = near
    ? Math.min(MAX_RADIUS_MILES, Math.max(0.5, num(sp.get("radiusMiles")) || DEFAULT_RADIUS_MILES))
    : undefined;

  const query: Record<string, any> = { standardStatus: status };
  if (city) query.city = city;
  if (subdivision) query.subdivisionName = subdivision;

  // Default to "A" (Residential sale) when caller omits propertyType so
  // rentals ($2k/mo) don't pollute under-$1.5M searches. Pass "all" to mix.
  // Pass "Residential Lease" / "Rental" / "B" to search rentals only.
  const ptResult = applyPropertyTypeFilter(query, propertyType, "A");

  if (minPrice !== undefined || maxPrice !== undefined) {
    query.listPrice = {};
    if (minPrice !== undefined) query.listPrice.$gte = minPrice;
    if (maxPrice !== undefined) query.listPrice.$lte = maxPrice;
  }

  // yearBuilt range — lets era queries ("mid-century 1950s-60s", "new builds")
  // filter server-side in one call instead of fetching a broad set and having
  // the caller sift by year.
  if (minYearBuilt !== undefined || maxYearBuilt !== undefined) {
    query.yearBuilt = {};
    if (minYearBuilt !== undefined) query.yearBuilt.$gte = minYearBuilt;
    if (maxYearBuilt !== undefined) query.yearBuilt.$lte = maxYearBuilt;
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

  if (maxDaysOnMarket !== undefined || minDaysOnMarket !== undefined) {
    // onMarketDate is stored as an ISO 8601 string ("2026-05-07T07:18:17Z"),
    // not a Date — Mongo $gte against a Date object silently never matches.
    // ISO 8601 Z-suffixed strings sort lexically, so string comparison works.
    const range: Record<string, string> = {};
    if (maxDaysOnMarket !== undefined) {
      // "on market at most N days" → onMarketDate is recent
      range.$gte = new Date(Date.now() - maxDaysOnMarket * 86400000).toISOString();
    }
    if (minDaysOnMarket !== undefined) {
      // "on market at least N days" → onMarketDate is old
      range.$lte = new Date(Date.now() - minDaysOnMarket * 86400000).toISOString();
    }
    query.onMarketDate = range;
  }

  // hasPool: pool data lives in poolFeatures (string). True = the field
  // exists and isn't literally "None"; false = field missing or "None".
  if (hasPool === "true" || hasPool === "1" || hasPool === "yes") {
    andClauses.push({
      poolFeatures: { $exists: true, $nin: [null, "", "None", "none"] },
    });
  } else if (hasPool === "false" || hasPool === "0" || hasPool === "no") {
    andClauses.push({
      $or: [
        { poolFeatures: { $exists: false } },
        { poolFeatures: { $in: [null, "", "None", "none"] } },
      ],
    });
  }

  if (andClauses.length > 0) query.$and = andClauses;

  // Resolve `near` to a center and constrain the query to its bounding box.
  // The server has no access to the user's device location — callers must pass
  // a place for "near me" (the MCP tool description tells Claude to ask).
  let center: { lat: number; lng: number } | null = null;
  if (near) {
    center = await resolveCenter(near);
    if (!center) {
      return NextResponse.json(
        {
          error: "could_not_geocode",
          message: `Couldn't locate "${near}". Ask the user for a clearer ZIP, city, neighborhood, or street address.`,
        },
        { status: 422, headers: NO_STORE }
      );
    }
    const box = boundingBox(center.lat, center.lng, radiusMiles!);
    query.latitude = { $gte: box.minLat, $lte: box.maxLat };
    query.longitude = { $gte: box.minLng, $lte: box.maxLng };
  }

  await dbConnect();
  // Use the native collection (not the Mongoose model) so the schema's
  // declared types don't auto-cast our filter values. Specifically,
  // onMarketDate is declared as Date in the schema but stored as an ISO 8601
  // STRING in the DB. Mongoose's query casting silently converts our string
  // cutoff to a Date object, which never matches the stored strings.
  // Bypassing Mongoose via .collection avoids that whole problem.
  const projection = {
    listingKey: 1, unparsedAddress: 1, city: 1, subdivisionName: 1,
    propertyType: 1, propertyTypeLabel: 1, standardStatus: 1,
    listPrice: 1, currentPrice: 1, currentPricePublic: 1,
    bedroomsTotal: 1, bedsTotal: 1, bathroomsTotalInteger: 1, bathsTotal: 1,
    livingArea: 1, yearBuilt: 1, daysOnMarket: 1, onMarketDate: 1,
    // Only the first photo is used (primaryPhotoUrl). $slice avoids pulling the
    // full ~31-photo media array per listing — a big payload cut on large result
    // sets, which was the main search-latency driver.
    media: { $slice: 1 }, poolFeatures: 1,
    latitude: 1, longitude: 1, coordinates: 1,
  } as const;

  const col = UnifiedListing.collection;
  let items: any[];
  let hasMore: boolean;
  let total: number | null;
  const distanceByKey = new Map<string, number>();

  if (center) {
    // Geo mode: pull the bounding-box matches, trim to the true circle, sort by
    // distance, take the nearest `limit`. (Same approach as /api/listings/nearby.)
    const cap = Math.max(limit * 6, 300);
    const boxDocs = await col.find(query, { projection }).limit(cap).toArray();
    const withDist = boxDocs
      .map((d: any) => {
        const dlat =
          typeof d.latitude === "number" ? d.latitude : d.coordinates?.coordinates?.[1] ?? d.coordinates?.[1];
        const dlng =
          typeof d.longitude === "number" ? d.longitude : d.coordinates?.coordinates?.[0] ?? d.coordinates?.[0];
        const miles =
          typeof dlat === "number" && typeof dlng === "number"
            ? haversineMiles(center!.lat, center!.lng, dlat, dlng)
            : Infinity;
        return { d, miles };
      })
      .filter((x) => x.miles <= radiusMiles!)
      .sort((a, b) => a.miles - b.miles);
    items = withDist.slice(0, limit).map((x) => {
      distanceByKey.set(x.d.listingKey, Math.round(x.miles * 10) / 10);
      return x.d;
    });
    hasMore = withDist.length > limit;
    total = withDist.length; // exact count within radius (up to the overfetch cap)
  } else {
    // Fetch one extra row to derive hasMore instead of countDocuments(). An exact
    // count scans EVERY match (the pool/era filters can't be served from an index,
    // so it's a collection-ish scan) and ran in parallel with find — i.e. it set
    // the floor on the warm query time. Exact total only when results fit one page.
    const docs = await col
      .find(query, { projection })
      .sort({ onMarketDate: -1 })
      .skip(skip)
      .limit(limit + 1)
      .toArray();
    hasMore = docs.length > limit;
    items = hasMore ? docs.slice(0, limit) : docs;
    total = hasMore ? null : skip + items.length;
  }

  // All listing links point to the ChatRealty hub (www avoids the apex→www
  // redirect). The page resolves by listingKey, so no slug lookup needed.
  const siteBase = "https://www.chatrealty.io";

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
        yearBuilt: l.yearBuilt ?? null,
        pool: !!(l.poolFeatures && !/^\s*none\s*$/i.test(l.poolFeatures)),
        poolFeatures: l.poolFeatures || null,
        currentPrice: l.currentPrice ?? l.currentPricePublic ?? l.listPrice ?? null,
        latitude: typeof l.latitude === "number" ? l.latitude : l.coordinates?.[1] ?? null,
        longitude: typeof l.longitude === "number" ? l.longitude : l.coordinates?.[0] ?? null,
        daysOnMarket:
          l.daysOnMarket ??
          (l.onMarketDate
            ? Math.max(0, Math.floor((Date.now() - new Date(l.onMarketDate).getTime()) / 86400000))
            : null),
        onMarketDate: l.onMarketDate || null,
        primaryPhotoUrl:
          l.media?.[0]?.uriLarge ||
          l.media?.[0]?.uri1024 ||
          l.media?.[0]?.uri800 ||
          l.media?.[0]?.uri640 ||
          l.media?.[0]?.MediaURL ||
          l.media?.[0]?.Uri800 ||
          null,
        // Small (~640px) variant for inline thumbnails — ~50-80KB vs the
        // ~700KB original, so embedding hero shots stays light.
        primaryThumbUrl:
          l.media?.[0]?.Uri640 ||
          l.media?.[0]?.Uri800 ||
          l.media?.[0]?.UriThumb ||
          l.media?.[0]?.Uri300 ||
          l.media?.[0]?.MediaURL ||
          null,
        slug: `/mls-listings/${l.listingKey}`,
        detailUrl: `${siteBase}/mls-listings/${l.listingKey}`,
        ...(distanceByKey.has(l.listingKey)
          ? { distanceMiles: distanceByKey.get(l.listingKey) }
          : {}),
      })),
      total,
      skip,
      limit,
      hasMore,
      ...(center ? { center, radiusMiles, sortedBy: "distance" } : {}),
      appliedPropertyType: ptResult.applied,
      propertyTypeRecognized: ptResult.recognized,
    },
    { headers: NO_STORE }
  );
}
