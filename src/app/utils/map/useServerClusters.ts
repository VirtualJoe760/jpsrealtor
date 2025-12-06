// CLEAN VERSION - Starting from scratch with robust logging

import { useState, useCallback, useRef } from "react";
import type { MapListing, Filters } from "@/types/types";

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

export type MapMarker = MapListing | ServerCluster;

export function isServerCluster(marker: MapMarker): marker is ServerCluster {
  return 'isCluster' in marker && marker.isCluster === true;
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

          console.log('[loadMarkers] Setting listings:', listings.length);

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
    []
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
