// src/app/api/admin/affiliates/[id]/route.ts
// Admin: one affiliate's full commission ledger and payout history.

import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import dbConnect from "@/lib/mongoose";
import Affiliate from "@/models/Affiliate";
import AffiliateCommission from "@/models/AffiliateCommission";
import AffiliatePayout from "@/models/AffiliatePayout";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { authorized } = await verifyAdmin();
  if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await dbConnect();
  const affiliate = await Affiliate.findById(id).lean().catch(() => null);
  if (!affiliate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [ledger, payouts] = await Promise.all([
    AffiliateCommission.find({ affiliateId: id }).sort({ createdAt: -1 }).limit(500).populate("agentId", "name email").lean<any[]>(),
    AffiliatePayout.find({ affiliateId: id }).sort({ createdAt: -1 }).lean<any[]>(),
  ]);

  return NextResponse.json({
    ledger: ledger.map((c) => ({
      id: String(c._id),
      kind: c.kind,
      status: c.status,
      amount: c.amount,
      ratePerAgent: c.ratePerAgent,
      payingAgentsAtInvoice: c.payingAgentsAtInvoice,
      rateOverridden: c.rateOverridden,
      agent: c.agentId ? { name: c.agentId.name, email: c.agentId.email } : null,
      stripeInvoiceId: c.stripeInvoiceId,
      livemode: c.livemode,
      earnedAt: c.earnedAt,
      payableAt: c.payableAt,
      paidAt: c.paidAt,
      reversalReason: c.reversalReason,
    })),
    payouts: payouts.map((p) => ({
      id: String(p._id),
      amount: p.amount,
      status: p.status,
      periodLabel: p.periodLabel,
      stripeTransferId: p.stripeTransferId,
      livemode: p.livemode,
      error: p.error,
      createdAt: p.createdAt,
    })),
  });
}
