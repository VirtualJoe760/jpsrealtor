// app/api/campaigns/[id]/contacts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import ContactCampaign from '@/models/ContactCampaign';
import Contact from '@/models/Contact';
import Campaign from '@/models/Campaign';

// GET - Fetch contacts for a campaign
export async function GET(
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
    const userId = user.id;
    const { id: campaignId } = await params;

    await dbConnect();

    // Verify campaign belongs to user
    const campaign = await (Campaign as any).findOne({ _id: campaignId, userId });
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Get all ContactCampaign records for this campaign
    const contactCampaigns = await (ContactCampaign as any)
      .find({ campaignId })
      .populate('contactId')
      .lean();

    // Transform to include contact details
    const contacts = contactCampaigns
      .filter((cc: any) => cc.contactId) // Filter out any null contacts
      .map((cc: any) => ({
        _id: cc.contactId._id.toString(),
        firstName: cc.contactId.firstName,
        lastName: cc.contactId.lastName,
        email: cc.contactId.email,
        phone: cc.contactId.phone,
        tags: cc.contactId.tags || [],
        status: cc.contactId.status,
        campaignStatus: cc.status,
        addedAt: cc.addedAt,
      }));

    return NextResponse.json({
      success: true,
      contacts,
    });
  } catch (error: any) {
    console.error('Error fetching campaign contacts:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch campaign contacts' },
      { status: 500 }
    );
  }
}

// POST - Add contacts to campaign
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
    const userId = user.id;
    const { id: campaignId } = await params;

    await dbConnect();

    // Verify campaign belongs to user
    const campaign = await (Campaign as any).findOne({ _id: campaignId, userId });
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { contactIds } = body;

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Contact IDs are required' },
        { status: 400 }
      );
    }

    // Verify all contacts belong to the user
    const contacts = await (Contact as any).find({
      _id: { $in: contactIds },
      userId,
    });

    if (contacts.length !== contactIds.length) {
      return NextResponse.json(
        { success: false, error: 'Some contacts not found or do not belong to you' },
        { status: 400 }
      );
    }

    // Get existing ContactCampaign records to avoid duplicates
    const existing = await (ContactCampaign as any).find({
      campaignId,
      contactId: { $in: contactIds },
    });

    const existingContactIds = new Set(existing.map((cc: any) => cc.contactId.toString()));
    const newContactIds = contactIds.filter((id: string) => !existingContactIds.has(id));

    // Create ContactCampaign records for new contacts
    const contactCampaignPromises = newContactIds.map((contactId: string) =>
      (ContactCampaign as any).create({
        contactId,
        campaignId,
        userId,
        source: 'manual',
        status: 'pending',
        isDuplicate: false,
      })
    );

    await Promise.all(contactCampaignPromises);

    // Update campaign stats
    campaign.stats.totalContacts += newContactIds.length;
    await campaign.save();

    return NextResponse.json({
      success: true,
      added: newContactIds.length,
      skipped: contactIds.length - newContactIds.length,
    });
  } catch (error: any) {
    console.error('Error adding contacts to campaign:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to add contacts' },
      { status: 500 }
    );
  }
}

// DELETE - Remove contacts from campaign
export async function DELETE(
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
    const userId = user.id;
    const { id: campaignId } = await params;

    await dbConnect();

    // Verify campaign belongs to user
    const campaign = await (Campaign as any).findOne({ _id: campaignId, userId });
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const contactIdsParam = searchParams.get('contactIds');

    if (!contactIdsParam) {
      return NextResponse.json(
        { success: false, error: 'Contact IDs are required' },
        { status: 400 }
      );
    }

    const contactIds = contactIdsParam.split(',');

    // Delete ContactCampaign records
    const result = await (ContactCampaign as any).deleteMany({
      campaignId,
      contactId: { $in: contactIds },
    });

    // Update campaign stats
    campaign.stats.totalContacts = Math.max(0, campaign.stats.totalContacts - result.deletedCount);
    await campaign.save();

    return NextResponse.json({
      success: true,
      removed: result.deletedCount,
    });
  } catch (error: any) {
    console.error('Error removing contacts from campaign:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to remove contacts' },
      { status: 500 }
    );
  }
}
