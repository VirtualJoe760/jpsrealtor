// src/app/api/admin/applications/route.ts
// List all agent applications (admin only)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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
    const user = await User.findOne({ email: session.user.email });
    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    // Get phase filter from query params
    const { searchParams } = new URL(request.url);
    const phaseFilter = searchParams.get("phase");

    // Build query
    const query: any = {
      agentApplication: { $exists: true },
    };

    if (phaseFilter) {
      query["agentApplication.phase"] = phaseFilter;
    }

    // Get applications
    const applications = await User.find(query)
      .select(
        "name email agentApplication createdAt"
      )
      .populate("agentApplication.preferredTeam", "name")
      .populate("agentApplication.assignedTeam", "name")
      .populate("agentApplication.phase1ReviewedBy", "name email")
      .populate("agentApplication.finalReviewedBy", "name email")
      .sort({ "agentApplication.submittedAt": -1 })
      .lean();

    // Transform data for response
    const transformedApplications = applications.map((app: any) => ({
      id: app._id,
      applicantName: app.name,
      applicantEmail: app.email,
      submittedAt: app.agentApplication.submittedAt,
      phase: app.agentApplication.phase,
      licenseNumber: app.agentApplication.licenseNumber,
      licenseState: app.agentApplication.licenseState,
      mlsId: app.agentApplication.mlsId,
      yearsExperience: app.agentApplication.yearsExperience,
      preferredTeam: app.agentApplication.preferredTeam,
      assignedTeam: app.agentApplication.assignedTeam,
      identityVerified: app.agentApplication.identityVerified,
      identityStatus: app.agentApplication.identityStatus,
      phase1ReviewedBy: app.agentApplication.phase1ReviewedBy,
      phase1ReviewedAt: app.agentApplication.phase1ReviewedAt,
      finalReviewedBy: app.agentApplication.finalReviewedBy,
      finalReviewedAt: app.agentApplication.finalReviewedAt,
      finalApprovedAt: app.agentApplication.finalApprovedAt,
    }));

    // Get counts by phase
    const phaseCounts = await User.aggregate([
      { $match: { agentApplication: { $exists: true } } },
      {
        $group: {
          _id: "$agentApplication.phase",
          count: { $sum: 1 },
        },
      },
    ]);

    const countsMap = phaseCounts.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      applications: transformedApplications,
      total: transformedApplications.length,
      phaseCounts: countsMap,
    });
  } catch (error: any) {
    console.error("Get applications error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
