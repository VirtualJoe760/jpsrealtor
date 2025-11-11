// src/app/utils/map/useSmartSwipeQueue.ts
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { MapListing } from "@/types/types";

type QueueOptions = {
  excludeKeys: string[];
  minQueueSize?: number;
  maxQueueSize?: number;
};

type FetchContext = {
  subdivision?: string;
  propertyType?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
};

const DEFAULT_MIN_QUEUE_SIZE = 3;
const DEFAULT_MAX_QUEUE_SIZE = 10;

export function useSmartSwipeQueue(options: QueueOptions) {
  const [queue, setQueue] = useState<MapListing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<FetchContext | null>(null);
  const fetchingRef = useRef(false);
  const excludeKeysRef = useRef<string[]>(options.excludeKeys);

  const minQueueSize = options.minQueueSize ?? DEFAULT_MIN_QUEUE_SIZE;
  const maxQueueSize = options.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE;

  // Update ref when excludeKeys change
  useEffect(() => {
    excludeKeysRef.current = options.excludeKeys;
  }, [options.excludeKeys]);

  // Build query parameters based on context and priority
  const buildQueryParams = useCallback(
    (ctx: FetchContext, radiusMiles = 5): URLSearchParams => {
      const params = new URLSearchParams();

      // Always exclude already seen listings
      if (excludeKeysRef.current.length > 0) {
        params.set("excludeKeys", excludeKeysRef.current.join(","));
      }

      // Priority 1: Same subdivision and property type
      if (ctx.subdivision && ctx.subdivision.toLowerCase() !== "other") {
        params.set("subdivision", ctx.subdivision);
        if (ctx.propertyType) {
          params.set("propertyType", ctx.propertyType);
        }
        params.set("limit", "20");
        return params;
      }

      // Priority 2: Same property type in wider area (by city or radius)
      if (ctx.propertyType) {
        params.set("propertyType", ctx.propertyType);

        // Use city if available
        if (ctx.city) {
          params.set("city", ctx.city);
        }

        // Or use radius search if coordinates available
        if (ctx.latitude && ctx.longitude) {
          params.set("lat", ctx.latitude.toString());
          params.set("lng", ctx.longitude.toString());
          params.set("radius", radiusMiles.toString());
        }

        params.set("limit", "20");
        return params;
      }

      // Priority 3: Just geographic area
      if (ctx.city) {
        params.set("city", ctx.city);
        params.set("limit", "20");
      } else if (ctx.latitude && ctx.longitude) {
        params.set("lat", ctx.latitude.toString());
        params.set("lng", ctx.longitude.toString());
        params.set("radius", radiusMiles.toString());
        params.set("limit", "20");
      }

      return params;
    },
    [] // No dependencies - uses ref which doesn't trigger re-renders
  );

  // Fetch similar listings based on context
  const fetchSimilarListings = useCallback(
    async (ctx: FetchContext): Promise<MapListing[]> => {
      if (fetchingRef.current) {
        console.log("🔄 Already fetching, skipping...");
        return [];
      }

      fetchingRef.current = true;
      setIsLoading(true);

      try {
        // Try with exact subdivision first
        let params = buildQueryParams(ctx, 1); // Start with 1 mile
        console.log("🎯 Fetching similar listings with params:", params.toString());
        console.log("🏘️ Context:", ctx);

        let response = await fetch(`/api/mls-listings?${params.toString()}`);
        let data = await response.json();

        console.log("📦 Received listings:", data.listings?.length || 0);

        if (data.listings && data.listings.length > 0) {
          return data.listings;
        }

        // Progressive radius expansion: 1mi → 2mi → 5mi → city
        const radiusSequence = [2, 5];

        if (ctx.latitude && ctx.longitude) {
          for (const radius of radiusSequence) {
            console.log(`🔄 No results with previous radius, trying ${radius} miles...`);
            params = buildQueryParams(ctx, radius);
            response = await fetch(`/api/mls-listings?${params.toString()}`);
            data = await response.json();

            console.log(`📦 Received (${radius} mile):`, data.listings?.length || 0);

            if (data.listings && data.listings.length > 0) {
              return data.listings;
            }
          }
        }

        // If still no results, try without property type filter
        if (ctx.propertyType && ctx.city) {
          console.log("🔄 Still no results, trying without property type filter...");
          params = new URLSearchParams();
          params.set("city", ctx.city);
          params.set("limit", "20");
          if (excludeKeysRef.current.length > 0) {
            params.set("excludeKeys", excludeKeysRef.current.join(","));
          }

          console.log("🎯 Final attempt params:", params.toString());
          response = await fetch(`/api/mls-listings?${params.toString()}`);
          data = await response.json();

          console.log("📦 Received (no type filter):", data.listings?.length || 0);

          if (data.listings && data.listings.length > 0) {
            return data.listings;
          }
        }

        console.log("❌ No listings found with any criteria");
        return [];
      } catch (error) {
        console.error("❌ Failed to fetch similar listings:", error);
        return [];
      } finally {
        setIsLoading(false);
        fetchingRef.current = false;
      }
    },
    [buildQueryParams] // buildQueryParams is stable now (no deps)
  );

  // Initialize queue with a current listing's context
  const initializeQueue = useCallback(
    async (currentListing: MapListing | null) => {
      console.log("🚀 initializeQueue called with:", currentListing ? currentListing.slugAddress || currentListing.slug : "null");

      if (!currentListing) {
        console.log("❌ No current listing, clearing queue");
        setQueue([]);
        setContext(null);
        return;
      }

      const ctx: FetchContext = {
        subdivision: currentListing.subdivisionName || undefined,
        propertyType: currentListing.propertyType || undefined,
        city: currentListing.city || undefined,
        latitude: currentListing.latitude,
        longitude: currentListing.longitude,
      };

      console.log("🎯 Queue context:", ctx);

      setContext(ctx);

      const listings = await fetchSimilarListings(ctx);
      console.log("📝 Setting queue with", listings.length, "listings (max:", maxQueueSize, ")");
      setQueue(listings.slice(0, maxQueueSize));
    },
    [fetchSimilarListings, maxQueueSize]
  );

  // Refill queue when it gets low
  const refillQueue = useCallback(async () => {
    if (!context || isLoading || fetchingRef.current || queue.length >= minQueueSize) {
      return;
    }

    const listings = await fetchSimilarListings(context);

    setQueue((prevQueue) => {
      // Add new listings that aren't already in queue
      const existingKeys = new Set(prevQueue.map((l) => l.listingKey));
      const newListings = listings.filter(
        (l) => !existingKeys.has(l.listingKey)
      );

      return [...prevQueue, ...newListings].slice(0, maxQueueSize);
    });
  }, [context, isLoading, queue.length, minQueueSize, maxQueueSize, fetchSimilarListings]);

  // Get next listing from queue
  const getNext = useCallback((): MapListing | null => {
    if (queue.length === 0) {
      return null;
    }

    // Filter out any listings that are now in excludeKeys
    const validQueue = queue.filter(
      (listing) => !excludeKeysRef.current.includes(listing.listingKey)
    );

    if (validQueue.length === 0) {
      console.log("⚠️ Queue empty after filtering excludeKeys");
      setQueue([]);
      return null;
    }

    const [next, ...rest] = validQueue;
    setQueue(rest);

    // Trigger refill if queue is getting low
    if (rest.length < minQueueSize) {
      // Async refill, don't wait for it
      refillQueue();
    }

    // ✅ Fix: Ensure we always return MapListing | null
    return next ?? null;
  }, [queue, minQueueSize, refillQueue]);

  // Peek at next listing without removing it
  const peekNext = useCallback((): MapListing | null => {
    const validQueue = queue.filter(
      (listing) => !excludeKeysRef.current.includes(listing.listingKey)
    );
    return validQueue[0] ?? null;
  }, [queue]);

  // Get queue size (excluding already viewed/disliked)
  const size = useCallback((): number => {
    const validQueue = queue.filter(
      (listing) => !excludeKeysRef.current.includes(listing.listingKey)
    );
    return validQueue.length;
  }, [queue]);

  // Clear queue
  const clear = useCallback(() => {
    setQueue([]);
    setContext(null);
  }, []);

  // Check if queue is empty (excluding already viewed/disliked)
  const isEmpty = useCallback((): boolean => {
    const validQueue = queue.filter(
      (listing) => !excludeKeysRef.current.includes(listing.listingKey)
    );
    return validQueue.length === 0;
  }, [queue]);

  return {
    initializeQueue,
    getNext,
    peekNext,
    size,
    clear,
    isEmpty,
    isLoading,
    queueLength: queue.length,
  };
}
