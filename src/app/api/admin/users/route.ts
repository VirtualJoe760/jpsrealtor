// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import Team from "@/models/Team";

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

    // Get all users with team population
    const users = await User.find({})
      .populate('team', 'name description')
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

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
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
