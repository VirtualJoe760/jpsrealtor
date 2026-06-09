// src/app/api/admin/applications/partners/route.ts
// Admin API: List and approve/reject partner applications

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

    const partners = await User.find({
      roles: "serviceProvider",
      servicePartnerProfile: { $exists: true },
    })
      .select("name email servicePartnerProfile createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const transformed = partners.map((p: any) => ({
      _id: p._id,
      name: p.name,
      email: p.email,
      companyName: p.servicePartnerProfile?.companyName,
      type: p.servicePartnerProfile?.type,
      phone: p.servicePartnerProfile?.phone,
      website: p.servicePartnerProfile?.website,
      licenseNumber: p.servicePartnerProfile?.licenseNumber,
      nmlsId: p.servicePartnerProfile?.nmlsId,
      createdAt: p.createdAt,
      // Approval gate state — legacy partners with no status are treated as approved.
      status: p.servicePartnerProfile?.status || "approved",
      appliedAt: p.servicePartnerProfile?.appliedAt,
      approvedAt: p.servicePartnerProfile?.approvedAt,
      rejectionReason: p.servicePartnerProfile?.rejectionReason,
    }));

    return NextResponse.json({ success: true, partners: transformed });
  } catch (error: any) {
    console.error("GET /api/admin/applications/partners error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { authorized, email: adminEmail } = await verifyAdmin();
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

    if (!user.servicePartnerProfile) {
      return NextResponse.json(
        { error: "No service partner profile found for this user" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // Ensure serviceProvider role is present
      if (!user.roles.includes("serviceProvider")) {
        user.roles.push("serviceProvider");
      }
      // Flip the approval gate to "approved" — this is what actually makes the
      // partner visible in the public directory (the directory query filters on it).
      user.servicePartnerProfile.status = "approved";
      user.servicePartnerProfile.approvedAt = new Date();
      user.servicePartnerProfile.approvedBy = adminEmail;
      user.servicePartnerProfile.rejectionReason = undefined;
      user.markModified("servicePartnerProfile");
      await user.save();

      return NextResponse.json({
        success: true,
        message: "Partner application approved — now listed in the directory.",
      });
    } else {
      // Reject — mark rejected, hide from directory, and drop the serviceProvider role.
      user.servicePartnerProfile.status = "rejected";
      user.servicePartnerProfile.rejectionReason = reason || "Rejected by admin";
      user.roles = user.roles.filter((r: string) => r !== "serviceProvider");
      user.markModified("servicePartnerProfile");
      await user.save();

      // TODO: Send rejection email with reason

      return NextResponse.json({
        success: true,
        message: "Partner application rejected.",
      });
    }
  } catch (error: any) {
    console.error("PUT /api/admin/applications/partners error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
