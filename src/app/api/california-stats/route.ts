import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import CaliforniaStats from "@/models/CaliforniaStats";

/**
 * GET /api/california-stats
 *
 * ⚠️ DEPRECATED: Use /api/stats/california instead
 *
 * This endpoint is maintained for backward compatibility but will be removed in a future version.
 * New code should use the /api/stats/california endpoint which supports property type filtering.
 *
 * Migration: Replace /api/california-stats with /api/stats/california
 * See: /api/stats/MIGRATION.md for full migration guide
 *
 * Returns California-wide statistics for RESIDENTIAL SALES ONLY (propertyType=A)
 * Used for "Explore California" overlay at default zoom levels
 *
 * PERFORMANCE: Calculates from unifiedlistings with property type filter
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    console.warn('[california-stats] ⚠️ DEPRECATED ENDPOINT: Use /api/stats/california instead');
    console.log('[california-stats] Calculating California residential sales stats...');

    // Calculate stats for residential sales (propertyType=A) in real-time
    // This ensures we show accurate median prices for actual homes
    const UnifiedListing = (await import('@/models/unified-listing')).default;

    const stats = await UnifiedListing.aggregate([
      {
        $match: {
          standardStatus: "Active",
          propertyType: "A" // Residential sale only
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

    if (!stats || stats.length === 0) {
      console.log('[california-stats] No residential listings found');
      return NextResponse.json({
        count: 0,
        medianPrice: 0,
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0
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
      maxPrice: result.maxPrice
    };

    console.log('[california-stats] Residential stats calculated:', californiaStats);

    return NextResponse.json(californiaStats, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' // 10 min cache
      }
    });

  } catch (error) {
    console.error('[california-stats] Error:', error);
    return NextResponse.json(
      { error: "Failed to fetch California statistics" },
      { status: 500 }
    );
  }
}
