// src/models/regions.ts
// Region Model - Aggregated from Counties and MLS Listings

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRegion extends Document {
  // Core Identity
  name: string; // Region name (e.g., "Southern California", "Northern California")
  slug: string; // URL-friendly version (e.g., "southern-california")
  normalizedName: string; // Lowercase for matching

  // Geographic center (average of all counties in region)
  coordinates: {
    latitude: number;
    longitude: number;
  };

  // GeoJSON boundary polygon for the region
  polygon?: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };

  // Statistics from active listings
  listingCount: number;
  countyCount: number; // Number of counties in this region
  cityCount: number; // Total cities across all counties
  priceRange: {
    min: number;
    max: number;
  };
  avgPrice: number;
  medianPrice?: number;

  // Property type distribution
  propertyTypes?: {
    residential?: number;
    lease?: number;
    multiFamily?: number;
  };

  // Pre-computed top counties for fast map rendering
  topCounties?: Array<{
    name: string;
    slug: string;
    listingCount: number;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    avgPrice: number;
  }>;

  // Data sources
  mlsSources: string[]; // ["GPS", "CRMLS", ...]

  // Enriched content
  description?: string;
  photo?: string; // Primary photo URL
  features?: string[]; // Key features/amenities
  keywords?: string[]; // SEO keywords

  // Metadata
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RegionSchema = new Schema<IRegion>(
  {
    // Core Identity
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    normalizedName: { type: String, required: true },

    // Location
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },

    // GeoJSON polygon
    polygon: {
      type: {
        type: String,
        enum: ["Polygon", "MultiPolygon"],
      },
      coordinates: Schema.Types.Mixed,
    },

    // Statistics
    listingCount: { type: Number, required: true, default: 0 },
    countyCount: { type: Number, required: true, default: 0 },
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

    // Pre-computed top counties
    topCounties: [{
      name: String,
      slug: String,
      listingCount: Number,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
      avgPrice: Number,
    }],

    // Data sources
    mlsSources: { type: [String], default: [] },

    // Enriched content
    description: String,
    photo: String,
    features: [String],
    keywords: [String],

    // Metadata
    lastUpdated: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: "regions",
  }
);

// Indexes
RegionSchema.index({ slug: 1 });
RegionSchema.index({ normalizedName: 1 });
RegionSchema.index({ listingCount: -1 }); // For sorting by listing count
RegionSchema.index({ 'coordinates.latitude': 1, 'coordinates.longitude': 1 }); // For geospatial queries
RegionSchema.index({ polygon: "2dsphere" }); // For polygon queries

export const Region: Model<IRegion> =
  mongoose.models.Region || mongoose.model<IRegion>("Region", RegionSchema);
