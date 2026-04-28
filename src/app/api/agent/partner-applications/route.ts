// src/app/api/agent/partner-applications/route.ts
// List all service partner applications for the agent to review

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export const dynamic = 'force-dynamic';

// GET: List all users who have applied as service partners
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const currentUser = await User.findOne({ email: session.user.email }).select("_id roles").lean();
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only agents can view partner applications
    if (!currentUser.roles?.includes("realEstateAgent")) {
      return NextResponse.json({ error: "Only agents can view partner applications" }, { status: 403 });
    }

    // Find all users with serviceProvider role
    const partners = await User.find({
      roles: "serviceProvider",
      servicePartnerProfile: { $exists: true },
    })
      .select("name email image phone createdAt servicePartnerProfile")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ partners });
  } catch (error: any) {
    console.error("Error listing partner applications:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
