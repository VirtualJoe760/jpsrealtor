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

  // === COMMUNITY FACTS (Deep Data for AI) ===
  communityFacts?: {
    // Alternate names for matching
    alternateNames?: string[];
    communityType?: 'equity-club' | 'non-equity-club' | 'golf-community' | 'gated-non-golf' | '55plus' | 'luxury-gated' | 'non-gated';

    // Financials
    hoaMonthlyMin?: number;
    hoaMonthlyMax?: number;
    hoaIncludes?: string;
    initiationFee?: number;
    monthlyDues?: number;
    transferFee?: number;
    melloRoos?: boolean;
    melloRoosAmount?: number;
    lidAssessment?: boolean;
    lidAmount?: number;
    foodMinimum?: number;

    // Membership & Restrictions
    waitingList?: 'none' | 'short' | 'medium' | 'long' | 'unknown';
    waitingListNotes?: string;
    allowsSecondaryMembers?: boolean;
    shortTermRentalsAllowed?: 'yes-unrestricted' | 'yes-limited' | 'no-hoa' | 'no-city' | 'unknown';
    shortTermRentalDetails?: string;
    minimumLeaseLength?: string;

    // Amenities
    golfCourses?: number;
    golfCoursesNames?: string;
    pickleballCourts?: number;
    pickleballReservationSystem?: string;
    tennisCourts?: number;
    pools?: number;
    restaurantNames?: string;

    // Environment
    viewsAvailable?: string[];
    bestViewCorridors?: string;
    airportNoise?: 'none' | 'minimal' | 'moderate' | 'significant';
    airportNoiseDetails?: string;
    prevailingWindDirection?: string;
    floodZone?: boolean;
    floodHistory?: string;
    golfCartAccessToRetail?: boolean;
    golfCartPathDetails?: string;

    // Security
    securityType?: '24hr-guard' | 'daytime-guard' | 'roving-patrol' | 'unmanned' | 'none';

    // Demographics & Social
    averageMemberAge?: number;
    socialCalendar?: 'very-active' | 'active' | 'moderate' | 'quiet';
    socialCalendarNotes?: string;
    golfProgramQuality?: 'excellent' | 'good' | 'average' | 'limited';

    // Market Data
    resaleVelocity?: 'very-fast' | 'fast' | 'moderate' | 'slow';
    avgDaysOnMarket?: number;
    avgPricePerSqFt?: number;
    appreciationNotes?: string;
    hiddenGem?: boolean;
    overrated?: boolean;

    // Property Characteristics
    yearBuiltRange?: string;
    avgRoofAge?: number;
    avgHVACAge?: number;
    casitaCommon?: boolean;

    // General
    pros?: string;
    cons?: string;
    bestFor?: string;

    // Data quality
    dataSource?: string;
    lastVerified?: Date;
    needsUpdate?: boolean;
  };

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
    slug: { type: String, required: true },
    normalizedName: { type: String, required: true },

    // Location
    city: { type: String, required: true },
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

    // Community details
    communityFeatures: String,
    seniorCommunity: Boolean,

    // === COMMUNITY FACTS ===
    communityFacts: {
      alternateNames: [String],
      communityType: { type: String, enum: ['equity-club', 'non-equity-club', 'golf-community', 'gated-non-golf', '55plus', 'luxury-gated', 'non-gated'] },

      // Financials
      hoaMonthlyMin: Number,
      hoaMonthlyMax: Number,
      hoaIncludes: String,
      initiationFee: Number,
      monthlyDues: Number,
      transferFee: Number,
      melloRoos: Boolean,
      melloRoosAmount: Number,
      lidAssessment: Boolean,
      lidAmount: Number,
      foodMinimum: Number,

      // Membership & Restrictions
      waitingList: { type: String, enum: ['none', 'short', 'medium', 'long', 'unknown'] },
      waitingListNotes: String,
      allowsSecondaryMembers: Boolean,
      shortTermRentalsAllowed: { type: String, enum: ['yes-unrestricted', 'yes-limited', 'no-hoa', 'no-city', 'unknown'] },
      shortTermRentalDetails: String,
      minimumLeaseLength: String,

      // Amenities
      golfCourses: Number,
      golfCoursesNames: String,
      pickleballCourts: Number,
      pickleballReservationSystem: String,
      tennisCourts: Number,
      pools: Number,
      restaurantNames: String,

      // Environment
      viewsAvailable: [String],
      bestViewCorridors: String,
      airportNoise: { type: String, enum: ['none', 'minimal', 'moderate', 'significant'] },
      airportNoiseDetails: String,
      prevailingWindDirection: String,
      floodZone: Boolean,
      floodHistory: String,
      golfCartAccessToRetail: Boolean,
      golfCartPathDetails: String,

      // Security
      securityType: { type: String, enum: ['24hr-guard', 'daytime-guard', 'roving-patrol', 'unmanned', 'none'] },

      // Demographics & Social
      averageMemberAge: Number,
      socialCalendar: { type: String, enum: ['very-active', 'active', 'moderate', 'quiet'] },
      socialCalendarNotes: String,
      golfProgramQuality: { type: String, enum: ['excellent', 'good', 'average', 'limited'] },

      // Market Data
      resaleVelocity: { type: String, enum: ['very-fast', 'fast', 'moderate', 'slow'] },
      avgDaysOnMarket: Number,
      avgPricePerSqFt: Number,
      appreciationNotes: String,
      hiddenGem: Boolean,
      overrated: Boolean,

      // Property Characteristics
      yearBuiltRange: String,
      avgRoofAge: Number,
      avgHVACAge: Number,
      casitaCommon: Boolean,

      // General
      pros: String,
      cons: String,
      bestFor: String,

      // Data quality
      dataSource: String,
      lastVerified: Date,
      needsUpdate: Boolean,
    },

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
