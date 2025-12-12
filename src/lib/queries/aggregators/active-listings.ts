/**
 * Active Listings Aggregator
 *
 * Fetches active listings from unified_listings collection.
 * Supports multiple query types: city, subdivision, zip, radius, etc.
 */

import UnifiedListing from '@/models/unified-listing';
import { combineFilters, type CombinedFilters } from '../filters';

export interface ActiveListingsFilters extends CombinedFilters {
  // Query options
  limit?: number;
  skip?: number;
  sort?:
    | 'price-asc'
    | 'price-desc'
    | 'sqft-asc'
    | 'sqft-desc'
    | 'newest'
    | 'oldest'
    | 'dom-asc'
    | 'dom-desc';
}

export interface ActiveListing {
  listingKey: string;
  listPrice?: number;
  address?: string;
  city?: string;
  subdivisionName?: string;
  bedroomsTotal?: number;
  bedsTotal?: number;
  bathroomsTotalDecimal?: number;
  livingArea?: number;
  lotSizeSqft?: number;
  yearBuilt?: number;
  daysOnMarket?: number;
  onMarketDate?: Date;
  primaryPhotoUrl?: string;
  latitude?: number;
  longitude?: number;
  mlsSource?: string;
  propertyType?: string;
  propertySubType?: string;
  poolYn?: boolean;
  spaYn?: boolean;
  viewYn?: boolean;
  garageSpaces?: number;
  associationFee?: number;
  [key: string]: any;
}

/**
 * Get active listings by city
 */
export async function getActiveListingsByCity(
  city: string,
  filters: ActiveListingsFilters = {}
): Promise<ActiveListing[]> {
  const query = combineFilters({ city, ...filters });
  const listings = await UnifiedListing.find(query)
    .select(getFieldSelection())
    .limit(filters.limit || 100)
    .skip(filters.skip || 0)
    .sort(getSortOrder(filters.sort))
    .lean();

  return listings as ActiveListing[];
}

/**
 * Get active listings by subdivision
 */
export async function getActiveListingsBySubdivision(
  subdivision: string,
  filters: ActiveListingsFilters = {}
): Promise<ActiveListing[]> {
  const query = combineFilters({ subdivision, ...filters });
  const listings = await UnifiedListing.find(query)
    .select(getFieldSelection())
    .limit(filters.limit || 100)
    .skip(filters.skip || 0)
    .sort(getSortOrder(filters.sort))
    .lean();

  return listings as ActiveListing[];
}

/**
 * Get active listings by ZIP code
 */
export async function getActiveListingsByZip(
  zip: string,
  filters: ActiveListingsFilters = {}
): Promise<ActiveListing[]> {
  const query = combineFilters({ zip, ...filters });
  const listings = await UnifiedListing.find(query)
    .select(getFieldSelection())
    .limit(filters.limit || 100)
    .skip(filters.skip || 0)
    .sort(getSortOrder(filters.sort))
    .lean();

  return listings as ActiveListing[];
}

/**
 * Get active listings by county
 */
export async function getActiveListingsByCounty(
  county: string,
  filters: ActiveListingsFilters = {}
): Promise<ActiveListing[]> {
  const query = combineFilters({ county, ...filters });
  const listings = await UnifiedListing.find(query)
    .select(getFieldSelection())
    .limit(filters.limit || 100)
    .skip(filters.skip || 0)
    .sort(getSortOrder(filters.sort))
    .lean();

  return listings as ActiveListing[];
}

/**
 * Get active listings by radius (CMA)
 */
export async function getActiveListingsByRadius(
  latitude: number,
  longitude: number,
  radiusMiles: number,
  filters: ActiveListingsFilters = {}
): Promise<ActiveListing[]> {
  const query = combineFilters({
    latitude,
    longitude,
    radiusMiles,
    ...filters,
  });

  const listings = await UnifiedListing.find(query)
    .select(getFieldSelection())
    .limit(filters.limit || 100)
    .skip(filters.skip || 0)
    .sort(getSortOrder(filters.sort))
    .lean();

  return listings as ActiveListing[];
}

/**
 * Get active listings - generic query
 */
export async function getActiveListings(
  filters: ActiveListingsFilters
): Promise<ActiveListing[]> {
  const query = combineFilters(filters);
  const listings = await UnifiedListing.find(query)
    .select(getFieldSelection())
    .limit(filters.limit || 100)
    .skip(filters.skip || 0)
    .sort(getSortOrder(filters.sort))
    .lean();

  return listings as ActiveListing[];
}

/**
 * Count active listings matching filters
 */
export async function countActiveListings(filters: ActiveListingsFilters): Promise<number> {
  const query = combineFilters(filters);
  return await UnifiedListing.countDocuments(query);
}

/**
 * Get field selection for optimized queries
 */
function getFieldSelection(): string {
  return [
    'listingKey',
    'listPrice',
    'address',
    'city',
    'subdivisionName',
    'bedroomsTotal',
    'bedsTotal',
    'bathroomsTotalDecimal',
    'bathroomsTotalInteger',
    'livingArea',
    'lotSizeSqft',
    'yearBuilt',
    'daysOnMarket',
    'onMarketDate',
    'primaryPhotoUrl',
    'latitude',
    'longitude',
    'mlsSource',
    'propertyType',
    'propertySubType',
    'poolYn',
    'spaYn',
    'viewYn',
    'garageSpaces',
    'associationFee',
    'unparsedAddress',
    'postalCode',
    'slug',
  ].join(' ');
}

/**
 * Get sort order from sort option
 */
function getSortOrder(sort?: string): any {
  switch (sort) {
    case 'price-asc':
      return { listPrice: 1 };
    case 'price-desc':
      return { listPrice: -1 };
    case 'sqft-asc':
      return { livingArea: 1 };
    case 'sqft-desc':
      return { livingArea: -1 };
    case 'newest':
      return { onMarketDate: -1 };
    case 'oldest':
      return { onMarketDate: 1 };
    case 'dom-asc':
      return { daysOnMarket: 1 };
    case 'dom-desc':
      return { daysOnMarket: -1 };
    default:
      return { onMarketDate: -1 }; // Default: newest first
  }
}
