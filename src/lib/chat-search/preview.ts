// src/lib/chat-search/preview.ts
//
// Layer 1 of the search-first chat architecture. Takes a ParsedQuery and
// runs the right Mongo primitive based on intent, returning component-shape
// data the renderer can mount directly.
//
// Intent → primitive mapping:
//   listing-detail   → look up the specific listing
//   listing-search   → buildListingQuery + computeAreaStats + paginated find
//   street-listings  → searchListings-style scoped find
//   aggregate        → computeAreaStats
//   compare          → computeAreaStats × 2
//   trend            → /api/analytics/appreciation (origin-aware)
//   insights         → $text on Article collection
//   cma              → pre-computed cmaStats (listing or subdivision)
//   conversational   → null (would route to Layer 3)

import dbConnect from "@/lib/mongodb";
import UnifiedListing from "@/models/unified-listing";
import Article from "@/models/article";
import Subdivision from "@/models/subdivisions";
import {
  buildListingQuery,
  computeAreaStats,
  type ListingScope,
  type ListingFilters,
} from "@/lib/chat-v2/listing-query";
import { fetchPrimaryPhotos } from "@/lib/listings/fetch-primary-photos";
import { adaptPrebuiltCmaStats } from "@/lib/cma/adapt-prebuilt-stats";
import type { ParsedQuery, PreviewResult } from "./types";

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

// Photos in unified_listings.media[] are populated by an asynchronous cron
// and lag behind incoming MLS sync. primaryPhotoUrl is also unreliable
// across MLS sources. So we project both AND keep mlsId/mlsSource for the
// Spark API fallback. pickPhoto() tries the local fields first; if both
// miss for any listing in the result set, we batch-fetch the missing
// photos from Spark in one round-trip via fetchPrimaryPhotos.
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
  mlsId: 1,
  mlsSource: 1,
};

function pickLocalPhoto(l: any): string | undefined {
  if (l.primaryPhotoUrl) return l.primaryPhotoUrl;
  const media: any[] = l.media || [];
  if (media.length === 0) return undefined;
  const primary =
    media.find((m) => m.Order === 0 || m.MediaCategory === "Primary Photo") ||
    media[0];
  return primary?.Uri800 || primary?.Uri640 || primary?.Uri1024 || primary?.MediaURL;
}

async function attachPhotos(rawListings: any[]): Promise<any[]> {
  for (const l of rawListings) {
    l._photo = pickLocalPhoto(l);
  }
  const missing = rawListings.filter((l) => !l._photo && l.mlsId && l.listingKey);
  if (missing.length > 0) {
    const photoMap = await fetchPrimaryPhotos(missing);
    for (const l of missing) {
      const photoUrl = photoMap.get(l.listingKey);
      if (photoUrl) l._photo = photoUrl;
    }
  }
  return rawListings;
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
    primaryPhotoUrl: l._photo,
    onMarketDate: l.onMarketDate,
    daysOnMarket: l.daysOnMarket,
    standardStatus: l.standardStatus,
  };
}

// =============================================================================
// Main entry point
// =============================================================================

export interface RunPreviewOptions {
  // Origin for internal HTTP calls (currently only the appreciation API).
  // When undefined the trend dispatch returns null with a reason so the
  // caller can decide how to surface that — the live API route handler
  // passes req.nextUrl.origin; the test-chat sandbox does too.
  origin?: string;
}

