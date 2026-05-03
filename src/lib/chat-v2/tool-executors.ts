// src/lib/chat-v2/tool-executors.ts
// Tool execution logic - Keep it simple!

import { identifyEntityType } from "../chat/utils/entity-recognition";
import { trackToolUsage } from "./user-analytics";
import type { UserBehaviorEvent } from "./types";
import dbConnect from "@/lib/mongodb";
import UnifiedListing from "@/models/unified-listing";
import Article from "@/models/article";
import {
  buildListingQuery,
  computeAreaStats,
  deriveTextInsights,
  type ListingScope,
  type ListingFilters,
} from "./listing-query";

/**
 * Execute a tool call and return the result
 * Component-first architecture: Return IDENTIFIERS, not data
 * Frontend components fetch their own data based on these identifiers
 */
export async function executeTool(
  toolName: string,
  args: any,
  userId?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  console.log(`[Tool Executor] Executing: ${toolName}`, args);

  try {
    let result;

    switch (toolName) {
      case "searchHomes":
        result = await executeSearchHomes(args);
        break;

      case "getAppreciation":
        result = await executeGetAppreciation(args);
        break;

      case "searchArticles":
        result = await executeSearchArticles(args);
        break;

      case "getListingDetails":
        result = await executeGetListingDetails(args);
        break;

      case "generateCMA":
        result = await executeGenerateCMA(args);
        break;

      case "askClarification":
        result = {
          success: true,
          data: {
            component: "clarification",
            clarification: {
              question: args.question,
              options: args.options || [],
              context: args.context,
            },
          }
        };
        break;

      default:
        return {
          success: false,
          error: `Unknown tool: ${toolName}`
        };
    }

    // Track user behavior (non-blocking)
    if (userId && result.success && result.data.location) {
      trackToolUsage({
        userId,
        tool: toolName as any,
        location: result.data.location,
        filters: args,
        timestamp: new Date()
      });
    }

    return result;
  } catch (error: any) {
    console.error(`[Tool Executor] Error in ${toolName}:`, error);
    return {
      success: false,
      error: error.message || "Tool execution failed"
    };
  }
}

// =========================================================================
// TOOL 1: Search Homes
// =========================================================================

interface SearchHomesArgs {
  location: string;
  // Price
  minPrice?: number;
  maxPrice?: number;
  // Beds/Baths (exact match)
  beds?: number;
  baths?: number;
  // Size
  minSqft?: number;
  maxSqft?: number;
  minLotSize?: number;
  maxLotSize?: number;
  // Year
  minYear?: number;
  maxYear?: number;
  // Amenities
  pool?: boolean;
  spa?: boolean;
  view?: boolean;
  fireplace?: boolean;
  gatedCommunity?: boolean;
  seniorCommunity?: boolean;
  // Garage/Stories
  garageSpaces?: number;
  stories?: number;
  // Property type
  propertyType?: string;
  // Geographic filters
  eastOf?: string;
  westOf?: string;
  northOf?: string;
  southOf?: string;
  // HOA filters
  hasHOA?: boolean;
  maxHOA?: number;
  minHOA?: number;
  // Sorting
  sort?: string;
}

/** Empty stats object — same shape the AI prompt expects when there's no data. */
const EMPTY_STATS = {
  totalListings: 0,
  newListingsCount: 0,
  newListingsPct: 0,
  avgPrice: 0,
  medianPrice: 0,
  priceRange: { min: 0, max: 0 },
  propertyTypes: [] as any[],
};

