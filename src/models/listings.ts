// src/models/listings.ts
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
  ResourceUri: string;
  Id: string;
  Date: string;
  StartTime: string;
  EndTime: string;
}

export interface IVideo {
  ResourceUri: string;
  Id: string;
  Name: string;
  Caption?: string;
  Type?: string;
  ObjectHtml?: string;
}

// -----------------------------
// Subdocument Schemas
// -----------------------------

const DocumentSchema = new Schema<IDocument>({
  ResourceUri: { type: String },
  Id: { type: String },
  Name: { type: String },
  Uri: { type: String },
});

const OpenHouseSchema = new Schema<IOpenHouse>({
  ResourceUri: { type: String },
  Id: { type: String },
  Date: { type: String },
  StartTime: { type: String },
  EndTime: { type: String },
});

const VideoSchema = new Schema<IVideo>({
  ResourceUri: { type: String },
  Id: { type: String },
  Name: { type: String },
  Caption: { type: String },
  Type: { type: String },
  ObjectHtml: { type: String },
});

// -----------------------------
// Listing Interface
// -----------------------------

export interface IListing extends Document {
  listingId: string;
  slug: string;
  slugAddress: string;

  // Core
  status?: string;
  listPrice?: number;
  bedroomsTotal?: number;
  bathroomsFull?: number;
  bathroomsHalf?: number;
  livingArea?: number;
  yearBuilt?: number;
  lotSizeSqft?: number;

  // Location
  address?: string;
  subdivisionName?: string;
  apn?: string;
  latitude?: number;
  longitude?: number;
  countyOrParish?: string;

  // Timestamps
  listingKey?: string;
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

  // Features
  pool?: boolean;
  spa?: boolean;
  view?: string;
  stories?: number;
  garageSpaces?: number;
  rvAccess?: boolean;
  furnished?: string;
  cooling?: string;
  heating?: string;
  flooring?: string;
  laundryFeatures?: string;

  // Land & HOA
  landType?: string;
  hoaFee?: number;
  hoaFeeFrequency?: string;
  gatedCommunity?: boolean;
  terms?: string[];

  // Schools
  schoolDistrict?: string;
  elementarySchool?: string;
  middleSchool?: string;
  highSchool?: string;

  // Property Classification
  propertyType?: string;
  propertySubType?: string;

  // Market Stats

}

// -----------------------------
// Listing Schema
// -----------------------------

const ListingSchema = new Schema<IListing>({
  listingId: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  slugAddress: { type: String },

  // Core
  status: { type: String },
  listPrice: { type: Number },
  bedroomsTotal: { type: Number },
  bathroomsFull: { type: Number },
  bathroomsHalf: { type: Number },
  livingArea: { type: Number },
  yearBuilt: { type: Number },
  lotSizeSqft: { type: Number },

  // Location
  address: { type: String },
  subdivisionName: { type: String },
  apn: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  countyOrParish: { type: String },

  // Timestamps
  listingKey: { type: String },
  modificationTimestamp: { type: Date },
  listingContractDate: { type: Date },
  statusChangeTimestamp: { type: Date },
  onMarketDate: { type: Date },
  originalOnMarketTimestamp: { type: Date },

  // Media & remarks
  publicRemarks: { type: String },
  supplement: { type: String },
  Videos: [VideoSchema],
  Documents: [DocumentSchema],
  OpenHouses: [OpenHouseSchema],

  // Features
  pool: { type: Boolean },
  spa: { type: Boolean },
  view: { type: String },
  stories: { type: Number },
  garageSpaces: { type: Number },
  rvAccess: { type: Boolean },
  furnished: { type: String },
  cooling: { type: String },
  heating: { type: String },
  flooring: { type: String },
  laundryFeatures: { type: String },

  // Land & HOA
  landType: { type: String },
  hoaFee: { type: Number },
  hoaFeeFrequency: { type: String },
  gatedCommunity: { type: Boolean },
  terms: [{ type: String }],

  // Schools
  schoolDistrict: { type: String },
  elementarySchool: { type: String },
  middleSchool: { type: String },
  highSchool: { type: String },

  // Property Classification
  propertyType: { type: String },
  propertySubType: { type: String },
});

// -----------------------------
// Model Export
// -----------------------------

export const Listing: Model<IListing> =
  mongoose.models.Listing || mongoose.model<IListing>("Listing", ListingSchema);

export default Listing;
