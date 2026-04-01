// src/app/api/user/favorites/sync-status/route.ts
// Background sync: check if any favorited listings have changed status
// Moves stale favorites (sold, pending, off-market) to statusChangedListings

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";
import UnifiedListing from "@/models/unified-listing";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const favorites = user.likedListings || [];
    if (favorites.length === 0) {
      return NextResponse.json({ checked: 0, removed: 0, changes: [] });
    }

    // Get all listing keys from favorites
    const listingKeys = favorites.map((f: any) => f.listingKey);

    // Batch query: find current status of all favorited listings
    const currentListings = await UnifiedListing.find(
      { listingKey: { $in: listingKeys } },
      { listingKey: 1, standardStatus: 1, unparsedAddress: 1 }
    ).lean();

    // Build lookup map: listingKey → { status, address }
    const statusMap = new Map<string, { status: string; address?: string }>();
    for (const listing of currentListings) {
      statusMap.set(listing.listingKey, {
        status: listing.standardStatus || "Unknown",
        address: listing.unparsedAddress,
      });
    }

    // Find favorites that need to be moved
    const toRemove: string[] = [];
    const changes: Array<{
      listingKey: string;
      listingData: any;
      originalStatus: string;
      newStatus: string;
      swipedAt: Date;
      detectedAt: Date;
      subdivision?: string;
      city?: string;
      address?: string;
    }> = [];

    for (const fav of favorites) {
      const current = statusMap.get(fav.listingKey);

      if (!current) {
        // Listing no longer in unified_listings — it was closed or removed
        toRemove.push(fav.listingKey);
        changes.push({
          listingKey: fav.listingKey,
          listingData: fav.listingData,
          originalStatus: "Active",
          newStatus: "OffMarket",
          swipedAt: fav.swipedAt,
          detectedAt: new Date(),
          subdivision: fav.subdivision,
          city: fav.city,
          address: fav.listingData?.unparsedAddress || fav.listingData?.address,
        });
      } else if (current.status !== "Active") {
        // Status changed (Pending, Closed, Hold, etc.)
        toRemove.push(fav.listingKey);
        changes.push({
          listingKey: fav.listingKey,
          listingData: fav.listingData,
          originalStatus: "Active",
          newStatus: current.status,
          swipedAt: fav.swipedAt,
          detectedAt: new Date(),
          subdivision: fav.subdivision,
          city: fav.city,
          address: current.address || fav.listingData?.unparsedAddress,
        });
      }
    }

    // Apply changes if any found
    if (changes.length > 0) {
      // Remove stale favorites
      user.likedListings = favorites.filter(
        (f: any) => !toRemove.includes(f.listingKey)
      );

      // Add to statusChangedListings
      if (!user.statusChangedListings) {
        user.statusChangedListings = [];
      }
      user.statusChangedListings.push(...(changes as any[]));

      await user.save();
    }

    return NextResponse.json({
      checked: favorites.length,
      removed: changes.length,
      changes: changes.map((c) => ({
        listingKey: c.listingKey,
        newStatus: c.newStatus,
        address: c.address,
        city: c.city,
      })),
    });
  } catch (error) {
    console.error("[favorites/sync-status] Error:", error);
    return NextResponse.json(
      { error: "Failed to sync favorites status" },
      { status: 500 }
    );
  }
}
