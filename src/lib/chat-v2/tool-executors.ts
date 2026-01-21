// src/lib/chat-v2/tool-executors.ts
// Tool execution logic - Keep it simple!

import { identifyEntityType } from "../chat/utils/entity-recognition";
import { trackToolUsage } from "./user-analytics";
import type { UserBehaviorEvent } from "./types";
import dbConnect from "@/lib/mongodb";
import UnifiedListing from "@/models/unified-listing";

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

      // Future tools go here:
      // case "generateCMA":
      //   result = await executeGenerateCMA(args);
      //   break;

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

        const propertyTypes = Object.entries(propertyTypeCounts).map(([subType, count]) => ({
          type: subType,  // e.g., "Single Family Residence", "Condominium", "Townhouse"
          count,
          avgPrice: listings
            .filter(l => l.propertySubType === subType && l.listPrice)
            .reduce((sum, l) => sum + (l.listPrice || 0), 0) / count,
          avgSqft: listings
            .filter(l => l.propertySubType === subType && l.livingArea)
            .reduce((sum, l) => sum + (l.livingArea || 0), 0) / count
        }));

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

  // Fetch top 3 articles for RAG (AI will read and synthesize)
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/articles/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: 3 })
    });

    if (!response.ok) {
      console.error('[executeSearchArticles] API call failed:', response.status);
      // Fall back to returning just query if API fails
      return {
        success: true,
        data: {
          component: "articles",
          query
        }
      };
    }

    const data = await response.json();
    const articles = data.results || [];

    console.log(`[executeSearchArticles] Found ${articles.length} articles for RAG`);

    // Return articles content for AI to read and synthesize
    return {
      success: true,
      data: {
        component: "articles",
        query,
        // Include article content for RAG (AI will read these)
        articleSummaries: articles.map((article: any) => ({
          title: article.title,
          excerpt: article.excerpt || article.seo?.description || '',
          url: `/insights/${article.category}/${article.slug}`
        }))
      }
    };
  } catch (error) {
    console.error('[executeSearchArticles] Error fetching articles:', error);
    // Fall back to returning just query if fetch fails
    return {
      success: true,
      data: {
        component: "articles",
        query
      }
    };
  }
}
