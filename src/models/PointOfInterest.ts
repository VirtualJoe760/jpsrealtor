// src/models/PointOfInterest.ts
// Cached Google Places POI data for map display

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPOI extends Document {
  placeId: string; // Google Place ID (unique)
  name: string;
  types: string[]; // Google place types (e.g., "golf_course", "school")
  category: string; // Our simplified category
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  rating?: number; // 1-5
  userRatingsTotal?: number;
  priceLevel?: number; // 0-4
  description?: string; // Editorial summary from Google
  phoneNumber?: string;
  website?: string;
  hours?: string[]; // Weekday text array
  photoUrl?: string; // Cached photo URL
  photoReference?: string; // Google photo reference for fetching
  photoAttribution?: string;
  isOpen?: boolean;
  businessStatus?: string; // OPERATIONAL, CLOSED_TEMPORARILY, CLOSED_PERMANENTLY
  fetchedAt: Date;
  region: string; // e.g., "coachella-valley"
}

const POISchema = new Schema<IPOI>(
  {
    placeId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    types: [String],
    category: { type: String, required: true, index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: String,
    city: String,
    rating: Number,
    userRatingsTotal: Number,
    priceLevel: Number,
    description: String,
    phoneNumber: String,
    website: String,
    hours: [String],
    photoUrl: String,
    photoReference: String,
    photoAttribution: String,
    isOpen: Boolean,
    businessStatus: String,
    fetchedAt: { type: Date, default: Date.now },
    region: { type: String, required: true, index: true },
  },
  {
    timestamps: true,
    collection: "points_of_interest",
  }
);

// Geospatial queries for map viewport
POISchema.index({ latitude: 1, longitude: 1 });
POISchema.index({ category: 1, region: 1 });

export default (mongoose.models.PointOfInterest ||
  mongoose.model<IPOI>("PointOfInterest", POISchema)) as Model<IPOI>;
