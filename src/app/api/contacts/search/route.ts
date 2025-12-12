/**
 * Contact Search API
 *
 * Search contacts for autocomplete in email compose
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/db';
import Contact from '@/models/contact';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.length < 2) {
      return NextResponse.json({ contacts: [] });
    }

    // Search by name or email
    // @ts-expect-error Mongoose typing issue with overloaded find() signatures
    const contacts = await Contact.find({
      userId: session.user.id,
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { alternateEmails: { $regex: query, $options: 'i' } },
      ],
    })
      .select('firstName lastName email alternateEmails photo')
      .limit(limit)
      .lean();

    // Format results for autocomplete
    const results = contacts.flatMap((contact) => {
      const emails: string[] = [];
      if (contact.email) emails.push(contact.email);
      if (contact.alternateEmails) emails.push(...contact.alternateEmails);

      return emails.map((email) => ({
        id: contact._id.toString(),
        name: `${contact.firstName} ${contact.lastName}`.trim(),
        email,
        photo: contact.photo,
      }));
    });

    return NextResponse.json({ contacts: results });
  } catch (error: any) {
    console.error('[Contact Search] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
