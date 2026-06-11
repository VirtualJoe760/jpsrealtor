import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Campaign from '@/models/Campaign';
import User from '@/models/User';
import { executeAdLaunch } from '@/lib/co-marketing/ad-launch';
import PointsLedger from '@/models/PointsLedger';
import { adBudgetToCredits } from '@/config/credit-costs';
import mongoose from 'mongoose';

/**
 * POST /api/campaigns/[id]/launch-ads
 *
 * Launches Google PPC and/or Meta retargeting campaigns via their APIs, on the
 * agent's own ad account (multi-tenant). The actual ad creation is shared with
 * the co-marketing funded path via executeAdLaunch (src/lib/co-marketing/ad-launch.ts).
 * Campaigns are created PAUSED so the agent can review before going live.
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
    const { pageUrl, pageName, google, meta, youtube } = body;

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    // Load agent's ad account credentials from their profile
    const user = await User.findOne({ email: session.user.email }, { adAccounts: 1 }).lean();
    const userGoogleAds = (user as any)?.adAccounts?.google;
    const userMetaAds = (user as any)?.adAccounts?.meta;

    // --- Credit balance check ---
    // Campaigns launch PAUSED, so we don't debit credits now.
    // Instead, verify the user has enough credits to cover at least one day of
    // combined ad spend so they aren't surprised when the campaigns go live.
    const googleDailyBudget = google?.budget || 0;
    const metaDailyBudget = meta?.budget || 0;
    const youtubeDailyBudget = youtube?.budget || 0;
    const totalDailyBudget = googleDailyBudget + metaDailyBudget + youtubeDailyBudget;
    const creditsEstimatedDaily = adBudgetToCredits(totalDailyBudget);
    const creditsEstimatedMonthly = adBudgetToCredits(totalDailyBudget, 30);

    const userId = (session.user as any).id;

    if (totalDailyBudget > 0) {
      // Cast string userId → ObjectId; some Mongoose hot-reload paths skip auto-cast
      const userIdObj = mongoose.isValidObjectId(userId)
        ? new mongoose.Types.ObjectId(String(userId))
        : userId;
      const ledger = await PointsLedger.findOne({ userId: userIdObj });
      const currentBalance = ledger?.balance || 0;

      if (currentBalance < creditsEstimatedDaily) {
        return NextResponse.json({
          success: false,
          error: `Insufficient credits. You need at least ${creditsEstimatedDaily} credits to cover one day of ad spend ($${totalDailyBudget}/day). You have ${currentBalance} credits.`,
          creditsRequired: creditsEstimatedDaily,
          creditsEstimatedMonthly,
          creditsAvailable: currentBalance,
        }, { status: 400 });
      }
    }
    // TODO: Add a daily cron job to debit credits for active (non-paused) ad campaigns.

    // Run the shared launch path (also used by co-marketing funded launches).
    const results = await executeAdLaunch({
      campaign, userId, userGoogleAds, userMetaAds, google, meta, youtube, pageUrl, pageName,
    });

    // Save campaign updates
    if (pageName) campaign.neighborhood = pageName;
    campaign.status = 'active';
    await campaign.save();

    // Build response message
    const googleOk = results.google?.success;
    const metaOk = results.meta?.success;
    const youtubeOk = results.youtube?.success;
    const allOk = (!google || googleOk) && (!meta || metaOk) && (!youtube || youtubeOk);

    let message = '';
    if (allOk) {
      message = 'Campaigns launched successfully! They are created PAUSED — review in Google Ads Manager and Meta Ads Manager, then enable when ready.';
    } else {
      const parts: string[] = [];
      if (google && !googleOk) parts.push(`Google: ${results.google?.error}`);
      if (meta && !metaOk) parts.push(`Meta: ${results.meta?.error}`);
      if (youtube && !youtubeOk) parts.push(`YouTube: ${results.youtube?.error}`);
      message = parts.join(' | ');
    }

    return NextResponse.json({
      success: allOk,
      message,
      results,
      credits: {
        estimatedDaily: creditsEstimatedDaily,
        estimatedMonthly: creditsEstimatedMonthly,
        dailyBudget: totalDailyBudget,
        note: 'Campaigns launch PAUSED. Credits will be debited daily once campaigns are enabled.',
      },
    });
  } catch (error: any) {
    console.error('[launch-ads] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to launch campaigns' },
      { status: 500 }
    );
  }
}
