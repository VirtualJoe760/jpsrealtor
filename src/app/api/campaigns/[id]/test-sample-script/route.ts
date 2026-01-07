// app/api/campaigns/[id]/test-sample-script/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Campaign from '@/models/Campaign';
import ContactCampaign from '@/models/ContactCampaign';
import User from '@/models/User';
import { ScriptGenerationService, AIModel } from '@/lib/services/script-generation.service';
import { Types } from 'mongoose';

/**
 * POST - Generate a test script for a single contact to preview results
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

    const body = await request.json();
    const { customPrompt, model } = body;

    if (!customPrompt) {
      return NextResponse.json(
        { success: false, error: 'Custom prompt is required' },
        { status: 400 }
      );
    }

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

    // Get a single contact from this campaign
    const contactCampaign = await (ContactCampaign as any)
      .findOne({
        campaignId: new Types.ObjectId(campaignId),
        userId,
      })
      .populate('contactId');

    if (!contactCampaign || !contactCampaign.contactId) {
      return NextResponse.json(
        { success: false, error: 'No contacts found in this campaign' },
        { status: 404 }
      );
    }

    const contact = contactCampaign.contactId;

    // Generate a test script for this one contact
    const result = await ScriptGenerationService.generateScriptForContact(
      contact._id,
      new Types.ObjectId(campaignId),
      userId,
      (model as AIModel) || 'groq-llama3',
      customPrompt
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      script: result.script,
      scriptId: result.scriptId,
      contact: {
        id: contact._id,
        name: `${contact.firstName} ${contact.lastName || ''}`.trim(),
        address: contact.address,
      },
    });
  } catch (error: any) {
    console.error('[test-sample-script] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate test script' },
      { status: 500 }
    );
  }
}
