// Who's signed in? Reads the httpOnly session cookie server-side.
// { available:false } → accounts aren't enabled here (guest mode).
import { NextRequest, NextResponse } from "next/server";
import { getMe, SESSION_COOKIE } from "@/lib/end-user";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const session = req.cookies.get(SESSION_COOKIE)?.value;
  const result = await getMe(session);
  return NextResponse.json(result, { headers: NO_STORE });
}
