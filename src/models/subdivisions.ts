// src/models/subdivisions.ts
// Subdivision/Neighborhood Model - Aggregated from MLS Listings

import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISubdivision extends Document {
  // Core Identity
  name: string; // From MLS subdivisionName
  slug: string; // URL-friendly version
  normalizedName: string; // Lowercase for matching

  // Location
  city: string;
  county: string; // Derived from city
  region: string; // e.g., "Coachella Valley", "San Diego County", "Orange County"

  // Geographic center (average of all listings)
  coordinates?: {
    latitude: number;
    longitude: number;
  };

  // Statistics from active listings
  listingCount: number;
  priceRange: {
    min: number;
    max: number;
  };
  avgPrice: number;
  medianPrice?: number;

  // Property type distribution
  propertyTypes?: {
    residential?: number; // Type A count
    lease?: number; // Type B count
    multiFamily?: number; // Type C count
  };

  // Enriched content
  description?: string; // AI-generated or from JSON
  photo?: string; // Primary photo URL (from a listing or manual)
  features?: string[]; // Key features/amenities
  keywords?: string[]; // SEO keywords

  // Community details
  communityFeatures?: string; // Aggregated from listings
  seniorCommunity?: boolean; // If majority are senior communities

  // Data sources
  mlsSources: string[]; // ["GPS", "CRMLS", "manual"]
  hasManualData: boolean; // If enriched from JSON files

  // Metadata
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubdivisionSchema = new Schema<ISubdivision>(
  {
    // Core Identity
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    normalizedName: { type: String, required: true, index: true },

    // Location
    city: { type: String, required: true, index: true },
    county: { type: String, required: true, index: true },
    region: { type: String, required: true, index: true },

    coordinates: {
      latitude: Number,
      longitude: Number,
    },

    // Statistics
    listingCount: { type: Number, required: true, default: 0 },
    priceRange: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
    },
    avgPrice: { type: Number, required: true },
    medianPrice: Number,

    // Property types
    propertyTypes: {
      residential: Number,
      lease: Number,
      multiFamily: Number,
    },

    // Enriched content
    description: String,
    photo: String,
    features: [String],
    keywords: [String],

    // Community details
    communityFeatures: String,
    seniorCommunity: Boolean,

    // Data sources
    mlsSources: { type: [String], required: true, default: [] },
    hasManualData: { type: Boolean, default: false },

    // Metadata
    lastUpdated: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: "subdivisions"
  }
);

// Indexes for performance
SubdivisionSchema.index({ region: 1, city: 1 });
SubdivisionSchema.index({ county: 1, city: 1 });
SubdivisionSchema.index({ slug: 1 }, { unique: true });
SubdivisionSchema.index({ normalizedName: 1, city: 1 }, { unique: true });
SubdivisionSchema.index({ listingCount: -1 }); // For sorting by popularity
SubdivisionSchema.index({ avgPrice: 1 }); // For price-based queries

// Text search on name and description
SubdivisionSchema.index({ name: "text", description: "text", keywords: "text" });

// Export model
const Subdivision: Model<ISubdivision> =
  mongoose.models.Subdivision ||
  mongoose.model<ISubdivision>("Subdivision", SubdivisionSchema);

export default Subdivision;
