import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { provisionAgentNumber, createAgentMessagingService } from '@/lib/twilio';

/**
 * POST /api/agent/messaging/provision  { phoneNumber }
 *
 * Buys the chosen number on the platform Twilio account, creates a per-agent
 * Messaging Service, attaches the number, points its SMS webhook at the shared
 * inbound route (which routes by the To-number), and stores it on the agent.
 *
 * NOTE: this purchases a real number ($) on the live Twilio account and is
 * UNVERIFIED end-to-end. A2P 10DLC Brand+Campaign registration is a separate
 * step (Phase 2) before consumer SMS will deliver reliably.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id as string;
    await dbConnect();

    const { phoneNumber } = await request.json();
    if (!phoneNumber || !String(phoneNumber).startsWith('+')) {
      return NextResponse.json({ success: false, error: 'A valid E.164 phoneNumber is required' }, { status: 400 });
    }

    const user = await User.findById(userId).select('name messaging');
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    if ((user as any).messaging?.twilioNumber) {
      return NextResponse.json(
        { success: false, error: 'You already have a number provisioned. Disconnect it first to change.' },
        { status: 409 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://chatrealty.io';
    const smsWebhookUrl = `${baseUrl}/api/crm/sms/webhook`;
    const statusCallbackUrl = `${baseUrl}/api/crm/sms/status-webhook`;
    const friendlyName = `${(user as any).name || 'Agent'} (ChatRealty)`;

    // 1) Buy the number + point its SMS webhook at the shared inbound route.
    const { numberSid, phoneNumber: purchased } = await provisionAgentNumber({
      phoneNumber,
      friendlyName,
      smsWebhookUrl,
      statusCallbackUrl,
    });

    // 2) Create the agent's Messaging Service and attach the number (A2P sender pool).
    let messagingServiceSid: string | undefined;
    try {
      messagingServiceSid = await createAgentMessagingService({
        friendlyName: `${friendlyName} SMS`,
        inboundWebhookUrl: smsWebhookUrl,
        numberSid,
      });
    } catch (e: any) {
      console.error('[messaging/provision] Messaging Service creation failed (number still purchased):', e?.message);
      // Non-fatal — the number works via its own webhook; A2P needs the service though.
    }

    // 3) Persist on the agent.
    await User.findByIdAndUpdate(userId, {
      $set: {
        'messaging.twilioNumber': purchased,
        'messaging.twilioNumberSid': numberSid,
        'messaging.messagingServiceSid': messagingServiceSid,
        'messaging.status': 'active',
        'messaging.provisionedAt': new Date(),
        'messaging.a2p.status': 'none',
      },
    });

    return NextResponse.json({
      success: true,
      number: purchased,
      messagingServiceSid,
      a2pRequired: true,
      message: 'Number provisioned. A2P 10DLC registration is required before consumer SMS delivers reliably.',
    });
  } catch (error: any) {
    console.error('[messaging/provision] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to provision number' }, { status: 500 });
  }
}
