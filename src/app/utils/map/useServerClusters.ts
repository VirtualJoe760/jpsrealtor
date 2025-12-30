// CLEAN VERSION - Starting from scratch with robust logging

import { useState, useCallback, useRef, useEffect } from "react";
import type { MapListing, Filters } from "@/types/types";
import { applyCenterFocusedClustering, type RadialCluster } from "./center-focused-clustering";

// Re-export RadialCluster for external use
export type { RadialCluster };

export interface ServerCluster {
  latitude: number;
  longitude: number;
  count: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  propertyTypes: string[];
  mlsSources: string[];
  sampleListingIds: string[];
  isCluster: true;
}

export type MapMarker = MapListing | ServerCluster | RadialCluster;

export function isServerCluster(marker: MapMarker): marker is ServerCluster {
  return 'isCluster' in marker && marker.isCluster === true && !('clusterType' in marker);
}

export function isRadialCluster(marker: MapMarker): marker is RadialCluster {
  return 'isCluster' in marker && marker.isCluster === true && 'clusterType' in marker && marker.clusterType === 'radial';
}

export interface TotalCount {
  total: number;
  byMLS?: Record<string, number>;
}

export function useServerClusters() {
  console.log('[useServerClusters] Hook initialized');

  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [totalCount, setTotalCount] = useState<TotalCount | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const boundsRef = useRef<{ north: number; south: number; east: number; west: number; zoom: number } | null>(null);

  // Detect mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadMarkers = useCallback(
    async (
      bounds: {
        north: number;
        south: number;
        east: number;
        west: number;
        zoom: number;
      },
      filters?: Filters
    ) => {
      console.log('[loadMarkers] ========== START ==========');
      console.log('[loadMarkers] Bounds:', bounds);
      console.log('[loadMarkers] Filters:', filters);

      // Store bounds for center-focused clustering
      boundsRef.current = bounds;

      setIsLoading(true);

      try {
        // Build query parameters
        const params: Record<string, string> = {
          north: String(bounds.north),
          south: String(bounds.south),
          east: String(bounds.east),
          west: String(bounds.west),
          zoom: String(bounds.zoom),
        };

        // Add all filters to query params
        if (filters) {
          // Listing Type
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
          if (filters.poolYn !== undefined) params.poolYn = String(filters.poolYn);
          if (filters.spaYn !== undefined) params.spaYn = String(filters.spaYn);
          if (filters.viewYn !== undefined) params.viewYn = String(filters.viewYn);
          if (filters.garageYn !== undefined) params.garageYn = String(filters.garageYn);

          // Garage count
          if (filters.minGarages) params.minGarages = filters.minGarages;

          // HOA
          if (filters.hoa) params.hoa = filters.hoa;
          if (filters.associationYN !== undefined) params.associationYN = String(filters.associationYN);

          // Community
          if (filters.gatedCommunity !== undefined) params.gatedCommunity = String(filters.gatedCommunity);
          if (filters.seniorCommunity !== undefined) params.seniorCommunity = String(filters.seniorCommunity);

          // Land Type
          if (filters.landType) params.landType = filters.landType;

          // Location
          if (filters.city) params.city = filters.city;
          if (filters.subdivision) params.subdivision = filters.subdivision;
        }

        const queryString = new URLSearchParams(params).toString();
        const apiUrl = `/api/map-clusters?${queryString}`;

        console.log('[loadMarkers] Fetching from:', apiUrl);

        const res = await fetch(apiUrl);

        console.log('[loadMarkers] Response:', res.status, res.statusText);

        if (!res.ok) {
          throw new Error(`API returned ${res.status}`);
        }

        const data = await res.json();

        console.log('[loadMarkers] Data received:', {
          type: data.type,
          clusterCount: data.clusters?.length || 0,
          listingCount: data.listings?.length || 0,
          totalCount: data.totalCount
        });

        if (data.type === 'clusters') {
          const clusters: ServerCluster[] = data.clusters || [];
          const listings: MapListing[] = data.listings || [];

          console.log('[loadMarkers] Setting markers:', {
            clusters: clusters.length,
            listings: listings.length,
            total: clusters.length + listings.length
          });

          setMarkers([...clusters, ...listings]);
          setTotalCount({ total: data.totalCount || 0 });
        } else if (data.type === 'listings') {
          const listings: MapListing[] = data.listings || [];

          console.log('[loadMarkers] Received', listings.length, 'individual listings from server');

          // DISABLE client-side clustering - server already provides optimal data
          // At zoom 12+, show individual markers as-is
          // At lower zooms, server provides pre-clustered boundaries
          setMarkers(listings);
          setTotalCount({ total: data.totalCount || 0 });
        }

        console.log('[loadMarkers] ========== SUCCESS ==========');
      } catch (error) {
        console.error('[loadMarkers] ========== ERROR ==========');
        console.error('[loadMarkers] Error:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [isMobile]
  );

  const clearMarkers = useCallback(() => {
    console.log('[clearMarkers] Clearing all markers');
    setMarkers([]);
    setTotalCount(null);
  }, []);

  console.log('[useServerClusters] Current state:', {
    markersCount: markers.length,
    totalCount: totalCount?.total,
    isLoading
  });

  return {
    markers,
    totalCount,
    isLoading,
    loadMarkers,
    clearMarkers,
  };
}
