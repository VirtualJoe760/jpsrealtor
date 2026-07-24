// Ask ChatRealty to email a magic sign-in link. Degrades to { available:false }
// in test-data / free mode so the client falls back to guest favorites.
import { NextRequest, NextResponse } from "next/server";
import { requestMagicLink } from "@/lib/end-user";
import { getAgentProfile } from "@/lib/chatrealty";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400, headers: NO_STORE });
  }
  // The magic link points back to THIS site. Derive our own origin from the
  // request; the platform validates it (https, or http for localhost).
  const proto = req.headers.get("x-forwarded-proto") || (req.nextUrl.protocol.replace(":", ""));
  const host = req.headers.get("host") || req.nextUrl.host;
  const origin = `${proto}://${host}`;
  const agent = await getAgentProfile().catch(() => null);
  const siteName = agent?.name || host;

  const result = await requestMagicLink(email, origin, siteName);
  return NextResponse.json(result, { headers: NO_STORE });
}
