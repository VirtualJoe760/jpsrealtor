// src/app/api/agent/verify-identity/route.ts
// Initiate Stripe Identity verification (Phase 2)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { createIdentityVerificationSession } from "@/lib/stripe-identity";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await dbConnect();

    // Get user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user has an application
    if (!user.agentApplication) {
      return NextResponse.json(
        { error: "No application found. Please submit an application first." },
        { status: 400 }
      );
    }

    // Check if application is in the correct phase
    if (user.agentApplication.phase !== "inquiry_approved") {
      return NextResponse.json(
        {
          error: "Application is not ready for verification",
          currentPhase: user.agentApplication.phase,
        },
        { status: 400 }
      );
    }

    // Check if already verified
    if (user.agentApplication.identityVerified) {
      return NextResponse.json(
        { error: "Identity already verified" },
        { status: 400 }
      );
    }

    // Create Stripe Identity verification session
    const verificationSession = await createIdentityVerificationSession(
      user._id.toString(),
      user.email
    );

    // Update user application with session info
    user.agentApplication.phase = "verification_pending";
    user.agentApplication.stripeIdentitySessionId = verificationSession.id;
    user.agentApplication.identityStatus = "pending";

    await user.save();

    return NextResponse.json({
      success: true,
      clientSecret: verificationSession.client_secret,
      sessionId: verificationSession.id,
      url: verificationSession.url,
    });
  } catch (error: any) {
    console.error("Identity verification error:", error);
    return NextResponse.json(
      { error: "Failed to create verification session", details: error.message },
      { status: 500 }
    );
  }
}
