// src/app/api/swipes/user/route.ts
// Get user's swipe data (likes, dislikes, analytics)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/user";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const anonymousId = searchParams.get("anonymousId");

    const session = await getServerSession(authOptions);

    // Must have either session or anonymousId
    if (!session?.user?.email && !anonymousId) {
      return NextResponse.json(
        { error: "No user identification provided" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find user
    let user;
    if (session?.user?.email) {
      user = await User.findOne({ email: session.user.email });
    } else if (anonymousId) {
      user = await User.findOne({ anonymousId });
    }

    if (!user) {
      // Return empty data for new users
      return NextResponse.json({
        likedListings: [],
        dislikedListings: [],
        analytics: {
          totalLikes: 0,
          totalDislikes: 0,
          topSubdivisions: [],
          topCities: [],
          topPropertyTypes: [],
        },
      });
    }

    // Filter out expired dislikes
    const now = new Date();
    const validDislikes = user.dislikedListings.filter(
      (d: any) => new Date(d.expiresAt) > now
    );

    return NextResponse.json({
      likedListings: user.likedListings || [],
      dislikedListings: validDislikes,
      analytics: user.swipeAnalytics || {
        totalLikes: user.likedListings?.length || 0,
        totalDislikes: validDislikes.length,
        topSubdivisions: [],
        topCities: [],
        topPropertyTypes: [],
      },
    });
  } catch (error) {
    console.error("Error fetching user swipes:", error);
    return NextResponse.json(
      { error: "Failed to fetch swipe data" },
      { status: 500 }
    );
  }
}
