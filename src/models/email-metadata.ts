/**
 * Email Metadata Model
 *
 * Tracks email state and user interactions for both sent and received emails.
 * Links to contacts for enriched display and autocomplete.
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IEmailMetadata extends Document {
  // Owner
  userId: mongoose.Types.ObjectId;  // Reference to User who owns this email

  // Email Reference
  resendEmailId: string;  // Resend email ID
  folder: 'inbox' | 'sent';  // Which folder this email belongs to

  // Contact Linking
  contactId?: mongoose.Types.ObjectId;  // Reference to Contact (if sender/recipient is in contacts)

  // Email State
  isRead: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  isDeleted: boolean;

  // Tags/Labels
  tags: string[];  // Custom tags (e.g., 'urgent', 'follow-up', 'lead', 'client')

  // Cached Contact Info (for display optimization)
  cachedSenderName?: string;  // Full name from contacts DB
  cachedSenderEmail?: string;
  cachedSenderPhoto?: string;  // URL to contact photo

  // Timestamps
  readAt?: Date;
  favoritedAt?: Date;
  archivedAt?: Date;
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const EmailMetadataSchema: Schema = new Schema(
  {
    // Owner
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Email Reference
    resendEmailId: {
      type: String,
      required: true,
      index: true,
    },
    folder: {
      type: String,
      enum: ['inbox', 'sent'],
      required: true,
      default: 'inbox',
    },

    // Contact Linking
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      sparse: true,
    },

    // Email State
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    isFavorite: {
      type: Boolean,
      default: false,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Tags/Labels
    tags: {
      type: [String],
      default: [],
      index: true,
    },

    // Cached Contact Info
    cachedSenderName: String,
    cachedSenderEmail: String,
    cachedSenderPhoto: String,

    // Timestamps
    readAt: Date,
    favoritedAt: Date,
    archivedAt: Date,
    deletedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
EmailMetadataSchema.index({ userId: 1, folder: 1, isDeleted: 1 });
EmailMetadataSchema.index({ userId: 1, isRead: 1 });
EmailMetadataSchema.index({ userId: 1, isFavorite: 1 });
EmailMetadataSchema.index({ userId: 1, tags: 1 });
EmailMetadataSchema.index({ userId: 1, contactId: 1 });

// Unique constraint: one metadata entry per email per user
EmailMetadataSchema.index({ userId: 1, resendEmailId: 1 }, { unique: true });

export default mongoose.models.EmailMetadata || mongoose.model<IEmailMetadata>('EmailMetadata', EmailMetadataSchema);
