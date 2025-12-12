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
import Contact from '@/models/contact';
import { sendSMS, formatPhoneNumber } from '@/lib/twilio';

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
    const { to, body: messageBody, contactId } = body;

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

    // Save to database with userId
    // @ts-expect-error Mongoose typing issue with overloaded create() signatures
    const smsMessage = await SMSMessage.create({
      userId: session.user.id,
      twilioMessageSid: twilioResult.messageSid,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone,
      body: messageBody,
      direction: 'outbound',
      status: twilioResult.status || 'queued',
      contactId,
      sentBy: session.user.id,
      twilioCreatedAt: new Date(),
    });

    // Update contact's last contact date (verify it belongs to this user)
    if (contactId) {
      // @ts-expect-error Mongoose typing issue with overloaded findOneAndUpdate() signatures
      await Contact.findOneAndUpdate(
        { _id: contactId, userId: session.user.id },
        {
          lastContactDate: new Date(),
          lastContactMethod: 'sms',
        }
      );
    }

    console.log(`[SMS API] Sent SMS: ${twilioResult.messageSid}`);

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
