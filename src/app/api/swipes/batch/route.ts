// src/app/api/swipes/batch/route.ts
// Batch endpoint for syncing swipes to database

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/user";

const DISLIKE_TTL_MS = 30 * 60 * 1000; // 30 minutes

type SwipeAction = {
  listingKey: string;
  action: "like" | "dislike";
  listingData?: any; // Full listing object for likes
  timestamp: number;
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { swipes, anonymousId } = body as {
      swipes: SwipeAction[];
      anonymousId?: string;
    };

    console.log("🔷 API /api/swipes/batch RECEIVED:");
    console.log("  - Session user:", session?.user?.email || "none");
    console.log("  - Anonymous ID:", anonymousId || "none");
    console.log("  - Swipes count:", swipes?.length || 0);
    console.log("  - Swipes details:", swipes?.map(s => `${s.action}:${s.listingKey}`) || []);

    // Validate input
    if (!Array.isArray(swipes) || swipes.length === 0) {
      console.log("❌ Invalid swipes data");
      return NextResponse.json(
        { error: "Invalid swipes data" },
        { status: 400 }
      );
    }

    // Must have either session or anonymousId
    if (!session?.user?.email && !anonymousId) {
      return NextResponse.json(
        { error: "No user identification provided" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find or create user
    let user;
    if (session?.user?.email) {
      // Logged-in user
      user = await User.findOne({ email: session.user.email });
      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
    } else if (anonymousId) {
      // Anonymous user - find or create
      user = await User.findOne({ anonymousId });
      if (!user) {
        // Create new anonymous user
        user = new User({
          email: `anon-${anonymousId}@temp.local`,
          password: "anonymous", // Will never be used for login
          anonymousId,
          roles: ["endUser"],
          emailVerified: null,
        });
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: "Could not find or create user" },
        { status: 500 }
      );
    }

    // Process swipes
    const now = new Date();
    let likesAdded = 0;
    let dislikesAdded = 0;

    console.log("🔄 Processing swipes...");

    for (const swipe of swipes) {
      if (swipe.action === "like") {
        // Check if already liked
        const alreadyLiked = user.likedListings.some(
          (item: any) => item.listingKey === swipe.listingKey
        );

        if (!alreadyLiked) {
          console.log(`  ➕ Adding LIKE: ${swipe.listingKey}`);
          user.likedListings.push({
            listingKey: swipe.listingKey,
            listingData: swipe.listingData || {},
            swipedAt: new Date(swipe.timestamp),
            subdivision: swipe.listingData?.subdivisionName,
            city: swipe.listingData?.city,
            propertySubType: swipe.listingData?.propertySubType,
          });
          likesAdded++;
        } else {
          console.log(`  ⏭️ SKIP (already liked): ${swipe.listingKey}`);
        }
      } else if (swipe.action === "dislike") {
        // Check if already disliked
        const alreadyDisliked = user.dislikedListings.some(
          (item: any) => item.listingKey === swipe.listingKey
        );

        if (!alreadyDisliked) {
          console.log(`  ➕ Adding DISLIKE: ${swipe.listingKey}`);
          const swipedAt = new Date(swipe.timestamp);
          const expiresAt = new Date(swipe.timestamp + DISLIKE_TTL_MS);

          user.dislikedListings.push({
            listingKey: swipe.listingKey,
            listingData: swipe.listingData || {}, // Save listing data for display
            swipedAt,
            expiresAt,
          });
          dislikesAdded++;
        } else {
          console.log(`  ⏭️ SKIP (already disliked): ${swipe.listingKey}`);
        }
      }
    }

    console.log(`✅ Processing complete: ${likesAdded} likes added, ${dislikesAdded} dislikes added`);

    // Calculate and update analytics
    const analytics = calculateAnalytics(user.likedListings);
    user.swipeAnalytics = {
      ...analytics,
      lastUpdated: now,
    };

    // Update lastSwipeSync
    user.lastSwipeSync = now;

    // Save to database
    console.log(`💾 Saving to database...`);
    console.log(`  - Total liked listings in DB: ${user.likedListings.length}`);
    console.log(`  - Total disliked listings in DB: ${user.dislikedListings.length}`);
    await user.save();

    const validDislikes = user.dislikedListings.filter((d: any) =>
      new Date(d.expiresAt) > now
    ).length;

    console.log(`✅ Saved successfully!`);
    console.log(`  - Total likes in DB: ${user.likedListings.length}`);
    console.log(`  - Valid dislikes in DB: ${validDislikes}`);

    return NextResponse.json({
      success: true,
      likesAdded,
      dislikesAdded,
      totalLikes: user.likedListings.length,
      totalDislikes: validDislikes,
    });
  } catch (error) {
    console.error("Error processing swipe batch:", error);
    return NextResponse.json(
      { error: "Failed to process swipes" },
      { status: 500 }
    );
  }
}

// Helper function to calculate analytics from liked listings
function calculateAnalytics(likedListings: any[]) {
  const subdivisionCounts: Record<string, number> = {};
  const cityCounts: Record<string, number> = {};
  const propertySubTypeCounts: Record<string, number> = {};

  likedListings.forEach((listing) => {
    // Check both top-level and listingData for fields
    const subdivision = listing.subdivision || listing.listingData?.subdivisionName;
    const city = listing.city || listing.listingData?.city;
    const propertySubType = listing.propertySubType || listing.listingData?.propertySubType;

    if (subdivision) {
      subdivisionCounts[subdivision] = (subdivisionCounts[subdivision] || 0) + 1;
    }
    if (city) {
      cityCounts[city] = (cityCounts[city] || 0) + 1;
    }
    if (propertySubType) {
      propertySubTypeCounts[propertySubType] = (propertySubTypeCounts[propertySubType] || 0) + 1;
    }
  });

  // Convert to sorted arrays
  const topSubdivisions = Object.entries(subdivisionCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topCities = Object.entries(cityCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topPropertySubTypes = Object.entries(propertySubTypeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalLikes: likedListings.length,
    totalDislikes: 0, // Will be calculated separately
    topSubdivisions,
    topCities,
    topPropertySubTypes,
  };
}
