/**
 * Push Subscription Model
 *
 * Stores Web Push subscription data for sending push notifications
 * Each user can have multiple subscriptions (different devices/browsers)
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPushSubscription extends Document {
  userId: mongoose.Types.ObjectId;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  deviceType?: 'mobile' | 'desktop' | 'tablet';
  active: boolean;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
  deactivate(): Promise<this>;
}

export interface IPushSubscriptionModel extends Model<IPushSubscription> {
  findActiveByUserId(userId: string): Promise<IPushSubscription[]>;
  cleanupOld(daysOld?: number): Promise<any>;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true, // Each subscription endpoint is unique
    },
    keys: {
      p256dh: {
        type: String,
        required: true,
      },
      auth: {
        type: String,
        required: true,
      },
    },
    userAgent: {
      type: String,
    },
    deviceType: {
      type: String,
      enum: ['mobile', 'desktop', 'tablet'],
      default: 'desktop',
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastUsed: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Compound index for efficient queries
PushSubscriptionSchema.index({ userId: 1, active: 1 });
PushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });

// Method to mark subscription as inactive (instead of deleting)
PushSubscriptionSchema.methods.deactivate = function () {
  this.active = false;
  return this.save();
};

// Static method to get all active subscriptions for a user
PushSubscriptionSchema.statics.findActiveByUserId = function (userId: string) {
  return this.find({ userId, active: true });
};

// Static method to cleanup old inactive subscriptions
PushSubscriptionSchema.statics.cleanupOld = function (daysOld = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.deleteMany({
    active: false,
    updatedAt: { $lt: cutoffDate },
  });
};

const PushSubscription: IPushSubscriptionModel =
  (mongoose.models.PushSubscription as IPushSubscriptionModel) ||
  mongoose.model<IPushSubscription, IPushSubscriptionModel>('PushSubscription', PushSubscriptionSchema);

export default PushSubscription;
