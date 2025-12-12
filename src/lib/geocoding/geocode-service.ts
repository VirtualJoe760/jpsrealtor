/**
 * Geocoding Service
 *
 * Provides geocoding functionality to fill missing latitude/longitude coordinates.
 * Uses multiple fallback strategies for reliability.
 *
 * @module geocoding/geocode-service
 */

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  confidence: 'high' | 'medium' | 'low';
  source: 'exact' | 'city' | 'zip' | 'fallback';
}

/**
 * Geocode an address using multiple strategies
 */
export async function geocodeAddress(
  address: string,
  city?: string,
  state?: string,
  zip?: string
): Promise<GeocodingResult | null> {
  // Strategy 1: Use Google Maps Geocoding API (if configured)
  if (process.env.GOOGLE_MAPS_API_KEY) {
    const result = await geocodeWithGoogle(address, city, state, zip);
    if (result) return result;
  }

  // Strategy 2: Use OpenStreetMap Nominatim (free, no API key)
  const result = await geocodeWithNominatim(address, city, state, zip);
  if (result) return result;

  // Strategy 3: Fallback to city center
  if (city && state) {
    return getCityCenter(city, state);
  }

  return null;
}

/**
 * Geocode using Google Maps Geocoding API
 */
async function geocodeWithGoogle(
  address: string,
  city?: string,
  state?: string,
  zip?: string
): Promise<GeocodingResult | null> {
  try {
    const fullAddress = [address, city, state, zip].filter(Boolean).join(', ');
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
        confidence: 'high',
        source: 'exact',
      };
    }
  } catch (error) {
    console.error('Google geocoding error:', error);
  }

  return null;
}

/**
 * Geocode using OpenStreetMap Nominatim (free, no API key required)
 */
async function geocodeWithNominatim(
  address: string,
  city?: string,
  state?: string,
  zip?: string
): Promise<GeocodingResult | null> {
  try {
    const fullAddress = [address, city, state, zip].filter(Boolean).join(', ');
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullAddress)}&format=json&limit=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RealEstateApp/1.0', // Nominatim requires User-Agent
      },
    });

    const data = await response.json();

    if (data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        confidence: 'high',
        source: 'exact',
      };
    }
  } catch (error) {
    console.error('Nominatim geocoding error:', error);
  }

  return null;
}

/**
 * Get city center coordinates (fallback)
 */
function getCityCenter(city: string, state: string): GeocodingResult | null {
  // California city centers (common cities in our dataset)
  const cityCenters: Record<string, { lat: number; lng: number }> = {
    // Orange County
    'Orange_CA': { lat: 33.7879, lng: -117.8531 },
    'Brentwood_CA': { lat: 37.9318, lng: -121.6958 },
    'Palm Desert_CA': { lat: 33.7222, lng: -116.3745 },
    'Indian Wells_CA': { lat: 33.7175, lng: -116.3406 },
    'La Quinta_CA': { lat: 33.6633, lng: -116.3100 },
    'Rancho Mirage_CA': { lat: 33.7397, lng: -116.4130 },
    'Cathedral City_CA': { lat: 33.7797, lng: -116.4652 },
    'Coachella_CA': { lat: 33.6803, lng: -116.1739 },
    'Indio_CA': { lat: 33.7206, lng: -116.2156 },
    'Desert Hot Springs_CA': { lat: 33.9608, lng: -116.5017 },

    // Los Angeles Area
    'Los Angeles_CA': { lat: 34.0522, lng: -118.2437 },
    'Santa Monica_CA': { lat: 34.0195, lng: -118.4912 },
    'Pasadena_CA': { lat: 34.1478, lng: -118.1445 },
    'Long Beach_CA': { lat: 33.7701, lng: -118.1937 },

    // San Diego Area
    'San Diego_CA': { lat: 32.7157, lng: -117.1611 },
    'Carlsbad_CA': { lat: 33.1581, lng: -117.3506 },
    'Oceanside_CA': { lat: 33.1959, lng: -117.3795 },

    // Riverside County
    'Riverside_CA': { lat: 33.9533, lng: -117.3962 },
    'Corona_CA': { lat: 33.8753, lng: -117.5664 },
    'Temecula_CA': { lat: 33.4936, lng: -117.1484 },
    'Murrieta_CA': { lat: 33.5539, lng: -117.2139 },

    // San Bernardino County
    'San Bernardino_CA': { lat: 34.1083, lng: -117.2898 },
    'Fontana_CA': { lat: 34.0922, lng: -117.4350 },
    'Rancho Cucamonga_CA': { lat: 34.1064, lng: -117.5931 },
  };

  const key = `${city}_${state}`;
  const center = cityCenters[key];

  if (center) {
    return {
      latitude: center.lat,
      longitude: center.lng,
      confidence: 'low',
      source: 'city',
    };
  }

  return null;
}

/**
 * Batch geocode multiple addresses
 */
export async function batchGeocode(
  addresses: Array<{
    address: string;
    city?: string;
    state?: string;
    zip?: string;
  }>,
  onProgress?: (completed: number, total: number) => void
): Promise<Array<GeocodingResult | null>> {
  const results: Array<GeocodingResult | null> = [];

  for (let i = 0; i < addresses.length; i++) {
    const addr = addresses[i];
    const result = await geocodeAddress(addr.address, addr.city, addr.state, addr.zip);
    results.push(result);

    if (onProgress) {
      onProgress(i + 1, addresses.length);
    }

    // Rate limiting: wait 1 second between requests (Nominatim requirement)
    if (i < addresses.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Check if coordinates are valid
 */
export function hasValidCoordinates(lat?: number | null, lng?: number | null): boolean {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return false;
  }

  // Check if coordinates are within valid ranges
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
