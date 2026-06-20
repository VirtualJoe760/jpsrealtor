import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

/**
 * GET /api/agent/messaging
 * The agent's current SMS messaging status (number, Messaging Service, A2P state).
 * No secrets — these are identifiers.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();
    const user = await User.findById((session.user as any).id).select('messaging email').lean();
    const m = (user as any)?.messaging || {};
    const primaryEmail = (process.env.PRIMARY_AGENT_EMAIL || 'josephsardella@gmail.com').toLowerCase();
    const isPrimary = (user as any)?.email?.toLowerCase() === primaryEmail;

    return NextResponse.json({
      success: true,
      messaging: {
        twilioNumber: m.twilioNumber || null,
        messagingServiceSid: m.messagingServiceSid || null,
        status: m.status || 'none',
        a2p: { status: m.a2p?.status || 'none' },
        provisionedAt: m.provisionedAt || null,
        // The platform env number is the single-tenant fallback until the agent provisions.
        usingSharedNumber: !m.twilioNumber,
        // Feature preferences
        leadAlertsSms: m.leadAlertsSms !== false, // default on
        aiInbound: m.aiInbound === true,          // default off (opt-in)
        // Whether the agent can use messaging at all (provisioned, or primary on shared #)
        canMessage: !!m.twilioNumber || isPrimary,
      },
    });
  } catch (error: any) {
    console.error('[messaging GET] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to load messaging status' }, { status: 500 });
  }
}

/**
 * PATCH /api/agent/messaging  { leadAlertsSms?, aiInbound? }
 * Toggle the agent's SMS feature preferences.
 */
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();
    const body = await request.json().catch(() => ({}));

    const update: Record<string, boolean> = {};
    if (typeof body.leadAlertsSms === 'boolean') update['messaging.leadAlertsSms'] = body.leadAlertsSms;
    if (typeof body.aiInbound === 'boolean') update['messaging.aiInbound'] = body.aiInbound;
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    await User.findByIdAndUpdate((session.user as any).id, { $set: update });
    return NextResponse.json({ success: true, updated: update });
  } catch (error: any) {
    console.error('[messaging PATCH] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update preferences' }, { status: 500 });
  }
}
