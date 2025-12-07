"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { MapListing, Filters } from "@/types/types";
import type { IUnifiedListing } from "@/models/unified-listing";
import { useServerClusters, isServerCluster, MapMarker } from "@/app/utils/map/useServerClusters";
import { useSwipeQueue } from "@/app/utils/map/useSwipeQueue";
import { useTheme } from "@/app/contexts/ThemeContext";
import useFavorites from "@/app/utils/map/useFavorites";
import useDislikes from "@/app/utils/map/useDislikes";

// Default filter state
const defaultFilterState: Filters = {
  listingType: "sale",
  minPrice: "",
  maxPrice: "",
  beds: "",
  baths: "",
  minSqft: "",
  maxSqft: "",
  minLotSize: "",
  maxLotSize: "",
  minYear: "",
  maxYear: "",
  propertyType: "",
  propertySubType: "",
  minGarages: "",
  hoa: "",
  landType: "",
  city: "",
  subdivision: "",
};

interface MLSContextValue {
  // Listings State
  allListings: MapListing[];
  visibleListings: MapListing[];
  markers: MapMarker[]; // Can include both clusters and listings
  selectedListing: MapListing | null;
  selectedFullListing: IUnifiedListing | null;
  visibleIndex: number | null;

  // Filters
  filters: Filters;
  setFilters: (filters: Filters) => void;
  updateFilter: (key: keyof Filters, value: any) => void;
  resetFilters: () => void;

  // Favorites & Dislikes
  likedListings: MapListing[];
  dislikedListings: any[];
  toggleFavorite: (listing: MapListing) => void;
  removeFavorite: (listing: MapListing) => void;
  clearFavorites: () => void;
  swipeLeft: (listing: IUnifiedListing) => void;
  removeDislike: (listing: MapListing) => void;
  clearDislikes: () => void;

  // Map Controls
  mapStyle: 'toner' | 'dark' | 'satellite' | 'bright';
  setMapStyle: (value: 'toner' | 'dark' | 'satellite' | 'bright') => void;

  // Loading States
  isLoading: boolean;
  isLoadingViewport: boolean;
  isPreloaded: boolean;
  isLoadingListing: boolean;

  // Cache
  listingCache: React.MutableRefObject<Map<string, IUnifiedListing>>;

  // Actions
  loadListings: (bounds: any, filters: Filters, merge?: boolean) => Promise<void>;
  selectListing: (listing: MapListing | null, index?: number) => Promise<void>;
  selectListingBySlug: (slug: string) => Promise<void>;
  closeListing: () => void;

  // Swipe Queue
  swipeQueue: ReturnType<typeof useSwipeQueue>;

  // Total listing counts
  totalCount: number;
}

const MLSContext = createContext<MLSContextValue | null>(null);

