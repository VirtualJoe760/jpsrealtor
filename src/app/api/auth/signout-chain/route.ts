// src/app/api/auth/signout-chain/route.ts
// One link in the multi-domain signout chain.
//
// Clears the NextAuth session cookie on the current apex (both the host-only
// variant set by default signin AND the .{apex}-scoped variant set by
// /api/auth/receive), then 302-redirects to ?next=<absolute_url> so the next
// apex in the chain can do the same. The final hop lands on /auth/signed-out.

import { NextRequest, NextResponse } from "next/server";

// Apexes the chain is allowed to bounce between. Same set as in
// src/lib/signout-chain.ts plus the auth transfer endpoint's ALLOWED_DOMAINS.
const ALLOWED_APEXES = [
  "chatrealty.io",
  "jpsrealtor.com",
  "josephsardella.com",
  "localhost",
];

function getApex(host: string): string | null {
  const bare = host.split(":")[0].toLowerCase();
  for (const apex of ALLOWED_APEXES) {
    if (bare === apex || bare.endsWith(`.${apex}`)) return apex;
  }
  return null;
}

function isAllowedNext(url: string): boolean {
  try {
    const parsed = new URL(url);
    return getApex(parsed.hostname) !== null;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const apex = getApex(host);
  const isProd = process.env.NODE_ENV === "production";
  const cookieName = isProd
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

  // Default landing if no valid `next` is supplied.
  const fallbackNext = isProd
    ? "https://jpsrealtor.com/auth/signed-out"
    : `http://${host}/auth/signed-out`;
  const nextParam = request.nextUrl.searchParams.get("next");
  const redirectTo =
    nextParam && isAllowedNext(nextParam) ? nextParam : fallbackNext;

  const response = NextResponse.redirect(redirectTo);

  // Clear the host-only cookie variant (set by default credential/oauth signin
  // where cookies.sessionToken.options.domain is undefined).
  response.cookies.set(cookieName, "", {
    maxAge: 0,
    path: "/",
    secure: isProd,
    httpOnly: true,
    sameSite: "lax",
  });

  // Clear the .{apex}-scoped variant (set by /api/auth/receive when the user
  // arrived via the cross-domain transfer flow). Two Set-Cookie headers ship
  // because the browser treats same-name cookies with different Domain
  // attributes as distinct entries.
  if (apex && apex !== "localhost") {
    response.cookies.set(cookieName, "", {
      maxAge: 0,
      path: "/",
      secure: isProd,
      httpOnly: true,
      sameSite: "lax",
      domain: `.${apex}`,
    });
  }

  // No-store so intermediaries don't accidentally serve a cached version
  // that lacks the clear-cookie headers.
  response.headers.set("Cache-Control", "no-store, max-age=0");

  return response;
}
