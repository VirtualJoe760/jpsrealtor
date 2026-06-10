import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { verifyOAuthState, safeRedirectUrl } from '@/lib/oauth-state';

/**
 * GET /api/auth/meta-ads/callback
 *
 * OAuth callback from Facebook for the agent-side "Connect Meta Business" flow.
 *
 * Steps:
 *   1. Validate state (CSRF)
 *   2. Exchange short-lived code → short-lived user token
 *   3. Exchange short-lived → long-lived token (~60 days)
 *   4. Look up the user's ad accounts and pages
 *   5. Auto-select the first ad account + page (agent can change later in settings)
 *   6. Save to User.adAccounts.meta
 *   7. Redirect back to settings with status
 */
export async function GET(request: NextRequest) {
  const canonicalBase = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Identify the agent from the signed state (forgery-proof, 10-min TTL) — the
  // callback lands on the canonical domain with no cross-domain session cookie.
  const payload = verifyOAuthState(state, 'meta-ads-connect');
  if (!payload) {
    return NextResponse.redirect(safeRedirectUrl(undefined, '/agent/settings?meta_error=state_mismatch#integrations', canonicalBase));
  }
  const origin = payload.origin;

  if (error) {
    const reason = errorDescription || error;
    return NextResponse.redirect(
      safeRedirectUrl(origin, `/agent/settings?meta_error=${encodeURIComponent(reason)}#integrations`, canonicalBase)
    );
  }

  if (!code) {
    return NextResponse.redirect(safeRedirectUrl(origin, '/agent/settings?meta_error=no_code#integrations', canonicalBase));
  }

  const appId = process.env.META_APP_ID || process.env.FACEBOOK_CLIENT_ID;
  const appSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_CLIENT_SECRET;
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/auth/meta-ads/callback`;

  if (!appId || !appSecret) {
    return NextResponse.redirect(safeRedirectUrl(origin, '/agent/settings?meta_error=not_configured#integrations', canonicalBase));
  }

  try {
    // ---- 1. Exchange code for short-lived token ----
    const shortRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
        new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code,
        })
    );
    if (!shortRes.ok) {
      console.error('[meta-ads callback] short-token exchange failed:', await shortRes.text());
      return NextResponse.redirect(
        safeRedirectUrl(origin, '/agent/settings?meta_error=token_exchange_failed#integrations', canonicalBase)
      );
    }
    const shortJson = await shortRes.json();
    const shortToken: string = shortJson.access_token;

    // ---- 2. Exchange for long-lived token (~60 days) ----
    const longRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
        new URLSearchParams({
          grant_type: 'fb_exchange_token',
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: shortToken,
        })
    );
    if (!longRes.ok) {
      console.error('[meta-ads callback] long-token exchange failed:', await longRes.text());
      return NextResponse.redirect(
        safeRedirectUrl(origin, '/agent/settings?meta_error=long_token_failed#integrations', canonicalBase)
      );
    }
    const longJson = await longRes.json();
    const longToken: string = longJson.access_token;
    const expiresIn: number | undefined = longJson.expires_in;

    // ---- 3. Look up ad accounts the user has access to ----
    const adAccountsRes = await fetch(
      `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,account_id,name,account_status,business&access_token=${longToken}`
    );
    const adAccountsJson = await adAccountsRes.json();
    const adAccounts: Array<{ id: string; account_id: string; name: string; business?: { id: string; name: string } }> =
      adAccountsJson.data || [];

    // ---- 4. Look up pages the user manages ----
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,category,access_token&access_token=${longToken}`
    );
    const pagesJson = await pagesRes.json();
    const pages: Array<{ id: string; name: string; access_token?: string }> = pagesJson.data || [];

    // ---- 5. Auto-select first ad account + first page ----
    const firstAd = adAccounts[0];
    const firstPage = pages[0];

    // ---- 6. Save to User.adAccounts.meta ----
    await dbConnect();
    await User.findByIdAndUpdate(
      payload.userId,
      {
        $set: {
          'adAccounts.meta.accessToken': longToken,
          'adAccounts.meta.tokenExpiresAt': expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined,
          'adAccounts.meta.adAccountId': firstAd?.id, // already in act_ form
          'adAccounts.meta.adAccountName': firstAd?.name,
          'adAccounts.meta.businessId': firstAd?.business?.id,
          'adAccounts.meta.businessName': firstAd?.business?.name,
          'adAccounts.meta.pageId': firstPage?.id,
          'adAccounts.meta.pageName': firstPage?.name,
          'adAccounts.meta.pageAccessToken': firstPage?.access_token, // page-scoped token for ads on Page
          'adAccounts.meta.availableAdAccounts': adAccounts.map((a) => ({
            id: a.id,
            name: a.name,
            businessId: a.business?.id,
            businessName: a.business?.name,
          })),
          'adAccounts.meta.availablePages': pages.map((p) => ({ id: p.id, name: p.name })),
          'adAccounts.meta.connectedAt': new Date(),
          'adAccounts.meta.status': firstAd && firstPage ? 'connected' : 'pending',
        },
      },
      { new: true }
    );

    const successParam =
      firstAd && firstPage
        ? 'meta_ads=connected'
        : 'meta_ads=connected_partial'; // user connected but has no ad account / no page

    return NextResponse.redirect(safeRedirectUrl(origin, `/agent/settings?${successParam}#integrations`, canonicalBase));
  } catch (err: any) {
    console.error('[meta-ads callback] Error:', err);
    return NextResponse.redirect(
      safeRedirectUrl(origin, `/agent/settings?meta_error=${encodeURIComponent(err.message || 'callback_failed')}#integrations`, canonicalBase)
    );
  }
}
