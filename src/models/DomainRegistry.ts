// src/models/DomainRegistry.ts
// Centralized domain registry — single source of truth for every domain on the platform.
// See docs/DOMAIN_REGISTRY.md for full architecture.

import mongoose, { Schema, Document, Model } from "mongoose";

// ── Types ──────────────────────────────────────────────────────────

export type DomainType = "platform" | "agent_subdomain" | "agent_custom" | "community";
export type DomainStatus = "active" | "pending" | "suspended" | "decommissioned";
export type OwnerType = "platform" | "agent" | "partner";
export type TargetType = "homepage" | "agent_landing" | "community_page" | "landing_page";
export type SslStatus = "pending" | "issued" | "failed" | "not_started";

// ── Interface ──────────────────────────────────────────────────────

export interface IDomainRegistry extends Document {
  // Core
  domain: string;
  type: DomainType;
  status: DomainStatus;

  // Ownership
  ownerId?: mongoose.Types.ObjectId;
  ownerEmail?: string;
  ownerType: OwnerType;

  // What this domain serves
  target: {
    type: TargetType;
    path: string;
    agentSubdomain?: string;
    subdivisionSlug?: string;
    cityId?: string;
  };

  // Vercel Integration
  vercel: {
    registered: boolean;
    verified: boolean;
    domainId?: string;
    sslStatus: SslStatus;
    dnsConfigured: boolean;
    dnsRecords?: Array<{ type: string; name: string; value: string }>;
    registeredAt?: Date;
    verifiedAt?: Date;
  };

  // Cloudflare Integration
  cloudflare: {
    registered: boolean;
    zoneId?: string;
    nameservers?: string[];          // Cloudflare-assigned NS (e.g., haley.ns.cloudflare.com)
    status?: string;                 // "active", "pending", "moved", etc.
    nameserversUpdated: boolean;     // Has the registrar been updated to point to CF nameservers?
    nameserverCheckedAt?: Date;      // Last time we polled Cloudflare for zone activation
    registrar?: string;              // Where the domain was registered (GoDaddy, Vercel, etc.)
    registeredAt?: Date;
  };

  // Google Search Console
  gsc: {
    registered: boolean;
    verified: boolean;
    propertyUrl?: string;
    sitemapSubmitted: boolean;
    sitemapUrl?: string;
    lastCrawled?: Date;
    indexedPages?: number;
    registeredAt?: Date;
  };

  // Google Analytics
  analytics: {
    gaEnabled: boolean;
    measurementId?: string;
    propertyId?: string;
    streamId?: string;
    createdAt?: Date;
  };

  // Google Ads
  googleAds: {
    enabled: boolean;
    accountId?: string;
    conversionTrackingId?: string;
    remarketingTag?: string;
    linkedAt?: Date;
  };

  // Meta (Facebook/Instagram) Ads
  metaAds: {
    enabled: boolean;
    pixelId?: string;
    accessToken?: string;
    adAccountId?: string;
    linkedAt?: Date;
  };

  // SEO Configuration
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: string;
    robotsTxt?: string;
    sitemapEnabled: boolean;
    structuredData?: Record<string, unknown>;
  };

  // Domain Purchase
  purchase: {
    purchasedViaVercel: boolean;
    purchaseDate?: Date;
    expiresAt?: Date;
    registrar?: string;
    autoRenew: boolean;
    creditsCost?: number;
  };

  // Admin
  approvedBy?: string;
  approvedAt?: Date;
  notes?: string;

  // Linked DomainMapping (for migration/backward compat)
  domainMappingId?: mongoose.Types.ObjectId;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────

const DomainRegistrySchema = new Schema<IDomainRegistry>(
  {
    // Core
    domain: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["platform", "agent_subdomain", "agent_custom", "community"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "pending", "suspended", "decommissioned"],
      default: "pending",
    },

    // Ownership
    ownerId: { type: Schema.Types.ObjectId, ref: "User" },
    ownerEmail: String,
    ownerType: {
      type: String,
      enum: ["platform", "agent", "partner"],
      required: true,
    },

    // Target
    target: {
      type: {
        type: String,
        enum: ["homepage", "agent_landing", "community_page", "landing_page"],
        required: true,
      },
      path: { type: String, required: true },
      agentSubdomain: String,
      subdivisionSlug: String,
      cityId: String,
    },

    // Vercel
    vercel: {
      registered: { type: Boolean, default: false },
      verified: { type: Boolean, default: false },
      domainId: String,
      sslStatus: {
        type: String,
        enum: ["pending", "issued", "failed", "not_started"],
        default: "not_started",
      },
      dnsConfigured: { type: Boolean, default: false },
      dnsRecords: [
        {
          type: { type: String },
          name: String,
          value: String,
        },
      ],
      registeredAt: Date,
      verifiedAt: Date,
    },

    // Cloudflare
    cloudflare: {
      registered: { type: Boolean, default: false },
      zoneId: String,
      nameservers: [String],
      status: String,
      nameserversUpdated: { type: Boolean, default: false },
      nameserverCheckedAt: Date,
      registrar: String,
      registeredAt: Date,
    },

    // GSC
    gsc: {
      registered: { type: Boolean, default: false },
      verified: { type: Boolean, default: false },
      propertyUrl: String,
      sitemapSubmitted: { type: Boolean, default: false },
      sitemapUrl: String,
      lastCrawled: Date,
      indexedPages: Number,
      registeredAt: Date,
    },

    // Analytics
    analytics: {
      gaEnabled: { type: Boolean, default: false },
      measurementId: String,
      propertyId: String,
      streamId: String,
      createdAt: Date,
    },

    // Google Ads
    googleAds: {
      enabled: { type: Boolean, default: false },
      accountId: String,
      conversionTrackingId: String,
      remarketingTag: String,
      linkedAt: Date,
    },

    // Meta Ads
    metaAds: {
      enabled: { type: Boolean, default: false },
      pixelId: String,
      accessToken: String,
      adAccountId: String,
      linkedAt: Date,
    },

    // SEO
    seo: {
      metaTitle: String,
      metaDescription: String,
      ogImage: String,
      robotsTxt: String,
      sitemapEnabled: { type: Boolean, default: true },
      structuredData: Schema.Types.Mixed,
    },

    // Purchase
    purchase: {
      purchasedViaVercel: { type: Boolean, default: false },
      purchaseDate: Date,
      expiresAt: Date,
      registrar: String,
      autoRenew: { type: Boolean, default: false },
      creditsCost: Number,
    },

    // Admin
    approvedBy: String,
    approvedAt: Date,
    notes: String,

    // Migration link
    domainMappingId: { type: Schema.Types.ObjectId, ref: "DomainMapping" },
  },
  {
    timestamps: true,
    collection: "domain_registry",
  }
);

// Indexes
// domain already has unique: true
DomainRegistrySchema.index({ type: 1 });
DomainRegistrySchema.index({ status: 1 });
DomainRegistrySchema.index({ ownerId: 1 });
DomainRegistrySchema.index({ ownerEmail: 1 });
DomainRegistrySchema.index({ "vercel.registered": 1 });
DomainRegistrySchema.index({ "cloudflare.registered": 1 });

const DomainRegistry: Model<IDomainRegistry> =
  mongoose.models.DomainRegistry ||
  mongoose.model<IDomainRegistry>("DomainRegistry", DomainRegistrySchema);

export default DomainRegistry;
