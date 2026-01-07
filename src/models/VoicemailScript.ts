import mongoose, { Schema, model, models, Document, Types } from 'mongoose';

export type ScriptGeneratedBy = 'ai' | 'manual' | 'template';
export type AudioStatus = 'pending' | 'generating' | 'completed' | 'failed';
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'needs_revision';
export type DeliveryStatus =
  | 'not_sent'
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'listened';

export interface IVoicemailScript extends Document {
  _id: Types.ObjectId;
  campaignId: Types.ObjectId;
  contactId?: Types.ObjectId; // Optional for general scripts
  userId: Types.ObjectId;

  // Script Content
  script: string;
  scriptVersion: number;
  isGeneral?: boolean; // True if this is a general script for all contacts

  // Script Generation
  generatedBy: ScriptGeneratedBy;
  aiModel?: string;
  generationPrompt?: string;

  // Audio Generation (11 Labs)
  audio: {
    status: AudioStatus;
    url?: string;
    elevenLabsId?: string;
    voiceId?: string;
    duration?: number;
    generatedAt?: Date;
    error?: string;
  };

  // Review Status
  reviewStatus: ReviewStatus;
  reviewNotes?: string;
  reviewedAt?: Date;

  // Delivery Tracking (from Drop Cowboy webhook)
  delivery: {
    status: DeliveryStatus;
    dropCowboyMessageId?: string;
    sentAt?: Date;
    deliveredAt?: Date;
    listenedAt?: Date;
    failureReason?: string;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const VoicemailScriptSchema = new Schema<IVoicemailScript>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      required: false, // Optional for general scripts
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Script Content
    script: {
      type: String,
      required: true,
    },
    scriptVersion: {
      type: Number,
      default: 1,
    },
    isGeneral: {
      type: Boolean,
      default: false,
    },

    // Script Generation
    generatedBy: {
      type: String,
      enum: ['ai', 'manual', 'template'],
      required: true,
    },
    aiModel: String,
    generationPrompt: String,

    // Audio Generation (11 Labs)
    audio: {
      status: {
        type: String,
        enum: ['pending', 'generating', 'completed', 'failed'],
        default: 'pending',
      },
      url: String,
      elevenLabsId: String,
      voiceId: String,
      duration: Number,
      generatedAt: Date,
      error: String,
    },

    // Review Status
    reviewStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'needs_revision'],
      default: 'pending',
      index: true,
    },
    reviewNotes: String,
    reviewedAt: Date,

    // Delivery Tracking
    delivery: {
      status: {
        type: String,
        enum: ['not_sent', 'queued', 'sent', 'delivered', 'failed', 'listened'],
        default: 'not_sent',
        index: true,
      },
      dropCowboyMessageId: String,
      sentAt: Date,
      deliveredAt: Date,
      listenedAt: Date,
      failureReason: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
VoicemailScriptSchema.index({ campaignId: 1, reviewStatus: 1 });
VoicemailScriptSchema.index({ campaignId: 1, 'audio.status': 1 });
VoicemailScriptSchema.index({ campaignId: 1, 'delivery.status': 1 });
VoicemailScriptSchema.index({ userId: 1, campaignId: 1 });
VoicemailScriptSchema.index({ contactId: 1, campaignId: 1 });
VoicemailScriptSchema.index({ 'delivery.dropCowboyMessageId': 1 }, { sparse: true });

// Unique constraint: one script per contact per campaign
VoicemailScriptSchema.index(
  { contactId: 1, campaignId: 1 },
  { unique: true }
);

// Virtual for contact details
VoicemailScriptSchema.virtual('contact', {
  ref: 'Contact',
  localField: 'contactId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for campaign details
VoicemailScriptSchema.virtual('campaign', {
  ref: 'Campaign',
  localField: 'campaignId',
  foreignField: '_id',
  justOne: true,
});

// Methods
VoicemailScriptSchema.methods.incrementVersion = function () {
  this.scriptVersion += 1;
  return this.save();
};

VoicemailScriptSchema.methods.approve = function () {
  this.reviewStatus = 'approved';
  this.reviewedAt = new Date();
  return this.save();
};

VoicemailScriptSchema.methods.reject = function (notes?: string) {
  this.reviewStatus = 'rejected';
  this.reviewedAt = new Date();
  if (notes) this.reviewNotes = notes;
  return this.save();
};

VoicemailScriptSchema.methods.markAsListened = function () {
  this.delivery.status = 'listened';
  this.delivery.listenedAt = new Date();
  return this.save();
};

VoicemailScriptSchema.methods.markAsDelivered = function () {
  this.delivery.status = 'delivered';
  this.delivery.deliveredAt = new Date();
  return this.save();
};

VoicemailScriptSchema.methods.markAsFailed = function (reason: string) {
  this.delivery.status = 'failed';
  this.delivery.failureReason = reason;
  return this.save();
};

// Static methods
VoicemailScriptSchema.statics.findByDropCowboyMessageId = function (
  messageId: string
) {
  return this.findOne({ 'delivery.dropCowboyMessageId': messageId });
};

VoicemailScriptSchema.statics.findPendingAudio = function (campaignId: Types.ObjectId) {
  return this.find({
    campaignId,
    'audio.status': 'pending',
    reviewStatus: 'approved',
  });
};

VoicemailScriptSchema.statics.findReadyToSend = function (campaignId: Types.ObjectId) {
  return this.find({
    campaignId,
    reviewStatus: 'approved',
    'audio.status': 'completed',
    'delivery.status': 'not_sent',
  });
};

export default models.VoicemailScript ||
  model<IVoicemailScript>('VoicemailScript', VoicemailScriptSchema);
