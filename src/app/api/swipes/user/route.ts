// src/app/api/swipes/user/route.ts
// Get user's swipe data (likes, dislikes, analytics)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import UnifiedListing from "@/models/unified-listing";

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
          topPropertySubTypes: [],
        },
      });
    }

    // Filter out expired dislikes
    const now = new Date();
    const validDislikes = user.dislikedListings.filter(
      (d: any) => new Date(d.expiresAt) > now
    );

    // Enrich favorites with fresh MLS data in ONE batch query
    const likedListings = user.likedListings || [];
    const listingKeys = likedListings.map((item: any) => item.listingKey);

    console.log(`[swipes/user] Enriching ${likedListings.length} favorites`);

    // Fetch fresh mlsId, mlsSource, primaryPhotoUrl for all favorites at once
    const freshListings = await UnifiedListing.find({
      listingKey: { $in: listingKeys }
    })
    .select('listingKey mlsId mlsSource primaryPhotoUrl')
    .lean();

    console.log(`[swipes/user] Found ${freshListings.length} listings in UnifiedListing`);

    // Create a lookup map for fast access
    const freshDataMap = new Map(
      freshListings.map((listing: any) => [listing.listingKey, listing])
    );

    // Enrich cached data with fresh MLS info
    // IMPORTANT: Only update listingData nested object
    // The client-side flattens it: {...item.listingData, listingKey, swipedAt}
    const enrichedListings = likedListings.map((cachedListing: any) => {
      const fresh = freshDataMap.get(cachedListing.listingKey);

      if (!fresh) {
        // Listing no longer exists - mark for removal by nulling MLS data
        return {
          ...cachedListing,
          listingData: {
            ...cachedListing.listingData,
            mlsId: null,
            mlsSource: null,
            primaryPhotoUrl: null,
          },
        };
      }

      // Update ONLY listingData with fresh MLS data
      // Client will flatten this: {...item.listingData, ...}
      return {
        ...cachedListing,
        listingData: {
          ...cachedListing.listingData,
          mlsId: fresh.mlsId,
          mlsSource: fresh.mlsSource,
          primaryPhotoUrl: fresh.primaryPhotoUrl,
        },
      };
    });

    console.log(`[swipes/user] Returning ${enrichedListings.length} enriched favorites`);
    console.log(`[swipes/user] Sample:`, JSON.stringify(enrichedListings[0], null, 2).substring(0, 500));

    return NextResponse.json({
      likedListings: enrichedListings,
      dislikedListings: validDislikes,
      analytics: user.swipeAnalytics || {
        totalLikes: enrichedListings.length,
        totalDislikes: validDislikes.length,
        topSubdivisions: [],
        topCities: [],
        topPropertySubTypes: [],
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
