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
 * Returns California-wide statistics from pre-calculated CaliforniaStats collection
 * Used for "Explore California" overlay at default zoom levels
 *
 * PERFORMANCE: Just fetches a single document - extremely fast
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    console.warn('[california-stats] ⚠️ DEPRECATED ENDPOINT: Use /api/stats/california instead');
    console.log('[california-stats] Fetching pre-calculated California stats...');

    // Fetch the single document containing California-wide stats
    const statsDoc = await CaliforniaStats.findOne({});

    if (!statsDoc) {
      console.log('[california-stats] No stats document found - returning defaults');
      return NextResponse.json({
        count: 0,
        medianPrice: 0,
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0
      });
    }

    const californiaStats = {
      count: statsDoc.count,
      medianPrice: statsDoc.medianPrice,
      avgPrice: statsDoc.avgPrice,
      minPrice: statsDoc.minPrice,
      maxPrice: statsDoc.maxPrice
    };

    console.log('[california-stats] Stats fetched:', californiaStats);

    return NextResponse.json(californiaStats, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' // 1 hour cache
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
