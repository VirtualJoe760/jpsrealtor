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
  cumulativeDaysOnMarket?: number;
  listingUpdateTimestamp?: Date;
  priceChangeTimestamp?: Date;
  photosChangeTimestamp?: Date;
  majorChangeTimestamp?: Date;
  extensionTimestamp?: Date;

  // Listing changes tracking
  majorChangeType?: string;
  listingTerms?: string;

  // Media & Remarks
  publicRemarks?: string;
  supplement?: string;
  media?: IMedia[]; // From _expand=Media
  Videos?: IVideo[];
  Documents?: IDocument[];
  OpenHouses?: IOpenHouse[];
  VirtualTours?: IVirtualTour[];

  // Features
  //
  // CANONICAL FIELD CASING — match RESO standard ("PoolYN") with first letter
  // lowercased for JS convention ("poolYN"). The DB sync writes these names.
  // Each Yn / YN field is aliased (see schema below) so older callsites that
  // read `doc.poolYn` keep working on hydrated docs; `.lean({ virtuals: true })`
  // also surfaces the alias. Raw `.lean()` callsites should use the YN form.
  poolYN?: boolean;
  poolYn?: boolean; // alias of poolYN — back-compat with pre-2026-06 callsites
  pool?: boolean;
  spa?: boolean;
  spaYN?: boolean;
  spaYn?: boolean; // alias
  viewYN?: boolean;
  viewYn?: boolean; // alias
  view?: string;
  furnished?: string;
  roof?: string;
  cooling?: string;
  coolingYN?: boolean;
  coolingYn?: boolean; // alias
  heating?: string;
  heatingYN?: boolean;
  heatingYn?: boolean; // alias
  garageSpaces?: number;
  carportSpaces?: number;
  parkingTotal?: number;
  parkingFeatures?: string;
  stories?: number;
  levels?: string;
  seniorCommunityYN?: boolean;
  seniorCommunityYn?: boolean; // alias
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
  associationYN?: boolean;
  associationYn?: boolean; // alias
  communityFeatures?: string;
  lotFeatures?: string;

  // Classification
  propertyType?: string;
  propertySubType?: string;
  propertyClass?: string;
  propertyTypeLabel?: string;
  mlsareaMajor?: string;
  mlsareaMinor?: string;

  // Pre-computed listing-level CMA, written by build-listing-cma.py on a
  // twice-weekly cron (Mon + Thu 1 AM). When present, the listing detail
  // page uses it directly (sub-50ms) instead of calling the on-demand
  // /api/cma/generate endpoint (1–20s). Schema documented in
  // docs/cma/LISTING_CMA_BACKEND_BUILDER.md.
  cmaStats?: any;
  cashflowStats?: any;

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
    onMarketDate: { type: Date, index: true }, // For filtering new listings
    originalOnMarketTimestamp: Date,
    daysOnMarket: Number, // MLS-provided DOM (snapshot at last sync)
    cumulativeDaysOnMarket: Number, // Total days across all list periods
    listingUpdateTimestamp: Date,
    priceChangeTimestamp: { type: Date, index: true }, // For price change tracking
    photosChangeTimestamp: Date,
    majorChangeTimestamp: Date,
    extensionTimestamp: Date,

    // Listing changes tracking
    majorChangeType: String, // e.g., "Price Reduced", "Back on Market"
    listingTerms: String, // e.g., "Cash, 1031 Exchange"

    // Media & Remarks
    publicRemarks: String,
    supplement: String,
    media: [MediaSchema],
    Videos: [VideoSchema],
    Documents: [DocumentSchema],
    OpenHouses: [OpenHouseSchema],
    VirtualTours: [VirtualTourSchema],

    // Features — CANONICAL casing matches what the Python sync actually
    // writes (RESO style "PoolYN" with first letter lowercased: "poolYN").
    // Older callsites that read doc.poolYn are kept working via Mongoose
    // aliases. On `.lean()` reads use the YN form; on hydrated docs or
    // `.lean({ virtuals: true })` either form works.
    poolYN: { type: Boolean, alias: "poolYn" },
    pool: Boolean,
    spa: Boolean,
    spaYN: { type: Boolean, alias: "spaYn" },
    viewYN: { type: Boolean, alias: "viewYn" },
    view: String,
    furnished: String,
    roof: String,
    cooling: String,
    coolingYN: { type: Boolean, alias: "coolingYn" },
    heating: String,
    heatingYN: { type: Boolean, alias: "heatingYn" },
    garageSpaces: Number,
    carportSpaces: Number,
    parkingTotal: Number,
    parkingFeatures: String,
    stories: Number,
    levels: String,
    seniorCommunityYN: { type: Boolean, alias: "seniorCommunityYn" },
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
    associationYN: { type: Boolean, alias: "associationYn" },
    communityFeatures: String,
    lotFeatures: String,

    // Classification
    propertyType: { type: String, index: true },
    propertySubType: String,
    propertyClass: String,
    propertyTypeLabel: String,
    mlsareaMajor: String,
    mlsareaMinor: String,

    // Pre-computed listing CMA — see interface comment above.
    // Mixed type because PyMongo writes the full nested object directly
    // (subject, activeComps[], closedComps[], stats, narrative,
    // limitations, inferences, quality, ...). Without this field
    // declared, Mongoose's strict mode silently drops it on every read.
    cmaStats: { type: Schema.Types.Mixed },

    // Rental investment cash-flow stats (pre-computed by the VPS cron: rent
    // estimate + financing/expense math for 20%/25%-down scenarios + fixedCosts
    // for query-time re-derivation). Mixed so strict mode doesn't drop it.
    cashflowStats: { type: Schema.Types.Mixed },

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

