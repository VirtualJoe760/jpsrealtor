// app/api/storage/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AudioGenerationService } from '@/lib/services/audio-generation.service';

/**
 * GET - Get Cloudinary storage statistics
 * Returns: Total used, total allowed, usage percent, audio count, oldest audio
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = session.user as any;

    // Check if user is admin or has proper permissions
    // For now, allow all authenticated users to view storage stats
    // In production, you may want to restrict this to admins only
    if (!user.roles?.includes('admin') && !user.roles?.includes('realEstateAgent')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get storage stats
    const stats = await AudioGenerationService.getStorageStats();

    return NextResponse.json({
      success: true,
      stats: {
        totalUsed: stats.totalUsed,
        totalAllowed: stats.totalAllowed,
        usagePercent: Math.round(stats.usagePercent * 100) / 100, // Round to 2 decimals
        audioCount: stats.audioCount,
        oldestAudio: stats.oldestAudio,
        // Calculate formatted sizes
        totalUsedMB: Math.round(stats.totalUsed / 1024 / 1024),
        totalAllowedMB: Math.round(stats.totalAllowed / 1024 / 1024),
      },
    });
  } catch (error: any) {
    console.error('[storage-stats] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch storage stats' },
      { status: 500 }
    );
  }
}
