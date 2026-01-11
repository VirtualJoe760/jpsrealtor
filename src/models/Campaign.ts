import mongoose, { Schema, model, models, Document, Types } from 'mongoose';

export type CampaignType =
  | 'sphere_of_influence'
  | 'past_clients'
  | 'neighborhood_expireds'
  | 'high_equity'
  | 'custom';

export type CampaignStatus =
  | 'draft'
  | 'importing_contacts'
  | 'generating_scripts'
  | 'generating_audio'
  | 'review'
  | 'approved'
  | 'submitted'
  | 'active'
  | 'completed'
  | 'failed';

export interface ICampaign extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  teamId?: Types.ObjectId;

  // Campaign Identity
  name: string;
  description?: string;
  type: CampaignType;
  neighborhood?: string;

  // Active Strategies
  activeStrategies: {
    voicemail: boolean;
    email: boolean;
    text: boolean;
  };

  // Campaign Status
  status: CampaignStatus;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  completedAt?: Date;

  // Script Configuration
  scriptTemplate?: string;
  scriptVariables?: Record<string, any>;

  // Drop Cowboy Integration
  dropCowboyConfig: {
    campaignId?: string;
    callerId?: string;
    retryAttempts?: number;
    scheduleConfig?: {
      startDate?: Date;
      endDate?: Date;
      timeWindows?: Array<{ start: string; end: string }>;
    };
  };

  // Voicemail Mode (Simple vs Full Pipeline)
  voicemailMode?: 'simple' | 'full';
  selectedRecordingId?: string;
  selectedRecordingName?: string;

  // Analytics
  stats: {
    totalContacts: number;
    scriptsGenerated: number;
    audioGenerated: number;
    sent: number;
    delivered: number;
    listened: number;
    failed: number;
  };

  // Anti-Spam Tracking
  duplicateCheckResults?: {
    totalDuplicates: number;
    duplicateContactIds: Types.ObjectId[];
    conflictingCampaigns: Array<{
      campaignId: Types.ObjectId;
      campaignName: string;
      contactIds: Types.ObjectId[];
    }>;
  };
}

const CampaignSchema = new Schema<ICampaign>(
  {
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

    // Campaign Identity
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'sphere_of_influence',
        'past_clients',
        'neighborhood_expireds',
        'high_equity',
        'custom',
      ],
      required: true,
    },
    neighborhood: {
      type: String,
      trim: true,
    },

    // Active Strategies
    activeStrategies: {
      voicemail: {
        type: Boolean,
        default: false,
      },
      email: {
        type: Boolean,
        default: false,
      },
      text: {
        type: Boolean,
        default: false,
      },
    },

    // Campaign Status
    status: {
      type: String,
      enum: [
        'draft',
        'importing_contacts',
        'generating_scripts',
        'generating_audio',
        'review',
        'approved',
        'submitted',
        'active',
        'completed',
        'failed',
      ],
      default: 'draft',
      index: true,
    },

    // Timestamps
    submittedAt: Date,
    completedAt: Date,

    // Script Configuration
    scriptTemplate: String,
    scriptVariables: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // Drop Cowboy Integration
    dropCowboyConfig: {
      campaignId: String,
      callerId: String,
      retryAttempts: {
        type: Number,
        default: 3,
      },
      scheduleConfig: {
        startDate: Date,
        endDate: Date,
        timeWindows: [
          {
            start: String,
            end: String,
          },
        ],
      },
    },

    // Voicemail Mode (Simple vs Full Pipeline)
    voicemailMode: {
      type: String,
      enum: ['simple', 'full'],
    },
    selectedRecordingId: String,
    selectedRecordingName: String,

    // Analytics
    stats: {
      totalContacts: {
        type: Number,
        default: 0,
      },
      scriptsGenerated: {
        type: Number,
        default: 0,
      },
      audioGenerated: {
        type: Number,
        default: 0,
      },
      sent: {
        type: Number,
        default: 0,
      },
      delivered: {
        type: Number,
        default: 0,
      },
      listened: {
        type: Number,
        default: 0,
      },
      failed: {
        type: Number,
        default: 0,
      },
    },

    // Anti-Spam Tracking
    duplicateCheckResults: {
      totalDuplicates: Number,
      duplicateContactIds: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Contact',
        },
      ],
      conflictingCampaigns: [
        {
          campaignId: {
            type: Schema.Types.ObjectId,
            ref: 'Campaign',
          },
          campaignName: String,
          contactIds: [
            {
              type: Schema.Types.ObjectId,
              ref: 'Contact',
            },
          ],
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
CampaignSchema.index({ userId: 1, status: 1 });
CampaignSchema.index({ userId: 1, type: 1 });
CampaignSchema.index({ userId: 1, createdAt: -1 });
CampaignSchema.index({ 'dropCowboyConfig.campaignId': 1 });

// Virtual for contact count from ContactCampaign junction
CampaignSchema.virtual('contacts', {
  ref: 'ContactCampaign',
  localField: '_id',
  foreignField: 'campaignId',
});

// Methods
CampaignSchema.methods.updateStats = async function () {
  const ContactCampaign = models.ContactCampaign || model('ContactCampaign');
  const VoicemailScript = models.VoicemailScript || model('VoicemailScript');

  const totalContacts = await ContactCampaign.countDocuments({
    campaignId: this._id,
  });

  const scripts = await VoicemailScript.aggregate([
    { $match: { campaignId: this._id } },
    {
      $group: {
        _id: null,
        scriptsGenerated: { $sum: 1 },
        audioGenerated: {
          $sum: {
            $cond: [{ $eq: ['$audio.status', 'completed'] }, 1, 0],
          },
        },
        sent: {
          $sum: {
            $cond: [
              { $in: ['$delivery.status', ['sent', 'delivered', 'listened']] },
              1,
              0,
            ],
          },
        },
        delivered: {
          $sum: {
            $cond: [
              { $in: ['$delivery.status', ['delivered', 'listened']] },
              1,
              0,
            ],
          },
        },
        listened: {
          $sum: {
            $cond: [{ $eq: ['$delivery.status', 'listened'] }, 1, 0],
          },
        },
        failed: {
          $sum: {
            $cond: [{ $eq: ['$delivery.status', 'failed'] }, 1, 0],
          },
        },
      },
    },
  ]);

  const stats = scripts[0] || {
    scriptsGenerated: 0,
    audioGenerated: 0,
    sent: 0,
    delivered: 0,
    listened: 0,
    failed: 0,
  };

  this.stats = {
    totalContacts,
    ...stats,
  };

  await this.save();
};

export default (models.Campaign ||
  model<ICampaign>('Campaign', CampaignSchema)) as mongoose.Model<ICampaign>;
