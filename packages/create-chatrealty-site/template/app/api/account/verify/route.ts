// Consume a magic-link token → set the httpOnly session cookie. The platform
// session token never reaches client JS.
import { NextRequest, NextResponse } from "next/server";
import { verifyMagicLink, SESSION_COOKIE } from "@/lib/end-user";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = typeof body?.token === "string" ? body.token : "";
  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400, headers: NO_STORE });
  }
  const result = await verifyMagicLink(token);
  const res = NextResponse.json(
    { available: result.available, ok: "ok" in result ? result.ok : false },
    { headers: NO_STORE }
  );
  if ("session" in result && result.session) {
    res.cookies.set(SESSION_COOKIE, result.session, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }
  return res;
}
