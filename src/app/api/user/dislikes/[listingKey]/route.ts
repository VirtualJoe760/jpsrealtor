// src/app/api/user/dislikes/[listingKey]/route.ts
// Add or remove a specific dislike

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

// POST - Add a single dislike
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

    // Check if already disliked
    const exists = user.dislikedListings.some(
      (dislike: any) => dislike.listingKey === listingKey
    );

    if (exists) {
      return NextResponse.json(
        { success: true, message: "Already disliked", alreadyExists: true },
        { status: 200 }
      );
    }

    // Add the dislike with 30-minute TTL
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    user.dislikedListings.push({
      listingKey,
      listingData,
      swipedAt: new Date(),
      expiresAt,
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

    user.swipeAnalytics.totalDislikes = user.dislikedListings.length;
    user.swipeAnalytics.lastUpdated = new Date();

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Dislike added successfully",
      totalCount: user.dislikedListings.length,
      expiresAt,
    });
  } catch (error) {
    console.error("Error adding dislike:", error);
    return NextResponse.json(
      { error: "Failed to add dislike" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a specific dislike
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

    // Remove the dislike
    const initialCount = user.dislikedListings.length;
    user.dislikedListings = user.dislikedListings.filter(
      (dislike: any) => dislike.listingKey !== listingKey
    );

    if (user.dislikedListings.length === initialCount) {
      return NextResponse.json(
        { error: "Dislike not found" },
        { status: 404 }
      );
    }

    // Update analytics
    if (user.swipeAnalytics) {
      user.swipeAnalytics.totalDislikes = user.dislikedListings.length;
      user.swipeAnalytics.lastUpdated = new Date();
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Dislike removed successfully",
      remainingCount: user.dislikedListings.length,
    });
  } catch (error) {
    console.error("Error removing dislike:", error);
    return NextResponse.json(
      { error: "Failed to remove dislike" },
      { status: 500 }
    );
  }
}
