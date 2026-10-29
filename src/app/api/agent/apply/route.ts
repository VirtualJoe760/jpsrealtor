// src/app/api/agent/apply/route.ts
// Agent product signup: license number/state + MLS association (+ the
// association's contact details) + brokerage. Since 2026-10-28 the next step
// is PAYING for Basic (phase awaiting_payment); payment makes them an agent
// and the admin confirms them before their site goes live. See
// src/lib/agent-onboarding.ts.
// See docs/agent-onboarding/README.md.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import Team from "@/models/Team";
import { sendAgentApplicationEmail } from "@/lib/email-agent-application";
import { parseMlsMembership, mlsMembershipSet } from "@/lib/mls-membership";

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

    // One application per user — except an applicant who hasn't paid yet may
    // resubmit (fix a typo) and continue to checkout.
    const resubmitting = user.agentApplication?.phase === "awaiting_payment";
    if (user.agentApplication?.phase && !resubmitting) {
      return NextResponse.json(
        { error: "You already have an application in progress" },
        { status: 400 }
      );
    }

    // Parse request body. Dropped legacy fields (resume, cover letter,
    // whyJoin, references, yearsExperience, brokerageAddress) are ignored
    // if an old client still sends them.
    const body = await request.json();
    const {
      licenseNumber,
      licenseState,
      mlsId, // Optional MLS agent ID
      mlsAssociation,
      brokerageName,
      preferredTeam, // Optional Team ID (legacy plumbing; the form no longer sends it)
    } = body;

    // Validate required fields
    if (!licenseNumber || !licenseState || !mlsAssociation || !brokerageName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // MLS association + its contact details (we call associations about IDX
    // data access). Same rules as the dashboard/Settings form.
    const mls = parseMlsMembership({
      associationName: mlsAssociation,
      mlsId,
      contactName: body.mlsContactName,
      contactPhone: body.mlsContactPhone,
      contactEmail: body.mlsContactEmail,
      website: body.mlsWebsite,
    });
    if (mls.error || !mls.value) {
      return NextResponse.json({ error: mls.error }, { status: 400 });
    }

    // Validate preferredTeam if provided
    if (preferredTeam) {
      const team = await Team.findById(preferredTeam);
      if (!team) {
        return NextResponse.json(
          { error: "Invalid team selection" },
          { status: 400 }
        );
      }
    }

    // Create agent application → next step is payment (Stripe Checkout).
    user.agentApplication = {
      phase: "awaiting_payment",
      submittedAt: new Date(),
      licenseNumber,
      licenseState,
      mlsId: mlsId || undefined,
      mlsAssociation,
      brokerageName,
      preferredTeam: preferredTeam || undefined,
      identityVerified: false,
    };

    await user.save();
    await User.updateOne({ _id: user._id }, { $set: mlsMembershipSet(mls.value) });

    if (resubmitting) {
      return NextResponse.json({ success: true, phase: "awaiting_payment", applicationId: user._id.toString() });
    }

    // Notify admin + confirm receipt to the applicant
    try {
      await sendAgentApplicationEmail({
        applicantName: user.name || user.email,
        applicantEmail: user.email,
        applicationId: user._id.toString(),
        details: {
          licenseNumber,
          licenseState,
          mlsAssociation,
          mlsId: mlsId || undefined,
          brokerageName,
        },
      });
    } catch (emailError) {
      console.error("Failed to send application email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully",
      applicationId: user._id.toString(),
      phase: "awaiting_payment",
    });
  } catch (error: any) {
    console.error("Agent application error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
