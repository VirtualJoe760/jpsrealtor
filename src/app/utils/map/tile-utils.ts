// src/app/utils/map/tile-utils.ts
// Utilities for working with Slippy Map Tiles (Web Mercator projection)

export interface TileCoordinate {
  x: number;
  y: number;
  z: number;
}

export interface TileBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Convert latitude/longitude to tile coordinates at a given zoom level
 * Uses Web Mercator projection (EPSG:3857)
 */
export function latLngToTile(lat: number, lng: number, zoom: number): TileCoordinate {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);

  return { x, y, z: zoom };
}

/**
 * Convert tile coordinates to lat/lng bounds
 */
export function tileToBounds(x: number, y: number, z: number): TileBounds {
  const n = Math.pow(2, z);

  // Western edge
  const west = x / n * 360 - 180;

  // Eastern edge
  const east = (x + 1) / n * 360 - 180;

  // Northern edge
  const northRad = Math.PI * (1 - 2 * y / n);
  const north = Math.atan(Math.sinh(northRad)) * 180 / Math.PI;

  // Southern edge
  const southRad = Math.PI * (1 - 2 * (y + 1) / n);
  const south = Math.atan(Math.sinh(southRad)) * 180 / Math.PI;

  return { north, south, east, west };
}

/**
 * Get all tiles that cover a given bounding box at a specific zoom level
 */
export function getTilesForBounds(bounds: TileBounds, zoom: number): TileCoordinate[] {
  const nw = latLngToTile(bounds.north, bounds.west, zoom);
  const se = latLngToTile(bounds.south, bounds.east, zoom);

  const tiles: TileCoordinate[] = [];

  for (let x = Math.min(nw.x, se.x); x <= Math.max(nw.x, se.x); x++) {
    for (let y = Math.min(nw.y, se.y); y <= Math.max(nw.y, se.y); y++) {
      tiles.push({ x, y, z: zoom });
    }
  }

  return tiles;
}

/**
 * Get adjacent tiles in a 3x3 grid around given tiles (for prefetching)
 */
export function getAdjacentTiles(tiles: TileCoordinate[]): TileCoordinate[] {
  const adjacent = new Set<string>();
  const maxTileIndex = (z: number) => Math.pow(2, z) - 1;

  tiles.forEach(tile => {
    const max = maxTileIndex(tile.z);

    // Add 8 surrounding tiles
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue; // Skip center tile

        const x = tile.x + dx;
        const y = tile.y + dy;

        // Wrap X coordinate (longitude wraps around)
        const wrappedX = ((x % (max + 1)) + (max + 1)) % (max + 1);

        // Clamp Y coordinate (latitude doesn't wrap)
        if (y >= 0 && y <= max) {
          adjacent.add(`${tile.z}/${wrappedX}/${y}`);
        }
      }
    }
  });

  return Array.from(adjacent).map(key => {
    const [z, x, y] = key.split('/').map(Number);
    return { x, y, z };
  });
}

/**
 * Get optimal listing limit based on zoom level
 * Progressive loading: fewer listings at low zoom, more at high zoom
 */
export function getLimitForZoom(zoom: number): number {
  if (zoom <= 7) return 100;   // Region level
  if (zoom <= 10) return 250;  // County level
  if (zoom <= 12) return 500;  // City level
  if (zoom <= 14) return 1000; // Neighborhood level
  if (zoom <= 16) return 2000; // Street level
  return 5000;                  // Building level - show everything
}

/**
 * Get cluster radius based on zoom level
 * Smaller radius as user zooms in for better detail
 */
export function getClusterRadius(zoom: number): number {
  if (zoom < 8) return 80;   // Wide clusters (regions)
  if (zoom < 11) return 50;  // Medium clusters (counties)
  if (zoom < 13) return 30;  // Smaller clusters (cities)
  if (zoom < 15) return 15;  // Tight clusters (neighborhoods)
  return 0;                   // No clustering (streets)
}

/**
 * Determine if clustering should be enabled based on zoom and marker count
 */
export function shouldCluster(zoom: number, markerCount: number): boolean {
  // Always cluster if too many markers
  if (markerCount > 1000) return true;

  // Zoom-based thresholds
  if (zoom < 13) return true;
  if (zoom < 15 && markerCount > 500) return true;
  if (zoom < 17 && markerCount > 200) return true;

  return false;
}

/**
 * Calculate tile key for deduplication and caching
 */
export function getTileKey(x: number, y: number, z: number): string {
  return `${z}/${x}/${y}`;
}

/**
 * Parse tile key back to coordinates
 */
export function parseTileKey(key: string): TileCoordinate | null {
  const parts = key.split('/');
  if (parts.length !== 3) return null;

  const [z, x, y] = parts.map(Number);
  if (isNaN(x) || isNaN(y) || isNaN(z)) return null;

  return { x, y, z };
}
