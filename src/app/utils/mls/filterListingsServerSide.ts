// src/app/utils/mls/filterListingsServerSide.ts
// Server-side MongoDB query builder for map filters

export interface MapFilters {
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  propertyType?: string;
  propertySubType?: string;
  poolYn?: boolean;
  spaYn?: boolean;
  noHOA?: boolean;
  maxHOA?: number;
  minLivingArea?: number;
  mlsSource?: 'GPS' | 'CRMLS' | 'ALL';
  daysOnMarket?: number;
}

/**
 * Builds MongoDB query object from user-selected map filters
 * @param filters - MapFilters object from client UI
 * @returns MongoDB query object for Mongoose/native driver
 */
export function buildListingFilters(filters: MapFilters) {
  const query: Record<string, any> = {
    standardStatus: 'Active', // Always filter to active listings
    latitude: { $exists: true, $ne: null },
    longitude: { $exists: true, $ne: null }
  };

  // Price range filters
  if (filters.minPrice !== undefined && filters.minPrice > 0) {
    query.listPrice = { ...query.listPrice, $gte: filters.minPrice };
  }

  if (filters.maxPrice !== undefined && filters.maxPrice > 0) {
    query.listPrice = { ...query.listPrice, $lte: filters.maxPrice };
  }

  // Bedroom filter
  if (filters.beds !== undefined && filters.beds > 0) {
    query.bedroomsTotal = { $gte: filters.beds };
  }

  // Bathroom filter
  if (filters.baths !== undefined && filters.baths > 0) {
    query.$or = [
      { bathroomsTotalDecimal: { $gte: filters.baths } },
      { bathroomsTotalInteger: { $gte: filters.baths } }
    ];
  }

  // Property type filter
  if (filters.propertyType) {
    query.propertyType = filters.propertyType;
  }

  // Property subtype filter
  if (filters.propertySubType) {
    query.propertySubType = filters.propertySubType;
  }

  // Pool filter
  if (filters.poolYn === true) {
    query.poolYn = true;
  }

  // Spa filter
  if (filters.spaYn === true) {
    query.spaYn = true;
  }

  // HOA filters
  if (filters.noHOA === true) {
    // No HOA: associationFee is 0, null, or doesn't exist
    query.$or = [
      { associationFee: { $exists: false } },
      { associationFee: null },
      { associationFee: 0 }
    ];
  } else if (filters.maxHOA !== undefined && filters.maxHOA > 0) {
    // Max HOA fee
    query.associationFee = { $lte: filters.maxHOA };
  }

  // Living area minimum
  if (filters.minLivingArea !== undefined && filters.minLivingArea > 0) {
    query.livingArea = { $gte: filters.minLivingArea };
  }

  // Days on market filter (coming soon feature)
  if (filters.daysOnMarket !== undefined && filters.daysOnMarket > 0) {
    query.daysOnMarket = { $lte: filters.daysOnMarket };
  }

  return query;
}

/**
 * Builds geospatial bounding box query for MongoDB
 * @param bounds - {west, south, east, north} map viewport bounds
 * @returns MongoDB $geoWithin query
 */
export function buildBoundingBoxQuery(bounds: {
  west: number;
  south: number;
  east: number;
  north: number;
}) {
  return {
    latitude: { $gte: bounds.south, $lte: bounds.north },
    longitude: { $gte: bounds.west, $lte: bounds.east }
  };
}

/**
 * Combines filter query with bounding box query
 * @param filters - MapFilters from client UI
 * @param bounds - Viewport bounding box
 * @returns Complete MongoDB query object
 */
export function buildMapQuery(
  filters: MapFilters,
  bounds: { west: number; south: number; east: number; north: number }
) {
  const filterQuery = buildListingFilters(filters);
  const bboxQuery = buildBoundingBoxQuery(bounds);

  return {
    ...filterQuery,
    ...bboxQuery
  };
}

/**
 * Validates that bounding box is reasonable (prevents abuse)
 * @param bounds - Viewport bounding box
 * @returns true if valid, false if too large
 */
export function validateBoundingBox(bounds: {
  west: number;
  south: number;
  east: number;
  north: number;
}): boolean {
  const latDiff = Math.abs(bounds.north - bounds.south);
  const lonDiff = Math.abs(bounds.east - bounds.west);

  // Prevent queries larger than ~500 miles x 500 miles
  // Rough conversion: 1 degree ≈ 69 miles at equator
  const MAX_DEGREES = 7.25; // ~500 miles

  return latDiff <= MAX_DEGREES && lonDiff <= MAX_DEGREES;
}
