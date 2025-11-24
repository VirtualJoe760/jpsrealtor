// src/app/lib/map-tiles/tileLoader.ts
// Client-side tile loader for MapLibre - fetches pre-generated tiles from API

import { getTilesForBounds } from '@/app/utils/tileMath/tileMath';
import type { MapListing } from '@/types/types';

// Supercluster types for tile data
export interface ClusterFeature {
  type: 'Feature';
  id?: number;
  properties: {
    cluster: true;
    cluster_id: number;
    point_count: number;
    point_count_abbreviated: string;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export interface ListingFeature {
  type: 'Feature';
  properties: {
    cluster: false;
    listingKey: string;
    listingId?: string;
    listPrice?: number;
    city?: string;
    beds?: number;
    baths?: number;
    slug?: string;
    mlsSource?: string;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export type TileFeature = ClusterFeature | ListingFeature;

interface TileCache {
  [key: string]: TileFeature[];
}

// Global tile cache
const tileCache: TileCache = {};

/**
 * Fetch a single tile from the API
 */
async function fetchTile(z: number, x: number, y: number): Promise<TileFeature[]> {
  const cacheKey = `${z}/${x}/${y}`;

  // Return cached tile if available
  if (tileCache[cacheKey]) {
    return tileCache[cacheKey];
  }

  try {
    const response = await fetch(`/api/map-tiles/${z}/${x}/${y}`);
    if (!response.ok) {
      console.warn(`Tile ${cacheKey} not found, using empty array`);
      tileCache[cacheKey] = [];
      return [];
    }

    const features = await response.json();
    tileCache[cacheKey] = features;
    return features;
  } catch (error) {
    console.error(`Error fetching tile ${cacheKey}:`, error);
    tileCache[cacheKey] = [];
    return [];
  }
}

/**
 * Load all tiles for the current map view
 *
 * @param bounds Map bounding box [west, south, east, north]
 * @param zoom Current zoom level
 * @returns Array of all features (clusters and listings) in the viewport
 */
export async function loadTilesForView(
  bounds: [number, number, number, number],
  zoom: number
): Promise<TileFeature[]> {
  // Get all tiles that intersect with the current view
  const tiles = getTilesForBounds(bounds, Math.floor(zoom));

  // Fetch all tiles in parallel
  const tilePromises = tiles.map(({ x, y }) => fetchTile(Math.floor(zoom), x, y));
  const tileResults = await Promise.all(tilePromises);

  // Flatten and deduplicate features
  const allFeatures = tileResults.flat();
  const uniqueFeatures = new Map<string, TileFeature>();

  allFeatures.forEach((feature) => {
    // Create unique key for each feature
    const key = feature.properties.cluster
      ? `cluster-${feature.properties.cluster_id}`
      : `listing-${feature.properties.listingKey}`;

    // Only add if not already present (deduplication)
    if (!uniqueFeatures.has(key)) {
      uniqueFeatures.set(key, feature);
    }
  });

  return Array.from(uniqueFeatures.values());
}

/**
 * Clear the tile cache (useful for forcing refresh after tile regeneration)
 */
export function clearTileCache(): void {
  Object.keys(tileCache).forEach((key) => delete tileCache[key]);
}

/**
 * Pre-fetch tiles for a specific area (useful for preloading nearby tiles)
 */
export async function prefetchTiles(
  bounds: [number, number, number, number],
  zoom: number
): Promise<void> {
  const tiles = getTilesForBounds(bounds, Math.floor(zoom));
  const promises = tiles.map(({ x, y }) => fetchTile(Math.floor(zoom), x, y));
  await Promise.all(promises);
}

/**
 * Convert a tile feature to a MapListing object
 * (Used to convert ListingFeature back to MapListing for compatibility)
 */
export function featureToListing(feature: ListingFeature): Partial<MapListing> {
  return {
    _id: feature.properties.listingKey,
    listingKey: feature.properties.listingKey,
    listingId: feature.properties.listingId,
    listPrice: feature.properties.listPrice,
    city: feature.properties.city,
    bedroomsTotal: feature.properties.beds,
    bathroomsTotalDecimal: feature.properties.baths,
    slug: feature.properties.slug,
    mlsSource: feature.properties.mlsSource,
    longitude: feature.geometry.coordinates[0],
    latitude: feature.geometry.coordinates[1],
  };
}
