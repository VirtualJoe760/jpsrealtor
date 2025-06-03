import type Supercluster from "supercluster";

// Properties specific to our listings
export interface CustomProperties {
  _id: string;
  listingId: string;
  cluster?: boolean; // optional for compatibility
  cluster_id?: number;
  point_count?: number;
  point_count_abbreviated?: string | number;
  latitude?: number;
  longitude?: number;
  listPrice?: number;
  address?: string;
  unparsedFirstLineAddress?: string;
  primaryPhotoUrl?: string;
  bedroomsTotal?: number;
  bathroomsFull?: number;
  livingArea?: number;
  lotSizeSqft?: number;
  pool?: boolean;
  spa?: boolean;
  slugAddress?: string;
  publicRemarks?: string;
  [key: string]: any;
}

export type CustomPointFeature = Supercluster.PointFeature<CustomProperties>;
export type CustomClusterFeature = Supercluster.ClusterFeature<CustomProperties>;
export type MixedClusterFeature = CustomPointFeature | CustomClusterFeature;
