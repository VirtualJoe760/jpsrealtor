// src/app/api/admin/applications/agents/route.ts
// Admin API: List and approve/reject agent applications

import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import { addDomainToProject } from "@/lib/vercel-domains";
import { sendAgentApprovalEmail } from "@/lib/email-resend";

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

      // Generate subdomain from name: "John Doe" → "johndoe"
      const userName = (user.name || user.email.split("@")[0]).toLowerCase();
      const subdomain = userName.replace(/[^a-z0-9]/g, "");

      // Check for subdomain conflicts and append number if needed
      let finalSubdomain = subdomain;
      let attempt = 0;
      while (true) {
        const existing = await User.findOne({
          "agentProfile.subdomain": finalSubdomain,
          _id: { $ne: user._id },
        });
        if (!existing) break;
        attempt++;
        finalSubdomain = `${subdomain}${attempt}`;
      }

      // Initialize agentProfile if needed and set subdomain
      if (!user.agentProfile) {
        user.agentProfile = {} as any;
      }
      user.agentProfile.subdomain = finalSubdomain;
      user.markModified("agentProfile");

      await user.save();

      // Register subdomain with Vercel (non-blocking)
      // Subdomain only becomes visible/active once agent subscribes
      const subdomainFull = `${finalSubdomain}.chatrealty.io`;
      addDomainToProject(subdomainFull).catch((err) =>
        console.error(`[agent-approve] Vercel subdomain registration failed for ${subdomainFull}:`, err)
      );

      console.log(`[agent-approve] Approved ${user.email}, subdomain: ${subdomainFull}`);

      // Send welcome email with subdomain info (non-blocking)
      sendAgentApprovalEmail(
        user.email,
        user.name || "",
        finalSubdomain,
      ).catch((err) => console.error("[agent-approve] Welcome email failed:", err));

      return NextResponse.json({
        success: true,
        message: `Agent approved. Subdomain: ${subdomainFull} (active after subscription)`,
        subdomain: subdomainFull,
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
