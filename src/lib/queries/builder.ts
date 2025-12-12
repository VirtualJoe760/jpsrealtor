/**
 * Query Builder - Main Interface
 *
 * Main interface for chat tools to query the database.
 * Orchestrates aggregators, filters, and calculations to provide comprehensive results.
 */

import {
  getActiveListings,
  getActiveListingsByCity,
  getActiveListingsBySubdivision,
  getActiveListingsByZip,
  getActiveListingsByCounty,
  type ActiveListingsFilters,
  type ActiveListing,
} from './aggregators/active-listings';
import { getMarketStats, type MarketStats } from './aggregators/market-stats';
import {
  getClosedListings,
  getClosedListingsByCity,
  getClosedListingsBySubdivision,
  type ClosedListingsFilters,
  type ClosedListing,
} from './aggregators/closed-listings';
import { getClosedMarketStats, type ClosedMarketStats } from './aggregators/closed-market-stats';
import { compareLocations, determineWinner, type ComparisonResult } from './calculations/comparison';
import { calculateDOMStats, getDOMInsights, type DOMStats } from './calculations/dom-stats';
import { calculateAppreciation, calculatePriceTrends, type AppreciationResult } from './calculations/appreciation';
import { logQueryPerformance } from './monitoring';

export interface QueryOptions {
  // Location (use one)
  city?: string;
  subdivision?: string;
  zip?: string;
  county?: string;

  // All other filters
  filters?: ActiveListingsFilters;

  // Include options
  includeStats?: boolean;
  includeDOMStats?: boolean;
  includeComparison?: {
    compareWith: string; // Another city/subdivision
    isCity?: boolean; // Is the comparison target a city?
  };

  // Phase 3: Closed listings support
  includeClosedListings?: boolean;
  includeClosedStats?: boolean;
  includeAppreciation?: boolean;
  closedListingsFilters?: {
    yearsBack?: number;
    startDate?: Date;
    endDate?: Date;
  };

  // Pagination
  limit?: number;
  skip?: number;
  sort?: ActiveListingsFilters['sort'];

  // Phase 4: Performance options
  useCache?: boolean; // Enable/disable caching (default: true)
  bypassCache?: boolean; // Force fresh query (default: false)
}

export interface QueryResult {
  listings: ActiveListing[];
  stats?: MarketStats;
  domStats?: DOMStats & { insights: string[] };
  comparison?: ComparisonResult & { winner: string };

  // Phase 3: Closed listings data
  closedListings?: ClosedListing[];
  closedStats?: ClosedMarketStats;
  appreciation?: AppreciationResult;
  priceTrends?: ReturnType<typeof calculatePriceTrends>;

  meta: {
    query: QueryOptions;
    executionTime: number;
    totalListings: number;
    totalClosedSales?: number;
    cached?: boolean; // Phase 4: Cache hit indicator
    cacheHit?: boolean;
    cachedAt?: string;
    cacheTTL?: number;
  };
}

/**
 * Execute a comprehensive query across the database
 *
 * @example
 * ```typescript
 * // Query by city with filters
 * const result = await executeQuery({
 *   city: "Palm Desert",
 *   filters: { minBeds: 3, maxPrice: 800000, pool: true },
 *   includeStats: true
 * });
 *
 * // Compare two cities
 * const result = await executeQuery({
 *   city: "La Quinta",
 *   includeStats: true,
 *   includeComparison: { compareWith: "Palm Desert", isCity: true }
 * });
 * ```
 */
