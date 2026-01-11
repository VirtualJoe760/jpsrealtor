import mongoose, { Schema, model, models, Document, Types } from 'mongoose';

export type SessionType = 'script_generation' | 'audio_generation';
export type SessionStatus = 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface IGenerationSession extends Document {
  _id: Types.ObjectId;
  campaignId: Types.ObjectId;
  userId: Types.ObjectId;

  // Session Type
  type: SessionType;
  status: SessionStatus;

  // Progress Tracking
  totalItems: number;
  lastProcessedIndex: number;
  successCount: number;
  failureCount: number;

  // Configuration (for resume)
  config: {
    model?: string;
    customPrompt?: string;
    voiceId?: string;
  };

  // Error Tracking
  errorLog: Array<{
    index: number;
    contactId?: Types.ObjectId;
    error: string;
    timestamp: Date;
  }>;

  // Timestamps
  startedAt: Date;
  lastUpdatedAt: Date;
  completedAt?: Date;
}

const GenerationSessionSchema = new Schema<IGenerationSession>(
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
    type: {
      type: String,
      enum: ['script_generation', 'audio_generation'],
      required: true,
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'failed', 'cancelled'],
      default: 'in_progress',
    },
    totalItems: {
      type: Number,
      required: true,
      default: 0,
    },
    lastProcessedIndex: {
      type: Number,
      required: true,
      default: -1,
    },
    successCount: {
      type: Number,
      required: true,
      default: 0,
    },
    failureCount: {
      type: Number,
      required: true,
      default: 0,
    },
    config: {
      model: String,
      customPrompt: String,
      voiceId: String,
    },
    errorLog: [
      {
        index: Number,
        contactId: Schema.Types.ObjectId,
        error: String,
        timestamp: Date,
      },
    ],
    startedAt: {
      type: Date,
      default: Date.now,
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Compound index for querying active sessions
GenerationSessionSchema.index({ campaignId: 1, type: 1, status: 1 });

// TTL index to auto-delete completed sessions after 7 days
GenerationSessionSchema.index(
  { completedAt: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60, sparse: true }
);

const GenerationSession = (models.GenerationSession ||
  model<IGenerationSession>('GenerationSession', GenerationSessionSchema)) as mongoose.Model<IGenerationSession>;

export default GenerationSession;
