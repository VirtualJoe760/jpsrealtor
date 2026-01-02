// app/api/campaigns/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Campaign from '@/models/Campaign';

export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { name, description, type, neighborhood, strategies, schedule } = body;

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name and type' },
        { status: 400 }
      );
    }

    // Validate at least one strategy is selected
    if (!strategies || (!strategies.voicemail && !strategies.email && !strategies.text)) {
      return NextResponse.json(
        { success: false, error: 'At least one communication strategy must be selected' },
        { status: 400 }
      );
    }

    // Determine initial status based on schedule
    const initialStatus = schedule === 'immediate' ? 'active' : 'draft';

    // Create campaign
    const campaign = await Campaign.create({
      userId,
      teamId: user.teamId || null,
      name,
      description,
      type,
      neighborhood,
      activeStrategies: {
        voicemail: strategies.voicemail || false,
        email: strategies.email || false,
        text: strategies.text || false,
      },
      status: initialStatus,
      stats: {
        totalContacts: 0,
        scriptsGenerated: 0,
        audioGenerated: 0,
        sent: 0,
        delivered: 0,
        listened: 0,
        failed: 0,
      },
      dropCowboyConfig: {
        retryAttempts: 3,
      },
    });

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign._id.toString(),
        name: campaign.name,
        description: campaign.description,
        type: campaign.type,
        neighborhood: campaign.neighborhood,
        status: campaign.status,
        activeStrategies: campaign.activeStrategies,
        createdAt: campaign.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
