// src/app/api/user/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import Team from "@/models/Team";

// Ensure Team model is registered
const ensureModelsLoaded = () => {
  Team; // Reference to ensure the model is loaded
};

export async function GET(request: NextRequest) {
  try {
    ensureModelsLoaded();
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email })
      .populate('significantOther', 'name email')
      .populate('team', 'name description')
      .select('-password');

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      profile: {
        name: user.name,
        email: user.email,
        image: user.image,
        phone: user.phone,
        birthday: user.birthday,
        profileDescription: user.profileDescription,
        realEstateGoals: user.realEstateGoals,
        currentAddress: user.currentAddress,
        homeownerStatus: user.homeownerStatus,
        significantOther: user.significantOther,
        brokerageName: user.brokerageName,
        licenseNumber: user.licenseNumber,
        team: user.team,
        isTeamLeader: user.isTeamLeader,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    ensureModelsLoaded();
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      phone,
      birthday,
      profileDescription,
      realEstateGoals,
      currentAddress,
      homeownerStatus,
      image,
      brokerageName,
      licenseNumber,
    } = body;

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Update fields
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (birthday !== undefined) user.birthday = birthday ? new Date(birthday) : undefined;
    if (profileDescription !== undefined) user.profileDescription = profileDescription;
    if (realEstateGoals !== undefined) user.realEstateGoals = realEstateGoals;
    if (currentAddress !== undefined) user.currentAddress = currentAddress;
    if (homeownerStatus !== undefined) user.homeownerStatus = homeownerStatus;
    if (image !== undefined) user.image = image;
    if (brokerageName !== undefined) user.brokerageName = brokerageName;
    if (licenseNumber !== undefined) user.licenseNumber = licenseNumber;

    await user.save();

    // Populate team info for response
    await user.populate('team', 'name description');

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      profile: {
        name: user.name,
        email: user.email,
        image: user.image,
        phone: user.phone,
        birthday: user.birthday,
        profileDescription: user.profileDescription,
        realEstateGoals: user.realEstateGoals,
        currentAddress: user.currentAddress,
        homeownerStatus: user.homeownerStatus,
        brokerageName: user.brokerageName,
        licenseNumber: user.licenseNumber,
        team: user.team,
        isTeamLeader: user.isTeamLeader,
      },
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
