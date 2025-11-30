import mongoose, { Document, Schema } from 'mongoose';

export interface IArticleRequest extends Document {
  prompt: string;
  category: 'articles' | 'market-insights' | 'real-estate-tips';
  keywords?: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';

  requestedBy: mongoose.Types.ObjectId;
  requestedAt: Date;

  startedAt?: Date;
  completedAt?: Date;

  resultFilePath?: string;
  resultSlug?: string;
  resultTitle?: string;
  error?: string;

  createdAt: Date;
  updatedAt: Date;
}

const ArticleRequestSchema = new Schema<IArticleRequest>({
  prompt: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['articles', 'market-insights', 'real-estate-tips'],
    required: true
  },
  keywords: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  requestedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  resultFilePath: {
    type: String
  },
  resultSlug: {
    type: String
  },
  resultTitle: {
    type: String
  },
  error: {
    type: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
ArticleRequestSchema.index({ status: 1, requestedAt: -1 });
ArticleRequestSchema.index({ requestedBy: 1, requestedAt: -1 });

export default mongoose.models.ArticleRequest ||
  mongoose.model<IArticleRequest>('ArticleRequest', ArticleRequestSchema);
