// src/models/gps-closed-listings.ts

import mongoose, { Schema, Document, Model } from "mongoose";

// -----------------------------
// Subdocument Interfaces
// -----------------------------

export interface IDocument {
  ResourceUri: string;
  Id: string;
  Name: string;
  Uri: string;
}

export interface IOpenHouse {
  Id: string;
  Date: string;
  StartTime: string;
  EndTime: string;
  Comments?: string;
  Livestream?: boolean;
  ModificationTimestamp?: string;
  AdditionalInfo?: Record<string, string>[];
}

export interface IVideo {
  ResourceUri: string;
  Id: string;
  Name: string;
  Caption?: string;
  Type?: string;
  ObjectHtml?: string;
}

export interface IVirtualTour {
  Id: string;
  Name?: string;
  ResourceUri?: string;
}

// -----------------------------
// Subdocument Schemas
// -----------------------------

const DocumentSchema = new Schema<IDocument>({
  ResourceUri: String,
  Id: String,
  Name: String,
  Uri: String,
});

const OpenHouseSchema = new Schema<IOpenHouse>({
  Id: String,
  Date: String,
  StartTime: String,
  EndTime: String,
  Comments: String,
  Livestream: Boolean,
  ModificationTimestamp: String,
  AdditionalInfo: [{ type: Map, of: String }],
});

const VideoSchema = new Schema<IVideo>({
  ResourceUri: String,
  Id: String,
  Name: String,
  Caption: String,
  Type: String,
  ObjectHtml: String,
});

const VirtualTourSchema = new Schema<IVirtualTour>({
  Id: String,
  Name: String,
  ResourceUri: String,
});

// -----------------------------
// GPS Closed Listing Interface
// -----------------------------

export interface IGPSClosedListing extends Document {
  listingId: string;
  slug: string;
  slugAddress?: string;

  // Core
  status?: string;
  listPrice?: number;
  currentPrice?: number;
  originalListPrice?: number;
  closePrice?: number; // Sold price
  closeDate?: Date; // Date sold
  bedsTotal?: number;
  bedroomsTotal?: number;
  bathroomsFull?: number;
  bathroomsHalf?: number;
  bathroomsTotalDecimal?: number;
  bathroomsTotalInteger?: number;
  livingArea?: number;
  buildingAreaTotal?: number;
  yearBuilt?: number;
  lotSizeSqft?: number;
  lotSizeArea?: number;
  lotSizeAcres?: number;
  primaryPhotoUrl?: string;
  fireplacesTotal?: number;
  flooring?: string;
  laundryFeatures?: string;
  interiorFeatures?: string;
  exteriorFeatures?: string;
  hoaFee?: number;
  hoaFeeFrequency?: string;

  // Location
  address?: string;
  unparsedAddress?: string;
  unparsedFirstLineAddress?: string;
  streetName?: string;
  streetNumber?: string;
  subdivisionName?: string;
  apn?: string;
  parcelNumber?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  stateOrProvince?: string;
  postalCode?: string;
  countyOrParish?: string;
  country?: string;

  // Timestamps
  listingKey: string;
  modificationTimestamp?: Date;
  listingContractDate?: Date;
  statusChangeTimestamp?: Date;
  onMarketDate?: Date;
  originalOnMarketTimestamp?: Date;

  // Media & remarks
  publicRemarks?: string;
  supplement?: string;
  Videos?: IVideo[];
  Documents?: IDocument[];
  OpenHouses?: IOpenHouse[];
  VirtualTours?: IVirtualTour[];

  // Features (flattened)
  poolYn?: boolean;
  pool?: boolean;
  spa?: boolean;
  spaYn?: boolean;
  viewYn?: boolean;
  view?: string;
  furnished?: string;
  roof?: string;
  cooling?: string;
  coolingYn?: boolean;
  heating?: string;
  heatingYn?: boolean;
  garageSpaces?: number;
  carportSpaces?: number;
  parkingTotal?: number;
  parkingFeatures?: string;
  stories?: number;
  levels?: string;
  seniorCommunityYn?: boolean;
  gatedCommunity?: boolean;
  rvAccess?: boolean;

  // Land & HOA
  landType?: string;
  landLeaseAmount?: number;
  landLeasePer?: string;
  landLeaseExpirationDate?: string;
  landLeaseYearsRemaining?: number;
  associationFee?: number;
  associationFeeFrequency?: string;
  associationYn?: boolean;
  communityFeatures?: string;
  lotFeatures?: string;

  // Classification
  propertyType?: string;
  propertySubType?: string;
  propertyClass?: string;
  propertyTypeLabel?: string;
  mlsareaMajor?: string;
  mlsareaMinor?: string;

  // Agent & Office
  listAgentId?: string;
  listAgentKey?: string;
  listAgentName?: string;
  listAgentFirstName?: string;
  listAgentLastName?: string;
  listAgentPreferredPhone?: string;
  listAgentMlsId?: string;
  listAgentMarketingName?: string;
  listAgentViewName?: string;
  listAgentMemberType?: string;
  listAgentAssociation?: string;
  listAgentOriginatingSystemMlsId?: string;

  listOfficeId?: string;
  listOfficeMlsId?: string;
  listOfficeName?: string;
  listOfficePhone?: string;
  listOfficeViewName?: string;
  listOfficeAor?: string;
  listOfficeOriginatingSystemMlsId?: string;
  terms?: string[];

  // Schools
  schoolDistrict?: string;
  elementarySchool?: string;
  middleSchool?: string;
  highSchool?: string;

