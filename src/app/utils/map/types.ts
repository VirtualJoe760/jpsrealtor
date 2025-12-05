// src/app/utils/map/types.ts
// Shared types for map functionality - Unified MLS System

/**
 * Total count response from unified MLS API
 * Updated to support 8 MLS associations (not just GPS/CRMLS)
 */
export interface TotalCount {
  total: number;
  byMLS?: Record<string, number>; // Dynamic breakdown by MLS source
}

/**
 * Legacy support - maps old structure to new
 * @deprecated Use TotalCount directly with byMLS
 */
export interface LegacyTotalCount {
  gps: number;
  crmls: number;
  total: number;
}

/**
 * Convert new unified response to legacy format
 * For backward compatibility during migration
 */
export function toLegacyTotalCount(count: TotalCount): LegacyTotalCount {
  return {
    total: count.total,
    gps: count.byMLS?.GPS || 0,
    crmls: count.byMLS?.CRMLS || 0,
  };
}

/**
 * Map listing interface for map display
 */
export interface MapListing {
  _id: string;
  listingId: string;
  listingKey: string;
  slug: string;
  slugAddress?: string;
  listPrice: number;
  bedroomsTotal?: number;
  bedsTotal?: number;
  bathroomsFull?: number;
  bathroomsTotalInteger?: number;
  bathroomsTotalDecimal?: number;
  livingArea?: number;
  lotSizeArea?: number;
  lotSizeSqft?: number;
  latitude: number;
  longitude: number;
  address?: string;
  unparsedAddress?: string;
  unparsedFirstLineAddress?: string;
  poolYn?: boolean;
  spaYn?: boolean;
  publicRemarks?: string;
  propertyType?: string;
  propertySubType?: string;
  associationFee?: number;
  yearBuilt?: number;
  garageSpaces?: number;
  city?: string;
  subdivisionName?: string;
  landType?: string;
  viewYn?: boolean;
  gatedCommunity?: boolean;
  seniorCommunityYn?: boolean;
  mlsSource?: string; // GPS, CRMLS, CLAW, SOUTHLAND, etc.
  mlsId?: string;
  propertyTypeName?: string;
  pool?: boolean;
  spa?: boolean;
  hasHOA?: boolean;
  primaryPhotoUrl?: string;
  openHouses?: OpenHouseInfo[];
}

/**
 * Open house information
 */
export interface OpenHouseInfo {
  listingId: string;
  openHouseId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
}

/**
 * Loaded region tracking for deduplication
 */
export interface LoadedRegion {
  north: number;
  south: number;
  east: number;
  west: number;
  timestamp: number;
  zoom: number;
  isHighZoom: boolean;
}

/**
 * Map filter options
 */
export interface MapFilters {
  listingType?: "sale" | "rental" | "multifamily";
  propertyType?: string;
  propertySubType?: string;
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  minSqft?: number;
  maxSqft?: number;
  minLotSize?: number;
  maxLotSize?: number;
  minYear?: number;
  maxYear?: number;
  pool?: boolean;
  spa?: boolean;
  view?: boolean;
  garage?: boolean;
  minGarages?: number;
  hasHOA?: boolean;
  hoa?: number;
  gated?: boolean;
  senior?: boolean;
  landType?: string;
  city?: string;
  subdivision?: string;
  mlsSource?: string; // Comma-separated list
  excludeKeys?: string;
}
