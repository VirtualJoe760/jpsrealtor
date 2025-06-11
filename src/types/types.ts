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
  pool?: boolean; // normalized for UI
  spa?: boolean;  // normalized for UI

  // Remarks and identifiers
  publicRemarks?: string;
  listingId: string;
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
  minPrice: string;
  maxPrice: string;
  beds: string;
  baths: string;
  propertyType: string;
  hoa: string;
  poolYn?: boolean;
  spaYn?: boolean;
  associationYN?: boolean; // replaces hasHOA
};
