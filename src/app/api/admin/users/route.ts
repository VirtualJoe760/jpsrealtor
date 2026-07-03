// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import Team from "@/models/Team";
import { getSiteReadiness } from "@/lib/agent-site-readiness";

// Ensure Team model is registered
const ensureModelsLoaded = () => {
  Team;
};

export async function GET(request: NextRequest) {
  try {
    ensureModelsLoaded();
    const session = await getServerSession(authOptions);

    // Check if user is admin
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await dbConnect();

    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser?.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Parse query params for search and role filter
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const role = searchParams.get("role");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (role && role !== "all") {
      if (role === "admin") {
        query.isAdmin = true;
      } else {
        query.roles = role;
      }
    }

    const total = await User.countDocuments(query);

    // Get users with team population
    const users = await User.find(query)
      .populate('team', 'name description')
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Batch lookup agent names for users that signed up via an agent domain
    const agentIds = [...new Set(
      users
        .map((u: any) => u.signupOrigin?.agentId)
        .filter(Boolean)
    )] as string[];

    let agentNameMap: Record<string, string> = {};
    if (agentIds.length > 0) {
      const mongoose = await import("mongoose");
      const agents = await User.find(
        { _id: { $in: agentIds.map((id: string) => new mongoose.Types.ObjectId(id)) } },
        { name: 1 }
      ).lean();
      agentNameMap = Object.fromEntries(
        agents.map((a: any) => [a._id.toString(), a.name || a.email || "Unknown Agent"])
      );
    }

    return NextResponse.json({
      users: users.map(user => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        phone: user.phone,
        roles: user.roles,
        isAdmin: user.isAdmin,
        isTeamLeader: user.isTeamLeader,
        team: user.team,
        brokerageName: user.brokerageName,
        licenseNumber: user.licenseNumber,
        profileDescription: user.profileDescription,
        subscriptionTier: user.subscriptionTier,
        subdomain: user.agentProfile?.subdomain,
        siteForceActive: user.agentProfile?.siteForceActive || false,
        // Free-tier agents go live once their profile is complete — surface that
        // so the admin's Live/Coming-Soon status matches the real public gate.
        siteReady: getSiteReadiness(user as any).complete,
        signupOrigin: user.signupOrigin,
        clientOfAgent: user.signupOrigin?.agentId
          ? agentNameMap[String(user.signupOrigin.agentId)] || null
          : null,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      })),
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users
 * Bulk delete users by IDs. Cannot delete your own account.
 * Body: { ids: string[] }
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array is required" }, { status: 400 });
    }

    // Prevent self-deletion
    const selfId = currentUser._id.toString();
    const safeIds = ids.filter((id: string) => id !== selfId);
    if (safeIds.length < ids.length) {
      console.warn("[admin/users DELETE] Blocked self-deletion attempt");
    }

    if (safeIds.length === 0) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    const result = await User.deleteMany({ _id: { $in: safeIds } });

    return NextResponse.json({
      success: true,
      deleted: result.deletedCount,
      message: `${result.deletedCount} account${result.deletedCount !== 1 ? "s" : ""} deleted`,
    });
  } catch (error) {
    console.error("Error bulk deleting users:", error);
    return NextResponse.json({ error: "Failed to delete users" }, { status: 500 });
  }
}
