// src/app/api/agent/apply/route.ts
// Agent application submission (Phase 1)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import Team from "@/models/Team";
import { sendAgentApplicationEmail } from "@/lib/email-agent-application";

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

    // Check if user already has an application
    if (user.agentApplication) {
      return NextResponse.json(
        { error: "You already have an application in progress" },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      licenseNumber,
      licenseState,
      mlsId,
      mlsAssociation,
      brokerageName,
      brokerageAddress,
      yearsExperience,
      preferredTeam, // Optional Team ID
      whyJoin,
      references, // Optional
      resumeUrl, // Optional
      coverLetterUrl, // Optional
    } = body;

    // Validate required fields
    if (
      !licenseNumber ||
      !licenseState ||
      !mlsId ||
      !mlsAssociation ||
      !brokerageName ||
      !brokerageAddress ||
      typeof yearsExperience !== "number" ||
      !whyJoin
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
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

    // Create agent application (Phase 1)
    user.agentApplication = {
      phase: "inquiry_pending",
      submittedAt: new Date(),
      licenseNumber,
      licenseState,
      mlsId,
      mlsAssociation,
      brokerageName,
      brokerageAddress,
      yearsExperience,
      preferredTeam: preferredTeam || undefined,
      whyJoin,
      references: references || undefined,
      resumeUrl: resumeUrl || undefined,
      coverLetterUrl: coverLetterUrl || undefined,
      identityVerified: false,
    };

    await user.save();

    // Send email notification to admins
    try {
      await sendAgentApplicationEmail({
        applicantName: user.name || user.email,
        applicantEmail: user.email,
        applicationId: user._id.toString(),
        phase: "submitted",
      });
    } catch (emailError) {
      console.error("Failed to send application email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: "Application submitted successfully",
      applicationId: user._id.toString(),
      phase: "inquiry_pending",
    });
  } catch (error: any) {
    console.error("Agent application error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
