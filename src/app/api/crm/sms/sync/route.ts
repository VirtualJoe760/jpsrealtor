/**
 * Twilio Message Sync API
 *
 * Syncs message history from Twilio to the database for a contact
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import SMSMessage from '@/models/sms-message';
import Contact from '@/models/Contact';
import { getMessageHistory } from '@/lib/twilio';
import mongoose from 'mongoose';

// ============================================================================
// POST /api/crm/sms/sync
// Sync Twilio message history for a contact
// ============================================================================

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { contactId, phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'phoneNumber is required' },
        { status: 400 }
      );
    }

    console.log(`[SMS Sync] Starting sync for phone: ${phoneNumber}, contactId: ${contactId}`);

    // Convert session.user.id (string) to ObjectId for message creation
    const userObjectId = new mongoose.Types.ObjectId(session.user.id);

    // Verify contact belongs to user
    let contact = null;
    if (contactId) {
      contact = await Contact.findOne({
        _id: contactId,
        userId: session.user.id,
      });

      if (!contact) {
        return NextResponse.json(
          { success: false, error: 'Contact not found or access denied' },
          { status: 404 }
        );
      }
    } else {
      // Try to find contact by phone number
      contact = await Contact.findOne({
        userId: session.user.id,
        phone: phoneNumber,
      });
    }

    // Fetch message history from Twilio
    const twilioResult = await getMessageHistory(phoneNumber, 100);

    if (!twilioResult.success || !twilioResult.messages) {
      return NextResponse.json(
        { success: false, error: twilioResult.error || 'Failed to fetch from Twilio' },
        { status: 500 }
      );
    }

    console.log(`[SMS Sync] Fetched ${twilioResult.messages.length} messages from Twilio`);

    // Sync messages to database
    let syncedCount = 0;
    let skippedCount = 0;

    for (const twilioMsg of twilioResult.messages) {
      try {
        // Check if message already exists
        const existing = await SMSMessage.findOne({
          twilioMessageSid: twilioMsg.sid,
        });

        if (existing) {
          skippedCount++;
          continue;
        }

        // Create new message
        await SMSMessage.create({
          userId: userObjectId,
          twilioMessageSid: twilioMsg.sid,
          twilioAccountSid: twilioMsg.accountSid,
          from: twilioMsg.from,
          to: twilioMsg.to,
          body: twilioMsg.body || '',
          direction: twilioMsg.direction,
          status: twilioMsg.status,
          contactId: contact?._id?.toString(),
          price: twilioMsg.price ? parseFloat(twilioMsg.price) : undefined,
          priceUnit: twilioMsg.priceUnit || 'USD',
          twilioCreatedAt: twilioMsg.dateSent || twilioMsg.dateCreated,
          createdAt: twilioMsg.dateSent || twilioMsg.dateCreated,
        });

        syncedCount++;
      } catch (error: any) {
        console.error(`[SMS Sync] Error syncing message ${twilioMsg.sid}:`, error);
        // Continue with other messages
      }
    }

    console.log(`[SMS Sync] Synced ${syncedCount} new messages, skipped ${skippedCount} existing`);

    // Fetch updated messages from database
    const query: any = { userId: userObjectId };
    if (contact) {
      query.contactId = contact._id.toString();
    } else {
      query.$or = [
        { from: phoneNumber },
        { to: phoneNumber },
      ];
    }

    const messages = await SMSMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({
      success: true,
      syncedCount,
      skippedCount,
      totalMessages: messages.length,
      messages,
      message: `Synced ${syncedCount} new messages`,
    });
  } catch (error: any) {
    console.error('[SMS Sync] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
