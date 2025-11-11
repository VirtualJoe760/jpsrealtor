// src/types/types.ts

export interface Photo {
  photoId: string;
  uri800: string;
  caption?: string;
}

export interface MapListing {
  _id: string;
  latitude: number;
  longitude: number;
  listPrice: number;
  address: string;
  unparsedFirstLineAddress?: string;
  unparsedAddress?: string;
  primaryPhotoUrl: string;
  bedsTotal?: number;
  bathroomsTotalInteger?: number;

  // Optional property details
  bedroomsTotal?: number;
  bathroomsFull?: number;
  livingArea?: number;
  lotSizeSqft?: number;
  associationFee?: number;

  // Booleans for amenities (raw and normalized)
  poolYn?: boolean;
  spaYn?: boolean;
  associationYN?: boolean;
  pool?: boolean;
  spa?: boolean;

  // Remarks and identifiers
  publicRemarks?: string;
  listingId: string;
  listingKey: string; // ✅ Add this line
  slug?: string;
  slugAddress?: string;
  status?: string;
  standardStatus?: string;
  propertyType?: string;
  modificationTimestamp?: string;

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