export async function runPreview(
  parsed: ParsedQuery,
  options: RunPreviewOptions = {}
): Promise<PreviewResult> {
  const t0 = Date.now();
  const { origin } = options;

  await dbConnect();

  // ----- listing-detail: look up the specific listing -----
  if (parsed.intent === "listing-detail") {
    const addrEntity = parsed.entities?.find((e: any) => e.type === "address");
    if (!addrEntity) {
      return { component: null, reason: "no address entity", ms: Date.now() - t0 };
    }

    const houseNum = (addrEntity as any).houseNumber;
    const streetWords = (addrEntity as any).street
      .toLowerCase()
      .split(/\s+/)
      .filter((w: string) => w.length > 1);

    const slugRegex = new RegExp(`^${houseNum}-`);
    let listing: any = await UnifiedListing.findOne({
      slugAddress: slugRegex,
      standardStatus: "Active",
    })
      .select(LISTING_PROJECTION)
      .lean();

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
      return {
        component: "listingDetail",
        listing: null,
        reason: `no active listing matched house# ${houseNum} + street "${(addrEntity as any).street}"`,
        ms: Date.now() - t0,
      };
    }

    const [withPhoto] = await attachPhotos([listing]);
    return {
      component: "listingDetail",
      listing: mapListing(withPhoto),
      ms: Date.now() - t0,
    };
  }

  // ----- aggregate / listing-search: stats + optional listings -----
  if (parsed.intent === "aggregate" || parsed.intent === "listing-search") {
    const scope = entityToScope(parsed.entities?.[0]);
    if (!scope) {
      return { component: null, reason: "no scope", ms: Date.now() - t0 };
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
      const withPhotos = await attachPhotos(docs as any[]);
      listings = withPhotos.map(mapListing);
    }

    return {
      component: parsed.intent === "aggregate" ? "areaStats" : "neighborhood",
      scope: {
        type: scope.type,
        value:
          (scope as any).cityName ||
          (scope as any).subdivisionName ||
          (scope as any).countyName ||
          (scope as any).zip ||
          (scope as any).streetName,
      },
      propertyType: filters.propertyType || "A",
      stats,
      listings,
      ms: Date.now() - t0,
    };
  }

  // ----- street-listings: scoped find without aggregation -----
  if (parsed.intent === "street-listings") {
    const e = parsed.entities?.[0];
    if (!e || e.type !== "street") {
      return { component: null, reason: "no street entity", ms: Date.now() - t0 };
    }
    const scope: ListingScope = {
      type: "street",
      streetName: (e as any).street,
      cityName: (e as any).cityName,
      cityId: (e as any).cityName?.toLowerCase().replace(/\s+/g, "-"),
    };
    const filters: ListingFilters = parsed.filters || {};
    const { query, Model } = await buildListingQuery(scope, filters);
    const docs = await Model.find(query).select(LISTING_PROJECTION).limit(20).lean();
    const total = await Model.countDocuments(query);
    const withPhotos = await attachPhotos(docs as any[]);
    return {
      component: "listingResults",
      listings: withPhotos.map(mapListing),
      totalCount: total,
      ms: Date.now() - t0,
    };
  }

  // ----- compare: pair of areaStats -----
  if (parsed.intent === "compare" && parsed.entities && parsed.entities.length >= 2) {
    const scopeA = entityToScope(parsed.entities[0]);
    const scopeB = entityToScope(parsed.entities[1]);
    if (!scopeA || !scopeB) {
      return {
        component: null,
        reason: "compare scopes incomplete",
        ms: Date.now() - t0,
      };
    }
    const filters: ListingFilters = parsed.filters || {};
    const [statsA, statsB] = await Promise.all([
      computeAreaStats(scopeA, filters),
      computeAreaStats(scopeB, filters),
    ]);
    return {
      component: "compare",
      a: { scope: scopeA, stats: statsA },
      b: { scope: scopeB, stats: statsB },
      ms: Date.now() - t0,
    };
  }

  // ----- trend: appreciation analytics over closed sales -----
  if (parsed.intent === "trend") {
    const e = parsed.entities?.[0];
    if (!e) {
      return { component: null, reason: "no entity for trend", ms: Date.now() - t0 };
    }

    const qs = new URLSearchParams();
    qs.set("period", "5y");
    switch (e.type) {
      case "subdivision":
        qs.set("subdivision", (e as any).name || "");
        break;
      case "city":
        qs.set("city", (e as any).name || "");
        break;
      case "county":
        qs.set("county", (e as any).name || "");
        break;
      case "zip":
        qs.set("zip", (e as any).value || "");
        break;
      default:
        return {
          component: null,
          reason: `trend not supported for entity type ${e.type}`,
          ms: Date.now() - t0,
        };
    }

    if (!origin) {
      return {
        component: "trend",
        scope: { type: e.type, value: (e as any).name || (e as any).value },
        reason: "no origin available for appreciation API call",
        ms: Date.now() - t0,
      };
    }

    try {
      const r = await fetch(`${origin}/api/analytics/appreciation?${qs.toString()}`);
      if (!r.ok) {
        const errBody = await r.json().catch(() => ({}));
        return {
          component: "trend",
          scope: { type: e.type, value: (e as any).name || (e as any).value },
          reason: errBody?.error || `appreciation API ${r.status}`,
          ms: Date.now() - t0,
        };
      }
      const trend = await r.json();
      return {
        component: "trend",
        scope: { type: e.type, value: (e as any).name || (e as any).value },
        locationType: e.type,
        locationName: (e as any).name || (e as any).value,
        period: trend.period,
        appreciation: trend.appreciation,
        marketData: trend.marketData,
        metadata: trend.metadata,
        ms: Date.now() - t0,
      };
    } catch (err: any) {
      return {
        component: "trend",
        reason: err?.message || "appreciation fetch failed",
        ms: Date.now() - t0,
      };
    }
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
      return {
        component: "articles",
        articles,
        query: q,
        ms: Date.now() - t0,
      };
    } catch (err: any) {
      return {
        component: "articles",
        articles: [],
        query: q,
        reason: err?.message || "article search failed",
        ms: Date.now() - t0,
      };
    }
  }

  // ----- cma: pre-computed listing OR subdivision CMA -----
  if (parsed.intent === "cma") {
    const addrEntity = parsed.entities?.find((e: any) => e.type === "address");
    const subEntity = parsed.entities?.find((e: any) => e.type === "subdivision");
    const streetEntity = parsed.entities?.find((e: any) => e.type === "street");

    // ----- listing-level CMA -----
    if (addrEntity) {
      const houseNum = (addrEntity as any).houseNumber;
      const streetWords = ((addrEntity as any).street || "")
        .toLowerCase()
        .split(/\s+/)
        .filter((w: string) => w.length > 1);

      const cmaProjection: any = {
        ...LISTING_PROJECTION,
        cmaStats: 1,
        latitude: 1,
        longitude: 1,
        view: 1,
        View: 1,
        garageSpaces: 1,
        architecturalStyle: 1,
        stories: 1,
        lotFeatures: 1,
        elementarySchoolDistrict: 1,
        pool: 1,
        poolYn: 1,
        poolYN: 1,
        spa: 1,
        spaYn: 1,
        spaYN: 1,
      };

      let listing: any = null;
      if (houseNum) {
        const slugRegex = new RegExp(`^${houseNum}-`);
        listing = await UnifiedListing.findOne({ slugAddress: slugRegex })
          .select(cmaProjection)
          .lean();

        if (!listing && streetWords.length > 0) {
          const lookaheads = streetWords.map((w: string) => `(?=.*${w})`).join("");
          const re = new RegExp(`^${houseNum}.*${lookaheads}`, "i");
          listing = await UnifiedListing.findOne({ unparsedAddress: re })
            .select(cmaProjection)
            .lean();
        }
      }

      if (!listing) {
        return {
          component: "cma",
          cmaScope: "listing",
          cma: null,
          reason: `no listing matched ${houseNum ? `house# ${houseNum} + ` : ""}street "${(addrEntity as any).street}"`,
          ms: Date.now() - t0,
        };
      }

      const adapted = listing.cmaStats
        ? adaptPrebuiltCmaStats(listing.cmaStats, listing)
        : null;

      return {
        component: "cma",
        cmaScope: "listing",
        listingKey: listing.listingKey,
        slugAddress: listing.slugAddress,
        subdivisionName: listing.subdivisionName,
        cma: adapted,
        hasPrebuilt: Boolean(adapted),
        reason: adapted
          ? undefined
          : "no pre-computed cmaStats — CMAReport will fall back to /api/cma/generate",
        ms: Date.now() - t0,
      };
    }

    // ----- subdivision-level CMA -----
    if (subEntity) {
      const derivedSlug = ((subEntity as any).name as string)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const slug = (subEntity as any).slug || derivedSlug;

      const sub: any = await Subdivision.findOne({
        $or: [{ slug }, { name: (subEntity as any).name }],
      })
        .select("name slug city")
        .lean();

      if (!sub) {
        return {
          component: "cma",
          cmaScope: "subdivision",
          slug,
          subdivisionName: (subEntity as any).name,
          reason: `subdivision "${(subEntity as any).name}" not found in registry`,
          ms: Date.now() - t0,
        };
      }

      return {
        component: "cma",
        cmaScope: "subdivision",
        subdivisionName: sub.name,
        slug: sub.slug,
        city: sub.city,
        ms: Date.now() - t0,
      };
    }

    // ----- street-level CMA: disambiguation step -----
    // User typed a street with no house number ("cma for desi drive").
    // Pull the active listings on that street and let them pick one to
    // run a real CMA on. We reuse the street primitive from the regular
    // listing-search path; the difference is the cmaScope marker so the
    // renderer knows to frame these as "pick one to CMA".
    if (streetEntity) {
      const cityName = (streetEntity as any).cityName;
      const scope: ListingScope = {
        type: "street",
        streetName: (streetEntity as any).street,
        cityName,
        cityId: cityName?.toLowerCase().replace(/\s+/g, "-"),
      };
      try {
        const { query, Model } = await buildListingQuery(scope, {});
        const docs = await Model.find(query)
          .select(LISTING_PROJECTION)
          .limit(8)
          .lean();
        const withPhotos = await attachPhotos(docs as any[]);
        const listings = withPhotos.map(mapListing);

        return {
          component: "cma",
          cmaScope: "listingOptions",
          listings,
          totalCount: listings.length,
          scope: {
            type: "street",
            value: (streetEntity as any).street,
          },
          // Narrator picks this up to phrase the prompt naturally.
          reason: `Found ${listings.length} ${listings.length === 1 ? "property" : "properties"} on ${(streetEntity as any).street}${cityName ? `, ${cityName}` : ""}. Pick one to run a CMA on.`,
          ms: Date.now() - t0,
        };
      } catch (err: any) {
        return {
          component: "cma",
          cmaScope: "listingOptions",
          listings: [],
          reason: err?.message || "street CMA lookup failed",
          ms: Date.now() - t0,
        };
      }
    }

    return {
      component: "cma",
      cma: null,
      reason: "Tell me which property you'd like the CMA for — an address, a street, or a subdivision name.",
      ms: Date.now() - t0,
    };
  }

  // ----- not yet implemented -----
  return {
    component: null,
    reason: `preview not wired for intent: ${parsed.intent}`,
    ms: Date.now() - t0,
  };
}
