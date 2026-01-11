/**
 * Create Campaign from Label API Endpoint
 *
 * POST /api/crm/labels/[id]/create-campaign
 *
 * Creates a new Drop Cowboy campaign with all contacts from a specific label.
 * Part of Phase 4: Campaign Integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Label from '@/models/Label';
import Contact from '@/models/Contact';
import Campaign from '@/models/Campaign';
import dbConnect from '@/lib/db';
import { Types } from 'mongoose';

/**
 * POST /api/crm/labels/[id]/create-campaign
 * Create a campaign from label contacts
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { campaignName, campaignType, description } = body;

    // Validate required fields
    if (!campaignName || !campaignName.trim()) {
      return NextResponse.json(
        { error: 'Campaign name is required' },
        { status: 400 }
      );
    }

    // Find label and verify ownership
    const label = await Label.findOne({
      _id: params.id,
      userId: session.user.id,
    });

    if (!label) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 });
    }

    // Get all contacts with this label
    const contacts = await Contact.find({
      userId: session.user.id,
      labels: params.id,
      phone: { $exists: true, $ne: null }, // Must have phone number
      doNotContact: { $ne: true }, // Not on DNC list
    }).lean();

    if (contacts.length === 0) {
      return NextResponse.json(
        { error: 'No contacts found with this label' },
        { status: 400 }
      );
    }

    // Create campaign
    const campaign = new Campaign({
      userId: new Types.ObjectId(session.user.id),
      name: campaignName.trim(),
      type: campaignType || 'custom',
      description: description?.trim() || `Campaign created from "${label.name}" label`,
      status: 'draft',

      // Contact data
      contactCount: contacts.length,
      contacts: contacts.map(c => ({
        contactId: c._id,
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone || c.phones?.[0]?.number,
        email: c.email || c.emails?.[0]?.address,
        status: 'pending',
      })),

      // Label reference
      sourceLabel: params.id,

      // Drop Cowboy defaults
      dropCowboySettings: {
        teamId: process.env.DROP_COWBOY_TEAM_ID,
        brandId: process.env.DROP_COWBOY_BRAND_ID,
        numberPoolId: process.env.DROP_COWBOY_NUMBER_POOL_ID,
      },

      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await campaign.save();

    return NextResponse.json({
      success: true,
      campaign: {
        _id: campaign._id,
        name: campaign.name,
        contactCount: contacts.length,
        status: campaign.status,
      },
      message: `Campaign created with ${contacts.length} contacts from "${label.name}"`,
    });
  } catch (error: any) {
    console.error('Error creating campaign from label:', error);
    return NextResponse.json(
      {
        error: 'Failed to create campaign',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
