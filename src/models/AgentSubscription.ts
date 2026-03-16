// src/models/AgentSubscription.ts
// AgentSubscription model for tracking agent monthly subscriptions and billing

import mongoose, { Schema, Document, Model } from "mongoose";

export type SubscriptionTier = "free" | "starter" | "professional" | "enterprise";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "cancelled" | "paused";
export type BillingInterval = "monthly" | "annual";

export interface IAgentSubscription extends Document {
  _id: mongoose.Types.ObjectId;

  // Agent Reference
  agentId: mongoose.Types.ObjectId; // Reference to User (must have realEstateAgent role)
  teamId?: mongoose.Types.ObjectId; // Reference to Team (if agent is part of team)

  // Subscription Tier & Status
  tier: SubscriptionTier; // free, starter, professional, enterprise
  status: SubscriptionStatus; // active, trialing, past_due, cancelled, paused
  billingInterval: BillingInterval; // monthly, annual

  // Pricing
  monthlyPrice: number; // Base monthly price for this tier
  annualPrice?: number; // Annual price (if applicable, usually 10-20% discount)
  currency: string; // USD, CAD, etc.

  // Trial Period
  trialStartDate?: Date;
  trialEndDate?: Date;
  isTrialing: boolean;

  // Subscription Dates
  startDate: Date; // When subscription started
  currentPeriodStart: Date; // Current billing period start
  currentPeriodEnd: Date; // Current billing period end
  cancelAt?: Date; // Scheduled cancellation date (end of current period)
  cancelledAt?: Date; // When subscription was cancelled
  pausedAt?: Date; // When subscription was paused

  // Stripe Integration
  stripeCustomerId?: string; // Stripe customer ID
  stripeSubscriptionId?: string; // Stripe subscription ID
  stripePriceId?: string; // Stripe price ID
  stripePaymentMethodId?: string; // Default payment method

  // Feature Limits (based on tier)
  features: {
    // Domain & Branding
    customDomain: boolean; // Can use custom domain (e.g., josephsardella.com)
    subdomain: boolean; // Can use subdomain (e.g., joseph.chatrealty.io)

    // Asset Limits
    maxPhotos: number; // Max gallery photos
    maxVideos: number; // Max videos
    customBackgrounds: boolean; // Can upload custom theme backgrounds

    // Content
    blogPosts: boolean; // Can publish blog posts
    testimonials: boolean; // Can display testimonials
    customPages: number; // Number of custom pages allowed

    // Lead Generation
    leadCapture: boolean; // Can capture leads
    agentMatching: boolean; // Can receive agent match leads
    representationAgreements: boolean; // Can send/sign agreements

    // Analytics
    analytics: boolean; // Access to analytics dashboard
    exportData: boolean; // Can export data

    // Support
    supportLevel: "community" | "email" | "priority" | "dedicated"; // Support tier

    // API Access
    apiAccess: boolean; // Can access API
    webhooks: boolean; // Can set up webhooks
  };

  // Usage Tracking (for potential overages or upselling)
  usage?: {
    currentPhotos: number;
    currentVideos: number;
    currentCustomPages: number;
    leadsThisMonth: number;
    agentMatchesThisMonth: number;
    lastCalculatedAt: Date;
  };

  // Billing History
  invoices?: Array<{
    invoiceId: string; // Stripe invoice ID
    amount: number;
    currency: string;
    status: "paid" | "pending" | "failed" | "refunded";
    paidAt?: Date;
    dueDate: Date;
    invoiceUrl?: string; // Stripe invoice URL
  }>;

  // Payment Failures
  paymentFailures?: Array<{
    attemptedAt: Date;
    amount: number;
    reason?: string; // Stripe error message
    resolved: boolean;
    resolvedAt?: Date;
  }>;

  // Addons (future feature)
  addons?: Array<{
    name: string;
    description: string;
    monthlyPrice: number;
    enabled: boolean;
    addedAt: Date;
  }>;

  // Discount/Promo Codes
  discount?: {
    code: string;
    percentage?: number; // Percentage off (e.g., 20 for 20% off)
    amountOff?: number; // Fixed amount off
    duration: "once" | "repeating" | "forever";
    durationInMonths?: number; // If duration is "repeating"
    appliedAt: Date;
    expiresAt?: Date;
  };

