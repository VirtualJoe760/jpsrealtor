// src/app/api/activity/search/route.ts
// Track search activity for analytics

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/user";
import { SearchActivity } from "@/models/user-activity";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sessionId,
      anonymousId,
      queryText,
      filters,
      resultsCount,
      deviceType,
      source,
      timestamp,
    } = body;

    if (!sessionId || !anonymousId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get session to link userId if logged in
    const session = await getServerSession(authOptions);
    let userId = null;

    if (session?.user?.email) {
      const user = await User.findOne({ email: session.user.email });
      if (user) {
        userId = user._id;

        // Update user activity metrics
        await User.updateOne(
          { _id: user._id },
          {
            $inc: { "activityMetrics.totalSearches": 1 },
            $set: {
              "activityMetrics.lastActivityAt": new Date(timestamp),
            },
          }
        );
      }
    }

    // Create search activity record
    await SearchActivity.create({
      userId,
      anonymousId,
      sessionId,
      queryText,
      filters: filters || {},
      resultsCount: resultsCount || 0,
      resultsViewed: 0, // Will be updated when they view listings
      timeSpent: 0, // Will be updated
      deviceType,
      source,
      timestamp: new Date(timestamp),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error tracking search:", error);
    return NextResponse.json(
      { error: "Failed to track search" },
      { status: 500 }
    );
  }
}
