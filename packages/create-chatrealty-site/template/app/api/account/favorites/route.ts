// Server-synced favorites for a signed-in end-user. Per-user data → no-store,
// never edge-cached. Guest visitors don't hit this (they use localStorage).
import { NextRequest, NextResponse } from "next/server";
import { getFavorites, putFavorites, SESSION_COOKIE } from "@/lib/end-user";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const session = req.cookies.get(SESSION_COOKIE)?.value;
  const keys = await getFavorites(session);
  if (keys === null) return NextResponse.json({ available: false }, { headers: NO_STORE });
  return NextResponse.json({ available: true, keys }, { headers: NO_STORE });
}

export async function PUT(req: NextRequest) {
  const session = req.cookies.get(SESSION_COOKIE)?.value;
  const body = await req.json().catch(() => ({}));
  const keys = Array.isArray(body?.keys)
    ? body.keys.filter((k: unknown) => typeof k === "string").slice(0, 1000)
    : [];
  const ok = await putFavorites(session, keys);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400, headers: NO_STORE });
}
