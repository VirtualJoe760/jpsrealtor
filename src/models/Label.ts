/**
 * Label Model
 *
 * Manages contact organization labels for Prospect Discovery.
 * Labels replace the old string-based tagging system with a more robust
 * reference-based approach that supports colors, icons, and analytics.
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface ILabel extends Document {
  // Owner
  userId: mongoose.Types.ObjectId;  // Reference to User who owns this label
  teamId?: mongoose.Types.ObjectId;  // Reference to Team (if shared)

  // Label Info
  name: string;  // e.g., "Hot Leads", "Past Clients", "Do Not Call"
  description?: string;  // Optional description
  color: string;  // Hex color code (e.g., "#FF5733", "#3498db")
  icon?: string;  // Optional icon name (lucide-react icon name)

  // Analytics
  contactCount: number;  // Number of contacts with this label (denormalized)

  // System vs Custom
  isSystem: boolean;  // True for predefined labels, false for user-created
  isArchived: boolean;  // Soft delete - hide from UI but keep for history

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const LabelSchema: Schema = new Schema(
  {
    // Owner
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      index: true,
    },

    // Label Info
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    color: {
      type: String,
      required: true,
      default: '#3B82F6',  // Default blue
      validate: {
        validator: function(v: string) {
          return /^#[0-9A-F]{6}$/i.test(v);
        },
        message: 'Color must be a valid hex code (e.g., #FF5733)',
      },
    },
    icon: {
      type: String,
      trim: true,
      maxlength: 50,
    },

    // Analytics
    contactCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // System vs Custom
    isSystem: {
      type: Boolean,
      default: false,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
LabelSchema.index({ userId: 1, name: 1 }, { unique: true });  // Prevent duplicate label names per user
LabelSchema.index({ userId: 1, isArchived: 1 });  // Filter active labels
LabelSchema.index({ userId: 1, isSystem: 1 });  // Separate system vs custom labels

// Virtual for active contacts (if needed for more complex queries)
LabelSchema.virtual('isActive').get(function (this: ILabel) {
  return !this.isArchived && this.contactCount > 0;
});

// Ensure virtuals are included when converting to JSON
LabelSchema.set('toJSON', { virtuals: true });
LabelSchema.set('toObject', { virtuals: true });

export default (mongoose.models.Label ||
  mongoose.model<ILabel>('Label', LabelSchema)) as mongoose.Model<ILabel>;
