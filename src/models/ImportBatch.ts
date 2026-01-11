import mongoose, { Schema, model, models, Document, Types } from 'mongoose';
import { ContactSource } from './ContactCampaign';

export type ImportBatchStatus = 'uploading' | 'analyzing' | 'ready' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface IImportBatch extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  campaignId?: Types.ObjectId;
  teamId?: Types.ObjectId;  // Team reference for shared imports

  // Import Details
  source: ContactSource;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;  // File size in bytes

  // Processing Status
  status: ImportBatchStatus;
  progress: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    duplicates: number;
  };

  // Prospect Discovery - Data Quality Analysis
  analysis?: {
    totalRows: number;

    dataQualityIssues: {
      noName: number;
      noPhone: number;
      multiplePhones: number;
      multipleEmails: number;
      invalidPhoneFormat: number;
      emojiInName: number;
      organizationOnly: number;
      duplicates: number;
      junkEntries: number;
      specialCharactersInName: number;
    };

    // Examples for UI display
    phoneFormatExamples: string[];
    emailFormatExamples: string[];
    organizationOnlyExamples: string[];
    multiplePhoneExamples: Array<{
      contact: string;
      phones: string[];
    }>;
    emojiExamples: string[];
    junkExamples: string[];

    // Summary
    qualityScore?: number;  // 0-100 overall quality score
    recommendedActions?: string[];  // List of recommended cleanup actions
  };

  // Prospect Discovery - Import Configuration
  config?: {
    skipEmoji: boolean;  // Skip contacts with emoji in name
    skipOrganizationOnly: boolean;  // Skip organization-only contacts
    skipDuplicates: boolean;  // Skip duplicate phone numbers
    skipJunk: boolean;  // Skip junk entries
    autoCleanNames: boolean;  // Automatically clean names
    normalizePhones: boolean;  // Normalize phones to E.164
    mergeStrategy?: 'skip' | 'update' | 'create_duplicate';  // How to handle existing contacts
  };

  // Prospect Discovery - Detailed Results
  detailedResults?: {
    skippedByReason: {
      emoji: number;
      organizationOnly: number;
      duplicate: number;
      junk: number;
      noPhone: number;
      validation: number;
    };
    updated: number;  // Updated existing contacts
  };

  // Normalization Config (Legacy)
  fieldMapping?: Record<string, string>;

  // Results
  importedContactIds: Types.ObjectId[];
  importErrors?: Array<{
    row: number;
    error: string;
    data?: any;
  }>;

  // Timestamps
  createdAt: Date;
  analyzedAt?: Date;  // When analysis completed
  importedAt?: Date;  // When import started
  completedAt?: Date;

  // Methods
  markAsCompleted(): Promise<this>;
  markAsFailed(error: string): Promise<this>;
  addError(row: number, error: string, data?: any): Promise<this>;
}

const ImportBatchSchema = new Schema<IImportBatch>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      index: true,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      index: true,
    },

    // Import Details
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
    fileName: String,
    fileUrl: String,
    fileSize: Number,

    // Processing Status
    status: {
      type: String,
      enum: ['uploading', 'analyzing', 'ready', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'uploading',
      index: true,
    },
    progress: {
      total: {
        type: Number,
        default: 0,
      },
      processed: {
        type: Number,
        default: 0,
      },
      successful: {
        type: Number,
        default: 0,
      },
      failed: {
        type: Number,
        default: 0,
      },
      duplicates: {
        type: Number,
        default: 0,
      },
    },

    // Prospect Discovery - Data Quality Analysis
    analysis: {
      totalRows: Number,

      dataQualityIssues: {
        noName: { type: Number, default: 0 },
        noPhone: { type: Number, default: 0 },
        multiplePhones: { type: Number, default: 0 },
        multipleEmails: { type: Number, default: 0 },
        invalidPhoneFormat: { type: Number, default: 0 },
        emojiInName: { type: Number, default: 0 },
        organizationOnly: { type: Number, default: 0 },
        duplicates: { type: Number, default: 0 },
        junkEntries: { type: Number, default: 0 },
        specialCharactersInName: { type: Number, default: 0 },
      },

      phoneFormatExamples: [String],
      emailFormatExamples: [String],
      organizationOnlyExamples: [String],
      multiplePhoneExamples: [{
        contact: String,
        phones: [String],
      }],
      emojiExamples: [String],
      junkExamples: [String],

      qualityScore: {
        type: Number,
        min: 0,
        max: 100,
      },
      recommendedActions: [String],
    },

    // Prospect Discovery - Import Configuration
    config: {
      skipEmoji: { type: Boolean, default: true },
      skipOrganizationOnly: { type: Boolean, default: false },
      skipDuplicates: { type: Boolean, default: true },
      skipJunk: { type: Boolean, default: true },
      autoCleanNames: { type: Boolean, default: true },
      normalizePhones: { type: Boolean, default: true },
      mergeStrategy: {
        type: String,
        enum: ['skip', 'update', 'create_duplicate'],
        default: 'skip',
      },
    },

    // Prospect Discovery - Detailed Results
    detailedResults: {
      skippedByReason: {
        emoji: { type: Number, default: 0 },
        organizationOnly: { type: Number, default: 0 },
        duplicate: { type: Number, default: 0 },
        junk: { type: Number, default: 0 },
        noPhone: { type: Number, default: 0 },
        validation: { type: Number, default: 0 },
      },
      updated: { type: Number, default: 0 },
    },

    // Normalization Config (Legacy)
    fieldMapping: {
      type: Schema.Types.Mixed,
    },

    // Results
    importedContactIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Contact',
      },
    ],
    importErrors: [
      {
        row: Number,
        error: String,
        data: Schema.Types.Mixed,
      },
    ],

    // Timestamps
    analyzedAt: Date,
    importedAt: Date,
    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
