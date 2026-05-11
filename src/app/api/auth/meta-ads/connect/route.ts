import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import crypto from 'crypto';

/**
 * GET /api/auth/meta-ads/connect
 *
 * Initiates the Meta Business OAuth flow. Redirects the agent to Facebook's
 * consent screen requesting permission for ChatRealty to manage their ads
 * and pages on their behalf.
 *
 * Scopes requested:
 *   ads_management      — create/edit/read ad campaigns
 *   business_management — see/manage business assets the user has access to
 *   pages_show_list     — list the pages they manage
 *   pages_read_engagement — read page metadata
 *   pages_manage_ads    — run ads as the page
 *   pages_manage_metadata — read insights and update page details
 *
 * Uses META_APP_ID / META_APP_SECRET (the brand-approved Marketing API app).
 * Falls back to FACEBOOK_CLIENT_ID / FACEBOOK_CLIENT_SECRET if those aren't set.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const appId = process.env.META_APP_ID || process.env.FACEBOOK_CLIENT_ID;
  if (!appId) {
    return NextResponse.json(
      { error: 'META_APP_ID (or FACEBOOK_CLIENT_ID) not configured' },
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/auth/meta-ads/callback`;

  // CSRF protection: bind state to the user's session.
  const state = crypto
    .createHmac('sha256', process.env.NEXTAUTH_SECRET || 'fallback-secret')
    .update(`${(session.user as any).id}:meta-ads-connect`)
    .digest('hex')
    .slice(0, 32);

  const scopes = [
    'ads_management',
    'business_management',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_ads',
    'pages_manage_metadata',
  ].join(',');

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes,
    state,
    auth_type: 'rerequest', // re-prompt for any previously denied scopes
  });

  return NextResponse.redirect(`https://www.facebook.com/v21.0/dialog/oauth?${params}`);
}
