/**
 * Location Filter Builder
 *
 * Builds MongoDB queries for location-based filters.
 * Supports city, subdivision, ZIP, county, MLS source, and radius searches.
 */

export interface LocationFilter {
  city?: string;
  subdivision?: string;
  zip?: string;
  county?: string;
  mlsSource?: string | string[];
  latitude?: number;
  longitude?: number;
  radiusMiles?: number;
}

/**
 * Build MongoDB query object from location filters
 */
export function buildLocationQuery(filter: LocationFilter): any {
  const query: any = {};

  // City filter (case-insensitive exact match)
  if (filter.city) {
    query.city = { $regex: new RegExp(`^${escapeRegex(filter.city)}$`, 'i') };
  }

  // Subdivision filter (case-insensitive exact match for performance)
  // Using exact match with case-insensitive regex anchor for index optimization
  if (filter.subdivision) {
    query.subdivisionName = { $regex: new RegExp(`^${escapeRegex(filter.subdivision)}$`, 'i') };
  }

  // ZIP code (exact match)
  if (filter.zip) {
    query.postalCode = filter.zip;
  }

  // County filter (case-insensitive)
  if (filter.county) {
    query.countyOrParish = { $regex: new RegExp(`^${escapeRegex(filter.county)}$`, 'i') };
  }

  // MLS source filter (single or multiple)
  if (filter.mlsSource) {
    if (Array.isArray(filter.mlsSource)) {
      query.mlsSource = { $in: filter.mlsSource };
    } else {
      query.mlsSource = filter.mlsSource;
    }
  }

  // Radius search (circular bounding box approximation)
  if (filter.latitude && filter.longitude && filter.radiusMiles) {
    const milesPerDegreeLat = 69; // Approximate miles per degree latitude
    const milesPerDegreeLng = 69 * Math.cos((filter.latitude * Math.PI) / 180);

    const latDelta = filter.radiusMiles / milesPerDegreeLat;
    const lngDelta = filter.radiusMiles / milesPerDegreeLng;

    query.latitude = {
      $gte: filter.latitude - latDelta,
      $lte: filter.latitude + latDelta,
    };
    query.longitude = {
      $gte: filter.longitude - lngDelta,
      $lte: filter.longitude + lngDelta,
    };
  }

  return query;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
