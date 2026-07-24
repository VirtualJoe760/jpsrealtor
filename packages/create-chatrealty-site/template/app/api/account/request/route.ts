// Ask ChatRealty to email a magic sign-in link. Degrades to { available:false }
// in test-data / free mode so the client falls back to guest favorites.
import { NextRequest, NextResponse } from "next/server";
import { requestMagicLink } from "@/lib/end-user";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400, headers: NO_STORE });
  }
  const result = await requestMagicLink(email);
  return NextResponse.json(result, { headers: NO_STORE });
}
