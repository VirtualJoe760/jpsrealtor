import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

/**
 * GET /api/auth/google-calendar/callback
 *
 * OAuth callback from Google. Exchanges auth code for refresh token,
 * fetches the user's email for the connected Google account,
 * and saves calendar settings to the agent's profile.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/agent/settings?error=unauthorized", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const stateRaw = searchParams.get("state");

  // Parse return URL from state
  let returnTo = "/agent/settings";
  try {
    if (stateRaw) {
      const parsed = JSON.parse(stateRaw);
      returnTo = parsed.returnTo || returnTo;
    }
  } catch {}

  if (error) {
    return NextResponse.redirect(new URL(`${returnTo}?error=${error}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL(`${returnTo}?error=no_code`, request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const redirectUri = `${origin}/api/auth/google-calendar/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL(`${returnTo}?error=google_not_configured`, request.url));
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("[gcal callback] Token exchange failed:", errBody);
      return NextResponse.redirect(new URL(`${returnTo}?error=token_exchange_failed`, request.url));
    }

    const tokens = await tokenRes.json();

    if (!tokens.refresh_token) {
      console.error("[gcal callback] No refresh token returned");
      return NextResponse.redirect(new URL(`${returnTo}?error=no_refresh_token`, request.url));
    }

    // Get the Google account email using the access token
    let calendarEmail = session.user.email;
    try {
      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (userInfoRes.ok) {
        const userInfo = await userInfoRes.json();
        calendarEmail = userInfo.email || calendarEmail;
      }
    } catch (e) {
      console.warn("[gcal callback] Failed to fetch calendar email, using session email");
    }

    // Save to user profile
    await dbConnect();
    await User.findOneAndUpdate(
      { email: session.user.email },
      {
        $set: {
          "calendarSettings.refreshToken": tokens.refresh_token,
          "calendarSettings.calendarEmail": calendarEmail,
          "calendarSettings.calendarId": "primary",
          "calendarSettings.connectedAt": new Date(),
          "calendarSettings.status": "connected",
          "calendarSettings.bookingEnabled": true,
        },
      }
    );

    console.log(`[gcal callback] Calendar connected for ${session.user.email} (calendar: ${calendarEmail})`);

    return NextResponse.redirect(new URL(`${returnTo}?calendar=connected`, request.url));
  } catch (err: any) {
    console.error("[gcal callback] Error:", err);
    return NextResponse.redirect(new URL(`${returnTo}?error=calendar_callback_failed`, request.url));
  }
}
