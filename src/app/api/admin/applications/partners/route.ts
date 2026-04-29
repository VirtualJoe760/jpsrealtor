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
      // Mark as approved (could add a status field in the future)
      await user.save();

      return NextResponse.json({
        success: true,
        message: "Partner application approved.",
      });
    } else {
      // Reject - remove serviceProvider role
      user.roles = user.roles.filter((r: string) => r !== "serviceProvider");
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
