import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Campaign from '@/models/Campaign';
import AdCampaignRecord from '@/models/AdCampaignRecord';
import {
  updateCampaignStatus as updateMetaStatus,
  isMetaAdsConfigured,
} from '@/lib/meta-ads-api';

/**
 * POST /api/campaigns/[id]/ad-status
 *
 * Pause or resume ad campaigns on Meta (and Google when supported).
 *
 * Body: { platform: 'meta' | 'google', action: 'pause' | 'resume' }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { platform, action } = await request.json();

    if (!['meta', 'google'].includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }
    if (!['pause', 'resume'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action — must be pause or resume' }, { status: 400 });
    }

    await dbConnect();

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const newStatus = action === 'pause' ? 'PAUSED' : 'ACTIVE';

    // ------- Meta -------
    if (platform === 'meta') {
      const metaCampaignId = campaign.metaAdsConfig?.campaignId;
      if (!metaCampaignId) {
        return NextResponse.json({ error: 'No Meta campaign found for this campaign' }, { status: 400 });
      }
      if (!isMetaAdsConfigured()) {
        return NextResponse.json({ error: 'Meta Ads not configured' }, { status: 400 });
      }

      await updateMetaStatus(metaCampaignId, newStatus);

      // Update local tracking record
      await AdCampaignRecord.updateMany(
        { campaignId: campaign._id, platform: 'meta' },
        { $set: { status: action === 'pause' ? 'paused' : 'active' } }
      );
    }

    // ------- Google -------
    if (platform === 'google') {
      // Google Ads campaign status updates not yet implemented via API.
      // For now, update the local record and instruct user to use Google Ads Manager.
      await AdCampaignRecord.updateMany(
        { campaignId: campaign._id, platform: 'google' },
        { $set: { status: action === 'pause' ? 'paused' : 'active' } }
      );
    }

    return NextResponse.json({
      success: true,
      platform,
      action,
      newStatus,
    });
  } catch (error: any) {
    console.error('[ad-status] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update ad status' },
      { status: 500 }
    );
  }
}
