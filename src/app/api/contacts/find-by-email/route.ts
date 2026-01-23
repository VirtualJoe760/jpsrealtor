import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Contact from '@/models/Contact';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }

    await dbConnect();

    // Search for contact by email in both primary and emails array
    const contact = await Contact.findOne({
      userId: session.user.id,
      $or: [
        { email: email.toLowerCase() },
        { 'emails.address': email.toLowerCase() }
      ]
    }).select('firstName lastName email emails address');

    if (!contact) {
      return NextResponse.json({ contact: null });
    }

    // Return contact data
    return NextResponse.json({
      contact: {
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email || contact.emails?.find((e: any) => e.isPrimary)?.address || email,
        address: contact.address
      }
    });

  } catch (error: any) {
    console.error('Error finding contact:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
