// app/api/campaigns/[id]/archive/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Campaign from '@/models/Campaign';
import { AudioGenerationService } from '@/lib/services/audio-generation.service';
import { Types } from 'mongoose';

/**
 * POST - Archive campaign (delete all audio files, keep scripts)
 * This is useful for managing Cloudinary storage costs
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = session.user as any;
    const userId = new Types.ObjectId(user.id);
    const { id: campaignId } = await params;

    await dbConnect();

    // Verify campaign ownership
    const campaign = await (Campaign as any).findOne({
      _id: new Types.ObjectId(campaignId),
      userId,
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Archive campaign (delete all audio)
    const result = await AudioGenerationService.archiveCampaign(
      new Types.ObjectId(campaignId),
      userId
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Update campaign status to archived
    campaign.status = 'archived';
    await campaign.save();

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Archived campaign - deleted ${result.deletedCount} audio files`,
    });
  } catch (error: any) {
    console.error('[archive-campaign] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to archive campaign' },
      { status: 500 }
    );
  }
}
