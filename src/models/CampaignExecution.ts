import mongoose, { Schema, model, models, Document, Types } from 'mongoose';

export type StrategyType = 'voicemail' | 'email' | 'text';

export type ExecutionStatus =
  | 'pending'
  | 'sending'
  | 'sent'
  | 'partially_sent'
  | 'failed'
  | 'completed';

export interface IDropCowboyMetrics {
  // Basic Delivery Metrics
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;

  // Engagement Metrics
  totalListened: number;
  averageListenDuration?: number; // in seconds
  completionRate?: number; // percentage who listened to end

  // Response Metrics
  totalResponses: number;
  responseRate: number; // percentage
  totalCallbacks: number;
  callbackRate: number; // percentage

  // Detailed Status Breakdown
  statusBreakdown: {
    delivered: number;
    failed: number;
    busy: number;
    no_answer: number;
    voicemail_full: number;
    invalid_number: number;
    carrier_rejected: number;
    dnc_listed: number; // Do Not Call list
    other: number;
  };

  // Timing Metrics
  averageDeliveryTime?: number; // in seconds
  firstDeliveryAt?: Date;
  lastDeliveryAt?: Date;

  // Cost Metrics (if Drop Cowboy provides)
  totalCost?: number;
  costPerContact?: number;
}

export interface IEmailMetrics {
  totalSent: number;
  totalDelivered: number;
  totalBounced: number;
  totalOpened: number;
  openRate: number;
  totalClicked: number;
  clickRate: number;
  totalUnsubscribed: number;
  totalSpamReports: number;
}

export interface ISMSMetrics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalResponses: number;
  responseRate: number;
  totalOptOuts: number;
}

export interface ICampaignExecution extends Document {
  _id: Types.ObjectId;

  // Relationships
  campaignId: Types.ObjectId;
  userId: Types.ObjectId;
  teamId?: Types.ObjectId;

  // Execution Details
  strategyType: StrategyType;
  status: ExecutionStatus;

  // Execution Snapshot
  executionSnapshot: {
    campaignName: string;
    campaignType: string;
    totalContacts: number;
    scriptCount: number;
    audioCount?: number; // for voicemail only
  };

  // Results Summary
  results: {
    successCount: number;
    failureCount: number;
    pendingCount: number;
  };

  // Strategy-Specific Metrics
  voicemailMetrics?: IDropCowboyMetrics;
  emailMetrics?: IEmailMetrics;
  smsMetrics?: ISMSMetrics;

  // Individual Contact Results (referenced from VoicemailScript, EmailScript, SMSScript)
  scriptIds: Types.ObjectId[];

  // Timing
  startedAt: Date;
  completedAt?: Date;
  lastUpdatedAt: Date;

  // Error Tracking
  errors?: Array<{
    contactId: Types.ObjectId;
    error: string;
    timestamp: Date;
  }>;

  // Metadata
  metadata?: Record<string, any>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const CampaignExecutionSchema = new Schema<ICampaignExecution>(
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
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      index: true,
    },

    strategyType: {
      type: String,
      enum: ['voicemail', 'email', 'text'],
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['pending', 'sending', 'sent', 'partially_sent', 'failed', 'completed'],
      default: 'pending',
      index: true,
    },

    executionSnapshot: {
      campaignName: {
        type: String,
        required: true,
      },
      campaignType: String,
      totalContacts: {
        type: Number,
        required: true,
      },
      scriptCount: {
        type: Number,
        required: true,
      },
      audioCount: Number,
    },

    results: {
      successCount: {
        type: Number,
        default: 0,
      },
      failureCount: {
        type: Number,
        default: 0,
      },
      pendingCount: {
        type: Number,
        default: 0,
      },
    },

    // Voicemail Metrics (Drop Cowboy)
    voicemailMetrics: {
      totalSent: { type: Number, default: 0 },
      totalDelivered: { type: Number, default: 0 },
      totalFailed: { type: Number, default: 0 },
      totalListened: { type: Number, default: 0 },
      averageListenDuration: Number,
      completionRate: Number,
      totalResponses: { type: Number, default: 0 },
      responseRate: { type: Number, default: 0 },
      totalCallbacks: { type: Number, default: 0 },
      callbackRate: { type: Number, default: 0 },
      statusBreakdown: {
        delivered: { type: Number, default: 0 },
        failed: { type: Number, default: 0 },
        busy: { type: Number, default: 0 },
        no_answer: { type: Number, default: 0 },
        voicemail_full: { type: Number, default: 0 },
        invalid_number: { type: Number, default: 0 },
        carrier_rejected: { type: Number, default: 0 },
        dnc_listed: { type: Number, default: 0 },
        other: { type: Number, default: 0 },
      },
      averageDeliveryTime: Number,
      firstDeliveryAt: Date,
      lastDeliveryAt: Date,
      totalCost: Number,
      costPerContact: Number,
    },

