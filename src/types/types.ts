// src/types/types.ts

export interface Photo {
  photoId: string;
  uri800: string;
  caption?: string;
}

export interface MapListing {
  _id: string;

  // Location & coordinates
  latitude: number;
  longitude: number;
  city?: string; // ✅ Added for useSmartSwipeQueue and UI context

  // Pricing
  listPrice: number;
  associationFee?: number;

  // Address info
  address: string;
  unparsedFirstLineAddress?: string;
  unparsedAddress?: string;
  slug?: string;
  slugAddress?: string;

  // Primary photo
  primaryPhotoUrl: string;

  // Core property specs
  bedsTotal?: number;
  bedroomsTotal?: number;
  bathroomsTotalInteger?: number;
  bathroomsFull?: number;
  livingArea?: number;
  lotSizeSqft?: number;
  lotSizeArea?: number;
  yearBuilt?: number;
  landType?: string; // ✅ Added for lease/fee land distinction

  // Status & identifiers
  listingId: string;
  listingKey: string;
  status?: string;
  standardStatus?: string;
  modificationTimestamp?: string;

  // Property classification
  propertyType?: string;
  propertySubType?: string;
  subdivisionName?: string;

  // Boolean features / amenities
  poolYn?: boolean;
  spaYn?: boolean;
  associationYN?: boolean;
  pool?: boolean;
  spa?: boolean;

  // Remarks
  publicRemarks?: string;

  // Media
  photos?: Photo[];
}

export type Filters = {
  // Price
  minPrice: string;
  maxPrice: string;

  // Beds/Baths
  beds: string;
  baths: string;

  // Square Footage
  minSqft: string;
  maxSqft: string;

  // Lot Size
  minLotSize: string;
  maxLotSize: string;

  // Year Built
  minYear: string;
  maxYear: string;

  // Property Type
  propertyType: string;
  propertySubType: string;

  // Amenities (boolean filters)
  poolYn?: boolean;
  spaYn?: boolean;
  viewYn?: boolean;
  garageYn?: boolean;

  // Garage count
  minGarages: string;

  // HOA
  hoa: string;
  associationYN?: boolean;

  // Community
  gatedCommunity?: boolean;
  seniorCommunity?: boolean;

  // Land Type
  landType: string;

  // Location
  city: string;
  subdivision: string;
};
