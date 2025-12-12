/**
 * Query API Endpoint
 *
 * Test endpoint for the new modular query system.
 * Allows testing queries before integrating into chat.
 *
 * @example
 * GET /api/query?city=Orange&minBeds=3&maxPrice=800000&includeStats=true
 * GET /api/query?city=La+Quinta&compareWith=Palm+Desert&includeStats=true
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, executeSimpleQuery, getLocationStats } from '@/lib/queries';
import type { QueryOptions } from '@/lib/queries/builder';
import { checkRateLimit, getRateLimitConfig } from '@/lib/queries/middleware';

/**
 * Cloudflare KV Cache Helper
 * Uses Cloudflare KV binding for caching query results
 */
interface CacheConfig {
  key: string;
  ttl: number; // seconds
}

/**
 * Generate cache key from query options
 */
function getCacheKey(queryOptions: QueryOptions): string {
  // Create deterministic cache key from query params
  const parts: string[] = [];

  if (queryOptions.city) parts.push(`city:${queryOptions.city}`);
  if (queryOptions.subdivision) parts.push(`sub:${queryOptions.subdivision}`);
  if (queryOptions.zip) parts.push(`zip:${queryOptions.zip}`);
  if (queryOptions.county) parts.push(`county:${queryOptions.county}`);

  if (queryOptions.filters) {
    const filters = queryOptions.filters;
    if (filters.propertyType) parts.push(`type:${filters.propertyType}`);
    if (filters.propertySubType) parts.push(`subtype:${filters.propertySubType}`);
    if (filters.minBeds) parts.push(`minBeds:${filters.minBeds}`);
    if (filters.maxBeds) parts.push(`maxBeds:${filters.maxBeds}`);
    if (filters.minPrice) parts.push(`minPrice:${filters.minPrice}`);
    if (filters.maxPrice) parts.push(`maxPrice:${filters.maxPrice}`);
  }

  if (queryOptions.includeStats) parts.push('stats:true');
  if (queryOptions.includeClosedStats) parts.push('closedStats:true');
  if (queryOptions.includeAppreciation) parts.push('appreciation:true');

  return `query:${parts.join(':')}`;
}

/**
 * Get cache TTL based on query type
 */
function getCacheTTL(queryOptions: QueryOptions): number {
  // Subdivision queries: 10 minutes (they're expensive)
  if (queryOptions.subdivision) return 600;

  // City queries with stats: 5 minutes
  if (queryOptions.city && queryOptions.includeStats) return 300;

  // Regular city queries: 3 minutes
  if (queryOptions.city) return 180;

  // Default: 2 minutes
  return 120;
}

/**
 * Try to get cached result from Cloudflare KV
 */
async function getCachedResult(cacheKey: string): Promise<any | null> {
  try {
    // @ts-ignore - Cloudflare KV binding
    const cached = await QUERY_CACHE?.get(cacheKey, 'json');
    return cached || null;
  } catch (error) {
    // KV not available (local dev or error) - skip caching
    return null;
  }
}

/**
 * Store result in Cloudflare KV cache
 */
async function setCachedResult(cacheKey: string, result: any, ttl: number): Promise<void> {
  try {
    // @ts-ignore - Cloudflare KV binding
    await QUERY_CACHE?.put(cacheKey, JSON.stringify(result), {
      expirationTtl: ttl,
    });
  } catch (error) {
    // KV not available - silent fail (caching is optional)
    console.warn('Cache write failed:', error);
  }
}

