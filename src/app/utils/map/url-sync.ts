// URL parameter synchronization utilities for map state
// Handles converting between URL params and internal filter/map state

import type { Filters } from "@/types/types";

/**
 * Extracts filter values from URL search parameters
 * @param params URLSearchParams object
 * @param defaultFilters Default filter state to merge with URL params
 * @returns Filters object with values from URL
 */
export function parseFiltersFromURL(
  params: URLSearchParams,
  defaultFilters: Filters
): Filters {
  console.log('[url-sync] parseFiltersFromURL - Parsing URL params');

  const urlFilters: Partial<Filters> = {};

  // String filters
  if (params.get("listingType")) urlFilters.listingType = params.get("listingType")!;
  if (params.get("minPrice")) urlFilters.minPrice = params.get("minPrice")!;
  if (params.get("maxPrice")) urlFilters.maxPrice = params.get("maxPrice")!;
  if (params.get("beds")) urlFilters.beds = params.get("beds")!;
  if (params.get("baths")) urlFilters.baths = params.get("baths")!;
  if (params.get("minSqft")) urlFilters.minSqft = params.get("minSqft")!;
  if (params.get("maxSqft")) urlFilters.maxSqft = params.get("maxSqft")!;
  if (params.get("minLotSize")) urlFilters.minLotSize = params.get("minLotSize")!;
  if (params.get("maxLotSize")) urlFilters.maxLotSize = params.get("maxLotSize")!;
  if (params.get("minYear")) urlFilters.minYear = params.get("minYear")!;
  if (params.get("maxYear")) urlFilters.maxYear = params.get("maxYear")!;
  if (params.get("propertyType")) urlFilters.propertyType = params.get("propertyType")!;
  if (params.get("propertySubType")) urlFilters.propertySubType = params.get("propertySubType")!;
  if (params.get("minGarages")) urlFilters.minGarages = params.get("minGarages")!;
  if (params.get("hoa")) urlFilters.hoa = params.get("hoa")!;
  if (params.get("landType")) urlFilters.landType = params.get("landType")!;
  if (params.get("city")) urlFilters.city = params.get("city")!;
  if (params.get("subdivision")) urlFilters.subdivision = params.get("subdivision")!;

  // Boolean filters
  if (params.get("poolYn") === "true") urlFilters.poolYn = true;
  if (params.get("spaYn") === "true") urlFilters.spaYn = true;
  if (params.get("viewYn") === "true") urlFilters.viewYn = true;
  if (params.get("garageYn") === "true") urlFilters.garageYn = true;
  if (params.get("associationYN") === "true") urlFilters.associationYN = true;
  if (params.get("gatedCommunity") === "true") urlFilters.gatedCommunity = true;
  if (params.get("seniorCommunity") === "true") urlFilters.seniorCommunity = true;

  const filterCount = Object.keys(urlFilters).length;
  console.log(`[url-sync] Found ${filterCount} filter params in URL`);

  return Object.keys(urlFilters).length > 0
    ? { ...defaultFilters, ...urlFilters }
    : defaultFilters;
}

/**
 * Converts filter object to URL search parameters
 * @param filters Current filter state
 * @param existingParams Existing URLSearchParams to merge with
 * @returns URLSearchParams with filter values
 */
export function serializeFiltersToURL(
  filters: Filters,
  existingParams?: URLSearchParams
): URLSearchParams {
  console.log('[url-sync] serializeFiltersToURL - Serializing filters to URL');

  const params = existingParams ? new URLSearchParams(existingParams) : new URLSearchParams();

  // Add/update filter params
  Object.entries(filters).forEach(([key, value]) => {
    if (value === true || (value && value !== "")) {
      params.set(key, String(value));
    } else {
      params.delete(key);
    }
  });

  console.log(`[url-sync] Generated URL params with ${params.toString().split('&').length} entries`);

  return params;
}

/**
 * Removes a specific filter from URL parameters
 * @param filterKey The filter key to remove
 * @param existingParams Existing URLSearchParams
 * @returns Updated URLSearchParams
 */
