// src/lib/geo-centers.ts
// Geographical center coordinates for cities
// Used for map centering instead of listing-based centers

export interface GeoCenter {
  lat: number;
  lng: number;
  zoom?: number; // Optional default zoom level
}

/**
 * Geographical centers for Coachella Valley cities
 * Source: Official city centers, Google Maps
 */
export const CITY_CENTERS: Record<string, GeoCenter> = {
  // Coachella Valley Cities
  "Palm Desert": { lat: 33.8303, lng: -116.5453, zoom: 12 },
  "Palm Springs": { lat: 33.8303, lng: -116.5453, zoom: 12 },
  "La Quinta": { lat: 33.6633, lng: -116.3100, zoom: 12 },
  "Indian Wells": { lat: 33.7172, lng: -116.3406, zoom: 13 },
  "Rancho Mirage": { lat: 33.7397, lng: -116.4128, zoom: 12 },
  "Cathedral City": { lat: 33.7805, lng: -116.4668, zoom: 12 },
  "Desert Hot Springs": { lat: 33.9611, lng: -116.5017, zoom: 12 },
  "Indio": { lat: 33.7206, lng: -116.2156, zoom: 12 },
  "Coachella": { lat: 33.6803, lng: -116.1739, zoom: 12 },

  // Orange County
  "Orange": { lat: 33.7879, lng: -117.8531, zoom: 12 },
  "Anaheim": { lat: 33.8366, lng: -117.9143, zoom: 11 },
  "Irvine": { lat: 33.6846, lng: -117.8265, zoom: 11 },
  "Santa Ana": { lat: 33.7455, lng: -117.8677, zoom: 11 },
  "Huntington Beach": { lat: 33.6603, lng: -117.9992, zoom: 11 },

  // Los Angeles County
  "Los Angeles": { lat: 34.0522, lng: -118.2437, zoom: 10 },
  "Long Beach": { lat: 33.7701, lng: -118.1937, zoom: 11 },
  "Pasadena": { lat: 34.1478, lng: -118.1445, zoom: 12 },

  // San Diego County
  "San Diego": { lat: 32.7157, lng: -117.1611, zoom: 10 },
  "Carlsbad": { lat: 33.1581, lng: -117.3506, zoom: 12 },
  "Oceanside": { lat: 33.1959, lng: -117.3795, zoom: 12 },

  // Riverside County
  "Riverside": { lat: 33.9533, lng: -117.3962, zoom: 11 },
  "Corona": { lat: 33.8753, lng: -117.5664, zoom: 12 },
  "Temecula": { lat: 33.4936, lng: -117.1484, zoom: 12 },
  "Murrieta": { lat: 33.5539, lng: -117.2139, zoom: 12 },
};

/**
 * Get geographical center for a city
 * Returns null if city not found (will fall back to listing-based centering)
 */
export function getCityCenter(cityName: string): GeoCenter | null {
  // Normalize city name (case-insensitive)
  const normalized = Object.keys(CITY_CENTERS).find(
    key => key.toLowerCase() === cityName.toLowerCase()
  );

  return normalized ? CITY_CENTERS[normalized] : null;
}

/**
 * Get center point from either geographical data or listings
 * Prefers geographical centers for cities, falls back to listing-based for subdivisions
 */
export function getMapCenter(params: {
  city?: string;
  subdivision?: string;
  listings?: Array<{ latitude: number; longitude: number }>;
}): GeoCenter | null {
  const { city, subdivision, listings } = params;

  // If it's a subdivision, always use listing-based centering
  if (subdivision && listings && listings.length > 0) {
    return getListingBasedCenter(listings);
  }

  // If it's a city, try geographical center first
  if (city) {
    const geoCenter = getCityCenter(city);
    if (geoCenter) {
      return geoCenter;
    }
  }

  // Fall back to listing-based centering
  if (listings && listings.length > 0) {
    return getListingBasedCenter(listings);
  }

  return null;
}

/**
 * Calculate center from listing coordinates (fallback)
 */
function getListingBasedCenter(
  listings: Array<{ latitude: number; longitude: number }>
): GeoCenter {
  const lats = listings.map(l => l.latitude);
  const lngs = listings.map(l => l.longitude);

  const bounds = {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs),
  };

  const centerLat = (bounds.north + bounds.south) / 2;
  const centerLng = (bounds.east + bounds.west) / 2;

  // Calculate appropriate zoom
  const latDiff = bounds.north - bounds.south;
  const lngDiff = bounds.east - bounds.west;
  const maxDiff = Math.max(latDiff, lngDiff);

  let zoom = 12;
  if (maxDiff < 0.01) zoom = 14;
  else if (maxDiff < 0.05) zoom = 13;
  else if (maxDiff < 0.1) zoom = 12;
  else if (maxDiff < 0.5) zoom = 11;
  else if (maxDiff < 1) zoom = 10;
  else zoom = 9;

  return { lat: centerLat, lng: centerLng, zoom };
}
