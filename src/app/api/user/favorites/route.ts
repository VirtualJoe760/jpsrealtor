// src/app/api/user/favorites/route.ts
// Manage user favorites - sync from client and fetch favorites with analytics

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import UnifiedListing from "@/models/unified-listing";
import { normalizeSubdivisionName } from "@/app/utils/subdivisionUtils";

// GET - Fetch user's favorites with fresh MLS data
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

    const user = await User.findOne({ email: session.user.email })
      .select('likedListings swipeAnalytics')
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const likedListings = user.likedListings || [];

    if (likedListings.length === 0) {
      return NextResponse.json({
        favorites: [],
        analytics: user.swipeAnalytics || {
          totalLikes: 0,
          totalDislikes: 0,
          topSubdivisions: [],
          topCities: [],
          topPropertySubTypes: [],
        },
        total: 0,
        stale: 0,
        missing: 0,
      });
    }

    console.log(`[GET /api/user/favorites] Processing ${likedListings.length} favorites for ${session.user.email}`);

    // Get all listing keys
    const listingKeys = likedListings.map((item: any) => item.listingKey);

    // Fetch fresh data from UnifiedListing in ONE batch query
    // NOTE: Excluding primaryPhotoUrl - we ALWAYS fetch photos from Spark API via ListingPhoto component
    const freshListings = await UnifiedListing.find({
      listingKey: { $in: listingKeys }
    })
    .select('listingKey mlsId mlsSource address unparsedAddress listPrice bedsTotal bathroomsTotal bathroomsTotalInteger livingArea lotSizeArea subdivisionName city county propertySubType yearBuilt daysOnMarket status slugAddress publicRemarks')
    .lean();

    console.log(`[GET /api/user/favorites] Found ${freshListings.length} listings in UnifiedListing`);

    // Create lookup map for fast access
    const freshDataMap = new Map(
      freshListings.map((listing: any) => [listing.listingKey, listing])
    );

    // Build clean favorites array
    let staleCount = 0;
    let missingCount = 0;

    const favoritesWithDuplicates = likedListings.map((cachedListing: any) => {
      const fresh = freshDataMap.get(cachedListing.listingKey);
      const cachedData = cachedListing.listingData || {};

      if (!fresh) {
        // Listing not in UnifiedListing - likely removed from market
        missingCount++;

        // Return cached data with metadata stripped and stale flags
        const { _id, __v, __parentArray, ...cleanCachedData } = cachedData;

        return {
          ...cleanCachedData,
          listingKey: cachedListing.listingKey,
          swipedAt: cachedListing.swipedAt,
          _stale: true,
          _missing: true,
          status: 'Removed',
        };
      }

      // Check if data is stale
      const isStale = cachedData.mlsId !== fresh.mlsId ||
                      cachedData.listPrice !== fresh.listPrice ||
                      cachedData.status !== fresh.status;

      if (isStale) {
        staleCount++;
      }

      // Return fresh data (UnifiedListing is source of truth)
      // Remove MongoDB metadata from fresh listing too
      const { _id, __v, ...cleanFreshData } = fresh;

      return {
        // Fresh data from UnifiedListing (already clean)
        ...cleanFreshData,

        // Metadata from cached data
        swipedAt: cachedListing.swipedAt,

        // Flags
        _stale: isStale,
        _missing: false,
      };
    });

    // Deduplicate favorites (user may have same listing saved multiple times)
    const seenKeys = new Set<string>();
    const favorites = favoritesWithDuplicates.filter((fav: any) => {
      if (seenKeys.has(fav.listingKey)) {
        console.log(`[GET /api/user/favorites] ⚠️ Removing duplicate: ${fav.listingKey}`);
        return false;
      }
      seenKeys.add(fav.listingKey);
      return true;
    });

    const duplicateCount = favoritesWithDuplicates.length - favorites.length;

    console.log(`[GET /api/user/favorites] Returning ${favorites.length} favorites (${staleCount} stale, ${missingCount} missing, ${duplicateCount} duplicates removed)`);
    console.log(`[GET /api/user/favorites] Photos will be fetched dynamically from Spark API via ListingPhoto component`);

    return NextResponse.json({
      favorites,
      analytics: user.swipeAnalytics || {
        totalLikes: 0,
        totalDislikes: 0,
        topSubdivisions: [],
        topCities: [],
        topPropertySubTypes: [],
      },
      total: favorites.length,
      stale: staleCount,
      missing: missingCount,
    }, {
      headers: {
        // Cache for 30 seconds
        'Cache-Control': 'private, max-age=30',
      }
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
    const processedFavorites = favorites.map((listing: any) => {
      // Normalize subdivision name (converts "Not Applicable" to "{City} Non-HOA")
      const normalizedSubdivision = normalizeSubdivisionName(
        listing.subdivisionName,
        listing.city || ''
      );

      return {
        listingKey: listing.listingKey || listing._id,
        listingData: listing,
        swipedAt: new Date(),
        subdivision: normalizedSubdivision,
        city: listing.city,
        propertyType: listing.propertyType,
      };
    });

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
    const rawSubdivision = fav.subdivision || fav.listingData?.subdivisionName;
    const city = fav.city || fav.listingData?.city;
    const propertySubType = fav.propertySubType || fav.listingData?.propertySubType;

    // Normalize subdivision name (handles legacy "Not Applicable" values)
    const subdivision = city ? normalizeSubdivisionName(rawSubdivision, city) : rawSubdivision;

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