export function removeFilterFromURL(
  filterKey: string,
  existingParams: URLSearchParams
): URLSearchParams {
  console.log(`[url-sync] removeFilterFromURL - Removing: ${filterKey}`);

  const params = new URLSearchParams(existingParams);
  params.delete(filterKey);

  return params;
}

/**
 * Clears all filter parameters from URL, keeping only map position params
 * @param existingParams Existing URLSearchParams
 * @returns URLSearchParams with only position data
 */
export function clearFiltersFromURL(
  existingParams: URLSearchParams
): URLSearchParams {
  console.log('[url-sync] clearFiltersFromURL - Clearing all filter params');

  const params = new URLSearchParams(existingParams);
  const keysToKeep = ["lat", "lng", "zoom", "selected"];

  // Remove all filter keys
  Array.from(params.keys()).forEach(key => {
    if (!keysToKeep.includes(key)) {
      params.delete(key);
    }
  });

  console.log(`[url-sync] Cleared filters, kept ${keysToKeep.length} position params`);

  return params;
}

/**
 * Updates URL with current map viewport bounds
 * @param bounds Current map bounds
 * @param existingParams Existing URLSearchParams
 * @returns URLSearchParams with updated position
 */
export function updateMapPositionInURL(
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
    zoom: number;
  },
  existingParams: URLSearchParams
): URLSearchParams {
  console.log(`[url-sync] updateMapPositionInURL - zoom: ${bounds.zoom}`);

  const params = new URLSearchParams(existingParams);
  const centerLat = (bounds.north + bounds.south) / 2;
  const centerLng = (bounds.east + bounds.west) / 2;

  params.set('lat', centerLat.toFixed(6));
  params.set('lng', centerLng.toFixed(6));
  params.set('zoom', bounds.zoom.toString());

  return params;
}

/**
 * Updates URL with selected listing slug and optionally its position
 * @param slug Listing slug address
 * @param position Optional lat/lng of the listing
 * @param existingParams Existing URLSearchParams
 * @returns URLSearchParams with selected listing
 */
export function updateSelectedListingInURL(
  slug: string,
  position?: { latitude: number; longitude: number },
  existingParams?: URLSearchParams
): URLSearchParams {
  console.log(`[url-sync] updateSelectedListingInURL - slug: ${slug}`);

  const params = existingParams ? new URLSearchParams(existingParams) : new URLSearchParams();

  params.set("selected", slug);

  if (position?.latitude && position?.longitude) {
    params.set("lat", position.latitude.toFixed(6));
    params.set("lng", position.longitude.toFixed(6));
  }

  return params;
}

/**
 * Removes selected listing from URL
 * @param existingParams Existing URLSearchParams
 * @returns URLSearchParams without selected param
 */
export function clearSelectedListingFromURL(
  existingParams: URLSearchParams
): URLSearchParams {
  console.log('[url-sync] clearSelectedListingFromURL');

  const params = new URLSearchParams(existingParams);
  params.delete("selected");

  return params;
}

/**
 * Extracts map position from URL params with fallback defaults
 * @param params URLSearchParams object
 * @param defaults Optional default values
 * @returns Map position object
 */
export function parseMapPositionFromURL(
  params: URLSearchParams,
  defaults = { lat: 33.72, lng: -116.37, zoom: 7 }
): { lat: number; lng: number; zoom: number } {
  console.log('[url-sync] parseMapPositionFromURL');

  const lat = parseFloat(params.get("lat") || "");
  const lng = parseFloat(params.get("lng") || "");
  const zoom = parseFloat(params.get("zoom") || "");

  const position = {
    lat: !isNaN(lat) ? lat : defaults.lat,
    lng: !isNaN(lng) ? lng : defaults.lng,
    zoom: !isNaN(zoom) ? zoom : defaults.zoom,
  };

  console.log(`[url-sync] Parsed position - lat: ${position.lat}, lng: ${position.lng}, zoom: ${position.zoom}`);

  return position;
}
