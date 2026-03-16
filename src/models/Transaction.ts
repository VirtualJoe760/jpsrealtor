// src/models/Transaction.ts
// Transaction model for tracking real estate deals, commissions, and multi-tenant fee tracking

import mongoose, { Schema, Document, Model } from "mongoose";

export type TransactionType = "purchase" | "sale" | "lease" | "referral";
export type TransactionStatus = "pending" | "in_progress" | "closed" | "cancelled" | "failed";
export type FeeType = "swipe_match" | "referral" | "data_broker" | "handoff" | "company_split";

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;

  // Transaction Basics
  type: TransactionType; // purchase, sale, lease, referral
  status: TransactionStatus;
  listingKey?: string; // Reference to the listing (if applicable)
  propertyAddress: string;
  propertyCity?: string;
  propertyState?: string;
  propertyZip?: string;

  // Financial Details
  salePrice: number; // Transaction amount
  closingDate?: Date; // Actual or expected closing date
  listingDate?: Date; // When the listing went live

  // Parties Involved
  clientId: mongoose.Types.ObjectId; // Reference to User (buyer/seller/renter)
  agentId: mongoose.Types.ObjectId; // Reference to primary agent handling the deal
  teamId?: mongoose.Types.ObjectId; // Reference to Team (if agent is part of a team)

  // Secondary Parties (for referrals, handoffs, etc.)
  referringAgentId?: mongoose.Types.ObjectId; // Agent who referred this client (out-of-state)
  dataBrokerId?: mongoose.Types.ObjectId; // Agent/Team who provided MLS data
  handoffAgentId?: mongoose.Types.ObjectId; // Agent who handed off this lead

  // Commission Breakdown
  commission: {
    totalCommissionRate: number; // Total commission % (e.g., 5.5%)
    totalCommissionAmount: number; // Calculated from salePrice * totalCommissionRate

    // Agent's gross commission (before fees)
    agentGrossCommission: number;

    // Fees Applied (stack on top of each other)
    fees: Array<{
      type: FeeType; // swipe_match, referral, data_broker, handoff, company_split
      percentage: number; // Fee percentage (e.g., 15 for 15%)
      amount: number; // Calculated fee amount
      recipientId?: mongoose.Types.ObjectId; // Who receives this fee (agent, team, or platform)
      recipientType: "agent" | "team" | "platform"; // Type of recipient
      description?: string; // Optional description
    }>;

    // Agent's net commission (after all fees)
    agentNetCommission: number;
  };

  // MULTI-TENANT: Fee Attribution
  feeTracking: {
    // Swipe Match Fee (15% to ChatRealty)
    swipeMatchFee?: {
      applied: boolean;
      percentage: number; // 15%
      amount: number;
      agentMatchId?: mongoose.Types.ObjectId; // Reference to AgentMatch that triggered this
    };

    // Referral Fee (25% to referring agent - out-of-state)
    referralFee?: {
      applied: boolean;
      percentage: number; // 25%
      amount: number;
      referringAgentId?: mongoose.Types.ObjectId;
    };

    // Data Broker Fee (5% to agent/team who provided MLS data)
    dataBrokerFee?: {
      applied: boolean;
      percentage: number; // 5%
      amount: number;
      dataBrokerId?: mongoose.Types.ObjectId; // Agent or Team
      dataBrokerType: "agent" | "team";
    };

    // Handoff Fee (5% to agent who handed off the lead)
    handoffFee?: {
      applied: boolean;
      percentage: number; // 5%
      amount: number;
      handoffAgentId?: mongoose.Types.ObjectId;
    };

    // Company Commission Split (varies by brokerage)
    companySplitFee?: {
      applied: boolean;
      percentage: number; // Varies (e.g., 20-30%)
      amount: number;
      brokerageName?: string;
    };

    // Total Fees (sum of all fees, capped at 30-35%)
    totalFeesPercentage: number;
    totalFeesAmount: number;
  };

  // Attribution (how did this deal originate?)
  attribution?: {
    source: "swipe_match" | "ai_chat" | "map_search" | "direct_contact" | "referral" | "open_house" | "other";
    cookieId?: string; // Anonymous tracking cookie
    sessionId?: string; // Session ID when client first engaged
    initialContactDate?: Date;
    agentMatchId?: mongoose.Types.ObjectId; // If from agent matching system
    representationAgreementId?: mongoose.Types.ObjectId; // Link to representation agreement
  };

  // Timeline Tracking
  timeline?: Array<{
    event: string; // e.g., "Offer submitted", "Inspection completed", "Closed"
    date: Date;
    notes?: string;
    createdBy?: mongoose.Types.ObjectId; // User who logged this event
  }>;

  // Documents
  documents?: Array<{
    name: string;
    url: string; // Cloudinary URL
    type: "contract" | "disclosure" | "inspection" | "appraisal" | "other";
    uploadedAt: Date;
    uploadedBy?: mongoose.Types.ObjectId;
  }>;

  // Notes & Comments
  notes?: string;
  internalNotes?: string; // Private notes for agent/team only

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId; // User who created this transaction record
}