/** Translate the SearchHomesArgs filter fields into the shared ListingFilters shape. */
function toListingFilters(args: SearchHomesArgs): ListingFilters {
  const f: ListingFilters = {};
  if (args.minPrice) f.minPrice = args.minPrice;
  if (args.maxPrice) f.maxPrice = args.maxPrice;
  if (args.beds) f.beds = args.beds;
  if (args.baths) f.baths = args.baths;
  if (args.minSqft) f.minSqft = args.minSqft;
  if (args.maxSqft) f.maxSqft = args.maxSqft;
  if (args.minLotSize) f.minLotSize = args.minLotSize;
  if (args.maxLotSize) f.maxLotSize = args.maxLotSize;
  if (args.minYear) f.minYear = args.minYear;
  if (args.maxYear) f.maxYear = args.maxYear;
  if (args.pool) f.pool = true;
  if (args.spa) f.spa = true;
  if (args.view) f.view = true;
  if (args.fireplace) f.fireplace = true;
  if (args.gatedCommunity) f.gatedCommunity = true;
  if (args.seniorCommunity) f.seniorCommunity = true;
  if (args.garageSpaces) f.garageSpaces = args.garageSpaces;
  if (args.stories) f.stories = args.stories;
  if (args.eastOf) f.eastOf = args.eastOf;
  if (args.westOf) f.westOf = args.westOf;
  if (args.northOf) f.northOf = args.northOf;
  if (args.southOf) f.southOf = args.southOf;
  if (args.hasHOA !== undefined) f.hasHOA = args.hasHOA;
  if (args.minHOA) f.minHOA = args.minHOA;
  if (args.maxHOA) f.maxHOA = args.maxHOA;
  if (args.propertyType) {
    // searchHomes schema uses lowercase strings ("house"/"condo"/"townhouse").
    // Those map to propertySubType filtering, not the A/B/C/D propertyType code.
    f.propertySubType = args.propertyType;
  }
  return f;
}

