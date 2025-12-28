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
  description?: string;
  logo?: string;

  // Hierarchy
  teamLeader: mongoose.Types.ObjectId; // Reference to User
  parentTeam?: mongoose.Types.ObjectId; // For multi-level hierarchy (team under another team)

  // Members
  agents: mongoose.Types.ObjectId[]; // References to Users with realEstateAgent role

  // Pending Applications
  pendingApplications: mongoose.Types.ObjectId[]; // References to Users with applications

  // Settings
  isActive: boolean;
  autoApprove: boolean; // Auto-approve agents to this team (future feature)

  // Metrics (cached for performance)
  totalAgents: number;
  totalClients: number;

  // Metadata
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true },
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

    agents: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    pendingApplications: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    isActive: { type: Boolean, default: true },
    autoApprove: { type: Boolean, default: false },

    totalAgents: { type: Number, default: 0 },
    totalClients: { type: Number, default: 0 },

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

// Export model
const Team: Model<ITeam> = mongoose.models.Team || mongoose.model<ITeam>("Team", TeamSchema);

export default Team;
