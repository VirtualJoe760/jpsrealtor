// src/models/crmls-listings.ts
// CRMLS (California Regional MLS) Listing Model

import mongoose, { Schema, Document, Model } from "mongoose";

// Subdocument Interfaces (simplified for CRMLS)
export interface ICRMLSDocument {
  ResourceUri?: string;
  Id?: string;
  Name?: string;
  Uri?: string;
}

export interface ICRMLSOpenHouse {
  Id?: string;
  Date?: string;
  StartTime?: string;
  EndTime?: string;
  Comments?: string;
}

export interface ICRMLSVideo {
  ResourceUri?: string;
  Id?: string;
  Name?: string;
  Caption?: string;
}

// CRMLS Listing Interface
export interface ICRMLSListing extends Document {
  listingId: string;
  listingKey?: string; // Same as slug - for compatibility with GPS MLS queries
  slug: string;
  slugAddress?: string;
  mlsSource: "CRMLS"; // Identifier for MLS source

  // Core
  status?: string;
  standardStatus?: string;
  listPrice?: number;
  currentPrice?: number;
  originalListPrice?: number;
  bedsTotal?: number;
  bedroomsTotal?: number;
  bathroomsFull?: number;
  bathroomsHalf?: number;
  bathroomsTotalDecimal?: number;
  bathroomsTotalInteger?: number;
  livingArea?: number;
  lotSizeArea?: number;
  lotSizeSqft?: number;
  yearBuilt?: number;

  // Address
  address?: string;
  unparsedAddress?: string;
  unparsedFirstLineAddress?: string;
  city?: string;
  stateOrProvince?: string;
  postalCode?: string;
  countyOrParish?: string;
  streetName?: string;
  streetNumber?: string;
  subdivisionName?: string;
  apn?: string;
  parcelNumber?: string;

  // Geo
  latitude?: number;
  longitude?: number;

  // Property classification
  propertyType?: string;
  propertyTypeLabel?: string;
  propertySubType?: string;

  // Photos
  primaryPhotoUrl?: string;
  photoCount?: number;
  photosLastUpdateTimestamp?: string;

  // Land & HOA
  associationFee?: number;
  associationFeeFrequency?: string;
  associationYn?: boolean;
  communityFeatures?: string;

  // Amenities
  poolYn?: boolean;
  spaYn?: boolean;
  garageSpaces?: number;
  parkingTotal?: number;

  // Description
  publicRemarks?: string;
  privateRemarks?: string;

  // Listing details
  listingContractDate?: Date;
  onMarketDate?: Date;
  closeDate?: Date;
  listAgentMlsId?: string;
  listAgentFullName?: string;
  listOfficeName?: string;
  listOfficePhone?: string;
  buyerAgentMlsId?: string;
  buyerAgentFullName?: string;

  // Timestamps
  modificationTimestamp?: Date;
  createdAt?: Date;
  updatedAt?: Date;

  // Extra CRMLS specific fields
  mlsNumber?: string;
  tract?: string;
  stories?: number;
  view?: string;
  heating?: string;
  cooling?: string;
  flooring?: string;
  roofType?: string;
}

// Subdocument Schemas
const CRMLSDocumentSchema = new Schema<ICRMLSDocument>({
  ResourceUri: String,
  Id: String,
  Name: String,
  Uri: String,
});

const CRMLSOpenHouseSchema = new Schema<ICRMLSOpenHouse>({
  Id: String,
  Date: String,
  StartTime: String,
  EndTime: String,
  Comments: String,
});

const CRMLSVideoSchema = new Schema<ICRMLSVideo>({
  ResourceUri: String,
  Id: String,
  Name: String,
  Caption: String,
});

// CRMLS Listing Schema
const CRMLSListingSchema = new Schema<ICRMLSListing>(
  {
    listingId: { type: String, required: true, unique: true },
    listingKey: { type: String, index: true }, // Same as slug - for compatibility with GPS MLS queries
    slug: { type: String, required: true },
    slugAddress: String,
    mlsSource: { type: String, default: "CRMLS", immutable: true },

    // Core
    status: String,
    standardStatus: String,
    listPrice: Number,
    currentPrice: Number,
    originalListPrice: Number,
    bedsTotal: Number,
    bedroomsTotal: Number,
    bathroomsFull: Number,
    bathroomsHalf: Number,
    bathroomsTotalDecimal: Number,
    bathroomsTotalInteger: Number,
    livingArea: Number,
    lotSizeArea: Number,
    lotSizeSqft: Number,
    yearBuilt: Number,

    // Address
    address: String,
    unparsedAddress: String,
    unparsedFirstLineAddress: String,
    city: String,
    stateOrProvince: String,
    postalCode: String,
    countyOrParish: String,
    streetName: String,
    streetNumber: String,
    subdivisionName: String,
    apn: String,
    parcelNumber: String,

    // Geo
    latitude: Number,
    longitude: Number,

    // Property classification
    propertyType: String,
    propertyTypeLabel: String,
    propertySubType: String,

    // Photos
    primaryPhotoUrl: String,
    photoCount: Number,
    photosLastUpdateTimestamp: String,

    // Land & HOA
    associationFee: Number,
    associationFeeFrequency: String,
    associationYn: Boolean,
    communityFeatures: String,

    // Amenities
    poolYn: Boolean,
    spaYn: Boolean,
    garageSpaces: Number,
    parkingTotal: Number,

    // Description
    publicRemarks: String,
    privateRemarks: String,

    // Listing details
    listingContractDate: Date,
    onMarketDate: Date,
    closeDate: Date,
    listAgentMlsId: String,
    listAgentFullName: String,
    listOfficeName: String,
    listOfficePhone: String,
    buyerAgentMlsId: String,
    buyerAgentFullName: String,

    // Timestamps
    modificationTimestamp: Date,

    // CRMLS specific
    mlsNumber: String,
    tract: String,
    stories: Number,
    view: String,
    heating: String,
    cooling: String,
    flooring: String,
    roofType: String,
  },
  { timestamps: true, collection: "crmls_listings" }
);

// Indexes for performance (listingId and listingKey already indexed via schema)
CRMLSListingSchema.index({ slug: 1 });
CRMLSListingSchema.index({ slugAddress: 1 });
CRMLSListingSchema.index({ latitude: 1, longitude: 1 });
CRMLSListingSchema.index({ standardStatus: 1, listPrice: 1 });
CRMLSListingSchema.index({ city: 1, standardStatus: 1 });
CRMLSListingSchema.index({ subdivisionName: 1, standardStatus: 1 });
CRMLSListingSchema.index({ propertyType: 1, standardStatus: 1 });
CRMLSListingSchema.index({ mlsSource: 1 });

// Export model
export const CRMLSListing: Model<ICRMLSListing> =
  mongoose.models.CRMLSListing ||
  mongoose.model<ICRMLSListing>("CRMLSListing", CRMLSListingSchema);
