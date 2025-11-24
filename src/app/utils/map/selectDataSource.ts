// src/app/utils/map/selectDataSource.ts
// Smart data source selection: tiles → live query → client-side fallback

import type { NormalizedListing } from '@/app/utils/mls/normalizeListing';
import type { MapFilters } from '@/app/utils/mls/filterListingsServerSide';

export type DataSource = 'tiles' | 'realtime' | 'client-side';

export interface DataSourceResult {
  source: DataSource;
  listings: NormalizedListing[];
  reason: string;
}

/**
 * Determines the best data source for map queries
 *
 * Decision tree:
 * 1. If no filters applied AND zoom <= 12: Use static tiles (fastest)
 * 2. If filters applied OR zoom > 12: Use real-time query (accurate)
 * 3. If real-time query fails: Fallback to client-side filtering (resilient)
 */
export function selectDataSource(
  zoom: number,
  filters: MapFilters,
  tilesAvailable: boolean
): DataSource {
  // Check if any filters are active
  const hasActiveFilters = Boolean(
    filters.minPrice ||
    filters.maxPrice ||
    filters.beds ||
    filters.baths ||
    filters.propertyType ||
    filters.propertySubType ||
    filters.poolYn ||
    filters.spaYn ||
    filters.noHOA ||
    filters.maxHOA ||
    filters.minLivingArea ||
    filters.mlsSource !== 'ALL'
  );

  // High zoom levels (> 12) need real-time data for accuracy
  const needsRealtime = zoom > 12;

  // Use tiles if: no filters, low-medium zoom, and tiles are available
  if (!hasActiveFilters && !needsRealtime && tilesAvailable) {
    return 'tiles';
  }

  // Use real-time query for filtered or high-zoom scenarios
  return 'realtime';
}

/**
 * Fetches map data from static tiles
 */
export async function fetchFromTiles(
  zoom: number,
  x: number,
  y: number
): Promise<NormalizedListing[]> {
  try {
    const response = await fetch(`/api/map-tiles/${zoom}/${x}/${y}`);

    if (!response.ok) {
      throw new Error(`Tile fetch failed: ${response.status}`);
    }

    const clusters = await response.json();

    // Extract listings from clusters
    const listings: NormalizedListing[] = [];

    clusters.forEach((cluster: any) => {
      if (cluster.properties.cluster) {
        // It's a cluster - skip for now (MapView handles cluster expansion)
        return;
      }

      // It's an individual listing - extract properties
      listings.push({
        listingKey: cluster.properties.listingKey,
        slug: cluster.properties.slug,
        listPrice: cluster.properties.listPrice,
        city: cluster.properties.city,
        beds: cluster.properties.beds,
        baths: cluster.properties.baths,
        propertyType: cluster.properties.propertyType,
        propertySubType: cluster.properties.propertySubType,
        livingArea: cluster.properties.livingArea,
        poolYn: cluster.properties.poolYn,
        spaYn: cluster.properties.spaYn,
        associationFee: cluster.properties.associationFee,
        unparsedAddress: cluster.properties.unparsedAddress,
        mlsSource: cluster.properties.mlsSource,
        latitude: cluster.geometry.coordinates[1],
        longitude: cluster.geometry.coordinates[0]
      });
    });

    return listings;
  } catch (error) {
    console.error('❌ Error fetching from tiles:', error);
    throw error;
  }
}

/**
 * Fetches map data from real-time query endpoint
 */
