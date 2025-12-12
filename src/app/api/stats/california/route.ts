import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import CaliforniaStats from "@/models/CaliforniaStats";
import UnifiedListing from "@/models/unified-listing";

/**
 * GET /api/stats/california
 *
 * Returns California-wide statistics, optionally filtered by property type
 *
 * Query Parameters:
 * - propertyType: A (residential sale), B (rental), C (multi-family), D (land)
 *
 * Performance Strategy:
 * - Without propertyType: Returns pre-calculated stats from CaliforniaStats collection (instant)
 * - With propertyType: Calculates stats from UnifiedListing collection with aggregation (fast)
 *
 * Response Format:
 * {
 *   "count": number,
 *   "medianPrice": number,
 *   "avgPrice": number,
 *   "minPrice": number,
 *   "maxPrice": number,
 *   "propertyType": string | null,
 *   "lastUpdated": string
 * }
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const propertyType = searchParams.get('propertyType');

    // Validate property type if provided
    if (propertyType && !['A', 'B', 'C', 'D'].includes(propertyType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid property type. Must be A (sale), B (rental), C (multi-family), or D (land)',
          code: 'INVALID_PROPERTY_TYPE'
        },
        { status: 400 }
      );
    }

    console.log('[california-stats] Fetching California stats, propertyType:', propertyType || 'all');

    // ==================== UNFILTERED STATS ====================
    // Return pre-calculated stats for all properties (fastest)
    if (!propertyType) {
      const statsDoc = await CaliforniaStats.findOne({});

      if (!statsDoc) {
        console.log('[california-stats] No stats document found - returning defaults');
        return NextResponse.json({
          success: true,
          data: {
            count: 0,
            medianPrice: 0,
            avgPrice: 0,
            minPrice: 0,
            maxPrice: 0,
            propertyType: null,
            lastUpdated: new Date().toISOString()
          }
        });
      }

      const californiaStats = {
        count: statsDoc.count,
        medianPrice: statsDoc.medianPrice,
        avgPrice: statsDoc.avgPrice,
        minPrice: statsDoc.minPrice,
        maxPrice: statsDoc.maxPrice,
        propertyType: null,
        lastUpdated: statsDoc.lastUpdated?.toISOString() || new Date().toISOString()
      };

      console.log('[california-stats] Stats fetched (all properties):', californiaStats);

      return NextResponse.json(
        {
          success: true,
          data: californiaStats,
          metadata: {
            cached: true,
            source: 'pre-calculated',
            generatedAt: new Date().toISOString()
          }
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' // 1 hour cache
          }
        }
      );
    }

    // ==================== FILTERED STATS ====================
    // Calculate stats for specific property type using aggregation
    console.log('[california-stats] Calculating filtered stats for property type:', propertyType);

    const startTime = Date.now();

    const stats = await UnifiedListing.aggregate([
      {
        $match: {
          standardStatus: "Active",
          propertyType: propertyType
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgPrice: { $avg: "$listPrice" },
          minPrice: { $min: "$listPrice" },
          maxPrice: { $max: "$listPrice" },
          prices: { $push: "$listPrice" }
        }
      }
    ]);

    const duration = Date.now() - startTime;
    console.log(`[california-stats] Aggregation completed in ${duration}ms`);

    if (!stats || stats.length === 0) {
      console.log('[california-stats] No listings found for property type:', propertyType);
      return NextResponse.json({
        success: true,
        data: {
          count: 0,
          medianPrice: 0,
          avgPrice: 0,
          minPrice: 0,
          maxPrice: 0,
          propertyType,
          lastUpdated: new Date().toISOString()
        },
        metadata: {
          cached: false,
          source: 'calculated',
          calculationTime: `${duration}ms`,
          generatedAt: new Date().toISOString()
        }
      });
    }

    const result = stats[0];

    // Calculate median price from sorted prices
    const prices = result.prices.sort((a: number, b: number) => a - b);
    const medianPrice = prices.length % 2 === 0
      ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
      : prices[Math.floor(prices.length / 2)];

    const californiaStats = {
      count: result.count,
      medianPrice: Math.round(medianPrice),
      avgPrice: Math.round(result.avgPrice),
      minPrice: result.minPrice,
      maxPrice: result.maxPrice,
      propertyType,
      lastUpdated: new Date().toISOString()
    };

    console.log('[california-stats] Filtered stats calculated:', californiaStats);

    return NextResponse.json(
      {
        success: true,
        data: californiaStats,
        metadata: {
          cached: false,
          source: 'calculated',
          calculationTime: `${duration}ms`,
          generatedAt: new Date().toISOString()
        }
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' // 10 min cache for filtered
        }
      }
    );

  } catch (error) {
    console.error('[california-stats] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch California statistics",
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}
