// app/api/contacts/list/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Contact from '@/models/contact';

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
    const tags = searchParams.get('tags');
    const status = searchParams.get('status');

    // Build query
    const query: any = { userId, doNotContact: { $ne: true } };

    if (tags) {
      query.tags = { $in: tags.split(',') };
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    // Fetch contacts
    const contacts = await Contact.find(query)
      .select('firstName lastName email phone tags status campaignHistory')
      .sort({ firstName: 1, lastName: 1 })
      .limit(500)
      .lean();

    // Transform contacts for frontend
    const transformedContacts = contacts.map((contact) => ({
      _id: contact._id.toString(),
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      tags: contact.tags,
      status: contact.status,
      campaigns: contact.campaignHistory?.campaigns?.map((c: any) => ({
        campaignId: c.campaignId.toString(),
        campaignName: c.campaignName,
      })) || [],
    }));

    return NextResponse.json({
      success: true,
      contacts: transformedContacts,
    });
  } catch (error: any) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}
