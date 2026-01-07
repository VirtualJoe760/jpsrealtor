// app/api/campaigns/[id]/generation-session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Campaign from '@/models/Campaign';
import GenerationSession from '@/models/GenerationSession';
import { Types } from 'mongoose';

/**
 * GET - Fetch latest generation session for a campaign
 */
export async function GET(
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

    // Fetch latest script generation session for this campaign
    const generationSession = await (GenerationSession as any)
      .findOne({
        campaignId: new Types.ObjectId(campaignId),
        userId,
        type: 'script_generation',
      })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      session: generationSession,
    });
  } catch (error: any) {
    console.error('[generation-session] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch generation session' },
      { status: 500 }
    );
  }
}
