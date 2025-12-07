// src/app/api/user/favorites/route.ts
// Manage user favorites - sync from client and fetch favorites with analytics

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/user";

// GET - Fetch user's favorites and analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      favorites: user.likedListings || [],
      analytics: user.swipeAnalytics || {
        totalLikes: 0,
        totalDislikes: 0,
        topSubdivisions: [],
        topCities: [],
        topPropertySubTypes: [],
      },
    });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json(
      { error: "Failed to fetch favorites" },
      { status: 500 }
    );
  }
}

// POST - Sync favorites from client to database
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { favorites } = body;

    if (!Array.isArray(favorites)) {
      return NextResponse.json(
        { error: "Invalid favorites data" },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Process favorites and extract analytics data
    const processedFavorites = favorites.map((listing: any) => ({
      listingKey: listing.listingKey || listing._id,
      listingData: listing,
      swipedAt: new Date(),
      subdivision: listing.subdivisionName,
      city: listing.city,
      propertyType: listing.propertyType,
    }));

    // Calculate analytics
    const analytics = calculateAnalytics(processedFavorites);

    // Update user with new favorites and analytics
    user.likedListings = processedFavorites;
    user.swipeAnalytics = {
      ...analytics,
      lastUpdated: new Date(),
    };

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Favorites synced successfully",
      count: processedFavorites.length,
      analytics: user.swipeAnalytics,
    });
  } catch (error) {
    console.error("Error syncing favorites:", error);
    return NextResponse.json(
      { error: "Failed to sync favorites" },
      { status: 500 }
    );
  }
}

// Helper function to calculate analytics from favorites
function calculateAnalytics(favorites: any[]) {
  const subdivisionCounts: Record<string, number> = {};
  const cityCounts: Record<string, number> = {};
  const propertySubTypeCounts: Record<string, number> = {};

  favorites.forEach((fav) => {
    // Check both top-level and listingData for fields
    const subdivision = fav.subdivision || fav.listingData?.subdivisionName;
    const city = fav.city || fav.listingData?.city;
    const propertySubType = fav.propertySubType || fav.listingData?.propertySubType;

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
    totalLikes: favorites.length,
    totalDislikes: 0, // Will be updated separately when we track dislikes
    topSubdivisions,
    topCities,
    topPropertySubTypes,
  };
}

// DELETE - Clear all favorites
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Clear all favorites
    user.likedListings = [];

    // Update analytics
    if (user.swipeAnalytics) {
      user.swipeAnalytics.totalLikes = 0;
      user.swipeAnalytics.lastUpdated = new Date();
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: "All favorites cleared"
    });
  } catch (error) {
    console.error("Error clearing favorites:", error);
    return NextResponse.json(
      { error: "Failed to clear favorites" },
      { status: 500 }
    );
  }
}
