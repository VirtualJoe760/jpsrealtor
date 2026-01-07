import mongoose, { Schema, model, models, Document, Types } from 'mongoose';
import type { Provider } from '@/lib/services/column-detection.service';

export interface IColumnMapping {
  sourceColumn: string;
  targetField: string;
  confidence: number;
  detectionMethod: 'provider_template' | 'fuzzy_match' | 'content_analysis' | 'manual';
}

export interface IImportTemplate extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;

  // Template Info
  name: string;
  description?: string;
  provider?: Provider;

  // Column Mappings
  columnMapping: IColumnMapping[];

  // Usage Stats
  usageCount: number;
  lastUsedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const ColumnMappingSchema = new Schema<IColumnMapping>(
  {
    sourceColumn: {
      type: String,
      required: true,
    },
    targetField: {
      type: String,
      required: true,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    detectionMethod: {
      type: String,
      enum: ['provider_template', 'fuzzy_match', 'content_analysis', 'manual'],
      required: true,
    },
  },
  { _id: false }
);

const ImportTemplateSchema = new Schema<IImportTemplate>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Template Info
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    provider: {
      type: String,
      enum: ['google_contacts', 'mojo_dialer', 'title_rep', 'outlook', 'custom'],
    },

    // Column Mappings
    columnMapping: {
      type: [ColumnMappingSchema],
      required: true,
      validate: {
        validator: function (v: IColumnMapping[]) {
          return v.length > 0;
        },
        message: 'At least one column mapping is required',
      },
    },

    // Usage Stats
    usageCount: {
      type: Number,
      default: 0,
    },
    lastUsedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
ImportTemplateSchema.index({ userId: 1, name: 1 }, { unique: true });
ImportTemplateSchema.index({ userId: 1, provider: 1 });
ImportTemplateSchema.index({ userId: 1, lastUsedAt: -1 });

// Instance Methods
ImportTemplateSchema.methods.incrementUsage = function () {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

ImportTemplateSchema.methods.updateMapping = function (
  columnMapping: IColumnMapping[]
) {
  this.columnMapping = columnMapping;
  return this.save();
};

// Static Methods
ImportTemplateSchema.statics.findByUserId = function (
  userId: Types.ObjectId,
  limit: number = 20
) {
  return this.find({ userId })
    .sort({ lastUsedAt: -1, createdAt: -1 })
    .limit(limit);
};

ImportTemplateSchema.statics.findByProvider = function (
  userId: Types.ObjectId,
  provider: Provider
) {
  return this.find({ userId, provider }).sort({ usageCount: -1, createdAt: -1 });
};

ImportTemplateSchema.statics.getMostUsed = function (
  userId: Types.ObjectId,
  limit: number = 5
) {
  return this.find({ userId })
    .sort({ usageCount: -1 })
    .limit(limit);
};

export default models.ImportTemplate ||
  model<IImportTemplate>('ImportTemplate', ImportTemplateSchema);