// Ensure toJSON and toObject work correctly
UnifiedListingSchema.set('toJSON', { virtuals: true });
UnifiedListingSchema.set('toObject', { virtuals: true });

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

// Performance indexes for bed/bath filtering (CRITICAL for search performance)
// These support queries like "4 beds in Indian Wells" which filter by city + status + beds
UnifiedListingSchema.index({ city: 1, standardStatus: 1, propertyType: 1, bedsTotal: 1 });
UnifiedListingSchema.index({ city: 1, standardStatus: 1, propertyType: 1, bedroomsTotal: 1 });
UnifiedListingSchema.index({ city: 1, standardStatus: 1, propertyType: 1, bathsTotal: 1 });
UnifiedListingSchema.index({ city: 1, standardStatus: 1, propertyType: 1, bathroomsTotalInteger: 1 });

// Similar indexes for subdivision queries
UnifiedListingSchema.index({ subdivisionName: 1, standardStatus: 1, propertyType: 1, bedsTotal: 1 });
UnifiedListingSchema.index({ subdivisionName: 1, standardStatus: 1, propertyType: 1, bedroomsTotal: 1 });
UnifiedListingSchema.index({ subdivisionName: 1, standardStatus: 1, propertyType: 1, bathsTotal: 1 });
UnifiedListingSchema.index({ subdivisionName: 1, standardStatus: 1, propertyType: 1, bathroomsTotalInteger: 1 });

// Cash-flow scan: filter by area + sort by monthly cash flow (20% down).
UnifiedListingSchema.index({ city: 1, "cashflowStats.scenarios.down20.monthlyCashflow": -1 }, { name: "city_cashflow20" });
UnifiedListingSchema.index({ postalCode: 1, "cashflowStats.scenarios.down20.monthlyCashflow": -1 }, { name: "zip_cashflow20" });

// -----------------------------
// Model Export
// -----------------------------

const UnifiedListing: Model<IUnifiedListing> =
  mongoose.models.UnifiedListing || mongoose.model<IUnifiedListing>("UnifiedListing", UnifiedListingSchema);

export default UnifiedListing;
