// src/types/listing.ts

export type Photo = {
  photoId: string;
  uri800: string;
  caption?: string;
  primary?: boolean;
  listingId?: string;
  uriThumb?: string;
  uriLarge?: string;
  uri1024?: string;
  uri1280?: string;
  uri1600?: string;
  uri2048?: string;
};

  
  export interface StandardFields {
    UnparsedFirstLine: string;
    City: string;
    StateOrProvince: string;
    PostalCode: string;
    SubdivisionName?: string;
    ListingId: string;
  
    BedroomsTotal?: number;
    BathroomsFull?: number;
    BathroomsHalf?: number;
    LivingArea?: number;
    YearBuilt?: number;
  
    ArchitectureStyle?: string;
    FireplacesTotal?: number;
  
    Heating?: string;          // Changed to string
    Cooling?: string;          // Changed to string
    PoolPrivateYN?: boolean;
    SpaFeatures?: string;      // Changed to string
    View?: string;             // Changed to string
  
    Furnished?: string;
  
    AssociationFee?: number;
    AssociationFeeFrequency?: string;
  
    PublicRemarks?: string;
  }
  
  export interface ListingData {
    StandardFields: StandardFields;
    // Add other listing-level properties if needed
  }
  