// POST /api/account/oauth-bridge — converge social sign-in onto the ChatRealty
// end-user session. After NextAuth verifies the visitor with Google/Facebook,
// the client calls this once; we exchange the VERIFIED identity (server-side,
// with the site's ChatRealty token) for an end-user session and set the same
// httpOnly cookie the magic-link flow uses. Everything downstream — favorites
// sync, /api/account/me, the CRM lead loop — is identical for every sign-in
// method. Degrades to { available:false } when accounts aren't enabled.

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { upsertOAuthUser, SESSION_COOKIE } from "@/lib/end-user";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

export async function POST() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ ok: false, reason: "no_oauth_session" }, { status: 401, headers: NO_STORE });
  }

  const result = await upsertOAuthUser(email, session.user?.name ?? undefined);
  if (!("ok" in result) || !result.ok || !("session" in result)) {
    return NextResponse.json(result, { headers: NO_STORE });
  }

  const res = NextResponse.json({ available: true, ok: true }, { headers: NO_STORE });
  res.cookies.set(SESSION_COOKIE, result.session, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
