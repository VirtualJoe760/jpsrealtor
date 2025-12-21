// src/models/StreetBoundary.ts
// Street boundary reference data for geographic filtering

import mongoose, { Schema, Model, Document } from "mongoose";

export interface IStreetBoundary extends Document {
  cityId: string;
  streetName: string;
  normalizedName: string;
  direction: 'north-south' | 'east-west';
  coordinates: {
    latitude?: number;   // For east-west streets (horizontal)
    longitude?: number;  // For north-south streets (vertical)
  };
  bounds?: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const StreetBoundarySchema = new Schema<IStreetBoundary>(
  {
    cityId: {
      type: String,
      required: true,
      index: true,
      description: "City identifier (e.g., 'la-quinta', 'palm-desert')"
    },
    streetName: {
      type: String,
      required: true,
      description: "Full street name (e.g., 'Washington Street')"
    },
    normalizedName: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
      description: "Normalized name for matching (e.g., 'washington')"
    },
    direction: {
      type: String,
      required: true,
      enum: ['north-south', 'east-west'],
      description: "Street orientation"
    },
    coordinates: {
      latitude: {
        type: Number,
        description: "Latitude for east-west streets"
      },
      longitude: {
        type: Number,
        description: "Longitude for north-south streets"
      }
    },
    bounds: {
      minLat: Number,
      maxLat: Number,
      minLng: Number,
      maxLng: Number
    }
  },
  {
    timestamps: true,
    collection: "street_boundaries"
  }
);

// Compound index for fast lookups
StreetBoundarySchema.index({ cityId: 1, normalizedName: 1 });

const StreetBoundary: Model<IStreetBoundary> =
  mongoose.models.StreetBoundary ||
  mongoose.model<IStreetBoundary>("StreetBoundary", StreetBoundarySchema);

export default StreetBoundary;
