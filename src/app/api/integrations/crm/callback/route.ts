// src/app/api/integrations/crm/callback/route.ts
//
// HighLevel OAuth redirect target (registered on the marketplace app for
// www.chatrealty.io and localhost:3000). Exchanges the code and saves the
// connection on the signed-in agent, then returns to Settings → Integrations.

import { NextRequest, NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { completeConnection } from "@/lib/highlevel";
import { queueFullHighLevelSync, runHighLevelSync } from "@/lib/highlevel-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function back(request: NextRequest, result: string) {
  const res = NextResponse.redirect(
    new URL(`/agent/settings?section=integrations&highlevel=${encodeURIComponent(result)}`, request.url)
  );
  res.cookies.set("hl_oauth_state", "", { path: "/api/integrations/crm", maxAge: 0 });
  return res;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState = request.cookies.get("hl_oauth_state")?.value;

  if (searchParams.get("error")) return back(request, "denied");
  if (!code) return back(request, "no_code");

  // The nonce cookie proves this browser started the flow from our connect
  // route. If HighLevel echoes state, it must match too.
  if (!cookieState || (state && state !== cookieState)) {
    return back(request, "state_mismatch");
  }

  try {
    await completeConnection(session.user.id, code);
    // Start the contact feed: copy the agent's whole book, beginning now
    // (the 5-minute cron carries on from wherever this first chunk stops).
    const userId = session.user.id;
    await queueFullHighLevelSync(userId);
    after(() => runHighLevelSync(userId, 240_000));
    return back(request, "connected");
  } catch (err: any) {
    console.error("[highlevel callback] failed:", err?.message || err);
    return back(request, "failed");
  }
}