  // Referral Tracking (agent referred another agent)
  referredBy?: mongoose.Types.ObjectId; // Agent who referred this agent
  referralCredits?: number; // Credits earned from referrals

  // Notes
  notes?: string; // Internal notes about subscription
  cancellationReason?: string; // Why did agent cancel?
  cancellationFeedback?: string; // Agent's feedback on cancellation

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Types.ObjectId; // Admin who created (if manually created)
}

const AgentSubscriptionSchema = new Schema<IAgentSubscription>(
  {
    // Agent Reference
    agentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", index: true },

    // Subscription Tier & Status
    tier: {
      type: String,
      enum: ["free", "starter", "professional", "enterprise"],
      default: "free",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "trialing", "past_due", "cancelled", "paused"],
      default: "active",
      required: true,
      index: true,
    },
    billingInterval: {
      type: String,
      enum: ["monthly", "annual"],
      default: "monthly",
    },

    // Pricing
    monthlyPrice: { type: Number, required: true, default: 0 },
    annualPrice: Number,
    currency: { type: String, default: "USD" },

    // Trial Period
    trialStartDate: Date,
    trialEndDate: Date,
    isTrialing: { type: Boolean, default: false },

    // Subscription Dates
    startDate: { type: Date, default: Date.now, required: true },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true, index: true },
    cancelAt: Date,
    cancelledAt: Date,
    pausedAt: Date,

    // Stripe Integration
    stripeCustomerId: { type: String, index: true },
    stripeSubscriptionId: { type: String, unique: true, sparse: true, index: true },
    stripePriceId: String,
    stripePaymentMethodId: String,

    // Feature Limits
    features: {
      customDomain: { type: Boolean, default: false },
      subdomain: { type: Boolean, default: true }, // Free tier gets subdomain
      maxPhotos: { type: Number, default: 10 },
      maxVideos: { type: Number, default: 1 },
      customBackgrounds: { type: Boolean, default: false },
      blogPosts: { type: Boolean, default: false },
      testimonials: { type: Boolean, default: true },
      customPages: { type: Number, default: 1 },
      leadCapture: { type: Boolean, default: true },
      agentMatching: { type: Boolean, default: true },
      representationAgreements: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
      exportData: { type: Boolean, default: false },
      supportLevel: { type: String, enum: ["community", "email", "priority", "dedicated"], default: "community" },
      apiAccess: { type: Boolean, default: false },
      webhooks: { type: Boolean, default: false },
    },

    // Usage Tracking
    usage: {
      currentPhotos: { type: Number, default: 0 },
      currentVideos: { type: Number, default: 0 },
      currentCustomPages: { type: Number, default: 0 },
      leadsThisMonth: { type: Number, default: 0 },
      agentMatchesThisMonth: { type: Number, default: 0 },
      lastCalculatedAt: Date,
    },

    // Billing History
    invoices: [{
      invoiceId: { type: String, required: true },
      amount: { type: Number, required: true },
      currency: { type: String, default: "USD" },
      status: { type: String, enum: ["paid", "pending", "failed", "refunded"], default: "pending" },
      paidAt: Date,
      dueDate: { type: Date, required: true },
      invoiceUrl: String,
    }],

    // Payment Failures
    paymentFailures: [{
      attemptedAt: { type: Date, default: Date.now },
      amount: Number,
      reason: String,
      resolved: { type: Boolean, default: false },
      resolvedAt: Date,
    }],

    // Addons
    addons: [{
      name: String,
      description: String,
      monthlyPrice: Number,
      enabled: { type: Boolean, default: true },
      addedAt: { type: Date, default: Date.now },
    }],

    // Discount
    discount: {
      code: String,
      percentage: Number,
      amountOff: Number,
      duration: { type: String, enum: ["once", "repeating", "forever"] },
      durationInMonths: Number,
      appliedAt: Date,
      expiresAt: Date,
    },

    // Referral
    referredBy: { type: Schema.Types.ObjectId, ref: "User", index: true },
    referralCredits: { type: Number, default: 0 },

    // Notes
    notes: String,
    cancellationReason: String,
    cancellationFeedback: String,

    // Metadata
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    collection: "agentsubscriptions",
  }
);

