// src/app/api/admin/applications/agents/route.ts
// Admin API: List and approve/reject agent applications

import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { authorized } = await verifyAdmin();
    if (!authorized) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    await dbConnect();

    const applications = await User.find({
      agentApplication: { $exists: true },
    })
      .select("name email agentApplication createdAt")
      .sort({ "agentApplication.submittedAt": -1 })
      .lean();

    const transformed = applications.map((app: any) => ({
      _id: app._id,
      name: app.name,
      email: app.email,
      licenseNumber: app.agentApplication?.licenseNumber,
      brokerageName: app.agentApplication?.brokerageName,
      identityStatus: app.agentApplication?.identityStatus || "pending",
      phase: app.agentApplication?.phase,
      createdAt: app.agentApplication?.submittedAt || app.createdAt,
    }));

    return NextResponse.json({ success: true, applications: transformed });
  } catch (error: any) {
    console.error("GET /api/admin/applications/agents error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { authorized } = await verifyAdmin();
    if (!authorized) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    await dbConnect();

    const body = await request.json();
    const { userId, action, reason } = body;

    if (!userId || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid request. Required: userId, action (approve|reject)" },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.agentApplication) {
      return NextResponse.json(
        { error: "No agent application found for this user" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // Grant realEstateAgent role
      if (!user.roles.includes("realEstateAgent")) {
        user.roles.push("realEstateAgent");
      }
      user.agentApplication.phase = "final_approved";
      user.agentApplication.finalApprovedAt = new Date();
      user.agentApplication.finalReviewNotes = reason || "Approved by admin";
      await user.save();

      return NextResponse.json({
        success: true,
        message: "Agent application approved. User granted realEstateAgent role.",
      });
    } else {
      // Reject
      user.agentApplication.phase = "final_rejected";
      user.agentApplication.finalReviewNotes = reason || "Rejected by admin";
      await user.save();

      // TODO: Send rejection email with reason

      return NextResponse.json({
        success: true,
        message: "Agent application rejected.",
      });
    }
  } catch (error: any) {
    console.error("PUT /api/admin/applications/agents error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
