// src/models/user-activity.ts
// Comprehensive user activity tracking for analytics and AI

import mongoose, { Schema, Document, Model } from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH ACTIVITY
// ─────────────────────────────────────────────────────────────────────────────

export interface ISearchActivity extends Document {
  userId?: mongoose.Types.ObjectId;
  anonymousId?: string;
  sessionId: string;

  // Search query details
  queryText?: string; // Natural language search if implemented
  filters: {
    priceMin?: number;
    priceMax?: number;
    bedsMin?: number;
    bedsMax?: number;
    bathsMin?: number;
    bathsMax?: number;
    sqftMin?: number;
    sqftMax?: number;
    propertyType?: string[];
    propertySubType?: string[];
    cities?: string[];
    subdivisions?: string[];
    features?: string[]; // pool, spa, garage, etc.
    bounds?: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  };

  // Results & engagement
  resultsCount: number;
  resultsViewed: number; // How many listings did they click
  timeSpent: number; // Milliseconds on results page

  // Search outcome
  outcome?: "viewed_listings" | "refined_search" | "abandoned" | "favorited";
  listingsInteracted: string[]; // listingKeys they clicked

  // Metadata
  timestamp: Date;
  deviceType?: "mobile" | "tablet" | "desktop";
  source?: "map" | "list" | "homepage" | "direct";
}

const SearchActivitySchema = new Schema<ISearchActivity>({
  userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  anonymousId: { type: String, index: true },
  sessionId: { type: String, required: true, index: true },

  queryText: String,
  filters: {
    priceMin: Number,
    priceMax: Number,
    bedsMin: Number,
    bedsMax: Number,
    bathsMin: Number,
    bathsMax: Number,
    sqftMin: Number,
    sqftMax: Number,
    propertyType: [String],
    propertySubType: [String],
    cities: [String],
    subdivisions: [String],
    features: [String],
    bounds: {
      north: Number,
      south: Number,
      east: Number,
      west: Number,
    },
  },

  resultsCount: { type: Number, default: 0 },
  resultsViewed: { type: Number, default: 0 },
  timeSpent: { type: Number, default: 0 },

  outcome: {
    type: String,
    enum: ["viewed_listings", "refined_search", "abandoned", "favorited"],
  },
  listingsInteracted: [String],

  timestamp: { type: Date, default: Date.now, index: true },
  deviceType: { type: String, enum: ["mobile", "tablet", "desktop"] },
  source: { type: String, enum: ["map", "list", "homepage", "direct"] },
});

// Indexes for analytics queries
SearchActivitySchema.index({ timestamp: -1 });
SearchActivitySchema.index({ userId: 1, timestamp: -1 });
SearchActivitySchema.index({ anonymousId: 1, timestamp: -1 });

export const SearchActivity: Model<ISearchActivity> =
  mongoose.models.SearchActivity ||
  mongoose.model<ISearchActivity>("SearchActivity", SearchActivitySchema);

// ─────────────────────────────────────────────────────────────────────────────
// LISTING VIEW ACTIVITY
// ─────────────────────────────────────────────────────────────────────────────

export interface IListingView extends Document {
  userId?: mongoose.Types.ObjectId;
  anonymousId?: string;
  sessionId: string;

  listingKey: string;
  listingData: {
    price?: number;
    beds?: number;
    baths?: number;
    sqft?: number;
    city?: string;
    subdivision?: string;
    propertyType?: string;
    propertySubType?: string;
    address?: string;
  };

  // Engagement metrics
  timeSpent: number; // Milliseconds on listing page
  photosViewed: number;
  scrollDepth: number; // Percentage of page scrolled

  // Actions taken
  contactedAgent?: boolean;
  sharedListing?: boolean;
  savedToFavorites?: boolean;
  scheduledTour?: boolean;

  // Context
  viewSource: "search" | "map" | "swipe" | "direct" | "favorite";
  previousListingKey?: string; // If they came from another listing

