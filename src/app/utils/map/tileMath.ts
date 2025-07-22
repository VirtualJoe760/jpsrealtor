// src/app/utils/map/tileMath.ts

/**
 * Converts longitude and latitude to tile x, y at a given zoom level.
 */
export function lngLatToTile(
  lon: number,
  lat: number,
  zoom: number
): { x: number; y: number } {
  const scale = 1 << zoom;
  const x = Math.floor(((lon + 180) / 360) * scale);
  const y = Math.floor(
    ((1 -
      Math.log(Math.tan((lat * Math.PI) / 180) +
      1 / Math.cos((lat * Math.PI) / 180)) /
        Math.PI) /
      2) *
      scale
  );
  return { x, y };
}

/**
 * Converts a tile x, y at a given zoom level back to a bounding box.
 * Returns [westLng, southLat, eastLng, northLat]
 */
export function tileToBBOX(
  x: number,
  y: number,
  zoom: number
): [number, number, number, number] {
  const scale = 1 << zoom;
  const west = (x / scale) * 360 - 180;
  const east = ((x + 1) / scale) * 360 - 180;

  const northRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / scale)));
  const southRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / scale)));

  const north = (northRad * 180) / Math.PI;
  const south = (southRad * 180) / Math.PI;

  return [west, south, east, north];
}
