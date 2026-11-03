// src/app/api/cron/affiliate-payouts/route.ts
// Daily: promote affiliate commissions past the refund hold to "payable"; on
// PAYOUT_DAY_OF_MONTH, transfer each eligible balance (>= minimum) through
// Stripe Connect. Transfers only happen when AFFILIATE_PAYOUTS_ENABLED=true,
// so merging this cannot move money before the program launches.
//
// Auth: Vercel cron Bearer CRON_SECRET, or x-internal-secret. ?force=1 runs
// payouts off-day (still requires AFFILIATE_PAYOUTS_ENABLED).

import { NextRequest, NextResponse } from "next/server";
import { runAffiliatePayouts } from "@/lib/affiliates";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (cronSecret && req.headers.get("authorization") === `Bearer ${cronSecret}`) return true;
  if (internalSecret && req.headers.get("x-internal-secret") === internalSecret) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const force = new URL(req.url).searchParams.get("force") === "1";
    const result = await runAffiliatePayouts({ force });
    console.log("[cron/affiliate-payouts]", JSON.stringify(result));
    return NextResponse.json(result);
  } catch (err) {
    console.error("[cron/affiliate-payouts]", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
