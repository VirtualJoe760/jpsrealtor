import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import EmailMetadata from '@/models/email-metadata';
import Contact from '@/models/Contact';

const RESEND_API_KEY = process.env.FULL_ACCESS_RESEND_API_KEY || process.env.RESEND_API_KEY;
const RESEND_API_URL = 'https://api.resend.com';

export async function GET(req: NextRequest) {
  try {
    if (!RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Resend API key not configured. Add RESEND_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') || '50';
    const after = searchParams.get('after');
    const before = searchParams.get('before');
    const folder = searchParams.get('folder') || 'inbox'; // inbox, sent, farms, clients, escrows
    const domain = searchParams.get('domain'); // domain filter (jpsrealtor.com or josephsardella.com)

    // Build query parameters
    const queryParams = new URLSearchParams({ limit });
    if (after) queryParams.append('after', after);
    if (before) queryParams.append('before', before);

    // Determine endpoint based on folder
    let endpoint = '';
    if (folder === 'sent') {
      endpoint = RESEND_API_URL + '/emails?' + queryParams.toString();
    } else {
      // inbox (default) - received emails
      endpoint = RESEND_API_URL + '/emails/receiving?' + queryParams.toString();
    }

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorObj;
      try {
        errorObj = JSON.parse(errorText);
      } catch {
        errorObj = { message: errorText };
      }

      // Check for restricted API key error
      if (response.status === 401 && errorObj.name === 'restricted_api_key') {
        return NextResponse.json(
          {
            error: 'Your Resend API key is restricted to send-only. Please create a new API key with full permissions (send + receive) in your Resend dashboard at https://resend.com/api-keys',
            details: errorObj.message
          },
          { status: response.status }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch emails from Resend', details: errorObj.message || errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Filter by domain if specified (for sent emails - transactional/marketing)
    if (domain && data.data && folder === 'sent') {
      const filtered = data.data.filter((email: any) => {
        // Check if email was sent from the specified domain
        const fromDomain = email.from.includes('@') ? email.from.split('@')[1].split('>')[0].trim() : '';
        return fromDomain === domain;
      });

      return NextResponse.json({ ...data, data: filtered });
    }

    // Filter by contact criteria (farms, clients, escrows)
    if (folder === 'farms' || folder === 'clients' || folder === 'escrows') {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      await dbConnect();

      // Fetch email metadata with contact information
      const metadata = await EmailMetadata.find({
        userId: session.user.id,
        isDeleted: false,
        contactId: { $exists: true, $ne: null },
      }).populate('contactId');

      // Get contact IDs based on folder type
      let contactIds: string[] = [];

      if (folder === 'farms') {
        // All emails from contacts (any contact in the system)
        contactIds = metadata
          .filter((m: any) => m.contactId)
          .map((m: any) => m.contactId._id.toString());
      } else if (folder === 'clients') {
        // Only contacts with status 'client'
        contactIds = metadata
          .filter((m: any) => m.contactId && m.contactId.status === 'client')
          .map((m: any) => m.contactId._id.toString());
      } else if (folder === 'escrows') {
        // Contacts with status 'client' and tags containing 'escrow' or 'in-escrow'
        contactIds = metadata
          .filter((m: any) =>
            m.contactId &&
            m.contactId.status === 'client' &&
            m.contactId.tags?.some((tag: string) =>
              tag.toLowerCase().includes('escrow') ||
              tag.toLowerCase().includes('in-escrow')
            )
          )
          .map((m: any) => m.contactId._id.toString());
      }

      // Filter emails by contactId
      const emailIds = new Set(
        metadata
          .filter((m: any) => contactIds.includes(m.contactId?._id.toString()))
          .map((m: any) => m.resendEmailId)
      );

      const filtered = data.data.filter((email: any) => emailIds.has(email.id));

      return NextResponse.json({ ...data, data: filtered });
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error fetching inbox:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
