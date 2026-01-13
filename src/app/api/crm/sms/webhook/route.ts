/**
 * Twilio SMS Webhook Handler
 *
 * Receives inbound SMS messages from Twilio and saves them to the database.
 *
 * Configure this URL in Twilio Console:
 * https://your-domain.com/api/crm/sms/webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SMSMessage from '@/models/sms-message';
import Contact from '@/models/Contact';
import User from '@/models/User';
import { emitNewMessage } from '@/server/socket';
import { sendSMSNotification } from '@/services/pushNotificationService';

// ============================================================================
// POST /api/crm/sms/webhook
// Receive inbound SMS from Twilio
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Parse Twilio's form data
    const formData = await request.formData();

    const twilioData = {
      MessageSid: formData.get('MessageSid') as string,
      AccountSid: formData.get('AccountSid') as string,
      From: formData.get('From') as string,
      To: formData.get('To') as string,
      Body: formData.get('Body') as string,
      NumMedia: formData.get('NumMedia') as string,
      MediaUrl0: formData.get('MediaUrl0') as string,
    };

    console.log('[Twilio Webhook] Received inbound SMS:', {
      MessageSid: twilioData.MessageSid,
      From: twilioData.From,
      To: twilioData.To,
      Body: twilioData.Body?.substring(0, 50),
    });

    // Find contact by phone number to determine user
    let contact = await Contact.findOne({
      phone: twilioData.From,
    });

    let userId: string | undefined = contact?.userId?.toString();

    // If no contact exists, find the first user (for single-user systems)
    // or create an unassigned message queue
    if (!userId) {
      console.log('[Twilio Webhook] ⚠️ No existing contact found for:', twilioData.From);

      // For single-user systems, assign to first user
      const firstUser = await User.findOne();
      if (firstUser) {
        userId = firstUser._id.toString();
        console.log('[Twilio Webhook] Assigning to first user:', userId);

        // Optionally create contact on-the-fly
        // This allows messages from unknown numbers to still be received
        contact = await Contact.create({
          userId: firstUser._id,
          phone: twilioData.From,
          firstName: 'Unknown',
          lastName: 'Contact',
          source: 'inbound_sms',
          status: 'lead',
        });
        console.log('[Twilio Webhook] Created new contact:', contact._id);
      } else {
        console.log('[Twilio Webhook] ❌ No users found in system');
        // Still acknowledge to Twilio but don't save
        return new NextResponse(
          `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`,
          {
            status: 200,
            headers: { 'Content-Type': 'text/xml' },
          }
        );
      }
    }

    // Check if message already exists (prevent duplicates)
    const existingMessage = await SMSMessage.findOne({
      twilioMessageSid: twilioData.MessageSid,
    });

    if (existingMessage) {
      console.log('[Twilio Webhook] Message already exists:', twilioData.MessageSid);
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        }
      );
    }

    // Handle media URLs
    const mediaUrls: string[] = [];
    if (twilioData.NumMedia && parseInt(twilioData.NumMedia) > 0) {
      for (let i = 0; i < parseInt(twilioData.NumMedia); i++) {
        const mediaUrl = formData.get(`MediaUrl${i}`) as string;
        if (mediaUrl) {
          mediaUrls.push(mediaUrl);
        }
      }
    }

    // Save inbound message to database
    const smsMessage = await SMSMessage.create({
      userId: userId,
      twilioMessageSid: twilioData.MessageSid,
      twilioAccountSid: twilioData.AccountSid,
      from: twilioData.From,
      to: twilioData.To,
      body: twilioData.Body || '',
      direction: 'inbound',
      status: 'received',
      contactId: contact?._id?.toString(),
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
      twilioCreatedAt: new Date(),
    });

    console.log('[Twilio Webhook] ✅ Saved inbound message:', {
      _id: smsMessage._id,
      contactId: smsMessage.contactId,
      from: smsMessage.from,
    });

    // Update contact's last contact date
    if (contact) {
      await Contact.findByIdAndUpdate(contact._id, {
        lastContactDate: new Date(),
        lastContactMethod: 'sms',
      });
      console.log('[Twilio Webhook] Updated contact last contact date');
    }

    // 🔥 EMIT WEBSOCKET EVENT - Push message to client instantly!
    emitNewMessage(userId, smsMessage);
    console.log('[Twilio Webhook] 📤 Emitted WebSocket event to user:', userId);

    // 📱 SEND PUSH NOTIFICATION - Alert user on mobile devices!
    sendSMSNotification(userId, {
      from: twilioData.From,
      body: twilioData.Body || '',
      contactName: contact?.firstName && contact?.lastName
        ? `${contact.firstName} ${contact.lastName}`
        : undefined,
      messageId: smsMessage._id.toString(),
    }).catch(err => {
      console.error('[Twilio Webhook] Push notification error:', err);
      // Don't fail the webhook if push fails
    });

    // Return TwiML response (optional auto-reply)
    // For now, we'll just acknowledge receipt with an empty response
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      }
    );
  } catch (error: any) {
    console.error('[Twilio Webhook] Error:', error);

    // Return success to Twilio even on error to prevent retries
    // Log the error for investigation
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      }
    );
  }
}

// GET endpoint for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Twilio SMS Webhook Endpoint',
    instructions: 'Configure this URL in your Twilio Console as the Messaging Webhook URL',
  });
}
