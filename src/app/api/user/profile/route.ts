// src/app/api/user/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import Team from "@/models/Team";

// Cloudinary asset fields in agentProfile that store URLs
const CLOUDINARY_PHOTO_FIELDS = [
  "profilePhoto", "headshot", "coverPhoto", "heroImage", "heroPhoto",
  "insightsBannerImage", "teamLogo", "teamPhoto", "officePhoto",
] as const;

/**
 * Extract Cloudinary public_id from a URL for deletion
 * e.g. "https://res.cloudinary.com/duqgao9h8/image/upload/v123/jpsrealtor/agents/abc.jpg"
 * → "jpsrealtor/agents/abc"
 */
function extractCloudinaryPublicId(url: string): string | null {
  if (!url || !url.includes("cloudinary.com")) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
  return match ? match[1] : null;
}

/**
 * Delete an asset from Cloudinary by public_id
 */
async function deleteCloudinaryAsset(publicId: string): Promise<boolean> {
  const cloudName = "duqgao9h8";
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.warn("⚠️ [Cloudinary] Missing API_KEY or API_SECRET — cannot delete old assets");
    return false;
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const crypto = require("crypto");
    const signature = crypto.createHash("sha1")
      .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
      .digest("hex");

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_id: publicId, timestamp, api_key: apiKey, signature }),
    });

    const data = await res.json();
    if (data.result === "ok") {
      console.log(`🗑️ [Cloudinary] Deleted old asset: ${publicId}`);
      return true;
    } else {
      console.warn(`⚠️ [Cloudinary] Delete failed for ${publicId}:`, data);
      return false;
    }
  } catch (err) {
    console.error(`❌ [Cloudinary] Error deleting ${publicId}:`, err);
    return false;
  }
}

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

    console.log(`\n📝 ═══════════════════════════════════════`);
    console.log(`📝 [PROFILE UPDATE] ${session.user.email}`);
    console.log(`📝 ═══════════════════════════════════════`);

    // Log basic field changes
    const basicChanges: string[] = [];
    if (name !== undefined && name !== user.name) { basicChanges.push(`name: "${user.name}" → "${name}"`); user.name = name; }
    else if (name !== undefined) user.name = name;
    if (phone !== undefined && phone !== user.phone) { basicChanges.push(`phone: "${user.phone}" → "${phone}"`); user.phone = phone; }
    else if (phone !== undefined) user.phone = phone;
    if (birthday !== undefined) { user.birthday = birthday ? new Date(birthday) : undefined; }
    if (profileDescription !== undefined) user.profileDescription = profileDescription;
    if (realEstateGoals !== undefined) user.realEstateGoals = realEstateGoals;
    if (currentAddress !== undefined) user.currentAddress = currentAddress;
    if (homeownerStatus !== undefined) user.homeownerStatus = homeownerStatus;
    if (image !== undefined && image !== user.image) { basicChanges.push(`image: updated`); user.image = image; }
    else if (image !== undefined) user.image = image;
    if (brokerageName !== undefined && brokerageName !== user.brokerageName) { basicChanges.push(`brokerageName: "${user.brokerageName}" → "${brokerageName}"`); user.brokerageName = brokerageName; }
    else if (brokerageName !== undefined) user.brokerageName = brokerageName;
    if (licenseNumber !== undefined && licenseNumber !== user.licenseNumber) { basicChanges.push(`licenseNumber: "${user.licenseNumber}" → "${licenseNumber}"`); user.licenseNumber = licenseNumber; }
    else if (licenseNumber !== undefined) user.licenseNumber = licenseNumber;

    if (basicChanges.length > 0) {
      console.log(`📝 [PROFILE UPDATE] Basic field changes:`);
      basicChanges.forEach(c => console.log(`   • ${c}`));
    }

    // MULTI-TENANT: Update agentProfile fields (deep merge)
    if (agentProfile !== undefined) {
      console.log(`📝 [PROFILE UPDATE] agentProfile update received`);

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

      // Detect photo field changes and delete old Cloudinary assets
      for (const field of CLOUDINARY_PHOTO_FIELDS) {
        const oldUrl = cleanedExisting?.[field] as string | undefined;
        const newUrl = cleanedIncoming?.[field] as string | undefined;

        if (newUrl && oldUrl && newUrl !== oldUrl) {
          console.log(`🖼️ [PHOTO CHANGE] ${field}:`);
          console.log(`   OLD: ${oldUrl}`);
          console.log(`   NEW: ${newUrl}`);

          // Delete old asset from Cloudinary
          const oldPublicId = extractCloudinaryPublicId(oldUrl);
          if (oldPublicId) {
            console.log(`   🗑️ Deleting old Cloudinary asset: ${oldPublicId}`);
            deleteCloudinaryAsset(oldPublicId); // Fire and forget
          }
        } else if (newUrl && !oldUrl) {
          console.log(`🖼️ [PHOTO ADD] ${field}: ${newUrl}`);
        }
      }

      // Log non-photo field changes
      if (cleanedIncoming) {
        for (const [key, value] of Object.entries(cleanedIncoming)) {
          if (CLOUDINARY_PHOTO_FIELDS.includes(key as any)) continue; // Already logged above
          if (typeof value === "object") continue; // Skip nested objects (logged separately)
          const oldVal = cleanedExisting?.[key];
          if (value !== oldVal) {
            console.log(`   📝 agentProfile.${key}: "${oldVal || ''}" → "${value}"`);
          }
        }
      }

      // Merge and set
      const mergedProfile = deepMerge(cleanedExisting || {}, cleanedIncoming || {});
      user.agentProfile = mergedProfile;

      // Mark the field as modified for Mongoose
      user.markModified('agentProfile');
    }

    await user.save({ validateModifiedOnly: true });

    console.log(`✅ [PROFILE UPDATE] Saved to DB for ${session.user.email}`);
    console.log(`📝 ═══════════════════════════════════════\n`);

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