  // Meta & IDX
  specialListingConditions?: string;
  standardStatus?: string;
  displayCompliance?: {
    View?: string;
    IDXLogo?: { Type?: string; LogoUri?: string };
    IDXLogoSmall?: { Type?: string; LogoUri?: string };
  };
  resourceUri?: string;
  id?: string;
  walkScore?: number;
}

// -----------------------------
// GPS Closed Listing Schema
// -----------------------------

const GPSClosedListingSchema = new Schema<IGPSClosedListing>({
  listingId: { type: String, required: true, unique: true, index: true },
  slug: { type: String, required: true, unique: true, index: true },
  slugAddress: { type: String, index: true, sparse: true },

  // Core
  status: String,
  listPrice: Number,
  currentPrice: Number,
  originalListPrice: Number,
  closePrice: Number,
  closeDate: Date,
  bedsTotal: Number,
  bedroomsTotal: Number,
  bathroomsFull: Number,
  bathroomsHalf: Number,
  bathroomsTotalDecimal: Number,
  bathroomsTotalInteger: Number,
  livingArea: Number,
  buildingAreaTotal: Number,
  yearBuilt: Number,
  lotSizeSqft: Number,
  lotSizeArea: Number,
  lotSizeAcres: Number,
  primaryPhotoUrl: String,
  fireplacesTotal: Number,
  flooring: String,
  laundryFeatures: String,
  interiorFeatures: String,
  exteriorFeatures: String,

  // Location
  address: String,
  unparsedAddress: String,
  unparsedFirstLineAddress: String,
  streetName: String,
  streetNumber: String,
  subdivisionName: String,
  apn: String,
  parcelNumber: String,
  latitude: Number,
  longitude: Number,
  city: String,
  stateOrProvince: String,
  postalCode: String,
  countyOrParish: String,
  country: String,

  // Timestamps
  listingKey: String,
  modificationTimestamp: Date,
  listingContractDate: Date,
  statusChangeTimestamp: Date,
  onMarketDate: Date,
  originalOnMarketTimestamp: Date,

  // Media & remarks
  publicRemarks: String,
  supplement: String,
  Videos: [VideoSchema],
  Documents: [DocumentSchema],
  OpenHouses: [OpenHouseSchema],
  VirtualTours: [VirtualTourSchema],

  // Features
  poolYn: Boolean,
  spaYn: Boolean,
  viewYn: Boolean,
  view: String,
  furnished: String,
  roof: String,
  cooling: String,
  coolingYn: Boolean,
  heating: String,
  heatingYn: Boolean,
  garageSpaces: Number,
  carportSpaces: Number,
  parkingTotal: Number,
  parkingFeatures: String,
  stories: Number,
  levels: String,
  seniorCommunityYn: Boolean,
  gatedCommunity: Boolean,

  // Land & HOA
  landType: String,
  associationFee: Number,
  associationFeeFrequency: String,
  associationYn: Boolean,
  communityFeatures: String,
  lotFeatures: String,

  // Classification
  propertyType: String,
  propertySubType: String,
  propertyClass: String,
  propertyTypeLabel: String,
  mlsareaMajor: String,
  mlsareaMinor: String,

  // Agent & Office
  listAgentId: String,
  listAgentKey: String,
  listAgentName: String,
  listAgentFirstName: String,
  listAgentLastName: String,
  listAgentPreferredPhone: String,
  listAgentMlsId: String,
  listAgentMarketingName: String,
  listAgentViewName: String,
  listAgentMemberType: String,
  listAgentAssociation: String,
  listAgentOriginatingSystemMlsId: String,

  listOfficeId: String,
  listOfficeMlsId: String,
  listOfficeName: String,
  listOfficePhone: String,
  listOfficeViewName: String,
  listOfficeAor: String,
  listOfficeOriginatingSystemMlsId: String,

  // Schools
  schoolDistrict: String,
  elementarySchool: String,
  middleSchool: String,
  highSchool: String,

  // Meta & IDX
  specialListingConditions: String,
  standardStatus: String,
  displayCompliance: {
    View: String,
    IDXLogo: {
      Type: String,
      LogoUri: String,
    },
    IDXLogoSmall: {
      Type: String,
      LogoUri: String,
    },
  },
  resourceUri: String,
  id: String,
  walkScore: Number,
});

// -----------------------------
// Compound Indexes for Query Optimization (Comps Search)
// -----------------------------

// Geographic + Close Date + Property Type (for finding comps)
GPSClosedListingSchema.index({ latitude: 1, longitude: 1, closeDate: 1, propertyType: 1 });

// Price range queries for comps
GPSClosedListingSchema.index({ closePrice: 1, closeDate: 1 });

// Beds/Baths filtering for comps
GPSClosedListingSchema.index({ bedroomsTotal: 1, bathroomsFull: 1, closeDate: 1 });

// City-based searches
GPSClosedListingSchema.index({ city: 1, closeDate: 1, closePrice: 1 });

// Subdivision searches for comps
GPSClosedListingSchema.index({ subdivisionName: 1, closeDate: 1 }, { sparse: true });

// Square footage + close date
GPSClosedListingSchema.index({ livingArea: 1, closeDate: 1 });

// -----------------------------
// Model Export
// -----------------------------

export const GPSClosedListing: Model<IGPSClosedListing> =
  mongoose.models.GPSClosedListing || mongoose.model<IGPSClosedListing>("GPSClosedListing", GPSClosedListingSchema);
