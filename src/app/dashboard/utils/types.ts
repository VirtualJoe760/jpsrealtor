// src/app/dashboard/utils/types.ts

export interface FavoriteProperty {
  listingKey: string;
  swipedAt?: string;
  primaryPhotoUrl?: string;
  address?: string;
  unparsedAddress?: string;
  listPrice?: number;
  bedsTotal?: number;
  bathroomsTotalInteger?: number;
  livingArea?: number;
  subdivisionName?: string;
  slugAddress?: string;
  city?: string;
  propertyType?: string;
  mlsId?: string;
  mlsSource?: string;
  publicRemarks?: string;
  [key: string]: any;
}

export interface Analytics {
  totalLikes: number;
  totalDislikes: number;
  topSubdivisions: Array<{ name: string; count: number }>;
  topCities: Array<{ name: string; count: number }>;
  topPropertySubTypes: Array<{ type: string; count: number }>;
}

export interface FavoriteCommunity {
  name: string;
  id: string;
  type: 'city' | 'subdivision';
  cityId?: string;
}

export interface RemovedListing {
  listingKey: string;
  listing: FavoriteProperty;
}

export interface RemovedListingsResult {
  hasRemovedListings: boolean;
  removedListings: RemovedListing[];
  count: number;
}
