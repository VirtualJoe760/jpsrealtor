import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/auth/google-ads/callback
 *
 * OAuth callback from Google. Exchanges auth code for refresh token.
 * In production, store the refresh token securely (DB or env).
 * For now, displays it so it can be added to .env.local.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.json({ error: `OAuth error: ${error}` }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: 'No authorization code received' }, { status: 400 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/google-ads/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 });
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
      return NextResponse.json({ error: `Token exchange failed: ${errBody}` }, { status: 400 });
    }

    const tokens = await tokenRes.json();

    // In production, store refresh_token in DB associated with the user
    // For now, show it so it can be added to env
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>Google Ads Connected</title></head>
      <body style="font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px;">
        <h1>Google Ads Connected!</h1>
        <p>Add this refresh token to your <code>.env.local</code> file:</p>
        <pre style="background: #f5f5f5; padding: 16px; border-radius: 8px; word-break: break-all;">GOOGLE_ADS_REFRESH_TOKEN=${tokens.refresh_token || 'ERROR: No refresh token returned. Try revoking access and reconnecting.'}</pre>
        <p>You also need:</p>
        <pre style="background: #f5f5f5; padding: 16px; border-radius: 8px;">GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
GOOGLE_ADS_CUSTOMER_ID=your_customer_id (no dashes)</pre>
        <p><a href="/agent/campaigns">← Back to Campaigns</a></p>
      </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
