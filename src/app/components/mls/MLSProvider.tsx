"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { MapListing, Filters } from "@/types/types";
import type { IListing } from "@/models/listings";
import { useListings, TotalCount } from "@/app/utils/map/useListings";
import { useSwipeQueue } from "@/app/utils/map/useSwipeQueue";
import { useTheme } from "@/app/contexts/ThemeContext";

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
  selectedListing: MapListing | null;
  selectedFullListing: IListing | null;
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
  swipeLeft: (listing: IListing) => void;

  // Map Controls
  mapStyle: 'toner' | 'dark' | 'satellite' | 'bright';
  setMapStyle: (value: 'toner' | 'dark' | 'satellite' | 'bright') => void;

  // Loading States
  isLoading: boolean;
  isPreloaded: boolean;
  isLoadingListing: boolean;

  // Cache
  listingCache: React.MutableRefObject<Map<string, IListing>>;

  // Actions
  loadListings: (bounds: any, filters: Filters, merge?: boolean) => Promise<void>;
  selectListing: (listing: MapListing | null, index?: number) => Promise<void>;
  selectListingBySlug: (slug: string) => Promise<void>;
  closeListing: () => void;

  // Swipe Queue
  swipeQueue: ReturnType<typeof useSwipeQueue>;

  // Total listing counts
  totalCount: TotalCount | null;
}

const MLSContext = createContext<MLSContextValue | null>(null);

export function MLSProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTheme } = useTheme();

  // Core hooks
  const { allListings, visibleListings, loadListings: loadListingsCore, totalCount } = useListings();
  const swipeQueue = useSwipeQueue();

  // Refs for caching
  const listingCache = useRef<Map<string, IListing>>(new Map());
  const fetchingRef = useRef<Set<string>>(new Set());

  // State
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
  const [selectedFullListing, setSelectedFullListing] = useState<IListing | null>(null);
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

  // Favorites & Dislikes
  const [likedListings, setLikedListings] = useState<MapListing[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("likedListings");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [dislikedListings, setDislikedListings] = useState<any[]>([]);

  // Selected listing (computed from visibleIndex)
  const selectedListing = React.useMemo((): MapListing | null => {
    if (visibleIndex === null || visibleIndex < 0 || visibleIndex >= visibleListings.length) {
      return null;
    }
    return visibleListings[visibleIndex] ?? null;
  }, [visibleIndex, visibleListings]);

  // Save favorites to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("likedListings", JSON.stringify(likedListings));
      } catch (e) {
        console.error("❌ Failed to save favorites:", e);
      }
    }
  }, [likedListings]);

  // Fetch disliked listings from API
  useEffect(() => {
    async function fetchDislikedListings() {
      if (!swipeQueue.isReady) return;

      try {
        const response = await fetch("/api/swipes/user");
        if (!response.ok) return;

        const data = await response.json();
        const disliked = data.dislikedListings || [];

        const dislikedData = disliked
          .map((item: any) => ({
            ...item.listingData,
            listingKey: item.listingKey,
            listingId: item.listingData?.listingId || item.listingKey,
            _id: item.listingData?._id || item._id,
            swipedAt: item.swipedAt,
            expiresAt: item.expiresAt,
          }))
          .filter((item: any) => item && Object.keys(item).length > 4);

        setDislikedListings(dislikedData);
      } catch (error) {
        console.error("Error fetching disliked listings:", error);
      }
    }

    fetchDislikedListings();
  }, [swipeQueue.isReady]);

  // Prefetch full listings (first 5 visible)
  useEffect(() => {
    const prefetchListings = async () => {
      const slugsToFetch = visibleListings
        .slice(0, 5)
        .map((listing) => listing.slugAddress ?? listing.slug)
        .filter(
          (slug): slug is string =>
            !!slug && !listingCache.current.has(slug) && !fetchingRef.current.has(slug)
        );

      for (const slug of slugsToFetch) {
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
          console.error(`❌ Error prefetching listing ${slug}:`, err);
        } finally {
          fetchingRef.current.delete(slug);
        }
      }
    };

    prefetchListings();
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

  // Clear stale cache
  useEffect(() => {
    const validSlugs = new Set(visibleListings.map((l) => l.slugAddress ?? l.slug));
    for (const slug of listingCache.current.keys()) {
      if (!validSlugs.has(slug)) {
        listingCache.current.delete(slug);
      }
    }
  }, [visibleListings]);

  // Actions
  const loadListings = useCallback(
    async (bounds: any, filters: Filters, merge: boolean = false) => {
      console.log('🔄 MLSProvider.loadListings called with bounds:', bounds);
      console.log('🔄 MLSProvider.loadListings filters:', filters);
      console.log('🔄 MLSProvider.loadListings merge mode:', merge);
      setIsLoading(true);
      try {
        await loadListingsCore(bounds, filters, merge);
        setIsPreloaded(true);
        console.log('✅ MLSProvider.loadListings completed successfully');
      } catch (error) {
        console.error("❌ Failed to load listings:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [loadListingsCore]
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

  const toggleFavorite = useCallback(
    (listing: MapListing) => {
      const slug = listing.slugAddress ?? listing.slug;
      const isFavorited = likedListings.some((fav) => (fav.slugAddress ?? fav.slug) === slug);

      if (isFavorited) {
        setLikedListings((prev) => prev.filter((fav) => (fav.slugAddress ?? fav.slug) !== slug));
      } else {
        setLikedListings((prev) => [...prev, listing]);
      }
    },
    [likedListings]
  );

  const removeFavorite = useCallback((listing: MapListing) => {
    const slug = listing.slugAddress ?? listing.slug;
    setLikedListings((prev) => prev.filter((fav) => (fav.slugAddress ?? fav.slug) !== slug));
  }, []);

  const clearFavorites = useCallback(() => {
    setLikedListings([]);
  }, []);

  const swipeLeft = useCallback(
    (listing: IListing) => {
      if (!swipeQueue.isReady) {
        console.warn("⚠️ Swipe system not ready yet");
        return;
      }

      swipeQueue.markAsDisliked(listing.listingKey, listing);

      // Optimistically add to disliked state
      setDislikedListings((prev) => {
        if (prev.some((d) => d.listingKey === listing.listingKey)) return prev;
        return [
          ...prev,
          {
            ...listing,
            swipedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          },
        ];
      });

      // Remove from favorites if present
      const slug = listing.slugAddress ?? listing.listingKey;
      setLikedListings((prev) => prev.filter((fav) => (fav.slugAddress ?? fav.slug) !== slug));
    },
    [swipeQueue]
  );

  const value: MLSContextValue = {
    allListings,
    visibleListings,
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
    mapStyle,
    setMapStyle,
    isLoading,
    isPreloaded,
    isLoadingListing,
    listingCache,
    loadListings,
    selectListing,
    selectListingBySlug,
    closeListing,
    swipeQueue,
    totalCount,
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
