// src/models/user.ts
// User model with role-based access control

import mongoose, { Schema, Document, Model } from "mongoose";

export type UserRole = "admin" | "endUser" | "vacationRentalHost" | "realEstateAgent" | "serviceProvider";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  // Helper methods
  hasRole(role: UserRole): boolean;
  addRole(role: UserRole): void;
  removeRole(role: UserRole): void;

  // Basic Info
  email: string;
  emailVerified: Date | null;
  password: string;
  name?: string;
  image?: string;

  // Role System (users can have multiple roles)
  roles: UserRole[];

  // Profile Information
  phone?: string;
  bio?: string;
  birthday?: Date;
  profileDescription?: string; // Who they are and what they love
  realEstateGoals?: string; // What they want real estate wise
  currentAddress?: string;
  homeownerStatus?: "own" | "rent" | "other";
  significantOther?: mongoose.Types.ObjectId; // Reference to linked partner account

  // Real Estate Agent/Broker specific
  licenseNumber?: string;
  brokerageName?: string;
  teamName?: string; // e.g., "The Sardella Team"
  website?: string;
  voicePersonality?: string; // AI training prompt for script generation personality
  voiceTrainingResponses?: Record<string, string>; // Raw questionnaire responses

  // Service Provider specific
  businessName?: string;
  serviceCategory?: string; // e.g., "Plumber", "Contractor", "Electrician"
  serviceAreas?: string[]; // Cities they serve
  certifications?: string[];

  // Vacation Rental Host specific
  stripeAccountId?: string;
  stripeOnboarded: boolean;

  // Anonymous Identification (for pre-login users)
  anonymousId?: string; // Browser fingerprint

  // CLIENT TYPE (for users who signed agreements)
  clientType?: "buyer" | "seller" | "both";
  buyerAgreement?: {
    signed: boolean;
    signedAt: Date;
    documentUrl?: string; // S3 URL if stored
    expiresAt?: Date;
  };
  sellerAgreement?: {
    signed: boolean;
    signedAt: Date;
    documentUrl?: string; // S3 URL if stored
    expiresAt?: Date;
  };

  // AGENT APPLICATION (two-phase application system)
  agentApplication?: {
    // Application Phase
    phase:
      | "inquiry_pending"
      | "inquiry_approved"
      | "inquiry_rejected"
      | "verification_pending"
      | "verification_complete"
      | "verification_failed"
      | "final_approved"
      | "final_rejected";

    submittedAt: Date;

    // Phase 1: Basic Info (text-only, no documents)
    licenseNumber: string;
    licenseState: string;
    mlsId: string;
    mlsAssociation: string;
    brokerageName: string;
    brokerageAddress: string;
    yearsExperience: number;

    // Team Preference
    preferredTeam?: mongoose.Types.ObjectId; // Reference to Team (null = default team)

    // Motivation
    whyJoin: string;
    references?: string; // Optional professional references

    // Documents
    resumeUrl?: string; // Cloudinary URL for resume
    coverLetterUrl?: string; // Cloudinary URL for cover letter

    // Phase 1 Review
    phase1ReviewedBy?: mongoose.Types.ObjectId;
    phase1ReviewedAt?: Date;
    phase1ReviewNotes?: string;

    // Phase 2: Identity Verification (Stripe)
    stripeIdentitySessionId?: string;
    stripeIdentityVerificationId?: string;
    identityVerified: boolean;
    identityVerifiedAt?: Date;
    identityStatus?: "pending" | "verified" | "failed" | "requires_input";

    // Final Review
    finalReviewedBy?: mongoose.Types.ObjectId;
    finalReviewedAt?: Date;
    finalReviewNotes?: string;
    finalApprovedAt?: Date;

    // Assignment
    assignedTeam?: mongoose.Types.ObjectId;
  };

  // TEAM ASSIGNMENT (for approved agents)
  team?: mongoose.Types.ObjectId; // Reference to Team
  isTeamLeader: boolean;

  // User Preferences & Activity
  likedListings: Array<{
    listingKey: string;
    listingData: Record<string, any>; // Full listing object
    swipedAt: Date;
    subdivision?: string;
    city?: string;
    county?: string; // NEW: For county-level analytics and filtering
    propertySubType?: string;

    // NEW: Source context tracking (map vs AI chat)
    sourceContext?: {
      type: 'map' | 'ai_chat'; // Where did this swipe originate?
      query?: string; // Original AI query (if from chat)
      queueId?: string; // Link to specific swipe session
      userIntent?: string; // Parsed intent (e.g., "investment", "family home")
    };

    // NEW: Engagement tracking
    viewDuration?: number; // How long did they view this listing (seconds)?
    detailsViewed?: boolean; // Did they click "View Full Details"?
    photosViewed?: number; // How many photos did they look at?
  }>;
  dislikedListings: Array<{
    listingKey: string;
    listingData?: Record<string, any>; // Full listing object for display
    swipedAt: Date;
    expiresAt: Date; // 30 minute TTL
  }>;
  savedSearches?: Array<{
    name: string;
    criteria: Record<string, any>;
    createdAt: Date;
  }>;
  favoriteCommunities?: Array<{
    name: string;
    id: string;
    type: 'city' | 'subdivision';
    cityId?: string; // For subdivisions, the parent city ID
  }>;

  // Swipe Sync Tracking
  lastSwipeSync?: Date;

  // Swipe Analytics
  swipeAnalytics?: {
    totalLikes: number;
    totalDislikes: number;
    topSubdivisions: Array<{ name: string; count: number }>;
    topCities: Array<{ name: string; count: number }>;
    topCounties?: Array<{ name: string; count: number }>; // NEW: County aggregation
    topPropertySubTypes: Array<{ type: string; count: number }>;
    lastUpdated: Date;
  };

  // NEW: Search History (for AI personalization)
  searchHistory?: Array<{
    query: string;
    timestamp: Date;
    resultsCount: number;
    swipedCount: number;
    likedCount: number;
    filters: Record<string, any>; // Applied filters (beds, baths, price, etc.)
  }>;

  // NEW: Preference Patterns (auto-calculated from liked listings)
  preferencePatterns?: {
    favoriteSubdivisions: Array<{ name: string; county: string; count: number }>;
    favoriteCities: Array<{ name: string; county: string; count: number }>;
    favoriteCounties: Array<{ name: string; count: number }>;
    favoritePropertyTypes: Array<{ type: string; count: number }>;

    priceRange: { min: number; max: number; avg: number };
    bedroomRange: { min: number; max: number; avg: number };
    bathroomRange: { min: number; max: number; avg: number };
    sqftRange: { min: number; max: number; avg: number };

    preferredAmenities: Array<{ name: string; count: number }>; // pool, spa, garage, etc.
    preferredFeatures: Array<{ name: string; count: number }>; // view, waterfront, gated

    lastUpdated: Date;
  };

  // Activity Tracking (for admin analytics)
  activityMetrics?: {
    totalSessions: number;
    totalSearches: number;
    totalListingsViewed: number;
    totalFavorites: number;
    lastActivityAt: Date;
    engagementScore: number; // 0-100
    lastSessionDuration?: number; // milliseconds
  };

  // Admin tracking
  isAdmin: boolean;
  canPromoteAdmins: boolean; // Only for super admin

  // Two-Factor Authentication
  twoFactorEnabled: boolean;
  twoFactorEmail?: string; // Email for 2FA (usually same as login email)

  // Marketing Consent (TCPA Compliant)
  smsConsent?: {
    agreed: boolean;
    agreedAt?: Date;
    phoneNumber?: string;
    ipAddress?: string;
  };
  newsletterConsent?: {
    agreed: boolean;
    agreedAt?: Date;
    email?: string;
    ipAddress?: string;
  };

  // Email Signature
  emailSignature?: {
    html: string;
    photo: string | null;
  };

  // Tutorial Preferences
  tutorialAvatarId?: string; // Which avatar to use for tutorial (e.g., "toasty", "default")

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    // Basic Info
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    emailVerified: { type: Date, default: null },
    password: { type: String, required: false }, // Not required for OAuth users
    name: String,
    image: String,

    // Role System
    roles: {
      type: [String],
      enum: ["admin", "endUser", "vacationRentalHost", "realEstateAgent", "serviceProvider"],
      default: ["endUser"],
    },

    // Profile Information
    phone: String,
    bio: String,
    birthday: Date,
    profileDescription: String,
    realEstateGoals: String,
    currentAddress: String,
    homeownerStatus: {
      type: String,
      enum: ["own", "rent", "other"],
    },
    significantOther: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // Real Estate Agent/Broker specific
    licenseNumber: String,
    brokerageName: String,
    teamName: String,
    website: String,
    voicePersonality: String,
    voiceTrainingResponses: Schema.Types.Mixed,

    // Service Provider specific
    businessName: String,
    serviceCategory: String,
    serviceAreas: [String],
    certifications: [String],

    // Vacation Rental Host specific
    stripeAccountId: String,
    stripeOnboarded: { type: Boolean, default: false },

    // Anonymous Identification
    anonymousId: { type: String, index: true }, // Browser fingerprint for pre-login users

    // CLIENT TYPE (for users who signed agreements)
    clientType: {
      type: String,
      enum: ["buyer", "seller", "both"],
    },
    buyerAgreement: {
      signed: { type: Boolean, default: false },
      signedAt: Date,
      documentUrl: String,
      expiresAt: Date,
    },
    sellerAgreement: {
      signed: { type: Boolean, default: false },
      signedAt: Date,
      documentUrl: String,
      expiresAt: Date,
    },

    // AGENT APPLICATION
    agentApplication: {
      phase: {
        type: String,
        enum: [
          "inquiry_pending",
          "inquiry_approved",
          "inquiry_rejected",
          "verification_pending",
          "verification_complete",
          "verification_failed",
          "final_approved",
          "final_rejected",
        ],
      },
      submittedAt: Date,

      // Phase 1: Basic Info
      licenseNumber: String,
      licenseState: String,
      mlsId: String,
      mlsAssociation: String,
      brokerageName: String,
      brokerageAddress: String,
      yearsExperience: Number,

      // Team Preference
      preferredTeam: { type: Schema.Types.ObjectId, ref: "Team" },

      // Motivation
      whyJoin: String,
      references: String,

      // Documents
      resumeUrl: String,
      coverLetterUrl: String,

      // Phase 1 Review
      phase1ReviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
      phase1ReviewedAt: Date,
      phase1ReviewNotes: String,

      // Phase 2: Identity Verification
      stripeIdentitySessionId: String,
      stripeIdentityVerificationId: String,
      identityVerified: { type: Boolean, default: false },
      identityVerifiedAt: Date,
      identityStatus: {
        type: String,
        enum: ["pending", "verified", "failed", "requires_input"],
      },

      // Final Review
      finalReviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
      finalReviewedAt: Date,
      finalReviewNotes: String,
      finalApprovedAt: Date,

      // Assignment
      assignedTeam: { type: Schema.Types.ObjectId, ref: "Team" },
    },

    // TEAM ASSIGNMENT
    team: { type: Schema.Types.ObjectId, ref: "Team" },
    isTeamLeader: { type: Boolean, default: false },

    // User Preferences & Activity
    likedListings: [{
      listingKey: { type: String, required: true },
      listingData: { type: Schema.Types.Mixed, required: true },
      swipedAt: { type: Date, default: Date.now },
      subdivision: String,
      city: String,
      propertySubType: String,
    }],
    dislikedListings: [{
      listingKey: { type: String, required: true },
      listingData: { type: Schema.Types.Mixed }, // Full listing object for display
      swipedAt: { type: Date, default: Date.now },
      expiresAt: { type: Date, required: true },
    }],
    savedSearches: [{
      name: String,
      criteria: Schema.Types.Mixed,
      createdAt: { type: Date, default: Date.now },
    }],
    favoriteCommunities: [{
      name: { type: String, required: true },
      id: { type: String, required: true },
      type: { type: String, enum: ['city', 'subdivision'], required: true },
      cityId: String, // For subdivisions, the parent city ID
    }],

    // Swipe Sync Tracking
    lastSwipeSync: Date,

    // Swipe Analytics
    swipeAnalytics: {
      totalLikes: { type: Number, default: 0 },
      totalDislikes: { type: Number, default: 0 },
      topSubdivisions: [{
        name: String,
        count: Number,
      }],
      topCities: [{
        name: String,
        count: Number,
      }],
      topPropertySubTypes: [{
        type: { type: String },  // Use { type: { type: String } } because 'type' is a Mongoose keyword
        count: Number,
      }],
      lastUpdated: Date,
    },

    // Activity Tracking
    activityMetrics: {
      totalSessions: { type: Number, default: 0 },
      totalSearches: { type: Number, default: 0 },
      totalListingsViewed: { type: Number, default: 0 },
      totalFavorites: { type: Number, default: 0 },
      lastActivityAt: Date,
      engagementScore: { type: Number, default: 0, min: 0, max: 100 },
      lastSessionDuration: Number,
    },

    // Admin tracking
    isAdmin: { type: Boolean, default: false },
    canPromoteAdmins: { type: Boolean, default: false },

    // Two-Factor Authentication
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorEmail: String,

    // Marketing Consent (TCPA Compliant)
    smsConsent: {
      agreed: { type: Boolean, default: false },
      agreedAt: Date,
      phoneNumber: String,
      ipAddress: String,
    },
    newsletterConsent: {
      agreed: { type: Boolean, default: false },
      agreedAt: Date,
      email: String,
      ipAddress: String,
    },

    // Email Signature
    emailSignature: {
      html: { type: String, default: '' },
      photo: { type: String, default: null },
    },

    // Tutorial Preferences
    tutorialAvatarId: { type: String, default: 'toasty' }, // Default to Toasty for all users

    // Metadata
    lastLoginAt: Date,
  },
  {
    timestamps: true,
    collection: "users",
  }
);

