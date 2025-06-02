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
  unparsedFirstLineAddress: string;
  primaryPhotoUrl: string; // ✅ required
  bedroomsTotal?: number;
  bathroomsFull?: number;
  livingArea?: number;
  lotSizeSqft?: number;
  pool?: boolean;
  spa?: boolean;
  listingId: string;
  slugAddress?: string;
  publicRemarks?: string;
  photos?: Photo[]; // ✅ now available for gallery display
}
