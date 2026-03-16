// src/models/AgentMatch.ts
// AgentMatch model for Tinder-style agent-client matching system

import mongoose, { Schema, Document, Model } from "mongoose";

export type MatchStatus = "pending" | "accepted" | "declined" | "expired" | "completed";
export type MatchInitiator = "client" | "system" | "agent";

export interface IAgentMatch extends Document {
  _id: mongoose.Types.ObjectId;

  // Core Match Data
  clientId: mongoose.Types.ObjectId; // Reference to User (client)
  agentId: mongoose.Types.ObjectId; // Reference to User (agent)
  teamId?: mongoose.Types.ObjectId; // Reference to Team (if agent is part of team)

  // Match Context
  listingKey?: string; // Listing that triggered the match (if applicable)
  propertyAddress?: string;
  propertyCity?: string;
  propertyCounty?: string;
  propertyState?: string;

  // Match Metadata
  matchScore?: number; // 0-100 score based on compatibility (future ML feature)
  initiatedBy: MatchInitiator; // "client" (swiped), "system" (auto-matched), "agent" (proactive reach-out)
  matchReason?: string; // Why were they matched? (e.g., "Client liked property in agent's territory")

  // Status & Timeline
  status: MatchStatus; // pending, accepted, declined, expired, completed
  createdAt: Date; // When the match was created
  expiresAt: Date; // 24-hour window for agent to respond
  respondedAt?: Date; // When agent responded
  completedAt?: Date; // When deal was closed (if applicable)

  // Agent Response
  agentResponse?: {
    accepted: boolean;
    respondedAt: Date;
    message?: string; // Optional message from agent to client
    autoReply?: boolean; // Was this an auto-reply?
  };

  // Client Context (captured at time of match)
  clientContext?: {
    preferredLocations?: string[]; // Cities/counties client is interested in
    priceRange?: { min: number; max: number };
    bedroomRange?: { min: number; max: number };
    propertyTypes?: string[]; // e.g., ["Single Family Residence", "Condo"]
    clientIntent?: string; // e.g., "first-time buyer", "investor", "relocating"
    urgency?: "low" | "medium" | "high"; // How soon they want to buy/sell
  };

  // Agent Context (captured at time of match)
  agentContext?: {
    specializations?: string[]; // e.g., ["Luxury Homes", "First-Time Buyers"]
    serviceAreas?: string[]; // Cities/counties agent serves
    languages?: string[]; // Languages agent speaks
    yearsExperience?: number;
    averageRating?: number;
    totalDeals?: number;
  };

  // Fee Agreement (if match converts to deal)
  feeAgreement?: {
    swipeMatchFee: {
      percentage: number; // 15% to ChatRealty
      agreed: boolean;
    };
    dataBrokerFee?: {
      percentage: number; // 5% to data broker (if applicable)
      dataBrokerId?: mongoose.Types.ObjectId;
    };
    acknowledged: boolean; // Agent must acknowledge fees
    acknowledgedAt?: Date;
  };

  // Communication Log
  communications?: Array<{
    fromUserId: mongoose.Types.ObjectId;
    toUserId: mongoose.Types.ObjectId;
    message: string;
    sentAt: Date;
    channel: "in_app" | "email" | "sms" | "phone";
    read: boolean;
    readAt?: Date;
  }>;

  // Conversion Tracking
  convertedToTransaction?: boolean;
  transactionId?: mongoose.Types.ObjectId; // Reference to Transaction if deal closed
  representationAgreementSigned?: boolean;
  representationAgreementSignedAt?: Date;

  // Analytics
  analytics?: {
    clientProfileViews?: number; // How many times agent viewed client profile
    agentProfileViews?: number; // How many times client viewed agent profile
    messagesExchanged?: number;
    phoneCallsMade?: number;
    meetingsScheduled?: number;
    propertiesViewed?: number; // Properties shown to client
  };

  // Notifications
  notifications?: {
    clientNotified: boolean; // Was client notified of match?
    clientNotifiedAt?: Date;
    agentNotified: boolean; // Was agent notified of match?
    agentNotifiedAt?: Date;
    remindersSent: number; // How many reminder notifications sent
    lastReminderAt?: Date;
  };

  // Metadata
  updatedAt: Date;
}

