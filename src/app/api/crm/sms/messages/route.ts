/**
 * SMS Messages API
 *
 * Fetch SMS message history
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import SMSMessage from '@/models/sms-message';

// ============================================================================
// GET /api/crm/sms/messages
// Fetch SMS messages with optional filtering
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);

    // Query parameters
    const contactId = searchParams.get('contactId');
    const phoneNumber = searchParams.get('phoneNumber');
    const direction = searchParams.get('direction');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = parseInt(searchParams.get('skip') || '0');

    // Build query - ALWAYS filter by userId
    const query: any = { userId: session.user.id };

    if (contactId) {
      query.contactId = contactId;
    }

    if (phoneNumber) {
      query.$or = [
        { from: phoneNumber },
        { to: phoneNumber },
      ];
    }

    if (direction) {
      query.direction = direction;
    }

    // Fetch messages
    // @ts-expect-error Mongoose typing issue with overloaded find() signatures
    const messages = await SMSMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    // Get total count
    const total = await SMSMessage.countDocuments(query);

    return NextResponse.json({
      success: true,
      messages,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + limit < total,
      },
    });
  } catch (error: any) {
    console.error('[SMS Messages API] GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
