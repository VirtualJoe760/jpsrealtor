// src/app/api/user/favorites/[listingKey]/route.ts
// Add or remove a specific favorite

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

// POST - Add a single favorite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listingKey: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { listingKey } = await params;
    const body = await request.json();
    const { listingData } = body;

    if (!listingData) {
      return NextResponse.json(
        { error: "Listing data required" },
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

    // Check if already favorited
    const exists = user.likedListings.some(
      (fav: any) => fav.listingKey === listingKey
    );

    if (exists) {
      return NextResponse.json(
        { success: true, message: "Already favorited", alreadyExists: true },
        { status: 200 }
      );
    }

    // Add the favorite
    user.likedListings.push({
      listingKey,
      listingData,
      swipedAt: new Date(),
      subdivision: listingData.subdivisionName,
      city: listingData.city,
      propertySubType: listingData.propertySubType,
    });

    // Update analytics
    if (!user.swipeAnalytics) {
      user.swipeAnalytics = {
        totalLikes: 0,
        totalDislikes: 0,
        topSubdivisions: [],
        topCities: [],
        topPropertySubTypes: [],
        lastUpdated: new Date(),
      };
    }

    user.swipeAnalytics.totalLikes = user.likedListings.length;
    user.swipeAnalytics.lastUpdated = new Date();

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Favorite added successfully",
      totalCount: user.likedListings.length,
    });
  } catch (error) {
    console.error("Error adding favorite:", error);
    return NextResponse.json(
      { error: "Failed to add favorite" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a specific favorite
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listingKey: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { listingKey } = await params;

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Remove the favorite
    const initialCount = user.likedListings.length;
    user.likedListings = user.likedListings.filter(
      (fav: any) => fav.listingKey !== listingKey
    );

    if (user.likedListings.length === initialCount) {
      return NextResponse.json(
        { error: "Favorite not found" },
        { status: 404 }
      );
    }

    // Update analytics
    if (user.swipeAnalytics) {
      user.swipeAnalytics.totalLikes = user.likedListings.length;
      user.swipeAnalytics.lastUpdated = new Date();
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Favorite removed successfully",
      remainingCount: user.likedListings.length,
    });
  } catch (error) {
    console.error("Error removing favorite:", error);
    return NextResponse.json(
      { error: "Failed to remove favorite" },
      { status: 500 }
    );
  }
}
