// Bounds calculation and viewport math utilities
// Handles map bounds comparisons, serialization, and viewport calculations

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
  zoom: number;
}

/**
 * Generates a unique string key for bounds comparison
 * Useful for detecting if bounds have changed and preventing duplicate API calls
 *
 * @param bounds Map bounds object
 * @returns String key representing the bounds
 */
export function boundsToKey(bounds: MapBounds): string {
  const key = `${bounds.north.toFixed(6)}-${bounds.south.toFixed(6)}-${bounds.east.toFixed(6)}-${bounds.west.toFixed(6)}-${bounds.zoom.toFixed(2)}`;

  console.log(`[bounds] Generated key: ${key}`);

  return key;
}

/**
 * Compares two bounds objects to see if they're different enough to warrant a new API call
 *
 * @param bounds1 First bounds object
 * @param bounds2 Second bounds object
 * @param threshold Optional threshold for comparison (default: 0.000001)
 * @returns True if bounds are significantly different
 */
export function boundsHaveChanged(
  bounds1: MapBounds,
  bounds2: MapBounds,
  threshold: number = 0.000001
): boolean {
  const northDiff = Math.abs(bounds1.north - bounds2.north);
  const southDiff = Math.abs(bounds1.south - bounds2.south);
  const eastDiff = Math.abs(bounds1.east - bounds2.east);
  const westDiff = Math.abs(bounds1.west - bounds2.west);
  const zoomDiff = Math.abs(bounds1.zoom - bounds2.zoom);

  const changed =
    northDiff > threshold ||
    southDiff > threshold ||
    eastDiff > threshold ||
    westDiff > threshold ||
    zoomDiff > 0.01; // Zoom threshold is larger

  if (changed) {
    console.log('[bounds] Bounds have changed significantly');
  } else {
    console.log('[bounds] Bounds are essentially the same');
  }

  return changed;
}

/**
 * Calculates the center point of map bounds
 *
 * @param bounds Map bounds object
 * @returns Center lat/lng coordinates
 */
export function getBoundsCenter(bounds: MapBounds): { lat: number; lng: number } {
  const lat = (bounds.north + bounds.south) / 2;
  const lng = (bounds.east + bounds.west) / 2;

  console.log(`[bounds] Center: lat=${lat.toFixed(6)}, lng=${lng.toFixed(6)}`);

  return { lat, lng };
}

/**
 * Creates bounds object from a center point and zoom level
 * Approximates the visible area based on zoom
 *
 * @param center Center lat/lng
 * @param zoom Zoom level
 * @returns Approximate bounds object
 */
export function createBoundsFromCenter(
  center: { lat: number; lng: number },
  zoom: number
): MapBounds {
  // Rough approximation: lower zoom = larger area
  // At zoom 7: ~0.1 degrees, zoom 12: ~0.001 degrees
  const delta = 0.5 / Math.pow(2, zoom - 7);

  const bounds = {
    north: center.lat + delta,
    south: center.lat - delta,
    east: center.lng + delta,
    west: center.lng - delta,
    zoom,
  };

  console.log(`[bounds] Created bounds from center - zoom: ${zoom}, delta: ${delta.toFixed(6)}`);

  return bounds;
}

/**
 * Calculates the area of the bounds in square degrees
 * Useful for determining if the viewport is too large/small
 *
 * @param bounds Map bounds object
 * @returns Area in square degrees
 */
export function getBoundsArea(bounds: MapBounds): number {
  const latDelta = Math.abs(bounds.north - bounds.south);
  const lngDelta = Math.abs(bounds.east - bounds.west);
  const area = latDelta * lngDelta;

  console.log(`[bounds] Area: ${area.toFixed(8)} sq degrees`);

  return area;
}

/**
 * Expands bounds by a percentage
 * Useful for prefetching nearby data
 *
 * @param bounds Original bounds
 * @param percent Percentage to expand (e.g., 0.2 for 20%)
 * @returns Expanded bounds
 */
export function expandBounds(bounds: MapBounds, percent: number): MapBounds {
  const latDelta = Math.abs(bounds.north - bounds.south);
  const lngDelta = Math.abs(bounds.east - bounds.west);

  const latExpand = latDelta * percent;
  const lngExpand = lngDelta * percent;

  const expanded = {
    north: bounds.north + latExpand,
    south: bounds.south - latExpand,
    east: bounds.east + lngExpand,
    west: bounds.west - lngExpand,
    zoom: bounds.zoom,
  };

  console.log(`[bounds] Expanded bounds by ${percent * 100}%`);

  return expanded;
}

/**
 * Checks if a point is within the bounds
 *
 * @param point Lat/lng point
 * @param bounds Map bounds
 * @returns True if point is within bounds
 */
export function pointInBounds(
  point: { latitude: number; longitude: number },
  bounds: MapBounds
): boolean {
  const inBounds =
    point.latitude <= bounds.north &&
    point.latitude >= bounds.south &&
    point.longitude <= bounds.east &&
    point.longitude >= bounds.west;

  return inBounds;
}

/**
 * Checks if two bounds overlap
 *
 * @param bounds1 First bounds
 * @param bounds2 Second bounds
 * @returns True if bounds overlap
 */
export function boundsOverlap(bounds1: MapBounds, bounds2: MapBounds): boolean {
  const overlap = !(
    bounds1.south > bounds2.north ||
    bounds1.north < bounds2.south ||
    bounds1.west > bounds2.east ||
    bounds1.east < bounds2.west
  );

  if (overlap) {
    console.log('[bounds] Bounds overlap detected');
  }

  return overlap;
}

/**
 * Validates that bounds are properly formed
 *
 * @param bounds Bounds to validate
 * @returns True if valid
 */
export function isValidBounds(bounds: MapBounds): boolean {
  const valid =
    !isNaN(bounds.north) &&
    !isNaN(bounds.south) &&
    !isNaN(bounds.east) &&
    !isNaN(bounds.west) &&
    !isNaN(bounds.zoom) &&
    bounds.north > bounds.south &&
    bounds.east > bounds.west &&
    bounds.zoom >= 0 &&
    bounds.zoom <= 24;

  if (!valid) {
    console.error('[bounds] Invalid bounds detected:', bounds);
  }

  return valid;
}