export async function fetchFromRealtime(
  bounds: { west: number; south: number; east: number; north: number },
  filters: MapFilters,
  limit = 1000
): Promise<NormalizedListing[]> {
  try {
    const response = await fetch('/api/map/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bounds, filters, limit })
    });

    if (!response.ok) {
      throw new Error(`Realtime query failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Query failed');
    }

    return data.listings;
  } catch (error) {
    console.error('❌ Error fetching from realtime:', error);
    throw error;
  }
}

/**
 * Client-side filtering fallback (uses pre-loaded listings)
 */
export function filterClientSide(
  allListings: NormalizedListing[],
  bounds: { west: number; south: number; east: number; north: number },
  filters: MapFilters
): NormalizedListing[] {
  return allListings.filter(listing => {
    // Bounding box filter
    if (
      listing.latitude < bounds.south ||
      listing.latitude > bounds.north ||
      listing.longitude < bounds.west ||
      listing.longitude > bounds.east
    ) {
      return false;
    }

    // Price filters
    if (filters.minPrice && listing.listPrice < filters.minPrice) return false;
    if (filters.maxPrice && listing.listPrice > filters.maxPrice) return false;

    // Bedroom filter
    if (filters.beds && (!listing.beds || listing.beds < filters.beds)) return false;

    // Bathroom filter
    if (filters.baths && (!listing.baths || listing.baths < filters.baths)) return false;

    // Property type filter
    if (filters.propertyType && listing.propertyType !== filters.propertyType) return false;

    // Property subtype filter
    if (filters.propertySubType && listing.propertySubType !== filters.propertySubType) return false;

    // Pool filter
    if (filters.poolYn === true && !listing.poolYn) return false;

    // Spa filter
    if (filters.spaYn === true && !listing.spaYn) return false;

    // HOA filters
    if (filters.noHOA === true) {
      if (listing.associationFee && listing.associationFee > 0) return false;
    } else if (filters.maxHOA !== undefined) {
      if (listing.associationFee && listing.associationFee > filters.maxHOA) return false;
    }

    // Living area filter
    if (filters.minLivingArea && (!listing.livingArea || listing.livingArea < filters.minLivingArea)) {
      return false;
    }

    // MLS source filter
    if (filters.mlsSource && filters.mlsSource !== 'ALL' && listing.mlsSource !== filters.mlsSource) {
      return false;
    }

    return true;
  });
}

/**
 * Smart data fetching with automatic failover
 *
 * Execution flow:
 * 1. Determine optimal data source
 * 2. Try primary source
 * 3. On failure, fallback to client-side (if available)
 * 4. Return result with metadata
 */
export async function fetchMapData(
  zoom: number,
  bounds: { west: number; south: number; east: number; north: number },
  filters: MapFilters,
  options?: {
    tileCoords?: { x: number; y: number };
    clientListings?: NormalizedListing[];
    limit?: number;
  }
): Promise<DataSourceResult> {
  const { tileCoords, clientListings = [], limit = 1000 } = options || {};

  // Determine optimal data source
  const tilesAvailable = Boolean(tileCoords);
  const preferredSource = selectDataSource(zoom, filters, tilesAvailable);

  try {
    // Try preferred source
    if (preferredSource === 'tiles' && tileCoords) {
      const listings = await fetchFromTiles(zoom, tileCoords.x, tileCoords.y);
      return {
        source: 'tiles',
        listings,
        reason: 'No filters, low-medium zoom - using cached tiles'
      };
    }

    if (preferredSource === 'realtime') {
      const listings = await fetchFromRealtime(bounds, filters, limit);
      return {
        source: 'realtime',
        listings,
        reason: 'Filters applied or high zoom - using real-time query'
      };
    }

    // Should not reach here, but fallback just in case
    throw new Error('Invalid data source selection');

  } catch (error) {
    console.warn('⚠️ Primary data source failed, attempting fallback:', error);

    // Fallback to client-side filtering if listings are available
    if (clientListings.length > 0) {
      const filtered = filterClientSide(clientListings, bounds, filters);
      return {
        source: 'client-side',
        listings: filtered,
        reason: `Fallback: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }

    // No fallback available - throw error
    throw new Error(
      `All data sources failed. Primary: ${preferredSource}, Error: ${
        error instanceof Error ? error.message : 'Unknown'
      }`
    );
  }
}

/**
 * Preload client-side listings (for fallback resilience)
 * Use this sparingly - only for critical views
 */
export async function preloadListings(
  bounds: { west: number; south: number; east: number; north: number }
): Promise<NormalizedListing[]> {
  try {
    return await fetchFromRealtime(bounds, {}, 5000); // Higher limit for preload
  } catch (error) {
    console.error('❌ Failed to preload listings:', error);
    return [];
  }
}
