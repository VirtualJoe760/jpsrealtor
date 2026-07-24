// Which social providers are configured — drives the sign-in dialog buttons.
// Safe to expose: booleans only, no keys.
import { NextResponse } from "next/server";
import { authProviders } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(authProviders, { headers: { "Cache-Control": "no-store" } });
}
