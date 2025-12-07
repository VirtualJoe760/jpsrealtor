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

        // Add listingType filter
        if (filters?.listingType) {
          params.listingType = filters.listingType;
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

          console.log('[loadMarkers] Applying center-focused clustering to', listings.length, 'listings', isMobile ? '(MOBILE)' : '(DESKTOP)');

          // Apply center-focused clustering with mobile awareness
          const { centerMarkers, peripheryClusters } = applyCenterFocusedClustering(
            listings,
            bounds,
            0.75, // 75% of viewport shows as individual markers (with 1.8x multiplier = ~135% effective coverage)
            isMobile // Pass mobile flag for adjusted clustering behavior
          );

          console.log('[loadMarkers] Center-focused clustering results:', {
            centerMarkers: centerMarkers.length,
            peripheryClusters: peripheryClusters.length,
            total: centerMarkers.length + peripheryClusters.length,
            isMobile
          });

          setMarkers([...centerMarkers, ...peripheryClusters]);
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
