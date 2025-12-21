// src/lib/geo/street-lookup.ts
// Geographic lookup utilities for street-based filtering

import StreetBoundary from "@/models/StreetBoundary";

/**
 * Look up a street's coordinates by name and city
 * @param streetName - Street name (e.g., "Washington Street", "highway 111")
 * @param cityId - City identifier (e.g., "la-quinta")
 * @returns Coordinates object or null if not found
 */
export async function getStreetCoordinate(
  streetName: string,
  cityId: string
): Promise<{ latitude?: number; longitude?: number } | null> {
  try {
    // Normalize street name for matching
    const normalized = streetName
      .toLowerCase()
      .replace(/street|st\.?|avenue|ave\.?|boulevard|blvd\.?|highway|hwy\.?|road|rd\.?/gi, '')
      .trim();

    console.log(`[Street Lookup] Searching for: "${normalized}" in ${cityId}`);

    // Try exact match first
    let street = await StreetBoundary.findOne({
      cityId,
      normalizedName: normalized
    }).lean();

    // If not found, try partial match
    if (!street) {
      street = await StreetBoundary.findOne({
        cityId,
        normalizedName: { $regex: new RegExp(normalized, 'i') }
      }).lean();
    }

    if (!street) {
      console.warn(`[Street Lookup] Street not found: "${streetName}" in ${cityId}`);
      return null;
    }

    console.log(`[Street Lookup] Found: ${street.streetName} (${street.direction})`);
    return street.coordinates;
  } catch (error) {
    console.error(`[Street Lookup] Error:`, error);
    return null;
  }
}

/**
 * Get all streets for a city (for debugging/admin)
 */
export async function getCityStreets(cityId: string) {
  try {
    const streets = await StreetBoundary.find({ cityId }).lean();
    return streets;
  } catch (error) {
    console.error(`[Street Lookup] Error fetching streets for ${cityId}:`, error);
    return [];
  }
}
