// src/app/api/admin/applications/[id]/review-phase1/route.ts
// Review Phase 1 application (approve/reject)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { sendAgentApplicationEmail } from "@/lib/email-agent-application";

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get admin user
    const adminUser = await User.findOne({ email: session.user.email });
    if (!adminUser || !adminUser.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { approved, reviewNotes } = body;

    if (typeof approved !== "boolean") {
      return NextResponse.json(
        { error: "Missing required field: approved (boolean)" },
        { status: 400 }
      );
    }

    // Get applicant
    const applicant = await User.findById(params.id);
    if (!applicant || !applicant.agentApplication) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Check if application is in correct phase
    if (applicant.agentApplication.phase !== "inquiry_pending") {
      return NextResponse.json(
        {
          error: "Application is not in pending review state",
          currentPhase: applicant.agentApplication.phase,
        },
        { status: 400 }
      );
    }

    // Update application based on review
    applicant.agentApplication.phase = approved
      ? "inquiry_approved"
      : "inquiry_rejected";
    applicant.agentApplication.phase1ReviewedBy = adminUser._id;
    applicant.agentApplication.phase1ReviewedAt = new Date();
    applicant.agentApplication.phase1ReviewNotes = reviewNotes || undefined;

    await applicant.save();

    // Send email notification
    try {
      await sendAgentApplicationEmail({
        applicantName: applicant.name || applicant.email,
        applicantEmail: applicant.email,
        applicationId: applicant._id.toString(),
        phase: approved ? "phase1_approved" : "phase1_rejected",
        reviewNotes,
      });
    } catch (emailError) {
      console.error("Failed to send review email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: approved
        ? "Application approved. Applicant can now verify their identity."
        : "Application rejected.",
      phase: applicant.agentApplication.phase,
    });
  } catch (error: any) {
    console.error("Review Phase 1 error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
