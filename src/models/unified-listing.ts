// src/models/unified-listing.ts

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

export interface IMedia {
  ResourceUri?: string;
  Id?: string;
  MediaKey?: string;
  MediaURL?: string;
  Order?: number;
  MediaType?: string;
  MediaCategory?: string;
  Caption?: string;
  ShortDescription?: string;
  LongDescription?: string;

  // Photo URIs (all size variants from Spark API)
  Uri300?: string;
  Uri640?: string;
  Uri800?: string;
  Uri1024?: string;
  Uri1280?: string;
  Uri1600?: string;
  Uri2048?: string;
  UriThumb?: string;
  UriLarge?: string;

  // Image metadata
  ImageWidth?: number;
  ImageHeight?: number;
  ModificationTimestamp?: string;
}

export interface IGeoPoint {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude] - GeoJSON order
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

const MediaSchema = new Schema<IMedia>({
  ResourceUri: String,
  Id: String,
  MediaKey: String,
  MediaURL: String,
  Order: Number,
  MediaType: String,
  MediaCategory: String,
  Caption: String,
  ShortDescription: String,
  LongDescription: String,

  // Photo URIs (all size variants from Spark API)
  Uri300: String,
  Uri640: String,
  Uri800: String,
  Uri1024: String,
  Uri1280: String,
  Uri1600: String,
  Uri2048: String,
  UriThumb: String,
  UriLarge: String,

  // Image metadata
  ImageWidth: Number,
  ImageHeight: Number,
  ModificationTimestamp: String,
});

// -----------------------------
// Unified Listing Interface
// -----------------------------

export interface IUnifiedListing extends Document {
  // Enhanced MLS Tracking Fields
  mlsSource: string; // Human-readable name (GPS, CRMLS, etc.)
  mlsId: string; // 26-digit MLS association ID
  propertyTypeName?: string; // Human-readable (Residential, Land, etc.)

  // Core Identifiers
  listingId: string;
  listingKey: string;
  slug: string;
  slugAddress?: string;

  // Core Details
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
  coordinates?: IGeoPoint; // GeoJSON for geospatial queries
  city?: string;
  stateOrProvince?: string;
  postalCode?: string;
  countyOrParish?: string;
  country?: string;

  // Timestamps
  modificationTimestamp?: Date;
  listingContractDate?: Date;
  statusChangeTimestamp?: Date;
  onMarketDate?: Date;
  originalOnMarketTimestamp?: Date;
  daysOnMarket?: number;

  // Media & Remarks
  publicRemarks?: string;
  supplement?: string;
  media?: IMedia[]; // From _expand=Media
  Videos?: IVideo[];
  Documents?: IDocument[];
  OpenHouses?: IOpenHouse[];
  VirtualTours?: IVirtualTour[];

  // Features
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
// Unified Listing Schema
// -----------------------------

const UnifiedListingSchema = new Schema<IUnifiedListing>(
  {
    // Enhanced MLS Tracking
    mlsSource: { type: String, required: true, index: true },
    mlsId: { type: String, required: true, index: true },
    propertyTypeName: { type: String, index: true },

    // Core Identifiers
    listingId: { type: String, index: true },
    listingKey: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, index: true },
    slugAddress: { type: String, index: true, sparse: true },

    // Core Details
    status: String,
    standardStatus: { type: String, index: true },
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
    hoaFee: Number,
    hoaFeeFrequency: String,

    // Location
    address: String,
    unparsedAddress: String,
    unparsedFirstLineAddress: String,
    streetName: String,
    streetNumber: String,
    subdivisionName: { type: String, index: true },
    apn: String,
    parcelNumber: String,
    latitude: Number,
    longitude: Number,
    coordinates: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        index: "2dsphere", // Geospatial index for radius queries
      },
    },
    city: { type: String, index: true },
    stateOrProvince: String,
    postalCode: String,
    countyOrParish: String,
    country: String,

    // Timestamps
    modificationTimestamp: { type: Date, index: true },
    listingContractDate: Date,
    statusChangeTimestamp: Date,
    onMarketDate: Date,
    originalOnMarketTimestamp: Date,
    daysOnMarket: Number,

    // Media & Remarks
    publicRemarks: String,
    supplement: String,
    media: [MediaSchema],
    Videos: [VideoSchema],
    Documents: [DocumentSchema],
    OpenHouses: [OpenHouseSchema],
    VirtualTours: [VirtualTourSchema],

    // Features
    poolYn: Boolean,
    pool: Boolean,
    spa: Boolean,
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
    rvAccess: Boolean,

    // Land & HOA
    landType: String,
    landLeaseAmount: Number,
    landLeasePer: String,
    landLeaseExpirationDate: String,
    landLeaseYearsRemaining: Number,
    associationFee: Number,
    associationFeeFrequency: String,
    associationYn: Boolean,
    communityFeatures: String,
    lotFeatures: String,

    // Classification
    propertyType: { type: String, index: true },
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
    terms: [String],

    // Schools
    schoolDistrict: String,
    elementarySchool: String,
    middleSchool: String,
    highSchool: String,

    // Meta & IDX
    specialListingConditions: String,
    displayCompliance: {
      View: String,
      IDXLogo: { Type: String, LogoUri: String },
      IDXLogoSmall: { Type: String, LogoUri: String },
    },
    resourceUri: String,
    id: String,
    walkScore: Number,
  },
  {
    timestamps: true,
    collection: "unified_listings",
  }
);

// -----------------------------
// Indexes
// -----------------------------

// Compound indexes for common queries
UnifiedListingSchema.index({ mlsSource: 1, mlsId: 1 });
UnifiedListingSchema.index({ city: 1, standardStatus: 1 });
UnifiedListingSchema.index({ subdivisionName: 1, standardStatus: 1 });
UnifiedListingSchema.index({ propertyType: 1, standardStatus: 1 });
// Optimized index for city stats queries (city + propertyType + listPrice)
UnifiedListingSchema.index({ city: 1, propertyType: 1, listPrice: 1 });

// -----------------------------
// Model Export
// -----------------------------

const UnifiedListing: Model<IUnifiedListing> =
  mongoose.models.UnifiedListing || mongoose.model<IUnifiedListing>("UnifiedListing", UnifiedListingSchema);

export default UnifiedListing;
