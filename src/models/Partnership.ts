// src/models/Partnership.ts
// Partnership model for agent <-> service partner co-marketing relationships

import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type PartnershipStatus = 'pending' | 'active' | 'suspended' | 'terminated';
export type CostSplitType = 'equal' | 'percentage' | 'fixed';

export interface IPartnership extends Document {
  _id: Types.ObjectId;
  agentId: Types.ObjectId; // ref: User (realEstateAgent)
  servicePartnerId: Types.ObjectId; // ref: User (serviceProvider)
  status: PartnershipStatus;

  // Cost splitting terms
  terms: {
    costSplitType: CostSplitType;
    agentPercentage?: number; // e.g., 50
    partnerPercentage?: number; // e.g., 50
    fixedAgentAmount?: number;
    fixedPartnerAmount?: number;
    maxMonthlyContribution?: number;
  };

  // RESPA compliance
  respaCompliance: {
    jointMarketingAgreement: boolean;
    jmaDocumentUrl?: string; // Cloudinary URL of signed JMA
    jmaSignedAt?: Date;
    agreedToTerms: boolean;
    agreedAt?: Date;
  };

  // Linked campaigns
  campaigns: Types.ObjectId[]; // ref: Campaign

  // Billing history
  billingHistory: Array<{
    date: Date;
    campaignId?: Types.ObjectId;
    campaignName?: string;
    totalCost: number;
    agentShare: number;
    partnerShare: number;
    agentPaid: boolean;
    partnerPaid: boolean;
    stripeInvoiceId?: string;
  }>;

  // Metadata
  initiatedBy: Types.ObjectId; // who sent the partnership request
  message?: string; // optional message with request
  createdAt: Date;
  updatedAt: Date;
}

const PartnershipSchema = new Schema<IPartnership>(
  {
    agentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    servicePartnerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "suspended", "terminated"],
      default: "pending",
    },

    // Cost splitting terms
    terms: {
      costSplitType: {
        type: String,
        enum: ["equal", "percentage", "fixed"],
        default: "equal",
      },
      agentPercentage: Number,
      partnerPercentage: Number,
      fixedAgentAmount: Number,
      fixedPartnerAmount: Number,
      maxMonthlyContribution: Number,
    },

    // RESPA compliance
    respaCompliance: {
      jointMarketingAgreement: { type: Boolean, default: false },
      jmaDocumentUrl: String,
      jmaSignedAt: Date,
      agreedToTerms: { type: Boolean, default: false },
      agreedAt: Date,
    },

    // Linked campaigns
    campaigns: [{
      type: Schema.Types.ObjectId,
      ref: "Campaign",
    }],

    // Billing history
    billingHistory: [{
      date: { type: Date, default: Date.now },
      campaignId: { type: Schema.Types.ObjectId, ref: "Campaign" },
      campaignName: String,
      totalCost: { type: Number, required: true },
      agentShare: { type: Number, required: true },
      partnerShare: { type: Number, required: true },
      agentPaid: { type: Boolean, default: false },
      partnerPaid: { type: Boolean, default: false },
      stripeInvoiceId: String,
    }],

    // Metadata
    initiatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: String,
  },
  {
    timestamps: true,
    collection: "partnerships",
  }
);

// Indexes for efficient queries
PartnershipSchema.index({ agentId: 1, servicePartnerId: 1 }, { unique: true });
PartnershipSchema.index({ agentId: 1, status: 1 });
PartnershipSchema.index({ servicePartnerId: 1, status: 1 });

// Export model
export default (mongoose.models.Partnership ||
  mongoose.model<IPartnership>("Partnership", PartnershipSchema)) as Model<IPartnership>;