export async function GET(req: NextRequest) {
  try {
    // Phase 4: Rate limiting
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimitConfig = getRateLimitConfig(ip, undefined, 'anonymous');
    const rateLimitResult = await checkRateLimit(rateLimitConfig);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
          },
        }
      );
    }

    const { searchParams } = new URL(req.url);

    // Simple mode: just get stats
    const simple = searchParams.get('simple');
    if (simple) {
      const location = searchParams.get('location') || 'Orange';
      const stats = await getLocationStats(location);
      return NextResponse.json({ success: true, stats });
    }

    // Build query options from URL params
    const queryOptions: QueryOptions = {};

    // Location
    if (searchParams.get('city')) queryOptions.city = searchParams.get('city')!;
    if (searchParams.get('subdivision'))
      queryOptions.subdivision = searchParams.get('subdivision')!;
    if (searchParams.get('zip')) queryOptions.zip = searchParams.get('zip')!;
    if (searchParams.get('county')) queryOptions.county = searchParams.get('county')!;

    // Filters object
    queryOptions.filters = {};

    // Property filters
    if (searchParams.get('propertyType'))
      queryOptions.filters.propertyType = searchParams.get('propertyType')!;
    if (searchParams.get('propertySubType'))
      queryOptions.filters.propertySubType = searchParams.get('propertySubType')!;
    if (searchParams.get('minBeds'))
      queryOptions.filters.minBeds = parseInt(searchParams.get('minBeds')!);
    if (searchParams.get('maxBeds'))
      queryOptions.filters.maxBeds = parseInt(searchParams.get('maxBeds')!);
    if (searchParams.get('minBaths'))
      queryOptions.filters.minBaths = parseFloat(searchParams.get('minBaths')!);
    if (searchParams.get('maxBaths'))
      queryOptions.filters.maxBaths = parseFloat(searchParams.get('maxBaths')!);
    if (searchParams.get('minSqft'))
      queryOptions.filters.minSqft = parseInt(searchParams.get('minSqft')!);
    if (searchParams.get('maxSqft'))
      queryOptions.filters.maxSqft = parseInt(searchParams.get('maxSqft')!);
    if (searchParams.get('minYear'))
      queryOptions.filters.minYear = parseInt(searchParams.get('minYear')!);
    if (searchParams.get('maxYear'))
      queryOptions.filters.maxYear = parseInt(searchParams.get('maxYear')!);

    // Price filters
    if (searchParams.get('minPrice'))
      queryOptions.filters.minPrice = parseInt(searchParams.get('minPrice')!);
    if (searchParams.get('maxPrice'))
      queryOptions.filters.maxPrice = parseInt(searchParams.get('maxPrice')!);

    // Amenity filters
    if (searchParams.get('pool')) queryOptions.filters.pool = searchParams.get('pool') === 'true';
    if (searchParams.get('spa')) queryOptions.filters.spa = searchParams.get('spa') === 'true';
    if (searchParams.get('view')) queryOptions.filters.view = searchParams.get('view') === 'true';
    if (searchParams.get('gated'))
      queryOptions.filters.gated = searchParams.get('gated') === 'true';
    if (searchParams.get('senior'))
      queryOptions.filters.senior = searchParams.get('senior') === 'true';
    if (searchParams.get('minGarages'))
      queryOptions.filters.minGarages = parseInt(searchParams.get('minGarages')!);

    // Time filters
    if (searchParams.get('maxDaysOnMarket'))
      queryOptions.filters.maxDaysOnMarket = parseInt(searchParams.get('maxDaysOnMarket')!);
    if (searchParams.get('listedAfter'))
      queryOptions.filters.listedAfter = new Date(searchParams.get('listedAfter')!);

    // Pagination & sorting
    if (searchParams.get('limit'))
      queryOptions.filters.limit = parseInt(searchParams.get('limit')!);
    if (searchParams.get('skip')) queryOptions.filters.skip = parseInt(searchParams.get('skip')!);
    if (searchParams.get('sort'))
      queryOptions.filters.sort = searchParams.get('sort') as any;

    // Include options
    if (searchParams.get('includeStats'))
      queryOptions.includeStats = searchParams.get('includeStats') === 'true';
    if (searchParams.get('includeDOMStats'))
      queryOptions.includeDOMStats = searchParams.get('includeDOMStats') === 'true';

    // Comparison
    if (searchParams.get('compareWith')) {
      queryOptions.includeComparison = {
        compareWith: searchParams.get('compareWith')!,
        isCity: searchParams.get('compareIsCity') === 'true',
      };
    }

    // Phase 3: Closed listings support
    if (searchParams.get('includeClosedListings'))
      queryOptions.includeClosedListings = searchParams.get('includeClosedListings') === 'true';
    if (searchParams.get('includeClosedStats'))
      queryOptions.includeClosedStats = searchParams.get('includeClosedStats') === 'true';
    if (searchParams.get('includeAppreciation'))
      queryOptions.includeAppreciation = searchParams.get('includeAppreciation') === 'true';

    // Closed listings filters
    if (
      searchParams.get('yearsBack') ||
      searchParams.get('startDate') ||
      searchParams.get('endDate')
    ) {
      queryOptions.closedListingsFilters = {};
      if (searchParams.get('yearsBack'))
        queryOptions.closedListingsFilters.yearsBack = parseInt(searchParams.get('yearsBack')!);
      if (searchParams.get('startDate'))
        queryOptions.closedListingsFilters.startDate = new Date(searchParams.get('startDate')!);
      if (searchParams.get('endDate'))
        queryOptions.closedListingsFilters.endDate = new Date(searchParams.get('endDate')!);
    }

    // Check cache (unless bypass flag is set)
    const bypassCache = searchParams.get('bypassCache') === 'true';
    let result: any;
    let cached = false;
    const startTime = Date.now();

    if (!bypassCache) {
      const cacheKey = getCacheKey(queryOptions);
      const cachedResult = await getCachedResult(cacheKey);

      if (cachedResult) {
        result = cachedResult;
        cached = true;
        console.log(`✅ Cache HIT for ${cacheKey} (${Date.now() - startTime}ms)`);
      }
    }

    // Execute query if not cached
    if (!result) {
      result = await executeQuery(queryOptions);

      // Store in cache
      if (!bypassCache) {
        const cacheKey = getCacheKey(queryOptions);
        const ttl = getCacheTTL(queryOptions);
        await setCachedResult(cacheKey, result, ttl);
        console.log(`📦 Cached result for ${cacheKey} (TTL: ${ttl}s, ${Date.now() - startTime}ms)`);
      }
    }

    return NextResponse.json(
      {
        success: true,
        ...result,
        cached, // Add cache status to response
        executionTime: `${Date.now() - startTime}ms`, // Add execution time
      },
      {
        headers: {
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
          'X-Cache-Status': cached ? 'HIT' : 'MISS',
          'X-Execution-Time': `${Date.now() - startTime}ms`,
          'Cache-Control': cached
            ? 'public, max-age=60'
            : `public, max-age=${getCacheTTL(queryOptions)}`,
        },
      }
    );
  } catch (error: any) {
    console.error('Query API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for complex queries
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Execute query
    const result = await executeQuery(body);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Query API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
