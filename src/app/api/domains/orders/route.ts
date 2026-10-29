// GET /api/domains/orders — the signed-in agent's domain purchases.
//
// Also nudges any order still "purchasing" (Vercel's buy is asynchronous), so
// the settings page shows "active" as soon as the registrar finishes, without
// waiting for the cron backstop (/api/cron/domain-orders).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import DomainOrder from "@/models/DomainOrder";
import { advanceDomainOrder } from "@/lib/domains/fulfill";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const user = await User.findOne({ email: session.user.email }).select("_id").lean<{ _id: unknown }>();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const orders = await DomainOrder.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20);
  const fresh = await Promise.all(orders.map((o) => (o.status === "purchasing" ? advanceDomainOrder(o) : o)));

  return NextResponse.json(
    {
      orders: fresh.map((o) => ({
        id: String(o._id),
        domain: o.domain,
        status: o.status,
        yearlyChargeUsd: o.yearlyChargeUsd,
        firstYearChargeUsd: o.firstYearChargeUsd,
        createdAt: o.createdAt,
        activatedAt: o.activatedAt,
        // Plain-language reason only for refunds; internal detail stays in the DB.
        message:
          o.status === "refunded"
            ? "We couldn't register this domain, so your payment was refunded."
            : o.status === "needs_attention"
            ? "Something went wrong with this order. We've been notified and will sort it out."
            : undefined,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
