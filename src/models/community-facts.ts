// src/models/community-facts.ts
// Community-specific facts, amenities, and deep data for AI chat

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICommunityFact extends Document {
  // Core Identity
  communityName: string;
  alternateNames?: string[];
  city: string;
  type: string;

  // Financials
  financials?: {
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
  };

  // Membership
  membership?: {
    waitingList?: 'none' | 'short' | 'medium' | 'long' | 'unknown';
    waitingListNotes?: string;
    allowsSecondaryMembers?: boolean;
    resaleRestrictionsText?: string;
  };

  // Amenities
  amenities?: {
    golfCourses?: number;
    golfCoursesNames?: string;
    pickleballCourts?: number;
    pickleballReservationSystem?: string;
    tennisCourts?: number;
    pools?: number;
    fitnessCenter?: boolean;
    spa?: boolean;
    restaurant?: boolean;
    restaurantNames?: string;
    otherAmenities?: string;
  };

  // Environment
  environment?: {
    viewsAvailable?: string[];
    bestViewCorridors?: string;
    airportNoise?: 'none' | 'minimal' | 'moderate' | 'significant';
    airportNoiseDetails?: string;
    prevailingWindDirection?: string;
    floodZone?: boolean;
    floodHistory?: string;
    golfCartAccessToRetail?: boolean;
    golfCartPathDetails?: string;
  };

  // Security
  security?: {
    securityType?: '24hr-guard' | 'daytime-guard' | 'roving-patrol' | 'unmanned' | 'none';
    securityNotes?: string;
  };

  // Restrictions
  restrictions?: {
    shortTermRentalsAllowed: 'yes-unrestricted' | 'yes-limited' | 'no-hoa' | 'no-city' | 'unknown';
    shortTermRentalDetails?: string;
    minimumLeaseLength?: string;
    petRestrictions?: string;
    architecturalReview?: boolean;
  };

  // Demographics
  demographics?: {
    averageMemberAge?: number;
    socialCalendar?: 'very-active' | 'active' | 'moderate' | 'quiet';
    socialCalendarNotes?: string;
    golfProgramQuality?: 'excellent' | 'good' | 'average' | 'limited';
  };

  // Market Data
  marketData?: {
    resaleVelocity?: 'very-fast' | 'fast' | 'moderate' | 'slow';
    avgDaysOnMarket?: number;
    avgPricePerSqFt?: number;
    appreciationTrend36Months?: string;
    hiddenGem?: boolean;
    overrated?: boolean;
    marketNotes?: string;
  };

  // Property Details
  propertyDetails?: {
    yearBuilt?: string;
    avgRoofAge?: number;
    roofReplacementStatus?: string;
    avgHVACAge?: number;
    solarMandateCompliance?: 'grandfathered' | 'new-builds' | 'all' | 'unknown';
    casitaCommon?: boolean;
  };

  // General
  description?: string;
  prosCons?: {
    pros?: string;
    cons?: string;
  };
  bestFor?: string;

  // Metadata
  dataSource?: string;
  lastVerified?: Date;
  needsUpdate?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const CommunityFactSchema = new Schema<ICommunityFact>(
  {
    communityName: { type: String, required: true, unique: true, index: true },
    alternateNames: [String],
    city: {
      type: String,
      required: true,
      enum: ['Palm Springs', 'Cathedral City', 'Rancho Mirage', 'Palm Desert', 'Indian Wells', 'La Quinta', 'Indio', 'Coachella', 'Desert Hot Springs'],
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['equity-club', 'non-equity-club', 'golf-community', 'gated-non-golf', '55plus', 'luxury-gated', 'non-gated'],
      index: true,
    },

    financials: {
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
    },

    membership: {
      waitingList: { type: String, enum: ['none', 'short', 'medium', 'long', 'unknown'] },
      waitingListNotes: String,
      allowsSecondaryMembers: Boolean,
      resaleRestrictionsText: String,
    },

    amenities: {
      golfCourses: Number,
      golfCoursesNames: String,
      pickleballCourts: Number,
      pickleballReservationSystem: String,
      tennisCourts: Number,
      pools: Number,
      fitnessCenter: Boolean,
      spa: Boolean,
      restaurant: Boolean,
      restaurantNames: String,
      otherAmenities: String,
    },

    environment: {
      viewsAvailable: [String],
      bestViewCorridors: String,
      airportNoise: { type: String, enum: ['none', 'minimal', 'moderate', 'significant'] },
      airportNoiseDetails: String,
      prevailingWindDirection: String,
      floodZone: Boolean,
      floodHistory: String,
      golfCartAccessToRetail: Boolean,
      golfCartPathDetails: String,
    },

    security: {
      securityType: { type: String, enum: ['24hr-guard', 'daytime-guard', 'roving-patrol', 'unmanned', 'none'] },
      securityNotes: String,
    },

    restrictions: {
      shortTermRentalsAllowed: {
        type: String,
        required: true,
        enum: ['yes-unrestricted', 'yes-limited', 'no-hoa', 'no-city', 'unknown'],
        default: 'unknown',
      },
      shortTermRentalDetails: String,
      minimumLeaseLength: String,
      petRestrictions: String,
      architecturalReview: Boolean,
    },

    demographics: {
      averageMemberAge: Number,
      socialCalendar: { type: String, enum: ['very-active', 'active', 'moderate', 'quiet'] },
      socialCalendarNotes: String,
      golfProgramQuality: { type: String, enum: ['excellent', 'good', 'average', 'limited'] },
    },

    marketData: {
      resaleVelocity: { type: String, enum: ['very-fast', 'fast', 'moderate', 'slow'] },
      avgDaysOnMarket: Number,
      avgPricePerSqFt: Number,
      appreciationTrend36Months: String,
      hiddenGem: Boolean,
      overrated: Boolean,
      marketNotes: String,
    },

    propertyDetails: {
      yearBuilt: String,
      avgRoofAge: Number,
      roofReplacementStatus: String,
      avgHVACAge: Number,
      solarMandateCompliance: { type: String, enum: ['grandfathered', 'new-builds', 'all', 'unknown'] },
      casitaCommon: Boolean,
    },

    description: String,
    prosCons: {
      pros: String,
      cons: String,
    },
    bestFor: String,

    dataSource: String,
    lastVerified: Date,
    needsUpdate: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'community_facts',
  }
);

// Indexes for common queries
CommunityFactSchema.index({ city: 1, type: 1 });
CommunityFactSchema.index({ 'restrictions.shortTermRentalsAllowed': 1 });
CommunityFactSchema.index({ 'marketData.hiddenGem': 1 });
CommunityFactSchema.index({ alternateNames: 1 });

const CommunityFact: Model<ICommunityFact> =
  mongoose.models.CommunityFact || mongoose.model<ICommunityFact>('CommunityFact', CommunityFactSchema);

export default CommunityFact;
