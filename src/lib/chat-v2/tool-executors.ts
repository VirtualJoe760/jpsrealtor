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
  const entityResult = identifyEntityType(location);

  console.log(`[searchHomes] Location: ${location}, Type: ${entityResult.type}, Normalized: ${entityResult.value}`);

  // Only city and subdivision types have listing APIs
  // For other types (county, region, general, listing), we can't fetch neighborhood listings
  const hasListingsAPI = entityResult.type === 'city' || entityResult.type === 'subdivision';

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
      } else if (entityResult.type === 'city') {
        // Case-insensitive city match
        dbQuery.city = new RegExp(`^${entityResult.value}$`, 'i');
        console.log(`[searchHomes] Querying city: ${entityResult.value}`);
      }

      // Apply any additional filters from user query
      if (filterArgs.minPrice) dbQuery.listPrice = { ...dbQuery.listPrice, $gte: filterArgs.minPrice };
      if (filterArgs.maxPrice) dbQuery.listPrice = { ...dbQuery.listPrice, $lte: filterArgs.maxPrice };
      if (filterArgs.beds) dbQuery.bedroomsTotal = filterArgs.beds;
      if (filterArgs.baths) dbQuery.bathroomsTotalInteger = filterArgs.baths;
      if (filterArgs.pool) dbQuery.poolYn = true;
      // Don't override propertyType if user doesn't specify (we already set it to "A")
      if (filterArgs.propertyType) dbQuery.propertyType = filterArgs.propertyType;

      // Log the full query for debugging
      console.log(`[searchHomes] Database query:`, JSON.stringify(dbQuery, null, 2));

      // Get total count
      const totalListings = await UnifiedListing.countDocuments(dbQuery);
      console.log(`[searchHomes] Found ${totalListings} listings`);

      if (totalListings > 0) {
        // Get listings for calculating stats
        const listings = await UnifiedListing.find(dbQuery)
          .select('listPrice livingArea propertyType bedroomsTotal bathroomsTotalInteger')
          .lean()
          .exec();

        // Calculate price statistics
        const prices = listings.map(l => l.listPrice).filter(Boolean);
        const sortedPrices = [...prices].sort((a, b) => a - b);

        // Calculate property type breakdown
        const propertyTypeCounts: Record<string, number> = {};
        listings.forEach(listing => {
          if (listing.propertyType) {
            propertyTypeCounts[listing.propertyType] = (propertyTypeCounts[listing.propertyType] || 0) + 1;
          }
        });

        const propertyTypes = Object.entries(propertyTypeCounts).map(([type, count]) => ({
          type,
          count,
          avgPrice: listings
            .filter(l => l.propertyType === type && l.listPrice)
            .reduce((sum, l) => sum + (l.listPrice || 0), 0) / count,
          avgSqft: listings
            .filter(l => l.propertyType === type && l.livingArea)
            .reduce((sum, l) => sum + (l.livingArea || 0), 0) / count
        }));

        stats = {
          totalListings,
          avgPrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
          medianPrice: sortedPrices.length > 0 ? sortedPrices[Math.floor(sortedPrices.length / 2)] : 0,
          priceRange: {
            min: prices.length > 0 ? Math.min(...prices) : 0,
            max: prices.length > 0 ? Math.max(...prices) : 0
          },
          propertyTypes
        };

        console.log(`[searchHomes] Stats calculated:`, JSON.stringify(stats, null, 2));
      } else {
        // No listings found - return empty stats
        stats = {
          totalListings: 0,
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

  console.log(`[searchHomes] Filters:`, filters);

  // Return neighborhood identifier for component-first architecture
  // Frontend SubdivisionListings / CityListings component will fetch its own data
  // Only return neighborhood component for supported types (city, subdivision)
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
          // For city queries
          ...(entityResult.type === "city" && {
            cityId: entityResult.value.toLowerCase().replace(/\s+/g, "-")
          }),
          filters
        },
        location: {
          name: location,
          type: entityResult.type,
          normalized: entityResult.value
        },
        // Include stats for AI to generate better responses
        stats: stats || {
          totalListings: 0,
          avgPrice: 0,
          medianPrice: 0,
          priceRange: { min: 0, max: 0 },
          propertyTypes: []
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

  // Identify location type
  const entityResult = identifyEntityType(location);

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
// TOOL 3: Search Articles
// =========================================================================

async function executeSearchArticles(args: {
  query: string;
}): Promise<{ success: boolean; data: any }> {
  const { query } = args;

  return {
    success: true,
    data: {
      component: "articles",
      query
    }
  };
}
