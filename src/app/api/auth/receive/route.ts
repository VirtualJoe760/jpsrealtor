// src/app/api/auth/receive/route.ts
// Cross-domain session transfer — step 2 of 2.
//
// Receives a transfer token from /api/auth/transfer on another domain,
// validates it, looks up the user, and sets a full NextAuth session cookie
// on the current domain.
//
// GET /api/auth/receive?token=xxx&redirect=/path

import { NextRequest, NextResponse } from "next/server";
import { decode, encode } from "next-auth/jwt";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const redirect = req.nextUrl.searchParams.get("redirect") || "/";

  // Build absolute redirect URL from Host header (not req.url which may be internal)
  const host = req.headers.get("host") || "localhost";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const absoluteRedirectUrl = `${protocol}://${host}${redirect}`;

  const hostname = host.split(":")[0];

  console.log("[Auth Receive] Initiated:", {
    hostname,
    redirect,
    hasToken: !!token,
  });

  if (!token) {
    return NextResponse.redirect(absoluteRedirectUrl);
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.redirect(absoluteRedirectUrl);
  }

  // Decode and validate the transfer token
  let decoded;
  try {
    decoded = await decode({ token, secret });
  } catch {
    // Token expired or invalid — redirect without auth
    return NextResponse.redirect(absoluteRedirectUrl);
  }

  if (!decoded?.email || !decoded?.transferAuth) {
    return NextResponse.redirect(absoluteRedirectUrl);
  }

  console.log("[Auth Receive] Transfer token valid:", { email: decoded.email });

  // Look up the user to build a full session token
  await dbConnect();
  const user = await User.findOne({ email: (decoded.email as string).toLowerCase() })
    .select("_id name email image roles isAdmin twoFactorEnabled")
    .lean();

  if (!user) {
    return NextResponse.redirect(absoluteRedirectUrl);
  }

  console.log("[Auth Receive] User found:", {
    id: String(user._id),
    name: user.name,
    email: user.email,
  });

  // Build a full NextAuth-compatible JWT (same shape as the jwt callback in auth.ts)
  const sessionToken = await encode({
    token: {
      id: String(user._id),
      email: user.email,
      name: user.name,
      picture: user.image,
      roles: user.roles,
      isAdmin: user.isAdmin,
      twoFactorEnabled: user.twoFactorEnabled || false,
      requiresTwoFactor: false,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
    },
    secret,
    maxAge: 30 * 24 * 60 * 60,
  });

  // Determine cookie name and domain for the current hostname
  const isProduction = process.env.NODE_ENV === "production";
  const cookieName = isProduction
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

  // Set cookie domain to share across subdomains of the current apex
  let cookieDomain: string | undefined;
  if (hostname.endsWith(".chatrealty.io") || hostname === "chatrealty.io") {
    cookieDomain = ".chatrealty.io";
  } else if (hostname.endsWith(".jpsrealtor.com") || hostname === "jpsrealtor.com") {
    cookieDomain = ".jpsrealtor.com";
  } else if (hostname.endsWith(".josephsardella.com") || hostname === "josephsardella.com") {
    cookieDomain = ".josephsardella.com";
  } else if (hostname.endsWith(".localhost") || hostname === "localhost") {
    cookieDomain = ".localhost";
  }

  console.log("[Auth Receive] Setting session cookie:", { cookieName, cookieDomain });

  // Build the redirect response and set the session cookie
  const response = NextResponse.redirect(absoluteRedirectUrl);

  response.cookies.set(cookieName, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isProduction,
    maxAge: 30 * 24 * 60 * 60,
    ...(cookieDomain && { domain: cookieDomain }),
  });

  console.log("[Auth Receive] Redirecting to:", absoluteRedirectUrl);

  return response;
}
