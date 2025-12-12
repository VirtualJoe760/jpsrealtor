/**
 * Amenities Filter Builder
 *
 * Builds MongoDB queries for amenity-based filters.
 * This is separated from property.ts for modularity.
 */

export interface AmenitiesFilter {
  pool?: boolean;
  spa?: boolean;
  view?: boolean;
  gated?: boolean;
  senior?: boolean;
  minGarages?: number;
  hasHOA?: boolean;
  maxHOA?: number;
}

/**
 * Build MongoDB query object from amenities filters
 */
export function buildAmenitiesQuery(filter: AmenitiesFilter): any {
  const query: any = {};

  // Boolean amenity filters
  if (filter.pool !== undefined) query.poolYn = filter.pool;
  if (filter.spa !== undefined) query.spaYn = filter.spa;
  if (filter.view !== undefined) query.viewYn = filter.view;
  if (filter.gated !== undefined) query.gatedCommunity = filter.gated;
  if (filter.senior !== undefined) query.seniorCommunityYn = filter.senior;

  // Garage minimum
  if (filter.minGarages !== undefined) {
    query.garageSpaces = { $gte: filter.minGarages };
  }

  // HOA filters
  if (filter.hasHOA !== undefined) {
    if (filter.hasHOA) {
      // Has HOA: associationFee > 0
      query.associationFee = { $gt: 0 };
    } else {
      // No HOA: associationFee = 0, null, or doesn't exist
      query.$or = [{ associationFee: { $in: [0, null] } }, { associationFee: { $exists: false } }];
    }
  }

  // Max HOA fee
  if (filter.maxHOA !== undefined) {
    query.associationFee = { ...query.associationFee, $lte: filter.maxHOA };
  }

  return query;
}
