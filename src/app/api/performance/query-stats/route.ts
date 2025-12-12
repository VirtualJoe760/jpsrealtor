/**
 * Query Performance Statistics API
 *
 * Provides real-time performance metrics for the query system.
 *
 * @example
 * GET /api/performance/query-stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPerformanceStats, clearPerformanceMetrics } from '@/lib/queries/monitoring';

export async function GET(req: NextRequest) {
  try {
    const stats = getPerformanceStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('Failed to get performance stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Clear performance metrics (admin only)
 */
export async function DELETE(req: NextRequest) {
  try {
    clearPerformanceMetrics();

    return NextResponse.json({
      success: true,
      message: 'Performance metrics cleared',
    });
  } catch (error: any) {
    console.error('Failed to clear performance metrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
