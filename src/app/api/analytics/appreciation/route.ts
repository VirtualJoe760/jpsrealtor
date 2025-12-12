/**
 * Appreciation Analytics API
 *
 * Calculate property appreciation for a location over time.
 * Uses modular aggregators and calculations from @/lib/analytics
 *
 * @route GET /api/analytics/appreciation
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getClosedSales,
  getClosedSalesBySubdivision,
  getClosedSalesByCity,
  getClosedSalesByRadius,
  analyzeAppreciation,
  type ClosedSalesFilters
} from '@/lib/analytics';

// ============================================================================
// TYPES
// ============================================================================

interface AppreciationQueryParams {
  // Location (use ONE of these)
  subdivision?: string;
  city?: string;
  zip?: string;
  county?: string;

  // Radius search (CMA)
  lat?: string;
  lng?: string;
  radius?: string;  // miles

  // Time period
  period?: '1y' | '3y' | '5y' | '10y';
  yearsBack?: string;

  // Property filters
  propertyType?: string;
  propertySubType?: string;  // 'Single Family', 'Condominium', 'Townhouse', etc.
  minBeds?: string;
  maxBeds?: string;
  minPrice?: string;
  maxPrice?: string;
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const params = Object.fromEntries(searchParams.entries()) as AppreciationQueryParams;

    // ========== BUILD FILTERS ==========

    const filters: ClosedSalesFilters = {};

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

    // Time filter
    const period = params.period || '5y';
    const yearsMap = { '1y': 1, '3y': 3, '5y': 5, '10y': 10 };
    filters.yearsBack = yearsMap[period] || parseInt(params.yearsBack || '5');

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

    const sales = await getClosedSales(filters);

    if (sales.length === 0) {
      return NextResponse.json({
        error: 'No closed sales found for the specified criteria',
        filters
      }, { status: 404 });
    }

    // ========== CALCULATE APPRECIATION ==========

    const result = analyzeAppreciation(sales, period);

    // ========== RETURN RESPONSE ==========

    return NextResponse.json({
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
      period,
      ...result,
      metadata: {
        totalSales: sales.length,
        fetchedAt: new Date().toISOString(),
        dataSource: 'unified_closed_listings',
        mlsSources: [...new Set(sales.map(s => s.mlsSource).filter(Boolean))]
      }
    });

  } catch (error: any) {
    console.error('[Appreciation API Error]', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * = USAGE EXAMPLES
 *
 * Subdivision:
 * GET /api/analytics/appreciation?subdivision=indian-wells-country-club&period=5y
 *
 * City:
 * GET /api/analytics/appreciation?city=Palm Desert&period=3y
 *
 * Radius (CMA):
 * GET /api/analytics/appreciation?lat=33.7175&lng=-116.3542&radius=1&period=1y
 *
 * With filters:
 * GET /api/analytics/appreciation?city=Palm Desert&period=5y&minBeds=3&propertyType=A
 *
 * RESPONSE:
 * {
 *   "location": { "city": "Palm Desert" },
 *   "period": "5y",
 *   "appreciation": {
 *     "annual": 5.8,
 *     "cumulative": 32.4,
 *     "trend": "increasing",
 *     "byYear": [...]
 *   },
 *   "marketData": {
 *     "startMedianPrice": 485000,
 *     "endMedianPrice": 642000,
 *     "totalSales": 47,
 *     "confidence": "high"
 *   },
 *   "metadata": {
 *     "totalSales": 47,
 *     "mlsSources": ["GPS", "CRMLS"]
 *   }
 * }
 *
 * = PLUG-AND-PLAY PATTERN
 *
 * This endpoint uses the modular analytics system:
 *
 * 1. NEW MLS JOINS?
 *    - No changes needed! Data flows through automatically
 *
 * 2. NEW FILTER TYPE?
 *    - Add to ClosedSalesFilters in aggregators/closed-sales.ts
 *    - Add param parsing above
 *    - Instantly available
 *
 * 3. NEW CALCULATION?
 *    - Import from @/lib/analytics
 *    - Call alongside analyzeAppreciation()
 *    - Return in response
 *
 * Example: Adding school ratings
 * ```typescript
 * import { getSchoolRatings } from '@/lib/analytics';  // NEW
 *
 * const schoolRatings = await getSchoolRatings(filters);  // NEW
 *
 * return NextResponse.json({
 *   ...result,
 *   schoolRatings  // NEW
 * });
 * ```
 */
