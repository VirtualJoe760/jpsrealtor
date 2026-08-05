// Who's signed in? Reads the httpOnly session cookie server-side.
// { available:false } → accounts aren't enabled here (guest mode).
//
// `oauthPending: true` means the visitor has a Google/Facebook session but no
// ChatRealty end-user session yet — i.e. they just came back from the OAuth
// redirect and the client should call /api/account/oauth-bridge. The client
// used to call the bridge on EVERY page load and eat the rejection, which put a
// console error in front of every visitor on every route. Now it only calls it
// when there is actually something to bridge.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMe, SESSION_COOKIE } from "@/lib/end-user";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const session = req.cookies.get(SESSION_COOKIE)?.value;
  const result = await getMe(session);

  // Only worth asking when accounts work and nobody is signed in here yet.
  let oauthPending = false;
  if ((result as any).available !== false && !(result as any).user) {
    const oauth = await auth().catch(() => null);
    oauthPending = !!oauth?.user?.email;
  }

  return NextResponse.json({ ...result, oauthPending }, { headers: NO_STORE });
}
