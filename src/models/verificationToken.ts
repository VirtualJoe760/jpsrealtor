// src/models/verificationToken.ts
// Email verification tokens

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVerificationToken extends Document {
  identifier: string; // email address
  token: string; // verification token
  expires: Date;
  createdAt: Date;
}

const VerificationTokenSchema = new Schema<IVerificationToken>(
  {
    identifier: {
      type: String,
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    expires: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "verificationtokens",
  }
);

// Index for efficient lookups and automatic cleanup
VerificationTokenSchema.index({ identifier: 1, token: 1 }, { unique: true });
VerificationTokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired tokens

// Export model
const VerificationToken: Model<IVerificationToken> =
  mongoose.models.VerificationToken ||
  mongoose.model<IVerificationToken>("VerificationToken", VerificationTokenSchema);

export default VerificationToken;
