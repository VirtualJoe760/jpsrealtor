// app/api/campaigns/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Campaign from '@/models/Campaign';
import ContactCampaign from '@/models/ContactCampaign';
import VoicemailScript from '@/models/VoicemailScript';
import mongoose from 'mongoose';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { id: campaignId } = await params;

    // Validate campaign ID
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid campaign ID' },
        { status: 400 }
      );
    }

    // Find campaign and verify ownership
    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Allow deletion if:
    // 1. User created the campaign (userId matches)
    // 2. Campaign is owned by user regardless of team changes
    const isOwner = campaign.userId.toString() === session.user.id;

    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to delete this campaign' },
        { status: 403 }
      );
    }

    // Delete all associated data
    // 1. Delete ContactCampaign junction records
    await ContactCampaign.deleteMany({ campaignId: campaign._id });

    // 2. Delete VoicemailScript records
    await VoicemailScript.deleteMany({ campaignId: campaign._id });

    // 3. Delete the campaign itself
    await Campaign.findByIdAndDelete(campaign._id);

    return NextResponse.json({
      success: true,
      message: 'Campaign and all associated data deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
