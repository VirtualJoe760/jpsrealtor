// src/app/api/test-chat/preview/route.ts
//
// Sandbox preview of Layer 1 (search service). Takes a ParsedQuery and the
// autocomplete search results, runs the right data primitive based on intent,
// and returns the component-shape data the test page renders.
//
// Intent → primitive mapping:
//   listing-detail   → look up the specific listing
//   listing-search   → buildListingQuery + computeAreaStats + paginated find
//   street-listings  → searchListings-style scoped find
//   aggregate        → computeAreaStats
//   compare          → computeAreaStats × 2
//   trend            → not yet wired (Phase C)
//   cma              → not yet wired
//   insights         → existing /api/articles/ai-search
//   conversational   → null (would route to Layer 3)

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import UnifiedListing from "@/models/unified-listing";
import Article from "@/models/article";
import {
  buildListingQuery,
  computeAreaStats,
  type ListingScope,
  type ListingFilters,
} from "@/lib/chat-v2/listing-query";

// =============================================================================
// Helpers
// =============================================================================

function entityToScope(e: any): ListingScope | null {
  if (!e) return null;
  switch (e.type) {
    case "city":
      return { type: "city", cityName: e.name, cityId: e.cityId };
    case "subdivision":
      return e.isGroup
        ? { type: "subdivisionGroup", subdivisionNames: e.subdivisions || [] }
        : { type: "subdivision", subdivisionName: e.name, cityName: e.cityName };
    case "county":
      return { type: "county", countyName: e.name };
    case "zip":
      return { type: "zip", zip: e.value };
    case "street":
      return e.cityName
        ? {
            type: "street",
            streetName: e.street,
            cityName: e.cityName,
            cityId: e.cityName.toLowerCase().replace(/\s+/g, "-"),
          }
        : null;
    default:
      return null;
  }
}

// primaryPhotoUrl isn't reliably populated on unified_listings docs — the
// real image URLs live in the media[] array. Project just media.0 so we
// can derive a thumbnail without dragging in 20-50 photos per listing.
const LISTING_PROJECTION = {
  listingKey: 1,
  slugAddress: 1,
  unparsedAddress: 1,
  unparsedFirstLineAddress: 1,
  city: 1,
  subdivisionName: 1,
  listPrice: 1,
  bedsTotal: 1,
  bedroomsTotal: 1,
  bathsTotal: 1,
  bathroomsTotalDecimal: 1,
  bathroomsTotalInteger: 1,
  livingArea: 1,
  lotSizeSqft: 1,
  lotSizeArea: 1,
  yearBuilt: 1,
  propertyType: 1,
  propertySubType: 1,
  associationFee: 1,
  associationFeeFrequency: 1,
  primaryPhotoUrl: 1,
  "media.Uri800": 1,
  "media.Uri640": 1,
  "media.Uri1024": 1,
  "media.MediaURL": 1,
  "media.Order": 1,
  "media.MediaCategory": 1,
  onMarketDate: 1,
  daysOnMarket: 1,
  standardStatus: 1,
};

function pickPhoto(l: any): string | undefined {
  if (l.primaryPhotoUrl) return l.primaryPhotoUrl;
  const media: any[] = l.media || [];
  if (media.length === 0) return undefined;
  // Prefer the primary photo (Order 0 or category Primary Photo); fall
  // back to first item.
  const primary = media.find(
    (m) => m.Order === 0 || m.MediaCategory === "Primary Photo"
  ) || media[0];
  return primary?.Uri800 || primary?.Uri640 || primary?.Uri1024 || primary?.MediaURL;
}

function mapListing(l: any) {
  return {
    listingKey: l.listingKey,
    slugAddress: l.slugAddress,
    address: l.unparsedAddress || l.unparsedFirstLineAddress || "",
    city: l.city,
    subdivision: l.subdivisionName,
    price: l.listPrice,
    beds: l.bedsTotal ?? l.bedroomsTotal ?? 0,
    baths: l.bathsTotal ?? l.bathroomsTotalDecimal ?? l.bathroomsTotalInteger ?? 0,
    sqft: l.livingArea,
    lotSize: l.lotSizeSqft || l.lotSizeArea,
    yearBuilt: l.yearBuilt,
    propertySubType: l.propertySubType,
    associationFee: l.associationFee,
    primaryPhotoUrl: pickPhoto(l),
    onMarketDate: l.onMarketDate,
    daysOnMarket: l.daysOnMarket,
    standardStatus: l.standardStatus,
  };
}

