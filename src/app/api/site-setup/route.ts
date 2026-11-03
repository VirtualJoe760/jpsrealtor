// src/app/api/site-setup/route.ts
// $300 custom-site setup (P5), agent side.
//   GET  — eligibility + the agent's setup orders
//   POST — start Stripe Checkout (active paid Basic subscribers only)
// Docs: docs/commerce/site-setup.md.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import SiteSetupOrder from "@/models/SiteSetupOrder";
import { checkSiteSetupEligibility, createSiteSetupCheckout, serializeOrder } from "@/lib/site-setup";
import { SITE_SETUP_PRICE_CENTS, SITE_SETUP_STYLES } from "@/config/site-setup";

export const dynamic = "force-dynamic";

async function currentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  await dbConnect();
  const user = await User.findOne({ email: session.user.email }).select("_id").lean<any>();
  return user ? String(user._id) : null;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [eligibility, orders] = await Promise.all([
    checkSiteSetupEligibility(userId),
    SiteSetupOrder.find({ agentId: userId, status: { $ne: "awaiting_payment" } }).sort({ createdAt: -1 }).lean(),
  ]);
  return NextResponse.json({
    price: SITE_SETUP_PRICE_CENTS / 100,
    styles: SITE_SETUP_STYLES,
    eligible: eligibility.eligible,
    reason: eligibility.eligible ? null : eligibility.reason,
    message: eligibility.eligible ? null : eligibility.message,
    orders: orders.map(serializeOrder),
  });
}

export async function POST(request: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const host = request.headers.get("host") || "chatrealty.io";
    const proto = host.startsWith("localhost") ? "http" : "https";
    const { url, orderId } = await createSiteSetupCheckout(userId, `${proto}://${host}`);
    return NextResponse.json({ url, orderId });
  } catch (err: any) {
    const status = err?.status || 500;
    if (status === 500) console.error("[site-setup checkout]", err);
    return NextResponse.json({ error: err?.message || "Could not start checkout" }, { status });
  }
}