const TransactionSchema = new Schema<ITransaction>(
  {
    // Transaction Basics
    type: {
      type: String,
      enum: ["purchase", "sale", "lease", "referral"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "closed", "cancelled", "failed"],
      default: "pending",
    },
    listingKey: { type: String, index: true },
    propertyAddress: { type: String, required: true },
    propertyCity: String,
    propertyState: String,
    propertyZip: String,

    // Financial Details
    salePrice: { type: Number, required: true },
    closingDate: Date,
    listingDate: Date,

    // Parties Involved
    clientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    agentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", index: true },

    // Secondary Parties
    referringAgentId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    dataBrokerId: { type: Schema.Types.ObjectId, index: true }, // Can be User or Team
    handoffAgentId: { type: Schema.Types.ObjectId, ref: "User", index: true },

    // Commission Breakdown
    commission: {
      totalCommissionRate: { type: Number, required: true }, // e.g., 5.5 (for 5.5%)
      totalCommissionAmount: { type: Number, required: true },
      agentGrossCommission: { type: Number, required: true },

      fees: [{
        type: {
          type: String,
          enum: ["swipe_match", "referral", "data_broker", "handoff", "company_split"],
          required: true,
        },
        percentage: { type: Number, required: true },
        amount: { type: Number, required: true },
        recipientId: { type: Schema.Types.ObjectId },
        recipientType: { type: String, enum: ["agent", "team", "platform"], required: true },
        description: String,
      }],

      agentNetCommission: { type: Number, required: true },
    },

    // Fee Tracking
    feeTracking: {
      swipeMatchFee: {
        applied: { type: Boolean, default: false },
        percentage: { type: Number, default: 15 },
        amount: { type: Number, default: 0 },
        agentMatchId: { type: Schema.Types.ObjectId, ref: "AgentMatch" },
      },
      referralFee: {
        applied: { type: Boolean, default: false },
        percentage: { type: Number, default: 25 },
        amount: { type: Number, default: 0 },
        referringAgentId: { type: Schema.Types.ObjectId, ref: "User" },
      },
      dataBrokerFee: {
        applied: { type: Boolean, default: false },
        percentage: { type: Number, default: 5 },
        amount: { type: Number, default: 0 },
        dataBrokerId: { type: Schema.Types.ObjectId },
        dataBrokerType: { type: String, enum: ["agent", "team"] },
      },
      handoffFee: {
        applied: { type: Boolean, default: false },
        percentage: { type: Number, default: 5 },
        amount: { type: Number, default: 0 },
        handoffAgentId: { type: Schema.Types.ObjectId, ref: "User" },
      },
      companySplitFee: {
        applied: { type: Boolean, default: false },
        percentage: Number,
        amount: { type: Number, default: 0 },
        brokerageName: String,
      },
      totalFeesPercentage: { type: Number, default: 0 },
      totalFeesAmount: { type: Number, default: 0 },
    },

    // Attribution
    attribution: {
      source: {
        type: String,
        enum: ["swipe_match", "ai_chat", "map_search", "direct_contact", "referral", "open_house", "other"],
      },
      cookieId: String,
      sessionId: String,
      initialContactDate: Date,
      agentMatchId: { type: Schema.Types.ObjectId, ref: "AgentMatch" },
      representationAgreementId: Schema.Types.Mixed, // Can reference representation agreement
    },

    // Timeline
    timeline: [{
      event: { type: String, required: true },
      date: { type: Date, default: Date.now },
      notes: String,
      createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    }],

    // Documents
    documents: [{
      name: { type: String, required: true },
      url: { type: String, required: true },
      type: { type: String, enum: ["contract", "disclosure", "inspection", "appraisal", "other"], default: "other" },
      uploadedAt: { type: Date, default: Date.now },
      uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
    }],

    // Notes
    notes: String,
    internalNotes: String,

    // Metadata
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
    collection: "transactions",
  }
);

// Indexes for performance
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ type: 1 });
TransactionSchema.index({ clientId: 1 });
TransactionSchema.index({ agentId: 1 });
TransactionSchema.index({ teamId: 1 });
TransactionSchema.index({ closingDate: -1 }); // Sort by recent closings
TransactionSchema.index({ createdAt: -1 }); // Sort by recent transactions
TransactionSchema.index({ listingKey: 1 });
TransactionSchema.index({ "feeTracking.swipeMatchFee.agentMatchId": 1 }); // Find transactions from agent matches
TransactionSchema.index({ "attribution.source": 1 }); // Track deal sources

// Pre-save hook to calculate commissions and fees
TransactionSchema.pre("save", function(next) {
  // Calculate total commission amount
  this.commission.totalCommissionAmount = this.salePrice * (this.commission.totalCommissionRate / 100);

  // Calculate fees
  let totalFees = 0;
  this.commission.fees.forEach(fee => {
    fee.amount = this.commission.totalCommissionAmount * (fee.percentage / 100);
    totalFees += fee.amount;
  });

  // Calculate agent net commission
  this.commission.agentNetCommission = this.commission.agentGrossCommission - totalFees;

  // Update fee tracking totals
  this.feeTracking.totalFeesAmount = totalFees;
  this.feeTracking.totalFeesPercentage = (totalFees / this.commission.totalCommissionAmount) * 100;

  next();
});

// Export model
export default (mongoose.models.Transaction ||
  mongoose.model<ITransaction>("Transaction", TransactionSchema)) as Model<ITransaction>;
