// src/app/utils/map/useServerClusters.ts
// Hook for fetching server-side clustered data with accurate counts

import { useState, useCallback, useRef } from "react";
import type { MapListing, Filters } from "@/types/types";

// Server-side cluster type
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

// Combined type for map markers
export type MapMarker = MapListing | ServerCluster;

export function isServerCluster(marker: MapMarker): marker is ServerCluster {
  return 'isCluster' in marker && marker.isCluster === true;
}

interface LoadedRegion {
  north: number;
  south: number;
  east: number;
  west: number;
  zoom: number;
  timestamp: number;
}

export interface TotalCount {
  total: number;
  byMLS?: Record<string, number>;
}

export function useServerClusters() {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [totalCount, setTotalCount] = useState<TotalCount | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const loadedRegionsRef = useRef<LoadedRegion[]>([]);
  const loadingRef = useRef<boolean>(false);
  const filtersHashRef = useRef<string>("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Check if bounds are already covered by loaded regions
   */
  const isBoundsCovered = useCallback((bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
    zoom: number;
  }) => {
    const margin = 0.01;

    return loadedRegionsRef.current.some(region => {
      const cacheAge = Date.now() - region.timestamp;
      if (cacheAge > 5 * 60 * 1000) return false; // 5 minute cache

      // Must be exact same zoom level for server-side clusters
      // (different zoom = different cluster groupings)
      if (region.zoom !== bounds.zoom) return false;

      // Check if region covers bounds
      return (
        region.north >= bounds.north + margin &&
        region.south <= bounds.south - margin &&
        region.east >= bounds.east + margin &&
        region.west <= bounds.west - margin
      );
    });
  }, []);

  /**
   * Load markers (clusters or listings) for given bounds and zoom
   */
  const loadMarkers = useCallback(
    async (
      bounds: {
        north: number;
        south: number;
        east: number;
        west: number;
        zoom: number;
      },
      filters?: Filters,
      options: { force?: boolean; merge?: boolean } = {}
    ) => {
      const { force = false, merge = false } = options;

      console.log('🚀 useServerClusters.loadMarkers called with:', {
        zoom: bounds.zoom,
        north: bounds.north.toFixed(4),
        south: bounds.south.toFixed(4),
        east: bounds.east.toFixed(4),
        west: bounds.west.toFixed(4),
        force,
        merge
      });

      // Cancel previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        console.log('⏭️ Cancelled previous request');
      }

      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      // Serialize filters for change detection
      const currentFiltersHash = JSON.stringify(filters || {});
      const filtersChanged = currentFiltersHash !== filtersHashRef.current;

      if (filtersChanged) {
        console.log('🔄 Filters changed, clearing cache');
        loadedRegionsRef.current = [];
        filtersHashRef.current = currentFiltersHash;
      }

      // Skip if already loading
      if (loadingRef.current && !force) {
        console.log('⏭️ Already loading, skipping duplicate request');
        return;
      }

      // Check if bounds are covered
      const covered = isBoundsCovered(bounds);
      console.log('🔍 Cache check:', { covered, force, filtersChanged, loadedRegions: loadedRegionsRef.current.length });

      // Skip if bounds already covered (unless forced or filters changed)
      if (!force && !filtersChanged && covered) {
        console.log('✅ Bounds already loaded, skipping. Loaded regions:', loadedRegionsRef.current.map(r => ({ zoom: r.zoom, age: ((Date.now() - r.timestamp) / 1000).toFixed(0) + 's' })));
        return;
      }

      loadingRef.current = true;
      setIsLoading(true);

      console.log('🚀 Starting fetch request...');

      try {
        // Build query parameters
        const params: Record<string, string> = {
          north: String(bounds.north),
          south: String(bounds.south),
          east: String(bounds.east),
          west: String(bounds.west),
          zoom: String(bounds.zoom),
        };

        // Add filters
        if (filters) {
          // Price
          if (filters.minPrice) params.minPrice = String(filters.minPrice);
          if (filters.maxPrice) params.maxPrice = String(filters.maxPrice);

          // Beds/Baths
          if (filters.beds) params.beds = String(filters.beds);
          if (filters.baths) params.baths = String(filters.baths);

          // Square Footage
          if (filters.minSqft) params.minSqft = String(filters.minSqft);
          if (filters.maxSqft) params.maxSqft = String(filters.maxSqft);

          // Property Type
          if (filters.propertyType) params.propertyType = filters.propertyType;
          if (filters.propertySubType) params.propertySubType = filters.propertySubType;

          // Listing Type
          if (filters.listingType) params.listingType = filters.listingType;

          // Amenities
          if (filters.poolYn !== undefined) params.pool = String(filters.poolYn);
          if (filters.spaYn !== undefined) params.spa = String(filters.spaYn);

          // Location
          if (filters.city) params.city = filters.city;
          if (filters.mlsSource) params.mlsSource = filters.mlsSource;
        }

        // Determine if streaming should be used
        // Enable streaming for ALL zoom levels (5+) for consistent progressive loading
        // Zoom 5-6: Region boundaries
        // Zoom 7-9: County boundaries (+ listings if <600)
        // Zoom 10-11: City boundaries (+ listings if <600)
        // Zoom 12+: Individual listings
        const useStreaming = false; // TEMP DISABLED for debugging - was: bounds.zoom >= 5

        if (useStreaming) {
          params.stream = 'true';
        }

        const queryString = new URLSearchParams(params).toString();
        const apiUrl = `/api/map-clusters?${queryString}`;

        console.log('🌐 Fetching clusters/listings from:', apiUrl);
        console.log('🔍 Zoom:', bounds.zoom, '| Streaming:', useStreaming);

        const res = await fetch(apiUrl, {
          signal: abortControllerRef.current.signal
        });

        console.log('📡 Response status:', res.status, res.statusText);

        if (!res.ok) {
          const errorText = await res.text();
          console.error('❌ API error response:', errorText);
          throw new Error(`API returned ${res.status}: ${errorText}`);
        }

        // Handle streaming response for high zoom (individual listings)
        if (useStreaming) {
          console.log('📡 Processing streaming response...');
          console.log('📡 Response headers:', {
            contentType: res.headers.get('content-type'),
            status: res.status,
            statusText: res.statusText
          });

          const reader = res.body?.getReader();
          if (!reader) {
            console.error('❌ Response body is not readable!');
            throw new Error('Response body is not readable');
          }
          console.log('✅ Got readable stream, starting to read...');

          const decoder = new TextDecoder();
          let buffer = '';
          let totalReceived = 0;

          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                console.log('✅ Stream complete');
                break;
              }

              // Decode chunk and add to buffer
              buffer += decoder.decode(value, { stream: true });

              // Process complete lines (SSE format)
              const lines = buffer.split('\n');
              buffer = lines.pop() || ''; // Keep incomplete line in buffer

              for (const line of lines) {
                if (!line.trim() || !line.startsWith('data: ')) continue;

                try {
                  const jsonStr = line.substring(6); // Remove 'data: ' prefix
                  const message = JSON.parse(jsonStr);

                  switch (message.type) {
                    case 'metadata':
                      console.log('📊 Stream metadata:', {
                        zoom: message.zoom,
                        totalCount: message.totalCount,
                        batchSize: message.batchSize,
                        hasBoundaries: message.clusters?.length > 0
                      });

                      // Set total count immediately
                      if (message.totalCount !== undefined) {
                        setTotalCount({
                          total: message.totalCount,
                          byMLS: message.mlsDistribution,
                        });
                      }

                      // Display boundaries immediately if included (smart display scenario)
                      if (message.clusters && message.clusters.length > 0) {
                        console.log(`🗺️ Displaying ${message.clusters.length} boundaries immediately`);
                        setMarkers(message.clusters);
                      }
                      break;

                    case 'listings':
                      const listings: MapListing[] = message.listings || [];
                      totalReceived += listings.length;

                      console.log(`📦 Received batch: ${listings.length} listings (total: ${totalReceived})`);

                      // Progressively add listings to map, preserving any boundaries from metadata
                      setMarkers(prev => {
                        // Separate boundaries (clusters) from listings
                        const boundaries = prev.filter(isServerCluster);
                        const existingListings = prev.filter((m): m is MapListing => !isServerCluster(m));

                        if (merge) {
                          // Merge mode: add only new unique listings
                          const existingKeys = new Set(existingListings.map(l => l.listingKey || l._id));
                          const uniqueNew = listings.filter(l => !existingKeys.has(l.listingKey || l._id));
                          return [...boundaries, ...existingListings, ...uniqueNew];
                        } else {
                          // Replace mode: keep boundaries, append listings
                          return [...boundaries, ...existingListings, ...listings];
                        }
                      });
                      break;

                    case 'complete':
                      console.log('✅ Stream complete:', {
                        totalSent: message.totalSent,
                        totalCount: message.totalCount
                      });
                      break;

                    case 'error':
                      console.error('❌ Stream error:', message.error);
                      break;

                    default:
                      console.warn('⚠️ Unknown message type:', message.type);
                  }
                } catch (parseError) {
                  console.error('❌ Error parsing SSE message:', parseError, 'Line:', line);
                }
              }
            }
          } finally {
            reader.releaseLock();
          }

          // Track loaded region after streaming is complete
          loadedRegionsRef.current.push({
            ...bounds,
            timestamp: Date.now(),
          });

          // Keep only last 10 regions
          if (loadedRegionsRef.current.length > 10) {
            loadedRegionsRef.current = loadedRegionsRef.current.slice(-10);
          }

          // Return early - streaming is complete
          return;
        }

        // Standard JSON response handling for non-streaming requests (zoom < 12)
        const data = await res.json();

        console.log('📦 Response type:', data.type);
        console.log('📊 Total count:', data.totalCount);

        if (data.type === 'clusters') {
          // Server-side clusters
          const clusters: ServerCluster[] = data.clusters || [];
          const listings: MapListing[] = data.listings || [];
          const listingsIncluded = data.listingsIncluded === true;

          console.log(`✅ Received ${clusters.length} server-side clusters`);
          if (listingsIncluded) {
            console.log(`✨ Smart display: Also received ${listings.length} individual listings to show WITH boundaries`);
          }
          console.log('🔢 Largest cluster:', clusters[0]?.count || 0, 'listings');

          // When we have both clusters (boundaries) and listings (<600 scenario)
          // Combine them into a single markers array
          const combinedMarkers: MapMarker[] = listingsIncluded
            ? [...clusters, ...listings]
            : clusters;

          console.log(`📍 Total markers to display: ${combinedMarkers.length} (${clusters.length} boundaries + ${listings.length} listings)`);

          // Incremental loading for city clusters (zoom 9-10 with 20 cities)
          const BATCH_SIZE = 5; // Show 5 clusters at a time
          const shouldBatch = clusters.length > BATCH_SIZE && bounds.zoom >= 9 && bounds.zoom <= 10;

          if (shouldBatch) {
            console.log(`📦 Loading ${clusters.length} clusters incrementally in batches of ${BATCH_SIZE}`);

            // Load clusters in batches with delays for smooth "popping in" effect
            const loadInBatches = async () => {
              for (let i = 0; i < clusters.length; i += BATCH_SIZE) {
                const batch = clusters.slice(i, i + BATCH_SIZE);

                if (merge) {
                  setMarkers(prev => {
                    const existingIds = new Set(
                      prev
                        .filter(isServerCluster)
                        .map(c => `${c.latitude},${c.longitude}`)
                    );
                    const uniqueNew = batch.filter(
                      c => !existingIds.has(`${c.latitude},${c.longitude}`)
                    );
                    return [...prev, ...uniqueNew];
                  });
                } else {
                  // For first load, replace entirely but still incrementally
                  setMarkers(prev => {
                    if (i === 0) {
                      // First batch replaces all (including listings if present)
                      return listingsIncluded ? [...batch, ...listings] : batch;
                    } else {
                      // Subsequent batches append
                      return [...prev, ...batch];
                    }
                  });
                }

                // Small delay between batches (except after last batch)
                if (i + BATCH_SIZE < clusters.length) {
                  await new Promise(resolve => setTimeout(resolve, 150));
                }
              }
            };

            // Start batch loading (async, doesn't block)
            loadInBatches().catch(err => {
              console.error('❌ Error during batch loading:', err);
            });
          } else {
            // Load all at once for other scenarios
            if (merge) {
              setMarkers(prev => {
                // Merge clusters
                const existingClusterIds = new Set(
                  prev
                    .filter(isServerCluster)
                    .map(c => `${c.latitude},${c.longitude}`)
                );
                const uniqueNewClusters = clusters.filter(
                  c => !existingClusterIds.has(`${c.latitude},${c.longitude}`)
                );

                // Merge listings if included
                let uniqueNewListings: MapListing[] = [];
                if (listingsIncluded) {
                  const existingListingKeys = new Set(
                    prev
                      .filter((m): m is MapListing => !isServerCluster(m))
                      .map(l => l.listingKey || l._id)
                  );
                  uniqueNewListings = listings.filter(
                    l => !existingListingKeys.has(l.listingKey || l._id)
                  );
                }

                return [...prev, ...uniqueNewClusters, ...uniqueNewListings];
              });
            } else {
              // Replace with combined markers (boundaries + listings)
              setMarkers(combinedMarkers);
            }
          }
        } else if (data.type === 'listings') {
          // Individual listings at high zoom
          const listings: MapListing[] = data.listings || [];
          console.log(`✅ Received ${listings.length} individual listings`);

          if (merge) {
            setMarkers(prev => {
              const existingKeys = new Set(
                prev
                  .filter((m): m is MapListing => !isServerCluster(m))
                  .map(l => l.listingKey || l._id)
              );
              const uniqueNew = listings.filter(
                l => !existingKeys.has(l.listingKey || l._id)
              );
              return [...prev, ...uniqueNew];
            });
          } else {
            setMarkers(listings);
          }
        }

        // Update total count
        if (data.totalCount !== undefined) {
          setTotalCount({
            total: data.totalCount,
            byMLS: data.mlsDistribution,
          });
        }

        // Track loaded region
        loadedRegionsRef.current.push({
          ...bounds,
          timestamp: Date.now(),
        });

        // Keep only last 10 regions
        if (loadedRegionsRef.current.length > 10) {
          loadedRegionsRef.current = loadedRegionsRef.current.slice(-10);
        }

      } catch (error: any) {
        // Handle AbortError gracefully - don't set error states
        if (error.name === 'AbortError') {
          console.log('Request was cancelled');
          return;
        }
        console.error('❌ Error fetching clusters/listings:', error);
      } finally {
        loadingRef.current = false;
        setIsLoading(false);
      }
    },
    [isBoundsCovered]
  );

  /**
   * Clear all markers and cache
   */
  const clearMarkers = useCallback(() => {
    setMarkers([]);
    loadedRegionsRef.current = [];
    filtersHashRef.current = "";
    setTotalCount(null);
  }, []);

  return {
    markers,
    totalCount,
    isLoading,
    loadMarkers,
    clearMarkers,
  };
}
