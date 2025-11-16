// src/app/api/activity/update-user-metrics/route.ts
// Update user activity metrics (called after favorites, searches, etc.)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/user";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { anonymousId, timestamp } = body;

    await dbConnect();

    // Try to find user by session or anonymousId
    const session = await getServerSession(authOptions);
    let user = null;

    if (session?.user?.email) {
      user = await User.findOne({ email: session.user.email });
    } else if (anonymousId) {
      user = await User.findOne({ anonymousId });
    }

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" });
    }

    // Calculate engagement score based on activity
    const totalFavorites = user.likedListings?.length || 0;
    const totalSessions = user.activityMetrics?.totalSessions || 0;
    const totalSearches = user.activityMetrics?.totalSearches || 0;
    const totalListingsViewed = user.activityMetrics?.totalListingsViewed || 0;

    // Simple engagement score formula (0-100)
    // Weighs favorites heavily, then searches, then views
    const favoritesScore = Math.min(totalFavorites * 5, 50); // Max 50 points
    const searchesScore = Math.min(totalSearches * 2, 25); // Max 25 points
    const viewsScore = Math.min(totalListingsViewed * 0.5, 15); // Max 15 points
    const sessionScore = Math.min(totalSessions, 10); // Max 10 points

    const engagementScore = Math.min(
      Math.round(favoritesScore + searchesScore + viewsScore + sessionScore),
      100
    );

    // Update user metrics
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          "activityMetrics.totalFavorites": totalFavorites,
          "activityMetrics.lastActivityAt": new Date(timestamp),
          "activityMetrics.engagementScore": engagementScore,
        },
      }
    );

    return NextResponse.json({
      success: true,
      engagementScore,
    });
  } catch (error) {
    console.error("Error updating user metrics:", error);
    return NextResponse.json(
      { error: "Failed to update user metrics" },
      { status: 500 }
    );
  }
}
