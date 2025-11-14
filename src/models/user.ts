// src/models/user.ts
// User model with role-based access control

import mongoose, { Schema, Document, Model } from "mongoose";

export type UserRole = "admin" | "endUser" | "vacationRentalHost" | "realEstateAgent" | "serviceProvider";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
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
  website?: string;

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

  // User Preferences & Activity
  likedListings: Array<{
    listingKey: string;
    listingData: Record<string, any>; // Full listing object
    swipedAt: Date;
    subdivision?: string;
    city?: string;
    propertyType?: string;
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

  // Swipe Sync Tracking
  lastSwipeSync?: Date;

  // Swipe Analytics
  swipeAnalytics?: {
    totalLikes: number;
    totalDislikes: number;
    topSubdivisions: Array<{ name: string; count: number }>;
    topCities: Array<{ name: string; count: number }>;
    topPropertyTypes: Array<{ type: string; count: number }>;
    lastUpdated: Date;
  };

  // Admin tracking
  isAdmin: boolean;
  canPromoteAdmins: boolean; // Only for super admin

  // Two-Factor Authentication
  twoFactorEnabled: boolean;
  twoFactorEmail?: string; // Email for 2FA (usually same as login email)

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
    password: { type: String, required: true },
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
    website: String,

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

    // User Preferences & Activity
    likedListings: [{
      listingKey: { type: String, required: true },
      listingData: { type: Schema.Types.Mixed, required: true },
      swipedAt: { type: Date, default: Date.now },
      subdivision: String,
      city: String,
      propertyType: String,
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
      topPropertyTypes: [{
        type: { type: String },  // Use { type: { type: String } } because 'type' is a Mongoose keyword
        count: Number,
      }],
      lastUpdated: Date,
    },

    // Admin tracking
    isAdmin: { type: Boolean, default: false },
    canPromoteAdmins: { type: Boolean, default: false },

    // Two-Factor Authentication
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorEmail: String,

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
UserSchema.index({ isAdmin: 1 });
UserSchema.index({ serviceCategory: 1, serviceAreas: 1 }); // For service provider search

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
