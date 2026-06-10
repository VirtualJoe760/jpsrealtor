import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { listAccessibleCustomers } from '@/lib/google-ads-api';

/**
 * GET /api/auth/google-ads/callback
 *
 * OAuth callback from Google. Exchanges auth code for refresh token
 * and saves it to the agent's user profile in MongoDB.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL('/agent/campaigns?error=unauthorized', request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/agent/campaigns?error=${error}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/agent/campaigns?error=no_code', request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/google-ads/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/agent/campaigns?error=not_configured', request.url));
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('[google-ads callback] Token exchange failed:', errBody);
      return NextResponse.redirect(new URL('/agent/campaigns?error=token_exchange_failed', request.url));
    }

    const tokens = await tokenRes.json();

    if (!tokens.refresh_token) {
      return NextResponse.redirect(new URL('/agent/campaigns?error=no_refresh_token', request.url));
    }

    // Auto-discover the agent's accessible Google Ads accounts so they don't
    // have to paste a Customer ID. Best-effort: if discovery fails (e.g. dev
    // token still in review), we still store the refresh token and let the
    // agent enter the Customer ID manually.
    let availableCustomers: Array<{ id: string }> = [];
    let autoCustomerId: string | undefined;
    try {
      const ids = await listAccessibleCustomers(tokens.refresh_token);
      availableCustomers = ids.map((id) => ({ id }));
      if (ids.length === 1) autoCustomerId = ids[0]; // unambiguous → auto-select
    } catch (discoverErr) {
      console.warn('[google-ads callback] listAccessibleCustomers failed (non-fatal):', discoverErr);
    }

    // Save refresh token + discovered accounts to user profile
    await dbConnect();
    const set: Record<string, unknown> = {
      'adAccounts.google.refreshToken': tokens.refresh_token,
      'adAccounts.google.availableCustomers': availableCustomers,
      'adAccounts.google.connectedAt': new Date(),
      'adAccounts.google.status': 'connected',
    };
    if (autoCustomerId) set['adAccounts.google.customerId'] = autoCustomerId;
    await User.findOneAndUpdate({ email: session.user.email }, { $set: set });

    // Redirect back to campaigns with success
    return NextResponse.redirect(new URL('/agent/campaigns?google_ads=connected', request.url));
  } catch (err: any) {
    console.error('[google-ads callback] Error:', err);
    return NextResponse.redirect(new URL('/agent/campaigns?error=callback_failed', request.url));
  }
}
