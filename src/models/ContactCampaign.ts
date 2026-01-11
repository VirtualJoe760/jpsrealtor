import mongoose, { Schema, model, models, Document, Types } from 'mongoose';

export type ContactSource =
  | 'title_rep'
  | 'google_contacts'
  | 'database'
  | 'mojo_dialer'
  | 'manual'
  | 'csv_import'
  | 'api_integration';

export type ContactCampaignStatus =
  | 'pending'
  | 'script_generated'
  | 'audio_generated'
  | 'approved'
  | 'sent'
  | 'delivered'
  | 'failed';

export interface IContactCampaign extends Document {
  _id: Types.ObjectId;
  contactId: Types.ObjectId;
  campaignId: Types.ObjectId;
  userId: Types.ObjectId;

  // Contact Source Tracking
  source: ContactSource;
  importBatchId?: Types.ObjectId;

  // Status
  status: ContactCampaignStatus;

  // Anti-Spam Flags
  isDuplicate: boolean;
  duplicateCampaigns?: Types.ObjectId[];
  lastSentDate?: Date;
  daysSinceLastContact?: number;

  // Timestamps
  addedAt: Date;
  updatedAt: Date;
}

const ContactCampaignSchema = new Schema<IContactCampaign>(
  {
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      required: true,
      index: true,
    },
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

    // Contact Source Tracking
    source: {
      type: String,
      enum: [
        'title_rep',
        'google_contacts',
        'database',
        'mojo_dialer',
        'manual',
        'csv_import',
        'api_integration',
      ],
      required: true,
    },
    importBatchId: {
      type: Schema.Types.ObjectId,
      ref: 'ImportBatch',
      index: true,
    },

    // Status
    status: {
      type: String,
      enum: [
        'pending',
        'script_generated',
        'audio_generated',
        'approved',
        'sent',
        'delivered',
        'failed',
      ],
      default: 'pending',
      index: true,
    },

    // Anti-Spam Flags
    isDuplicate: {
      type: Boolean,
      default: false,
      index: true,
    },
    duplicateCampaigns: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Campaign',
      },
    ],
    lastSentDate: Date,
    daysSinceLastContact: Number,

    // Timestamps
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
ContactCampaignSchema.index({ campaignId: 1, status: 1 });
ContactCampaignSchema.index({ contactId: 1, campaignId: 1 }, { unique: true });
ContactCampaignSchema.index({ userId: 1, campaignId: 1 });
ContactCampaignSchema.index({ importBatchId: 1 });

// Virtual for contact details
ContactCampaignSchema.virtual('contact', {
  ref: 'Contact',
  localField: 'contactId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for campaign details
ContactCampaignSchema.virtual('campaign', {
  ref: 'Campaign',
  localField: 'campaignId',
  foreignField: '_id',
  justOne: true,
});

// Methods
ContactCampaignSchema.methods.updateDaysSinceLastContact = function () {
  if (this.lastSentDate) {
    const now = new Date();
    const diff = now.getTime() - this.lastSentDate.getTime();
    this.daysSinceLastContact = Math.floor(diff / (1000 * 60 * 60 * 24));
  }
  return this;
};

ContactCampaignSchema.methods.markAsDuplicate = function (
  otherCampaignIds: Types.ObjectId[]
) {
  this.isDuplicate = true;
  this.duplicateCampaigns = otherCampaignIds;
  return this.save();
};

ContactCampaignSchema.methods.markAsSent = function () {
  this.status = 'sent';
  this.lastSentDate = new Date();
  this.updateDaysSinceLastContact();
  return this.save();
};

// Static methods
ContactCampaignSchema.statics.findDuplicates = async function (
  contactId: Types.ObjectId,
  excludeCampaignId?: Types.ObjectId
) {
  const query: any = { contactId };
  if (excludeCampaignId) {
    query.campaignId = { $ne: excludeCampaignId };
  }
  return this.find(query).populate('campaignId', 'name type createdAt');
};

ContactCampaignSchema.statics.checkIfContactInCampaign = async function (
  contactId: Types.ObjectId,
  campaignId: Types.ObjectId
) {
  const exists = await this.findOne({ contactId, campaignId });
  return !!exists;
};

ContactCampaignSchema.statics.getCampaignContacts = async function (
  campaignId: Types.ObjectId,
  status?: ContactCampaignStatus
) {
  const query: any = { campaignId };
  if (status) query.status = status;
  return this.find(query).populate('contactId');
};

ContactCampaignSchema.statics.getContactCampaigns = async function (
  contactId: Types.ObjectId
) {
  return this.find({ contactId })
    .populate('campaignId', 'name type createdAt status')
    .sort({ addedAt: -1 });
};

export default (models.ContactCampaign ||
  model<IContactCampaign>('ContactCampaign', ContactCampaignSchema)) as mongoose.Model<IContactCampaign>;
