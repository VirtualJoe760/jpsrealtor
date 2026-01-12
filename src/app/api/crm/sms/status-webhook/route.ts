/**
 * Twilio Status Callback Webhook
 *
 * Receives delivery status updates from Twilio for sent messages
 * Updates message status in database (queued → sent → delivered/failed)
 *
 * Configure this URL in Twilio Console:
 * https://your-domain.com/api/crm/sms/status-webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SMSMessage from '@/models/sms-message';

// ============================================================================
// POST /api/crm/sms/status-webhook
// Receive status updates from Twilio
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Parse Twilio's form data
    const formData = await request.formData();

    const twilioData = {
      MessageSid: formData.get('MessageSid') as string,
      MessageStatus: formData.get('MessageStatus') as string,
      ErrorCode: formData.get('ErrorCode') as string,
      ErrorMessage: formData.get('ErrorMessage') as string,
      To: formData.get('To') as string,
      From: formData.get('From') as string,
    };

    console.log('[Status Webhook] Received status update:', {
      MessageSid: twilioData.MessageSid,
      Status: twilioData.MessageStatus,
      To: twilioData.To,
      ...(twilioData.ErrorCode && { ErrorCode: twilioData.ErrorCode }),
    });

    // Find and update message status
    const updateData: any = {
      status: twilioData.MessageStatus,
      updatedAt: new Date(),
    };

    // Add error details if present
    if (twilioData.ErrorCode) {
      updateData.errorCode = twilioData.ErrorCode;
      updateData.errorMessage = twilioData.ErrorMessage || 'Unknown error';
    }

    const message = await SMSMessage.findOneAndUpdate(
      { twilioMessageSid: twilioData.MessageSid },
      updateData,
      { new: true }
    );

    if (!message) {
      console.log('[Status Webhook] ⚠️ Message not found in database:', twilioData.MessageSid);
      // Return 200 anyway to prevent Twilio retries
      return new NextResponse('Message not found but acknowledged', { status: 200 });
    }

    console.log('[Status Webhook] ✅ Updated message:', {
      _id: message._id,
      status: message.status,
      to: message.to,
    });

    // TODO: Emit WebSocket event to notify client (Phase 2)
    // emitStatusUpdate(message.userId, message._id, message.status);

    return new NextResponse('OK', { status: 200 });
  } catch (error: any) {
    console.error('[Status Webhook] ❌ Error:', error);

    // IMPORTANT: Return 200 even on error to prevent Twilio from retrying
    // Log the error for investigation but acknowledge receipt
    return new NextResponse('Error acknowledged', { status: 200 });
  }
}

// GET endpoint for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Twilio Status Callback Webhook Endpoint',
    instructions: [
      '1. Go to Twilio Console',
      '2. Navigate to: Messaging > Services > [Your Service] > Sender Pool',
      '3. Or: Phone Numbers > Manage > Active Numbers > [Your Number]',
      '4. Set Status Callback URL to: https://your-domain.com/api/crm/sms/status-webhook',
      '5. Select POST method',
      '6. Enable these events: queued, sent, delivered, failed, undelivered',
    ],
    statusFlow: {
      queued: 'Message accepted by Twilio',
      sending: 'Being sent to carrier',
      sent: 'Sent to carrier (not yet delivered)',
      delivered: 'Delivered to device ✅',
      failed: 'Delivery failed ❌',
      undelivered: 'Not delivered to device',
    },
  });
}
