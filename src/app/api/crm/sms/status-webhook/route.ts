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
import twilio from 'twilio';
import connectDB from '@/lib/mongodb';
import SMSMessage from '@/models/sms-message';
import { emitStatusUpdate } from '@/server/socket';

/**
 * Reconstruct the exact public URL Twilio signed the request against.
 * On Vercel the request arrives over http behind a proxy, so trust
 * x-forwarded-proto / x-forwarded-host (falling back to host) to rebuild
 * the https URL that was configured as the status-callback webhook.
 */
function getRequestUrl(request: NextRequest): string {
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const { pathname, search } = new URL(request.url);
  return `${proto}://${host}${pathname}${search}`;
}

// ============================================================================
// POST /api/crm/sms/status-webhook
// Receive status updates from Twilio
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Parse Twilio's form data
    const formData = await request.formData();

    // --- Verify the request actually came from Twilio (X-Twilio-Signature)
    // BEFORE any DB connection/mutation. Rejects forged status callbacks.
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const signature = request.headers.get('x-twilio-signature') || '';
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = typeof value === 'string' ? value : '';
    });

    if (!authToken) {
      console.error('[Status Webhook] TWILIO_AUTH_TOKEN not configured — rejecting request');
      return new NextResponse('Forbidden', { status: 403 });
    }

    const isValid = twilio.validateRequest(
      authToken,
      signature,
      getRequestUrl(request),
      params
    );

    if (!isValid) {
      console.warn('[Status Webhook] ❌ Invalid Twilio signature — rejecting request');
      return new NextResponse('Forbidden', { status: 403 });
    }

    await connectDB();

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

    // Emit WebSocket event to notify client in real-time
    emitStatusUpdate(message.userId.toString(), message._id.toString(), message.status);

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
