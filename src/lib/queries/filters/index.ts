/**
 * Query Filters - Modular Filter Builders
 *
 * Export all filter modules and provide utility for combining filters.
 */

export * from './location';
export * from './property';
export * from './price';
export * from './amenities';
export * from './time';

import { buildLocationQuery, type LocationFilter } from './location';
import { buildPropertyQuery, type PropertyFilter } from './property';
import { buildPriceQuery, type PriceFilter } from './price';
import { buildAmenitiesQuery, type AmenitiesFilter } from './amenities';
import { buildTimeQuery, type TimeFilter } from './time';

/**
 * Combined filter interface
 */
export interface CombinedFilters
  extends LocationFilter,
    PropertyFilter,
    PriceFilter,
    AmenitiesFilter,
    TimeFilter {}

/**
 * Combine all filters into a single MongoDB query
 *
 * @example
 * ```typescript
 * const filters: CombinedFilters = {
 *   city: "Palm Desert",
 *   minBeds: 3,
 *   maxPrice: 800000,
 *   pool: true
 * };
 *
 * const query = combineFilters(filters);
 * // Returns: { city: /^Palm Desert$/i, bedroomsTotal: { $gte: 3 }, listPrice: { $lte: 800000 }, poolYn: true }
 * ```
 */
export function combineFilters(filters: CombinedFilters): any {
  // Base query for active listings
  const baseQuery: any = {
    listPrice: { $exists: true, $ne: null, $gt: 0 },
    propertyType: { $ne: 'B' }, // Exclude rentals by default
  };

  // Build individual filter queries
  const locationQuery = buildLocationQuery(filters);
  const propertyQuery = buildPropertyQuery(filters);
  const priceQuery = buildPriceQuery(filters);
  const amenitiesQuery = buildAmenitiesQuery(filters);
  const timeQuery = buildTimeQuery(filters);

  // Merge all queries
  return {
    ...baseQuery,
    ...locationQuery,
    ...propertyQuery,
    ...priceQuery,
    ...amenitiesQuery,
    ...timeQuery,
  };
}

/**
 * Validate that required filters are present
 */
export function validateFilters(filters: CombinedFilters): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // At least one location filter is recommended
  if (
    !filters.city &&
    !filters.subdivision &&
    !filters.zip &&
    !filters.county &&
    !filters.mlsSource &&
    !(filters.latitude && filters.longitude && filters.radiusMiles)
  ) {
    errors.push(
      'At least one location filter is recommended (city, subdivision, zip, county, mlsSource, or radius)'
    );
  }

  // Radius search requires lat, lng, and radius
  if (filters.radiusMiles && (!filters.latitude || !filters.longitude)) {
    errors.push('Radius search requires latitude, longitude, and radiusMiles');
  }

  // Price validation
  if (filters.minPrice && filters.maxPrice && filters.minPrice > filters.maxPrice) {
    errors.push('minPrice cannot be greater than maxPrice');
  }

  // Sqft validation
  if (filters.minSqft && filters.maxSqft && filters.minSqft > filters.maxSqft) {
    errors.push('minSqft cannot be greater than maxSqft');
  }

  // Beds validation
  if (filters.minBeds && filters.maxBeds && filters.minBeds > filters.maxBeds) {
    errors.push('minBeds cannot be greater than maxBeds');
  }

  // Baths validation
  if (filters.minBaths && filters.maxBaths && filters.minBaths > filters.maxBaths) {
    errors.push('minBaths cannot be greater than maxBaths');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
