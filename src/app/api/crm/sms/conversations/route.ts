/**
 * SMS Conversations API
 *
 * Get conversation threads grouped by phone number
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import SMSMessage from '@/models/sms-message';
import Contact from '@/models/Contact';
import mongoose from 'mongoose';

// ============================================================================
// GET /api/crm/sms/conversations
// Get all conversation threads with last message
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

    // Convert session.user.id (string) to ObjectId for querying
    const userObjectId = new mongoose.Types.ObjectId(session.user.id);
    console.log('[Conversations API] Fetching conversations for user:', session.user.id, '(ObjectId:', userObjectId, ')');

    // Aggregate messages to get unique phone numbers with their last message
    const conversations = await SMSMessage.aggregate([
      // Match messages for this user
      { $match: { userId: userObjectId } },

      // Sort by most recent first
      { $sort: { createdAt: -1 } },

      // Group by phone number (the OTHER party, not our Twilio number)
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$direction', 'inbound'] },
              '$from', // If inbound, group by 'from' (their number)
              '$to'    // If outbound, group by 'to' (their number)
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          messageCount: { $sum: 1 },
          unreadCount: { $sum: { $cond: [{ $eq: ['$direction', 'inbound'] }, 1, 0] } },
        }
      },

      // Sort by last message date
      { $sort: { 'lastMessage.createdAt': -1 } },

      // Limit to 100 conversations
      { $limit: 100 },
    ]);

    console.log('[Conversations API] Found', conversations.length, 'conversations');
    console.log('[Conversations API] Phone numbers:', conversations.map(c => c._id));

    // Fetch contact info for each phone number
    const phoneNumbers = conversations.map(c => c._id);
    const contacts = await Contact.find({
      userId: session.user.id, // Contact model uses string userId, not ObjectId
      phone: { $in: phoneNumbers },
    });

    console.log('[Conversations API] Found', contacts.length, 'matching contacts');

    // Create a map of phone -> contact
    const contactMap = new Map();
    contacts.forEach(contact => {
      contactMap.set(contact.phone, contact);
    });

    // Format conversations with contact info
    const formattedConversations = conversations.map((conv: any) => {
      const phoneNumber = conv._id;
      const contact = contactMap.get(phoneNumber);

      return {
        phoneNumber,
        contactId: contact?._id?.toString(),
        contactName: contact ? `${contact.firstName} ${contact.lastName}` : null,
        contactInfo: contact ? {
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          status: contact.status,
          tags: contact.tags,
          smsOptIn: contact.preferences?.smsOptIn || false,
        } : null,
        lastMessage: {
          _id: conv.lastMessage._id,
          body: conv.lastMessage.body,
          direction: conv.lastMessage.direction,
          status: conv.lastMessage.status,
          createdAt: conv.lastMessage.createdAt,
          from: conv.lastMessage.from,
          to: conv.lastMessage.to,
        },
        messageCount: conv.messageCount,
        unreadCount: conv.unreadCount,
      };
    });

    return NextResponse.json({
      success: true,
      conversations: formattedConversations,
      total: formattedConversations.length,
    });
  } catch (error: any) {
    console.error('[Conversations API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
