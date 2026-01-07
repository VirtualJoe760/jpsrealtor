// src/app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import Team from "@/models/Team";
import mongoose from "mongoose";

// Ensure Team model is registered
const ensureModelsLoaded = () => {
  Team;
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Update allowed fields
    const allowedFields = [
      'name',
      'email',
      'phone',
      'roles',
      'isAdmin',
      'isTeamLeader',
      'team',
      'brokerageName',
      'licenseNumber',
      'profileDescription',
      'image',
    ];

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        if (field === 'team') {
          // Handle team assignment
          user[field] = body[field] ? new mongoose.Types.ObjectId(body[field]) : null;
        } else {
          user[field] = body[field];
        }
      }
    });

    await user.save();

    // Populate team before returning
    await user.populate('team', 'name description');

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      user: {
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
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
