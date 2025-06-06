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
  unparsedAddress?: string; // ✅ Add this
  primaryPhotoUrl: string;

  // Optional property details
  bedroomsTotal?: number;
  bathroomsFull?: number;
  livingArea?: number;
  lotSizeSqft?: number;

  // Booleans for amenities
  poolYn?: boolean;
  spaYn?: boolean;
  pool?: boolean; // ✅ Add this
  spa?: boolean;  // ✅ Add this

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
