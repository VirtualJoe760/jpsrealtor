/**
 * Subdivision Utility Functions
 *
 * Handles the normalization of subdivision names, particularly the "Not Applicable"
 * case which represents properties without an HOA in a given city.
 */

/**
 * Normalizes subdivision name from MLS data
 *
 * If subdivision is "Not Applicable", it means the property has no HOA.
 * We format these as "{City} Non-HOA" for better user experience.
 *
 * @param subdivisionName - Raw subdivision name from MLS (can be "Not Applicable", null, undefined)
 * @param city - City name where the property is located
 * @returns Normalized subdivision name
 *
 * @example
 * normalizeSubdivisionName("Not Applicable", "Palm Desert")
 * // Returns: "Palm Desert Non-HOA"
 *
 * @example
 * normalizeSubdivisionName("Palm Desert Country Club", "Palm Desert")
 * // Returns: "Palm Desert Country Club"
 *
 * @example
 * normalizeSubdivisionName(null, "Indian Wells")
 * // Returns: "Indian Wells Non-HOA"
 */
export function normalizeSubdivisionName(
  subdivisionName: string | null | undefined,
  city: string
): string {
  // If subdivision is "Not Applicable", null, undefined, or empty string
  if (
    !subdivisionName ||
    subdivisionName.trim() === "" ||
    subdivisionName.toLowerCase() === "not applicable" ||
    subdivisionName.toLowerCase() === "n/a"
  ) {
    return `${city} Non-HOA`;
  }

  return subdivisionName;
}

/**
 * Checks if a subdivision name represents a Non-HOA property
 *
 * @param subdivisionName - Subdivision name to check
 * @returns true if it's a Non-HOA property
 *
 * @example
 * isNonHOA("Palm Desert Non-HOA")  // Returns: true
 * isNonHOA("Not Applicable")       // Returns: true
 * isNonHOA("The Lakes")            // Returns: false
 */
export function isNonHOA(subdivisionName: string | null | undefined): boolean {
  if (!subdivisionName) return true;

  const normalized = subdivisionName.toLowerCase().trim();
  return (
    normalized === "not applicable" ||
    normalized === "n/a" ||
    normalized.endsWith("non-hoa") ||
    normalized.includes("non-hoa")
  );
}

/**
 * Gets the city name from a Non-HOA subdivision name
 *
 * @param subdivisionName - Subdivision name (e.g., "Palm Desert Non-HOA")
 * @returns City name or null if not a Non-HOA subdivision
 *
 * @example
 * getCityFromNonHOA("Palm Desert Non-HOA")  // Returns: "Palm Desert"
 * getCityFromNonHOA("The Lakes")            // Returns: null
 */
export function getCityFromNonHOA(subdivisionName: string | null | undefined): string | null {
  if (!subdivisionName || !isNonHOA(subdivisionName)) {
    return null;
  }

  // Extract city name from "{City} Non-HOA" format
  const match = subdivisionName.match(/^(.+?)\s+Non-HOA$/i);
  return match ? match[1].trim() : null;
}

/**
 * Formats subdivision display name for UI
 * Ensures consistent formatting across the application
 *
 * @param subdivisionName - Raw subdivision name
 * @param city - City name
 * @returns Formatted subdivision name suitable for display
 */
export function formatSubdivisionDisplay(
  subdivisionName: string | null | undefined,
  city: string
): string {
  const normalized = normalizeSubdivisionName(subdivisionName, city);

  // Title case if needed
  return normalized;
}
