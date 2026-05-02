import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/auth/google-calendar/connect
 *
 * Initiates OAuth flow to connect an agent's Google Calendar.
 * Each agent connects their own Google account.
 * Supports subdomain-aware redirect via ?returnTo= param.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GOOGLE_CLIENT_ID not configured" }, { status: 500 });
  }

  // Support subdomain-aware return URL
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("returnTo") || "/agent/settings";

  // Build callback URL — use the request origin so it works on any subdomain
  const origin = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const redirectUri = `${origin}/api/auth/google-calendar/callback`;

  console.log("[gcal connect] Using client_id:", clientId?.slice(0, 20) + "...");
  console.log("[gcal connect] Using redirect_uri:", redirectUri);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    state: JSON.stringify({ returnTo, userId: session.user.id }),
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );
}
