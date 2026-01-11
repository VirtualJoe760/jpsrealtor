// src/models/twoFactorToken.ts
// Two-Factor Authentication tokens (OTP codes sent via email or SMS)

import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITwoFactorToken extends Document {
  email: string;
  code: string; // 6-digit code
  expires: Date;
  type?: string; // 'login' (default) or 'phone_verification'
  metadata?: {
    phoneNumber?: string; // For phone verification tokens
    [key: string]: any;
  };
  createdAt: Date;
}

const TwoFactorTokenSchema = new Schema<ITwoFactorToken>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    code: {
      type: String,
      required: true,
    },
    expires: {
      type: Date,
      required: true,
    },
    type: {
      type: String,
      default: 'login',
      enum: ['login', 'phone_verification'],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "twofactortokens",
  }
);

// Index for efficient lookups and automatic cleanup
TwoFactorTokenSchema.index({ email: 1, code: 1 });
TwoFactorTokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired tokens

// Export model
const TwoFactorToken: Model<ITwoFactorToken> =
  mongoose.models.TwoFactorToken ||
  mongoose.model<ITwoFactorToken>("TwoFactorToken", TwoFactorTokenSchema);

export default TwoFactorToken;