export async function executeQuery(options: QueryOptions): Promise<QueryResult> {
  const startTime = Date.now();

  const result: QueryResult = {
    listings: [],
    meta: {
      query: options,
      executionTime: 0,
      totalListings: 0,
    },
  };

  // Merge filters with location
  const mergedFilters: ActiveListingsFilters = {
    ...options.filters,
    limit: options.limit,
    skip: options.skip,
    sort: options.sort,
  };

  // Fetch active listings based on location type
  if (options.city) {
    result.listings = await getActiveListingsByCity(options.city, mergedFilters);
  } else if (options.subdivision) {
    result.listings = await getActiveListingsBySubdivision(options.subdivision, mergedFilters);
  } else if (options.zip) {
    result.listings = await getActiveListingsByZip(options.zip, mergedFilters);
  } else if (options.county) {
    result.listings = await getActiveListingsByCounty(options.county, mergedFilters);
  } else if (options.filters) {
    result.listings = await getActiveListings(mergedFilters);
  }

  result.meta.totalListings = result.listings.length;

  // Fetch market stats if requested
  if (options.includeStats) {
    const statsFilters = { ...options.filters };
    if (options.city) statsFilters.city = options.city;
    if (options.subdivision) statsFilters.subdivision = options.subdivision;
    if (options.zip) statsFilters.zip = options.zip;
    if (options.county) statsFilters.county = options.county;

    result.stats = await getMarketStats(statsFilters);
  }

  // Calculate DOM stats if requested
  if (options.includeDOMStats && result.listings.length > 0) {
    const domStats = calculateDOMStats(result.listings);
    const insights = getDOMInsights(domStats);
    result.domStats = { ...domStats, insights };
  }

  // Compare locations if requested
  if (options.includeComparison && result.stats) {
    const { compareWith, isCity } = options.includeComparison;

    // Fetch stats for comparison location
    const compareFilters: any = {};
    if (isCity) {
      compareFilters.city = compareWith;
    } else {
      compareFilters.subdivision = compareWith;
    }

    const compareStats = await getMarketStats(compareFilters);

    // Get location names
    const location1Name = options.city || options.subdivision || 'Location 1';

    // Perform comparison
    const comparison = compareLocations(location1Name, result.stats, compareWith, compareStats);

    // Determine winner
    const winner = determineWinner(comparison, {
      prioritizeAffordability: true,
      prioritizeInventory: true,
    });

    result.comparison = { ...comparison, winner };
  }

  // Phase 3: Fetch closed listings if requested
  if (options.includeClosedListings || options.includeClosedStats || options.includeAppreciation) {
    const closedFilters: ClosedListingsFilters = {
      ...options.filters,
      ...options.closedListingsFilters,
      limit: options.limit,
      skip: options.skip,
    } as ClosedListingsFilters;

    // Fetch closed listings
    let closedListings: ClosedListing[] = [];

    if (options.city) {
      closedListings = await getClosedListingsByCity(options.city, closedFilters);
    } else if (options.subdivision) {
      closedListings = await getClosedListingsBySubdivision(options.subdivision, closedFilters);
    } else if (options.filters) {
      closedListings = await getClosedListings(closedFilters);
    }

    result.meta.totalClosedSales = closedListings.length;

    // Return closed listings if requested
    if (options.includeClosedListings) {
      result.closedListings = closedListings;
    }

    // Calculate closed market stats if requested
    if (options.includeClosedStats) {
      result.closedStats = await getClosedMarketStats(closedFilters);
    }

    // Calculate appreciation if requested
    if (options.includeAppreciation && closedListings.length > 0) {
      const period = options.closedListingsFilters?.yearsBack
        ? (`${options.closedListingsFilters.yearsBack}y` as any)
        : '5y';
      result.appreciation = calculateAppreciation(closedListings, period);
      result.priceTrends = calculatePriceTrends(closedListings, 3);
    }
  }

  result.meta.executionTime = Date.now() - startTime;

  // Phase 4: Log performance metrics
  logQueryPerformance(options, result);

  return result;
}

/**
 * Execute a simple query (just listings, no stats)
 */
export async function executeSimpleQuery(
  location: string,
  filters?: ActiveListingsFilters
): Promise<ActiveListing[]> {
  // Try to detect if it's a city, subdivision, or ZIP
  const isZip = /^\d{5}$/.test(location);

  if (isZip) {
    return await getActiveListingsByZip(location, filters);
  }

  // Try city first (most common)
  const cityResults = await getActiveListingsByCity(location, { ...filters, limit: 1 });
  if (cityResults.length > 0) {
    return await getActiveListingsByCity(location, filters);
  }

  // Fallback to subdivision
  return await getActiveListingsBySubdivision(location, filters);
}

/**
 * Get quick stats for a location
 */
export async function getLocationStats(location: string): Promise<MarketStats> {
  const isZip = /^\d{5}$/.test(location);

  const filters: any = {};
  if (isZip) {
    filters.zip = location;
  } else {
    // Try city first
    filters.city = location;
  }

  return await getMarketStats(filters);
}
