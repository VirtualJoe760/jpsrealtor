// src/app/api/admin/applications/agents/route.ts
// Admin API: List and approve/reject agent applications

import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { sendAgentApprovalEmail } from "@/lib/email-resend";
import { sendAgentRejectionEmail } from "@/lib/email-agent-application";
import { generateSubdomain } from "@/lib/generate-subdomain";

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
      "agentApplication.phase": { $exists: true, $ne: null },
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

      // Generate unique subdomain from name (shared utility handles conflicts + reserved words)
      const finalSubdomain = await generateSubdomain(user.name, user.email, user._id);
      if (!user.agentProfile) {
        user.agentProfile = {} as any;
      }
      user.agentProfile.subdomain = finalSubdomain;
      user.markModified("agentProfile");

      await user.save();

      // Wildcard DNS (*.chatrealty.io) handles all subdomains — no Vercel registration needed
      console.log(`[agent-approve] Approved ${user.email}, subdomain: ${finalSubdomain}.chatrealty.io`);

      // Send welcome email with subdomain info (non-blocking)
      sendAgentApprovalEmail(
        user.email,
        user.name || "",
        finalSubdomain,
      ).catch((err) => console.error("[agent-approve] Welcome email failed:", err));

      return NextResponse.json({
        success: true,
        message: `Agent approved. Subdomain: ${finalSubdomain}.chatrealty.io (active after subscription)`,
        subdomain: `${finalSubdomain}.chatrealty.io`,
      });
    } else {
      // Reject
      user.agentApplication.phase = "final_rejected";
      user.agentApplication.finalReviewNotes = reason || "Rejected by admin";
      await user.save();

      // Email the applicant the decision + reason (non-blocking)
      sendAgentRejectionEmail({
        applicantName: user.name || "",
        applicantEmail: user.email,
        reason: reason || undefined,
      }).catch((err) =>
        console.error("[agent-reject] Rejection email failed:", err)
      );

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
