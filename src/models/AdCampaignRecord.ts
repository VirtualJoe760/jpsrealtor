import mongoose, { Schema, model, models, Document, Types } from 'mongoose';

export type AdPlatform = 'google' | 'meta';

export type AdCampaignStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'paused'
  | 'completed'
  | 'rejected';

export interface IAdCampaignRecord extends Document {
  _id: Types.ObjectId;
  campaignId: Types.ObjectId;
  userId: Types.ObjectId;
  platform: AdPlatform;

  // Platform IDs
  externalCampaignId: string;
  externalAdGroupId?: string;
  externalAdSetId?: string;
  externalAdId?: string;

  // Performance metrics
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    ctr: number;
    cpc: number;
    cpa: number;
  };

  // Daily budget (USD) at launch — source of truth for live spend computation.
  // Lives here (not Campaign.*Config) so deleting/archiving a record actually
  // removes its contribution to the "Daily Ad Spend" summary on the Strategy tab.
  dailyBudget: number;

  // Status
  status: AdCampaignStatus;

  // Snapshot date (for time-series tracking)
  snapshotDate: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const AdCampaignRecordSchema = new Schema<IAdCampaignRecord>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ['google', 'meta'],
      required: true,
    },

    // Platform IDs
    externalCampaignId: {
      type: String,
      required: true,
    },
    externalAdGroupId: String,
    externalAdSetId: String,
    externalAdId: String,

    // Performance metrics
    metrics: {
      impressions: {
        type: Number,
        default: 0,
      },
      clicks: {
        type: Number,
        default: 0,
      },
      conversions: {
        type: Number,
        default: 0,
      },
      spend: {
        type: Number,
        default: 0,
      },
      ctr: {
        type: Number,
        default: 0,
      },
      cpc: {
        type: Number,
        default: 0,
      },
      cpa: {
        type: Number,
        default: 0,
      },
    },

    // Daily budget (USD) at launch
    dailyBudget: {
      type: Number,
      default: 0,
    },

    // Status
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'active', 'paused', 'completed', 'rejected'],
      default: 'draft',
      index: true,
    },

    // Snapshot date
    snapshotDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
AdCampaignRecordSchema.index({ campaignId: 1, platform: 1, snapshotDate: -1 });
AdCampaignRecordSchema.index({ userId: 1, platform: 1 });
AdCampaignRecordSchema.index({ externalCampaignId: 1, platform: 1 });

export default (models.AdCampaignRecord ||
  model<IAdCampaignRecord>('AdCampaignRecord', AdCampaignRecordSchema)) as mongoose.Model<IAdCampaignRecord>;