const AgentMatchSchema = new Schema<IAgentMatch>(
  {
    // Core Match Data
    clientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    agentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", index: true },

    // Match Context
    listingKey: { type: String, index: true },
    propertyAddress: String,
    propertyCity: String,
    propertyCounty: String,
    propertyState: String,

    // Match Metadata
    matchScore: { type: Number, min: 0, max: 100 },
    initiatedBy: {
      type: String,
      enum: ["client", "system", "agent"],
      required: true,
      default: "client",
    },
    matchReason: String,

    // Status & Timeline
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "expired", "completed"],
      default: "pending",
      index: true,
    },
    expiresAt: { type: Date, required: true, index: true },
    respondedAt: Date,
    completedAt: Date,

    // Agent Response
    agentResponse: {
      accepted: Boolean,
      respondedAt: Date,
      message: String,
      autoReply: { type: Boolean, default: false },
    },

    // Client Context
    clientContext: {
      preferredLocations: [String],
      priceRange: {
        min: Number,
        max: Number,
      },
      bedroomRange: {
        min: Number,
        max: Number,
      },
      propertyTypes: [String],
      clientIntent: String,
      urgency: { type: String, enum: ["low", "medium", "high"] },
    },

    // Agent Context
    agentContext: {
      specializations: [String],
      serviceAreas: [String],
      languages: [String],
      yearsExperience: Number,
      averageRating: Number,
      totalDeals: Number,
    },

    // Fee Agreement
    feeAgreement: {
      swipeMatchFee: {
        percentage: { type: Number, default: 15 },
        agreed: { type: Boolean, default: false },
      },
      dataBrokerFee: {
        percentage: { type: Number, default: 5 },
        dataBrokerId: { type: Schema.Types.ObjectId },
      },
      acknowledged: { type: Boolean, default: false },
      acknowledgedAt: Date,
    },

    // Communication Log
    communications: [{
      fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      toUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      message: { type: String, required: true },
      sentAt: { type: Date, default: Date.now },
      channel: { type: String, enum: ["in_app", "email", "sms", "phone"], default: "in_app" },
      read: { type: Boolean, default: false },
      readAt: Date,
    }],

    // Conversion Tracking
    convertedToTransaction: { type: Boolean, default: false },
    transactionId: { type: Schema.Types.ObjectId, ref: "Transaction" },
    representationAgreementSigned: { type: Boolean, default: false },
    representationAgreementSignedAt: Date,

    // Analytics
    analytics: {
      clientProfileViews: { type: Number, default: 0 },
      agentProfileViews: { type: Number, default: 0 },
      messagesExchanged: { type: Number, default: 0 },
      phoneCallsMade: { type: Number, default: 0 },
      meetingsScheduled: { type: Number, default: 0 },
      propertiesViewed: { type: Number, default: 0 },
    },

    // Notifications
    notifications: {
      clientNotified: { type: Boolean, default: false },
      clientNotifiedAt: Date,
      agentNotified: { type: Boolean, default: false },
      agentNotifiedAt: Date,
      remindersSent: { type: Number, default: 0 },
      lastReminderAt: Date,
    },
  },
  {
    timestamps: true,
    collection: "agentmatches",
  }
);

// Indexes for performance
AgentMatchSchema.index({ clientId: 1, status: 1 }); // Find client's matches by status
AgentMatchSchema.index({ agentId: 1, status: 1 }); // Find agent's matches by status
AgentMatchSchema.index({ teamId: 1, status: 1 }); // Find team's matches
AgentMatchSchema.index({ expiresAt: 1 }); // Find expiring matches (for cron job)
AgentMatchSchema.index({ status: 1, createdAt: -1 }); // Sort by recent pending matches
AgentMatchSchema.index({ convertedToTransaction: 1 }); // Find converted matches
AgentMatchSchema.index({ listingKey: 1 }); // Find matches by listing
AgentMatchSchema.index({ createdAt: -1 }); // Sort by most recent

// Compound index for agent dashboard queries
AgentMatchSchema.index({ agentId: 1, status: 1, createdAt: -1 });

// Pre-save hook to set expiration date (24 hours from creation)
AgentMatchSchema.pre("save", function(next) {
  if (this.isNew && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  }
  next();
});

// Static method to find expiring matches (for notifications)
AgentMatchSchema.statics.findExpiring = async function(hoursUntilExpiration: number = 2) {
  const expirationThreshold = new Date(Date.now() + hoursUntilExpiration * 60 * 60 * 1000);
  return this.find({
    status: "pending",
    expiresAt: { $lte: expirationThreshold, $gt: new Date() },
  });
};

// Static method to auto-expire matches (run via cron job)
AgentMatchSchema.statics.autoExpireMatches = async function() {
  const result = await this.updateMany(
    {
      status: "pending",
      expiresAt: { $lte: new Date() },
    },
    {
      $set: { status: "expired" },
    }
  );
  return result;
};

// Instance method to accept match
AgentMatchSchema.methods.acceptMatch = async function(message?: string) {
  this.status = "accepted";
  this.respondedAt = new Date();
  this.agentResponse = {
    accepted: true,
    respondedAt: new Date(),
    message,
    autoReply: false,
  };
  await this.save();
};

// Instance method to decline match
AgentMatchSchema.methods.declineMatch = async function(message?: string) {
  this.status = "declined";
  this.respondedAt = new Date();
  this.agentResponse = {
    accepted: false,
    respondedAt: new Date(),
    message,
    autoReply: false,
  };
  await this.save();
};

// Export model
export default (mongoose.models.AgentMatch ||
  mongoose.model<IAgentMatch>("AgentMatch", AgentMatchSchema)) as Model<IAgentMatch>;
