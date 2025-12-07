// src/app/api/user/dislikes/route.ts
// Manage user dislikes - fetch and clear all dislikes

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/user";

// GET - Fetch user's dislikes
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

    // Filter out expired dislikes (30 minute TTL)
    const now = new Date();
    const validDislikes = (user.dislikedListings || []).filter(
      (dislike: any) => new Date(dislike.expiresAt) > now
    );

    // Update user if we filtered any expired dislikes
    if (validDislikes.length !== user.dislikedListings.length) {
      user.dislikedListings = validDislikes;
      await user.save();
    }

    return NextResponse.json({
      dislikes: validDislikes,
    });
  } catch (error) {
    console.error("Error fetching dislikes:", error);
    return NextResponse.json(
      { error: "Failed to fetch dislikes" },
      { status: 500 }
    );
  }
}

// DELETE - Clear all dislikes
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

    // Clear all dislikes
    user.dislikedListings = [];

    // Update analytics
    if (user.swipeAnalytics) {
      user.swipeAnalytics.totalDislikes = 0;
      user.swipeAnalytics.lastUpdated = new Date();
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: "All dislikes cleared"
    });
  } catch (error) {
    console.error("Error clearing dislikes:", error);
    return NextResponse.json(
      { error: "Failed to clear dislikes" },
      { status: 500 }
    );
  }
}
