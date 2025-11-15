// src/app/utils/map/useSwipeQueue.ts
// Intelligent swipe queue with machine learning and user personalization
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { MapListing } from "@/types/types";
import { getOrCreateFingerprint } from "@/app/utils/fingerprint";
import { trackAddToWishlist } from "@/lib/meta-pixel";

type SwipeAction = {
  listingKey: string;
  action: "like" | "dislike";
  listingData?: any;
  timestamp: number;
};

type QueueContext = {
  subdivision?: string;
  propertyType?: string; // A/B/C (Sale/Lease/Income) - ALWAYS maintained
  propertySubType?: string; // Single Family, Condo, Townhome, etc.
  city?: string;
  latitude?: number;
  longitude?: number;
  price?: number;
};

type QueuedListing = {
  listing: MapListing;
  reason: string; // Why we're showing this
  priority: number;
  score: number; // Relevance score
};

type UserPreferences = {
  priceRange?: { min: number; max: number };
  favoriteSubdivisions: string[];
  favoriteCities: string[];
  favoriteSubTypes: string[];
  avgPrice?: number;
};

const BATCH_SIZE = 10;
const BATCH_TIMEOUT_MS = 2 * 60 * 1000;
const MIN_QUEUE_SIZE = 5;
const MAX_QUEUE_SIZE = 15; // Optimized: Reduced from 20 for faster loading
const PRICE_TOLERANCE = 0.3; // 30% price range tolerance

