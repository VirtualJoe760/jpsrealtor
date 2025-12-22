// src/lib/chat-v2/tool-executors.ts
// Tool execution logic - Keep it simple!

import { identifyEntityType } from "../chat/utils/entity-recognition";
import { trackToolUsage } from "./user-analytics";
import type { UserBehaviorEvent } from "./types";

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

  // Fetch stats for AI response
  let stats = null;
  try {
    // Use proper base URL for both dev and production
    const baseUrl = typeof window === 'undefined'
      ? (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000')
      : '';
    let apiUrl = '';

    if (entityResult.type === 'subdivision') {
      const subdivisionSlug = entityResult.value.toLowerCase().replace(/\s+/g, '-');
      apiUrl = `${baseUrl}/api/subdivisions/${subdivisionSlug}/listings`;
    } else if (entityResult.type === 'city') {
      const cityId = entityResult.value.toLowerCase().replace(/\s+/g, '-');
      apiUrl = `${baseUrl}/api/cities/${cityId}/listings`;
    }

    if (apiUrl) {
      // Add filters to query
      const params = new URLSearchParams({ limit: '1' }); // Only need stats, not listings
      Object.entries(filterArgs).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });

      const fullUrl = `${apiUrl}?${params.toString()}`;
      console.log(`[searchHomes] Fetching stats from: ${fullUrl}`);

      const response = await fetch(fullUrl);
      if (response.ok) {
        const data = await response.json();
        stats = data.stats;
        console.log(`[searchHomes] Stats fetched:`, JSON.stringify(stats, null, 2));
      } else {
        console.error(`[searchHomes] Stats fetch failed: ${response.status}`);
      }
    }
  } catch (error) {
    console.error(`[searchHomes] Error fetching stats:`, error);
    // Continue without stats - not critical
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
        // For county queries
        ...(entityResult.type === "county" && {
          countyId: entityResult.value.toLowerCase().replace(/\s+/g, "-")
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
