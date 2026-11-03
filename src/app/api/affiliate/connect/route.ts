// src/app/api/affiliate/connect/route.ts
// POST — start or resume Stripe Connect Express onboarding (identity, bank,
//        W-9; Stripe files the 1099-NEC). Returns the Stripe-hosted URL.
// GET  — a login link to the affiliate's Express dashboard, once onboarded.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import Affiliate from "@/models/Affiliate";
import { createConnectOnboardingLink, createConnectLoginLink } from "@/lib/affiliates";

export const dynamic = "force-dynamic";

async function currentAffiliate() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  await dbConnect();
  const user = await User.findOne({ email: session.user.email }).select("_id");
  if (!user) return null;
  return Affiliate.findOne({ userId: user._id });
}

export async function POST(request: NextRequest) {
  try {
    const affiliate = await currentAffiliate();
    if (!affiliate) return NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
    if (!["approved", "paused"].includes(affiliate.status)) {
      return NextResponse.json({ error: "Payouts open once your application is approved." }, { status: 403 });
    }
    const host = request.headers.get("host") || "chatrealty.io";
    const proto = host.startsWith("localhost") ? "http" : "https";
    const url = await createConnectOnboardingLink(affiliate, `${proto}://${host}`);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[affiliate/connect]", err);
    return NextResponse.json({ error: (err as Error).message || "Could not start payout setup" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const affiliate = await currentAffiliate();
    if (!affiliate) return NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
    const url = await createConnectLoginLink(affiliate);
    if (!url) return NextResponse.json({ error: "Finish payout setup first." }, { status: 409 });
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[affiliate/connect GET]", err);
    return NextResponse.json({ error: "Could not open Stripe dashboard" }, { status: 500 });
  }
}