async function executeSearchHomes(args: SearchHomesArgs): Promise<{ success: boolean; data: any }> {
  const { location, ...filterArgs } = args;

  // Identify entity type (city / subdivision / subdivision-group / county / region / general)
  const entityResult = await identifyEntityType(location);
  console.log(`[searchHomes] Location: ${location}, Type: ${entityResult.type}, Normalized: ${entityResult.value}`);
  if (entityResult.type === "subdivision-group") {
    console.log(`[searchHomes] 🎯 Subdivision Group: ${entityResult.subdivisions?.join(", ")}`);
  }

  // Map entity type → ListingScope for the shared helper.
  // city/subdivision/subdivision-group/county all have stats; region/general/listing don't.
  let scope: ListingScope | null = null;
  const cityIdForGeo = entityResult.type === "city"
    ? entityResult.value.toLowerCase().replace(/\s+/g, "-")
    : undefined;

  switch (entityResult.type) {
    case "city":
      scope = { type: "city", cityName: entityResult.value, cityId: cityIdForGeo };
      break;
    case "subdivision":
      scope = { type: "subdivision", subdivisionName: entityResult.value };
      break;
    case "subdivision-group":
      if (entityResult.subdivisions && entityResult.subdivisions.length > 0) {
        scope = { type: "subdivisionGroup", subdivisionNames: entityResult.subdivisions };
      }
      break;
    case "county":
      scope = { type: "county", countyName: entityResult.value };
      break;
  }

  if (!scope) {
    console.warn(`[searchHomes] ⚠️ No scope mapping for type "${entityResult.type}". Returning empty stats.`);
    return {
      success: true,
      data: {
        location: {
          name: location,
          type: entityResult.type,
          normalized: entityResult.value,
        },
        stats: EMPTY_STATS,
      },
    };
  }

  const sharedFilters = toListingFilters(args);

  // Compute stats over the FULL filtered set (was a 50-row JS sample).
  // Run text-insights and stats in parallel.
  let stats: any = EMPTY_STATS;
  let textInsights = { isGated: false, hasGolf: false };
  try {
    const [areaStats, derived] = await Promise.all([
      computeAreaStats(scope, sharedFilters),
      deriveTextInsights(scope, sharedFilters),
    ]);
    textInsights = derived;

    // Map the new AreaStats shape back into the legacy shape the system
    // prompt currently references. The system prompt will be updated in
    // phase 4; until then preserve field names: propertyTypes[*].propertySubType,
    // insights.{isGated,hasGolf,hoa,amenities,keywords}.
    const propertyTypes = areaStats.propertyTypes.map((p) => ({
      propertySubType: p.subType,
      count: p.count,
      avgPrice: p.avgPrice,
      avgPricePerSqft: p.avgPricePerSqft,
    }));

    const keywords: string[] = [];
    if (textInsights.hasGolf) keywords.push("golf course nearby");
    if (areaStats.amenities.poolPct > 30) keywords.push("many properties have pools");
    if (areaStats.amenities.viewPct > 30) keywords.push("many properties have views");

    // Resolve actual city name. Subdivisions/groups can span multiple cities;
    // pull the most common city from the result set.
    let actualCity: string | null = null;
    if (entityResult.type === "city") {
      actualCity = entityResult.value;
    } else {
      const { query, Model } = await buildListingQuery(scope, sharedFilters);
      const cityAgg = await Model.aggregate([
        { $match: query },
        { $group: { _id: "$city", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]);
      actualCity = cityAgg[0]?._id || null;
    }

    stats = {
      totalListings: areaStats.totalListings,
      newListingsCount: areaStats.newListingsCount,
      newListingsPct: areaStats.newListingsPct,
      avgPrice: areaStats.avgPrice,
      medianPrice: areaStats.medianPrice,
      priceRange: areaStats.priceRange,
      avgSqft: areaStats.avgSqft,
      medianSqft: areaStats.medianSqft,
      avgPricePerSqft: areaStats.avgPricePerSqft,
      medianPricePerSqft: areaStats.medianPricePerSqft,
      propertyTypes,
      city: actualCity,
      insights: {
        isGated: textInsights.isGated,
        hasGolf: textInsights.hasGolf,
        hoa: areaStats.hoa
          ? {
              min: areaStats.hoa.min,
              max: areaStats.hoa.max,
              avg: areaStats.hoa.avg,
              count: areaStats.hoa.count,
            }
          : null,
        amenities: {
          poolPercentage: areaStats.amenities.poolPct,
          spaPercentage: areaStats.amenities.spaPct,
          viewPercentage: areaStats.amenities.viewPct,
        },
        keywords,
      },
    };

    console.log(
      `[searchHomes] Stats: ${stats.totalListings} listings, avg $${stats.avgPrice.toLocaleString()}, median $${stats.medianPrice.toLocaleString()}`
    );
  } catch (error) {
    console.error(`[searchHomes] Aggregation error:`, error);
    stats = EMPTY_STATS;
  }

  // Filters object passed through to the frontend so the carousel API
  // re-applies the same filters (carousel + stats stay in sync).
  const filtersOut: any = { ...filterArgs };
  if (filterArgs.sort) filtersOut.sort = filterArgs.sort;

  const hasAnyFilters = Object.keys(filtersOut).filter((k) => k !== "sort").length > 0;
  const isGeneralCityQuery = entityResult.type === "city" && !hasAnyFilters;

  return {
    success: true,
    data: {
      component: "neighborhood",
      neighborhood: {
        type: entityResult.type,
        name: location,
        normalizedName: entityResult.value,
        ...(entityResult.type === "subdivision" && {
          subdivisionSlug: entityResult.value.toLowerCase().replace(/\s+/g, "-"),
        }),
        ...(entityResult.type === "subdivision-group" && {
          isGroup: true,
          groupPattern: entityResult.value,
          subdivisions: entityResult.subdivisions,
          subdivisionSlug: entityResult.subdivisions?.[0]
            ?.toLowerCase()
            .replace(/\s+/g, "-"),
        }),
        ...(entityResult.type === "city" && { cityId: cityIdForGeo }),
        ...(entityResult.type === "county" && {
          countyName: entityResult.value,
        }),
        filters: filtersOut,
      },
      location: {
        name: location,
        type: entityResult.type,
        normalized: entityResult.value,
        city: stats?.city || null,
        ...(entityResult.type === "subdivision-group" && {
          subdivisions: entityResult.subdivisions,
        }),
      },
      stats,
      metadata: { isGeneralCityQuery },
    },
  };
}

// =========================================================================
// TOOL 2: Get Appreciation
// =========================================================================

async function executeGetAppreciation(args: {
  location: string;
  period?: string;
}): Promise<{ success: boolean; data: any }> {
  const { location, period = "5y" } = args;

  // Identify location type (database-driven)
  const entityResult = await identifyEntityType(location);

  // Build location object compatible with V1 structure
  // ChatResultsContainer expects { city?, subdivision?, county? } format
  const locationObj: any = {};
  if (entityResult.type === "subdivision") {
    locationObj.subdivision = entityResult.value;
  } else if (entityResult.type === "city") {
    locationObj.city = entityResult.value;
  } else if (entityResult.type === "county") {
    locationObj.county = entityResult.value;
  } else {
    // Fallback for unknown types
    locationObj.city = entityResult.value;
  }

  return {
    success: true,
    data: {
      component: "appreciation",
      location: locationObj,  // Now matches V1 format: { subdivision: "..." } or { city: "..." }
      period
    }
  };
}

// =========================================================================
// TOOL 3: Search Articles (with RAG - Retrieval-Augmented Generation)
// =========================================================================

async function executeSearchArticles(args: {
  query: string;
}): Promise<{ success: boolean; data: any }> {
  const { query } = args;

  console.log('[executeSearchArticles] 📚 Fetching articles for RAG...');
  console.log('[executeSearchArticles] Query:', query);

  // Fetch top 3 articles directly from MongoDB for RAG (AI will read and synthesize)
  try {
    await dbConnect();

    // Perform MongoDB text search on published articles
    const articles = await Article.find(
      {
        status: "published",
        $text: { $search: query }
      },
      {
        score: { $meta: "textScore" }
      }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(3)
      .select("title slug excerpt content category seo")
      .lean();

    console.log(`[executeSearchArticles] ✅ Found ${articles.length} articles for RAG`);

    if (articles.length === 0) {
      console.log('[executeSearchArticles] ⚠️ No articles found, returning query only');
      return {
        success: true,
        data: {
          component: "articles",
          query
        }
      };
    }

    // Log article titles for debugging
    articles.forEach((article: any, idx: number) => {
      console.log(`[executeSearchArticles] Article ${idx + 1}: ${article.title}`);
    });

    // Return articles content for AI to read and synthesize (RAG)
    // NOTE: No URLs included - frontend fetches/displays articles separately via /api/articles/search
    return {
      success: true,
      data: {
        component: "articles",
        query,
        // Include FULL article content for RAG (AI will read these and extract accurate data)
        articleSummaries: articles.map((article: any) => ({
          title: article.title,
          content: article.content || article.excerpt || article.seo?.description || ''
          // URL intentionally omitted - not needed for AI synthesis
        }))
      }
    };
  } catch (error) {
    console.error('[executeSearchArticles] ❌ Error fetching articles:', error);
    // Fall back to returning just query if DB query fails
    return {
      success: true,
      data: {
        component: "articles",
        query
      }
    };
  }
}

// =========================================================================
// TOOL 4: Get Listing Details - Single property lookup
// =========================================================================

async function executeGetListingDetails(args: { address: string }): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  const { address } = args;

  if (!address || address.trim().length < 3) {
    return {
      success: true,
      data: {
        component: "listingDetail",
        listingDetail: null,
        listing: null,
        message: "Please provide a more specific address to look up."
      }
    };
  }

  const startTime = Date.now();
  console.log('[executeGetListingDetails] 🔍 Looking up:', address);

  await dbConnect();

  // First, check if multiple listings match (ambiguous query like "desi drive")
  const slugQuery = address.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const words = address.split(/[\s,]+/).filter(w => w.length > 1);

  // Check if query starts with a house number — allows prefix-anchored regex (uses index)
  const startsWithNumber = /^\d+/.test(slugQuery);
  // slugAddress is always lowercase, so no need for /i flag (allows index usage)
  const slugRegex = startsWithNumber
    ? new RegExp(`^${slugQuery}`) // Prefix match — uses slugAddress index
    : new RegExp(slugQuery);      // Contains match — still fast for short patterns

  const selectFields = 'listingKey slugAddress unparsedAddress unparsedFirstLineAddress city subdivisionName listPrice bedroomsTotal bathroomsTotalDecimal livingArea primaryPhotoUrl';
  let multipleMatches: any[] = [];

  // Try slug-based multi-match first (uses slugAddress index for prefix queries)
  multipleMatches = await UnifiedListing.find({
    slugAddress: slugRegex,
    standardStatus: "Active"
  }).select(selectFields).sort({ listPrice: -1 }).limit(10).lean();

  // If no slug matches, try address regex multi-match
  if (multipleMatches.length === 0 && words.length > 0) {
    const regexParts = words.map(w => `(?=.*${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`);
    const regex = new RegExp(regexParts.join(''), 'i');
    multipleMatches = await UnifiedListing.find({
      unparsedAddress: regex,
      standardStatus: "Active"
    }).select(selectFields).sort({ listPrice: -1 }).limit(10).lean();
  }

  console.log(`[executeGetListingDetails] ⚡ Lookup took ${Date.now() - startTime}ms, found ${multipleMatches.length} matches`);

  // If multiple matches found, return them as options for the user to pick
  if (multipleMatches.length > 1) {
    console.log(`[executeGetListingDetails] 🔀 Found ${multipleMatches.length} matches — returning options`);
    // For listings missing primaryPhotoUrl, do a targeted lookup for just the first media item
    const missingPhotos = multipleMatches.filter((l: any) => !l.primaryPhotoUrl);
    let photoMap: Record<string, string> = {};
    if (missingPhotos.length > 0) {
      const photoLookups = await UnifiedListing.find(
        { listingKey: { $in: missingPhotos.map((l: any) => l.listingKey) } },
      ).select('listingKey media').lean();
      for (const pl of photoLookups) {
        const m = (pl as any).media?.[0];
        if (m) photoMap[(pl as any).listingKey] = m.Uri800 || m.Uri640 || m.Uri1024 || '';
      }
    }

    const options = multipleMatches.map((l: any) => ({
      listingKey: l.listingKey,
      slugAddress: l.slugAddress,
      address: l.unparsedAddress || l.unparsedFirstLineAddress,
      city: l.city,
      subdivision: l.subdivisionName,
      price: l.listPrice,
      beds: l.bedroomsTotal,
      baths: l.bathroomsTotalDecimal,
      sqft: l.livingArea,
      primaryPhotoUrl: l.primaryPhotoUrl || photoMap[l.listingKey] || null,
    }));

    return {
      success: true,
      data: {
        component: "listingOptions",
        listingOptions: options,
        message: `Found ${options.length} listings matching "${address}". Ask the user which one they'd like to see details for.`,
        location: address,
      }
    };
  }

  // Single match or fallback lookup
  let listing: any = multipleMatches.length === 1
    ? await UnifiedListing.findOne({ listingKey: multipleMatches[0].listingKey }).lean()
    : null;

  // Fallback strategies for no matches
  if (!listing) {
    listing = await UnifiedListing.findOne({ slugAddress: slugRegex }).sort({ modificationTimestamp: -1 }).lean();
  }
  if (!listing && words.length > 0) {
    const regexParts = words.map(w => `(?=.*${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`);
    const regex = new RegExp(regexParts.join(''), 'i');
    listing = await UnifiedListing.findOne({ unparsedAddress: regex }).sort({ modificationTimestamp: -1 }).lean();
  }
  if (!listing) {
    listing = await UnifiedListing.findOne({ listingKey: address }).lean();
  }

  if (!listing) {
    console.log('[executeGetListingDetails] ❌ No listing found for:', address);
    return {
      success: true,
      data: {
        component: "listingDetail",
        listingDetail: null,
        listing: null,
        message: `No listing found matching "${address}". Try using searchHomes to browse the area instead.`
      }
    };
  }

  console.log('[executeGetListingDetails] ✅ Found listing:', listing.unparsedAddress, listing.listingKey);

  // Extract photos from media array
  const media = listing.media || [];
  const photos = media
    .filter((m: any) => m.MediaCategory === 'Photo' || m.MediaCategory === 'Primary Photo')
    .slice(0, 20)
    .map((m: any) => m.Uri800 || m.Uri640 || m.Uri1024 || m.UriLarge || m.MediaURL)
    .filter(Boolean);

  // Fallback to primaryPhotoUrl
  const primaryPhotoUrl = listing.primaryPhotoUrl ||
    (media[0] && (media[0].Uri800 || media[0].Uri640)) ||
    '/images/no-photo.png';

  if (photos.length === 0 && primaryPhotoUrl !== '/images/no-photo.png') {
    photos.push(primaryPhotoUrl);
  }

  return {
    success: true,
    data: {
      component: "listingDetail",
      // Component data for frontend (photo carousel + stats card)
      listingDetail: {
        listingKey: listing.listingKey,
        slugAddress: listing.slugAddress || listing.slug,
        address: listing.unparsedAddress || listing.unparsedFirstLineAddress || address,
        primaryPhotoUrl,
        city: listing.city,
        subdivision: listing.subdivisionName,
        price: listing.listPrice,
        status: listing.standardStatus,
        beds: listing.bedroomsTotal,
        baths: listing.bathroomsTotalDecimal || listing.bathroomsTotalInteger,
        sqft: listing.livingArea,
        lotSizeSqft: listing.lotSizeArea || listing.lotSizeSqft,
        yearBuilt: listing.yearBuilt,
        propertySubType: listing.propertySubType,
        garageSpaces: listing.garageSpaces,
        pool: listing.poolYn || listing.poolYN,
        spa: listing.spaYn || listing.spaYN,
        view: listing.viewYn || listing.viewYN,
        hoaFee: listing.associationFee,
        hoaFrequency: listing.associationFeeFrequency,
        daysOnMarket: listing.daysOnMarket,
        stories: listing.stories,
      },
      // Full listing data for AI to format as markdown
      listing: {
        address: listing.unparsedAddress || listing.unparsedFirstLineAddress,
        city: listing.city,
        state: listing.stateOrProvince,
        zip: listing.postalCode,
        subdivision: listing.subdivisionName,
        price: listing.listPrice,
        status: listing.standardStatus,
        beds: listing.bedroomsTotal,
        baths: listing.bathroomsTotalDecimal || listing.bathroomsTotalInteger,
        sqft: listing.livingArea,
        lotSizeSqft: listing.lotSizeArea || listing.lotSizeSqft,
        lotSizeAcres: listing.lotSizeAcres,
        yearBuilt: listing.yearBuilt,
        propertySubType: listing.propertySubType,
        stories: listing.stories,
        garageSpaces: listing.garageSpaces,
        pool: listing.poolYn || listing.poolYN,
        spa: listing.spaYn || listing.spaYN,
        view: listing.viewYn || listing.viewYN,
        fireplacesTotal: listing.fireplacesTotal,
        hoaFee: listing.associationFee,
        hoaFrequency: listing.associationFeeFrequency,
        daysOnMarket: listing.daysOnMarket,
        publicRemarks: listing.publicRemarks,
        cooling: listing.cooling,
        heating: listing.heating,
        flooring: listing.flooring,
        parkingTotal: listing.parkingTotal,
        photoCount: photos.length,
        listingUrl: `/mls-listings/${listing.slugAddress || listing.slug || listing.listingKey}`,
      },
      location: listing.unparsedAddress || address,
    }
  };
}

// =========================================================================
// Shared: Fuzzy listing lookup
// =========================================================================

async function findListingByAddress(address: string): Promise<any | null> {
  const startTime = Date.now();
  await dbConnect();

  const slugQuery = address.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const startsWithNumber = /^\d+/.test(slugQuery);
  const slugRegex = startsWithNumber ? new RegExp(`^${slugQuery}`) : new RegExp(slugQuery);

  // Active by slug
  let listing = await UnifiedListing.findOne({
    slugAddress: slugRegex,
    standardStatus: "Active"
  }).lean();

  // Active by address regex
  if (!listing) {
    const words = address.split(/[\s,]+/).filter(w => w.length > 1);
    if (words.length > 0) {
      const regexParts = words.map(w => `(?=.*${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`);
      const regex = new RegExp(regexParts.join(''), 'i');
      listing = await UnifiedListing.findOne({ unparsedAddress: regex, standardStatus: "Active" }).lean();
    }
  }

  // Any status by slug
  if (!listing) {
    listing = await UnifiedListing.findOne({ slugAddress: slugRegex }).sort({ modificationTimestamp: -1 }).lean();
  }

  // Any status by address regex
  if (!listing) {
    const words = address.split(/[\s,]+/).filter(w => w.length > 1);
    if (words.length > 0) {
      const regexParts = words.map(w => `(?=.*${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`);
      const regex = new RegExp(regexParts.join(''), 'i');
      listing = await UnifiedListing.findOne({ unparsedAddress: regex }).sort({ modificationTimestamp: -1 }).lean();
    }
  }

  // Listing key exact match
  if (!listing) {
    listing = await UnifiedListing.findOne({ listingKey: address }).lean();
  }

  console.log(`[findListingByAddress] ⚡ Lookup took ${Date.now() - startTime}ms, found: ${listing ? 'yes' : 'no'}`);
  return listing;
}

// =========================================================================
// TOOL 5: Generate CMA
// =========================================================================

async function executeGenerateCMA(args: { address: string }): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  const { address } = args;

  if (!address || address.trim().length < 3) {
    return {
      success: true,
      data: {
        component: "cmaReport",
        cmaReport: null,
        message: "Please provide a property address to generate a CMA for."
      }
    };
  }

  console.log('[executeGenerateCMA] 🔍 Looking up listing for CMA:', address);

  const listing = await findListingByAddress(address);

  if (!listing) {
    return {
      success: true,
      data: {
        component: "cmaReport",
        cmaReport: null,
        message: `No listing found matching "${address}". Try providing the full address or use searchHomes to find the property first.`
      }
    };
  }

  console.log('[executeGenerateCMA] ✅ Found listing:', listing.unparsedAddress, listing.listingKey);

  return {
    success: true,
    data: {
      component: "cmaReport",
      cmaReport: {
        listingKey: listing.listingKey,
        address: listing.unparsedAddress || listing.unparsedFirstLineAddress || address,
        subdivisionName: listing.subdivisionName,
        price: listing.listPrice,
        city: listing.city,
      },
      // Summary for the AI to acknowledge
      listing: {
        address: listing.unparsedAddress,
        city: listing.city,
        subdivision: listing.subdivisionName,
        price: listing.listPrice,
        sqft: listing.livingArea,
        beds: listing.bedroomsTotal,
        baths: listing.bathroomsTotalDecimal || listing.bathroomsTotalInteger,
      },
      location: listing.unparsedAddress || address,
    }
  };
}
