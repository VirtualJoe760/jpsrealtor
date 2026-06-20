import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { debit, credit } from '@/lib/credits';
import { EMAIL_SETUP_CREDITS } from '@/config/credits';
import { createResendDomain, verifyResendDomain } from '@/lib/email-provision';

function isPrimaryEmail(email?: string): boolean {
  const primary = (process.env.PRIMARY_AGENT_EMAIL || 'josephsardella@gmail.com').toLowerCase();
  return (email || '').toLowerCase() === primary;
}

/** GET — the agent's email-sending status. */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const user = await User.findById((session.user as any).id).select('emailConfig email').lean();
    const e = (user as any)?.emailConfig || {};
    const primary = isPrimaryEmail((user as any)?.email);
    return NextResponse.json({
      success: true,
      email: {
        domain: e.domain || null,
        fromAddress: e.fromAddress || null,
        status: e.status || 'none',
        provisionedAt: e.provisionedAt || null,
        canEmail: e.status === 'verified' || primary,
        usingSharedSender: e.status !== 'verified',
      },
    });
  } catch (error: any) {
    console.error('[agent/email GET] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to load email status' }, { status: 500 });
  }
}

/** POST { domain, fromAddress } — bill setup, create the Resend domain, return DNS records. */
export async function POST(request: Request) {
  let chargedUserId: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;
    await dbConnect();

    const { domain, fromAddress } = await request.json();
    const cleanDomain = String(domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(cleanDomain)) {
      return NextResponse.json({ success: false, error: 'Enter a valid domain (e.g. mail.youragent.com)' }, { status: 400 });
    }
    const from = String(fromAddress || '').trim().toLowerCase();
    if (!from || !from.endsWith(`@${cleanDomain}`)) {
      return NextResponse.json({ success: false, error: `From address must end with @${cleanDomain}` }, { status: 400 });
    }

    const user = await User.findById(userId).select('emailConfig');
    if ((user as any)?.emailConfig?.status === 'verified') {
      return NextResponse.json({ success: false, error: 'Email is already set up. Disconnect first to change.' }, { status: 409 });
    }

    // Bill the flat activation fee BEFORE provisioning.
    try {
      await debit({
        userId, amount: EMAIL_SETUP_CREDITS, type: 'email_setup', channel: 'email',
        description: 'Activate email sending (verified domain)',
      });
      chargedUserId = userId;
    } catch (e: any) {
      return NextResponse.json(
        { success: false, error: 'insufficient_credits', detail: e.message, creditsNeeded: EMAIL_SETUP_CREDITS },
        { status: 402 }
      );
    }

    const result = await createResendDomain(cleanDomain);
    await User.findByIdAndUpdate(userId, {
      $set: {
        'emailConfig.domain': cleanDomain,
        'emailConfig.fromAddress': from,
        'emailConfig.resendDomainId': result.id,
        'emailConfig.status': 'provisioning',
        'emailConfig.provisionedAt': new Date(),
      },
    });
    chargedUserId = null; // success — keep the charge

    return NextResponse.json({
      success: true,
      status: 'provisioning',
      records: result.records,
      message: 'Add these DNS records to your domain, then verify.',
    });
  } catch (error: any) {
    console.error('[agent/email POST] Error:', error);
    if (chargedUserId) {
      await credit({ userId: chargedUserId, amount: EMAIL_SETUP_CREDITS, type: 'refund', description: 'Refund: email activation failed' })
        .catch((e) => console.error('[agent/email] refund failed:', e));
    }
    return NextResponse.json({ success: false, error: error.message || 'Failed to set up email' }, { status: 500 });
  }
}

/** PATCH — verify the domain; mark verified when Resend confirms. */
export async function PATCH() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    await dbConnect();
    const user = await User.findById((session.user as any).id).select('emailConfig');
    const domainId = (user as any)?.emailConfig?.resendDomainId;
    if (!domainId) return NextResponse.json({ success: false, error: 'No domain to verify. Set up email first.' }, { status: 400 });

    const result = await verifyResendDomain(domainId);
    const verified = result.status === 'verified';
    await User.findByIdAndUpdate((session.user as any).id, {
      $set: { 'emailConfig.status': verified ? 'verified' : 'provisioning' },
    });
    return NextResponse.json({ success: true, status: result.status, verified, records: result.records });
  } catch (error: any) {
    console.error('[agent/email PATCH] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to verify domain' }, { status: 500 });
  }
}