export function useSwipeQueue() {
  // Swipe batch state
  const [isReady, setIsReady] = useState(false);
  const [excludeKeys, setExcludeKeys] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Update Set whenever excludeKeys changes for O(1) lookups
  useEffect(() => {
    excludeKeysSetRef.current = new Set(excludeKeys);
  }, [excludeKeys]);

  // Queue state
  const [queue, setQueue] = useState<QueuedListing[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [isExhausted, setIsExhausted] = useState(false);
  const [currentPriority, setCurrentPriority] = useState(1);
  const [queueContext, setQueueContext] = useState<QueueContext | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    favoriteSubdivisions: [],
    favoriteCities: [],
    favoriteSubTypes: [],
  });
  const [undoStack, setUndoStack] = useState<Array<{ listingKey: string; action: "like" | "dislike" }>>([]);

  // Refs
  const anonymousIdRef = useRef<string | null>(null);
  const pendingSwipesRef = useRef<SwipeAction[]>([]);
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fetchingRef = useRef(false);
  const isInitializedRef = useRef(false);

  // Performance optimization refs
  const scoreCacheRef = useRef<Map<string, number>>(new Map());
  const resultCacheRef = useRef<Map<string, { listings: MapListing[]; reason: string; timestamp: number }>>(new Map());
  const CACHE_TTL = 30000; // 30 seconds cache
  const excludeKeysSetRef = useRef<Set<string>>(new Set());
  const bufferQueueRef = useRef<QueuedListing[]>([]); // Buffer for faster refills

  // ========================================
  // INITIALIZATION
  // ========================================

  useEffect(() => {
    async function initialize() {
      try {
        console.log("🔄 Initializing intelligent swipe queue system...");

        const fingerprint = await getOrCreateFingerprint();
        anonymousIdRef.current = fingerprint;
        console.log("🔑 Browser fingerprint:", fingerprint);

        await refreshExcludeKeys();
        await loadUserPreferences();
        console.log("✅ Intelligent swipe queue ready");

        setIsReady(true);
      } catch (error) {
        console.error("❌ Failed to initialize:", error);
        setIsReady(true);
      }
    }

    initialize();
  }, []);

  // ========================================
  // USER PREFERENCES & ANALYTICS
  // ========================================

  const loadUserPreferences = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (anonymousIdRef.current) {
        params.set("anonymousId", anonymousIdRef.current);
      }

      const response = await fetch(`/api/swipes/user?${params.toString()}`);
      const data = await response.json();

      if (data.analytics && data.likedListings?.length > 0) {
        // Calculate price range from liked listings
        const prices = data.likedListings
          .map((l: any) => l.listingData?.ListPrice || l.listingData?.price)
          .filter((p: number) => p > 0);

        let prefs: UserPreferences = {
          favoriteSubdivisions: data.analytics.topSubdivisions?.slice(0, 5) || [],
          favoriteCities: data.analytics.topCities?.slice(0, 5) || [],
          favoriteSubTypes: data.analytics.topPropertyTypes?.slice(0, 3) || [],
        };

        if (prices.length > 0) {
          const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);

          prefs.avgPrice = avgPrice;
          prefs.priceRange = {
            min: Math.max(0, minPrice * 0.7), // 30% below minimum
            max: maxPrice * 1.3, // 30% above maximum
          };

          console.log("📊 Learned user preferences:");
          console.log(`   💰 Price Range: $${prefs.priceRange.min.toLocaleString()} - $${prefs.priceRange.max.toLocaleString()}`);
          console.log(`   🏘️  Favorite Subdivisions: ${prefs.favoriteSubdivisions.join(", ")}`);
          console.log(`   📍 Favorite Cities: ${prefs.favoriteCities.join(", ")}`);
          console.log(`   🏠 Favorite Types: ${prefs.favoriteSubTypes.join(", ")}`);
        }

        setUserPreferences(prefs);
      }
    } catch (error) {
      console.error("❌ Failed to load user preferences:", error);
    }
  }, []);

  // ========================================
  // EXCLUDE KEYS MANAGEMENT
  // ========================================

  const refreshExcludeKeys = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (anonymousIdRef.current) {
        params.set("anonymousId", anonymousIdRef.current);
      }

      const response = await fetch(`/api/swipes/exclude-keys?${params.toString()}`);
      const data = await response.json();

      console.log(`📋 Loaded ${data.excludeKeys?.length || 0} exclude keys from database`);
      setExcludeKeys(data.excludeKeys || []);
    } catch (error) {
      console.error("❌ Failed to refresh exclude keys:", error);
    }
  }, []);

  // ========================================
  // SWIPE BATCH MANAGEMENT
  // ========================================

  const flushSwipes = useCallback(async () => {
    if (pendingSwipesRef.current.length === 0) {
      return;
    }

    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
      batchTimerRef.current = null;
    }

    const swipesToSync = [...pendingSwipesRef.current];
    pendingSwipesRef.current = [];

    console.log(`🚀 Flushing ${swipesToSync.length} swipes to database...`);
    setIsSyncing(true);

    try {
      const payload = {
        swipes: swipesToSync,
        anonymousId: anonymousIdRef.current,
      };

      const response = await fetch("/api/swipes/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to sync swipes: ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Synced swipes successfully");

      await refreshExcludeKeys();
      await loadUserPreferences(); // Reload preferences after new swipes
    } catch (error) {
      console.error("❌ Failed to sync swipes:", error);
      pendingSwipesRef.current = [...swipesToSync, ...pendingSwipesRef.current];
    } finally {
      setIsSyncing(false);
    }
  }, [refreshExcludeKeys, loadUserPreferences]);

  const startBatchTimer = useCallback(() => {
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
    }

    batchTimerRef.current = setTimeout(() => {
      console.log("⏰ Batch timer expired - flushing swipes");
      flushSwipes();
    }, BATCH_TIMEOUT_MS);
  }, [flushSwipes]);

  const addSwipe = useCallback((
    listingKey: string,
    action: "like" | "dislike",
    listingData?: any
  ) => {
    const swipe: SwipeAction = {
      listingKey,
      action,
      listingData,
      timestamp: Date.now(),
    };

    pendingSwipesRef.current.push(swipe);
    console.log(`📝 Added ${action} for ${listingKey}`);

    // Optimistically update exclude keys
    setExcludeKeys(prev => {
      if (prev.includes(listingKey)) return prev;
      return [...prev, listingKey];
    });

    if (pendingSwipesRef.current.length === 1) {
      startBatchTimer();
    }

    if (pendingSwipesRef.current.length >= BATCH_SIZE) {
      console.log(`🚀 Batch size reached - flushing immediately`);
      flushSwipes();
    }
  }, [startBatchTimer, flushSwipes]);

  // ========================================
  // INTELLIGENT QUEUE BUILDING
  // ========================================

  const scoreListing = useCallback((listing: MapListing, ctx: QueueContext): number => {
    // Check cache first - MASSIVE performance boost
    const cacheKey = `${listing.listingKey}-${ctx.subdivision}-${ctx.city}-${userPreferences.priceRange?.min}-${userPreferences.priceRange?.max}`;
    const cached = scoreCacheRef.current.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    let score = 100;

    // Price matching (very important)
    if (userPreferences.priceRange && listing.listPrice) {
      const inRange = listing.listPrice >= userPreferences.priceRange.min &&
                      listing.listPrice <= userPreferences.priceRange.max;
      if (inRange) {
        score += 50;

        // Bonus for being close to average
        if (userPreferences.avgPrice) {
          const priceDiff = Math.abs(listing.listPrice - userPreferences.avgPrice);
          const diffRatio = priceDiff / userPreferences.avgPrice;
          score += Math.max(0, 30 * (1 - diffRatio)); // Up to 30 bonus points
        }
      } else {
        score -= 40; // Penalty for out of range
      }
    }

    // Subdivision matching
    if (listing.subdivisionName && ctx.subdivision) {
      if (listing.subdivisionName === ctx.subdivision) {
        score += 40;
      } else if (userPreferences.favoriteSubdivisions.includes(listing.subdivisionName)) {
        score += 25; // User has liked this subdivision before
      }
    }

    // City matching
    if (listing.city) {
      if (listing.city === ctx.city) {
        score += 30;
      } else if (userPreferences.favoriteCities.includes(listing.city)) {
        score += 15; // User has liked this city before
      }
    }

    // Property subtype matching
    if (listing.propertySubType && ctx.propertySubType) {
      if (listing.propertySubType === ctx.propertySubType) {
        score += 35;
      } else if (userPreferences.favoriteSubTypes.includes(listing.propertySubType)) {
        score += 20; // User has liked this subtype before
      }
    }

    // Geographic proximity
    if (ctx.latitude && ctx.longitude && listing.latitude && listing.longitude) {
      const distance = calculateDistance(
        ctx.latitude, ctx.longitude,
        listing.latitude, listing.longitude
      );

      if (distance < 1) score += 25; // Within 1 mile
      else if (distance < 2) score += 15; // Within 2 miles
      else if (distance < 5) score += 5; // Within 5 miles
    }

    // Cache the result
    scoreCacheRef.current.set(cacheKey, score);

    // Limit cache size to prevent memory leaks
    if (scoreCacheRef.current.size > 1000) {
      const firstKey = scoreCacheRef.current.keys().next().value;
      if (firstKey) scoreCacheRef.current.delete(firstKey);
    }

    return score;
  }, [userPreferences]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const buildIntelligentQuery = useCallback(async (
    ctx: QueueContext,
    strategy: 'exact' | 'similar' | 'personalized' | 'explore'
  ): Promise<{listings: MapListing[], reason: string}> => {
    // Check cache first
    const cacheKey = `${strategy}-${ctx.subdivision}-${ctx.city}-${ctx.propertyType}-${ctx.propertySubType}-${excludeKeys.length}`;
    const cached = resultCacheRef.current.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`   ⚡ Cache hit for ${strategy} strategy`);
      return { listings: cached.listings, reason: cached.reason };
    }

    const params = new URLSearchParams();

    // ALWAYS filter by property type
    if (ctx.propertyType) {
      params.set("propertyType", ctx.propertyType);
    }

    // Always exclude already swiped
    if (excludeKeys.length > 0) {
      params.set("excludeKeys", excludeKeys.join(","));
    }

    const isNonHOA = ctx.subdivision &&
      (ctx.subdivision.toLowerCase() === "not applicable" ||
       ctx.subdivision.toLowerCase() === "other");

    let reasonTemplate = "";

    switch (strategy) {
      case 'exact':
        // Exact matches
        if (!isNonHOA && ctx.subdivision && ctx.propertySubType) {
          // HOA property - exact subdivision match
          params.set("subdivision", ctx.subdivision);
          params.set("propertySubType", ctx.propertySubType);
          params.set("limit", "50");
          reasonTemplate = `${ctx.subdivision} • ${ctx.propertySubType}`;
        } else if (isNonHOA && ctx.latitude && ctx.longitude && ctx.propertySubType) {
          // Non-HOA - nearby same subtype (tight 1-mile radius) + ONLY Non-HOA
          params.set("lat", ctx.latitude.toString());
          params.set("lng", ctx.longitude.toString());
          params.set("radius", "1"); // Tight radius for Non-HOA
          params.set("propertySubType", ctx.propertySubType);
          params.set("subdivision", "Not Applicable"); // FILTER: Only Non-HOA properties
          params.set("limit", "50");
          reasonTemplate = `Non-HOA nearby ${ctx.city} • ${ctx.propertySubType}`;
        }
        break;

      case 'similar':
        // Similar properties
        if (!isNonHOA && ctx.subdivision) {
          // HOA - same subdivision, any subtype
          params.set("subdivision", ctx.subdivision);
          params.set("limit", "30");
          reasonTemplate = `Similar in ${ctx.subdivision}`;
        } else if (isNonHOA && ctx.latitude && ctx.longitude) {
          // Non-HOA - 2-mile radius, any subtype, ONLY Non-HOA
          params.set("lat", ctx.latitude.toString());
          params.set("lng", ctx.longitude.toString());
          params.set("radius", "2");
          params.set("subdivision", "Not Applicable"); // FILTER: Only Non-HOA properties
          if (ctx.propertySubType) {
            params.set("propertySubType", ctx.propertySubType);
          }
          params.set("limit", "30");
          reasonTemplate = `Non-HOA within 2 miles • ${ctx.city}`;
        }
        break;

      case 'personalized':
        // Skip personalized for first swipe session (no data yet)
        if (userPreferences.favoriteSubdivisions.length > 0 && userPreferences.favoriteSubdivisions[0]) {
          params.set("subdivision", userPreferences.favoriteSubdivisions[0]);
          if (ctx.propertySubType) {
            params.set("propertySubType", ctx.propertySubType);
          }
          params.set("limit", "15");
          reasonTemplate = `You liked ${userPreferences.favoriteSubdivisions[0]}`;
        } else if (userPreferences.favoriteCities.length > 0 && userPreferences.favoriteCities[0]) {
          params.set("city", userPreferences.favoriteCities[0]);
          if (ctx.propertySubType) {
            params.set("propertySubType", ctx.propertySubType);
          }
          params.set("limit", "15");
          reasonTemplate = `You liked ${userPreferences.favoriteCities[0]}`;
        } else {
          // No preferences yet, skip this strategy
          return { listings: [], reason: "" };
        }
        break;

      case 'explore':
        // Geographic exploration
        if (ctx.latitude && ctx.longitude) {
          params.set("lat", ctx.latitude.toString());
          params.set("lng", ctx.longitude.toString());
          params.set("radius", "5");

          // If starting from Non-HOA, only show other Non-HOA properties
          if (isNonHOA) {
            params.set("subdivision", "Not Applicable");
          }

          if (ctx.propertySubType) {
            params.set("propertySubType", ctx.propertySubType);
          }
          params.set("limit", "25");
          reasonTemplate = isNonHOA
            ? `Non-HOA within 5 miles • ${ctx.city}`
            : `Nearby area • ${ctx.propertySubType || 'Similar'}`;
        }
        break;
    }

    // Add price filter if we have user preferences
    if (userPreferences.priceRange) {
      params.set("minPrice", Math.floor(userPreferences.priceRange.min).toString());
      params.set("maxPrice", Math.ceil(userPreferences.priceRange.max).toString());
    }

    if (!params.toString() || params.toString() === `excludeKeys=${params.get("excludeKeys")}`) {
      return { listings: [], reason: reasonTemplate };
    }

    try {
      const response = await fetch(`/api/mls-listings?${params.toString()}`);
      const data = await response.json();
      const result = { listings: data.listings || [], reason: reasonTemplate };

      // Cache the result
      resultCacheRef.current.set(cacheKey, {
        ...result,
        timestamp: Date.now()
      });

      // Limit cache size
      if (resultCacheRef.current.size > 20) {
        const firstKey = resultCacheRef.current.keys().next().value;
        if (firstKey) resultCacheRef.current.delete(firstKey);
      }

      return result;
    } catch (error) {
      console.error("❌ Failed to fetch listings:", error);
      return { listings: [], reason: reasonTemplate };
    }
  }, [excludeKeys, userPreferences]);

  const buildDiverseQueue = useCallback(async (ctx: QueueContext): Promise<QueuedListing[]> => {
    const startTime = performance.now();
    console.log("\n🎯 Building intelligent queue...");

    const [exactResult, similarResult, personalizedResult, exploreResult] = await Promise.all([
      buildIntelligentQuery(ctx, 'exact'),
      buildIntelligentQuery(ctx, 'similar'),
      buildIntelligentQuery(ctx, 'personalized'),
      buildIntelligentQuery(ctx, 'explore'),
    ]);

    console.log(`   📊 Fetched: ${exactResult.listings.length} exact, ${similarResult.listings.length} similar, ${personalizedResult.listings.length} personalized, ${exploreResult.listings.length} explore`);

    // Use Set for O(1) duplicate detection instead of array.find() O(n)
    const seenKeys = new Set<string>();
    const allListings: QueuedListing[] = [];

    // Helper function to add listings without duplicates
    const addListings = (listings: MapListing[], reason: string, priority: number, scoreBonus: number) => {
      for (const listing of listings) {
        if (!seenKeys.has(listing.listingKey)) {
          seenKeys.add(listing.listingKey);
          allListings.push({
            listing,
            reason,
            priority,
            score: scoreListing(listing, ctx) + scoreBonus,
          });
        }
      }
    };

    // Add listings by priority with bonuses
    addListings(
      exactResult.listings,
      exactResult.reason || `${ctx.subdivision || ctx.city} • ${ctx.propertySubType}`,
      1,
      100
    );

    addListings(
      similarResult.listings,
      similarResult.reason || `Similar in ${ctx.subdivision || ctx.city}`,
      2,
      50
    );

    addListings(
      personalizedResult.listings,
      personalizedResult.reason || `Based on your preferences`,
      3,
      30
    );

    addListings(
      exploreResult.listings,
      exploreResult.reason || `Nearby area`,
      4,
      0
    );

    // Sort by score (highest first)
    allListings.sort((a, b) => b.score - a.score);

    const endTime = performance.now();
    const buildTime = (endTime - startTime).toFixed(0);

    console.log(`   ✅ Built queue with ${allListings.length} listings in ${buildTime}ms`);
    if (allListings.length > 0) {
      console.log(`   🏆 Top 3 scores: ${allListings.slice(0, 3).map(q => q.score).join(", ")}`);
    }

    return allListings;
  }, [buildIntelligentQuery, scoreListing]);

  // ========================================
  // QUEUE MANAGEMENT
  // ========================================

  const initializeQueue = useCallback(
    async (listing: MapListing) => {
      if (isInitializedRef.current) {
        console.log("⏭️ Queue already initialized, skipping re-initialization");
        return;
      }

      const ctx: QueueContext = {
        subdivision: listing.subdivisionName || undefined,
        propertyType: listing.propertyType || undefined,
        propertySubType: listing.propertySubType || undefined,
        city: listing.city || undefined,
        latitude: listing.latitude,
        longitude: listing.longitude,
        price: listing.listPrice,
      };

      console.log("\n" + "=".repeat(80));
      console.log("🎬 INTELLIGENT SWIPE QUEUE INITIALIZATION");
      console.log("=".repeat(80));
      console.log("📍 CLICKED LISTING:");
      console.log(`   Address: ${listing.address || listing.unparsedAddress || 'N/A'}`);
      console.log(`   Listing Key: ${listing.listingKey}`);
      console.log(`   Subdivision: ${listing.subdivisionName || 'Not Applicable'}`);
      console.log(`   Property Type: ${listing.propertyType} (${listing.propertyType === 'A' ? 'Sale' : listing.propertyType === 'B' ? 'Lease' : 'Income'})`);
      console.log(`   Property SubType: ${listing.propertySubType || 'N/A'}`);
      console.log(`   City: ${listing.city || 'N/A'}`);
      console.log(`   Price: $${listing.listPrice?.toLocaleString() || 'N/A'}`);
      console.log("=".repeat(80) + "\n");

      setQueueContext(ctx);
      setCurrentPriority(1);
      setIsExhausted(false);
      isInitializedRef.current = true;

      const diverseListings = await buildDiverseQueue(ctx);

      // Filter out current listing
      const filtered = diverseListings.filter(q => q.listing.listingKey !== listing.listingKey);

      // Split filtered into queue and buffer for faster subsequent loads
      const toQueue = filtered.slice(0, MAX_QUEUE_SIZE);
      const toBuffer = filtered.slice(MAX_QUEUE_SIZE, MAX_QUEUE_SIZE + 10);

      console.log(`\n📦 LOADING INTELLIGENT QUEUE:`);
      console.log(`   Total candidates: ${diverseListings.length}`);
      console.log(`   After filtering current: ${filtered.length}`);
      console.log(`   Loading into queue: ${toQueue.length}`);
      console.log(`   Buffering for later: ${toBuffer.length}\n`);

      if (toQueue.length > 0) {
        console.log("   🎯 Queue Preview (Top 5):");
        toQueue.slice(0, 5).forEach((q, idx) => {
          console.log(`   ${idx + 1}. ${q.listing.address || q.listing.unparsedAddress}`);
          console.log(`      💡 ${q.reason} • Score: ${q.score}`);
          console.log(`      💰 $${q.listing.listPrice?.toLocaleString() || 'N/A'} • ${q.listing.propertySubType}`);
        });
      }
      console.log("");

      setQueue(toQueue);
      bufferQueueRef.current = toBuffer; // Store extras in buffer

      if (filtered.length === 0) {
        console.log("🏁 No similar properties found");
        setIsExhausted(true);
      }
    },
    [buildDiverseQueue]
  );

  const refillQueue = useCallback(async () => {
    if (!queueContext || isLoadingQueue || fetchingRef.current) {
      return;
    }

    // Use Set for O(1) lookup instead of array.includes() O(n)
    const excludeSet = excludeKeysSetRef.current;

    // Check buffer first for instant refills
    if (bufferQueueRef.current.length > 0) {
      const bufferedValid = bufferQueueRef.current.filter(
        q => !excludeSet.has(q.listing.listingKey)
      );

      if (bufferedValid.length > 0) {
        console.log(`⚡ Using ${bufferedValid.length} listings from buffer (instant refill)`);
        setQueue(prev => [...prev, ...bufferedValid].slice(0, MAX_QUEUE_SIZE));
        bufferQueueRef.current = []; // Clear buffer
        return;
      }
    }

    // Calculate valid queue size with O(1) lookups
    const validQueueSize = queue.reduce((count, q) =>
      excludeSet.has(q.listing.listingKey) ? count : count + 1, 0
    );

    if (validQueueSize >= MIN_QUEUE_SIZE) {
      return;
    }

    console.log(`🔄 Refilling intelligent queue (valid: ${validQueueSize}/${MIN_QUEUE_SIZE})...`);
    fetchingRef.current = true;
    setIsLoadingQueue(true);

    try {
      const startTime = performance.now();
      const newListings = await buildDiverseQueue(queueContext);

      // Use Set for O(1) lookups
      const existingKeys = new Set(queue.map(q => q.listing.listingKey));
      const fresh = newListings.filter(
        q => !existingKeys.has(q.listing.listingKey) && !excludeSet.has(q.listing.listingKey)
      );

      const refillTime = (performance.now() - startTime).toFixed(0);

      if (fresh.length === 0) {
        console.log("🏁 No more properties available");
        setIsExhausted(true);
      } else {
        // Take what we need for the queue, store rest in buffer
        const needed = MAX_QUEUE_SIZE - queue.length;
        const toQueue = fresh.slice(0, needed);
        const toBuffer = fresh.slice(needed, needed + 10); // Buffer next 10

        console.log(`➕ Adding ${toQueue.length} to queue, ${toBuffer.length} to buffer (${refillTime}ms)`);
        setQueue(prev => [...prev, ...toQueue].slice(0, MAX_QUEUE_SIZE));
        bufferQueueRef.current = toBuffer;
      }
    } finally {
      setIsLoadingQueue(false);
      fetchingRef.current = false;
    }
  }, [queueContext, queue, buildDiverseQueue, isLoadingQueue]);

  const getNext = useCallback((): { listing: MapListing | null; reason?: string } => {
    // Use Set for O(1) lookups instead of array.includes()
    const excludeSet = excludeKeysSetRef.current;
    const validQueue = queue.filter(
      q => !excludeSet.has(q.listing.listingKey)
    );

    console.log(`\n📋 Queue Status: ${queue.length} total, ${validQueue.length} valid`);

    if (validQueue.length === 0) {
      if (!isLoadingQueue) {
        setQueue([]);
      }
      console.log("⚠️ No valid listings in queue");
      return { listing: null };
    }

    const nextQueued = validQueue[0];
    if (!nextQueued) {
      return { listing: null };
    }

    const next = nextQueued.listing;

    console.log("\n" + "▼".repeat(80));
    console.log("➡️  ADVANCING TO NEXT LISTING");
    console.log("▼".repeat(80));
    console.log("📍 NEXT LISTING:");
    console.log(`   Address: ${next.address || next.unparsedAddress || 'N/A'}`);
    console.log(`   💡 Reason: ${nextQueued.reason}`);
    console.log(`   🏆 Score: ${nextQueued.score}`);
    console.log(`   💰 Price: $${next.listPrice?.toLocaleString() || 'N/A'}`);
    console.log(`   🏘️  Subdivision: ${next.subdivisionName || 'Not Applicable'}`);
    console.log(`   🏠 SubType: ${next.propertySubType || 'N/A'}`);
    console.log(`   📍 City: ${next.city || 'N/A'}`);
    console.log(`\n📊 Remaining: ${validQueue.length - 1} listings`);
    console.log("▼".repeat(80) + "\n");

    // Remove from queue
    setQueue(prevQueue => prevQueue.filter(q => q.listing.listingKey !== next.listingKey));

    // Trigger refill
    const remainingValid = validQueue.length - 1;
    if (remainingValid < MIN_QUEUE_SIZE && !isLoadingQueue && !isExhausted) {
      console.log(`🔄 Queue low (${remainingValid}/${MIN_QUEUE_SIZE}), refilling...`);
      setTimeout(() => refillQueue(), 0);
    }

    return { listing: next, reason: nextQueued.reason };
  }, [queue, excludeKeys, isLoadingQueue, isExhausted, refillQueue]);

  const reset = useCallback(() => {
    console.log("🔄 Resetting intelligent queue");
    setQueue([]);
    setQueueContext(null);
    setIsExhausted(false);
    setCurrentPriority(1);
    isInitializedRef.current = false;
    setUndoStack([]);

    // Clear performance caches
    scoreCacheRef.current.clear();
    resultCacheRef.current.clear();
    bufferQueueRef.current = [];
    console.log("   ♻️  Cleared all caches and buffers");
  }, []);

  // ========================================
  // PUBLIC API
  // ========================================

  const markAsLiked = useCallback((listingKey: string, listingData?: any) => {
    console.log("\n" + "💚".repeat(80));
    console.log("❤️  USER SWIPED RIGHT (LIKED)");
    console.log("💚".repeat(80));
    console.log(`   Address: ${listingData?.UnparsedAddress || listingData?.address || 'N/A'}`);
    console.log(`   💰 Price: $${listingData?.ListPrice?.toLocaleString() || listingData?.price?.toLocaleString() || 'N/A'}`);
    console.log("💚".repeat(80) + "\n");

    // Add to undo stack
    setUndoStack(prev => [...prev, { listingKey, action: "like" as const }].slice(-5)); // Keep last 5

    addSwipe(listingKey, "like", listingData);

    if (listingData) {
      trackAddToWishlist({
        listingKey,
        address: listingData.UnparsedAddress || listingData.StreetName,
        price: listingData.ListPrice,
        bedrooms: listingData.BedroomsTotal,
        bathrooms: listingData.BathroomsTotalInteger,
        city: listingData.City,
        subdivision: listingData.SubdivisionName,
      });
    }
  }, [addSwipe]);

  const markAsDisliked = useCallback((listingKey: string, listingData?: any) => {
    console.log("\n" + "💔".repeat(80));
    console.log("👎 USER SWIPED LEFT (DISLIKED)");
    console.log("💔".repeat(80));
    console.log(`   Address: ${listingData?.UnparsedAddress || listingData?.address || 'N/A'}`);
    console.log(`   ⏰ Will expire in 30 minutes`);
    console.log("💔".repeat(80) + "\n");

    // Add to undo stack
    setUndoStack(prev => [...prev, { listingKey, action: "dislike" as const }].slice(-5));

    addSwipe(listingKey, "dislike", listingData);
  }, [addSwipe]);

  const undoLastSwipe = useCallback((): { listingKey: string; action: "like" | "dislike" } | null => {
    if (undoStack.length === 0) return null;

    const lastSwipe = undoStack[undoStack.length - 1];
    if (!lastSwipe) return null;

    setUndoStack(prev => prev.slice(0, -1));

    // Remove from exclude keys
    setExcludeKeys(prev => prev.filter(key => key !== lastSwipe.listingKey));

    // Remove from pending swipes
    pendingSwipesRef.current = pendingSwipesRef.current.filter(
      s => s.listingKey !== lastSwipe.listingKey
    );

    console.log(`↩️  Undoing ${lastSwipe.action} for ${lastSwipe.listingKey}`);

    return lastSwipe;
  }, [undoStack]);

  const isExcluded = useCallback((listingKey: string): boolean => {
    return excludeKeys.includes(listingKey);
  }, [excludeKeys]);

  const peekNext = useCallback((count: number = 3): MapListing[] => {
    const excludeSet = excludeKeysSetRef.current;
    const validQueue = queue.filter(
      q => !excludeSet.has(q.listing.listingKey)
    );

    return validQueue.slice(0, count).map(q => q.listing);
  }, [queue]);

  // Flush on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingSwipesRef.current.length > 0) {
        const data = JSON.stringify({
          swipes: pendingSwipesRef.current,
          anonymousId: anonymousIdRef.current,
        });
        const blob = new Blob([data], { type: "application/json" });
        navigator.sendBeacon("/api/swipes/batch", blob);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return {
    // Ready state
    isReady,

    // Queue operations
    initializeQueue,
    getNext,
    peekNext, // Peek at next N items for prefetching
    reset,
    queueLength: queue.length,
    isLoading: isLoadingQueue,
    isExhausted,

    // Swipe operations
    markAsLiked,
    markAsDisliked,
    undoLastSwipe,
    canUndo: undoStack.length > 0,
    isExcluded,
    excludeKeys,

    // User preferences
    userPreferences,

    // Batch operations
    flushSwipes,
    isSyncing,
    refreshExcludeKeys,
  };
}
