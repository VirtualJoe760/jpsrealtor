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
import { emitNewMessage, getIO } from '@/server/socket';
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

    // --- Multi-tenant routing: the `To` number identifies the AGENT who owns it.
    let ownerUser = await User.findOne({ 'messaging.twilioNumber': twilioData.To });
    if (!ownerUser && twilioData.To === process.env.TWILIO_PHONE_NUMBER) {
      // Legacy shared env number → the platform/primary agent (NOT an arbitrary "first user").
      const primaryEmail = process.env.PRIMARY_AGENT_EMAIL || 'josephsardella@gmail.com';
      ownerUser = await User.findOne({ email: primaryEmail });
    }
    if (!ownerUser) {
      console.warn('[Twilio Webhook] No agent owns To number:', twilioData.To);
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>\n<Response></Response>`,
        { status: 200, headers: { 'Content-Type': 'text/xml' } }
      );
    }
    const userId = ownerUser._id.toString();

    // Find the contact for THIS agent (supports phones[] + legacy phone).
    let contact = await Contact.findOne({
      userId: ownerUser._id,
      $or: [{ phone: twilioData.From }, { 'phones.number': twilioData.From }],
    });
    if (!contact) {
      contact = await Contact.create({
        userId: ownerUser._id,
        phones: [{ number: twilioData.From, isPrimary: true }],
        phone: twilioData.From,
        firstName: 'Unknown',
        lastName: 'Contact',
        source: 'inbound_sms',
        status: 'lead',
      });
    }

    // --- STOP / HELP / START compliance keywords (required for A2P 10DLC) ---
    const kw = (twilioData.Body || '').trim().toUpperCase();
    let replyBody = '';
    if (['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].includes(kw)) {
      await Contact.findByIdAndUpdate(contact._id, { doNotContact: true, 'preferences.smsOptIn': false });
      replyBody = 'You have been unsubscribed and will no longer receive messages. Reply START to opt back in.';
    } else if (['START', 'YES', 'UNSTOP'].includes(kw)) {
      await Contact.findByIdAndUpdate(contact._id, { doNotContact: false, 'preferences.smsOptIn': true });
      replyBody = "You're subscribed again. Reply STOP to unsubscribe at any time.";
    } else if (['HELP', 'INFO'].includes(kw)) {
      replyBody = `${ownerUser.name || 'Your agent'} via ChatRealty. Reply with a question and we'll help. Msg & data rates may apply. Reply STOP to unsubscribe.`;
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
    // Convert Mongoose document to plain object for Socket.io serialization
    const plainMessage = smsMessage.toObject();
    console.log('[Twilio Webhook] 🔍 About to emit message:', {
      userId,
      messageId: plainMessage._id,
      from: plainMessage.from,
      to: plainMessage.to,
      direction: plainMessage.direction,
    });

    // Check if any clients are connected
    try {
      const io = getIO();
      const room = `user:${userId}`;
      const clientsInRoom = io.sockets.adapter.rooms.get(room);
      console.log(`[Twilio Webhook] 🔍 Room ${room} has ${clientsInRoom?.size || 0} clients`);
    } catch (e) {
      console.log('[Twilio Webhook] ⚠️ Could not get IO instance:', e);
    }

    emitNewMessage(userId, plainMessage);
    console.log('[Twilio Webhook] 📤 Emitted WebSocket event to user:', userId);

    // 📱 SEND PUSH NOTIFICATION - Alert user on mobile devices!
    // Generate display name for notification
    let contactDisplayName: string | undefined;
    if (contact) {
      const firstName = contact.firstName?.trim();
      const lastName = contact.lastName?.trim();

      // Don't show "Unknown Contact" - let it fall back to phone number formatting
      const isUnknownContact = (firstName === 'Unknown' && lastName === 'Contact');

      if (!isUnknownContact) {
        if (firstName && lastName) {
          contactDisplayName = `${firstName} ${lastName}`;
        } else if (firstName) {
          contactDisplayName = firstName;
        } else if (lastName) {
          contactDisplayName = lastName;
        }
      }
    }

    console.log('[Twilio Webhook] 📱 Sending push notification:', {
      userId,
      contactDisplayName,
      from: twilioData.From,
    });

    sendSMSNotification(userId, {
      from: twilioData.From,
      body: twilioData.Body || '',
      contactName: contactDisplayName,
      messageId: smsMessage._id.toString(),
    }).catch(err => {
      console.error('[Twilio Webhook] ❌ Push notification error:', err);
      // Don't fail the webhook if push fails
    });

    // Return TwiML — auto-reply for STOP/HELP/START keywords, else just acknowledge.
    const escaped = replyBody.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const twiml = replyBody
      ? `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>${escaped}</Message></Response>`
      : `<?xml version="1.0" encoding="UTF-8"?>\n<Response></Response>`;
    return new NextResponse(twiml, { status: 200, headers: { 'Content-Type': 'text/xml' } });
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
