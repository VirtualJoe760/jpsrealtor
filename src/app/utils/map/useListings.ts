// src/app/utils/map/useListings.ts
import { useState, useCallback, useRef } from "react";
import type { MapListing, Filters } from "@/types/types";

// Server-side clustering - minimal data sent to client
export interface ServerCluster {
  id: number;
  latitude: number;
  longitude: number;
  count: number;
  expansionZoom: number;
  minPrice: number | null;
  maxPrice: number | null;
  avgPrice: number | null;
}

export interface TotalCount {
  gps: number;
  crmls: number;
  total: number;
}

interface LoadedRegion {
  north: number;
  south: number;
  east: number;
  west: number;
  zoom: number;
  timestamp: number;
}

export function useListings() {
  const [clusters, setClusters] = useState<ServerCluster[]>([]);
  const [listings, setListings] = useState<MapListing[]>([]);
  const [totalCount, setTotalCount] = useState<TotalCount | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // For backwards compatibility
  const [allListings, setAllListings] = useState<MapListing[]>([]);
  const [visibleListings, setVisibleListings] = useState<MapListing[]>([]);

  // Track loaded regions to avoid duplicate requests
  const loadedRegionsRef = useRef<LoadedRegion[]>([]);
  const loadingRef = useRef<boolean>(false);
  const filtersHashRef = useRef<string>("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const getFiltersHash = (filters: Filters): string => JSON.stringify(filters);

  /**
   * Check if bounds are already covered by loaded regions at same zoom
   */
  const isBoundsCovered = useCallback((bounds: { north: number; south: number; east: number; west: number }, zoom: number) => {
    const margin = 0.01;
    return loadedRegionsRef.current.some(region => {
      const cacheAge = Date.now() - region.timestamp;
      if (cacheAge > 2 * 60 * 1000) return false; // 2 min cache
      if (Math.abs(region.zoom - zoom) > 1) return false; // Different zoom level

      return (
        bounds.north <= region.north + margin &&
        bounds.south >= region.south - margin &&
        bounds.east <= region.east + margin &&
        bounds.west >= region.west - margin
      );
    });
  }, []);

  /**
   * Load clustered data from server
   */
  const loadListings = useCallback(async (
    bounds: { north: number; south: number; east: number; west: number; zoom?: number },
    filters: Filters,
    merge: boolean = false
  ) => {
    const zoom = bounds.zoom || 10;
    const currentFiltersHash = getFiltersHash(filters);

    // If filters changed, clear cache
    if (currentFiltersHash !== filtersHashRef.current) {
      console.log('🔄 Filters changed, clearing cache');
      loadedRegionsRef.current = [];
      filtersHashRef.current = currentFiltersHash;
      setClusters([]);
      setListings([]);
      setAllListings([]);
      setVisibleListings([]);
    }

    // Check if already covered
    if (merge && isBoundsCovered(bounds, zoom)) {
      console.log('📦 Viewport already loaded, skipping');
      return;
    }

    if (loadingRef.current) {
      console.log('⏳ Already loading, skipping');
      return;
    }

    // Debounce for panning
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const delay = merge ? 200 : 0;

    return new Promise<void>((resolve) => {
      debounceRef.current = setTimeout(async () => {
        loadingRef.current = true;
        setIsLoading(true);

        try {
          const params: Record<string, string> = {
            north: String(bounds.north),
            south: String(bounds.south),
            east: String(bounds.east),
            west: String(bounds.west),
            zoom: String(zoom),
          };

          // Add filters
          if (filters.listingType) params.listingType = filters.listingType;
          if (filters.minPrice) params.minPrice = filters.minPrice;
          if (filters.maxPrice) params.maxPrice = filters.maxPrice;
          if (filters.beds) params.beds = filters.beds;
          if (filters.baths) params.baths = filters.baths;
          if (filters.propertyType) params.propertyType = filters.propertyType;

          const queryString = new URLSearchParams(params).toString();
          const apiUrl = `/api/mls-listings/clustered?${queryString}`;

          console.log('🌐 Fetching clustered data:', apiUrl);

          const res = await fetch(apiUrl);
          const data = await res.json();

          console.log(`✅ Received ${data.clusters?.length || 0} clusters, ${data.listings?.length || 0} listings`);

          // Update total count
          if (data.totalCount) {
            setTotalCount(data.totalCount);
          }

          // Track loaded region
          loadedRegionsRef.current.push({
            ...bounds,
            zoom,
            timestamp: Date.now(),
          });
          if (loadedRegionsRef.current.length > 5) {
            loadedRegionsRef.current = loadedRegionsRef.current.slice(-5);
          }

          // Update state
          setClusters(data.clusters || []);
          setListings(data.listings || []);

          // Backwards compatibility
          setAllListings(data.listings || []);
          setVisibleListings(data.listings || []);

        } catch (error) {
          console.error('❌ Failed to load clustered data:', error);
        } finally {
          loadingRef.current = false;
          setIsLoading(false);
          resolve();
        }
      }, delay);
    });
  }, [isBoundsCovered]);

  const clearCache = useCallback(() => {
    loadedRegionsRef.current = [];
    filtersHashRef.current = "";
  }, []);

  return {
    // New server-side clustering
    clusters,
    listings,
    // Backwards compatibility
    allListings,
    visibleListings,
    setVisibleListings,
    // Common
    loadListings,
    clearCache,
    totalCount,
    isLoading,
  };
}
