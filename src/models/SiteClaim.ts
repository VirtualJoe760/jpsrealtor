// src/models/SiteClaim.ts
//
// One-time "claim codes" that let a website built with Claude get its own
// ChatRealty key WITHOUT the key ever passing through the conversation
// (src/lib/site-claim.ts). Only the sha256 of the code is stored; a code is
// good for 15 minutes and exactly one redemption. Mongo's TTL monitor removes
// expired rows on its own.

import mongoose, { Schema, Model } from "mongoose";

export interface ISiteClaim {
  codeHash: string;
  userId: string;
  tenantId: string;
  /** Scopes of the key that asked for the code. The claimed key gets the
   *  website preset CAPPED to these — claiming never adds a permission. */
  scopes: string[];
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
}

const SiteClaimSchema = new Schema<ISiteClaim>(
  {
    codeHash: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    tenantId: { type: String, required: true },
    scopes: { type: [String], default: [] },
    // TTL: the document disappears shortly after it expires.
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    usedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const SiteClaim: Model<ISiteClaim> =
  (mongoose.models.SiteClaim as Model<ISiteClaim>) || mongoose.model<ISiteClaim>("SiteClaim", SiteClaimSchema);

export default SiteClaim;