    // Email Metrics (Resend)
    emailMetrics: {
      totalSent: { type: Number, default: 0 },
      totalDelivered: { type: Number, default: 0 },
      totalBounced: { type: Number, default: 0 },
      totalOpened: { type: Number, default: 0 },
      openRate: { type: Number, default: 0 },
      totalClicked: { type: Number, default: 0 },
      clickRate: { type: Number, default: 0 },
      totalUnsubscribed: { type: Number, default: 0 },
      totalSpamReports: { type: Number, default: 0 },
    },

    // SMS Metrics
    smsMetrics: {
      totalSent: { type: Number, default: 0 },
      totalDelivered: { type: Number, default: 0 },
      totalFailed: { type: Number, default: 0 },
      totalResponses: { type: Number, default: 0 },
      responseRate: { type: Number, default: 0 },
      totalOptOuts: { type: Number, default: 0 },
    },

    scriptIds: [{
      type: Schema.Types.ObjectId,
      refPath: 'strategyType',
    }],

    startedAt: {
      type: Date,
      required: true,
      index: true,
    },
    completedAt: Date,
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },

    errors: [{
      contactId: {
        type: Schema.Types.ObjectId,
        ref: 'Contact',
      },
      error: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
    }],

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
CampaignExecutionSchema.index({ campaignId: 1, strategyType: 1 });
CampaignExecutionSchema.index({ userId: 1, startedAt: -1 });
CampaignExecutionSchema.index({ status: 1, startedAt: -1 });
CampaignExecutionSchema.index({ startedAt: -1 }); // For time-based analytics

// Virtual for campaign details
CampaignExecutionSchema.virtual('campaign', {
  ref: 'Campaign',
  localField: 'campaignId',
  foreignField: '_id',
  justOne: true,
});

// Methods
CampaignExecutionSchema.methods.updateMetrics = async function (metrics: Partial<IDropCowboyMetrics | IEmailMetrics | ISMSMetrics>) {
  if (this.strategyType === 'voicemail') {
    this.voicemailMetrics = { ...this.voicemailMetrics, ...metrics };
  } else if (this.strategyType === 'email') {
    this.emailMetrics = { ...this.emailMetrics, ...metrics };
  } else if (this.strategyType === 'text') {
    this.smsMetrics = { ...this.smsMetrics, ...metrics };
  }

  this.lastUpdatedAt = new Date();
  return this.save();
};

CampaignExecutionSchema.methods.markCompleted = function () {
  this.status = 'completed';
  this.completedAt = new Date();
  this.lastUpdatedAt = new Date();
  return this.save();
};

CampaignExecutionSchema.methods.markFailed = function (error: string) {
  this.status = 'failed';
  this.lastUpdatedAt = new Date();
  if (error) {
    this.errors = this.errors || [];
    this.errors.push({
      contactId: null,
      error,
      timestamp: new Date(),
    } as any);
  }
  return this.save();
};

// Static methods
CampaignExecutionSchema.statics.getExecutionHistory = async function (
  campaignId: Types.ObjectId,
  strategyType?: StrategyType
) {
  const query: any = { campaignId };
  if (strategyType) {
    query.strategyType = strategyType;
  }
  return this.find(query).sort({ startedAt: -1 });
};

CampaignExecutionSchema.statics.getAnalyticsByTimeRange = async function (
  userId: Types.ObjectId,
  startDate: Date,
  endDate: Date,
  strategyType?: StrategyType
) {
  const query: any = {
    userId,
    startedAt: {
      $gte: startDate,
      $lte: endDate,
    },
  };

  if (strategyType) {
    query.strategyType = strategyType;
  }

  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$strategyType',
        totalExecutions: { $sum: 1 },
        totalContactsReached: { $sum: '$executionSnapshot.totalContacts' },
        totalSuccesses: { $sum: '$results.successCount' },
        totalFailures: { $sum: '$results.failureCount' },
        totalDelivered: {
          $sum: {
            $cond: {
              if: { $eq: ['$strategyType', 'voicemail'] },
              then: '$voicemailMetrics.totalDelivered',
              else: {
                $cond: {
                  if: { $eq: ['$strategyType', 'email'] },
                  then: '$emailMetrics.totalDelivered',
                  else: '$smsMetrics.totalDelivered',
                },
              },
            },
          },
        },
        totalResponses: {
          $sum: {
            $cond: {
              if: { $eq: ['$strategyType', 'voicemail'] },
              then: '$voicemailMetrics.totalResponses',
              else: {
                $cond: {
                  if: { $eq: ['$strategyType', 'email'] },
                  then: { $add: ['$emailMetrics.totalOpened', '$emailMetrics.totalClicked'] },
                  else: '$smsMetrics.totalResponses',
                },
              },
            },
          },
        },
      },
    },
  ]);
};

export default models.CampaignExecution ||
  model<ICampaignExecution>('CampaignExecution', CampaignExecutionSchema);
