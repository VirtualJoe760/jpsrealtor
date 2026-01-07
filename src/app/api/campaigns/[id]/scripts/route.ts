// app/api/campaigns/[id]/scripts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Campaign from '@/models/Campaign';
import VoicemailScript from '@/models/VoicemailScript';
import { Types } from 'mongoose';

/**
 * GET - Fetch scripts for a campaign
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

    // Get query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

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

    // Fetch scripts for this campaign
    const scripts = await (VoicemailScript as any)
      .find({
        campaignId: new Types.ObjectId(campaignId),
        userId,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('contactId', 'firstName lastName')
      .lean();

    // Get total count
    const total = await (VoicemailScript as any).countDocuments({
      campaignId: new Types.ObjectId(campaignId),
      userId,
    });

    // Map scripts to include scriptText field and contact name
    const mappedScripts = scripts.map((script: any) => ({
      _id: script._id,
      scriptText: script.script, // Map 'script' field to 'scriptText' for frontend
      contactId: script.contactId?._id || script.contactId,
      contactName: script.contactId ? `${script.contactId.firstName || ''} ${script.contactId.lastName || ''}`.trim() : null,
      isGeneral: script.isGeneral || false,
      aiModel: script.aiModel,
      reviewStatus: script.reviewStatus,
      audio: script.audio,
      delivery: script.delivery,
      createdAt: script.createdAt,
      updatedAt: script.updatedAt,
    }));

    console.log('[scripts-list] Returning scripts:', {
      count: mappedScripts.length,
      isGeneral: mappedScripts[0]?.isGeneral,
      hasScriptText: !!mappedScripts[0]?.scriptText,
    });

    return NextResponse.json({
      success: true,
      scripts: mappedScripts,
      total,
      limit,
      skip,
    });
  } catch (error: any) {
    console.error('[scripts-list] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch scripts' },
      { status: 500 }
    );
  }
}
