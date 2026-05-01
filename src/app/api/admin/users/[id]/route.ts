// src/app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import Team from "@/models/Team";
import mongoose from "mongoose";
import { registerSubdomainWithVercel, removeSubdomainFromVercel } from "@/lib/generate-subdomain";

// Ensure Team model is registered
const ensureModelsLoaded = () => {
  Team;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    ensureModelsLoaded();
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const user = await User.findById(id)
      .populate('team', 'name description')
      .select('-password')
      .lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

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

    // Capture old role state before mutation
    const hadAgentRoleBefore = user.roles?.includes("realEstateAgent") || false;

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
          user[field] = body[field] ? new mongoose.Types.ObjectId(body[field]) : null;
        } else {
          user[field] = body[field];
        }
      }
    });

    // Handle siteForceActive toggle (stored in agentProfile)
    if (body.siteForceActive !== undefined) {
      if (!user.agentProfile) user.agentProfile = {} as any;
      user.agentProfile.siteForceActive = !!body.siteForceActive;
      user.markModified("agentProfile");
    }

    const hasAgentRoleAfter = user.roles?.includes("realEstateAgent") || false;

    await user.save();

    // Manage Vercel subdomain + domain registry based on role changes
    const subdomain = user.agentProfile?.subdomain;
    if (subdomain && body.roles !== undefined) {
      if (hasAgentRoleAfter && !hadAgentRoleBefore) {
        // Promoted to agent — register subdomain with Vercel
        registerSubdomainWithVercel(subdomain).catch((err) =>
          console.error(`[admin/users] Vercel register failed for ${subdomain}:`, err)
        );
      } else if (!hasAgentRoleAfter && hadAgentRoleBefore) {
        // Demoted from agent — remove subdomain from Vercel + suspend linked domains
        removeSubdomainFromVercel(subdomain).catch((err) =>
          console.error(`[admin/users] Vercel remove failed for ${subdomain}:`, err)
        );

        // Suspend any custom domains linked to this agent
        try {
          const DomainMapping = (await import("@/models/DomainMapping")).default;
          const DomainRegistry = (await import("@/models/DomainRegistry")).default;
          await DomainMapping.updateMany(
            { agentId: user._id },
            { $set: { status: "suspended" } }
          );
          await DomainRegistry.updateMany(
            { ownerId: user._id },
            { $set: { status: "suspended" } }
          );
          console.log(`[admin/users] Suspended domains for demoted agent ${user.email}`);
        } catch (err) {
          console.error(`[admin/users] Failed to suspend domains:`, err);
        }
      }
    }

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    ensureModelsLoaded();
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser?.isAdmin) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Prevent self-deletion
    if (currentUser._id.toString() === id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