// =============================================================================
// Route handler
// =============================================================================

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    const body = await req.json();
    const parsed = body?.parsed;
    if (!parsed) {
      return NextResponse.json({ error: "missing parsed query" }, { status: 400 });
    }

    await dbConnect();

    // ----- listing-detail: look up the specific listing -----
    if (parsed.intent === "listing-detail") {
      const addrEntity = parsed.entities?.find((e: any) => e.type === "address");
      if (!addrEntity) {
        return NextResponse.json({ component: null, reason: "no address entity", ms: Date.now() - t0 });
      }

      // Match by house number prefix on slugAddress (uses index for digit-prefixes)
      const houseNum = addrEntity.houseNumber;
      const streetWords = addrEntity.street.toLowerCase().split(/\s+/).filter((w: string) => w.length > 1);

      // Try slug-prefix match first (uses slugAddress index)
      const slugRegex = new RegExp(`^${houseNum}-`);
      let listing: any = await UnifiedListing.findOne({
        slugAddress: slugRegex,
        standardStatus: "Active",
      })
        .select(LISTING_PROJECTION)
        .lean();

      // Fallback: regex on unparsedAddress with street words
      if (!listing && streetWords.length > 0) {
        const lookaheads = streetWords.map((w: string) => `(?=.*${w})`).join("");
        const re = new RegExp(`^${houseNum}.*${lookaheads}`, "i");
        listing = await UnifiedListing.findOne({
          unparsedAddress: re,
          standardStatus: "Active",
        })
          .select(LISTING_PROJECTION)
          .lean();
      }

      if (!listing) {
        return NextResponse.json({
          component: "listingDetail",
          listing: null,
          reason: `no active listing matched house# ${houseNum} + street "${addrEntity.street}"`,
          ms: Date.now() - t0,
        });
      }

      return NextResponse.json({
        component: "listingDetail",
        listing: mapListing(listing),
        ms: Date.now() - t0,
      });
    }

    // ----- aggregate / listing-search: stats + optional listings -----
    if (parsed.intent === "aggregate" || parsed.intent === "listing-search") {
      const scope = entityToScope(parsed.entities?.[0]);
      if (!scope) {
        return NextResponse.json({ component: null, reason: "no scope", ms: Date.now() - t0 });
      }

      const filters: ListingFilters = parsed.filters || {};
      const stats = await computeAreaStats(scope, filters);

      let listings: any[] = [];
      if (parsed.intent === "listing-search") {
        const { query, Model } = await buildListingQuery(scope, filters);
        const docs = await Model.find(query)
          .select(LISTING_PROJECTION)
          .sort({ listPrice: -1 })
          .limit(6)
          .lean();
        listings = (docs as any[]).map(mapListing);
      }

      return NextResponse.json({
        component: parsed.intent === "aggregate" ? "areaStats" : "neighborhood",
        scope: { type: scope.type, value: (scope as any).cityName || (scope as any).subdivisionName || (scope as any).countyName || (scope as any).zip || (scope as any).streetName },
        propertyType: filters.propertyType || "A",
        stats,
        listings,
        ms: Date.now() - t0,
      });
    }

    // ----- street-listings: scoped find without aggregation -----
    if (parsed.intent === "street-listings") {
      const e = parsed.entities?.[0];
      if (!e || e.type !== "street") {
        return NextResponse.json({ component: null, reason: "no street entity", ms: Date.now() - t0 });
      }
      const scope: ListingScope = {
        type: "street",
        streetName: e.street,
        cityName: e.cityName,
        cityId: e.cityName?.toLowerCase().replace(/\s+/g, "-"),
      };
      const filters: ListingFilters = parsed.filters || {};
      const { query, Model } = await buildListingQuery(scope, filters);
      const docs = await Model.find(query).select(LISTING_PROJECTION).limit(20).lean();
      const total = await Model.countDocuments(query);
      return NextResponse.json({
        component: "listingResults",
        listings: (docs as any[]).map(mapListing),
        totalCount: total,
        ms: Date.now() - t0,
      });
    }

    // ----- compare: pair of areaStats -----
    if (parsed.intent === "compare" && parsed.entities?.length >= 2) {
      const scopeA = entityToScope(parsed.entities[0]);
      const scopeB = entityToScope(parsed.entities[1]);
      if (!scopeA || !scopeB) {
        return NextResponse.json({ component: null, reason: "compare scopes incomplete", ms: Date.now() - t0 });
      }
      const filters: ListingFilters = parsed.filters || {};
      const [statsA, statsB] = await Promise.all([
        computeAreaStats(scopeA, filters),
        computeAreaStats(scopeB, filters),
      ]);
      return NextResponse.json({
        component: "compare",
        a: { scope: scopeA, stats: statsA },
        b: { scope: scopeB, stats: statsB },
        ms: Date.now() - t0,
      });
    }

    // ----- insights: $text on Article collection -----
    if (parsed.intent === "insights") {
      const q = parsed.raw;
      try {
        const docs = await Article.find(
          { status: "published", $text: { $search: q } },
          { score: { $meta: "textScore" } }
        )
          .sort({ score: { $meta: "textScore" } })
          .limit(5)
          .select("title slug excerpt category")
          .lean();
        const articles = (docs as any[]).map((d) => ({
          title: d.title,
          slug: d.slug,
          excerpt: d.excerpt,
          category: d.category,
        }));
        return NextResponse.json({
          component: "articles",
          articles,
          query: q,
          ms: Date.now() - t0,
        });
      } catch (err: any) {
        return NextResponse.json({
          component: "articles",
          articles: [],
          query: q,
          reason: err?.message || "article search failed",
          ms: Date.now() - t0,
        });
      }
    }

    // ----- not yet implemented -----
    return NextResponse.json({
      component: null,
      reason: `preview not wired for intent: ${parsed.intent}`,
      ms: Date.now() - t0,
    });
  } catch (err: any) {
    console.error("[preview] error:", err);
    return NextResponse.json(
      { error: err?.message || "preview failed", ms: Date.now() - t0 },
      { status: 500 }
    );
  }
}
