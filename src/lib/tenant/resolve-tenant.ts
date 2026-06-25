// src/lib/tenant/resolve-tenant.ts
//
// Agent 07 — control-plane token resolver (Spec 1 Task A + Spec 2 Task A).
//
// This is the cheap, Neon-FREE half of tenant resolution: token hash → the
// ACTIVE Tenant document, in one indexed Mongo lookup. The keystone resolver
// (Agent 10, `resolve-connection.ts`) calls this first, then decrypts the conn
// string and builds the pooled DbAdapter. NOTHING here imports Neon, Postgres,
// or Drizzle (build_plan §4 keystone / Agent 07 accept criteria).
//
// STATUS IS A SECURITY BOUNDARY (build_plan §6.1): the lookup filters on
// `status: "active"` AND excludes any token whose `revokedAt` is set. A
// suspended/pending/teardown tenant, or a revoked token, resolves to `null` —
// it is never silently served. The flat `tokenHashes[]` index gives O(1) match;
// we re-check the per-token `revokedAt` because that flat mirror is denormalized
// (a stale hash there must still be rejected by the authoritative subarray).

import { decryptSecret } from "@/lib/secrets";
import dbConnect from "@/lib/mongoose";
import TenantModel, { ITenant } from "@/models/control/Tenant";

export type { ITenant } from "@/models/control/Tenant";
export { TenantUnavailableError, TenantNotFoundError } from "@/lib/tenant/errors";

/**
 * Resolve the ACTIVE tenant bearing a token whose sha256 hash is `tokenHash`.
 *
 * Returns the tenant ONLY when:
 *   - `status === "active"`, AND
 *   - the matched token in `tenant_tokens[]` is NOT revoked.
 *
 * Returns `null` on any miss (unknown hash, non-active tenant, revoked token).
 * One indexed lookup against `tokenHashes`. Never throws on a miss — callers
 * decide whether a `null` is a 401/403/404.
 *
 * @param tokenHash sha256 hex of the presented `crt_live_*` token (`hashToken`).
 */
export async function resolveTenantByTokenHash(
  tokenHash: string
): Promise<ITenant | null> {
  if (!tokenHash) return null;
  await dbConnect();

  const tenant = await TenantModel.findOne({
    status: "active",
    tokenHashes: tokenHash,
  }).exec();

  if (!tenant) return null;

  // Authoritative re-check against the per-token records: the flat
  // `tokenHashes[]` mirror could lag a revoke. A revoked match ⇒ no tenant.
  const matched = tenant.tenant_tokens.find((t) => t.tokenHash === tokenHash);
  if (!matched || matched.revokedAt) return null;

  return tenant;
}

/**
 * Resolve an ACTIVE tenant by its `tenantId`. Returns `null` when absent or not
 * active. Used by the keystone's `resolveAdapter(tenantId)` path and admin
 * tooling.
 */
export async function resolveTenantById(tenantId: string): Promise<ITenant | null> {
  if (!tenantId) return null;
  await dbConnect();
  return TenantModel.findOne({ tenantId, status: "active" }).exec();
}

/**
 * Decrypt one of a resolved tenant's connection strings.
 *
 * Prefers the model's `decryptConnString` instance method when present (real
 * Mongoose documents), and falls back to decrypting the raw ciphertext field
 * directly — so this also works against plain/mock tenant objects in tests that
 * don't carry Mongoose methods. The plaintext is held transiently by the
 * resolver only; it is NEVER logged or returned to a client (build_plan §3.7 #6).
 *
 * @param kind `"pooled"` → runtime (`connStringEncrypted`); `"direct"` → DDL
 *   (`directConnStringEncrypted`).
 */
export function decryptTenantConnUri(
  tenant: Pick<
    ITenant,
    "tenantId" | "connStringEncrypted" | "directConnStringEncrypted"
  > & { decryptConnString?: ITenant["decryptConnString"] },
  kind: "pooled" | "direct" = "pooled"
): string {
  if (typeof tenant.decryptConnString === "function") {
    return tenant.decryptConnString(kind);
  }
  const payload =
    kind === "direct" ? tenant.directConnStringEncrypted : tenant.connStringEncrypted;
  if (!payload) {
    throw new Error(
      `Tenant ${tenant.tenantId} has no ${kind} connection string provisioned`
    );
  }
  return decryptSecret(payload);
}