ImportBatchSchema.index({ userId: 1, status: 1 });
ImportBatchSchema.index({ campaignId: 1 });
ImportBatchSchema.index({ createdAt: -1 });

// Virtual for campaign details
ImportBatchSchema.virtual('campaign', {
  ref: 'Campaign',
  localField: 'campaignId',
  foreignField: '_id',
  justOne: true,
});

// Methods
ImportBatchSchema.methods.updateProgress = function (
  processed: number,
  successful: number,
  failed: number,
  duplicates: number
) {
  this.progress.processed = processed;
  this.progress.successful = successful;
  this.progress.failed = failed;
  this.progress.duplicates = duplicates;
  return this.save();
};

ImportBatchSchema.methods.markAsCompleted = function () {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

ImportBatchSchema.methods.markAsFailed = function (error: string) {
  this.status = 'failed';
  this.completedAt = new Date();
  if (!this.importErrors) this.importErrors = [];
  this.importErrors.push({
    row: -1,
    error,
    data: null,
  });
  return this.save();
};

ImportBatchSchema.methods.addError = function (
  row: number,
  error: string,
  data?: any
) {
  if (!this.importErrors) this.importErrors = [];
  this.importErrors.push({ row, error, data });
  return this.save();
};

ImportBatchSchema.methods.addImportedContact = function (contactId: Types.ObjectId) {
  if (!this.importedContactIds) this.importedContactIds = [];
  this.importedContactIds.push(contactId);
  return this.save();
};

ImportBatchSchema.methods.getSuccessRate = function (): number {
  if (this.progress.total === 0) return 0;
  return (this.progress.successful / this.progress.total) * 100;
};

ImportBatchSchema.methods.getSummary = function () {
  return {
    batchId: this._id,
    source: this.source,
    fileName: this.fileName,
    status: this.status,
    progress: this.progress,
    successRate: this.getSuccessRate(),
    errorCount: this.importErrors?.length || 0,
    createdAt: this.createdAt,
    completedAt: this.completedAt,
    duration: this.completedAt
      ? this.completedAt.getTime() - this.createdAt.getTime()
      : null,
  };
};

// Static methods
ImportBatchSchema.statics.findByUserId = function (
  userId: Types.ObjectId,
  limit: number = 20
) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('-fieldMapping -importErrors');
};

ImportBatchSchema.statics.findByCampaign = function (campaignId: Types.ObjectId) {
  return this.find({ campaignId }).sort({ createdAt: -1 });
};

ImportBatchSchema.statics.getRecentImports = function (
  userId: Types.ObjectId,
  days: number = 7
) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return this.find({
    userId,
    createdAt: { $gte: cutoffDate },
  })
    .sort({ createdAt: -1 })
    .select('-fieldMapping -importErrors');
};

export default (models.ImportBatch ||
  model<IImportBatch>('ImportBatch', ImportBatchSchema)) as mongoose.Model<IImportBatch>;
