// src/app/api/admin/site-setups/route.ts
// Admin queue of paid $300 custom-site setups (P5 step 5.4).
//   GET — every paid order with agent + intake
//   PUT { orderId, status?, liveUrl?, adminNotes? } — moving to "live"
//       requires a liveUrl and sends the "your site is live" email once.

import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import dbConnect from "@/lib/mongoose";
import SiteSetupOrder from "@/models/SiteSetupOrder";
import User from "@/models/User";
import { serializeOrder } from "@/lib/site-setup";
import { sendSiteSetupLiveEmail } from "@/lib/site-setup-emails";
import { SITE_SETUP_ADMIN_STATUSES, type SiteSetupStatus } from "@/config/site-setup";

export const dynamic = "force-dynamic";

export async function GET() {
  const { authorized } = await verifyAdmin();
  if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await dbConnect();
  const orders = await SiteSetupOrder.find({ status: { $ne: "awaiting_payment" } })
    .sort({ paidAt: -1 })
    .populate("agentId", "name email agentProfile.subdomain")
    .lean<any[]>();
  return NextResponse.json({
    statuses: SITE_SETUP_ADMIN_STATUSES,
    orders: orders.map((o) => ({
      ...serializeOrder(o),
      agent: o.agentId ? { id: String(o.agentId._id), name: o.agentId.name, email: o.agentId.email, subdomain: o.agentId.agentProfile?.subdomain } : null,
      adminNotes: o.adminNotes || "",
      liveEmailSentAt: o.liveEmailSentAt,
      history: o.history || [],
    })),
  });
}

export async function PUT(request: NextRequest) {
  const { authorized, email: adminEmail } = await verifyAdmin();
  if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await dbConnect();

  const body = await request.json().catch(() => ({}));
  const order = body.orderId ? await SiteSetupOrder.findById(body.orderId).catch(() => null) : null;
  if (!order || order.status === "awaiting_payment") return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (typeof body.adminNotes === "string") order.adminNotes = body.adminNotes.slice(0, 5000);
  if (typeof body.liveUrl === "string") order.liveUrl = body.liveUrl.trim().slice(0, 300) || undefined;

  const next = body.status as SiteSetupStatus | undefined;
  let sendLive = false;
  if (next && next !== order.status) {
    if (!SITE_SETUP_ADMIN_STATUSES.includes(next)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    if (order.status === "refunded") return NextResponse.json({ error: "Order was refunded" }, { status: 409 });
    if (next === "live") {
      if (!order.liveUrl) return NextResponse.json({ error: "Set the live URL first." }, { status: 400 });
      order.liveAt = new Date();
      sendLive = !order.liveEmailSentAt;
    }
    order.status = next;
    order.history.push({ status: next, at: new Date(), by: adminEmail || "admin" });
  }
  await order.save();

  if (sendLive) {
    const agent = await User.findById(order.agentId).select("name email").lean<any>();
    if (agent?.email) {
      const sent = await sendSiteSetupLiveEmail(agent.email, agent.name || "", order.liveUrl!);
      if (sent) {
        order.liveEmailSentAt = new Date();
        await order.save();
      }
    }
  }
  return NextResponse.json({ success: true, liveEmailSent: sendLive && !!order.liveEmailSentAt, order: serializeOrder(order) });
}
