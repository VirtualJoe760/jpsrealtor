// src/app/api/stripe/portal/route.ts
// POST — Create a Stripe Customer Portal session for billing management

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import AgentSubscription from "@/models/AgentSubscription";
import { createCustomerPortalSession } from "@/lib/stripe-subscription";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find subscription with Stripe customer
    const sub = await AgentSubscription.findOne({
      agentId: user._id,
      stripeCustomerId: { $exists: true, $ne: null },
    });

    if (!sub?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing account found. Subscribe to a plan first." },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const returnUrl =
      (body as { returnUrl?: string }).returnUrl ||
      `${process.env.NEXTAUTH_URL || "https://chatrealty.io"}/dashboard/billing`;

    const portalSession = await createCustomerPortalSession(
      sub.stripeCustomerId,
      returnUrl
    );

    return NextResponse.json({ url: portalSession.url });
  } catch (error: unknown) {
    console.error("[stripe/portal] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
