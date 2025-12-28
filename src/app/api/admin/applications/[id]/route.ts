// src/app/api/admin/applications/[id]/route.ts
// Get single agent application details (admin only)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export const dynamic = 'force-dynamic';

export async function GET(
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

    // Get user and verify admin
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser || !currentUser.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    // Get application
    const applicant = await User.findById(params.id)
      .populate("agentApplication.preferredTeam")
      .populate("agentApplication.assignedTeam")
      .populate("agentApplication.phase1ReviewedBy", "name email")
      .populate("agentApplication.finalReviewedBy", "name email")
      .lean();

    if (!applicant || !applicant.agentApplication) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Return full application details
    return NextResponse.json({
      success: true,
      application: {
        id: applicant._id,
        applicantName: applicant.name,
        applicantEmail: applicant.email,
        applicantPhone: applicant.phone,
        ...applicant.agentApplication,
      },
    });
  } catch (error: any) {
    console.error("Get application error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