  // Metadata
  timestamp: Date;
  deviceType?: "mobile" | "tablet" | "desktop";
}

const ListingViewSchema = new Schema<IListingView>({
  userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  anonymousId: { type: String, index: true },
  sessionId: { type: String, required: true, index: true },

  listingKey: { type: String, required: true, index: true },
  listingData: {
    price: Number,
    beds: Number,
    baths: Number,
    sqft: Number,
    city: String,
    subdivision: String,
    propertyType: String,
    propertySubType: String,
    address: String,
  },

  timeSpent: { type: Number, default: 0 },
  photosViewed: { type: Number, default: 0 },
  scrollDepth: { type: Number, default: 0 },

  contactedAgent: Boolean,
  sharedListing: Boolean,
  savedToFavorites: Boolean,
  scheduledTour: Boolean,

  viewSource: {
    type: String,
    required: true,
    enum: ["search", "map", "swipe", "direct", "favorite"],
  },
  previousListingKey: String,

  timestamp: { type: Date, default: Date.now, index: true },
  deviceType: { type: String, enum: ["mobile", "tablet", "desktop"] },
});

// Indexes for analytics
ListingViewSchema.index({ listingKey: 1, timestamp: -1 });
ListingViewSchema.index({ userId: 1, timestamp: -1 });
ListingViewSchema.index({ timestamp: -1 });

export const ListingView: Model<IListingView> =
  mongoose.models.ListingView ||
  mongoose.model<IListingView>("ListingView", ListingViewSchema);

// ─────────────────────────────────────────────────────────────────────────────
// USER SESSION ACTIVITY
// ─────────────────────────────────────────────────────────────────────────────

export interface IUserSession extends Document {
  userId?: mongoose.Types.ObjectId;
  anonymousId?: string;
  sessionId: string;

  // Session details
  startTime: Date;
  endTime?: Date;
  duration?: number; // Milliseconds

  // Activity summary
  pagesViewed: number;
  listingsViewed: number;
  searchesPerformed: number;
  listingsSwiped: number;
  listingsLiked: number;
  listingsDisliked: number;

  // User journey
  entryPage: string;
  exitPage?: string;
  pagesVisited: Array<{
    url: string;
    timestamp: Date;
    timeSpent: number;
  }>;

  // Device & location
  deviceType: "mobile" | "tablet" | "desktop";
  browser?: string;
  os?: string;
  ipAddress?: string;
  city?: string;
  country?: string;

  // Conversion tracking
  converted?: boolean; // Did they take a high-value action (favorite, contact, etc.)
  conversionType?: "favorite" | "contact" | "schedule_tour" | "share";

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const UserSessionSchema = new Schema<IUserSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    anonymousId: { type: String, index: true },
    sessionId: { type: String, required: true, unique: true, index: true },

    startTime: { type: Date, required: true, index: true },
    endTime: Date,
    duration: Number,

    pagesViewed: { type: Number, default: 0 },
    listingsViewed: { type: Number, default: 0 },
    searchesPerformed: { type: Number, default: 0 },
    listingsSwiped: { type: Number, default: 0 },
    listingsLiked: { type: Number, default: 0 },
    listingsDisliked: { type: Number, default: 0 },

    entryPage: { type: String, required: true },
    exitPage: String,
    pagesVisited: [{
      url: String,
      timestamp: Date,
      timeSpent: Number,
    }],

    deviceType: {
      type: String,
      required: true,
      enum: ["mobile", "tablet", "desktop"],
    },
    browser: String,
    os: String,
    ipAddress: String,
    city: String,
    country: String,

    converted: Boolean,
    conversionType: {
      type: String,
      enum: ["favorite", "contact", "schedule_tour", "share"],
    },
  },
  { timestamps: true }
);

// Indexes for analytics
UserSessionSchema.index({ startTime: -1 });
UserSessionSchema.index({ userId: 1, startTime: -1 });
UserSessionSchema.index({ anonymousId: 1, startTime: -1 });
UserSessionSchema.index({ converted: 1, startTime: -1 });

