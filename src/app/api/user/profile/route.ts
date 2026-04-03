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

    console.log('🔍 [GET PROFILE] Returning agentProfile:', JSON.stringify(user.agentProfile, null, 2));

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
        // MULTI-TENANT: Agent Profile
        agentProfile: user.agentProfile,
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
      // MULTI-TENANT: Agent Profile fields
      agentProfile,
    } = body;

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Update basic fields
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

    // MULTI-TENANT: Update agentProfile fields (deep merge)
    if (agentProfile !== undefined) {
      console.log('🔍 [PROFILE UPDATE] Incoming agentProfile:', JSON.stringify(agentProfile, null, 2));

      // Initialize agentProfile if it doesn't exist
      if (!user.agentProfile) {
        user.agentProfile = {} as any;
      }

      console.log('🔍 [PROFILE UPDATE] Existing agentProfile before merge:', JSON.stringify(user.agentProfile, null, 2));

      // Helper function to deeply remove undefined values
      const removeUndefined = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return obj;
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined) {
            cleaned[key] = typeof value === 'object' && !Array.isArray(value)
              ? removeUndefined(value)
              : value;
          }
        }
        return Object.keys(cleaned).length > 0 ? cleaned : undefined;
      };

      // Get existing profile and clean it
      const existingProfile = (user.agentProfile as any)?.toObject ? (user.agentProfile as any).toObject() : user.agentProfile;
      const cleanedExisting = removeUndefined(existingProfile);

      // Clean incoming profile
      const cleanedIncoming = removeUndefined(agentProfile);

      console.log('🔍 [PROFILE UPDATE] Cleaned incoming:', JSON.stringify(cleanedIncoming, null, 2));

      // Deep merge function
      const deepMerge = (target: any, source: any): any => {
        const output = { ...target };
        for (const key in source) {
          if (source[key] !== undefined) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
              output[key] = deepMerge(output[key] || {}, source[key]);
            } else {
              output[key] = source[key];
            }
          }
        }
        return output;
      };

      // Merge and set
      const mergedProfile = deepMerge(cleanedExisting || {}, cleanedIncoming || {});
      user.agentProfile = mergedProfile;

      console.log('🔍 [PROFILE UPDATE] Merged agentProfile:', JSON.stringify(mergedProfile, null, 2));

      // Mark the field as modified for Mongoose
      user.markModified('agentProfile');
    }

    await user.save({ validateModifiedOnly: true });

    console.log('✅ [PROFILE UPDATE] Saved to database. Final agentProfile:', JSON.stringify(user.agentProfile, null, 2));

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
        // MULTI-TENANT: Agent Profile
        agentProfile: user.agentProfile,
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
