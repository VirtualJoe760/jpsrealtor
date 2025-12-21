// src/app/utils/map/useSwipeQueue.ts
// Swipe queue using strategy pattern for map and AI chat sources
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { MapListing } from "@/types/types";
import { getOrCreateFingerprint } from "@/app/utils/fingerprint";
import { trackAddToWishlist } from "@/lib/meta-pixel";
import { SwipeQueueManager } from "@/app/utils/swipe/SwipeQueueManager";
import { MapQueueStrategy } from "@/app/utils/swipe/MapQueueStrategy";
import type { QueueItem, SwipeQueueHook as ISwipeQueueHook } from "@/app/utils/swipe/types";

// ============================================================================
// TYPES (Re-export for backward compatibility)
// ============================================================================

export type { QueueItem };

// ============================================================================
// HOOK INTERFACE (Re-export for backward compatibility)
// ============================================================================

export interface SwipeQueueHook extends ISwipeQueueHook {
  currentPhase: number; // Deprecated but kept for backward compatibility
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useSwipeQueue(strategy?: any): SwipeQueueHook {
  const [isReady, setIsReady] = useState(false);
  const [excludeKeys, setExcludeKeys] = useState<Set<string>>(new Set());
  const [isExhausted, setIsExhausted] = useState(false);

  const anonymousIdRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);
  const queueManagerRef = useRef<SwipeQueueManager>(new SwipeQueueManager());
  const strategyRef = useRef(strategy);

  // ========================================
  // INITIALIZATION
  // ========================================

  useEffect(() => {
    async function initialize() {
      try {
        console.log("🔄 Initializing swipe queue with strategy pattern...");

        const fingerprint = await getOrCreateFingerprint();
        anonymousIdRef.current = fingerprint;

        // Set strategy: use provided strategy or default to MapQueueStrategy
        const queueStrategy = strategyRef.current || new MapQueueStrategy();
        queueManagerRef.current.setStrategy(queueStrategy);

        // Load exclude keys once
        await loadExcludeKeys();

        setIsReady(true);
        console.log(`✅ Swipe queue ready with ${queueManagerRef.current.getStrategyName()} strategy`);
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
  // QUEUE INITIALIZATION
  // ========================================

  const initializeQueue = useCallback(
    async (clickedListing: MapListing, source: 'map' | 'ai_chat' = 'map', query?: string) => {
      try {
        // Initialize queue using manager
        await queueManagerRef.current.initializeQueue({
          referenceListing: clickedListing,
          source,
          query,
        });

        // Sync state with manager
        const state = queueManagerRef.current.getState();
        setIsExhausted(state.isExhausted);

        console.log(`✅ Queue initialized with ${state.queueLength} listings`);
      } catch (error) {
        console.error("❌ Error initializing queue:", error);
        setIsExhausted(true);
      }
    },
    []
  );

  // ========================================
  // QUEUE OPERATIONS
  // ========================================

  const getNext = useCallback((): { listing: QueueItem | null; reason?: string } => {
    const result = queueManagerRef.current.getNext();

    // Sync exhausted state
    const state = queueManagerRef.current.getState();
    setIsExhausted(state.isExhausted);

    return result;
  }, []);

  const peekNext = useCallback(
    (count: number = 3): QueueItem[] => {
      return queueManagerRef.current.peekNext(count);
    },
    []
  );

  const markAsLiked = useCallback(
    (listingKey: string, listingData?: any, sourceContext?: any) => {
      console.log("\n" + "💚".repeat(80));
      console.log("❤️  SWIPED RIGHT (LIKED)");
      console.log("💚".repeat(80));
      console.log("Listing Key:", listingKey);
      console.log("Address:", listingData?.unparsedAddress || listingData?.address || "N/A");
      console.log("Price: $" + (listingData?.listPrice?.toLocaleString() || "N/A"));
      console.log("💚".repeat(80) + "\n");

      // Update local exclude keys immediately
      console.log(`📝 Adding ${listingKey} to exclude keys`);
      setExcludeKeys(prev => {
        const newSet = new Set([...prev, listingKey]);
        console.log(`📝 Exclude keys updated: ${prev.size} → ${newSet.size}`);
        return newSet;
      });

      // Mark as excluded in manager
      queueManagerRef.current.markAsExcluded(listingKey);

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
      console.log("Listing Key:", listingKey);
      console.log("Address:", listingData?.unparsedAddress || listingData?.address || "N/A");
      console.log("💔".repeat(80) + "\n");

      // Update local exclude keys immediately
      console.log(`📝 Adding ${listingKey} to exclude keys`);
      setExcludeKeys(prev => {
        const newSet = new Set([...prev, listingKey]);
        console.log(`📝 Exclude keys updated: ${prev.size} → ${newSet.size}`);
        return newSet;
      });

      // Mark as excluded in manager
      queueManagerRef.current.markAsExcluded(listingKey);

      // Send to server immediately (no batching)
      sendSwipe(listingKey, "dislike", listingData);
    },
    []
  );

  const reset = useCallback(() => {
    queueManagerRef.current.reset();
    setIsExhausted(false);
    console.log("🔄 Queue reset");
  }, []);

  const isExcluded = useCallback(
    (listingKey: string): boolean => {
      return queueManagerRef.current.isExcluded(listingKey);
    },
    []
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
    queueLength: queueManagerRef.current.getState().queueLength,
    isExcluded,
    currentPhase: 1, // Deprecated but kept for backward compatibility
  };
}
