// src/types/types.ts

export interface MapListing {
  _id: string;
  latitude: number;
  longitude: number;
  listPrice: number;
  address: string;
  unparsedFirstLineAddress: string;
  primaryPhotoUrl: string; // ✅ ensure this is NOT optional
  bedroomsTotal?: number;
  bathroomsFull?: number;
  livingArea?: number;
  lotSizeSqft?: number;
  pool?: boolean;
  spa?: boolean;
  listingId: string;
  slugAddress?: string;
  publicRemarks?: string;
}
