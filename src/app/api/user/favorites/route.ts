// src/app/api/user/favorites/route.ts
// Manage user favorites - sync from client and fetch favorites with analytics

import { NextRequest, NextResponse, after } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import UnifiedListing from "@/models/unified-listing";

// Pick the best photo from OUR synced unified_listings media[] (camelCase uri*
// variants). Prefer the flagged primary photo, then fall back through sizes.
function pickSyncedPhoto(media: any[]): string | undefined {
  if (!Array.isArray(media) || media.length === 0) return undefined;
  const primary = media.find((m) => m?.primary) || media[0];
  return (
    primary?.uri1024 ||
    primary?.uri800 ||
    primary?.uriLarge ||
    primary?.uri640 ||
    primary?.uri1280 ||
    undefined
  );
}

// GET - Fetch user's favorites, enriched against current MLS state.
// Two things happen here, both keyed off the unified_listings join (our synced
// source of truth — which contains ONLY active listings):
//   1. Photos are served from OUR synced media[], not the Spark URL frozen into
//      listingData at swipe time.
//   2. Favorites that are no longer Active (missing from unified_listings, or a
//      non-Active status) are ARCHIVED to statusChangedListings and dropped from
//      the returned list. The archive write runs in the background (after()) so
//      the read stays fast. This makes every fetch self-healing rather than
//      relying on the once-per-session useFavoritesSync job.
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    const email = session.user.email;

    await dbConnect();

    const user = await User.findOne({ email })
      .select('likedListings swipeAnalytics')
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Deduplicate favorites
    const seenKeys = new Set<string>();
    const liked = (user.likedListings || []).filter((fav: any) => {
      if (!fav.listingKey || seenKeys.has(fav.listingKey)) return false;
      seenKeys.add(fav.listingKey);
      return true;
    });

    // Join current MLS state. unified_listings holds ONLY Active listings, so a
    // missing key === off-market / sold / expired.
    const keys = liked.map((f: any) => f.listingKey);
    const current = keys.length
      ? await UnifiedListing.find(
          { listingKey: { $in: keys } },
          { listingKey: 1, standardStatus: 1, listPrice: 1, unparsedAddress: 1, media: 1 }
        ).lean()
      : [];
    const byKey = new Map<string, any>();
    for (const c of current as any[]) byKey.set(c.listingKey, c);

    const favorites: any[] = [];
    const toArchive: any[] = [];

    for (const fav of liked as any[]) {
      const plain = { ...fav };
      const ld = plain.listingData || {};
      const cur = byKey.get(fav.listingKey);

      // Not active anymore → archive + exclude from display.
      if (!cur || cur.standardStatus !== "Active") {
        toArchive.push({
          listingKey: fav.listingKey,
          listingData: fav.listingData,
          originalStatus: "Active",
          newStatus: cur ? (cur.standardStatus || "Unknown") : "OffMarket",
          swipedAt: fav.swipedAt,
          detectedAt: new Date(),
          subdivision: fav.subdivision,
          city: fav.city,
          address: cur?.unparsedAddress || ld.unparsedAddress || ld.address,
        });
        continue;
      }

      // Active → flatten + refresh from our synced source of truth. Photo comes
      // from OUR media[], not the frozen swipe-time Spark URL.
      const syncedPhoto = pickSyncedPhoto(cur.media);
      favorites.push({
        ...ld,
        ...plain,
        listPrice: cur.listPrice ?? plain.listPrice ?? ld.listPrice ?? ld.ListPrice,
        address: plain.address ?? ld.address ?? ld.unparsedAddress ?? cur.unparsedAddress,
        unparsedAddress: cur.unparsedAddress ?? plain.unparsedAddress ?? ld.unparsedAddress ?? ld.UnparsedAddress,
        bedsTotal: plain.bedsTotal ?? ld.bedsTotal ?? ld.BedroomsTotal ?? ld.bedroomsTotal,
        bathroomsTotalInteger: plain.bathroomsTotalInteger ?? ld.bathroomsTotalInteger ?? ld.BathroomsTotalDecimal ?? ld.bathroomsTotalDecimal,
        livingArea: plain.livingArea ?? ld.livingArea ?? ld.LivingArea,
        subdivisionName: plain.subdivisionName ?? plain.subdivision ?? ld.subdivisionName ?? ld.SubdivisionName,
        city: plain.city ?? ld.city ?? ld.City,
        slugAddress: plain.slugAddress ?? ld.slugAddress,
        mlsId: plain.mlsId ?? ld.mlsId,
        mlsSource: plain.mlsSource ?? ld.mlsSource,
        standardStatus: cur.standardStatus,
        primaryPhotoUrl: syncedPhoto ?? plain.primaryPhotoUrl ?? ld.primaryPhotoUrl,
      });
    }

    // Archive expired/off-market favorites in the background (permanent removal
    // from likedListings → statusChangedListings). Mirrors the sync-status job.
    if (toArchive.length > 0) {
      after(async () => {
        try {
          await dbConnect();
          await User.updateOne(
            { email },
            {
              $pull: { likedListings: { listingKey: { $in: toArchive.map((c) => c.listingKey) } } },
              $push: { statusChangedListings: { $each: toArchive } },
            }
          );
        } catch (e) {
          console.error("[favorites GET] background archive failed:", e);
        }
      });
    }

    return NextResponse.json(
      {
        favorites,
        analytics: user.swipeAnalytics || {
          totalLikes: 0,
          totalDislikes: 0,
          topSubdivisions: [],
          topCities: [],
          topPropertySubTypes: [],
        },
        total: favorites.length,
        archived: toArchive.length,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
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

    // Process favorites and extract analytics data. Dedupe by listingKey:
    // this POST REPLACES the whole likedListings array with the client's list,
    // and the client list can carry duplicates (e.g. merged localStorage + DB
    // state). Without this, dupes accumulated in the array — the favorites GET
    // dedupes for display, so the raw array (and the dashboard count + analytics
    // derived from it) drifted above the displayed count. Deduping here both
    // prevents new dupes and self-heals the stored array on the next sync.
    const seenKeys = new Set<string>();
    const processedFavorites = favorites
      .map((listing: any) => ({
        listingKey: listing.listingKey || listing._id,
        listingData: listing,
        swipedAt: new Date(),
        subdivision: listing.subdivisionName,
        city: listing.city,
        propertyType: listing.propertyType,
      }))
      .filter((fav) => {
        if (!fav.listingKey || seenKeys.has(fav.listingKey)) return false;
        seenKeys.add(fav.listingKey);
        return true;
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
