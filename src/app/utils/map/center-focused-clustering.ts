/**
 * Center-Focused Clustering Strategy
 *
 * Implements dynamic viewport-based clustering:
 * - Listings in viewport center (green circle, ~30-40% radius) → Individual markers
 * - Listings in periphery (outside center) → Radial clusters with counts
 *
 * This reduces rendering load while keeping center listings (most relevant) as markers.
 */

import type { MapListing } from "@/types/types";
import type { ServerCluster } from "./useServerClusters";

export interface ViewportCenter {
  latitude: number;
  longitude: number;
  radiusInDegrees: number; // Radius of the "focus circle" in lat/lng degrees
}

export interface RadialCluster {
  latitude: number;
  longitude: number;
  count: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  listings: MapListing[]; // Listings in this cluster
  isCluster: true;
  clusterType: 'radial';
}

/**
 * Calculate the center point and focus radius of the viewport
 * @param bounds Current map viewport bounds
 * @param focusPercentage Percentage of viewport to show as individual markers (0.3 = 30%)
 * @param isMobile Whether the device is mobile (expanded focus circle on mobile)
 */
export function calculateViewportCenter(
  bounds: { north: number; south: number; east: number; west: number },
  focusPercentage: number = 0.35, // Default: 35% of viewport
  isMobile: boolean = false
): ViewportCenter {
  const centerLat = (bounds.north + bounds.south) / 2;
  const centerLng = (bounds.east + bounds.west) / 2;

  // Calculate viewport diagonal to determine radius
  const latSpan = bounds.north - bounds.south;
  const lngSpan = bounds.east - bounds.west;

  // Mobile: Expand focus circle significantly to show more individual listings
  const mobileFocusMultiplier = isMobile ? 2.0 : 1.8; // Much larger focus area (2x mobile, 1.8x desktop)

  // Focus radius is a percentage of the viewport's average span
  const avgSpan = (latSpan + lngSpan) / 2;
  const radiusInDegrees = (avgSpan / 2) * focusPercentage * mobileFocusMultiplier;

  return {
    latitude: centerLat,
    longitude: centerLng,
    radiusInDegrees
  };
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in degrees (approximate, for clustering purposes)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  // Simple Euclidean distance in degrees (sufficient for clustering)
  // For more accuracy across large distances, use Haversine formula
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * Check if a listing is within the center focus circle
 */
export function isInCenterCircle(
  listing: { latitude: number; longitude: number },
  center: ViewportCenter
): boolean {
  const distance = calculateDistance(
    listing.latitude,
    listing.longitude,
    center.latitude,
    center.longitude
  );

  return distance <= center.radiusInDegrees;
}

/**
 * Create radial clusters from periphery listings
 * Groups nearby listings into clusters using grid-based bucketing
 * Only clusters if there are too many listings (density-based)
 */
export function createRadialClusters(
  listings: MapListing[],
  gridSizeInDegrees: number = 0.05, // ~5km at equator
  minClusterSize: number = 3 // Minimum listings needed to form a cluster
): RadialCluster[] {
  // Don't cluster if there are relatively few listings in periphery
  if (listings.length <= 40) {
    // Return each listing as a single-item "cluster" (will be rendered as individual markers)
    return [];
  }

  // Group listings by grid cell
  const gridMap = new Map<string, MapListing[]>();

  for (const listing of listings) {
    // Round to grid cell
    const gridLat = Math.round(listing.latitude / gridSizeInDegrees) * gridSizeInDegrees;
    const gridLng = Math.round(listing.longitude / gridSizeInDegrees) * gridSizeInDegrees;
    const gridKey = `${gridLat},${gridLng}`;

    const cell = gridMap.get(gridKey) || [];
    cell.push(listing);
    gridMap.set(gridKey, cell);
  }

  // Convert grid cells to clusters (only if they meet minimum size)
  const clusters: RadialCluster[] = [];

  for (const [gridKey, cellListings] of gridMap.entries()) {
    // Only cluster if there are enough listings in this cell
    if (cellListings.length < minClusterSize) {
      continue; // Skip small groups, they'll be rendered as individual markers
    }

    const [lat, lng] = gridKey.split(',').map(Number);

    // Calculate cluster stats
    const prices = cellListings.map(l => l.listPrice);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    clusters.push({
      latitude: lat,
      longitude: lng,
      count: cellListings.length,
      avgPrice: Math.round(avgPrice),
      minPrice,
      maxPrice,
      listings: cellListings,
      isCluster: true,
      clusterType: 'radial'
    });
  }

  return clusters;
}

/**
 * Split listings into center (individual markers) and periphery (clusters)
 *
 * @param listings All listings in viewport
 * @param bounds Current viewport bounds
 * @param zoom Current zoom level
 * @param focusPercentage Percentage of viewport to show as individual markers
 * @param isMobile Whether the device is mobile
 */
export function applyCenterFocusedClustering(
  listings: MapListing[],
  bounds: { north: number; south: number; east: number; west: number; zoom: number },
  focusPercentage: number = 0.35,
  isMobile: boolean = false
): {
  centerMarkers: MapListing[];      // Listings in center circle (show as markers)
  peripheryClusters: RadialCluster[]; // Periphery listings grouped into clusters
  centerCircle: ViewportCenter;      // Center circle metadata for debugging
} {
  console.log('[applyCenterFocusedClustering] Starting with', listings.length, 'listings', isMobile ? '(MOBILE)' : '(DESKTOP)');

  // If there are very few listings total, don't cluster at all
  const maxListingsBeforeClustering = isMobile ? 50 : 150; // Show up to 150 individual markers on desktop
  if (listings.length <= maxListingsBeforeClustering) {
    console.log('[applyCenterFocusedClustering] Too few listings to cluster, showing all as individual markers');
    return {
      centerMarkers: listings,
      peripheryClusters: [],
      centerCircle: calculateViewportCenter(bounds, focusPercentage, isMobile)
    };
  }

  // Calculate viewport center and focus radius
  const centerCircle = calculateViewportCenter(bounds, focusPercentage, isMobile);

  console.log('[applyCenterFocusedClustering] Center circle:', {
    lat: centerCircle.latitude.toFixed(4),
    lng: centerCircle.longitude.toFixed(4),
    radius: centerCircle.radiusInDegrees.toFixed(4),
    focusPercentage: `${(focusPercentage * 100).toFixed(0)}%`,
    isMobile
  });

  // Split listings into center and periphery
  const centerMarkers: MapListing[] = [];
  const peripheryListings: MapListing[] = [];

  for (const listing of listings) {
    if (isInCenterCircle(listing, centerCircle)) {
      centerMarkers.push(listing);
    } else {
      peripheryListings.push(listing);
    }
  }

  console.log('[applyCenterFocusedClustering] Split results:', {
    centerMarkers: centerMarkers.length,
    peripheryListings: peripheryListings.length,
    total: listings.length
  });

  // Create radial clusters from periphery listings
  // Adjust grid size based on zoom level
  const gridSize = getClusterGridSize(bounds.zoom, isMobile);
  const minClusterSize = isMobile ? 10 : 8; // Only cluster groups of 8+ listings (10+ on mobile)
  const peripheryClusters = createRadialClusters(peripheryListings, gridSize, minClusterSize);

  console.log('[applyCenterFocusedClustering] Created', peripheryClusters.length, 'radial clusters');

  return {
    centerMarkers,
    peripheryClusters,
    centerCircle
  };
}

/**
 * Get cluster grid size based on zoom level
 * Larger grid = fewer, larger clusters
 * Mobile uses larger grids (less aggressive clustering)
 */
function getClusterGridSize(zoom: number, isMobile: boolean = false): number {
  // Mobile: Use larger grid sizes to cluster less aggressively
  const mobileMultiplier = isMobile ? 1.5 : 1.0;

  if (zoom >= 15) return 0.005 * mobileMultiplier;  // ~500m - very small clusters
  if (zoom >= 14) return 0.01 * mobileMultiplier;   // ~1km
  if (zoom >= 13) return 0.02 * mobileMultiplier;   // ~2km
  if (zoom >= 12) return 0.05 * mobileMultiplier;   // ~5km
  if (zoom >= 11) return 0.1 * mobileMultiplier;    // ~10km
  if (zoom >= 10) return 0.2 * mobileMultiplier;    // ~20km
  return 0.5 * mobileMultiplier;                     // ~50km - large clusters
}
