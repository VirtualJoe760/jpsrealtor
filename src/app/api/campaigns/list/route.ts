// app/api/campaigns/list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Campaign from '@/models/Campaign';

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

    // Transform campaigns for frontend
    const transformedCampaigns = campaigns.map((campaign) => ({
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
      analytics: {
        voicemailsSent: campaign.stats?.sent || 0,
        voicemailsListened: campaign.stats?.listened || 0,
        emailsSent: 0, // TODO: Add email analytics
        emailsOpened: 0, // TODO: Add email analytics
        textsSent: 0, // TODO: Add SMS analytics
        textsDelivered: 0, // TODO: Add SMS analytics
        responses: 0, // TODO: Calculate from all channels
        conversions: 0, // TODO: Track conversions
      },
      createdAt: campaign.createdAt?.toISOString() || new Date().toISOString(),
      lastActivity: campaign.updatedAt?.toISOString() || new Date().toISOString(),
    }));

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