// Indexes for performance
AgentSubscriptionSchema.index({ agentId: 1, status: 1 }); // Find active subscriptions
AgentSubscriptionSchema.index({ tier: 1 }); // Filter by tier
AgentSubscriptionSchema.index({ currentPeriodEnd: 1 }); // Find expiring subscriptions
AgentSubscriptionSchema.index({ stripeCustomerId: 1 });
AgentSubscriptionSchema.index({ stripeSubscriptionId: 1 }, { unique: true, sparse: true });
AgentSubscriptionSchema.index({ isTrialing: 1 }); // Find trials
AgentSubscriptionSchema.index({ referredBy: 1 }); // Track referrals

// Pre-save hook to set feature limits based on tier
AgentSubscriptionSchema.pre("save", function(next) {
  if (this.isModified("tier")) {
    // Set features based on tier
    switch (this.tier) {
      case "free":
        this.features = {
          customDomain: false,
          subdomain: true,
          maxPhotos: 10,
          maxVideos: 1,
          customBackgrounds: false,
          blogPosts: false,
          testimonials: true,
          customPages: 1,
          leadCapture: true,
          agentMatching: true,
          representationAgreements: false,
          analytics: false,
          exportData: false,
          supportLevel: "community",
          apiAccess: false,
          webhooks: false,
        };
        this.monthlyPrice = 0;
        break;

      case "starter":
        this.features = {
          customDomain: false,
          subdomain: true,
          maxPhotos: 50,
          maxVideos: 3,
          customBackgrounds: true,
          blogPosts: true,
          testimonials: true,
          customPages: 5,
          leadCapture: true,
          agentMatching: true,
          representationAgreements: true,
          analytics: true,
          exportData: false,
          supportLevel: "email",
          apiAccess: false,
          webhooks: false,
        };
        this.monthlyPrice = 49;
        this.annualPrice = 470; // ~20% discount
        break;

      case "professional":
        this.features = {
          customDomain: true,
          subdomain: true,
          maxPhotos: 200,
          maxVideos: 10,
          customBackgrounds: true,
          blogPosts: true,
          testimonials: true,
          customPages: 20,
          leadCapture: true,
          agentMatching: true,
          representationAgreements: true,
          analytics: true,
          exportData: true,
          supportLevel: "priority",
          apiAccess: true,
          webhooks: false,
        };
        this.monthlyPrice = 99;
        this.annualPrice = 950; // ~20% discount
        break;

      case "enterprise":
        this.features = {
          customDomain: true,
          subdomain: true,
          maxPhotos: 999,
          maxVideos: 50,
          customBackgrounds: true,
          blogPosts: true,
          testimonials: true,
          customPages: 100,
          leadCapture: true,
          agentMatching: true,
          representationAgreements: true,
          analytics: true,
          exportData: true,
          supportLevel: "dedicated",
          apiAccess: true,
          webhooks: true,
        };
        this.monthlyPrice = 299;
        this.annualPrice = 2870; // ~20% discount
        break;
    }
  }

  // Set current period dates if new subscription
  if (this.isNew && !this.currentPeriodStart) {
    this.currentPeriodStart = new Date();
    const periodEnd = new Date();
    if (this.billingInterval === "annual") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }
    this.currentPeriodEnd = periodEnd;
  }

  next();
});

// Static method to find expiring subscriptions
AgentSubscriptionSchema.statics.findExpiring = async function(daysUntilExpiration: number = 7) {
  const expirationThreshold = new Date();
  expirationThreshold.setDate(expirationThreshold.getDate() + daysUntilExpiration);

  return this.find({
    status: "active",
    currentPeriodEnd: { $lte: expirationThreshold, $gt: new Date() },
  });
};

// Instance method to cancel subscription
AgentSubscriptionSchema.methods.cancel = async function(cancelImmediately: boolean = false, reason?: string, feedback?: string) {
  if (cancelImmediately) {
    this.status = "cancelled";
    this.cancelledAt = new Date();
  } else {
    // Cancel at end of period
    this.cancelAt = this.currentPeriodEnd;
  }

  if (reason) this.cancellationReason = reason;
  if (feedback) this.cancellationFeedback = feedback;

  await this.save();
};

// Export model
export default (mongoose.models.AgentSubscription ||
  mongoose.model<IAgentSubscription>("AgentSubscription", AgentSubscriptionSchema)) as Model<IAgentSubscription>;
