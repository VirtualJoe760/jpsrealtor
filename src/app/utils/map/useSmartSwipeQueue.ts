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
  const [isExhausted, setIsExhausted] = useState(false); // Track if all properties are shown
  const fetchingRef = useRef(false);
  const excludeKeysRef = useRef<string[]>(options.excludeKeys);

  const minQueueSize = options.minQueueSize ?? DEFAULT_MIN_QUEUE_SIZE;
  const maxQueueSize = options.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE;

  // Update ref when excludeKeys change
  useEffect(() => {
    excludeKeysRef.current = options.excludeKeys;
  }, [options.excludeKeys]);

  // Build query parameters based on priority level
  const buildQueryParams = useCallback(
    (ctx: FetchContext, priority: number): URLSearchParams => {
      const params = new URLSearchParams();

      // Always exclude already seen listings
      if (excludeKeysRef.current.length > 0) {
        params.set("excludeKeys", excludeKeysRef.current.join(","));
      }

      const isNonHOA = ctx.subdivision &&
        (ctx.subdivision.toLowerCase() === "not applicable" ||
         ctx.subdivision.toLowerCase() === "other");

      // Priority 1: Same subdivision, same property type (skip for Non-HOA)
      if (priority === 1) {
        if (ctx.subdivision && !isNonHOA && ctx.propertyType) {
          params.set("subdivision", ctx.subdivision);
          params.set("propertyType", ctx.propertyType);
          params.set("limit", "50");
          return params;
        }
      }

      // Priority 2: Same subdivision, any property type (skip for Non-HOA)
      if (priority === 2) {
        if (ctx.subdivision && !isNonHOA) {
          params.set("subdivision", ctx.subdivision);
          params.set("limit", "50");
          return params;
        }
      }

      // Priority 3: Same city, same property type (important for Non-HOA properties)
      if (priority === 3) {
        if (ctx.city && ctx.propertyType) {
          params.set("city", ctx.city);
          params.set("propertyType", ctx.propertyType);
          params.set("limit", "50");
          return params;
        }
      }

      // Priority 4: Same city, any property type
      if (priority === 4) {
        if (ctx.city) {
          params.set("city", ctx.city);
          params.set("limit", "50");
          return params;
        }
      }

      // Priority 5: 2 mile radius, same property type (fallback)
      if (priority === 5) {
        if (ctx.latitude && ctx.longitude && ctx.propertyType) {
          params.set("lat", ctx.latitude.toString());
          params.set("lng", ctx.longitude.toString());
          params.set("radius", "2"); // 2 miles
          params.set("propertyType", ctx.propertyType);
          params.set("limit", "50");
          return params;
        }
      }

      return params;
    },
    []
  );

  // Fetch similar listings based on context with priority order
  const fetchSimilarListings = useCallback(
    async (ctx: FetchContext): Promise<MapListing[]> => {
      if (fetchingRef.current) {
        return [];
      }

      fetchingRef.current = true;
      setIsLoading(true);

      try {
        // Priority 1: Same subdivision, same property type
        let params = buildQueryParams(ctx, 1);
        let response = await fetch(`/api/mls-listings?${params.toString()}`);
        let data = await response.json();

        if (data.listings && data.listings.length > 0) {
          console.log(`✅ Found ${data.listings.length} listings (Priority 1: Same subdivision + property type)`);
          return data.listings;
        }

        // Priority 2: Same subdivision, any property type
        params = buildQueryParams(ctx, 2);
        if (params.toString()) {
          response = await fetch(`/api/mls-listings?${params.toString()}`);
          data = await response.json();

          if (data.listings && data.listings.length > 0) {
            console.log(`✅ Found ${data.listings.length} listings (Priority 2: Same subdivision)`);
            return data.listings;
          }
        }

        // Priority 3: Same city, same property type
        params = buildQueryParams(ctx, 3);
        if (params.toString()) {
          response = await fetch(`/api/mls-listings?${params.toString()}`);
          data = await response.json();

          if (data.listings && data.listings.length > 0) {
            console.log(`✅ Found ${data.listings.length} listings (Priority 3: Same city + property type)`);
            return data.listings;
          }
        }

        // Priority 4: Same city, any property type
        params = buildQueryParams(ctx, 4);
        if (params.toString()) {
          response = await fetch(`/api/mls-listings?${params.toString()}`);
          data = await response.json();

          if (data.listings && data.listings.length > 0) {
            console.log(`✅ Found ${data.listings.length} listings (Priority 4: Same city)`);
            return data.listings;
          }
        }

        // Priority 5: 2 mile radius, same property type (final fallback)
        params = buildQueryParams(ctx, 5);
        if (params.toString()) {
          response = await fetch(`/api/mls-listings?${params.toString()}`);
          data = await response.json();

          if (data.listings && data.listings.length > 0) {
            console.log(`✅ Found ${data.listings.length} listings (Priority 5: 2-mile radius)`);
            return data.listings;
          }
        }

        // No more properties found
        console.log(`⚠️ No more properties found for context:`, ctx);
        return [];
      } catch (error) {
        console.error("❌ Failed to fetch similar listings:", error);
        return [];
      } finally {
        setIsLoading(false);
        fetchingRef.current = false;
      }
    },
    [buildQueryParams]
  );

  // Initialize queue with a current listing's context
  const initializeQueue = useCallback(
    async (currentListing: MapListing | null) => {

      if (!currentListing) {
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


      setContext(ctx);

      const listings = await fetchSimilarListings(ctx);
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

    if (listings.length === 0) {
      // No more properties available
      setIsExhausted(true);
      return;
    }

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
    setIsExhausted(false);
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
    isExhausted,
  };
}
