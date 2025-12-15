/**
 * Active Listings Aggregator
 *
 * Fetches active listings data from unified_listings collection.
 * Supports multiple query types: subdivision, city, zip, radius, etc.
 *
 * @module analytics/aggregators/active-listings
 */

import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

// ============================================================================
// TYPES
// ============================================================================

export interface ActiveListingsFilters {
  // Location filters (use one)
  subdivision?: string;
  city?: string;
  zip?: string;
  county?: string;
  mlsSource?: string;

  // Radius filter (requires lat, lng, radiusMiles)
  latitude?: number;
  longitude?: number;
  radiusMiles?: number;

  // Property filters
  propertyType?: string | string[];  // 'A', 'B', 'C', 'D'
  propertySubType?: string | string[];  // 'Single Family Residence', 'Condominium', 'Townhouse', etc.
  minBeds?: number;
  maxBeds?: number;
  minBaths?: number;
  maxBaths?: number;
  minSqft?: number;
  maxSqft?: number;
  minPrice?: number;
  maxPrice?: number;

  // Status filter
  standardStatus?: string | string[];  // Default: 'Active'

  // Query options
  limit?: number;
  sort?: 'asc' | 'desc';  // Sort by modificationTimestamp
}

export interface ActiveListing {
  listingKey: string;
  listingId?: string;
  listPrice: number;
  address?: string;
  city?: string;
  subdivision?: string;
  subdivisionName?: string;
  zip?: string;
  postalCode?: string;
  county?: string;
  countyOrParish?: string;
  mlsSource?: string;
  bedsTotal?: number;
  bedroomsTotal?: number;
  bathsTotal?: number;
  bathroomsTotalInteger?: number;
  bathroomsTotalDecimal?: number;
  sqft?: number;
  livingArea?: number;
  propertyType?: string;
  propertySubType?: string;
  latitude?: number;
  longitude?: number;

  // Analytics-specific fields
  daysOnMarket?: number;
  daysOnMarketCumulative?: number;
  associationFee?: number;
  associationFeeFrequency?: string;
  taxAnnualAmount?: number;
  taxYear?: number;

  // Timestamps
  listingDate?: Date;
  originalEntryTimestamp?: Date;
  modificationTimestamp?: Date;

  [key: string]: any;  // Allow additional fields
}

// ============================================================================
// AGGREGATOR FUNCTIONS
// ============================================================================

/**
 * Get active listings by subdivision
 *
 * @example
 * const listings = await getActiveListingsBySubdivision('PGA West');
 */
export async function getActiveListingsBySubdivision(
  subdivision: string,
  options: Omit<ActiveListingsFilters, 'subdivision'> = {}
): Promise<ActiveListing[]> {
  return getActiveListings({ ...options, subdivision });
}

/**
 * Get active listings by city
 *
 * @example
 * const listings = await getActiveListingsByCity('Palm Desert');
 */
export async function getActiveListingsByCity(
  city: string,
  options: Omit<ActiveListingsFilters, 'city'> = {}
): Promise<ActiveListing[]> {
  return getActiveListings({ ...options, city });
}

/**
 * Get active listings by radius
 *
 * @example
 * const listings = await getActiveListingsByRadius(33.7175, -116.3542, 1);
 */
export async function getActiveListingsByRadius(
  latitude: number,
  longitude: number,
  radiusMiles: number,
  options: Omit<ActiveListingsFilters, 'latitude' | 'longitude' | 'radiusMiles'> = {}
): Promise<ActiveListing[]> {
  return getActiveListings({ ...options, latitude, longitude, radiusMiles });
}

/**
 * Generic active listings aggregator
 * Builds MongoDB query from filters
 *
 * @example
 * const listings = await getActiveListings({
 *   city: 'Palm Desert',
 *   minBeds: 3,
 *   propertyType: 'A'
 * });
 */