// Indexes for performance
UserSchema.index({ roles: 1 });
UserSchema.index({ "activityMetrics.lastActivityAt": -1 }); // For sorting by recent activity
UserSchema.index({ "activityMetrics.engagementScore": -1 }); // For sorting by engagement
UserSchema.index({ isAdmin: 1 });
UserSchema.index({ serviceCategory: 1, serviceAreas: 1 }); // For service provider search
UserSchema.index({ "agentApplication.phase": 1 }); // For filtering applications by phase
UserSchema.index({ team: 1 }); // For team member queries
UserSchema.index({ isTeamLeader: 1 }); // For team leader queries
UserSchema.index({ clientType: 1 }); // For client queries

// Helper methods
UserSchema.methods.hasRole = function(role: UserRole): boolean {
  return this.roles.includes(role);
};

UserSchema.methods.addRole = function(role: UserRole): void {
  if (!this.roles.includes(role)) {
    this.roles.push(role);
  }
};

UserSchema.methods.removeRole = function(role: UserRole): void {
  this.roles = this.roles.filter((r: UserRole) => r !== role);
};

// Static method to check if email is admin
UserSchema.statics.isAdminEmail = function(email: string): boolean {
  return email.toLowerCase() === "josephsardella@gmail.com";
};

// Pre-save hook to set admin status
UserSchema.pre("save", function(next) {
  if (this.isNew || this.isModified("email")) {
    const UserModel = this.constructor as any;
    if (UserModel.isAdminEmail(this.email)) {
      this.isAdmin = true;
      this.canPromoteAdmins = true;
      if (!this.roles.includes("admin")) {
        this.roles.push("admin");
      }
    }
  }
  next();
});

// Export model
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
