// src/app/api/affiliate/apply/route.ts
// POST — apply to the affiliate program (partners section, next to service
// partners). Anyone with an account can apply; Joseph approves every one by
// hand in /admin/affiliates (no auto-approve, unlike service partners).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import Affiliate from "@/models/Affiliate";
import { AFFILIATE_TERMS_VERSION } from "@/config/affiliates";
import {
  sendAffiliateApplicationReceivedEmail,
  sendAffiliateApplicationAdminNotification,
} from "@/lib/email-resend";

export const dynamic = "force-dynamic";

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const user = await User.findOne({ email: session.user.email }).select("_id name email");
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const existing = await Affiliate.findOne({ userId: user._id });
    if (existing && existing.status !== "rejected") {
      return NextResponse.json({ error: `You already have an affiliate application (${existing.status}).` }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));
    const name = clip(body.name, 120) || user.name || "";
    const website = clip(body.website, 300);
    const audience = clip(body.audience, 1000);
    const promotionPlan = clip(body.promotionPlan, 2000);
    if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    if (!promotionPlan) return NextResponse.json({ error: "Tell us how you'll promote ChatRealty." }, { status: 400 });
    if (body.agreeTerms !== true) return NextResponse.json({ error: "You must accept the affiliate terms." }, { status: 400 });
    if (body.ftcDisclosure !== true) {
      return NextResponse.json({ error: "You must agree to disclose that you're paid when you share your link." }, { status: 400 });
    }

    const fields = {
      userId: user._id,
      status: "pending" as const,
      name,
      email: user.email,
      website: website || undefined,
      audience: audience || undefined,
      promotionPlan,
      isSettlementServiceProvider: body.isSettlementServiceProvider === true,
      termsVersion: AFFILIATE_TERMS_VERSION,
      termsAcceptedAt: new Date(),
      ftcDisclosureAcknowledged: true,
      appliedAt: new Date(),
    };
    const affiliate = existing
      ? await Affiliate.findByIdAndUpdate(existing._id, { $set: fields, $unset: { rejectionReason: 1 } }, { new: true })
      : await Affiliate.create(fields);

    sendAffiliateApplicationReceivedEmail(user.email, name).catch(() => {});
    sendAffiliateApplicationAdminNotification({
      name,
      email: user.email,
      website,
      audience,
      promotionPlan,
      isSettlementServiceProvider: fields.isSettlementServiceProvider,
    }).catch(() => {});

    return NextResponse.json({ success: true, status: affiliate?.status }, { status: 201 });
  } catch (err) {
    console.error("[affiliate/apply]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
