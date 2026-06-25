// src/lib/control/store.ts
//
// Agent 07 — the single control-store binding.
//
// build_plan §3.3 preserves Spec 1's `TenantRepo`/`TenantTokenRepo` INTERFACE
// as thin functions over the Mongoose `Tenant` model — so call sites read
// identically to a repo, but there is NO second Postgres adapter. This is the
// one place the control plane is touched; every consumer (the approval gate,
// signup, provisioning orchestration, metering) goes through these functions
// rather than reaching into the model directly. That keeps the denormalization
// invariant (build_plan §6.1) — `tokenHashes[]` ⇄ `tenant_tokens[]` — enforced
// in a single module.
//
// Metering WRITES live in a sibling `src/lib/metering/store.ts` (Agent 23), NOT
// here, by the §5 Agent-23 coordination note. This file owns tenant + token
// reads/mutations only.

import dbConnect from "@/lib/mongoose";
import TenantModel, { ITenant, ITenantToken, TenantStatus } from "@/models/control/Tenant";

// -----------------------------------------------------------------------------
// TenantRepo — tenant-document reads & lifecycle mutations.
// -----------------------------------------------------------------------------

export const TenantRepo = {
  /** Find a tenant by `tenantId` (any status). `null` when absent. */
  async findByTenantId(tenantId: string): Promise<ITenant | null> {
    await dbConnect();
    return TenantModel.findOne({ tenantId }).exec();
  },

  /** Find a tenant by owning Mongo `User._id` string. `null` when absent. */
  async findByOwnerUserId(ownerUserId: string): Promise<ITenant | null> {
    await dbConnect();
    return TenantModel.findOne({ ownerUserId }).exec();
  },

  /**
   * Find the ACTIVE tenant whose `tokenHashes[]` contains `tokenHash`. Does NOT
   * re-check per-token revocation — `resolve-tenant.ts` owns that authoritative
   * check. This is the raw indexed lookup.
   */
  async findActiveByTokenHash(tokenHash: string): Promise<ITenant | null> {
    await dbConnect();
    return TenantModel.findOne({ status: "active", tokenHashes: tokenHash }).exec();
  },

  /** List tenants in a given status (e.g. cron sweeps over `pending`). */
  async listByStatus(status: TenantStatus): Promise<ITenant[]> {
    await dbConnect();
    return TenantModel.find({ status }).exec();
  },

  /** Create a tenant document. */
  async create(doc: Partial<ITenant>): Promise<ITenant> {
    await dbConnect();
    return TenantModel.create(doc);
  },

  /** Set a tenant's lifecycle status, with optional audit fields. */
  async setStatus(
    tenantId: string,
    status: TenantStatus,
    audit?: Partial<
      Pick<
        ITenant,
        | "approvedAt"
        | "rejectedAt"
        | "rejectionReason"
        | "provisionedAt"
        | "lastProvisionError"
      >
    >
  ): Promise<ITenant | null> {
    await dbConnect();
    return TenantModel.findOneAndUpdate(
      { tenantId },
      { $set: { status, ...(audit ?? {}) } },
      { new: true }
    ).exec();
  },
};

// -----------------------------------------------------------------------------
// TenantTokenRepo — token mint / revoke, keeping the denormalized invariant.
//
// INVARIANT (build_plan §6.1): `tokenHashes[]` is the flat indexed mirror of
// every ACTIVE token's hash. Mint adds to both arrays; revoke marks the
// `tenant_tokens[]` record `revokedAt` AND pulls the hash from `tokenHashes[]`.
// These two functions are the ONLY supported way to mutate tokens, so the two
// arrays can never drift.
// -----------------------------------------------------------------------------

export const TenantTokenRepo = {
  /**
   * Attach a freshly minted token to a tenant. Caller supplies the sha256
   * `tokenHash` (the plaintext is shown ONCE at the call site and never stored
   * or logged). Pushes the per-token record AND the flat hash atomically.
   */
  async attachToken(
    tenantId: string,
    token: { tokenHash: string; last4: string; name: string; scopes?: string[] }
  ): Promise<ITenant | null> {
    await dbConnect();
    const record: ITenantToken = {
      tokenHash: token.tokenHash,
      last4: token.last4,
      name: token.name,
      scopes: token.scopes ?? [],
      createdAt: new Date(),
    };
    return TenantModel.findOneAndUpdate(
      { tenantId },
      {
        $push: { tenant_tokens: record },
        $addToSet: { tokenHashes: token.tokenHash },
      },
      { new: true }
    ).exec();
  },

  /**
   * Revoke a token: stamp `revokedAt` on its `tenant_tokens[]` record and pull
   * its hash from the flat `tokenHashes[]` mirror so the resolver stops matching
   * it immediately.
   */
  async revokeToken(tenantId: string, tokenHash: string): Promise<ITenant | null> {
    await dbConnect();
    return TenantModel.findOneAndUpdate(
      { tenantId },
      {
        $set: { "tenant_tokens.$[tok].revokedAt": new Date() },
        $pull: { tokenHashes: tokenHash },
      },
      {
        new: true,
        arrayFilters: [{ "tok.tokenHash": tokenHash, "tok.revokedAt": { $exists: false } }],
      }
    ).exec();
  },

  /** Best-effort `lastUsedAt` bump for a token (non-blocking on the hot path). */
  async touchToken(tenantId: string, tokenHash: string): Promise<void> {
    await dbConnect();
    await TenantModel.updateOne(
      { tenantId },
      { $set: { "tenant_tokens.$[tok].lastUsedAt": new Date() } },
      { arrayFilters: [{ "tok.tokenHash": tokenHash }] }
    ).exec();
  },
};

export type { ITenant, ITenantToken } from "@/models/control/Tenant";
