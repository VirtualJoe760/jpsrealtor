// src/models/control/Tenant.ts
//
// Agent 07 — control-plane Tenant registry (Spec 1 Task A + Spec 2 Task A, reconciled).
//
// THIS IS A MONGOOSE MODEL, NOT POSTGRES. build_plan §3.3 settles the Spec 1 ↔
// Spec 2 contradiction: the control plane stays on the EXISTING shared MongoDB
// because (a) the human `User` already lives there and `ownerUserId` is a
// same-store reference, (b) it avoids standing up a second Postgres control DB
// before the keystone exists. The per-tenant *data plane* is Neon/Postgres; the
// registry that maps a token to a Neon DB is here.
//
// O(1) TOKEN RESOLUTION (build_plan §6.1): a request arrives bearing a
// `crt_live_*` token. We sha256 it (`hashToken`) and look the tenant up by the
// denormalized `tokenHashes[]` index — one indexed lookup, no scan over
// `tenant_tokens`. The `tenant_tokens[]` subarray carries the per-token metadata
// (scopes, last4, revokedAt); `tokenHashes[]` is the flat indexed mirror of the
// *active* (non-revoked) hashes. Mint/revoke MUST keep both in sync (and the
// legacy `User.agentProfile…apiTokens` path during cutover — §6.1 gotchas).
//
// SECRETS (build_plan §3.7 #6): connection strings are AES-256-GCM ciphertext
// (via src/lib/secrets.ts) at rest — `connStringEncrypted` (pooled, runtime) and
// `directConnStringEncrypted` (direct, DDL only). They are decrypted ONLY inside
// the resolver, NEVER returned to a client, NEVER logged. The anthropic BYO key
// is likewise stored encrypted.

import mongoose, { Schema, Document, Model } from "mongoose";
import { decryptSecret } from "@/lib/secrets";

// -----------------------------------------------------------------------------
// Status — a SECURITY BOUNDARY, not just a directory filter (build_plan §6.1).
// -----------------------------------------------------------------------------
//
// Only `active` may serve data-plane requests. Every other status is treated as
// unavailable by the resolver (`tenant_not_active` → 403/503). The lifecycle:
//   pending → approved → provisioning → active → (suspended | teardown)
//   provisioning may fail → provision_failed; an application may be → rejected.
export const TENANT_STATUSES = [
  "pending",
  "approved",
  "provisioning",
  "active",
  "suspended",
  "teardown",
  "rejected",
  "provision_failed",
] as const;

export type TenantStatus = (typeof TENANT_STATUSES)[number];

// -----------------------------------------------------------------------------
// Subdocument shapes (camelCase TS fields — build_plan §3.4).
// -----------------------------------------------------------------------------

/** Real-estate license info gathered at signup; the *real* provisioning gate (§7 legal). */
export interface ITenantLicense {
  number?: string;
  state?: string;
  mlsId?: string;
  verifiedAt?: Date;
  verifiedBy?: string; // admin email / id
}

/** Neon project coordinates for this tenant's dedicated data-plane DB. */
export interface ITenantNeon {
  projectId?: string;
  branchId?: string;
  databaseName?: string;
  roleName?: string;
  endpointId?: string;
  region?: string;
  provisionedAt?: Date;
}

/** Encrypted per-tenant secrets (AES-256-GCM via secrets.ts). */
export interface ITenantSecrets {
  anthropicKeyEnc?: string; // BYO Anthropic key ciphertext
  anthropicLast4?: string;
}

/** Denormalized usage metering (free-for-now; see Agent 23). */
export interface ITenantMetering {
  rowCount?: number;
  photoCount?: number;
  lastSyncAt?: Date;
}

/**
 * Per-token metadata. The token PLAINTEXT is never stored — only its sha256
 * hash (`hashToken`). `revokedAt` set ⇒ the token is dead; the resolver
 * excludes it (and its hash is pulled from the flat `tokenHashes[]` mirror).
 */
export interface ITenantToken {
  tokenHash: string; // sha256 hex
  last4: string;
  name: string; // user-supplied label, e.g. "MacBook"
  scopes: string[];
  createdAt: Date;
  lastUsedAt?: Date;
  revokedAt?: Date;
}

// -----------------------------------------------------------------------------
// Document interface
// -----------------------------------------------------------------------------

export interface ITenant extends Document {
  _id: mongoose.Types.ObjectId;

  /** Stable tenant identifier (slug or uuid), unique. The keystone keys the LRU on this. */
  tenantId: string;
  /** URL-friendly slug. */
  slug: string;
  /** Human-readable display name. */
  displayName?: string;
  /**
   * Owning Mongo `User._id` as an opaque string — a cross-store correlation
   * handle, NEVER JOINed (the data plane is a different DB entirely).
   */
  ownerUserId: string;

  /** Lifecycle status — a security boundary (see TENANT_STATUSES). */
  status: TenantStatus;

  license: ITenantLicense;
  neon: ITenantNeon;

