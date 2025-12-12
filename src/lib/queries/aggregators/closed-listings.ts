/**
 * Closed Listings Aggregator
 *
 * Fetches closed/sold listings from unified_closed_listings collection.
 * Integrates with the query system filters for cross-collection queries.
 */

import UnifiedClosedListing from '@/models/unified-closed-listing';
import { combineFilters, type CombinedFilters } from '../filters';

export interface ClosedListingsFilters extends Omit<CombinedFilters, 'listedAfter' | 'maxDaysOnMarket' | 'hasOpenHouse'> {
  // Time filters (different for closed listings)
  startDate?: Date;
  endDate?: Date;
  yearsBack?: number;  // Convenience: auto-calculates startDate

  // Query options
  limit?: number;
  skip?: number;
  sort?: 'date-asc' | 'date-desc' | 'price-asc' | 'price-desc';
}

export interface ClosedListing {
  listingKey: string;
  closePrice: number;
  closeDate: Date;
  daysOnMarket?: number;
  address?: string;
  city?: string;
  subdivisionName?: string;
  bedroomsTotal?: number;
  bedsTotal?: number;
  bathroomsTotalDecimal?: number;
  livingArea?: number;
  lotSizeSqft?: number;
  yearBuilt?: number;
  primaryPhotoUrl?: string;
  latitude?: number;
  longitude?: number;
  mlsSource?: string;
  propertyType?: string;
  propertySubType?: string;
  originalListPrice?: number;
  [key: string]: any;
}

/**
 * Build query for closed listings with time filters
 */
function buildClosedListingsQuery(filters: ClosedListingsFilters): any {
  // Use combine filters but exclude active listing time filters
  const { startDate, endDate, yearsBack, limit, skip, sort, ...restFilters } = filters;

  const baseQuery = combineFilters(restFilters as any);

  // Override for closed listings
  baseQuery.standardStatus = 'Closed';
  baseQuery.closePrice = { $exists: true, $ne: null, $gt: 0 };
  baseQuery.closeDate = { $exists: true, $ne: null };

  // Time filters
  if (startDate || endDate || yearsBack) {
    const dateQuery: any = {};

    if (yearsBack) {
      const yearsAgo = new Date();
      yearsAgo.setFullYear(yearsAgo.getFullYear() - yearsBack);
      dateQuery.$gte = yearsAgo;
    } else if (startDate) {
      dateQuery.$gte = startDate;
    }

    if (endDate) {
      dateQuery.$lte = endDate;
    }

    baseQuery.closeDate = dateQuery;
  }

  return baseQuery;
}

/**
 * Get closed listings by city
 */
export async function getClosedListingsByCity(
  city: string,
  filters: ClosedListingsFilters = {}
): Promise<ClosedListing[]> {
  const query = buildClosedListingsQuery({ city, ...filters });
  const listings = await UnifiedClosedListing.find(query)
    .select(getFieldSelection())
    .limit(filters.limit || 100)
    .skip(filters.skip || 0)
    .sort(getSortOrder(filters.sort))
    .lean();

  return listings as ClosedListing[];
}

/**
 * Get closed listings by subdivision
 */
export async function getClosedListingsBySubdivision(
  subdivision: string,
  filters: ClosedListingsFilters = {}
): Promise<ClosedListing[]> {
  const query = buildClosedListingsQuery({ subdivision, ...filters });
  const listings = await UnifiedClosedListing.find(query)
    .select(getFieldSelection())
    .limit(filters.limit || 100)
    .skip(filters.skip || 0)
    .sort(getSortOrder(filters.sort))
    .lean();

  return listings as ClosedListing[];
}

/**
 * Get closed listings by ZIP
 */
export async function getClosedListingsByZip(
  zip: string,
  filters: ClosedListingsFilters = {}
): Promise<ClosedListing[]> {
  const query = buildClosedListingsQuery({ zip, ...filters });
  const listings = await UnifiedClosedListing.find(query)
    .select(getFieldSelection())
    .limit(filters.limit || 100)
    .skip(filters.skip || 0)
    .sort(getSortOrder(filters.sort))
    .lean();

  return listings as ClosedListing[];
}

/**
 * Get closed listings by county
 */
export async function getClosedListingsByCounty(
  county: string,
  filters: ClosedListingsFilters = {}
): Promise<ClosedListing[]> {
  const query = buildClosedListingsQuery({ county, ...filters });
  const listings = await UnifiedClosedListing.find(query)
    .select(getFieldSelection())
    .limit(filters.limit || 100)
    .skip(filters.skip || 0)
    .sort(getSortOrder(filters.sort))
    .lean();

  return listings as ClosedListing[];
}

/**
 * Get closed listings - generic query
 */
export async function getClosedListings(
  filters: ClosedListingsFilters
): Promise<ClosedListing[]> {
  const query = buildClosedListingsQuery(filters);
  const listings = await UnifiedClosedListing.find(query)
    .select(getFieldSelection())
    .limit(filters.limit || 100)
    .skip(filters.skip || 0)
    .sort(getSortOrder(filters.sort))
    .lean();

  return listings as ClosedListing[];
}

/**
 * Count closed listings matching filters
 */
export async function countClosedListings(filters: ClosedListingsFilters): Promise<number> {
  const query = buildClosedListingsQuery(filters);
  return await UnifiedClosedListing.countDocuments(query);
}

/**
 * Get field selection for optimized queries
 */
function getFieldSelection(): string {
  return [
    'listingKey',
    'closePrice',
    'closeDate',
    'daysOnMarket',
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
    'primaryPhotoUrl',
    'latitude',
    'longitude',
    'mlsSource',
    'propertyType',
    'propertySubType',
    'originalListPrice',
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
    case 'date-asc':
      return { closeDate: 1 };
    case 'date-desc':
      return { closeDate: -1 };
    case 'price-asc':
      return { closePrice: 1 };
    case 'price-desc':
      return { closePrice: -1 };
    default:
      return { closeDate: -1 }; // Default: newest sales first
  }
}
