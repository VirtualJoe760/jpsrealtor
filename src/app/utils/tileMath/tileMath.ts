// src/app/utils/tileMath/tileMath.ts
// Web Mercator tile mathematics - matches Mapbox/MapLibre spec exactly

/**
 * Convert degrees to radians
 */
export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function fromRadians(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Convert longitude/latitude to tile coordinates at given zoom level
 * Uses Web Mercator projection (EPSG:3857)
 *
 * @param lng Longitude in degrees (-180 to 180)
 * @param lat Latitude in degrees (-85.0511 to 85.0511)
 * @param zoom Zoom level (0-22)
 * @returns Tile coordinates {x, y}
 */
export function lngLatToTile(lng: number, lat: number, zoom: number): { x: number; y: number } {
  const scale = Math.pow(2, zoom);

  // Longitude is linear
  const x = Math.floor(((lng + 180) / 360) * scale);

  // Latitude uses Web Mercator projection
  const latRad = toRadians(lat);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale
  );

  return { x, y };
}

/**
 * Convert tile coordinates to bounding box (west, south, east, north)
 *
 * @param x Tile X coordinate
 * @param y Tile Y coordinate
 * @param zoom Zoom level
 * @returns Bounding box [west, south, east, north] in degrees
 */
export function tileToBounds(x: number, y: number, zoom: number): [number, number, number, number] {
  const scale = Math.pow(2, zoom);

  // Western edge
  const west = (x / scale) * 360 - 180;

  // Eastern edge
  const east = ((x + 1) / scale) * 360 - 180;

  // Northern edge (Web Mercator inverse)
  const northRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / scale)));
  const north = fromRadians(northRad);

  // Southern edge
  const southRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / scale)));
  const south = fromRadians(southRad);

  return [west, south, east, north];
}

/**
 * Get all tiles that intersect with a bounding box at given zoom
 *
 * @param bounds Bounding box [west, south, east, north]
 * @param zoom Zoom level
 * @returns Array of tile coordinates [{x, y}, ...]
 */
export function getTilesForBounds(
  bounds: [number, number, number, number],
  zoom: number
): Array<{ x: number; y: number }> {
  const [west, south, east, north] = bounds;

  const min = lngLatToTile(west, north, zoom); // Top-left
  const max = lngLatToTile(east, south, zoom); // Bottom-right

  const tiles: Array<{ x: number; y: number }> = [];

  for (let x = min.x; x <= max.x; x++) {
    for (let y = min.y; y <= max.y; y++) {
      tiles.push({ x, y });
    }
  }

  return tiles;
}

/**
 * Get tile path for file system or URL
 *
 * @param x Tile X coordinate
 * @param y Tile Y coordinate
 * @param zoom Zoom level
 * @returns Path string "z/x/y"
 */
export function getTilePath(x: number, y: number, zoom: number): string {
  return `${zoom}/${x}/${y}`;
}

/**
 * Clamp latitude to Web Mercator bounds
 */
export function clampLatitude(lat: number): number {
  return Math.max(-85.0511, Math.min(85.0511, lat));
}

/**
 * Clamp longitude to valid range
 */
export function clampLongitude(lng: number): number {
  return ((lng + 180) % 360) - 180;
}
