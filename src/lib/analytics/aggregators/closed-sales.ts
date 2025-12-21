/**
 * Closed Sales Aggregator
 *
 * Fetches closed sales data from unified_closed_listings collection.
 * Supports multiple query types: subdivision, city, zip, radius, etc.
 *
 * @module analytics/aggregators/closed-sales
 */

import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert string to Title Case (e.g., "palm desert" -> "Palm Desert")
 * Handles multi-word city names correctly
 */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ============================================================================
// TYPES
// ============================================================================

export interface ClosedSalesFilters {
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

  // Time filter
  startDate?: Date;
  endDate?: Date;
  yearsBack?: number;  // Convenience: auto-calculates startDate

  // Property filters
  propertyType?: string | string[];  // 'A', 'B', 'C', 'D'
  propertySubType?: string | string[];  // 'Single Family', 'Condominium', 'Townhouse', etc.
  minBeds?: number;
  maxBeds?: number;
  minBaths?: number;
  maxBaths?: number;
  minSqft?: number;
  maxSqft?: number;
  minPrice?: number;
  maxPrice?: number;

  // Query options
  limit?: number;
  sort?: 'asc' | 'desc';  // Sort by closeDate
}

export interface ClosedSale {
  listingKey: string;
  closePrice: number;
  closeDate: Date;
  address?: string;
  city?: string;
  subdivision?: string;
  subdivisionName?: string;
  zip?: string;
  county?: string;
  mlsSource?: string;
  bedroomsTotal?: number;
  bathroomsTotalDecimal?: number;
  livingArea?: number;
  propertyType?: string;
  latitude?: number;
  longitude?: number;
  [key: string]: any;  // Allow additional fields
}

// ============================================================================
// AGGREGATOR FUNCTIONS
// ============================================================================

/**
 * Get closed sales by subdivision
 *
 * @example
 * const sales = await getClosedSalesBySubdivision('Indian Wells Country Club', { yearsBack: 5 });
 */
export async function getClosedSalesBySubdivision(
  subdivision: string,
  options: Omit<ClosedSalesFilters, 'subdivision'> = {}
): Promise<ClosedSale[]> {
  return getClosedSales({ ...options, subdivision });
}

/**
 * Get closed sales by city
 *
 * @example
 * const sales = await getClosedSalesByCity('Palm Desert', { yearsBack: 3 });
 */
export async function getClosedSalesByCity(
  city: string,
  options: Omit<ClosedSalesFilters, 'city'> = {}
): Promise<ClosedSale[]> {
  return getClosedSales({ ...options, city });
}

/**
 * Get closed sales by radius (for CMA)
 *
 * @example
 * const sales = await getClosedSalesByRadius(33.7175, -116.3542, 1, { yearsBack: 1 });
 */
export async function getClosedSalesByRadius(
  latitude: number,
  longitude: number,
  radiusMiles: number,
  options: Omit<ClosedSalesFilters, 'latitude' | 'longitude' | 'radiusMiles'> = {}
): Promise<ClosedSale[]> {
  return getClosedSales({ ...options, latitude, longitude, radiusMiles });
}

/**
 * Generic closed sales aggregator
 * Builds MongoDB query from filters
 *
 * @example
 * const sales = await getClosedSales({
 *   city: 'Palm Desert',
 *   yearsBack: 5,
 *   minBeds: 3,
 *   propertyType: 'A'
 * });
 */
export async function getClosedSales(filters: ClosedSalesFilters = {}): Promise<ClosedSale[]> {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }
  const collection = db.collection<ClosedSale>('unified_closed_listings');

  // Build MongoDB query
  const query: any = {};

  // ========== LOCATION FILTERS ==========

  if (filters.subdivision) {
    // Normalize to title case for exact match (faster than regex, uses indexes)
    query.subdivisionName = toTitleCase(filters.subdivision);
  }

  if (filters.city) {
    // Normalize to title case for exact match (faster than regex, uses indexes)
    query.city = toTitleCase(filters.city);
  }

  if (filters.zip) {
    query.postalCode = filters.zip;
  }

  if (filters.county) {
    // Normalize to title case for exact match (faster than regex, uses indexes)
    query.countyOrParish = toTitleCase(filters.county);
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

  // ========== TIME FILTERS ==========

  if (filters.yearsBack) {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - filters.yearsBack);
    query.closeDate = { $gte: cutoffDate };
  } else if (filters.startDate || filters.endDate) {
    query.closeDate = {};
    if (filters.startDate) {
      query.closeDate.$gte = filters.startDate;
    }
    if (filters.endDate) {
      query.closeDate.$lte = filters.endDate;
    }
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
    query.closePrice = { ...query.closePrice, $gte: filters.minPrice };
  }

  if (filters.maxPrice !== undefined) {
    query.closePrice = { ...query.closePrice, $lte: filters.maxPrice };
  }

  // ========== EXECUTE QUERY ==========

  let cursor = collection.find(query);

  // Sort
  if (filters.sort) {
    cursor = cursor.sort({ closeDate: filters.sort === 'asc' ? 1 : -1 });
  }

  // Limit
  if (filters.limit) {
    cursor = cursor.limit(filters.limit);
  }

  return await cursor.toArray();
}

/**
 * Get sales count by filters (useful for confidence scoring)
 */
export async function getClosedSalesCount(filters: ClosedSalesFilters = {}): Promise<number> {
  const sales = await getClosedSales(filters);
  return sales.length;
}

/**
 * 🔌 PLUG-AND-PLAY PATTERN
 *
 * This aggregator is completely modular:
 *
 * 1. NEW MLS JOINS?
 *    - Add to MLS_IDS in fetch.py
 *    - Run fetch.py -y
 *    - Data automatically flows through this aggregator
 *    - No code changes needed!
 *
 * 2. NEW FILTER TYPE?
 *    - Add to ClosedSalesFilters interface
 *    - Add corresponding query logic in getClosedSales()
 *    - Instantly available to all API endpoints
 *
 * 3. NEW COLLECTION?
 *    - Copy this file
 *    - Change collection name
 *    - Export from aggregators/index.ts
 *    - Use anywhere
 *
 * Example: Adding HOA filter
 * ```typescript
 * // 1. Add to interface
 * interface ClosedSalesFilters {
 *   hasHOA?: boolean;  // NEW
 * }
 *
 * // 2. Add to query builder
 * if (filters.hasHOA !== undefined) {
 *   query.associationYN = filters.hasHOA;
 * }
 *
 * // 3. Use immediately
 * const sales = await getClosedSales({ city: 'Palm Desert', hasHOA: true });
 * ```
 */
