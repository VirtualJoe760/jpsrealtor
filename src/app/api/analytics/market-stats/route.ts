/**
 * Market Statistics Analytics API
 *
 * Get comprehensive market statistics for a location:
 * - Days on Market
 * - Price Per Square Foot
 * - HOA Fees
 * - Property Tax
 *
 * @route GET /api/analytics/market-stats
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveListings,
  analyzeDaysOnMarket,
  analyzePricePerSqft,
  analyzeHOAFees,
  analyzePropertyTax,
  type ActiveListingsFilters
} from '@/lib/analytics';
import { analyzePropertyTaxEnhanced } from '@/lib/analytics/calculations/property-tax-enhanced';

// ============================================================================
// TYPES
// ============================================================================

interface MarketStatsQueryParams {
  // Location (use ONE of these)
  subdivision?: string;
  city?: string;
  zip?: string;
  county?: string;

  // Radius search
  lat?: string;
  lng?: string;
  radius?: string;  // miles

  // Property filters
  propertyType?: string;
  propertySubType?: string;  // 'Single Family Residence', 'Condominium', 'Townhouse', etc.
  minBeds?: string;
  maxBeds?: string;
  minPrice?: string;
  maxPrice?: string;

  // Which stats to include (comma-separated or 'all')
  // Default: 'all'
  stats?: string;  // 'dom,price_sqft,hoa,tax' or 'all'
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const params = Object.fromEntries(searchParams.entries()) as MarketStatsQueryParams;

    // ========== BUILD FILTERS ==========

    const filters: ActiveListingsFilters = {};

    // Location filters
    if (params.subdivision) {
      filters.subdivision = params.subdivision;
    } else if (params.city) {
      filters.city = params.city;
    } else if (params.zip) {
      filters.zip = params.zip;
    } else if (params.county) {
      filters.county = params.county;
    } else if (params.lat && params.lng && params.radius) {
      filters.latitude = parseFloat(params.lat);
      filters.longitude = parseFloat(params.lng);
      filters.radiusMiles = parseFloat(params.radius);
    } else {
      return NextResponse.json(
        { error: 'Location filter required (subdivision, city, zip, county, or lat/lng/radius)' },
        { status: 400 }
      );
    }

    // Property filters
    if (params.propertyType) {
      filters.propertyType = params.propertyType;
    }

    // IMPORTANT: Default to Single Family Residence for residential (A) to avoid mixing condos/townhouses
    if (params.propertySubType) {
      filters.propertySubType = params.propertySubType;
    } else if (!params.propertyType || params.propertyType === 'A') {
      // Default to Single Family Residence for residential queries
      filters.propertySubType = 'Single Family Residence';
    }

    if (params.minBeds) {
      filters.minBeds = parseInt(params.minBeds);
    }
    if (params.maxBeds) {
      filters.maxBeds = parseInt(params.maxBeds);
    }
    if (params.minPrice) {
      filters.minPrice = parseInt(params.minPrice);
    }
    if (params.maxPrice) {
      filters.maxPrice = parseInt(params.maxPrice);
    }

    // ========== FETCH DATA ==========

    const listings = await getActiveListings(filters);

    if (listings.length === 0) {
      return NextResponse.json({
        error: 'No active listings found for the specified criteria',
        filters
      }, { status: 404 });
    }

    // ========== DETERMINE WHICH STATS TO CALCULATE ==========

    const requestedStats = params.stats?.toLowerCase() || 'all';
    const includeAll = requestedStats === 'all';
    const statsSet = new Set(requestedStats.split(','));

    const result: any = {
      location: {
        subdivision: params.subdivision,
        city: params.city,
        zip: params.zip,
        county: params.county,
        radius: params.radius ? {
          lat: params.lat,
          lng: params.lng,
          miles: params.radius
        } : undefined
      },
      totalListings: listings.length,
    };

    // ========== CALCULATE STATISTICS ==========

    if (includeAll || statsSet.has('dom') || statsSet.has('days_on_market')) {
      result.daysOnMarket = analyzeDaysOnMarket(listings);
    }

    if (includeAll || statsSet.has('price_sqft') || statsSet.has('price_per_sqft')) {
      result.pricePerSqft = analyzePricePerSqft(listings);
    }

    if (includeAll || statsSet.has('hoa') || statsSet.has('hoa_fees')) {
      result.hoaFees = analyzeHOAFees(listings);
    }

    if (includeAll || statsSet.has('tax') || statsSet.has('property_tax')) {
      // Use enhanced property tax with CA BOE API enrichment
      const county = params.county || (listings[0]?.countyOrParish) || 'Riverside';
      result.propertyTax = await analyzePropertyTaxEnhanced(listings, county);
    }

    // ========== RETURN RESPONSE ==========

    result.metadata = {
      totalListings: listings.length,
      fetchedAt: new Date().toISOString(),
      dataSource: 'unified_listings',
      mlsSources: [...new Set(listings.map(l => l.mlsSource).filter(Boolean))]
    };

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[Market Stats API Error]', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * = USAGE EXAMPLES
 *
 * Get all market stats for a subdivision:
 * GET /api/analytics/market-stats?subdivision=PGA%20West
 *
 * Get all market stats for a city:
 * GET /api/analytics/market-stats?city=Palm%20Desert
 *
 * Get only Days on Market and Price/sqft:
 * GET /api/analytics/market-stats?city=Indian%20Wells&stats=dom,price_sqft
 *
 * Get stats for properties under $1M:
 * GET /api/analytics/market-stats?city=La%20Quinta&maxPrice=1000000
 *
 * Radius search:
 * GET /api/analytics/market-stats?lat=33.7175&lng=-116.3542&radius=1
 *
 * RESPONSE:
 * {
 *   "location": { "city": "Palm Desert" },
 *   "totalListings": 247,
 *   "daysOnMarket": {
 *     "average": 45,
 *     "median": 32,
 *     "min": 1,
 *     "max": 365,
 *     "distribution": {
 *       "under30": 120,
 *       "days30to60": 80,
 *       "days60to90": 30,
 *       "days90to180": 12,
 *       "over180": 5
 *     },
 *     "trend": "fast-moving",
 *     "sampleSize": 247
 *   },
 *   "pricePerSqft": {
 *     "average": 325,
 *     "median": 310,
 *     "min": 180,
 *     "max": 650,
 *     "distribution": {
 *       "under200": 5,
 *       "range200to300": 95,
 *       "range300to400": 120,
 *       "range400to500": 20,
 *       "over500": 7
 *     },
 *     "sampleSize": 247
 *   },
 *   "hoaFees": {
 *     "average": 285,
 *     "median": 250,
 *     "min": 0,
 *     "max": 850,
 *     "distribution": {
 *       "noHOA": 45,
 *       "under100": 12,
 *       "range100to200": 60,
 *       "range200to300": 80,
 *       "range300to500": 40,
 *       "over500": 10
 *     },
 *     "frequency": {
 *       "monthly": 180,
 *       "quarterly": 15,
 *       "annually": 5,
 *       "unknown": 2
 *     },
 *     "sampleSize": 247
 *   },
 *   "propertyTax": {
 *     "average": 8500,
 *     "median": 7800,
 *     "min": 2500,
 *     "max": 28000,
 *     "effectiveRate": 1.125,
 *     "distribution": {
 *       "under5k": 45,
 *       "range5kTo10k": 120,
 *       "range10kTo15k": 50,
 *       "range15kTo20k": 20,
 *       "over20k": 12
 *     },
 *     "sampleSize": 247
 *   },
 *   "metadata": {
 *     "totalListings": 247,
 *     "mlsSources": ["GPS", "CRMLS"]
 *   }
 * }
 *
 * = PLUG-AND-PLAY PATTERN
 *
 * This endpoint uses the modular analytics system:
 *
 * 1. ADD NEW STAT?
 *    - Create calculation in calculations/market-stats.ts
 *    - Import and call here
 *    - Add to statsSet logic
 *    - Done!
 *
 * 2. NEW MLS JOINS?
 *    - No changes needed! Data flows through automatically
 *
 * 3. USE IN AI CHAT?
 *    - Add tool definition in chat/stream/route.ts
 *    - AI can now call this endpoint
 *    - Return structured data for UI components
 */
