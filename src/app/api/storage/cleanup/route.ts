// app/api/storage/cleanup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AudioGenerationService } from '@/lib/services/audio-generation.service';

/**
 * POST - Delete old audio files from Cloudinary
 * Body: { daysOld?: number } (default: 90 days)
 * Only accessible to admins for safety
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = session.user as any;

    // Only admins can cleanup storage
    if (!user.roles?.includes('admin')) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Parse body for optional daysOld parameter
    const body = await request.json();
    const { daysOld = 90 } = body;

    // Validate daysOld
    if (typeof daysOld !== 'number' || daysOld < 1) {
      return NextResponse.json(
        { success: false, error: 'daysOld must be a positive number' },
        { status: 400 }
      );
    }

    // Delete old audio
    const result = await AudioGenerationService.deleteOldAudio(daysOld);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Deleted ${result.deletedCount} audio files older than ${daysOld} days`,
    });
  } catch (error: any) {
    console.error('[storage-cleanup] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to cleanup storage' },
      { status: 500 }
    );
  }
}
