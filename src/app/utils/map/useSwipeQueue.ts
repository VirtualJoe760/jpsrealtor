// src/app/utils/map/useSwipeQueue.ts
// Ultra-simple swipe queue: ONE request, client-side sorting, immediate persistence
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { MapListing } from "@/types/types";
import { getOrCreateFingerprint } from "@/app/utils/fingerprint";
import { trackAddToWishlist } from "@/lib/meta-pixel";

// ============================================================================
// TYPES
// ============================================================================

type QueueItem = {
  listingKey: string;
  slug: string;
  slugAddress?: string;
  latitude: number;
  longitude: number;
  city: string;
  subdivisionName: string | null;
  propertyType: string | null;
  propertySubType: string | null;
  score: number; // Lower is better (higher priority)
  _id?: string;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const SEARCH_RADIUS_MILES = 5; // Get everything within 5 miles in ONE request
const MAX_QUEUE_SIZE = 100; // Limit results to keep it fast

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Haversine distance in miles
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Extract street name from address for micro-neighborhood matching
 */
function extractStreetName(address: string | undefined): string | null {
  if (!address) return null;

  // Remove numbers and unit/apt numbers
  const cleaned = address
    .replace(/^\d+\s+/, '') // Remove leading house number
    .replace(/,.*$/, '') // Remove everything after comma
    .replace(/\s+(Unit|Apt|#|Suite).*$/i, '') // Remove unit numbers
    .trim();

  return cleaned || null;
}

/**
 * Get price bracket for a listing
 * Returns bracket index and label
 */
function getPriceBracket(price: number | undefined): { index: number; label: string } {
  if (!price || price <= 0) return { index: -1, label: "Unknown" };

  if (price < 300000) return { index: 0, label: "$0-299K" };
  if (price < 500000) return { index: 1, label: "$300-499K" };
  if (price < 700000) return { index: 2, label: "$500-699K" };
  if (price < 1000000) return { index: 3, label: "$700-999K" };
  if (price < 1500000) return { index: 4, label: "$1M-1.5M" };
  if (price < 2000000) return { index: 5, label: "$1.5M-2M" };
  if (price < 3000000) return { index: 6, label: "$2M-3M" };
  if (price < 5000000) return { index: 7, label: "$3M-5M" };
  if (price < 10000000) return { index: 8, label: "$5M-10M" };
  return { index: 9, label: "$10M+" };
}

/**
 * Check if two prices are in compatible brackets
 * Same bracket or adjacent brackets (±1) are compatible
 */
function arePricesCompatible(price1: number | undefined, price2: number | undefined): boolean {
  const bracket1 = getPriceBracket(price1);
  const bracket2 = getPriceBracket(price2);

  // Unknown prices are not compatible
  if (bracket1.index === -1 || bracket2.index === -1) return false;

  // Same bracket or adjacent brackets
  const diff = Math.abs(bracket1.index - bracket2.index);
  return diff <= 1;
}

/**
 * Smart priority scoring - lower score = higher priority
 *
 * Priority tiers (ALL subdivisions including "Not Applicable"):
 * 1. Same subdivision + same subtype + same zipcode (0-5)
 * 2. Same subdivision + same subtype + different zipcode (50-55)
 * 3. Same subdivision + different subtype + same zipcode (100-105)
 * 4. Same subdivision + different subtype + different zipcode (150-155)
 * 5. Same city + within 2 miles + same subtype + same zipcode (200-202)
 * 6. Same city + within 5 miles + same subtype + same zipcode (300-305)
 * 7. Same city + within 5 miles + different subtype (400-405)
 *
 * NOTE: "Not Applicable" is now treated as a VALID subdivision name.
 * This groups all non-HOA properties together in the same area.
 */
function calculateScore(
  listing: MapListing,
  reference: {
    subdivision: string | null;
    propertySubType: string | null;
    city: string;
    latitude: number;
    longitude: number;
    postalCode: string;
  }
): number {
  const distance = calculateDistance(
    reference.latitude,
    reference.longitude,
    listing.latitude || 0,
    listing.longitude || 0
  );

  // "Not Applicable" is now a VALID subdivision - no special treatment
  const sameSubdivision =
    listing.subdivisionName &&
    reference.subdivision &&
    listing.subdivisionName.toLowerCase() === reference.subdivision.toLowerCase();

  const sameSubType =
    listing.propertySubType === reference.propertySubType;

  const sameCity =
    listing.city?.toLowerCase() === reference.city.toLowerCase();

  const sameZipCode =
    listing.postalCode === reference.postalCode;

  // Tier 1: Exact match (same subdivision + same subtype + same zipcode)
  if (sameSubdivision && sameSubType && sameCity && sameZipCode) {
    return distance; // 0-5 (distance in miles)
  }

  // Tier 2: Same subdivision + same subtype + different zipcode (cross-zipcode penalty)
  if (sameSubdivision && sameSubType && sameCity) {
    return 50 + distance; // 50-55
  }

  // Tier 3: Same subdivision + different subtype + same zipcode
  if (sameSubdivision && sameCity && sameZipCode) {
    return 100 + distance; // 100-105
  }

  // Tier 4: Same subdivision + different subtype + different zipcode
  if (sameSubdivision && sameCity) {
    return 150 + distance; // 150-155
  }

  // Tier 5: Nearby (2mi) + same subtype + same zipcode
  if (sameCity && distance <= 2 && sameSubType && sameZipCode) {
    return 200 + distance; // 200-202
  }

  // Tier 6: Moderate distance (5mi) + same subtype + same zipcode
  if (sameCity && distance <= 5 && sameSubType && sameZipCode) {
    return 300 + distance; // 300-305
  }

  // Tier 7: Same city + within 5 miles (any subtype, any zipcode)
  if (sameCity && distance <= 5) {
    return 400 + distance; // 400-405
  }

  // Too far or different city - deprioritize
  return 1000 + distance;
}

/**
 * Convert MapListing to QueueItem
 */
function toQueueItem(listing: MapListing, score: number): QueueItem {
  return {
    listingKey: listing.listingKey,
    slug: listing.slugAddress || listing.slug || listing.listingKey,
    slugAddress: listing.slugAddress || listing.slug || listing.listingKey,
    latitude: listing.latitude || 0,
    longitude: listing.longitude || 0,
    city: listing.city || "",
    subdivisionName: listing.subdivisionName || null,
    propertyType: listing.propertyType || null,
    propertySubType: listing.propertySubType || null,
    score,
    _id: listing._id,
  };
}

// ============================================================================
// HOOK INTERFACE
// ============================================================================

export interface SwipeQueueHook {
  initializeQueue: (clickedListing: MapListing) => Promise<void>;
  getNext: () => { listing: QueueItem | null; reason?: string };
  peekNext: (count?: number) => QueueItem[];
  markAsLiked: (listingKey: string, listingData?: any) => void;
  markAsDisliked: (listingKey: string, listingData?: any) => void;
  reset: () => void;
  flushSwipes: () => Promise<void>;
  isReady: boolean;
  isExhausted: boolean;
  queueLength: number;
  isExcluded: (listingKey: string) => boolean;
  currentPhase: number;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useSwipeQueue(): SwipeQueueHook {
  const [isReady, setIsReady] = useState(false);
  const [excludeKeys, setExcludeKeys] = useState<Set<string>>(new Set());
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isExhausted, setIsExhausted] = useState(false);

  const anonymousIdRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

  // ========================================
  // INITIALIZATION
  // ========================================

  useEffect(() => {
    async function initialize() {
      try {
        console.log("🔄 Initializing simple swipe queue...");

        const fingerprint = await getOrCreateFingerprint();
        anonymousIdRef.current = fingerprint;

        // Load exclude keys once
        await loadExcludeKeys();

        setIsReady(true);
        console.log("✅ Swipe queue ready");
      } catch (error) {
        console.error("❌ Failed to initialize:", error);
      }
    }

    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      initialize();
    }
  }, []);

  // ========================================
  // EXCLUDE KEYS
  // ========================================

  const loadExcludeKeys = async () => {
    if (!anonymousIdRef.current) return;

    try {
      const response = await fetch(
        `/api/swipes/exclude-keys?anonymousId=${anonymousIdRef.current}`
      );
      const data = await response.json();

      if (Array.isArray(data.excludeKeys)) {
        setExcludeKeys(new Set(data.excludeKeys));
        console.log("📋 Loaded", data.excludeKeys.length, "exclude keys");
      }
    } catch (error) {
      console.error("❌ Failed to load exclude keys:", error);
    }
  };

  // ========================================
  // SWIPE TRACKING (IMMEDIATE - NO BATCHING)
  // ========================================

  const sendSwipe = async (
    listingKey: string,
    action: "like" | "dislike",
    listingData?: any
  ) => {
    if (!anonymousIdRef.current) return;

    try {
      const response = await fetch("/api/swipes/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonymousId: anonymousIdRef.current,
          swipes: [
            {
              listingKey,
              action,
              listingData,
              timestamp: Date.now(),
            },
          ],
        }),
      });

      if (!response.ok) {
        console.error("❌ Failed to save swipe:", response.status);
      } else {
        console.log(`✅ Swipe saved: ${action} ${listingKey}`);
      }
    } catch (error) {
      console.error("❌ Error sending swipe:", error);
    }
  };

  // ========================================
  // QUEUE INITIALIZATION (ONE REQUEST!)
  // ========================================

  const initializeQueue = useCallback(
    async (clickedListing: MapListing) => {
      console.log("\n" + "=".repeat(80));
      console.log("🎬 INITIALIZING QUEUE (NEW SIMPLE VERSION)");
      console.log("=".repeat(80));
      console.log("Address:", clickedListing.unparsedAddress || clickedListing.address);
      console.log("Subdivision:", clickedListing.subdivisionName || "N/A");
      console.log("SubType:", clickedListing.propertySubType || "N/A");
      console.log("City:", clickedListing.city || "N/A");
      console.log("Postal Code:", clickedListing.postalCode || "N/A");

      const priceBracket = getPriceBracket(clickedListing.listPrice || clickedListing.currentPrice);
      console.log("Price:", `$${(clickedListing.listPrice || clickedListing.currentPrice || 0).toLocaleString()}`, `(${priceBracket.label})`);
      console.log("=".repeat(80) + "\n");

      // Build reference for scoring
      const reference = {
        subdivision: clickedListing.subdivisionName || null,
        propertySubType: clickedListing.propertySubType || null,
        city: clickedListing.city || "",
        latitude: clickedListing.latitude || 0,
        longitude: clickedListing.longitude || 0,
        postalCode: clickedListing.postalCode || "",
        listPrice: clickedListing.listPrice || clickedListing.currentPrice || 0,
      };

      try {
        // ONE request - get everything within 5 miles, same property type, same city
        const params = new URLSearchParams({
          lat: String(reference.latitude),
          lng: String(reference.longitude),
          radius: String(SEARCH_RADIUS_MILES),
          propertyType: clickedListing.propertyType || "A",
          propertySubType: reference.propertySubType || "all",
          city: reference.city,
          limit: String(MAX_QUEUE_SIZE),
        });

        console.log("🌐 Fetching listings with ONE request...");
        const response = await fetch(`/api/mls-listings?${params}`);
        const data = await response.json();

        if (!Array.isArray(data.listings)) {
          console.error("❌ Invalid response from API");
          setIsExhausted(true);
          return;
        }

        console.log(`📦 Received ${data.listings.length} listings from API`);
        console.log(`📋 Exclude keys count: ${excludeKeys.size}`);

        // Debug: Log property types in response
        const subtypeCounts: Record<string, number> = {};
        data.listings.forEach((l: MapListing) => {
          const subtype = l.propertySubType || "Unknown";
          subtypeCounts[subtype] = (subtypeCounts[subtype] || 0) + 1;
        });
        console.log("📊 Property subtypes in API response:", subtypeCounts);

        // Debug: Log all Single Family Residences in response
        const sfrListings = data.listings.filter((l: MapListing) =>
          l.propertySubType === reference.propertySubType
        );
        console.log(`🏠 Found ${sfrListings.length} properties matching type "${reference.propertySubType}"`);

        if (sfrListings.length <= 15) {
          console.log("🏠 All matching properties:");
          sfrListings.forEach((l: MapListing) => {
            const dist = calculateDistance(
              reference.latitude,
              reference.longitude,
              l.latitude || 0,
              l.longitude || 0
            );
            console.log(`  - ${l.unparsedAddress || l.address} (${dist.toFixed(2)}mi, ${l.subdivisionName || 'N/A'})`);
          });
        }

        // Track filtering stats
        let excludedCount = 0;
        let pacasoCount = 0;
        let priceFilteredCount = 0;

        // Filter out excluded listings and score everything client-side
        const scoredItems = data.listings
          .filter((listing: MapListing) => {
            // Exclude already swiped
            if (excludeKeys.has(listing.listingKey)) {
              excludedCount++;
              return false;
            }
            if (listing.listingKey === clickedListing.listingKey) return false;

            // PERMANENTLY EXCLUDE PACASO (Co-Ownership) PROPERTIES
            if (listing.propertySubType?.toLowerCase().includes("co-ownership")) {
              pacasoCount++;
              return false;
            }

            // Filter by price bracket compatibility (same or ±1 bracket)
            const listingPrice = listing.listPrice || listing.currentPrice;
            if (!arePricesCompatible(reference.listPrice, listingPrice)) {
              priceFilteredCount++;
              return false;
            }

            return true;
          })
          .map((listing: MapListing) => {
            const score = calculateScore(listing, reference);
            const distance = calculateDistance(
              reference.latitude,
              reference.longitude,
              listing.latitude || 0,
              listing.longitude || 0
            );

            // Debug log for very close matches
            if (distance <= 1 && listing.propertySubType === reference.propertySubType) {
              console.log(`🎯 Found close match (<1mi, same type):`, {
                address: listing.unparsedAddress || listing.address,
                distance: distance.toFixed(2) + 'mi',
                subtype: listing.propertySubType,
                subdivision: listing.subdivisionName,
                score: score.toFixed(2)
              });
            }

            return toQueueItem(listing, score);
          })
          .sort((a: QueueItem, b: QueueItem) => a.score - b.score) // Lower score = higher priority
          .slice(0, MAX_QUEUE_SIZE);

        // Log filtering stats
        console.log("\n🔍 Filtering Results:");
        console.log(`  Already swiped (excluded): ${excludedCount}`);
        console.log(`  Pacaso (Co-Ownership) filtered: ${pacasoCount}`);
        console.log(`  Price bracket filtered: ${priceFilteredCount}`);
        console.log(`  Total filtered out: ${excludedCount + pacasoCount + priceFilteredCount}`);
        console.log(`  Remaining for queue: ${scoredItems.length}\n`);

        // Log score distribution for debugging
        const tier1 = scoredItems.filter((item: QueueItem) => item.score < 50).length;
        const tier2 = scoredItems.filter((item: QueueItem) => item.score >= 50 && item.score < 100).length;
        const tier3 = scoredItems.filter((item: QueueItem) => item.score >= 100 && item.score < 150).length;
        const tier4 = scoredItems.filter((item: QueueItem) => item.score >= 150 && item.score < 200).length;
        const tier5 = scoredItems.filter((item: QueueItem) => item.score >= 200 && item.score < 300).length;
        const tier6 = scoredItems.filter((item: QueueItem) => item.score >= 300 && item.score < 400).length;
        const tier7 = scoredItems.filter((item: QueueItem) => item.score >= 400).length;

        console.log("📊 Queue Distribution:");
        console.log(`  Tier 1 (Same subdivision + type + zipcode): ${tier1}`);
        console.log(`  Tier 2 (Same subdivision + type, diff zipcode): ${tier2}`);
        console.log(`  Tier 3 (Same subdivision, diff type, same zipcode): ${tier3}`);
        console.log(`  Tier 4 (Same subdivision, diff type, diff zipcode): ${tier4}`);
        console.log(`  Tier 5 (Within 2mi + same type + same zipcode): ${tier5}`);
        console.log(`  Tier 6 (Within 5mi + same type + same zipcode): ${tier6}`);
        console.log(`  Tier 7 (Same city, within 5mi): ${tier7}`);
        console.log(`  Total: ${scoredItems.length}\n`);

        setQueue(scoredItems);
        setIsExhausted(scoredItems.length === 0);

        console.log("✅ Queue initialized with", scoredItems.length, "listings\n");
      } catch (error) {
        console.error("❌ Error initializing queue:", error);
        setIsExhausted(true);
      }
    },
    [excludeKeys]
  );

  // ========================================
  // QUEUE OPERATIONS
  // ========================================

  const getNext = useCallback((): { listing: QueueItem | null; reason?: string } => {
    // Filter out any newly excluded items
    const validQueue = queue.filter(item => !excludeKeys.has(item.listingKey));

    if (validQueue.length === 0) {
      console.log("⚠️ Queue exhausted");
      setIsExhausted(true);
      return { listing: null };
    }

    const next = validQueue[0];

    if (!next) {
      console.log("⚠️ No valid listing found");
      return { listing: null };
    }

    // Determine which tier this listing is from
    let tier = "";
    if (next.score < 100) tier = "Exact Match";
    else if (next.score < 200) tier = "Same Subdivision";
    else if (next.score < 300) tier = "Within 2mi";
    else if (next.score < 400) tier = "Within 5mi";
    else tier = "Extended";

    console.log("\n▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼");
    console.log("➡️  NEXT LISTING");
    console.log("▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼");
    console.log("Address:", next.slug);
    console.log("City:", next.city);
    console.log("Subdivision:", next.subdivisionName || "N/A");
    console.log("SubType:", next.propertySubType || "N/A");
    console.log("Tier:", tier);
    console.log("Score:", next.score.toFixed(2));
    console.log("Remaining:", validQueue.length - 1);
    console.log("▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼\n");

    // Remove from queue
    setQueue(queue.filter(item => item.listingKey !== next.listingKey));

    return { listing: next, reason: tier };
  }, [queue, excludeKeys]);

  const peekNext = useCallback(
    (count: number = 3): QueueItem[] => {
      const validQueue = queue.filter(item => !excludeKeys.has(item.listingKey));
      return validQueue.slice(0, count);
    },
    [queue, excludeKeys]
  );

  const markAsLiked = useCallback(
    (listingKey: string, listingData?: any) => {
      console.log("\n" + "💚".repeat(80));
      console.log("❤️  SWIPED RIGHT (LIKED)");
      console.log("💚".repeat(80));
      console.log("Address:", listingData?.unparsedAddress || listingData?.address || "N/A");
      console.log("Price: $" + (listingData?.listPrice?.toLocaleString() || "N/A"));
      console.log("💚".repeat(80) + "\n");

      // Update local exclude keys immediately
      setExcludeKeys(prev => new Set([...prev, listingKey]));

      // Send to server immediately (no batching)
      sendSwipe(listingKey, "like", listingData);

      // Track analytics
      if (listingData) {
        trackAddToWishlist({
          listingKey,
          address: listingData.unparsedAddress || listingData.streetName,
          price: listingData.listPrice,
          bedrooms: listingData.bedsTotal || listingData.bedroomsTotal,
          bathrooms: listingData.bathroomsTotalInteger,
          city: listingData.city,
          subdivision: listingData.subdivisionName,
        });
      }
    },
    []
  );

  const markAsDisliked = useCallback(
    (listingKey: string, listingData?: any) => {
      console.log("\n" + "💔".repeat(80));
      console.log("👎 SWIPED LEFT (DISLIKED)");
      console.log("💔".repeat(80));
      console.log("Address:", listingData?.unparsedAddress || listingData?.address || "N/A");
      console.log("💔".repeat(80) + "\n");

      // Update local exclude keys immediately
      setExcludeKeys(prev => new Set([...prev, listingKey]));

      // Send to server immediately (no batching)
      sendSwipe(listingKey, "dislike", listingData);
    },
    []
  );

  const reset = useCallback(() => {
    setQueue([]);
    setIsExhausted(false);
    console.log("🔄 Queue reset");
  }, []);

  const isExcluded = useCallback(
    (listingKey: string): boolean => {
      return excludeKeys.has(listingKey);
    },
    [excludeKeys]
  );

  // No-op for compatibility with existing code
  const flushSwipes = useCallback(async () => {
    // No batching - swipes are sent immediately
    console.log("ℹ️  No swipes to flush (immediate mode)");
  }, []);

  // ========================================
  // RETURN
  // ========================================

  return {
    initializeQueue,
    getNext,
    peekNext,
    markAsLiked,
    markAsDisliked,
    reset,
    flushSwipes,
    isReady,
    isExhausted,
    queueLength: queue.length,
    isExcluded,
    currentPhase: 1, // No phases anymore, but kept for compatibility
  };
}
