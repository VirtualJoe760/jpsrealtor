// app/api/campaigns/list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Campaign from '@/models/Campaign';
import CampaignExecution from '@/models/CampaignExecution';
import VoicemailScript from '@/models/VoicemailScript';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = session.user as any;
    const userId = user.id;

    // Connect to database
    await dbConnect();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    // Build query
    const query: any = { userId };
    if (status && status !== 'all') {
      query.status = status;
    }
    if (type) {
      query.type = type;
    }

    // Fetch campaigns
    const campaigns = await (Campaign as any).find(query)
      .sort({ createdAt: -1 })
      .lean();

    // Fetch all executions for these campaigns
    const campaignIds = campaigns.map((c: any) => c._id);
    const executions = await (CampaignExecution as any).find({
      campaignId: { $in: campaignIds },
    }).lean();

    // Fetch all voicemail scripts for these campaigns (for historical data)
    const voicemailScripts = await (VoicemailScript as any).find({
      campaignId: { $in: campaignIds },
      'delivery.status': { $in: ['sent', 'delivered', 'failed', 'listened'] },
    }).lean();

    // Group executions by campaign ID
    const executionsByCampaign = executions.reduce((acc: any, exec: any) => {
      const campaignId = exec.campaignId.toString();
      if (!acc[campaignId]) {
        acc[campaignId] = [];
      }
      acc[campaignId].push(exec);
      return acc;
    }, {});

    // Group voicemail scripts by campaign ID
    const scriptsByCampaign = voicemailScripts.reduce((acc: any, script: any) => {
      const campaignId = script.campaignId.toString();
      if (!acc[campaignId]) {
        acc[campaignId] = [];
      }
      acc[campaignId].push(script);
      return acc;
    }, {});

    // Transform campaigns for frontend
    const transformedCampaigns = campaigns.map((campaign) => {
      const campaignExecs = executionsByCampaign[campaign._id.toString()] || [];
      const campaignScripts = scriptsByCampaign[campaign._id.toString()] || [];

      // Start by aggregating analytics from all executions
      const analytics = campaignExecs.reduce(
        (acc: any, exec: any) => {
          if (exec.strategyType === 'voicemail' && exec.voicemailMetrics) {
            acc.voicemailsSent += exec.voicemailMetrics.totalSent || 0;
            acc.voicemailsListened += exec.voicemailMetrics.totalListened || 0;
            acc.responses += exec.voicemailMetrics.totalResponses || 0;
          } else if (exec.strategyType === 'email' && exec.emailMetrics) {
            acc.emailsSent += exec.emailMetrics.totalSent || 0;
            acc.emailsOpened += exec.emailMetrics.totalOpened || 0;
            acc.responses += exec.emailMetrics.totalOpened || 0;
          } else if (exec.strategyType === 'text' && exec.smsMetrics) {
            acc.textsSent += exec.smsMetrics.totalSent || 0;
            acc.textsDelivered += exec.smsMetrics.totalDelivered || 0;
            acc.responses += exec.smsMetrics.totalResponses || 0;
          }
          return acc;
        },
        {
          voicemailsSent: 0,
          voicemailsListened: 0,
          emailsSent: 0,
          emailsOpened: 0,
          textsSent: 0,
          textsDelivered: 0,
          responses: 0,
          conversions: 0, // TODO: Track conversions separately
        }
      );

      // Also aggregate from VoicemailScript records (historical data)
      campaignScripts.forEach((script: any) => {
        if (script.delivery.status === 'sent' ||
            script.delivery.status === 'delivered' ||
            script.delivery.status === 'listened') {
          analytics.voicemailsSent += 1;
        }
        if (script.delivery.status === 'delivered' || script.delivery.status === 'listened') {
          // Don't double-count - only count if not already in execution metrics
          // We can check if this script is part of any execution
          const isInExecution = campaignExecs.some((exec: any) =>
            exec.scriptIds && exec.scriptIds.some((id: any) => id.toString() === script._id.toString())
          );
          if (!isInExecution) {
            // Historical data not tracked in executions
            if (script.delivery.listenedAt || script.delivery.listened) {
              analytics.voicemailsListened += 1;
              analytics.responses += 1;
            }
            if (script.delivery.callback) {
              analytics.responses += 1;
            }
          }
        }
      });

      return {
        id: campaign._id.toString(),
        name: campaign.name,
        description: campaign.description,
        type: campaign.type as string,
        neighborhood: campaign.neighborhood,
        status: campaign.status as 'draft' | 'active' | 'completed' | 'paused',
        totalContacts: campaign.stats?.totalContacts || 0,
        activeStrategies: campaign.activeStrategies || {
          voicemail: false,
          email: false,
          text: false,
        },
        analytics,
        createdAt: campaign.createdAt?.toISOString() || new Date().toISOString(),
        lastActivity: campaign.updatedAt?.toISOString() || new Date().toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      campaigns: transformedCampaigns,
    });
  } catch (error: any) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}
