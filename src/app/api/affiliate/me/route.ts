// src/app/api/affiliate/me/route.ts
// GET — the signed-in user's affiliate record + dashboard numbers
// (link, clicks, signups, paying agents, earned / pending / payable / paid).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import Affiliate from "@/models/Affiliate";
import { getAffiliateSummary, refreshConnectStatus } from "@/lib/affiliates";
import {
  affiliateLink,
  AFFILIATE_TIERS,
  PAYOUT_MINIMUM_USD,
  REFUND_HOLD_DAYS,
  PAYOUT_DAY_OF_MONTH,
  ATTRIBUTION_WINDOW_DAYS,
} from "@/config/affiliates";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await dbConnect();
    const user = await User.findOne({ email: session.user.email }).select("_id name");
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const program = {
      tiers: AFFILIATE_TIERS,
      payoutMinimum: PAYOUT_MINIMUM_USD,
      refundHoldDays: REFUND_HOLD_DAYS,
      payoutDay: PAYOUT_DAY_OF_MONTH,
      attributionDays: ATTRIBUTION_WINDOW_DAYS,
    };

    const affiliate = await Affiliate.findOne({ userId: user._id });
    if (!affiliate) return NextResponse.json({ affiliate: null, program, defaultName: user.name || "" });

    if (affiliate.stripeConnectAccountId) await refreshConnectStatus(affiliate);

    const base = {
      status: affiliate.status,
      name: affiliate.name,
      code: affiliate.code || null,
      link: affiliate.code ? affiliateLink(affiliate.code) : null,
      appliedAt: affiliate.appliedAt,
      rejectionReason: affiliate.status === "rejected" ? affiliate.rejectionReason : undefined,
      payouts: {
        connected: !!affiliate.stripeConnectAccountId,
        detailsSubmitted: !!affiliate.connectDetailsSubmitted,
        enabled: !!affiliate.payoutsEnabled,
      },
    };
    const live = ["approved", "paused", "terminated"].includes(affiliate.status);
    return NextResponse.json({
      affiliate: base,
      program,
      summary: live ? await getAffiliateSummary(affiliate) : null,
    });
  } catch (err) {
    console.error("[affiliate/me]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
