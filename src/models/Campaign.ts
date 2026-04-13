import mongoose, { Schema, model, models, Document, Types } from 'mongoose';

export type CampaignType =
  | 'sphere_of_influence'
  | 'past_clients'
  | 'neighborhood_expireds'
  | 'high_equity'
  | 'custom'
  | 'direct_mail'
  | 'digital_ads'
  | 'multi_channel';

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
    directMail: boolean;
    googleAds: boolean;
    metaAds: boolean;
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

  // Thanks.io Direct Mail Config
  thanksioConfig?: {
    mailType: 'postcard_4x6' | 'postcard_6x9' | 'postcard_6x11' | 'letter' | 'notecard';
    frontImageUrl?: string;
    backImageUrl?: string;
    message?: string;
    handwritingStyle?: number;
    qrUrl?: string;
    returnAddress?: {
      name: string;
      address: string;
      city: string;
      state: string;
      zip: string;
    };
    templateId?: string;
  };

  // Google Ads Config
  googleAdsConfig?: {
    campaignId?: string;
    adGroupId?: string;
    budget: number;
    bidStrategy: 'maximize_conversions' | 'maximize_clicks' | 'target_cpa';
    targetCpa?: number;
    geoTargeting: {
      type: 'radius' | 'zip' | 'city';
      center?: { lat: number; lng: number };
      radiusMiles?: number;
      zipCodes?: string[];
      cityIds?: number[];
    };
    landingPageUrl: string;
    adType: 'search' | 'display' | 'performance_max';
    headlines?: string[];
    descriptions?: string[];
    imageUrls?: string[];
    startDate?: Date;
    endDate?: Date;
  };

  // Meta Ads Config
  metaAdsConfig?: {
    campaignId?: string;
    adSetId?: string;
    adId?: string;
    objective: 'OUTCOME_LEADS' | 'OUTCOME_TRAFFIC' | 'OUTCOME_AWARENESS';
    budget: number;
    geoTargeting: {
      type: 'radius' | 'zip';
      center?: { lat: number; lng: number };
      radiusMiles?: number;
      zipCodes?: string[];
    };
    placements: ('facebook_feed' | 'instagram_feed' | 'instagram_stories' | 'instagram_reels' | 'audience_network')[];
    landingPageUrl: string;
    headline?: string;
    primaryText?: string;
    description?: string;
    imageUrl?: string;
    videoUrl?: string;
    callToAction: 'LEARN_MORE' | 'SIGN_UP' | 'GET_OFFER' | 'CONTACT_US';
    customAudienceId?: string;
    lookalikeAudienceId?: string;
    startDate?: Date;
    endDate?: Date;
  };

  // Radius Send Config (thanks.io radius feature)
  radiusConfig?: {
    center: { lat: number; lng: number };
    radiusMiles: number;
    address: string;
  };

  // Analytics
  stats: {
    totalContacts: number;
    scriptsGenerated: number;
    audioGenerated: number;
    sent: number;
    delivered: number;
    listened: number;
    failed: number;
    mailSent: number;
    mailDelivered: number;
    qrScans: number;
    adImpressions: number;
    adClicks: number;
    adConversions: number;
    adSpend: number;
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
        'direct_mail',
        'digital_ads',
        'multi_channel',
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
      directMail: {
        type: Boolean,
        default: false,
      },
      googleAds: {
        type: Boolean,
        default: false,
      },
      metaAds: {
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

    // Thanks.io Direct Mail Config
    thanksioConfig: {
      mailType: {
        type: String,
        enum: ['postcard_4x6', 'postcard_6x9', 'postcard_6x11', 'letter', 'notecard'],
      },
      frontImageUrl: String,
      backImageUrl: String,
      message: String,
      handwritingStyle: Number,
      qrUrl: String,
      returnAddress: {
        name: String,
        address: String,
        city: String,
        state: String,
        zip: String,
      },
      templateId: String,
    },

    // Google Ads Config
    googleAdsConfig: {
      campaignId: String,
      adGroupId: String,
      budget: Number,
      bidStrategy: {
        type: String,
        enum: ['maximize_conversions', 'maximize_clicks', 'target_cpa'],
      },
      targetCpa: Number,
      geoTargeting: {
        type: {
          type: String,
          enum: ['radius', 'zip', 'city'],
        },
        center: {
          lat: Number,
          lng: Number,
        },
        radiusMiles: Number,
        zipCodes: [String],
        cityIds: [Number],
      },
      landingPageUrl: String,
      adType: {
        type: String,
        enum: ['search', 'display', 'performance_max'],
      },
      headlines: [String],
      descriptions: [String],
      imageUrls: [String],
      startDate: Date,
      endDate: Date,
    },

    // Meta Ads Config
    metaAdsConfig: {
      campaignId: String,
      adSetId: String,
      adId: String,
      objective: {
        type: String,
        enum: ['OUTCOME_LEADS', 'OUTCOME_TRAFFIC', 'OUTCOME_AWARENESS'],
      },
      budget: Number,
      geoTargeting: {
        type: {
          type: String,
          enum: ['radius', 'zip'],
        },
        center: {
          lat: Number,
          lng: Number,
        },
        radiusMiles: Number,
        zipCodes: [String],
      },
      placements: [{
        type: String,
        enum: ['facebook_feed', 'instagram_feed', 'instagram_stories', 'instagram_reels', 'audience_network'],
      }],
      landingPageUrl: String,
      headline: String,
      primaryText: String,
      description: String,
      imageUrl: String,
      videoUrl: String,
      callToAction: {
        type: String,
        enum: ['LEARN_MORE', 'SIGN_UP', 'GET_OFFER', 'CONTACT_US'],
      },
      customAudienceId: String,
      lookalikeAudienceId: String,
      startDate: Date,
      endDate: Date,
    },

    // Radius Send Config
    radiusConfig: {
      center: {
        lat: Number,
        lng: Number,
      },
      radiusMiles: Number,
      address: String,
    },

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
      mailSent: {
        type: Number,
        default: 0,
      },
      mailDelivered: {
        type: Number,
        default: 0,
      },
      qrScans: {
        type: Number,
        default: 0,
      },
      adImpressions: {
        type: Number,
        default: 0,
      },
      adClicks: {
        type: Number,
        default: 0,
      },
      adConversions: {
        type: Number,
        default: 0,
      },
      adSpend: {
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

  // Voicemail stats
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

  const voicemailStats = scripts[0] || {
    scriptsGenerated: 0,
    audioGenerated: 0,
    sent: 0,
    delivered: 0,
    listened: 0,
    failed: 0,
  };

  // Direct mail stats
  let mailStats = { mailSent: 0, mailDelivered: 0, qrScans: 0 };
  try {
    const DirectMailPiece = models.DirectMailPiece || model('DirectMailPiece');
    const mailAgg = await DirectMailPiece.aggregate([
      { $match: { campaignId: this._id } },
      {
        $group: {
          _id: null,
          mailSent: {
            $sum: {
              $cond: [{ $in: ['$status', ['submitted', 'printing', 'mailed', 'delivered']] }, 1, 0],
            },
          },
          mailDelivered: {
            $sum: {
              $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0],
            },
          },
          qrScans: {
            $sum: {
              $cond: [{ $ne: ['$qrScannedAt', null] }, 1, 0],
            },
          },
        },
      },
    ]);
    if (mailAgg[0]) mailStats = mailAgg[0];
  } catch {
    // DirectMailPiece model may not be registered yet
  }

  // Ad campaign stats
  let adStats = { adImpressions: 0, adClicks: 0, adConversions: 0, adSpend: 0 };
  try {
    const AdCampaignRecord = models.AdCampaignRecord || model('AdCampaignRecord');
    const adAgg = await AdCampaignRecord.aggregate([
      { $match: { campaignId: this._id } },
      { $sort: { snapshotDate: -1 } },
      {
        $group: {
          _id: '$platform',
          adImpressions: { $first: '$metrics.impressions' },
          adClicks: { $first: '$metrics.clicks' },
          adConversions: { $first: '$metrics.conversions' },
          adSpend: { $first: '$metrics.spend' },
        },
      },
      {
        $group: {
          _id: null,
          adImpressions: { $sum: '$adImpressions' },
          adClicks: { $sum: '$adClicks' },
          adConversions: { $sum: '$adConversions' },
          adSpend: { $sum: '$adSpend' },
        },
      },
    ]);
    if (adAgg[0]) adStats = adAgg[0];
  } catch {
    // AdCampaignRecord model may not be registered yet
  }

  this.stats = {
    totalContacts,
    ...voicemailStats,
    ...mailStats,
    ...adStats,
  };

  await this.save();
};

export default (models.Campaign ||
  model<ICampaign>('Campaign', CampaignSchema)) as mongoose.Model<ICampaign>;