  /** AES-256-GCM ciphertext of the POOLED (`-pooler`) conn URI; runtime reads. Never returned to a client. */
  connStringEncrypted?: string;
  /** AES-256-GCM ciphertext of the DIRECT conn URI; DDL / migrations only. */
  directConnStringEncrypted?: string;

  secrets: ITenantSecrets;
  metering: ITenantMetering;

  /**
   * Flat, indexed mirror of every ACTIVE (non-revoked) token's sha256 hash —
   * the O(1) `tokenHash → tenant` resolve index. Kept in sync with
   * `tenant_tokens[]` on every mint/revoke.
   */
  tokenHashes: string[];
  /** Full per-token records (scopes, metadata, revocation). */
  tenant_tokens: ITenantToken[];

  // --- audit ---
  appliedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  provisionedAt?: Date;
  lastProvisionError?: string;

  createdAt: Date;
  updatedAt: Date;

  /**
   * Decrypt one of this tenant's conn strings. `"pooled"` → runtime
   * (`connStringEncrypted`); `"direct"` → DDL (`directConnStringEncrypted`).
   * Throws if the requested field is absent. The plaintext is NEVER logged or
   * returned to a client — callers (the resolver) hold it transiently only.
   */
  decryptConnString(kind?: "pooled" | "direct"): string;
}

// -----------------------------------------------------------------------------
// Schema
// -----------------------------------------------------------------------------

const LicenseSchema = new Schema<ITenantLicense>(
  {
    number: String,
    state: String,
    mlsId: String,
    verifiedAt: Date,
    verifiedBy: String,
  },
  { _id: false }
);

const NeonSchema = new Schema<ITenantNeon>(
  {
    projectId: String,
    branchId: String,
    databaseName: String,
    roleName: String,
    endpointId: String,
    region: String,
    provisionedAt: Date,
  },
  { _id: false }
);

const SecretsSchema = new Schema<ITenantSecrets>(
  {
    anthropicKeyEnc: String,
    anthropicLast4: String,
  },
  { _id: false }
);

const MeteringSchema = new Schema<ITenantMetering>(
  {
    rowCount: { type: Number, default: 0 },
    photoCount: { type: Number, default: 0 },
    lastSyncAt: Date,
  },
  { _id: false }
);

const TenantTokenSchema = new Schema<ITenantToken>(
  {
    tokenHash: { type: String, required: true },
    last4: { type: String, required: true },
    name: { type: String, required: true },
    scopes: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
    lastUsedAt: Date,
    revokedAt: Date,
  },
  { _id: false }
);

const TenantSchema = new Schema<ITenant>(
  {
    tenantId: { type: String, required: true, unique: true },
    slug: { type: String, required: true },
    displayName: String,
    ownerUserId: { type: String, required: true, unique: true },

    status: {
      type: String,
      enum: TENANT_STATUSES,
      default: "pending",
      required: true,
    },

    license: { type: LicenseSchema, default: () => ({}) },
    neon: { type: NeonSchema, default: () => ({}) },

    connStringEncrypted: String,
    directConnStringEncrypted: String,

    secrets: { type: SecretsSchema, default: () => ({}) },
    metering: { type: MeteringSchema, default: () => ({}) },

    tokenHashes: { type: [String], default: [] },
    tenant_tokens: { type: [TenantTokenSchema], default: [] },

    // audit
    appliedAt: Date,
    approvedAt: Date,
    rejectedAt: Date,
    rejectionReason: String,
    provisionedAt: Date,
    lastProvisionError: String,
  },
  { timestamps: true, collection: "tenants" }
);

// Indexes (build_plan §6.1). `tenantId` + `ownerUserId` uniqueness is declared
// on the fields above; these add the resolve/filter indexes.
TenantSchema.index({ tokenHashes: 1 }); // O(1) token → tenant
TenantSchema.index({ status: 1 }); // status filtering / cron sweeps

// -----------------------------------------------------------------------------
// Instance methods
// -----------------------------------------------------------------------------

TenantSchema.methods.decryptConnString = function (
  this: ITenant,
  kind: "pooled" | "direct" = "pooled"
): string {
  const payload =
    kind === "direct" ? this.directConnStringEncrypted : this.connStringEncrypted;
  if (!payload) {
    // Do NOT include any secret material — just which field was missing.
    throw new Error(
      `Tenant ${this.tenantId} has no ${kind} connection string provisioned`
    );
  }
  return decryptSecret(payload);
};

// -----------------------------------------------------------------------------
// Hot-reload-safe registration (build_plan §3.3 / Agent 07 accept criteria).
//
// `mongoose.models.Tenant ?? model(...)` so Next.js dev hot-reload (and repeated
// imports under the Node test runner) don't re-register and throw
// OverwriteModelError. Mirrors the User model's pattern.
// -----------------------------------------------------------------------------

const TenantModel: Model<ITenant> =
  (mongoose.models.Tenant as Model<ITenant>) ??
  mongoose.model<ITenant>("Tenant", TenantSchema);

export default TenantModel;
