// src/models/Team.ts
// Team model for multi-level team hierarchy

import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITeam extends Document {
  _id: mongoose.Types.ObjectId;

  // Instance methods
  addAgent(userId: mongoose.Types.ObjectId): Promise<void>;
  removeAgent(userId: mongoose.Types.ObjectId): Promise<void>;
  addPendingApplication(userId: mongoose.Types.ObjectId): Promise<void>;
  removePendingApplication(userId: mongoose.Types.ObjectId): Promise<void>;

  // Team Info
  name: string;
  slug?: string; // URL-friendly version (e.g., "sardella-team")
  description?: string;
  logo?: string;

  // Hierarchy
  teamLeader: mongoose.Types.ObjectId; // Reference to User
  parentTeam?: mongoose.Types.ObjectId; // For multi-level hierarchy (team under another team)

  // Members (legacy - kept for backwards compatibility)
  agents: mongoose.Types.ObjectId[]; // References to Users with realEstateAgent role

  // MULTI-TENANT: Detailed Members with Roles & Permissions
  members?: Array<{
    userId: mongoose.Types.ObjectId; // Reference to User
    role: "leader" | "agent" | "assistant"; // Team role
    joinedAt: Date;
    status: "active" | "inactive" | "removed";
    permissions?: {
      canEditProfile: boolean;
      canManageMembers: boolean;
      canViewAnalytics: boolean;
      canManageBlog: boolean;
    };
  }>;

  // Pending Applications
  pendingApplications: mongoose.Types.ObjectId[]; // References to Users with applications

  // MULTI-TENANT: Data Broker Rights
  dataBrokerRights?: boolean; // First agent to add MLS data gets data broker status

  // MULTI-TENANT: MLS Data Sources
  mlsDataSources?: Array<{
    name: string; // e.g., "CRMLS"
    mlsId: string; // MLS ID
    coverage: {
      type: "MultiPolygon"; // GeoJSON type
      coordinates: any[][]; // GeoJSON coordinates
      cities: string[];
      counties: string[];
      states: string[];
    };
    listingCount: number; // Total listings contributed by this team
    lastSyncedAt: Date;
    status: "active" | "inactive" | "pending";
  }>;

  // MULTI-TENANT: Brokerage Info
  brokerageName?: string;
  brokerageAddress?: string;
  brokerageLicense?: string;

  // MULTI-TENANT: Contact Info
  officePhone?: string;
  officeEmail?: string;
  officeAddress?: string;

  // MULTI-TENANT: Service Areas
  serviceAreas?: Array<{
    name: string;
    type: "city" | "county" | "zip" | "custom";
    geoJson?: any; // GeoJSON polygon
  }>;

  // Settings
  isActive: boolean;
  autoApprove: boolean; // Auto-approve agents to this team (future feature)
  status?: "active" | "inactive" | "suspended"; // Multi-tenant status

  // Metrics (cached for performance)
  totalAgents: number;
  totalClients: number;

  // MULTI-TENANT: Extended Stats
  stats?: {
    activeListings?: number;
    totalDealsCompleted?: number;
    totalVolume?: number; // Total $ value of deals
    averageRating?: number; // Average of all team member ratings
  };

  // MULTI-TENANT: Shared Content
  sharedBlogPosts?: mongoose.Types.ObjectId[]; // References to BlogPost model

  // MULTI-TENANT: Revenue Tracking
  revenueTracking?: {
    totalDataBrokerFees: number; // 5% passive income from deals using their MLS data
    lastCalculatedAt: Date;
  };

  // Metadata
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true },
    slug: { type: String, unique: true, sparse: true, lowercase: true },
    description: { type: String },
    logo: { type: String },

    teamLeader: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    parentTeam: {
      type: Schema.Types.ObjectId,
      ref: "Team",
    },

    // Legacy agents array
    agents: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // MULTI-TENANT: Detailed members with roles
    members: [{
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      role: { type: String, enum: ["leader", "agent", "assistant"], default: "agent" },
      joinedAt: { type: Date, default: Date.now },
      status: { type: String, enum: ["active", "inactive", "removed"], default: "active" },
      permissions: {
        canEditProfile: { type: Boolean, default: false },
        canManageMembers: { type: Boolean, default: false },
        canViewAnalytics: { type: Boolean, default: true },
        canManageBlog: { type: Boolean, default: false },
      },
    }],

    pendingApplications: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // MULTI-TENANT: Data Broker Rights
    dataBrokerRights: { type: Boolean, default: false },

    // MULTI-TENANT: MLS Data Sources
    mlsDataSources: [{
      name: String,
      mlsId: String,
      coverage: {
        type: { type: String, default: "MultiPolygon" },
        coordinates: [[Schema.Types.Mixed]],
        cities: [String],
        counties: [String],
        states: [String],
      },
      listingCount: { type: Number, default: 0 },
      lastSyncedAt: Date,
      status: { type: String, enum: ["active", "inactive", "pending"], default: "pending" },
    }],

    // MULTI-TENANT: Brokerage Info
    brokerageName: String,
    brokerageAddress: String,
    brokerageLicense: String,

    // MULTI-TENANT: Contact Info
    officePhone: String,
    officeEmail: String,
    officeAddress: String,

    // MULTI-TENANT: Service Areas
    serviceAreas: [{
      name: String,
      type: { type: String, enum: ["city", "county", "zip", "custom"] },
      geoJson: Schema.Types.Mixed,
    }],

    isActive: { type: Boolean, default: true },
    autoApprove: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "inactive", "suspended"], default: "active" },

    totalAgents: { type: Number, default: 0 },
    totalClients: { type: Number, default: 0 },

    // MULTI-TENANT: Extended Stats
    stats: {
      activeListings: { type: Number, default: 0 },
      totalDealsCompleted: { type: Number, default: 0 },
      totalVolume: { type: Number, default: 0 },
      averageRating: Number,
    },

    // MULTI-TENANT: Shared Content
    sharedBlogPosts: [{ type: Schema.Types.ObjectId, ref: "BlogPost" }],

    // MULTI-TENANT: Revenue Tracking
    revenueTracking: {
      totalDataBrokerFees: { type: Number, default: 0 },
      lastCalculatedAt: Date,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "teams",
  }
);

