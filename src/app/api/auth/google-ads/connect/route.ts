import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createOAuthState } from '@/lib/oauth-state';

/**
 * GET /api/auth/google-ads/connect
 *
 * Initiates OAuth flow to connect a Google Ads account.
 * Redirects to Google's consent screen requesting ads read/write access.
 *
 * The callback lands on the CANONICAL domain (NEXTAUTH_URL). Since the agent may
 * have started here on their own branded domain (no session cookie on canonical),
 * we identify them at the callback via a signed `state` rather than a session.
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'GOOGLE_CLIENT_ID not configured' }, { status: 500 });
  }

  const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/google-ads/callback`;

  // Origin the agent started on, so the callback can send them back to a page
  // where they're logged in (derived from the request URL, then signed).
  let origin: string | undefined;
  try { origin = new URL(request.url).origin; } catch { origin = undefined; }

  const state = createOAuthState({
    userId: (session.user as any).id,
    purpose: 'google-ads-connect',
    origin,
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/adwords',
    access_type: 'offline',
    prompt: 'consent', // Force consent to get refresh token
    state,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
