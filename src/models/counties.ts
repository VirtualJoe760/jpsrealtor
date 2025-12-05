// src/models/counties.ts
// County Model - Aggregated from Cities and MLS Listings

import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICounty extends Document {
  // Core Identity
  name: string; // County name (e.g., "Los Angeles", "Riverside")
  slug: string; // URL-friendly version (e.g., "los-angeles")
  normalizedName: string; // Lowercase for matching

  // Location
  region: string; // e.g., "Southern California", "Coachella Valley"

  // Geographic center (average of all cities in county)
  coordinates?: {
    latitude: number;
    longitude: number;
  };

  // Statistics from active listings
  listingCount: number;
  cityCount: number; // Number of cities in this county
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

  // Data sources
  mlsSources: string[]; // [\"GPS\", \"CRMLS\", ...]

  // Coordinate validation
  isOcean?: boolean; // Flag for counties with coordinates in ocean (to filter from map)

  // Pre-computed top cities for fast map rendering (no calculations needed)
  topCities?: Array<{
    name: string;
    listingCount: number;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    avgPrice: number;
  }>;

  // Metadata
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CountySchema = new Schema<ICounty>(
  {
    // Core Identity
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    normalizedName: { type: String, required: true },

    // Location
    region: { type: String, required: true },

    coordinates: {
      latitude: Number,
      longitude: Number,
    },

    // Statistics
    listingCount: { type: Number, required: true, default: 0 },
    cityCount: { type: Number, required: true, default: 0 },
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

    // Data sources
    mlsSources: { type: [String], default: [] },

    // Coordinate validation
    isOcean: { type: Boolean, default: false },

    // Pre-computed top cities
    topCities: [{
      name: String,
      listingCount: Number,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
      avgPrice: Number,
    }],

    // Metadata
    lastUpdated: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: "counties",
  }
);

// Indexes
CountySchema.index({ slug: 1 });
CountySchema.index({ region: 1 });
CountySchema.index({ normalizedName: 1 });
CountySchema.index({ isOcean: 1, listingCount: -1 }); // For filtering ocean counties and sorting by count
CountySchema.index({ 'coordinates.latitude': 1, 'coordinates.longitude': 1 }); // For geospatial queries

export const County: Model<ICounty> =
  mongoose.models.County || mongoose.model<ICounty>("County", CountySchema);
