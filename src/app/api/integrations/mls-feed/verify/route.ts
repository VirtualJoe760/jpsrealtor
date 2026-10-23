// src/app/api/integrations/mls-feed/verify/route.ts
//
// POST → re-tests the STORED MLS key server-side (decrypt → one request to the
// agent's MLS) and records the result. The key never comes back to the browser;
// only ok/reason and the refreshed status do.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyStoredMlsFeed } from "@/lib/mls-feed";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }
  const { result, status } = await verifyStoredMlsFeed(session.user.id);
  return NextResponse.json({ ...result, ...status }, { headers: NO_STORE });
}
