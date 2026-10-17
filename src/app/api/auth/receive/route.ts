// src/app/api/auth/receive/route.ts
// Cross-domain session transfer — step 2 of 2.
//
// Receives a hand-off token from /api/auth/transfer (a normal session moving
// hosts) or /api/auth/impersonate (an admin's "Log in as {agent}"), validates
// it, and sets a NextAuth session cookie on the CURRENT host.
//
// GET /api/auth/receive?token=xxx&redirect=/path
//
// COOKIE SCOPE (changed 2026-10-16): on chatrealty.io and dev hosts the cookie
// is HOST-ONLY. It used to be `Domain=.chatrealty.io`, which sent the session
// to every *.chatrealty.io site — including agent subdomains that are
// reverse-proxied to the agent's own deployment — and made two sessions on
// sibling hosts (an admin on www, the agent they impersonate on the agent's
// subdomain) collide under one cookie name. Agents now work on their own
// subdomain (src/lib/agent-host.ts), so one host per session is the model.
// jpsrealtor.com / josephsardella.com keep their apex cookie: it only spans
// www + bare of the same single site.

import { NextRequest, NextResponse } from "next/server";
import { decode, encode } from "next-auth/jwt";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { subdomainOfHost } from "@/lib/agent-host";

// Mirrors /api/auth/impersonate. An impersonation hand-off is honored only if
// its impersonator is STILL an admin when it is redeemed.
const ADMIN_EMAILS = ["josephsardella@gmail.com"];
const THIRTY_DAYS = 30 * 24 * 60 * 60;

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  let redirect = req.nextUrl.searchParams.get("redirect") || "/";
  // Same-host paths only: "//evil.com" would be read as a protocol-relative URL.
  if (!redirect.startsWith("/") || redirect.startsWith("//")) redirect = "/";

  // Build absolute redirect URL from Host header (not req.url which may be internal)
  const host = req.headers.get("host") || "localhost";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const absoluteRedirectUrl = `${protocol}://${host}${redirect}`;
  const hostname = host.split(":")[0].toLowerCase();

  if (!token) return NextResponse.redirect(absoluteRedirectUrl);
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return NextResponse.redirect(absoluteRedirectUrl);

  let decoded: any;
  try {
    decoded = await decode({ token, secret });
  } catch {
    return NextResponse.redirect(absoluteRedirectUrl); // expired or invalid
  }
  if (!decoded?.transferAuth) return NextResponse.redirect(absoluteRedirectUrl);

  await dbConnect();
  const now = Math.floor(Date.now() / 1000);
  let sessionToken: string;

  if (decoded.impersonation) {
    // --- Admin "Log in as {agent}" ---------------------------------------
    const admin: any = await User.findOne({ email: String(decoded.impersonatedBy || "").toLowerCase() })
      .select("email isAdmin")
      .lean();
    const adminOk = !!admin && (admin.isAdmin === true || ADMIN_EMAILS.includes(admin.email));
    const agent: any = adminOk
      ? await User.findById(String(decoded.targetUserId || ""))
          .select("_id name email image roles agentProfile.subdomain")
          .lean()
          .catch(() => null)
      : null;
    // Bound to the agent's own host: a captured hand-off can't be replayed to
    // impersonate them somewhere else.
    if (!agent || !agent.agentProfile?.subdomain || subdomainOfHost(hostname) !== agent.agentProfile.subdomain) {
      console.warn("[Auth Receive] Impersonation hand-off refused", { hostname, adminOk });
      return NextResponse.redirect(absoluteRedirectUrl);
    }
    sessionToken = await encode({
      token: {
        id: String(agent._id),
        email: agent.email,
        name: agent.name,
        picture: agent.image,
        roles: agent.roles || [],
        isAdmin: false, // the AGENT is not an admin, even though the viewer is
        twoFactorEnabled: false,
        requiresTwoFactor: false,
        agentSubdomain: agent.agentProfile.subdomain,
        impersonatedBy: admin.email,
        impersonatedByName: decoded.impersonatedByName || undefined,
        iat: now,
        exp: now + THIRTY_DAYS,
      },
      secret,
      maxAge: THIRTY_DAYS,
    });
  } else {
    // --- A normal session moving hosts -------------------------------------
    if (!decoded.email) return NextResponse.redirect(absoluteRedirectUrl);
    const user: any = await User.findOne({ email: String(decoded.email).toLowerCase() })
      .select("_id name email image roles isAdmin twoFactorEnabled agentProfile.subdomain")
      .lean();
    if (!user) return NextResponse.redirect(absoluteRedirectUrl);
    sessionToken = await encode({
      token: {
        id: String(user._id),
        email: user.email,
        name: user.name,
        picture: user.image,
        roles: user.roles,
        isAdmin: user.isAdmin,
        twoFactorEnabled: user.twoFactorEnabled || false,
        requiresTwoFactor: false,
        agentSubdomain: user.agentProfile?.subdomain || undefined,
        iat: now,
        exp: now + THIRTY_DAYS,
      },
      secret,
      maxAge: THIRTY_DAYS,
    });
  }

  const isProduction = process.env.NODE_ENV === "production";
  const cookieName = isProduction ? "__Secure-next-auth.session-token" : "next-auth.session-token";

  // Host-only on chatrealty.io + dev (see header). Owner apexes keep www+bare.
  let cookieDomain: string | undefined;
  if (hostname.endsWith(".jpsrealtor.com") || hostname === "jpsrealtor.com") {
    cookieDomain = ".jpsrealtor.com";
  } else if (hostname.endsWith(".josephsardella.com") || hostname === "josephsardella.com") {
    cookieDomain = ".josephsardella.com";
  }

  const response = NextResponse.redirect(absoluteRedirectUrl);
  response.cookies.set(cookieName, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isProduction,
    maxAge: THIRTY_DAYS,
    ...(cookieDomain && { domain: cookieDomain }),
  });
  return response;
}
