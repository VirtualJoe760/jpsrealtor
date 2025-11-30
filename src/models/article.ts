// src/models/article.ts
// Article model for custom CMS with year/month organization

import mongoose, { Schema, Document, Model } from "mongoose";

export type ArticleStatus = "draft" | "published" | "archived";
export type ArticleCategory = "articles" | "market-insights" | "real-estate-tips";

export interface IArticle extends Document {
  _id: mongoose.Types.ObjectId;

  // Basic Info
  title: string;
  slug: string;
  excerpt: string;
  content: string; // MDX content

  // Organization
  category: ArticleCategory;
  tags: string[];

  // Date Organization
  publishedAt: Date;
  year: number;
  month: number;

  // Status
  status: ArticleStatus;
  featured: boolean;

  // Media (Cloudinary)
  featuredImage: {
    url: string;
    publicId: string;
    alt: string;
    caption?: string;
    width?: number;
    height?: number;
  };

  ogImage?: {
    url: string;
    publicId: string;
  };

  // SEO
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };

  // Author
  author: {
    id: mongoose.Types.ObjectId;
    name: string;
    email: string;
  };

  // Analytics
  metadata: {
    views: number;
    readTime: number; // minutes
    lastViewed?: Date;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  scheduledFor?: Date;
}

const ArticleSchema = new Schema<IArticle>(
  {
    // Basic Info
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    excerpt: {
      type: String,
      required: true,
      maxlength: 300,
    },
    content: {
      type: String,
      required: true,
    },

    // Organization
    category: {
      type: String,
      enum: ["articles", "market-insights", "real-estate-tips"],
      required: true,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },

    // Date Organization
    publishedAt: {
      type: Date,
      index: true,
    },
    year: {
      type: Number,
      index: true,
    },
    month: {
      type: Number,
      min: 1,
      max: 12,
      index: true,
    },

    // Status
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Media (Cloudinary)
    featuredImage: {
      url: {
        type: String,
        required: true,
      },
      publicId: {
        type: String,
        required: true,
      },
      alt: {
        type: String,
        required: true,
      },
      caption: String,
      width: Number,
      height: Number,
    },

    ogImage: {
      url: String,
      publicId: String,
    },

    // SEO
    seo: {
      title: {
        type: String,
        required: true,
        maxlength: 60,
      },
      description: {
        type: String,
        required: true,
        maxlength: 160,
      },
      keywords: {
        type: [String],
        default: [],
      },
    },

    // Author
    author: {
      id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
    },

    // Analytics
    metadata: {
      views: {
        type: Number,
        default: 0,
      },
      readTime: {
        type: Number,
        default: 5,
      },
      lastViewed: Date,
    },

    // Scheduling
    scheduledFor: Date,
  },
  {
    timestamps: true,
    collection: "articles",
  }
);

// Compound Indexes for efficient querying
ArticleSchema.index({ status: 1, publishedAt: -1 }); // Published articles by date
ArticleSchema.index({ category: 1, status: 1, publishedAt: -1 }); // Category filtering
ArticleSchema.index({ year: 1, month: 1, status: 1 }); // Date archive
ArticleSchema.index({ tags: 1, status: 1 }); // Tag filtering
ArticleSchema.index({ featured: 1, status: 1, publishedAt: -1 }); // Featured articles
ArticleSchema.index({ "metadata.views": -1 }); // Popular articles
ArticleSchema.index({ slug: 1 }, { unique: true }); // Fast slug lookup

// Text index for search
ArticleSchema.index({
  title: "text",
  excerpt: "text",
  content: "text",
  tags: "text",
});

// Pre-save hook to set year/month from publishedAt
ArticleSchema.pre("save", function (next) {
  if (this.publishedAt) {
    this.year = this.publishedAt.getFullYear();
    this.month = this.publishedAt.getMonth() + 1; // 1-12
  }

  // Auto-generate slug from title if not provided
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  next();
});

// Static method to get articles by year/month
ArticleSchema.statics.getByYearMonth = function (
  year: number,
  month: number,
  status: ArticleStatus = "published"
) {
  return this.find({ year, month, status })
    .sort({ publishedAt: -1 })
    .exec();
};

// Static method to get featured articles
ArticleSchema.statics.getFeatured = function (limit: number = 5) {
  return this.find({ featured: true, status: "published" })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .exec();
};

// Static method to increment view count
ArticleSchema.statics.incrementViews = function (articleId: string) {
  return this.findByIdAndUpdate(
    articleId,
    {
      $inc: { "metadata.views": 1 },
      $set: { "metadata.lastViewed": new Date() },
    },
    { new: true }
  );
};

// Instance method to get reading time
ArticleSchema.methods.calculateReadTime = function (): number {
  const wordsPerMinute = 200;
  const wordCount = this.content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
};

// Instance method to get formatted date
ArticleSchema.methods.getFormattedDate = function (): string {
  return this.publishedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Export model
const Article: Model<IArticle> =
  mongoose.models.Article || mongoose.model<IArticle>("Article", ArticleSchema);

export default Article;