// Indexes for performance
TeamSchema.index({ teamLeader: 1 });
TeamSchema.index({ parentTeam: 1 });
TeamSchema.index({ isActive: 1 });
TeamSchema.index({ agents: 1 });

// MULTI-TENANT: Indexes for new fields
TeamSchema.index({ slug: 1 }, { unique: true, sparse: true });
TeamSchema.index({ "members.userId": 1 });
TeamSchema.index({ status: 1 });
TeamSchema.index({ dataBrokerRights: 1 }); // Find data broker teams
TeamSchema.index({ "mlsDataSources.status": 1 });

// Helper methods
TeamSchema.methods.addAgent = async function (userId: mongoose.Types.ObjectId) {
  if (!this.agents.includes(userId)) {
    this.agents.push(userId);
    this.totalAgents = this.agents.length;
    await this.save();
  }
};

TeamSchema.methods.removeAgent = async function (userId: mongoose.Types.ObjectId) {
  this.agents = this.agents.filter(
    (id: mongoose.Types.ObjectId) => id.toString() !== userId.toString()
  );
  this.totalAgents = this.agents.length;
  await this.save();
};

TeamSchema.methods.addPendingApplication = async function (userId: mongoose.Types.ObjectId) {
  if (!this.pendingApplications.includes(userId)) {
    this.pendingApplications.push(userId);
    await this.save();
  }
};

TeamSchema.methods.removePendingApplication = async function (userId: mongoose.Types.ObjectId) {
  this.pendingApplications = this.pendingApplications.filter(
    (id: mongoose.Types.ObjectId) => id.toString() !== userId.toString()
  );
  await this.save();
};

// Static method to get team hierarchy (all sub-teams)
TeamSchema.statics.getTeamHierarchy = async function (teamId: mongoose.Types.ObjectId) {
  const team = await this.findById(teamId).populate("agents teamLeader");
  if (!team) return null;

  // Find all sub-teams
  const subTeams = await this.find({ parentTeam: teamId }).populate("agents teamLeader");

  return {
    team,
    subTeams,
  };
};

// MULTI-TENANT: Pre-save hook to generate slug from name if not provided
TeamSchema.pre("save", function(next) {
  if (this.isNew && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  next();
});

// Export model
export default (mongoose.models.Team ||
  mongoose.model<ITeam>("Team", TeamSchema)) as Model<ITeam>;
