/**
 * Geocoding Utility
 *
 * Converts addresses to latitude/longitude coordinates using Google Maps Geocoding API
 */

interface Address {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

/**
 * Geocode an address to get lat/lng coordinates
 *
 * @param address - Address object with street, city, state, zip
 * @returns GeocodeResult with lat, lng, and formatted address, or null if not found
 */
export async function geocodeAddress(address: Address): Promise<GeocodeResult | null> {
  // Build address string from components
  const addressString = [
    address.street,
    address.city,
    address.state,
    address.zip
  ].filter(Boolean).join(', ');

  if (!addressString) {
    console.warn('[Geocoding] Empty address provided');
    return null;
  }

  // Check for API key
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn('[Geocoding] No Google Maps API key configured. Set GOOGLE_MAPS_API_KEY in environment variables.');
    return null;
  }

  try {
    console.log('[Geocoding] Geocoding address:', addressString);

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressString)}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0];
      const geocodeResult: GeocodeResult = {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
      };

      console.log('[Geocoding] Success:', geocodeResult);
      return geocodeResult;
    }

    // Handle specific error statuses
    if (data.status === 'ZERO_RESULTS') {
      console.warn('[Geocoding] No results found for address:', addressString);
    } else if (data.status === 'INVALID_REQUEST') {
      console.error('[Geocoding] Invalid request:', data.error_message || 'Unknown error');
    } else if (data.status === 'OVER_QUERY_LIMIT') {
      console.error('[Geocoding] API quota exceeded');
    } else {
      console.error('[Geocoding] Geocoding failed:', data.status, data.error_message);
    }

    return null;
  } catch (error) {
    console.error('[Geocoding] Error:', error);
    return null;
  }
}

/**
 * Batch geocode multiple addresses
 * Includes rate limiting to avoid hitting API quotas
 *
 * @param addresses - Array of address objects
 * @param delayMs - Delay between requests in milliseconds (default 200ms)
 * @returns Array of geocode results (null for failed geocodes)
 */
export async function batchGeocodeAddresses(
  addresses: Address[],
  delayMs: number = 200
): Promise<(GeocodeResult | null)[]> {
  const results: (GeocodeResult | null)[] = [];

  for (let i = 0; i < addresses.length; i++) {
    const result = await geocodeAddress(addresses[i]);
    results.push(result);

    // Rate limiting: wait between requests (except for last one)
    if (i < addresses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