export const UserSession: Model<IUserSession> =
  mongoose.models.UserSession ||
  mongoose.model<IUserSession>("UserSession", UserSessionSchema);

// ─────────────────────────────────────────────────────────────────────────────
// USER PREFERENCES (AI-Ready Profile)
// ─────────────────────────────────────────────────────────────────────────────

export interface IUserPreferences extends Document {
  userId?: mongoose.Types.ObjectId;
  anonymousId?: string;

  // Derived preferences (from behavioral data)
  priceRange: {
    min: number;
    max: number;
    confidence: number; // 0-1, how confident we are in this preference
  };

  propertyTypes: Array<{
    type: string;
    weight: number; // 0-1, how much they prefer this type
  }>;

  propertySubTypes: Array<{
    subType: string;
    weight: number;
  }>;

  locations: Array<{
    city?: string;
    subdivision?: string;
    weight: number;
    avgTimeSpent: number; // How much time they spend viewing properties here
  }>;

  features: Array<{
    feature: string; // pool, spa, garage, etc.
    weight: number;
  }>;

  bedroomRange: {
    min: number;
    max: number;
    preferred?: number;
  };

  bathroomRange: {
    min: number;
    max: number;
    preferred?: number;
  };

  sqftRange: {
    min: number;
    max: number;
    preferred?: number;
  };

  // Behavioral patterns
  browsingPattern: "researcher" | "impulse" | "focused" | "explorer";
  avgSessionDuration: number;
  avgListingsPerSession: number;
  conversionRate: number; // Percentage of sessions that result in favorites

  // Engagement level
  engagementScore: number; // 0-100, overall engagement metric
  lastActive: Date;
  totalSessions: number;
  totalListingsViewed: number;
  totalSearches: number;

  // AI-ready data
  embeddingVector?: number[]; // For similarity matching with Ollama later

  // Metadata
  lastUpdated: Date;
  createdAt: Date;
}

const UserPreferencesSchema = new Schema<IUserPreferences>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", unique: true, sparse: true },
    anonymousId: { type: String, unique: true, sparse: true },

    priceRange: {
      min: Number,
      max: Number,
      confidence: { type: Number, min: 0, max: 1 },
    },

    propertyTypes: [{
      type: { type: String },
      weight: { type: Number, min: 0, max: 1 },
    }],

    propertySubTypes: [{
      subType: String,
      weight: { type: Number, min: 0, max: 1 },
    }],

    locations: [{
      city: String,
      subdivision: String,
      weight: { type: Number, min: 0, max: 1 },
      avgTimeSpent: Number,
    }],

    features: [{
      feature: String,
      weight: { type: Number, min: 0, max: 1 },
    }],

    bedroomRange: {
      min: Number,
      max: Number,
      preferred: Number,
    },

    bathroomRange: {
      min: Number,
      max: Number,
      preferred: Number,
    },

    sqftRange: {
      min: Number,
      max: Number,
      preferred: Number,
    },

    browsingPattern: {
      type: String,
      enum: ["researcher", "impulse", "focused", "explorer"],
    },
    avgSessionDuration: Number,
    avgListingsPerSession: Number,
    conversionRate: Number,

    engagementScore: { type: Number, min: 0, max: 100 },
    lastActive: Date,
    totalSessions: Number,
    totalListingsViewed: Number,
    totalSearches: Number,

    embeddingVector: [Number],

    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes
UserPreferencesSchema.index({ userId: 1 });
UserPreferencesSchema.index({ anonymousId: 1 });
UserPreferencesSchema.index({ engagementScore: -1 });
UserPreferencesSchema.index({ lastActive: -1 });

export const UserPreferences: Model<IUserPreferences> =
  mongoose.models.UserPreferences ||
  mongoose.model<IUserPreferences>("UserPreferences", UserPreferencesSchema);
