// app/api/campaigns/[id]/generate-scripts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Campaign from '@/models/Campaign';
import User from '@/models/User';
import { ScriptGenerationService } from '@/lib/services/script-generation.service';
import { Types } from 'mongoose';

/**
 * POST - Generate scripts for all contacts in a campaign
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

    // Check if user profile is complete
    const userDoc = await (User as any).findById(userId);
    const missingFields = [];

    if (!userDoc?.name) missingFields.push('name');
    if (!userDoc?.phone) missingFields.push('phone number');
    if (!userDoc?.brokerageName) missingFields.push('brokerage name');

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Please complete your profile first. Missing: ${missingFields.join(', ')}. Go to Settings to update your profile.`,
          profileIncomplete: true,
          missingFields
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const {
      model = 'groq-llama3',
      customPrompt,
      scriptType = 'personalized', // 'general' or 'personalized'
      template,
    } = body;

    console.log('[generate-scripts] Request params:', {
      campaignId,
      model,
      scriptType,
      template,
      hasCustomPrompt: !!customPrompt,
    });

    // Generate scripts with or without custom prompt
    const result = await ScriptGenerationService.generateScriptsForCampaign(
      new Types.ObjectId(campaignId),
      userId,
      model,
      customPrompt,
      scriptType,
      template
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      message: result.message,
      contactCount: campaign.stats.totalContacts,
    });
  } catch (error: any) {
    console.error('[generate-scripts] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate scripts' },
      { status: 500 }
    );
  }
}
