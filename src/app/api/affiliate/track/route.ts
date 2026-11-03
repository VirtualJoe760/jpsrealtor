// src/app/api/affiliate/track/route.ts
// POST { code } — called by AffiliateRefCapture when a page loads with ?ref=CODE.
// Counts the click and sets the first-party cr_aff cookie for the attribution
// window. Public (visitors have no session) — listed in PUBLIC_API_EXACT in
// src/proxy.ts. Unknown, rejected or paused codes are ignored silently.

import { NextRequest, NextResponse } from "next/server";
import { recordClick } from "@/lib/affiliates";
import { AFFILIATE_COOKIE, ATTRIBUTION_WINDOW_DAYS } from "@/config/affiliates";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request) || "unknown";
    const limited = checkRateLimit(`aff-track:${ip}`, { max: 30, windowMs: 60 * 60 * 1000 });
    if (!limited.ok) return NextResponse.json({ ok: true });

    const body = await request.json().catch(() => ({}));
    const current = request.cookies.get(AFFILIATE_COOKIE)?.value;
    const code = await recordClick(body?.code, current);

    const res = NextResponse.json({ ok: true });
    if (code) {
      res.cookies.set(AFFILIATE_COOKIE, code, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60,
      });
    }
    return res;
  } catch (err) {
    console.error("[affiliate/track]", (err as Error).message);
    return NextResponse.json({ ok: true }); // never break the page for tracking
  }
}
