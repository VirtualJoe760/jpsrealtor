// src/models/cities.ts
// City Model - Aggregated from MLS Listings

import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICity extends Document {
  // Core Identity
  name: string; // City name
  slug: string; // URL-friendly version (e.g., "palm-springs")
  normalizedName: string; // Lowercase for matching

  // Location
  county: string; // e.g., "Riverside", "Los Angeles"
  region: string; // e.g., "Coachella Valley", "Orange County"

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
  description?: string;
  photo?: string; // Primary photo URL
  features?: string[]; // Key features/amenities
  keywords?: string[]; // SEO keywords

  // Subdivision count
  subdivisionCount?: number;

  // Data sources
  mlsSources: string[]; // ["GPS", "CRMLS"]

  // Metadata
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CitySchema = new Schema<ICity>(
  {
    // Core Identity
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    normalizedName: { type: String, required: true },

    // Location
    county: { type: String, required: true },
    region: { type: String, required: true },

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

    // Subdivision count
    subdivisionCount: Number,

    // Data sources
    mlsSources: { type: [String], default: [] },

    // Metadata
    lastUpdated: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: "cities",
  }
);

// Indexes
CitySchema.index({ slug: 1 });
CitySchema.index({ county: 1, region: 1 });
CitySchema.index({ normalizedName: 1 });

export const City: Model<ICity> =
  mongoose.models.City || mongoose.model<ICity>("City", CitySchema);
