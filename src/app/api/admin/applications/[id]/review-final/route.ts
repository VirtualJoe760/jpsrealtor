// src/app/api/admin/applications/[id]/review-final/route.ts
// Final review and approval (assign to team, grant agent role)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import Team from "@/models/Team";
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
    const { approved, reviewNotes, teamId } = body;

    if (typeof approved !== "boolean") {
      return NextResponse.json(
        { error: "Missing required field: approved (boolean)" },
        { status: 400 }
      );
    }

    if (approved && !teamId) {
      return NextResponse.json(
        { error: "Team assignment is required for approval" },
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
    if (applicant.agentApplication.phase !== "verification_complete") {
      return NextResponse.json(
        {
          error: "Application is not ready for final review",
          currentPhase: applicant.agentApplication.phase,
        },
        { status: 400 }
      );
    }

    // Verify team exists if approving
    let team = null;
    if (approved) {
      team = await Team.findById(teamId);
      if (!team) {
        return NextResponse.json(
          { error: "Invalid team ID" },
          { status: 400 }
        );
      }
    }

    // Update application based on review
    applicant.agentApplication.phase = approved
      ? "final_approved"
      : "final_rejected";
    applicant.agentApplication.finalReviewedBy = adminUser._id;
    applicant.agentApplication.finalReviewedAt = new Date();
    applicant.agentApplication.finalReviewNotes = reviewNotes || undefined;

    if (approved && team) {
      // Grant agent role
      applicant.addRole("realEstateAgent");

      // Assign to team
      applicant.team = team._id;
      applicant.agentApplication.assignedTeam = team._id;
      applicant.agentApplication.finalApprovedAt = new Date();

      // Add agent to team
      await team.addAgent(applicant._id);

      await applicant.save();

      // Send approval email
      try {
        await sendAgentApplicationEmail({
          applicantName: applicant.name || applicant.email,
          applicantEmail: applicant.email,
          applicationId: applicant._id.toString(),
          phase: "final_approved",
          reviewNotes,
          teamName: team.name,
        });
      } catch (emailError) {
        console.error("Failed to send approval email:", emailError);
      }

      return NextResponse.json({
        success: true,
        message: "Application approved. Agent role granted.",
        teamAssigned: team.name,
      });
    } else {
      await applicant.save();

      // Send rejection email
      try {
        await sendAgentApplicationEmail({
          applicantName: applicant.name || applicant.email,
          applicantEmail: applicant.email,
          applicationId: applicant._id.toString(),
          phase: "final_rejected",
          reviewNotes,
        });
      } catch (emailError) {
        console.error("Failed to send rejection email:", emailError);
      }

      return NextResponse.json({
        success: true,
        message: "Application rejected.",
      });
    }
  } catch (error: any) {
    console.error("Final review error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
