/**
 * Property Filter Builder
 *
 * Builds MongoDB queries for property-specific filters.
 * Handles property type, size, amenities, and physical characteristics.
 */

export interface PropertyFilter {
  // Property classification
  propertyType?: string | string[];
  propertySubType?: string | string[];

  // Size filters
  minBeds?: number;
  maxBeds?: number;
  minBaths?: number;
  maxBaths?: number;
  minSqft?: number;
  maxSqft?: number;
  minLotSize?: number;
  maxLotSize?: number;
  minYear?: number;
  maxYear?: number;

  // Amenity filters
  pool?: boolean;
  spa?: boolean;
  view?: boolean;
  gated?: boolean;
  senior?: boolean;
  minGarages?: number;

  // HOA filters
  hasHOA?: boolean;
  maxHOA?: number;
}

/**
 * Build MongoDB query object from property filters
 */
export function buildPropertyQuery(filter: PropertyFilter): any {
  const query: any = {};

  // Property type (e.g., "A" for sale, "B" for rental)
  if (filter.propertyType) {
    if (Array.isArray(filter.propertyType)) {
      query.propertyType = { $in: filter.propertyType };
    } else {
      query.propertyType = filter.propertyType;
    }
  }

  // Property subtype (e.g., "Single Family", "Condominium")
  if (filter.propertySubType) {
    if (Array.isArray(filter.propertySubType)) {
      query.propertySubType = {
        $in: filter.propertySubType.map((t) => new RegExp(escapeRegex(t), 'i')),
      };
    } else {
      query.propertySubType = { $regex: new RegExp(escapeRegex(filter.propertySubType), 'i') };
    }
  }

  // Bedrooms (check both bedroomsTotal and bedsTotal fields)
  if (filter.minBeds !== undefined || filter.maxBeds !== undefined) {
    const bedQuery: any = {};
    if (filter.minBeds !== undefined) bedQuery.$gte = filter.minBeds;
    if (filter.maxBeds !== undefined) bedQuery.$lte = filter.maxBeds;

    query.$or = [{ bedroomsTotal: bedQuery }, { bedsTotal: bedQuery }];
  }

  // Bathrooms
  if (filter.minBaths !== undefined || filter.maxBaths !== undefined) {
    const bathQuery: any = {};
    if (filter.minBaths !== undefined) bathQuery.$gte = filter.minBaths;
    if (filter.maxBaths !== undefined) bathQuery.$lte = filter.maxBaths;
    query.bathroomsTotalDecimal = bathQuery;
  }

  // Square footage
  if (filter.minSqft !== undefined || filter.maxSqft !== undefined) {
    const sqftQuery: any = {};
    if (filter.minSqft !== undefined) sqftQuery.$gte = filter.minSqft;
    if (filter.maxSqft !== undefined) sqftQuery.$lte = filter.maxSqft;
    query.livingArea = sqftQuery;
  }

  // Lot size
  if (filter.minLotSize !== undefined || filter.maxLotSize !== undefined) {
    const lotQuery: any = {};
    if (filter.minLotSize !== undefined) lotQuery.$gte = filter.minLotSize;
    if (filter.maxLotSize !== undefined) lotQuery.$lte = filter.maxLotSize;
    query.lotSizeSqft = lotQuery;
  }

  // Year built
  if (filter.minYear !== undefined || filter.maxYear !== undefined) {
    const yearQuery: any = {};
    if (filter.minYear !== undefined) yearQuery.$gte = filter.minYear;
    if (filter.maxYear !== undefined) yearQuery.$lte = filter.maxYear;
    query.yearBuilt = yearQuery;
  }

  // Amenities (boolean filters)
  if (filter.pool !== undefined) query.poolYn = filter.pool;
  if (filter.spa !== undefined) query.spaYn = filter.spa;
  if (filter.view !== undefined) query.viewYn = filter.view;
  if (filter.gated !== undefined) query.gatedCommunity = filter.gated;
  if (filter.senior !== undefined) query.seniorCommunityYn = filter.senior;

  // Garage spaces
  if (filter.minGarages !== undefined) {
    query.garageSpaces = { $gte: filter.minGarages };
  }

  // HOA filters
  if (filter.hasHOA !== undefined) {
    if (filter.hasHOA) {
      query.associationFee = { $gt: 0 };
    } else {
      query.$or = [{ associationFee: { $in: [0, null] } }, { associationFee: { $exists: false } }];
    }
  }

  if (filter.maxHOA !== undefined) {
    query.associationFee = { ...query.associationFee, $lte: filter.maxHOA };
  }

  return query;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
