// src/app/api/swipes/exclude-keys/route.ts
// Fast endpoint to get listing keys to exclude from queue

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const anonymousId = searchParams.get("anonymousId");

    const session = await getServerSession(authOptions);

    // Must have either session or anonymousId
    if (!session?.user?.email && !anonymousId) {
      return NextResponse.json({ excludeKeys: [] });
    }

    await dbConnect();

    // Find user
    let user;
    if (session?.user?.email) {
      user = await User.findOne({ email: session.user.email })
        .select('likedListings dislikedListings') // Only fetch what we need
        .lean(); // Convert to plain object for performance
    } else if (anonymousId) {
      user = await User.findOne({ anonymousId })
        .select('likedListings dislikedListings')
        .lean();
    }

    if (!user) {
      return NextResponse.json({ excludeKeys: [] });
    }

    // Get liked keys
    const likedKeys = (user.likedListings || []).map((item: any) => item.listingKey);

    // Get valid disliked keys (not expired)
    const now = new Date();
    const dislikedKeys = (user.dislikedListings || [])
      .filter((d: any) => new Date(d.expiresAt) > now)
      .map((d: any) => d.listingKey);

    // Combine and deduplicate
    const excludeKeys = [...new Set([...likedKeys, ...dislikedKeys])];

    return NextResponse.json({ excludeKeys });
  } catch (error) {
    console.error("Error fetching exclude keys:", error);
    return NextResponse.json({ excludeKeys: [] });
  }
}
