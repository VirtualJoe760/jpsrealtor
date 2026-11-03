// src/app/api/admin/affiliates/route.ts
// Admin: affiliate list + moderation.
//   GET — every affiliate with paying-agent count, rate and balances.
//   PUT { affiliateId, action, reason?, rateOverride?, adminNotes? }
//       action: approve | reject | pause | resume | terminate | setRate | notes
// Approval assigns the share code and sends the approval email.

import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import dbConnect from "@/lib/mongoose";
import Affiliate from "@/models/Affiliate";
import AffiliateCommission from "@/models/AffiliateCommission";
import { countPayingAgents, generateUniqueCode } from "@/lib/affiliates";
import { affiliateLink, rateForCount } from "@/config/affiliates";
import { sendAffiliateApprovalEmail, sendAffiliateRejectionEmail } from "@/lib/email-resend";
import { requireStripeMode } from "@/lib/stripe-mode";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET() {
  const { authorized } = await verifyAdmin();
  if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await dbConnect();

  let livemode = false;
  try { livemode = requireStripeMode() === "live"; } catch { /* unconfigured → test */ }

  const affiliates = await Affiliate.find().sort({ appliedAt: -1 }).lean<any[]>();
  const sums = await AffiliateCommission.aggregate([
    { $match: { livemode } },
    { $group: { _id: { a: "$affiliateId", s: "$status" }, total: { $sum: "$amount" } } },
  ]);
  const bal: Record<string, Record<string, number>> = {};
  for (const s of sums) {
    const k = String(s._id.a);
    (bal[k] ||= {})[s._id.s] = Math.round(s.total * 100) / 100;
  }

  const rows = await Promise.all(
    affiliates.map(async (a) => {
      const paying = await countPayingAgents(a.userId);
      const signups = await User.countDocuments({ "affiliateReferral.affiliateId": a._id });
      return {
        _id: String(a._id),
        name: a.name,
        email: a.email,
        status: a.status,
        code: a.code || null,
        link: a.code ? affiliateLink(a.code) : null,
        website: a.website,
        audience: a.audience,
        promotionPlan: a.promotionPlan,
        isSettlementServiceProvider: !!a.isSettlementServiceProvider,
        appliedAt: a.appliedAt,
        approvedAt: a.approvedAt,
        rejectionReason: a.rejectionReason,
        adminNotes: a.adminNotes,
        rateOverride: a.rateOverride ?? null,
        clicks: a.clicks || 0,
        signups,
        payingAgents: paying,
        currentRate: rateForCount(paying, a.rateOverride),
        payoutsEnabled: !!a.payoutsEnabled,
        balances: bal[String(a._id)] || {},
      };
    })
  );
  return NextResponse.json({ affiliates: rows, livemode });
}

export async function PUT(request: NextRequest) {
  const { authorized, email: adminEmail } = await verifyAdmin();
  if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await dbConnect();

  const body = await request.json().catch(() => ({}));
  const { affiliateId, action, reason } = body as { affiliateId?: string; action?: string; reason?: string };
  const affiliate = affiliateId ? await Affiliate.findById(affiliateId).catch(() => null) : null;
  if (!affiliate) return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });

  const now = new Date();
  switch (action) {
    case "approve": {
      if (!affiliate.code) affiliate.code = await generateUniqueCode(affiliate.name, body.code);
      affiliate.status = "approved";
      affiliate.approvedAt = now;
      affiliate.approvedBy = adminEmail || "admin";
      affiliate.rejectionReason = undefined;
      await affiliate.save();
      sendAffiliateApprovalEmail(affiliate.email, affiliate.name, affiliate.code!, affiliateLink(affiliate.code!)).catch(() => {});
      return NextResponse.json({ success: true, code: affiliate.code, message: "Approved — approval email sent." });
    }
    case "reject": {
      affiliate.status = "rejected";
      affiliate.rejectionReason = (reason || "").slice(0, 500) || undefined;
      await affiliate.save();
      sendAffiliateRejectionEmail(affiliate.email, affiliate.name, affiliate.rejectionReason).catch(() => {});
      return NextResponse.json({ success: true, message: "Rejected — email sent." });
    }
    case "pause":
      affiliate.status = "paused";
      affiliate.pausedAt = now;
      await affiliate.save();
      return NextResponse.json({ success: true, message: "Paused — commissions still accrue, payouts held." });
    case "resume":
      if (!affiliate.code) return NextResponse.json({ error: "Approve first" }, { status: 400 });
      affiliate.status = "approved";
      await affiliate.save();
      return NextResponse.json({ success: true, message: "Resumed." });
    case "terminate":
      affiliate.status = "terminated";
      affiliate.terminatedAt = now;
      await affiliate.save();
      return NextResponse.json({ success: true, message: "Terminated — no new commissions, no payouts." });
    case "setRate": {
      const v = body.rateOverride;
      if (v === null || v === "" || v === undefined) affiliate.rateOverride = null;
      else if (typeof v === "number" && v >= 0 && v <= 125) affiliate.rateOverride = v;
      else return NextResponse.json({ error: "rateOverride must be 0–125 dollars, or null" }, { status: 400 });
      await affiliate.save();
      return NextResponse.json({ success: true, message: "Rate updated (applies to future invoices)." });
    }
    case "notes":
      affiliate.adminNotes = typeof body.adminNotes === "string" ? body.adminNotes.slice(0, 2000) : undefined;
      await affiliate.save();
      return NextResponse.json({ success: true });
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
