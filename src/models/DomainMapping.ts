// src/models/DomainMapping.ts
// Maps custom domains to specific neighborhood/community pages
// Enables agents to point vanity domains (e.g., indianwellsccrealestate.com)
// to their community pages for SEO and branding purposes.

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDomainMapping extends Document {
  // The custom domain (e.g., "indianwellsccrealestate.com")
  domain: string;

  // Who owns this mapping
  agentId: mongoose.Types.ObjectId;
  agentEmail: string; // Denormalized for quick lookups

  // Target page
  subdivisionId: mongoose.Types.ObjectId;
  subdivisionName: string; // Denormalized (e.g., "Indian Wells Country Club")
  targetPath: string; // Full path (e.g., "/neighborhoods/indian-wells/indian-wells-country-club")
  cityId: string; // URL city segment (e.g., "indian-wells")
  subdivisionSlug: string; // URL slug segment (e.g., "indian-wells-country-club")

  // Domain provisioning status
  status:
    | "pending_approval" // Agent submitted, waiting for admin review
    | "approved" // Admin approved, ready for Vercel registration
    | "pending_dns" // Domain added to Vercel, waiting for DNS config
    | "pending_verification" // DNS configured, waiting for Vercel verification
    | "active" // Domain verified, SSL issued, live
    | "rejected" // Admin rejected the request
    | "failed" // DNS verification failed
    | "suspended"; // Manually suspended

  // Admin review
  reviewedBy?: string; // Admin email who approved/rejected
  reviewedAt?: Date;
  rejectionReason?: string;

  // Vercel integration
  vercelDomainId?: string; // Vercel's internal ID for this domain
  vercelVerified: boolean; // Whether Vercel has verified the domain

  // SSL
  sslStatus: "pending" | "issued" | "failed" | "not_started";

  // DNS
  dnsConfigured: boolean;
  dnsVerifiedAt?: Date;
  dnsRecords?: {
    type: string; // "A", "AAAA", "CNAME", "TXT"
    name: string;
    value: string;
  }[];

  // SEO settings
  seoTitle?: string; // Custom page title for this domain
  seoDescription?: string; // Custom meta description
  ogImage?: string; // Custom OG image URL

  // Domain purchase
  purchasedViaVercel: boolean; // Whether domain was bought through Vercel
  registrarUrl?: string; // Link to domain registrar for management

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const DomainMappingSchema = new Schema<IDomainMapping>(
  {
    domain: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    agentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    agentEmail: {
      type: String,
      required: true,
    },

    subdivisionId: {
      type: Schema.Types.ObjectId,
      ref: "Subdivision",
      required: true,
    },
    subdivisionName: { type: String, required: true },
    targetPath: { type: String, required: true },
    cityId: { type: String, required: true },
    subdivisionSlug: { type: String, required: true },

    status: {
      type: String,
      enum: [
        "pending_approval",
        "approved",
        "pending_dns",
        "pending_verification",
        "active",
        "rejected",
        "failed",
        "suspended",
      ],
      default: "pending_approval",
    },

    reviewedBy: String,
    reviewedAt: Date,
    rejectionReason: String,

    vercelDomainId: String,
    vercelVerified: { type: Boolean, default: false },

    sslStatus: {
      type: String,
      enum: ["pending", "issued", "failed", "not_started"],
      default: "not_started",
    },

    dnsConfigured: { type: Boolean, default: false },
    dnsVerifiedAt: Date,
    dnsRecords: [
      {
        type: { type: String },
        name: String,
        value: String,
      },
    ],

    seoTitle: String,
    seoDescription: String,
    ogImage: String,

    purchasedViaVercel: { type: Boolean, default: false },
    registrarUrl: String,
  },
  {
    timestamps: true,
    collection: "domain_mappings",
  }
);

// Indexes
DomainMappingSchema.index({ domain: 1 }, { unique: true });
DomainMappingSchema.index({ agentId: 1 });
DomainMappingSchema.index({ subdivisionId: 1 });
DomainMappingSchema.index({ status: 1 });

const DomainMapping: Model<IDomainMapping> =
  mongoose.models.DomainMapping ||
  mongoose.model<IDomainMapping>("DomainMapping", DomainMappingSchema);

export default DomainMapping;
