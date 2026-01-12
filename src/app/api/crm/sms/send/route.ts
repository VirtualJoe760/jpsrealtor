/**
 * SMS Send API
 *
 * Send SMS messages via Twilio and save to database
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import SMSMessage from '@/models/sms-message';
import Contact from '@/models/Contact';
import { sendSMS, formatPhoneNumber } from '@/lib/twilio';
import mongoose from 'mongoose';
import { emitNewMessage } from '@/server/socket';

// ============================================================================
// POST /api/crm/sms/send
// Send SMS message
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
    let { to, body: messageBody, contactId } = body;

    // Validate required fields
    if (!to || !messageBody) {
      return NextResponse.json(
        { success: false, error: 'to and body are required' },
        { status: 400 }
      );
    }

    // Format phone number to E.164
    const formattedPhone = formatPhoneNumber(to);
    if (!formattedPhone) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number format. Use E.164 format (e.g., +17605551234)' },
        { status: 400 }
      );
    }

    // If no contactId provided, try to find contact by phone number
    if (!contactId) {
      console.log('[SMS API] No contactId provided, looking up by phone:', formattedPhone);
      const contact = await Contact.findOne({
        userId: session.user.id,
        phone: formattedPhone,
      });
      if (contact) {
        contactId = contact._id.toString();
        console.log('[SMS API] Found matching contact:', contactId);
      } else {
        console.log('[SMS API] No matching contact found for phone:', formattedPhone);
      }
    }

    // Send SMS via Twilio
    const twilioResult = await sendSMS({
      to: formattedPhone,
      body: messageBody,
    });

    if (!twilioResult.success) {
      return NextResponse.json(
        { success: false, error: twilioResult.error },
        { status: 500 }
      );
    }

    // Convert session.user.id (string) to ObjectId for message creation
    const userObjectId = new mongoose.Types.ObjectId(session.user.id);

    // Save to database with userId
    const messageData = {
      userId: userObjectId,
      twilioMessageSid: twilioResult.messageSid,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone,
      body: messageBody,
      direction: 'outbound',
      status: twilioResult.status || 'queued',
      contactId,
      sentBy: session.user.id,
      twilioCreatedAt: new Date(),
    };

    console.log(`[SMS API] Saving message to DB with data:`, messageData);

    const smsMessage = await SMSMessage.create(messageData);

    console.log(`[SMS API] Saved message to DB:`, {
      _id: smsMessage._id,
      userId: smsMessage.userId,
      contactId: smsMessage.contactId,
      to: smsMessage.to,
      from: smsMessage.from,
    });

    // Update contact's last contact date (verify it belongs to this user)
    if (contactId) {
      console.log(`[SMS API] Updating contact ${contactId} last contact date`);
      const updatedContact = await Contact.findOneAndUpdate(
        { _id: contactId, userId: session.user.id },
        {
          lastContactDate: new Date(),
          lastContactMethod: 'sms',
        },
        { new: true }
      );
      console.log(`[SMS API] Contact update result:`, updatedContact ? 'Success' : 'Not found');
    }

    console.log(`[SMS API] Sent SMS: ${twilioResult.messageSid}`);

    // Emit WebSocket event to notify client instantly
    emitNewMessage(session.user.id, smsMessage);

    return NextResponse.json({
      success: true,
      message: smsMessage,
      twilioMessageSid: twilioResult.messageSid,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[SMS API] Send error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
