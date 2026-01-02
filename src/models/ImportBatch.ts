import mongoose, { Schema, model, models, Document, Types } from 'mongoose';
import { ContactSource } from './ContactCampaign';

export type ImportBatchStatus = 'uploading' | 'processing' | 'completed' | 'failed';

export interface IImportBatch extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  campaignId?: Types.ObjectId;

  // Import Details
  source: ContactSource;
  fileName?: string;
  fileUrl?: string;

  // Processing Status
  status: ImportBatchStatus;
  progress: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    duplicates: number;
  };

  // Normalization Config
  fieldMapping?: Record<string, string>;

  // Results
  importedContactIds: Types.ObjectId[];
  errors?: Array<{
    row: number;
    error: string;
    data?: any;
  }>;

  // Timestamps
  createdAt: Date;
  completedAt?: Date;
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

    // Processing Status
    status: {
      type: String,
      enum: ['uploading', 'processing', 'completed', 'failed'],
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

    // Normalization Config
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
    errors: [
      {
        row: Number,
        error: String,
        data: Schema.Types.Mixed,
      },
    ],

    // Timestamps
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
  if (!this.errors) this.errors = [];
  this.errors.push({
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
  if (!this.errors) this.errors = [];
  this.errors.push({ row, error, data });
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
    errorCount: this.errors?.length || 0,
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
    .select('-fieldMapping -errors');
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
    .select('-fieldMapping -errors');
};

export default models.ImportBatch ||
  model<IImportBatch>('ImportBatch', ImportBatchSchema);
