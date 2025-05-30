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
  status?: string;
  listPrice?: number;
  bedroomsTotal?: number;
  bathroomsFull?: number;
  livingArea?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  publicRemarks?: string;
  modificationTimestamp?: Date;
  pool?: boolean;
  spa?: boolean;
  lotSizeSqft?: number;
  listingKey?: string;
  Documents?: IDocument[];
  OpenHouses?: IOpenHouse[];
  Videos?: IVideo[];
}

// -----------------------------
// Listing Schema
// -----------------------------

const ListingSchema = new Schema<IListing>({
  listingId: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  slugAddress: { type: String },
  status: { type: String },
  listPrice: { type: Number },
  bedroomsTotal: { type: Number },
  bathroomsFull: { type: Number },
  livingArea: { type: Number },
  address: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  modificationTimestamp: { type: Date },
  pool: { type: Boolean },
  spa: { type: Boolean },
  lotSizeSqft: { type: Number },
  publicRemarks: { type: String },
  listingKey: { type: String },
  Documents: [DocumentSchema],
  OpenHouses: [OpenHouseSchema],
  Videos: [VideoSchema],
});

// -----------------------------
// Model Export
// -----------------------------

export const Listing: Model<IListing> =
  mongoose.models.Listing || mongoose.model<IListing>("Listing", ListingSchema);

export default Listing;
