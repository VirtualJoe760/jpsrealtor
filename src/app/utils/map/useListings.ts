// src/app/utils/map/useListings.ts
import { useState, useCallback, useRef } from "react";
import type { MapListing, Filters } from "@/types/types";

// Viewport-based loading - different limits based on zoom level
const LISTINGS_PER_VIEWPORT = 250; // Reduced from 1000 for faster initial load
const LISTINGS_AT_HIGH_ZOOM = 1000; // Reduced from 5000 - let clustering handle display

// Maximum total listings to keep in memory (prevents memory issues on mobile)
const MAX_CACHED_LISTINGS = 2000;

// Zoom threshold where we show individual markers (no clustering)
const HIGH_ZOOM_THRESHOLD = 14; // Increased from 12 - rely on clustering longer

interface LoadedRegion {
  north: number;
  south: number;
  east: number;
  west: number;
  timestamp: number;
  zoom: number; // Track zoom level to handle high-zoom requery
  isHighZoom: boolean; // Whether this was loaded at high zoom (12+)
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
   * At high zoom (12+), we need high-zoom specific data, not cached low-zoom data
   */
  const isBoundsCovered = useCallback((bounds: { north: number; south: number; east: number; west: number; zoom?: number }) => {
    const margin = 0.01; // Small margin for floating point comparison
    const isHighZoom = (bounds.zoom ?? 0) >= HIGH_ZOOM_THRESHOLD;

    return loadedRegionsRef.current.some(region => {
      const cacheAge = Date.now() - region.timestamp;
      // Cache expires after 5 minutes
      if (cacheAge > 5 * 60 * 1000) return false;

      // If we're at high zoom, only use cached data from high zoom loads
      // This ensures we requery when zooming in past the cluster threshold
      if (isHighZoom && !region.isHighZoom) {
        return false;
      }

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

    const isHighZoom = (bounds.zoom ?? 0) >= 12; // Zoom 12-13 should finish loading

    // At high zoom (12-13), don't cancel ongoing requests - let them finish
    if (loadingRef.current && isHighZoom) {
      console.log('⏳ High zoom - allowing current load to complete');
      return;
    }

    // At lower zooms, prevent duplicate requests
    if (loadingRef.current && !isHighZoom) {
      console.log('⏳ Already loading (low zoom), skipping...');
      return;
    }

    // Debounce rapid viewport changes (e.g., during fast panning)
    // BUT: At high zoom (12-13), use longer debounce to ensure query completes
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // For initial load (not merge), load immediately
    // For panning (merge), debounce longer at high zoom
    const delay = merge ? (isHighZoom ? 800 : 300) : 0;

    return new Promise<void>((resolve) => {
      debounceRef.current = setTimeout(async () => {
        loadingRef.current = true;
        setIsLoading(true);

        const isHighZoom = (bounds.zoom ?? 0) >= HIGH_ZOOM_THRESHOLD;
        const limit = isHighZoom ? LISTINGS_AT_HIGH_ZOOM : LISTINGS_PER_VIEWPORT;

        console.log(`🔍 Loading listings for viewport (zoom: ${bounds.zoom}, isHighZoom: ${isHighZoom}, limit: ${limit}):`, bounds);

        try {
          const params: Record<string, string> = {
            north: String(bounds.north),
            south: String(bounds.south),
            east: String(bounds.east),
            west: String(bounds.west),
            limit: String(limit),
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

          // Incremental loading - show listings in batches for faster perceived load time
          const BATCH_SIZE = 50; // Show 50 listings at a time
          const shouldBatch = newListings.length > BATCH_SIZE && isHighZoom;

          // Track this region as loaded
          loadedRegionsRef.current.push({
            north: bounds.north,
            south: bounds.south,
            east: bounds.east,
            west: bounds.west,
            timestamp: Date.now(),
            zoom: bounds.zoom ?? 0,
            isHighZoom,
          });

          // Clean up old regions (keep last 10)
          if (loadedRegionsRef.current.length > 10) {
            loadedRegionsRef.current = loadedRegionsRef.current.slice(-10);
          }

          // Helper function to add listings incrementally in batches
          const addListingsInBatches = async (listings: MapListing[], merge: boolean) => {
            if (!shouldBatch) {
              // Add all at once if not batching
              if (merge) {
                setAllListings(prev => {
                  const existingKeys = new Set(prev.map(l => l.listingKey || l._id));
                  const uniqueNew = listings.filter(
                    (l: MapListing) => !existingKeys.has(l.listingKey || l._id)
                  );
                  const merged = [...prev, ...uniqueNew];
                  if (merged.length > MAX_CACHED_LISTINGS) {
                    return merged.slice(-MAX_CACHED_LISTINGS);
                  }
                  return merged;
                });
                setVisibleListings(prev => {
                  const existingKeys = new Set(prev.map(l => l.listingKey || l._id));
                  const uniqueNew = listings.filter(
                    (l: MapListing) => !existingKeys.has(l.listingKey || l._id)
                  );
                  const merged = [...prev, ...uniqueNew];
                  if (merged.length > MAX_CACHED_LISTINGS) {
                    return merged.slice(-MAX_CACHED_LISTINGS);
                  }
                  return merged;
                });
              } else {
                setAllListings(listings);
                setVisibleListings(listings);
              }
              return;
            }

            // Batch loading for better UX
            console.log(`📦 Loading ${listings.length} listings in batches of ${BATCH_SIZE}`);
            for (let i = 0; i < listings.length; i += BATCH_SIZE) {
              const batch = listings.slice(i, i + BATCH_SIZE);

              setAllListings(prev => {
                const existingKeys = new Set(prev.map(l => l.listingKey || l._id));
                const uniqueNew = batch.filter(
                  (l: MapListing) => !existingKeys.has(l.listingKey || l._id)
                );
                const merged = [...prev, ...uniqueNew];
                if (merged.length > MAX_CACHED_LISTINGS) {
                  return merged.slice(-MAX_CACHED_LISTINGS);
                }
                return merged;
              });
              setVisibleListings(prev => {
                const existingKeys = new Set(prev.map(l => l.listingKey || l._id));
                const uniqueNew = batch.filter(
                  (l: MapListing) => !existingKeys.has(l.listingKey || l._id)
                );
                const merged = [...prev, ...uniqueNew];
                if (merged.length > MAX_CACHED_LISTINGS) {
                  return merged.slice(-MAX_CACHED_LISTINGS);
                }
                return merged;
              });

              // Small delay between batches for smooth rendering
              if (i + BATCH_SIZE < listings.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }
          };

          // Add listings with or without batching
          if (merge) {
            await addListingsInBatches(newListings, true);
          } else {
            // Replace listings entirely (initial load)
            await addListingsInBatches(newListings, false);
            // Clear loaded regions on fresh load
            loadedRegionsRef.current = [{
              north: bounds.north,
              south: bounds.south,
              east: bounds.east,
              west: bounds.west,
              timestamp: Date.now(),
              zoom: bounds.zoom ?? 0,
              isHighZoom,
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
