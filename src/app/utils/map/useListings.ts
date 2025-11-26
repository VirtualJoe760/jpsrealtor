// src/app/utils/map/useListings.ts
import { useState, useCallback, useRef } from "react";
import type { MapListing, Filters } from "@/types/types";

// Viewport-based loading
const LISTINGS_PER_VIEWPORT = 1000;

// Maximum total listings to keep in memory (prevents memory issues on mobile)
const MAX_CACHED_LISTINGS = 2000;

interface LoadedRegion {
  north: number;
  south: number;
  east: number;
  west: number;
  timestamp: number;
}

export interface TotalCount {
  gps: number;
  crmls: number;
  total: number;
}

export function useListings() {
  const [allListings, setAllListings] = useState<MapListing[]>([]);
  const [visibleListings, setVisibleListings] = useState<MapListing[]>([]);
  const [totalCount, setTotalCount] = useState<TotalCount | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Track loaded regions to avoid duplicate requests
  const loadedRegionsRef = useRef<LoadedRegion[]>([]);
  const loadingRef = useRef<boolean>(false);
  const filtersHashRef = useRef<string>("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Check if bounds are already covered by loaded regions
   */
  const isBoundsCovered = useCallback((bounds: { north: number; south: number; east: number; west: number }) => {
    const margin = 0.01; // Small margin for floating point comparison
    return loadedRegionsRef.current.some(region => {
      const cacheAge = Date.now() - region.timestamp;
      // Cache expires after 5 minutes
      if (cacheAge > 5 * 60 * 1000) return false;

      return (
        bounds.north <= region.north + margin &&
        bounds.south >= region.south - margin &&
        bounds.east <= region.east + margin &&
        bounds.west >= region.west - margin
      );
    });
  }, []);

  /**
   * Get a hash of filters to detect changes
   */
  const getFiltersHash = (filters: Filters): string => {
    return JSON.stringify(filters);
  };

  /**
   * Load listings from API for the given viewport bounds
   * Optimized for mobile - loads only visible viewport with smart caching
   */
  const loadListings = useCallback(async (
    bounds: { north: number; south: number; east: number; west: number; zoom?: number },
    filters: Filters,
    merge: boolean = false
  ) => {
    const currentFiltersHash = getFiltersHash(filters);

    // If filters changed, clear cache and reload
    if (currentFiltersHash !== filtersHashRef.current) {
      console.log('🔄 Filters changed, clearing cache');
      loadedRegionsRef.current = [];
      filtersHashRef.current = currentFiltersHash;
      setAllListings([]);
      setVisibleListings([]);
    }

    // Check if this viewport is already covered
    if (merge && isBoundsCovered(bounds)) {
      console.log('📦 Viewport already loaded, skipping API call');
      return;
    }

    // Prevent duplicate requests
    if (loadingRef.current) {
      console.log('⏳ Already loading, skipping...');
      return;
    }

    // Debounce rapid viewport changes (e.g., during fast panning)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // For initial load (not merge), load immediately
    // For panning (merge), debounce to avoid API spam
    const delay = merge ? 300 : 0;

    return new Promise<void>((resolve) => {
      debounceRef.current = setTimeout(async () => {
        loadingRef.current = true;
        setIsLoading(true);
        console.log('🔍 Loading listings for viewport:', bounds);

        try {
          const params: Record<string, string> = {
            north: String(bounds.north),
            south: String(bounds.south),
            east: String(bounds.east),
            west: String(bounds.west),
            limit: String(LISTINGS_PER_VIEWPORT),
          };

          // Listing Type (sale vs rental)
          if (filters.listingType) params.listingType = filters.listingType;

          // Price filters
          if (filters.minPrice) params.minPrice = filters.minPrice;
          if (filters.maxPrice) params.maxPrice = filters.maxPrice;

          // Beds/Baths
          if (filters.beds) params.beds = filters.beds;
          if (filters.baths) params.baths = filters.baths;

          // Square Footage
          if (filters.minSqft) params.minSqft = filters.minSqft;
          if (filters.maxSqft) params.maxSqft = filters.maxSqft;

          // Lot Size
          if (filters.minLotSize) params.minLotSize = filters.minLotSize;
          if (filters.maxLotSize) params.maxLotSize = filters.maxLotSize;

          // Year Built
          if (filters.minYear) params.minYear = filters.minYear;
          if (filters.maxYear) params.maxYear = filters.maxYear;

          // Property Type
          if (filters.propertyType) params.propertyType = filters.propertyType;
          if (filters.propertySubType) params.propertySubType = filters.propertySubType;

          // Amenities
          if (filters.poolYn !== undefined) params.pool = String(filters.poolYn);
          if (filters.spaYn !== undefined) params.spa = String(filters.spaYn);
          if (filters.viewYn !== undefined) params.view = String(filters.viewYn);
          if (filters.garageYn !== undefined) params.garage = String(filters.garageYn);

          // Garage count
          if (filters.minGarages) params.minGarages = filters.minGarages;

          // HOA
          if (filters.hoa) params.hoa = filters.hoa;
          if (filters.associationYN !== undefined) params.hasHOA = String(filters.associationYN);

          // Community
          if (filters.gatedCommunity !== undefined) params.gated = String(filters.gatedCommunity);
          if (filters.seniorCommunity !== undefined) params.senior = String(filters.seniorCommunity);

          // Land Type
          if (filters.landType) params.landType = filters.landType;

          // Location
          if (filters.city) params.city = filters.city;
          if (filters.subdivision) params.subdivision = filters.subdivision;

          const queryString = new URLSearchParams(params).toString();
          const apiUrl = `/api/mls-listings?${queryString}`;

          console.log('🌐 Fetching listings from:', apiUrl);

          const res = await fetch(apiUrl);
          const data = await res.json();

          const newListings = data.listings || [];
          console.log(`✅ Received ${newListings.length} listings from API`);

          // Update total count if available
          if (data.totalCount) {
            setTotalCount(data.totalCount);
            console.log(`📊 Total listings - GPS: ${data.totalCount.gps}, CRMLS: ${data.totalCount.crmls}, Total: ${data.totalCount.total}`);
          }

          // Track this region as loaded
          loadedRegionsRef.current.push({
            north: bounds.north,
            south: bounds.south,
            east: bounds.east,
            west: bounds.west,
            timestamp: Date.now(),
          });

          // Clean up old regions (keep last 10)
          if (loadedRegionsRef.current.length > 10) {
            loadedRegionsRef.current = loadedRegionsRef.current.slice(-10);
          }

          if (merge) {
            // Merge with existing listings, avoiding duplicates
            setAllListings(prev => {
              const existingKeys = new Set(prev.map(l => l.listingKey || l._id));
              const uniqueNew = newListings.filter(
                (l: MapListing) => !existingKeys.has(l.listingKey || l._id)
              );
              console.log(`🔀 Merging ${uniqueNew.length} new listings with ${prev.length} existing`);

              // Limit total cached listings to prevent memory issues on mobile
              const merged = [...prev, ...uniqueNew];
              if (merged.length > MAX_CACHED_LISTINGS) {
                console.log(`⚠️ Trimming cache from ${merged.length} to ${MAX_CACHED_LISTINGS}`);
                return merged.slice(-MAX_CACHED_LISTINGS);
              }
              return merged;
            });
            setVisibleListings(prev => {
              const existingKeys = new Set(prev.map(l => l.listingKey || l._id));
              const uniqueNew = newListings.filter(
                (l: MapListing) => !existingKeys.has(l.listingKey || l._id)
              );
              const merged = [...prev, ...uniqueNew];
              if (merged.length > MAX_CACHED_LISTINGS) {
                return merged.slice(-MAX_CACHED_LISTINGS);
              }
              return merged;
            });
          } else {
            // Replace listings entirely (initial load)
            setAllListings(newListings);
            setVisibleListings(newListings);
            // Clear loaded regions on fresh load
            loadedRegionsRef.current = [{
              north: bounds.north,
              south: bounds.south,
              east: bounds.east,
              west: bounds.west,
              timestamp: Date.now(),
            }];
          }
        } catch (error) {
          console.error('❌ Failed to load listings:', error);
        } finally {
          loadingRef.current = false;
          setIsLoading(false);
          resolve();
        }
      }, delay);
    });
  }, [isBoundsCovered]);

  /**
   * Clear the cache (useful when filters change)
   */
  const clearCache = useCallback(() => {
    loadedRegionsRef.current = [];
    filtersHashRef.current = "";
  }, []);

  return {
    allListings,
    visibleListings,
    setVisibleListings,
    loadListings,
    clearCache,
    totalCount,
    isLoading,
  };
}