export async function getActiveListings(filters: ActiveListingsFilters = {}): Promise<ActiveListing[]> {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }
  const collection = db.collection<ActiveListing>('unified_listings');

  // Build MongoDB query
  const query: any = {};

  // ========== LOCATION FILTERS ==========

  if (filters.subdivision) {
    query.subdivisionName = filters.subdivision;
  }

  if (filters.city) {
    query.city = filters.city;
  }

  if (filters.zip) {
    query.postalCode = filters.zip;
  }

  if (filters.county) {
    query.countyOrParish = filters.county;
  }

  if (filters.mlsSource) {
    query.mlsSource = filters.mlsSource;
  }

  // Radius filter (geospatial)
  if (filters.latitude && filters.longitude && filters.radiusMiles) {
    const radiusMeters = filters.radiusMiles * 1609.34;  // Convert miles to meters
    query.coordinates = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [filters.longitude, filters.latitude]  // [lng, lat] order
        },
        $maxDistance: radiusMeters
      }
    };
  }

  // ========== STATUS FILTER ==========

  if (filters.standardStatus) {
    query.standardStatus = Array.isArray(filters.standardStatus)
      ? { $in: filters.standardStatus }
      : filters.standardStatus;
  } else {
    // Default to Active listings
    query.standardStatus = 'Active';
  }

  // ========== PROPERTY FILTERS ==========

  if (filters.propertyType) {
    query.propertyType = Array.isArray(filters.propertyType)
      ? { $in: filters.propertyType }
      : filters.propertyType;
  }

  if (filters.propertySubType) {
    query.propertySubType = Array.isArray(filters.propertySubType)
      ? { $in: filters.propertySubType }
      : filters.propertySubType;
  }

  if (filters.minBeds !== undefined) {
    query.bedroomsTotal = { ...query.bedroomsTotal, $gte: filters.minBeds };
  }

  if (filters.maxBeds !== undefined) {
    query.bedroomsTotal = { ...query.bedroomsTotal, $lte: filters.maxBeds };
  }

  if (filters.minBaths !== undefined) {
    query.bathroomsTotalDecimal = { ...query.bathroomsTotalDecimal, $gte: filters.minBaths };
  }

  if (filters.maxBaths !== undefined) {
    query.bathroomsTotalDecimal = { ...query.bathroomsTotalDecimal, $lte: filters.maxBaths };
  }

  if (filters.minSqft !== undefined) {
    query.livingArea = { ...query.livingArea, $gte: filters.minSqft };
  }

  if (filters.maxSqft !== undefined) {
    query.livingArea = { ...query.livingArea, $lte: filters.maxSqft };
  }

  if (filters.minPrice !== undefined) {
    query.listPrice = { ...query.listPrice, $gte: filters.minPrice };
  }

  if (filters.maxPrice !== undefined) {
    query.listPrice = { ...query.listPrice, $lte: filters.maxPrice };
  }

  // ========== EXECUTE QUERY ==========

  let cursor = collection.find(query);

  // Sort
  if (filters.sort) {
    cursor = cursor.sort({ modificationTimestamp: filters.sort === 'asc' ? 1 : -1 });
  }

  // Limit
  if (filters.limit) {
    cursor = cursor.limit(filters.limit);
  }

  return await cursor.toArray();
}

/**
 * Get active listings count by filters
 */
export async function getActiveListingsCount(filters: ActiveListingsFilters = {}): Promise<number> {
  const listings = await getActiveListings(filters);
  return listings.length;
}

/**
 * 🔌 PLUG-AND-PLAY PATTERN
 *
 * This aggregator mirrors the closed-sales aggregator:
 *
 * 1. NEW MLS JOINS?
 *    - Data automatically flows through this aggregator
 *    - No code changes needed!
 *
 * 2. NEW FILTER TYPE?
 *    - Add to ActiveListingsFilters interface
 *    - Add corresponding query logic in getActiveListings()
 *    - Instantly available to all API endpoints
 *
 * 3. NEW COLLECTION?
 *    - Copy this file
 *    - Change collection name
 *    - Export from aggregators/index.ts
 *    - Use anywhere
 */
