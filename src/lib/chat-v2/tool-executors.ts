// src/lib/chat-v2/tool-executors.ts
// Tool execution logic - Keep it simple!

import { identifyEntityType } from "../chat/utils/entity-recognition";
import { trackToolUsage } from "./user-analytics";
import type { UserBehaviorEvent } from "./types";
import dbConnect from "@/lib/mongodb";
import UnifiedListing from "@/models/unified-listing";
import Article from "@/models/article";

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

async function executeSearchHomes(args: {
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
}): Promise<{ success: boolean; data: any }> {
  const { location, ...filterArgs } = args;

  // Identify location type (city, subdivision, county, region)
  // NOW DATABASE-DRIVEN: Queries actual subdivisions/cities from database
  const entityResult = await identifyEntityType(location);

  console.log(`[searchHomes] Location: ${location}, Type: ${entityResult.type}, Normalized: ${entityResult.value}`);
  if (entityResult.type === 'subdivision-group') {
    console.log(`[searchHomes] 🎯 Subdivision Group Detected! Includes: ${entityResult.subdivisions?.join(', ')}`);
  }

  // City, subdivision, and subdivision-group types have listing APIs
  // For other types (county, region, general, listing), we can't fetch neighborhood listings
  const hasListingsAPI = entityResult.type === 'city' || entityResult.type === 'subdivision' || entityResult.type === 'subdivision-group';

  if (!hasListingsAPI) {
    console.warn(`[searchHomes] ⚠️ No listings API for type "${entityResult.type}". Skipping stats fetch.`);
  }

  // Fetch stats for AI response using DIRECT DATABASE QUERY
  // This avoids server-to-server HTTP calls which can fail/timeout on production
  let stats = null;

  // Only fetch stats if we have a listings API for this type
  if (hasListingsAPI) {
    try {
      console.log(`[searchHomes] Fetching stats directly from database...`);

      // Connect to MongoDB
      await dbConnect();

      // Build MongoDB query based on entity type
      const dbQuery: any = {
        // CRITICAL FILTERS: Only active residential sales (no rentals, no sold/pending)
        standardStatus: "Active",
        // Type A = Residential Sale (houses, condos, townhomes)
        // Type B = Rentals (this was causing $1,750 rental to appear!)
        // Type C = Multifamily, Type D = Land
        propertyType: "A",
        // Exclude Co-Ownership/Timeshares (these have weird pricing)
        propertySubType: { $nin: ["Co-Ownership", "Timeshare"] }
      };

      if (entityResult.type === 'subdivision') {
        // Case-insensitive subdivision match
        dbQuery.subdivisionName = new RegExp(`^${entityResult.value}$`, 'i');
        console.log(`[searchHomes] Querying subdivision: ${entityResult.value}`);
      } else if (entityResult.type === 'subdivision-group') {
        // Query ALL subdivisions in the group (e.g., all "BDCC *" subdivisions)
        // Use $in operator with exact matches for each subdivision
        if (entityResult.subdivisions && entityResult.subdivisions.length > 0) {
          dbQuery.subdivisionName = { $in: entityResult.subdivisions };
          console.log(`[searchHomes] Querying subdivision group with ${entityResult.subdivisions.length} subdivisions:`, entityResult.subdivisions);
        }
      } else if (entityResult.type === 'city') {
        // Case-insensitive city match
        dbQuery.city = new RegExp(`^${entityResult.value}$`, 'i');
        console.log(`[searchHomes] Querying city: ${entityResult.value}`);
      }

      // Apply any additional filters from user query
      if (filterArgs.minPrice) dbQuery.listPrice = { ...dbQuery.listPrice, $gte: filterArgs.minPrice };
      if (filterArgs.maxPrice) dbQuery.listPrice = { ...dbQuery.listPrice, $lte: filterArgs.maxPrice };

      // Bed filter - use actual database field (bedsTotal is always present)
      if (filterArgs.beds) {
        dbQuery.bedsTotal = filterArgs.beds;
      }

      // Bath filter - use actual database fields (bathsTotal and bathroomsTotalInteger are always present)
      if (filterArgs.baths) {
        dbQuery.$and = dbQuery.$and || [];
        dbQuery.$and.push({
          $or: [
            { bathsTotal: filterArgs.baths },
            { bathroomsTotalInteger: filterArgs.baths }
          ]
        });
      }

      if (filterArgs.pool) dbQuery.poolYn = true;
      // Don't override propertyType if user doesn't specify (we already set it to "A")
      if (filterArgs.propertyType) dbQuery.propertyType = filterArgs.propertyType;

      // Log the full query for debugging
      console.log(`[searchHomes] Database query:`, JSON.stringify(dbQuery, null, 2));

      // Get total count
      const totalListings = await UnifiedListing.countDocuments(dbQuery);
      console.log(`[searchHomes] Found ${totalListings} listings`);

      if (totalListings > 0) {
        // Get count of new listings (past 7 days) using aggregation - matches API logic
        const newListingsAggregation = await UnifiedListing.aggregate([
          { $match: dbQuery },
          {
            $addFields: {
              daysOnMarket: {
                $cond: [
                  { $ne: ["$onMarketDate", null] },
                  {
                    $floor: {
                      $divide: [
                        { $subtract: [new Date(), { $toDate: "$onMarketDate" }] },
                        1000 * 60 * 60 * 24
                      ]
                    }
                  },
                  null
                ]
              }
            }
          },
          {
            $match: {
              daysOnMarket: { $lte: 7, $ne: null }
            }
          },
          {
            $count: "newListingsCount"
          }
        ]);

        const newListingsCount = newListingsAggregation[0]?.newListingsCount || 0;
        console.log(`[searchHomes] Found ${newListingsCount} new listings (past 7 days)`);

        // Get listings for calculating stats, city info, AND learning about the area
        // Include publicRemarks, amenities, HOA info so AI can understand the subdivision
        const listings = await UnifiedListing.find(dbQuery)
          .select('listPrice livingArea propertyType propertySubType bedroomsTotal bathroomsTotalInteger city publicRemarks associationFee associationFeeFrequency poolYn spaYn viewYn')
          .limit(50)  // Limit for performance (sample of listings is enough for context)
          .lean()
          .exec();

        // Calculate price statistics
        const prices = listings.map(l => l.listPrice).filter(Boolean);
        const sortedPrices = [...prices].sort((a, b) => a - b);

        // Calculate property type breakdown (by propertySubType: Single-Family, Condo, Townhouse, etc.)
        const propertyTypeCounts: Record<string, number> = {};
        listings.forEach(listing => {
          if (listing.propertySubType) {
            propertyTypeCounts[listing.propertySubType] = (propertyTypeCounts[listing.propertySubType] || 0) + 1;
          }
        });

        const propertyTypes = Object.entries(propertyTypeCounts).map(([subType, count]) => {
          const typeListings = listings.filter(l => l.propertySubType === subType);
          const avgPrice = typeListings
            .filter(l => l.listPrice)
            .reduce((sum, l) => sum + (l.listPrice || 0), 0) / count;
          const sqftListings = typeListings.filter(l => l.livingArea && l.livingArea > 0);
          const avgSqft = sqftListings.length > 0
            ? sqftListings.reduce((sum, l) => sum + (l.livingArea || 0), 0) / sqftListings.length
            : 0;
          const priceSqft = avgSqft > 0 ? Math.round(avgPrice / avgSqft) : 0;
          return { type: subType, count, avgPrice, avgSqft, priceSqft };
        });

        // Extract city from listings (use most common city if multiple)
        const cityCounts: Record<string, number> = {};
        listings.forEach(listing => {
          if (listing.city) {
            cityCounts[listing.city] = (cityCounts[listing.city] || 0) + 1;
          }
        });
        const actualCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

        // Extract insights from publicRemarks and listing data
        // This gives AI REAL knowledge about the subdivision from actual listings
        const publicRemarksText = listings
          .map(l => l.publicRemarks)
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        // Extract HOA info
        const hoaFees = listings
          .map(l => l.associationFee)
          .filter(fee => fee && fee > 0);
        const minHOA = hoaFees.length > 0 ? Math.min(...hoaFees) : null;
        const maxHOA = hoaFees.length > 0 ? Math.max(...hoaFees) : null;

        // Count amenities from database fields AND publicRemarks (more comprehensive)
        let poolCount = listings.filter(l => l.poolYn === true).length;
        let spaCount = listings.filter(l => l.spaYn === true).length;
        let viewCount = listings.filter(l => l.viewYn === true).length;

        // If fields aren't populated, check publicRemarks
        if (poolCount === 0) {
          poolCount = listings.filter(l => l.publicRemarks?.toLowerCase().includes('pool')).length;
        }
        if (spaCount === 0) {
          spaCount = listings.filter(l => l.publicRemarks?.toLowerCase().includes('spa')).length;
        }
        if (viewCount === 0) {
          viewCount = listings.filter(l =>
            l.publicRemarks?.toLowerCase().includes('view') ||
            l.publicRemarks?.toLowerCase().includes('mountain')
          ).length;
        }

        // Smarter gated detection - check for positive mentions, not just word presence
        const gatedPositive = publicRemarksText.match(/\b(gated community|gated subdivision|guard gated|24.?hour guard)/gi);
        const gatedNegative = publicRemarksText.match(/\b(not gated|non.?gated|no gate)/gi);
        const isGated = gatedPositive && gatedPositive.length > (gatedNegative?.length || 0);

        // Detect golf course (look for "golf" in remarks)
        const hasGolf = publicRemarksText.includes('golf');

        // Extract common phrases (insights about the area)
        const areaInsights: string[] = [];
        if (hasGolf) areaInsights.push('golf course nearby');
        if (poolCount / listings.length > 0.3) areaInsights.push('many properties have pools');
        if (viewCount / listings.length > 0.3) areaInsights.push('many properties have views');

        stats = {
          totalListings,
          newListingsCount: newListingsCount,  // Accurate count from past 7 days (from aggregation)
          newListingsPct: totalListings > 0
            ? Math.round((newListingsCount / totalListings) * 100)
            : 0,
          avgPrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
          medianPrice: sortedPrices.length > 0 ? sortedPrices[Math.floor(sortedPrices.length / 2)] : 0,
          priceRange: {
            min: prices.length > 0 ? Math.min(...prices) : 0,
            max: prices.length > 0 ? Math.max(...prices) : 0
          },
          propertyTypes,
          city: actualCity,  // ACTUAL city from database listings
          // Area insights from actual listing data (RAG - grounding AI knowledge)
          insights: {
            isGated,
            hasGolf,
            hoa: minHOA && maxHOA ? {
              min: minHOA,
              max: maxHOA,
              count: hoaFees.length  // How many listings have HOA
            } : null,
            amenities: {
              poolPercentage: Math.round((poolCount / listings.length) * 100),
              spaPercentage: Math.round((spaCount / listings.length) * 100),
              viewPercentage: Math.round((viewCount / listings.length) * 100)
            },
            keywords: areaInsights
          }
        };

        console.log(`[searchHomes] Stats calculated:`, JSON.stringify(stats, null, 2));
      } else {
        // No listings found - return empty stats
        stats = {
          totalListings: 0,
          newListingsCount: 0,
          newListingsPct: 0,
          avgPrice: 0,
          medianPrice: 0,
          priceRange: { min: 0, max: 0 },
          propertyTypes: []
        };
        console.log(`[searchHomes] No listings found, returning empty stats`);
      }
    } catch (error) {
      console.error(`[searchHomes] Error querying database:`, error);
      // Continue without stats - not critical, but log the error
      stats = {
        totalListings: 0,
        newListingsCount: 0,
        newListingsPct: 0,
        avgPrice: 0,
        medianPrice: 0,
        priceRange: { min: 0, max: 0 },
        propertyTypes: []
      };
    }
  }

  // Build filters object from all provided arguments
  const filters: any = {};

  // Price filters
  if (filterArgs.minPrice) filters.minPrice = filterArgs.minPrice;
  if (filterArgs.maxPrice) filters.maxPrice = filterArgs.maxPrice;

  // Bed/Bath filters (exact match)
  if (filterArgs.beds) filters.beds = filterArgs.beds;
  if (filterArgs.baths) filters.baths = filterArgs.baths;

  // Size filters
  if (filterArgs.minSqft) filters.minSqft = filterArgs.minSqft;
  if (filterArgs.maxSqft) filters.maxSqft = filterArgs.maxSqft;
  if (filterArgs.minLotSize) filters.minLotSize = filterArgs.minLotSize;
  if (filterArgs.maxLotSize) filters.maxLotSize = filterArgs.maxLotSize;

  // Year filters
  if (filterArgs.minYear) filters.minYear = filterArgs.minYear;
  if (filterArgs.maxYear) filters.maxYear = filterArgs.maxYear;

  // Amenity filters
  if (filterArgs.pool) filters.pool = filterArgs.pool;
  if (filterArgs.spa) filters.spa = filterArgs.spa;
  if (filterArgs.view) filters.view = filterArgs.view;
  if (filterArgs.fireplace) filters.fireplace = filterArgs.fireplace;
  if (filterArgs.gatedCommunity) filters.gatedCommunity = filterArgs.gatedCommunity;
  if (filterArgs.seniorCommunity) filters.seniorCommunity = filterArgs.seniorCommunity;

  // Garage/Parking/Stories
  if (filterArgs.garageSpaces) filters.garageSpaces = filterArgs.garageSpaces;
  if (filterArgs.stories) filters.stories = filterArgs.stories;

  // Property type
  if (filterArgs.propertyType) filters.propertyType = filterArgs.propertyType;

  // Geographic filters
  if (filterArgs.eastOf) filters.eastOf = filterArgs.eastOf;
  if (filterArgs.westOf) filters.westOf = filterArgs.westOf;
  if (filterArgs.northOf) filters.northOf = filterArgs.northOf;
  if (filterArgs.southOf) filters.southOf = filterArgs.southOf;

  // HOA filters
  if (filterArgs.hasHOA !== undefined) filters.hasHOA = filterArgs.hasHOA;
  if (filterArgs.maxHOA) filters.maxHOA = filterArgs.maxHOA;
  if (filterArgs.minHOA) filters.minHOA = filterArgs.minHOA;

  // Sorting
  if (filterArgs.sort) filters.sort = filterArgs.sort;

  // Detect if this is a general city query (no filters)
  const hasAnyFilters = Object.keys(filters).length > 0;
  const isGeneralCityQuery = entityResult.type === 'city' && !hasAnyFilters;

  // Log for debugging
  if (isGeneralCityQuery) {
    console.log(`[searchHomes] ℹ️ General city query detected (${stats?.totalListings || 0} total listings)`);
  }

  console.log(`[searchHomes] Filters:`, filters);

  // Return neighborhood identifier for component-first architecture
  // Frontend SubdivisionListings / CityListings component will fetch its own data
  // Only return neighborhood component for supported types (city, subdivision, subdivision-group)
  if (hasListingsAPI) {
    return {
      success: true,
      data: {
        component: "neighborhood",
        neighborhood: {
          type: entityResult.type,
          name: location,
          normalizedName: entityResult.value,
          // For subdivision queries
          ...(entityResult.type === "subdivision" && {
            subdivisionSlug: entityResult.value.toLowerCase().replace(/\s+/g, "-")
          }),
          // For subdivision-group queries (e.g., "BDCC" → multiple BDCC subdivisions)
          ...(entityResult.type === "subdivision-group" && {
            isGroup: true,
            groupPattern: entityResult.value,  // "BDCC"
            subdivisions: entityResult.subdivisions,  // ["BDCC Bellissimo", "BDCC Castle", ...]
            // Use the first subdivision's slug as a fallback for component rendering
            subdivisionSlug: entityResult.subdivisions?.[0]?.toLowerCase().replace(/\s+/g, "-")
          }),
          // For city queries
          ...(entityResult.type === "city" && {
            cityId: entityResult.value.toLowerCase().replace(/\s+/g, "-")
          }),
          filters
        },
        location: {
          name: location,
          type: entityResult.type,
          normalized: entityResult.value,
          // ACTUAL city from database (prevents AI hallucination)
          city: stats?.city || null,
          // Include subdivision list for AI to explain in response
          ...(entityResult.type === "subdivision-group" && {
            subdivisions: entityResult.subdivisions
          })
        },
        // Include stats for AI to generate better responses
        stats: stats || {
          totalListings: 0,
          newListingsCount: 0,
          newListingsPct: 0,
          avgPrice: 0,
          medianPrice: 0,
          priceRange: { min: 0, max: 0 },
          propertyTypes: []
        },
        // Metadata for AI to explain query type
        metadata: {
          isGeneralCityQuery  // True if city query with no filters - AI can suggest adding filters
        }
      }
    };
  } else {
    // For unsupported types (county, region, general, listing), just return location info
    // AI will respond without trying to show a listings component
    return {
      success: true,
      data: {
        location: {
          name: location,
          type: entityResult.type,
          normalized: entityResult.value
        },
        // Return empty stats so AI knows there are no listings available
        stats: {
          totalListings: 0,
          newListingsCount: 0,
          newListingsPct: 0,
          avgPrice: 0,
          medianPrice: 0,
          priceRange: { min: 0, max: 0 },
          propertyTypes: []
        }
      }
    };
  }
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
