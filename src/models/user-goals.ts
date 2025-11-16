// src/models/user-goals.ts
// MongoDB schema for tracking user real estate goals extracted from chat

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserGoals extends Document {
  userId: string; // User ID or anonymousId
  goals: {
    // Price preferences
    minBudget?: number;
    maxBudget?: number;

    // Property specs
    minBeds?: number;
    maxBeds?: number;
    minBaths?: number;
    maxBaths?: number;
    minSqft?: number;
    maxSqft?: number;

    // Location preferences
    preferredCities?: string[]; // e.g., ["Palm Springs", "Palm Desert"]
    preferredSubdivisions?: string[]; // e.g., ["Indian Wells CC"]
    avoidCities?: string[]; // Cities to exclude

    // Property features (must-haves)
    mustHave?: string[]; // e.g., ["pool", "mountain view", "golf course", "gated"]
    niceToHave?: string[]; // e.g., ["upgraded kitchen", "solar panels"]
    dealBreakers?: string[]; // e.g., ["HOA", "manufactured home"]

    // Property types
    propertyTypes?: string[]; // e.g., ["Single Family Residential", "Condo"]

    // Timeline
    timeline?: string; // e.g., "3-6 months", "just browsing", "ready now"

    // Lifestyle
    lifestylePreferences?: string[]; // e.g., ["quiet neighborhood", "walkable", "resort style"]

    // Other extracted info
    familySize?: number;
    pets?: boolean;
    workFromHome?: boolean;

    // Confidence scores (0-1) for each extracted goal
    confidence?: {
      budget?: number;
      beds?: number;
      location?: number;
      features?: number;
    };
  };

  // Metadata
  lastUpdatedFrom: "homepage" | "listing" | "dashboard" | "general";
  extractionCount: number; // How many times goals have been updated
  lastConversationSnippet?: string; // Last user message that updated goals

  createdAt: Date;
  updatedAt: Date;
}

const UserGoalsSchema = new Schema<IUserGoals>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    goals: {
      // Price
      minBudget: Number,
      maxBudget: Number,

      // Property specs
      minBeds: Number,
      maxBeds: Number,
      minBaths: Number,
      maxBaths: Number,
      minSqft: Number,
      maxSqft: Number,

      // Location
      preferredCities: [String],
      preferredSubdivisions: [String],
      avoidCities: [String],

      // Features
      mustHave: [String],
      niceToHave: [String],
      dealBreakers: [String],

      // Property types
      propertyTypes: [String],

      // Timeline
      timeline: String,

      // Lifestyle
      lifestylePreferences: [String],

      // Other
      familySize: Number,
      pets: Boolean,
      workFromHome: Boolean,

      // Confidence
      confidence: {
        budget: { type: Number, min: 0, max: 1 },
        beds: { type: Number, min: 0, max: 1 },
        location: { type: Number, min: 0, max: 1 },
        features: { type: Number, min: 0, max: 1 },
      },
    },
    lastUpdatedFrom: {
      type: String,
      enum: ["homepage", "listing", "dashboard", "general"],
      default: "general",
    },
    extractionCount: {
      type: Number,
      default: 0,
    },
    lastConversationSnippet: String,
  },
  {
    timestamps: true,
    collection: "user_goals",
  }
);

// Index for analytics
UserGoalsSchema.index({ "goals.preferredCities": 1 });
UserGoalsSchema.index({ "goals.maxBudget": 1 });
UserGoalsSchema.index({ updatedAt: -1 });

const UserGoals: Model<IUserGoals> =
  mongoose.models.UserGoals || mongoose.model<IUserGoals>("UserGoals", UserGoalsSchema);

export default UserGoals;
