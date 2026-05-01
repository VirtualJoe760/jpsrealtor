// src/app/api/auth/transfer/route.ts
// Cross-domain session transfer — step 1 of 2.
//
// When a user is logged in on domain A and needs to access domain B,
// this endpoint generates a short-lived signed token and redirects
// to domain B's /api/auth/receive endpoint.
//
// Usage:
//   GET /api/auth/transfer?target=https://chatrealty.io/some/page
//
// Flow:
//   1. User on jpsrealtor.com clicks link to chatrealty.io
//   2. Link goes through /api/auth/transfer?target=https://chatrealty.io/path
//   3. This endpoint reads the session, signs a transfer token (30s expiry)
//   4. Redirects to https://chatrealty.io/api/auth/receive?token=xxx&redirect=/path
//   5. The receive endpoint validates the token and sets the session cookie

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { encode } from "next-auth/jwt";

// Domains that are part of our platform (allowed transfer targets)
const ALLOWED_DOMAINS = new Set([
  "localhost",
  "chatrealty.io",
  "jpsrealtor.com",
  "josephsardella.com",
]);

function isAllowedTarget(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");
    // Allow exact matches or subdomains of allowed domains
    return Array.from(ALLOWED_DOMAINS).some(
      (d) => hostname === d || hostname.endsWith(`.${d}`)
    );
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("target");

  if (!target) {
    return NextResponse.json({ error: "target parameter is required" }, { status: 400 });
  }

  if (!isAllowedTarget(target)) {
    return NextResponse.json({ error: "Target domain not allowed" }, { status: 403 });
  }

  // Check if user has a session
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    // Not logged in — just redirect to target without auth
    return NextResponse.redirect(target);
  }

  // Generate a short-lived transfer token using NextAuth's JWT encoder
  // This token contains the session data and expires in 30 seconds
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const transferToken = await encode({
    token: {
      email: session.user.email,
      name: session.user.name,
      picture: session.user.image,
      // Required by JWT type augmentation
      id: "",
      roles: [],
      isAdmin: false,
      // Mark this as a transfer token with short expiry
      transferAuth: true,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 30, // 30 second expiry
    },
    secret,
    maxAge: 30,
  });

  // Build the receive URL on the target domain
  const targetUrl = new URL(target);
  const receiveUrl = new URL("/api/auth/receive", targetUrl.origin);
  receiveUrl.searchParams.set("token", transferToken);
  receiveUrl.searchParams.set("redirect", targetUrl.pathname + targetUrl.search + targetUrl.hash);

  return NextResponse.redirect(receiveUrl.toString());
}
