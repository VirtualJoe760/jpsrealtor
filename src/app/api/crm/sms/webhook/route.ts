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

    // Find the user who owns this Twilio number
    const user = await User.findOne({
      // Assuming you have a field for Twilio phone number in User model
      // If not, we'll need to use an environment variable or config
    });

    // For now, let's find contacts across all users and link to the right one
    // Better approach: Store Twilio number -> User mapping
    let contact = await Contact.findOne({
      phone: twilioData.From,
    });

    let userId = contact?.userId;

    // If no contact exists, we need to determine which user this belongs to
    // This could be based on the Twilio number they texted
    if (!userId) {
      console.log('[Twilio Webhook] No existing contact found for:', twilioData.From);
      // For now, we'll create an "unknown" contact
      // In production, you'd want to assign this to the correct user
      // based on which Twilio number received the message

      // Skip creating message if we can't determine the user
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Thank you for your message. We'll get back to you soon!</Message>
</Response>`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        }
      );
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

    console.log('[Twilio Webhook] Saved inbound message:', {
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
