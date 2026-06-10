import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

/**
 * GET /api/agent/ad-accounts
 * Returns the agent's connected ad account status (no secrets exposed).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email }, { adAccounts: 1 }).lean();

    return NextResponse.json({
      google: {
        connected: !!(user as any)?.adAccounts?.google?.refreshToken,
        customerId: (user as any)?.adAccounts?.google?.customerId || null,
        availableCustomers: (user as any)?.adAccounts?.google?.availableCustomers || [],
        status: (user as any)?.adAccounts?.google?.status || 'disconnected',
        connectedAt: (user as any)?.adAccounts?.google?.connectedAt || null,
      },
      meta: {
        connected: !!(user as any)?.adAccounts?.meta?.accessToken,
        adAccountId: (user as any)?.adAccounts?.meta?.adAccountId || null,
        adAccountName: (user as any)?.adAccounts?.meta?.adAccountName || null,
        pageId: (user as any)?.adAccounts?.meta?.pageId || null,
        pageName: (user as any)?.adAccounts?.meta?.pageName || null,
        businessName: (user as any)?.adAccounts?.meta?.businessName || null,
        tokenExpiresAt: (user as any)?.adAccounts?.meta?.tokenExpiresAt || null,
        availableAdAccounts: (user as any)?.adAccounts?.meta?.availableAdAccounts || [],
        availablePages: (user as any)?.adAccounts?.meta?.availablePages || [],
        status: (user as any)?.adAccounts?.meta?.status || 'disconnected',
        connectedAt: (user as any)?.adAccounts?.meta?.connectedAt || null,
      },
      gbp: {
        connected: !!(user as any)?.adAccounts?.gbp?.refreshToken,
        accountId: (user as any)?.adAccounts?.gbp?.accountId || null,
        locationId: (user as any)?.adAccounts?.gbp?.locationId || null,
        status: (user as any)?.adAccounts?.gbp?.status || 'disconnected',
        connectedAt: (user as any)?.adAccounts?.gbp?.connectedAt || null,
      },
    });
  } catch (error) {
    console.error('[ad-accounts GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch ad accounts' }, { status: 500 });
  }
}

/**
 * POST /api/agent/ad-accounts
 * Save ad account credentials for the current agent.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();
    const { platform, ...credentials } = body;

    if (platform !== 'google' && platform !== 'meta' && platform !== 'gbp') {
      return NextResponse.json({ error: 'Invalid platform. Use "google", "meta", or "gbp".' }, { status: 400 });
    }

    const update: any = {};

    if (platform === 'google') {
      if (credentials.customerId) update['adAccounts.google.customerId'] = credentials.customerId.replace(/-/g, '');
      if (credentials.developerToken) update['adAccounts.google.developerToken'] = credentials.developerToken;
      if (credentials.refreshToken) update['adAccounts.google.refreshToken'] = credentials.refreshToken;
      update['adAccounts.google.connectedAt'] = new Date();
      update['adAccounts.google.status'] = 'connected';
    }

    if (platform === 'meta') {
      if (credentials.adAccountId) update['adAccounts.meta.adAccountId'] = credentials.adAccountId;
      if (credentials.adAccountName) update['adAccounts.meta.adAccountName'] = credentials.adAccountName;
      if (credentials.accessToken) update['adAccounts.meta.accessToken'] = credentials.accessToken;
      if (credentials.pageId) update['adAccounts.meta.pageId'] = credentials.pageId;
      if (credentials.pageName) update['adAccounts.meta.pageName'] = credentials.pageName;
      update['adAccounts.meta.connectedAt'] = new Date();
      update['adAccounts.meta.status'] = 'connected';
    }

    await User.findOneAndUpdate(
      { email: session.user.email },
      { $set: update }
    );

    return NextResponse.json({ success: true, message: `${platform} ad account connected` });
  } catch (error) {
    console.error('[ad-accounts POST] Error:', error);
    return NextResponse.json({ error: 'Failed to save ad account' }, { status: 500 });
  }
}

/**
 * DELETE /api/agent/ad-accounts
 * Disconnect an ad account.
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');

    if (platform !== 'google' && platform !== 'meta' && platform !== 'gbp') {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    await User.findOneAndUpdate(
      { email: session.user.email },
      { $unset: { [`adAccounts.${platform}`]: 1 } }
    );

    return NextResponse.json({ success: true, message: `${platform} ad account disconnected` });
  } catch (error) {
    console.error('[ad-accounts DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
