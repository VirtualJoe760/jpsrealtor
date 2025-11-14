// src/app/utils/map/useSwipeBatch.ts
// Database-first swipe management with smart batching

import { useState, useEffect, useCallback, useRef } from "react";
import { getOrCreateFingerprint } from "@/app/utils/fingerprint";

type SwipeAction = {
  listingKey: string;
  action: "like" | "dislike";
  listingData?: any;
  timestamp: number;
};

const BATCH_SIZE = 10; // Flush after 10 swipes
const BATCH_TIMEOUT_MS = 2 * 60 * 1000; // Flush after 2 minutes

export function useSwipeBatch() {
  const [isReady, setIsReady] = useState(false);
  const [excludeKeys, setExcludeKeys] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const anonymousIdRef = useRef<string | null>(null);
  const pendingSwipesRef = useRef<SwipeAction[]>([]);
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize: Get fingerprint and load exclude keys
  useEffect(() => {
    async function initialize() {
      try {
        console.log("🔄 Initializing swipe batch system...");

        // Get or create browser fingerprint
        const fingerprint = await getOrCreateFingerprint();
        anonymousIdRef.current = fingerprint;
        console.log("🔑 Browser fingerprint:", fingerprint);

        // Load exclude keys from API
        await refreshExcludeKeys();
        console.log("✅ Swipe batch system ready");

        setIsReady(true);
      } catch (error) {
        console.error("❌ Failed to initialize swipe batch:", error);
        setIsReady(true); // Continue anyway
      }
    }

    initialize();
  }, []);

  // Refresh exclude keys from API
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

  // Flush pending swipes to API
  const flushSwipes = useCallback(async () => {
    if (pendingSwipesRef.current.length === 0) {
      console.log("⏭️ No swipes to flush");
      return;
    }

    // Clear timer if it exists
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
      batchTimerRef.current = null;
    }

    const swipesToSync = [...pendingSwipesRef.current];
    pendingSwipesRef.current = []; // Clear queue immediately

    console.log(`🚀 Flushing ${swipesToSync.length} swipes to database...`);
    console.log(`📦 PAYLOAD BEING SENT:`, {
      swipesCount: swipesToSync.length,
      swipes: swipesToSync.map(s => ({
        listingKey: s.listingKey,
        action: s.action,
        timestamp: s.timestamp
      })),
      anonymousId: anonymousIdRef.current
    });
    setIsSyncing(true);

    try {
      const payload = {
        swipes: swipesToSync,
        anonymousId: anonymousIdRef.current,
      };

      console.log(`📤 Sending to /api/swipes/batch:`, JSON.stringify(payload, null, 2));

      const response = await fetch("/api/swipes/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Batch sync failed:", response.status, errorText);
        throw new Error(`Failed to sync swipes: ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Synced swipes successfully:", result);

      // Refresh exclude keys after successful sync
      await refreshExcludeKeys();
    } catch (error) {
      console.error("❌ Failed to sync swipes:", error);
      // Re-add failed swipes to queue
      pendingSwipesRef.current = [...swipesToSync, ...pendingSwipesRef.current];
      console.log(`♻️ Re-added ${swipesToSync.length} failed swipes to queue`);
    } finally {
      setIsSyncing(false);
    }
  }, [refreshExcludeKeys]);

  // Start batch timer (2 minutes)
  const startBatchTimer = useCallback(() => {
    // Clear existing timer
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
    }

    // Start new timer
    batchTimerRef.current = setTimeout(() => {
      console.log("⏰ Batch timer expired - flushing swipes");
      flushSwipes();
    }, BATCH_TIMEOUT_MS);
  }, [flushSwipes]);

  // Add swipe to queue
  const addSwipe = useCallback((
    listingKey: string,
    action: "like" | "dislike",
    listingData?: any
  ) => {
    console.log(`⚡ addSwipe CALLED - listingKey: ${listingKey}, action: ${action}`);

    const swipe: SwipeAction = {
      listingKey,
      action,
      listingData,
      timestamp: Date.now(),
    };

    // Add to queue
    pendingSwipesRef.current.push(swipe);

    console.log(`📝 Added ${action} for ${listingKey}. Queue size: ${pendingSwipesRef.current.length}`);
    console.log(`📋 Current queue:`, pendingSwipesRef.current.map(s => `${s.action}:${s.listingKey}`));

    // Update exclude keys optimistically (instant UI feedback)
    setExcludeKeys(prev => [...prev, listingKey]);

    // If this is the first swipe, start the timer
    if (pendingSwipesRef.current.length === 1) {
      console.log("🕐 Starting 2-minute batch timer");
      startBatchTimer();
    }

    // If we hit the batch size, flush immediately
    if (pendingSwipesRef.current.length >= BATCH_SIZE) {
      console.log(`🚀 Batch size reached (${BATCH_SIZE}) - flushing immediately`);
      flushSwipes();
    }
  }, [startBatchTimer, flushSwipes]);

  // Mark as liked
  const markAsLiked = useCallback((listingKey: string, listingData?: any) => {
    console.log(`🔵 markAsLiked CALLED with listingKey:`, listingKey);
    console.trace("Stack trace for markAsLiked");
    addSwipe(listingKey, "like", listingData);
  }, [addSwipe]);

  // Mark as disliked
  const markAsDisliked = useCallback((listingKey: string, listingData?: any) => {
    console.log(`🔴 markAsDisliked CALLED with listingKey:`, listingKey);
    console.trace("Stack trace for markAsDisliked");
    addSwipe(listingKey, "dislike", listingData);
  }, [addSwipe]);

  // Check if a listing is excluded
  const isExcluded = useCallback((listingKey: string): boolean => {
    return excludeKeys.includes(listingKey);
  }, [excludeKeys]);

  // Get exclude keys
  const getExcludeKeys = useCallback((): string[] => {
    return excludeKeys;
  }, [excludeKeys]);

  // Force flush (call this on page unload)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingSwipesRef.current.length > 0) {
        console.log(`📤 Page unload - sending ${pendingSwipesRef.current.length} swipes via sendBeacon`);
        // Use sendBeacon for reliable sending on page unload
        const data = JSON.stringify({
          swipes: pendingSwipesRef.current,
          anonymousId: anonymousIdRef.current,
        });

        // Send as Blob with proper content-type
        const blob = new Blob([data], { type: "application/json" });
        navigator.sendBeacon("/api/swipes/batch", blob);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return {
    isReady,
    markAsLiked,
    markAsDisliked,
    isExcluded,
    getExcludeKeys,
    refreshExcludeKeys,
    isSyncing,
    flushSwipes, // Manual flush if needed
  };
}
