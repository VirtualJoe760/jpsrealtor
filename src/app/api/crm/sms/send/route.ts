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
import User from '@/models/User';
import { sendSMS, formatPhoneNumber } from '@/lib/twilio';
import { ensureBalance, debit } from '@/lib/credits';
import { estimateSmsCredits } from '@/config/credits';
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

    // TCPA: never send to a contact who has opted out.
    if (contactId) {
      const c = await Contact.findOne({ _id: contactId, userId: session.user.id }).select('doNotContact').lean();
      if ((c as any)?.doNotContact) {
        return NextResponse.json(
          { success: false, error: 'This contact has opted out (do not contact).' },
          { status: 403 }
        );
      }
    }

    // Multi-tenant: send from the agent's OWN Messaging Service / number, falling
    // back to the platform env number for agents not yet provisioned.
    const agent = await User.findById(session.user.id).select('messaging email').lean();
    const agentMsg = (agent as any)?.messaging;
    const fromNumber = agentMsg?.twilioNumber || process.env.TWILIO_PHONE_NUMBER;

    // The primary/platform agent uses the shared number and isn't gated or metered.
    const primaryEmail = (process.env.PRIMARY_AGENT_EMAIL || 'josephsardella@gmail.com').toLowerCase();
    const isPrimary = (agent as any)?.email?.toLowerCase() === primaryEmail;

    // Gate: non-primary agents must have activated text messaging.
    if (!isPrimary && agentMsg?.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'messaging_not_setup', detail: 'Set up text messaging to send.' },
        { status: 403 }
      );
    }

    // Meter: ensure the agent can afford this SMS before sending.
    const smsCost = estimateSmsCredits(messageBody);
    if (!isPrimary) {
      try {
        await ensureBalance(session.user.id, smsCost);
      } catch (e: any) {
        return NextResponse.json(
          { success: false, error: 'insufficient_credits', detail: e.message, creditsNeeded: smsCost },
          { status: 402 }
        );
      }
    }

    // Send SMS via Twilio
    const twilioResult = await sendSMS({
      to: formattedPhone,
      body: messageBody,
      from: fromNumber,
      messagingServiceSid: agentMsg?.messagingServiceSid || undefined,
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
      from: fromNumber,
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

    // Meter the send for non-primary agents (balance was ensured above).
    if (!isPrimary) {
      await debit({
        userId: session.user.id,
        amount: smsCost,
        type: 'sms_send',
        channel: 'sms',
        description: `SMS to ${formattedPhone}`,
      }).catch((e) => console.error('[SMS API] credit debit failed:', e));
    }

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
    // Convert Mongoose document to plain object for Socket.io serialization
    emitNewMessage(session.user.id, smsMessage.toObject());

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
