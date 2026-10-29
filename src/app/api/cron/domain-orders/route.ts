// src/app/api/cron/domain-orders/route.ts
// Backstop for paid domain orders (src/lib/domains/fulfill.ts).
//
// The webhook buys the domain and polls Vercel's async order for ~8 s; the
// agent's settings page polls too. If both stop watching (agent closed the
// tab, slow registrar), this job finishes the order — attach + point, or
// refund — so a PAID order can never sit unfinished. It also re-runs a
// checkout whose webhook died between payment and the buy.
//
// Auth: same as the other crons — Vercel sends `Authorization: Bearer
// ${CRON_SECRET}`; INTERNAL_API_SECRET works for manual runs.

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/mongoose";
import DomainOrder from "@/models/DomainOrder";
import { advanceDomainOrder, startDomainOrder } from "@/lib/domains/fulfill";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(req: NextRequest): boolean {
  const cron = process.env.CRON_SECRET;
  const internal = process.env.INTERNAL_API_SECRET;
  if (cron && req.headers.get("authorization") === `Bearer ${cron}`) return true;
  if (internal && req.headers.get("x-internal-secret") === internal) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();

  const minuteAgo = new Date(Date.now() - 60_000);
  const results: { domain: string; before: string; after: string }[] = [];

  // Bought, waiting on the registrar.
  for (const order of await DomainOrder.find({ status: "purchasing", updatedAt: { $lt: minuteAgo } }).limit(25)) {
    const after = await advanceDomainOrder(order);
    results.push({ domain: order.domain, before: "purchasing", after: after.status });
  }

  // Paid, but the buy never started (webhook crashed after recording payment).
  const stale = await DomainOrder.find({ status: "paid", vercelOrderId: { $exists: false }, updatedAt: { $lt: minuteAgo } }).limit(10);
  if (stale.length) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-12-15.clover" });
    for (const order of stale) {
      try {
        const checkout = await stripe.checkout.sessions.retrieve(order.checkoutSessionId);
        const after = await startDomainOrder(checkout, checkout.livemode);
        results.push({ domain: order.domain, before: "paid", after: after?.status || "paid" });
      } catch (error) {
        console.error(`[cron/domain-orders] resume ${order.domain} failed:`, (error as Error).message);
      }
    }
  }

  return NextResponse.json({ checked: results.length, results });
}
