import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { listAccounts, listLocations } from '@/lib/gbp-api';

/**
 * GET /api/auth/gbp/callback
 *
 * OAuth callback from Google. Exchanges auth code for refresh token,
 * auto-discovers the user's GBP accountId and locationId,
 * and saves everything to their user profile in MongoDB.
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

  const clientId = process.env.GBP_CLIENT_ID;
  const clientSecret = process.env.GBP_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/gbp/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/agent/campaigns?error=gbp_not_configured', request.url));
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
      console.error('[gbp callback] Token exchange failed:', errBody);
      return NextResponse.redirect(new URL('/agent/campaigns?error=token_exchange_failed', request.url));
    }

    const tokens = await tokenRes.json();

    if (!tokens.refresh_token) {
      return NextResponse.redirect(new URL('/agent/campaigns?error=no_refresh_token', request.url));
    }

    // Auto-discover accountId and locationId using the new credentials
    const credentials = { refreshToken: tokens.refresh_token };
    let accountId: string | undefined;
    let locationId: string | undefined;

    try {
      const accountsResult = await listAccounts(credentials);
      if (accountsResult.accounts && accountsResult.accounts.length > 0) {
        // Use the first account (most agents have only one)
        accountId = accountsResult.accounts[0].name;
        console.log(`[gbp callback] Discovered account: ${accountId} (${accountsResult.accounts[0].accountName})`);

        // Discover locations for this account
        const locationsResult = await listLocations(accountId, credentials);
        if (locationsResult.locations && locationsResult.locations.length > 0) {
          // Use the first location
          locationId = locationsResult.locations[0].name;
          console.log(`[gbp callback] Discovered location: ${locationId} (${locationsResult.locations[0].locationName})`);
        }
      }
    } catch (discoveryError) {
      console.warn('[gbp callback] Account/location auto-discovery failed (non-blocking):', discoveryError);
      // Non-blocking: we still save the refresh token. User can set account/location manually.
    }

    // Save to user profile
    await dbConnect();
    const update: Record<string, any> = {
      'adAccounts.gbp.refreshToken': tokens.refresh_token,
      'adAccounts.gbp.connectedAt': new Date(),
      'adAccounts.gbp.status': 'connected',
    };

    if (accountId) {
      update['adAccounts.gbp.accountId'] = accountId;
    }
    if (locationId) {
      update['adAccounts.gbp.locationId'] = locationId;
    }

    await User.findOneAndUpdate(
      { email: session.user.email },
      { $set: update }
    );

    // Redirect back with success
    const successParam = accountId && locationId
      ? 'gbp=connected'
      : 'gbp=connected_partial'; // Connected but missing account/location auto-discovery
    return NextResponse.redirect(new URL(`/agent/campaigns?${successParam}`, request.url));
  } catch (err: any) {
    console.error('[gbp callback] Error:', err);
    return NextResponse.redirect(new URL('/agent/campaigns?error=gbp_callback_failed', request.url));
  }
}
