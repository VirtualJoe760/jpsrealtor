import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

/**
 * A2P 10DLC Brand registration info.
 *
 * GET  → the agent's current a2p business info + status (prefill the form).
 * POST → save the business info and mark status 'pending' (submitted for review).
 *
 * NOTE: this PERSISTS the info so registration is one-click when the platform's
 * ISV submission to Twilio runs. The actual Brand/Campaign creation with Twilio
 * is a separate (external) step that sets brandSid/campaignSid + status.
 */
const REQUIRED = ['legalBusinessName', 'ein', 'businessType', 'supportEmail'] as const;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const user = await User.findById((session.user as any).id).select('messaging.a2p').lean();
    return NextResponse.json({ success: true, a2p: (user as any)?.messaging?.a2p || { status: 'none' } });
  } catch (error: any) {
    console.error('[messaging/a2p GET] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to load A2P info' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const userId = (session.user as any).id;
    const existing = await User.findById(userId).select('messaging.a2p').lean();
    if ((existing as any)?.messaging?.a2p?.status === 'approved') {
      return NextResponse.json({ success: false, error: 'Your A2P registration is already approved.' }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));
    const missing = REQUIRED.filter((k) => !body[k] || !String(body[k]).trim());
    if (missing.length) {
      return NextResponse.json({ success: false, error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
    }

    const a = body.address || {};
    await User.findByIdAndUpdate(userId, {
      $set: {
        'messaging.a2p.legalBusinessName': String(body.legalBusinessName).trim(),
        'messaging.a2p.ein': String(body.ein).trim(),
        'messaging.a2p.businessType': String(body.businessType).trim(),
        'messaging.a2p.website': body.website ? String(body.website).trim() : undefined,
        'messaging.a2p.supportEmail': String(body.supportEmail).trim(),
        'messaging.a2p.supportPhone': body.supportPhone ? String(body.supportPhone).trim() : undefined,
        'messaging.a2p.address': {
          street: a.street?.trim(),
          city: a.city?.trim(),
          state: a.state?.trim(),
          postalCode: a.postalCode?.trim(),
          country: (a.country || 'US').trim(),
        },
        'messaging.a2p.status': 'pending',
        'messaging.a2p.submittedAt': new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      status: 'pending',
      message: 'Submitted. Your business is queued for A2P 10DLC registration review.',
    });
  } catch (error: any) {
    console.error('[messaging/a2p POST] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to submit A2P info' }, { status: 500 });
  }
}
