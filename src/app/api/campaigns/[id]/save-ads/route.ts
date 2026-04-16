import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Campaign from '@/models/Campaign';

/**
 * POST /api/campaigns/[id]/save-ads
 *
 * Save ad campaign configuration (Google PPC + Meta Retargeting) as a draft.
 * Persists to the Campaign document's googleAdsConfig and metaAdsConfig fields.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const body = await request.json();
    const { pageUrl, pageName, google, meta, audienceType, geoTargeting } = body;

    const update: any = {};

    // Save Google PPC config
    if (google) {
      update.googleAdsConfig = {
        landingPageUrl: pageUrl,
        adType: 'search',
        budget: google.budget || 0,
        bidStrategy: 'maximize_clicks',
        headlines: google.headlines || [],
        descriptions: google.descriptions || [],
        geoTargeting: google.geoTargeting || geoTargeting || undefined,
      };
      update['activeStrategies.googleAds'] = true;
    }

    // Save Meta retargeting config
    if (meta) {
      update.metaAdsConfig = {
        landingPageUrl: pageUrl,
        objective: 'OUTCOME_TRAFFIC',
        budget: meta.budget || 0,
        imageUrl: meta.imageUrl || undefined,
        headline: meta.headline || '',
        primaryText: meta.primaryText || '',
        placements: meta.placements || ['facebook_feed', 'instagram_feed'],
        callToAction: 'LEARN_MORE',
      };
      update['activeStrategies.metaAds'] = true;
    }

    // Store the page info on the campaign
    if (pageName) update.neighborhood = pageName;

    const campaign = await Campaign.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    );

    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Ad configuration saved',
      campaign: {
        id: campaign._id,
        googleAdsConfig: campaign.googleAdsConfig,
        metaAdsConfig: campaign.metaAdsConfig,
      },
    });
  } catch (error) {
    console.error('[save-ads] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save ad configuration' }, { status: 500 });
  }
}
