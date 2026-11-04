// src/app/api/integrations/crm/connect/route.ts
//
// GET → starts HighLevel OAuth. Sets a short-lived httpOnly nonce cookie and
// sends the agent to HighLevel's sub-account picker. The callback refuses to
// save tokens unless that cookie comes back, so a link someone else crafted
// can't attach THEIR HighLevel to this agent's account (login CSRF).

import { NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildAuthorizeUrl, highLevelConfigured } from "@/lib/highlevel";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }
  if (!highLevelConfigured()) {
    return NextResponse.redirect(
      new URL("/agent/settings?section=integrations&highlevel=not_configured", request.url)
    );
  }

  const nonce = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(buildAuthorizeUrl(nonce));
  res.cookies.set("hl_oauth_state", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // must survive the top-level redirect back from HighLevel
    path: "/api/integrations/crm",
    maxAge: 600,
  });
  return res;
}
