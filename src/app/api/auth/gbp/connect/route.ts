import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/auth/gbp/connect
 *
 * Initiates OAuth flow to connect a Google Business Profile account.
 * Redirects to Google's consent screen requesting GBP management access.
 *
 * Uses the same GBP_CLIENT_ID as the API client (app-level credential).
 * The refresh token obtained will be stored per-user.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = process.env.GBP_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'GBP_CLIENT_ID not configured' }, { status: 500 });
  }

  const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/gbp/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/business.manage',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent', // Force consent to get refresh token
    state: 'gbp-connect',
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
