// src/models/CampaignFunding.ts
//
// Per-campaign, N-party co-marketing funding + approval record. A campaign that
// is "billed to partnership(s)" stages as Campaign.status='pending_adspend' and
// gets one CampaignFunding doc describing each party's fair-value share and their
// approve/deny → collection state. The campaign launches only once every REQUIRED
// participant has approved AND their share is collected.
//
// Funding model (per the product decision): each party pays their OWN share to
// the PLATFORM (never partner → agent). Collection draws from their existing
// credit balance first, then a Stripe charge covers any remainder.
//
// See docs/campaigns/co-marketing-adspend.md.

import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type FundingStatus = 'pending' | 'approved' | 'rejected' | 'funded' | 'cancelled';
export type AllocationBasis = 'equal' | 'percentage' | 'fixed' | 'co_branding_share';
export type ParticipantApproval = 'pending' | 'approved' | 'denied';
export type ParticipantRole = 'lead_agent' | 'agent' | 'service_provider';

export interface IFundingParticipant {
  userId: Types.ObjectId;            // ref User
  partnershipId?: Types.ObjectId;    // ref Partnership (standing relationship; absent for the lead agent)
  role: ParticipantRole;
  required: boolean;                 // a denial by a required party blocks the launch

  // Fair-value share (the amount this party approves and pays)
  shareCredits: number;
  shareDollars: number;              // at $0.10/credit, for the consent record

  // Approval (the per-campaign consent record)
  approval: ParticipantApproval;
  respondedAt?: Date;
  deniedReason?: string;

  // Collection — party → platform: existing balance first, Stripe for the remainder
  funded: boolean;
  creditsFromBalance: number;        // credits debited from this party's existing balance
  stripeChargeCents: number;         // remainder charged to their card (0 if balance covered it)
  stripePaymentIntentId?: string;
  ledgerTxnId?: Types.ObjectId;      // traceability for settlement / refunds
  fundedAt?: Date;
}

export interface ICampaignFunding extends Document {
  _id: Types.ObjectId;
  campaignId: Types.ObjectId;        // ref Campaign
  agentId: Types.ObjectId;           // lead agent (ref User)
  status: FundingStatus;
  allocationBasis: AllocationBasis;
  totalCredits: number;
  totalDollars: number;
  participants: IFundingParticipant[];

  // Snapshot of the creative the parties approved — frozen for the RESPA audit
  // trail (each party consented to THIS ad at THIS share).
  creativeSnapshot?: {
    pageUrl?: string;
    pageName?: string;
    imageUrl?: string;
    headline?: string;
    primaryText?: string;
  };

  // The ad-launch params (google/meta/pageUrl/pageName) to replay once funded.
  launchPayload?: {
    google?: any;
    meta?: any;
    pageUrl?: string;
    pageName?: string;
  };

  fundedAt?: Date;
  rejectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FundingParticipantSchema = new Schema<IFundingParticipant>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    partnershipId: { type: Schema.Types.ObjectId, ref: "Partnership" },
    role: { type: String, enum: ['lead_agent', 'agent', 'service_provider'], required: true },
    required: { type: Boolean, default: true },

    shareCredits: { type: Number, required: true, min: 0 },
    shareDollars: { type: Number, required: true, min: 0 },

    approval: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
    respondedAt: Date,
    deniedReason: String,

    funded: { type: Boolean, default: false },
    creditsFromBalance: { type: Number, default: 0, min: 0 },
    stripeChargeCents: { type: Number, default: 0, min: 0 },
    stripePaymentIntentId: String,
    ledgerTxnId: { type: Schema.Types.ObjectId },
    fundedAt: Date,
  },
  { _id: false }
);

const CampaignFundingSchema = new Schema<ICampaignFunding>(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign", required: true, index: true },
    agentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'funded', 'cancelled'],
      default: 'pending',
      index: true,
    },
    allocationBasis: {
      type: String,
      enum: ['equal', 'percentage', 'fixed', 'co_branding_share'],
      default: 'co_branding_share',
    },
    totalCredits: { type: Number, required: true, min: 0 },
    totalDollars: { type: Number, required: true, min: 0 },
    participants: { type: [FundingParticipantSchema], default: [] },

    creativeSnapshot: {
      pageUrl: String,
      pageName: String,
      imageUrl: String,
      headline: String,
      primaryText: String,
    },

    launchPayload: { type: Schema.Types.Mixed },

    fundedAt: Date,
    rejectedAt: Date,
  },
  { timestamps: true, collection: "campaign_fundings" }
);

// Find a participant's pending funding quickly (for the approve/deny flow).
CampaignFundingSchema.index({ "participants.userId": 1, status: 1 });

export default (mongoose.models.CampaignFunding ||
  mongoose.model<ICampaignFunding>("CampaignFunding", CampaignFundingSchema)) as Model<ICampaignFunding>;