export function MLSProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { currentTheme } = useTheme();

  // Core hooks
  const { markers, loadMarkers, totalCount, isLoading: isLoadingViewport } = useServerClusters();
  const swipeQueue = useSwipeQueue();

  // Refs for caching
  const listingCache = useRef<Map<string, IUnifiedListing>>(new Map());
  const fetchingRef = useRef<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeFetchesRef = useRef<number>(0);

  const [filters, setFiltersState] = useState<Filters>(() => {
    if (typeof window === "undefined") return defaultFilterState;

    const params = new URLSearchParams(window.location.search);
    const urlFilters: Partial<Filters> = {};

    // Restore filter values from URL
    if (params.get("listingType")) urlFilters.listingType = params.get("listingType")!;
    if (params.get("minPrice")) urlFilters.minPrice = params.get("minPrice")!;
    if (params.get("maxPrice")) urlFilters.maxPrice = params.get("maxPrice")!;
    if (params.get("beds")) urlFilters.beds = params.get("beds")!;
    if (params.get("baths")) urlFilters.baths = params.get("baths")!;
    if (params.get("minSqft")) urlFilters.minSqft = params.get("minSqft")!;
    if (params.get("maxSqft")) urlFilters.maxSqft = params.get("maxSqft")!;
    if (params.get("minLotSize")) urlFilters.minLotSize = params.get("minLotSize")!;
    if (params.get("maxLotSize")) urlFilters.maxLotSize = params.get("maxLotSize")!;
    if (params.get("minYear")) urlFilters.minYear = params.get("minYear")!;
    if (params.get("maxYear")) urlFilters.maxYear = params.get("maxYear")!;
    if (params.get("propertyType")) urlFilters.propertyType = params.get("propertyType")!;
    if (params.get("propertySubType")) urlFilters.propertySubType = params.get("propertySubType")!;
    if (params.get("minGarages")) urlFilters.minGarages = params.get("minGarages")!;
    if (params.get("hoa")) urlFilters.hoa = params.get("hoa")!;
    if (params.get("landType")) urlFilters.landType = params.get("landType")!;
    if (params.get("city")) urlFilters.city = params.get("city")!;
    if (params.get("subdivision")) urlFilters.subdivision = params.get("subdivision")!;

    // Boolean filters
    if (params.get("poolYn") === "true") urlFilters.poolYn = true;
    if (params.get("spaYn") === "true") urlFilters.spaYn = true;
    if (params.get("viewYn") === "true") urlFilters.viewYn = true;
    if (params.get("garageYn") === "true") urlFilters.garageYn = true;
    if (params.get("associationYN") === "true") urlFilters.associationYN = true;
    if (params.get("gatedCommunity") === "true") urlFilters.gatedCommunity = true;
    if (params.get("seniorCommunity") === "true") urlFilters.seniorCommunity = true;

    return Object.keys(urlFilters).length > 0
      ? { ...defaultFilterState, ...urlFilters }
      : defaultFilterState;
  });

  const [visibleIndex, setVisibleIndex] = useState<number | null>(null);
  const [selectedFullListing, setSelectedFullListing] = useState<IUnifiedListing | null>(null);
  const [mapStyle, setMapStyle] = useState<'toner' | 'dark' | 'satellite' | 'bright'>(() => {
    // Initialize based on current theme
    return currentTheme === "lightgradient" ? 'bright' : 'dark';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [isLoadingListing, setIsLoadingListing] = useState(false);

  // Sync mapStyle with theme changes (unless user has manually selected satellite/toner)
  useEffect(() => {
    console.log('🎨 MLSProvider - Theme changed to:', currentTheme);
    console.log('🎨 MLSProvider - Current mapStyle:', mapStyle);

    // Only auto-sync if using dark or bright (don't override satellite/toner)
    if (mapStyle === 'dark' || mapStyle === 'bright') {
      const newStyle = currentTheme === "lightgradient" ? 'bright' : 'dark';
      if (newStyle !== mapStyle) {
        console.log('✅ MLSProvider - Auto-updating mapStyle to:', newStyle);
        setMapStyle(newStyle);
      }
    } else {
      console.log('ℹ️ MLSProvider - Keeping manual mapStyle:', mapStyle);
    }
  }, [currentTheme]);

  // Favorites & Dislikes - Using database-backed hooks
  const {
    favorites: likedListings,
    addFavorite,
    removeFavorite: removeFavoriteFromHook,
    clearFavorites: clearFavoritesFromHook,
    isLoading: isLoadingFavorites
  } = useFavorites();

  const {
    dislikes: dislikedListings,
    addDislike,
    removeDislike,
    clearDislikes,
    isLoading: isLoadingDislikes
  } = useDislikes();

  // Derive listings from markers (filter out clusters for visibleListings)
  const allListings = React.useMemo(() => markers.filter((m): m is MapListing => !isServerCluster(m)), [markers]);
  const visibleListings = React.useMemo(() => {
    // Filter out server-side clusters - only keep actual listings
    const listings = markers.filter((m): m is MapListing => !isServerCluster(m));
    const clusterCount = markers.length - listings.length;
    console.log(`🔍 MLSProvider - Total markers: ${markers.length}, Clusters: ${clusterCount}, Listings: ${listings.length}`);
    return listings;
  }, [markers]);

  // Selected listing (computed from visibleIndex)
  const selectedListing = React.useMemo((): MapListing | null => {
    if (visibleIndex === null || visibleIndex < 0 || visibleIndex >= visibleListings.length) {
      return null;
    }
    return visibleListings[visibleIndex] ?? null;
  }, [visibleIndex, visibleListings]);

  // Note: Favorites and dislikes are now managed by useFavorites and useDislikes hooks
  // which handle both database sync (for authenticated users) and localStorage (for guests)

  // Prefetch full listings (INTELLIGENT: debounced, limited concurrency, reduced count)
  useEffect(() => {
    // Cancel any in-flight prefetch from previous effect
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this effect
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Debounce: Wait 500ms after visibleListings stabilizes before prefetching
    const timer = setTimeout(async () => {
      if (controller.signal.aborted) return;

      const MAX_CONCURRENT = 3;  // Limit concurrent fetches to prevent server overload
      const PREFETCH_COUNT = 3;   // Reduced from 5 to minimize database load

      const slugsToFetch = visibleListings
        .slice(0, PREFETCH_COUNT)  // Only first 3 listings (center of viewport)
        .map((listing) => listing.slugAddress ?? listing.slug)
        .filter(
          (slug): slug is string =>
            !!slug && !listingCache.current.has(slug) && !fetchingRef.current.has(slug)
        );

      console.log(`🔄 Prefetching ${slugsToFetch.length} listings (max concurrent: ${MAX_CONCURRENT})`);

      // Fetch with concurrency limiting
      for (const slug of slugsToFetch) {
        if (controller.signal.aborted) break;

        // Wait if we've hit the concurrent request limit
        while (activeFetchesRef.current >= MAX_CONCURRENT) {
          await new Promise(resolve => setTimeout(resolve, 100));
          if (controller.signal.aborted) break;
        }

        if (controller.signal.aborted) break;

        // Mark as fetching
        fetchingRef.current.add(slug);
        activeFetchesRef.current++;

        // Fetch in background (don't await - allows concurrent requests up to limit)
        fetch(`/api/mls-listings/${slug}`, { signal: controller.signal })
          .then(async (res) => {
            if (!res.ok) {
              if (res.status === 404) {
                console.warn(`⚠️ Listing ${slug} not found in database`);
              } else {
                console.error(`❌ HTTP ${res.status} fetching listing ${slug}`);
              }
              return;
            }
            const json = await res.json();
            if (json?.listing && json.listing.listingKey) {
              listingCache.current.set(slug, json.listing);
              console.log(`✅ Prefetched listing ${slug}`);
            }
          })
          .catch((err) => {
            // Ignore abort errors - they're expected when viewport changes
            if (err.name !== 'AbortError') {
              console.error(`❌ Error prefetching listing ${slug}:`, err);
            }
          })
          .finally(() => {
            fetchingRef.current.delete(slug);
            activeFetchesRef.current--;
          });
      }
    }, 500);  // 500ms debounce - waits for streaming to finish

    return () => {
      clearTimeout(timer);
      controller.abort();  // Cancel all in-flight requests when effect re-runs
    };
  }, [visibleListings]);

  // Prefetch next swipe queue items
  useEffect(() => {
    if (!swipeQueue.isReady || !selectedFullListing) return;

    const prefetchSwipeQueue = async () => {
      const nextListings = swipeQueue.peekNext(3);

      for (const listing of nextListings) {
        const slug = listing.slugAddress ?? listing.slug;
        if (!slug || listingCache.current.has(slug) || fetchingRef.current.has(slug)) {
          continue;
        }

        fetchingRef.current.add(slug);
        try {
          const res = await fetch(`/api/mls-listings/${slug}`);
          if (!res.ok) {
            // Silently skip 404s - listing might not be in DB yet
            if (res.status === 404) {
              console.warn(`⚠️ Listing ${slug} not found in database`);
            } else {
              console.error(`❌ HTTP ${res.status} fetching listing ${slug}`);
            }
            continue;
          }
          const json = await res.json();
          if (json?.listing && json.listing.listingKey) {
            listingCache.current.set(slug, json.listing);
          }
        } catch (err) {
          console.warn(`Failed to prefetch ${slug}:`, err);
        } finally {
          fetchingRef.current.delete(slug);
        }
      }
    };

    prefetchSwipeQueue();
  }, [swipeQueue.queueLength, swipeQueue.isReady, selectedFullListing]);

  // Smart cache management (LRU - keep last 100 listings)
  useEffect(() => {
    const MAX_CACHE_SIZE = 100;  // Keep up to 100 listings cached (prevents memory bloat)

    if (listingCache.current.size > MAX_CACHE_SIZE) {
      // Map maintains insertion order, so oldest entries are first
      const entries = Array.from(listingCache.current.entries());
      const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE);

      console.log(`🗑️ Cache cleanup: Removing ${toRemove.length} oldest entries (keeping ${MAX_CACHE_SIZE})`);

      toRemove.forEach(([slug]) => {
        listingCache.current.delete(slug);
      });
    }
  }, [visibleListings]);

  // Actions
  const loadListings = useCallback(
    async (bounds: any, filters: Filters, merge: boolean = false) => {
      // Note: merge parameter is ignored - new hook always replaces
      setIsLoading(true);
      try {
        await loadMarkers(bounds, filters);
        setIsPreloaded(true);
      } catch (error) {
        console.error("❌ Failed to load listings:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [loadMarkers]
  );

  const selectListing = useCallback(
    async (listing: MapListing | null, index?: number) => {
      if (!listing) {
        setVisibleIndex(null);
        setSelectedFullListing(null);
        return;
      }

      // Set index
      if (index !== undefined) {
        setVisibleIndex(index);
      } else {
        const foundIndex = visibleListings.findIndex((l) => l._id === listing._id);
        setVisibleIndex(foundIndex >= 0 ? foundIndex : null);
      }

      // Fetch full listing data
      const slug = listing.slugAddress ?? listing.slug;
      if (!slug) return;

      setIsLoadingListing(true);

      // Check cache first
      if (listingCache.current.has(slug)) {
        setSelectedFullListing(listingCache.current.get(slug)!);
        setIsLoadingListing(false);
        return;
      }

      // Fetch from API
      try {
        const res = await fetch(`/api/mls-listings/${slug}`);
        if (!res.ok) {
          if (res.status === 404) {
            console.warn(`⚠️ Listing ${slug} not found in database`);
          } else {
            console.error(`❌ HTTP ${res.status} fetching listing ${slug}`);
          }
          setSelectedFullListing(null);
          setIsLoadingListing(false);
          return;
        }
        const json = await res.json();

        if (json?.listing && json.listing.listingKey) {
          listingCache.current.set(slug, json.listing);
          setSelectedFullListing(json.listing);
        }
      } catch (error) {
        console.error("Error fetching listing:", error);
        setSelectedFullListing(null);
      } finally {
        setIsLoadingListing(false);
      }
    },
    [visibleListings]
  );

  const selectListingBySlug = useCallback(
    async (slug: string) => {
      const listing = visibleListings.find((l) => (l.slugAddress ?? l.slug) === slug);
      if (listing) {
        await selectListing(listing);
      }
    },
    [visibleListings, selectListing]
  );

  const closeListing = useCallback(() => {
    setVisibleIndex(null);
    setSelectedFullListing(null);
  }, []);

  const setFilters = useCallback((newFilters: Filters) => {
    setFiltersState(newFilters);
  }, []);

  const updateFilter = useCallback((key: keyof Filters, value: any) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilterState);
  }, []);

  // Toggle favorite - using the hook
  const toggleFavorite = useCallback(
    (listing: MapListing) => {
      const slug = listing.slugAddress ?? listing.slug;
      const isFavorited = likedListings.some((fav) => (fav.slugAddress ?? fav.slug) === slug);

      if (isFavorited) {
        removeFavoriteFromHook(listing);
      } else {
        addFavorite(listing);
      }
    },
    [likedListings, addFavorite, removeFavoriteFromHook]
  );

  // Remove favorite - using the hook
  const removeFavorite = useCallback(
    (listing: MapListing) => {
      removeFavoriteFromHook(listing);
    },
    [removeFavoriteFromHook]
  );

  // Clear all favorites - using the hook
  const clearFavorites = useCallback(() => {
    clearFavoritesFromHook();
  }, [clearFavoritesFromHook]);

  // Swipe left (dislike) - using the hook
  const swipeLeft = useCallback(
    (listing: IUnifiedListing) => {
      if (!swipeQueue.isReady) {
        console.warn("⚠️ Swipe system not ready yet");
        return;
      }

      swipeQueue.markAsDisliked(listing.listingKey, listing);

      // Add to disliked listings using hook
      addDislike(listing as unknown as MapListing);

      // Remove from favorites if present
      const slug = listing.slugAddress ?? listing.listingKey;
      const isFavorited = likedListings.some((fav) => (fav.slugAddress ?? fav.slug) === slug);
      if (isFavorited) {
        removeFavoriteFromHook(listing as unknown as MapListing);
      }
    },
    [swipeQueue, addDislike, likedListings, removeFavoriteFromHook]
  );

  const value: MLSContextValue = {
    allListings,
    visibleListings,
    markers,
    selectedListing,
    selectedFullListing,
    visibleIndex,
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    likedListings,
    dislikedListings,
    toggleFavorite,
    removeFavorite,
    clearFavorites,
    swipeLeft,
    removeDislike,
    clearDislikes,
    mapStyle,
    setMapStyle,
    isLoading,
    isLoadingViewport,
    isPreloaded,
    isLoadingListing,
    listingCache,
    loadListings,
    selectListing,
    selectListingBySlug,
    closeListing,
    swipeQueue,
    totalCount: totalCount?.total ?? 0,
  };

  return <MLSContext.Provider value={value}>{children}</MLSContext.Provider>;
}

export function useMLSContext() {
  const context = useContext(MLSContext);
  if (!context) {
    throw new Error("useMLSContext must be used within MLSProvider");
  }
  return context;
}
