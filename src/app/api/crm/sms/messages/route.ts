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
import mongoose from 'mongoose';

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

    // Convert session.user.id (string) to ObjectId for querying
    const userObjectId = new mongoose.Types.ObjectId(session.user.id);

    // Build query - ALWAYS filter by userId
    const query: any = { userId: userObjectId };

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

    console.log('[SMS Messages API] Query:', JSON.stringify(query));
    console.log('[SMS Messages API] User ID:', session.user.id);
    console.log('[SMS Messages API] Contact ID filter:', contactId);

    // Fetch messages
    const messages = await SMSMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    console.log('[SMS Messages API] Found messages:', messages.length);
    if (messages.length > 0) {
      console.log('[SMS Messages API] Sample message:', {
        _id: messages[0]._id,
        userId: messages[0].userId,
        contactId: messages[0].contactId,
        direction: messages[0].direction,
        to: messages[0].to,
        from: messages[0].from,
      });
    }

    // Get total count
    const total = await SMSMessage.countDocuments(query);
    console.log('[SMS Messages API] Total count:', total);

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
