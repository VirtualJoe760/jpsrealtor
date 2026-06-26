// src/lib/tenant/provisioning-gate.ts
//
// Agent 12 — the tenant approval gate (build_plan §6.1, Spec 1 Task C).
//
// This is the BaaS analogue of `src/lib/partner-moderation.ts`: the one place a
// tenant application is moved from `pending` to a live data plane, so status,
// the once-only token mint, the license audit stamp, the provisioning hand-off,
// and the (best-effort) notification stay consistent across every caller —
// admin review, the signup auto-approve path, and the cron backstop (Agent 22).
//
// THE APPROVE FLOW (`approveTenant`):
//   1. load the tenant; assert it is `pending` (the only legal pre-approval state)
//   2. mint EXACTLY ONE crt_live token via `generateApiToken` (secrets.ts)
//   3. attach its HASH to the tenant (control store) — keeps the denormalized
//      tokenHashes[] ⇄ tenant_tokens[] invariant (build_plan §6.1); the plaintext
//      is NEVER stored and NEVER logged
//   4. flip status `pending → approved`, stamp the license-verified audit fields
//      (license.verifiedAt / license.verifiedBy + approvedAt)
//   5. hand off to `provisionTenant` (Agent 16) to spin up the Neon data plane
//   6. best-effort notify (never throws)
//   → return the token PLAINTEXT exactly ONCE to the caller (the route surfaces it
//     to the admin and discards it). It is never returned again.
//
// THE REJECT FLOW (`rejectTenant`): status `→ rejected` + a rejection reason +
// `rejectedAt`, best-effort notify. No token, no provisioning.
//
// THE TOGGLE (`getTenantAutoApprove`): reads `PlatformConfig.moderation
// .tenantAutoApprove`, default **OFF** (build_plan §6.1 / Agent 12 accept). Unlike
// partner auto-approve (default ON), a tenant approval mints a live token + a
// dedicated Postgres data plane, so the safe default is manual admin review. The
// license is the real gate (build_plan §7 legal-review flag).
//
// SECRETS (build_plan §3.7 #6): the token plaintext is returned once and never
// logged; only its sha256 hash is persisted. Conn strings are handled inside the
// provisioning service / keystone, never here.
//
// TESTABILITY (build_plan §3.6): every external system (control store, secrets
// mint, provisioning service, PlatformConfig, email) is reachable through the
// injectable `deps` object swapped via `__setProvisioningGateDeps` — mirroring the
// provision-service seam — so the unit test runs the REAL gate logic against fully
// fake collaborators with zero Mongo / Neon / network.

import { generateApiToken } from "@/lib/secrets";
import { TenantRepo, TenantTokenRepo } from "@/lib/control/store";
import { provisionTenant } from "@/lib/tenant/provision-service";
import { TenantNotFoundError, TenantUnavailableError } from "@/lib/tenant/errors";
import type { ITenant } from "@/models/control/Tenant";

const MODERATION_ID = "moderation";

// -----------------------------------------------------------------------------
// Result shapes
// -----------------------------------------------------------------------------

/**
 * The result of an approval. `token` is the freshly minted crt_live plaintext,
 * present EXACTLY ONCE — the caller (admin route) surfaces it and then it is
 * unrecoverable. `last4`/`tenant` are safe to log; `token` is NOT.
 */
export interface ApproveTenantResult {
  tenant: ITenant;
  /** crt_live_* plaintext. Returned once; never logged, never persisted. */
  token: string;
  last4: string;
}

// -----------------------------------------------------------------------------
// Injectable dependencies (the ONLY seam tests swap — no live Mongo/Neon/secrets)
// -----------------------------------------------------------------------------

export interface ProvisioningGateDeps {
  /** Load a tenant by id (any status). */
  findTenant: (tenantId: string) => Promise<ITenant | null>;
  /**
   * Stamp the license-verified audit fields + status `approved`. Done on the
   * tenant document because `TenantRepo.setStatus` carries only the generic
   * audit fields, not the nested `license.*` ones.
   */
  saveApproved: (tenant: ITenant, approvedBy: string) => Promise<ITenant>;
  /** Set a tenant `rejected` with a reason (+ `rejectedAt`). */
  setRejected: (tenantId: string, reason: string) => Promise<ITenant | null>;
  /** Mint a fresh crt_live token: `{ plaintext, hash, last4 }`. */
  mintToken: () => { plaintext: string; hash: string; last4: string };
  /** Attach a minted token's HASH to the tenant (denormalized invariant). */
  attachToken: (
    tenantId: string,
    token: { tokenHash: string; last4: string; name: string; scopes?: string[] },
  ) => Promise<ITenant | null>;
  /** Hand off to the provisioning service (Agent 16) to spin up the data plane. */
  provisionTenant: (tenant: ITenant) => Promise<ITenant>;
  /** Read the `tenantAutoApprove` toggle. */
  getAutoApproveConfig: () => Promise<boolean>;
  /** Best-effort notification. MUST never throw into the gate. */
  notifyApproved: (tenant: ITenant) => Promise<void>;
  notifyRejected: (tenant: ITenant, reason: string) => Promise<void>;
}

// -----------------------------------------------------------------------------
// Default dependency implementations (production wiring)
// -----------------------------------------------------------------------------

/**
 * Default `saveApproved`: stamp license-verified audit + `approvedAt` + status
 * `approved` on the live Mongoose document and save. (`approvedBy` doubles as the
 * license verifier — an admin approving a tenant is attesting the license.)
 */
async function defaultSaveApproved(tenant: ITenant, approvedBy: string): Promise<ITenant> {
  const now = new Date();
  tenant.status = "approved";
  tenant.approvedAt = now;
  tenant.license = tenant.license ?? ({} as ITenant["license"]);
  tenant.license.verifiedAt = now;
  tenant.license.verifiedBy = approvedBy;
  // A fresh approval clears any prior rejection marker.
  tenant.rejectedAt = undefined;
  tenant.rejectionReason = undefined;
  await tenant.save();
  return tenant;
}

/** Default `setRejected`: status `rejected` + reason + `rejectedAt` via the store. */
async function defaultSetRejected(tenantId: string, reason: string): Promise<ITenant | null> {
  return TenantRepo.setStatus(tenantId, "rejected", {
    rejectedAt: new Date(),
    rejectionReason: reason,
  });
}

/**
 * Default `getAutoApproveConfig`: read `PlatformConfig.moderation.tenantAutoApprove`,
 * default **OFF**. A missing config doc OR a missing field both read as OFF.
 * Imported lazily so the module loads without a live Mongo connection (tests swap
 * this dep anyway).
 */
async function defaultGetAutoApproveConfig(): Promise<boolean> {
  const [{ default: dbConnect }, { default: PlatformConfig }] = await Promise.all([
    import("@/lib/mongoose"),
    import("@/models/PlatformConfig"),
  ]);
  await dbConnect();
  const cfg = await PlatformConfig.findById(MODERATION_ID).lean<{
    moderation?: { tenantAutoApprove?: boolean };
  }>();
  // Default OFF: only ON when an admin has explicitly enabled it.
  return cfg?.moderation?.tenantAutoApprove === true;
}

const deps: ProvisioningGateDeps = {
  findTenant: (tenantId) => TenantRepo.findByTenantId(tenantId),
  saveApproved: defaultSaveApproved,
  setRejected: defaultSetRejected,
  mintToken: () => generateApiToken(),
  attachToken: (tenantId, token) => TenantTokenRepo.attachToken(tenantId, token),
  provisionTenant: (tenant) => provisionTenant(tenant),
  getAutoApproveConfig: defaultGetAutoApproveConfig,
  // No tenant-specific email template exists yet; default is a no-op so the
  // "best-effort, never throws" contract holds. Wire a real sender here later.
  notifyApproved: async () => {},
  notifyRejected: async () => {},
};

/**
 * Swap the gate's dependencies. TEST-ONLY. Returns a restore function. Mirrors
 * `__setProvisionServiceDeps` so the unit test exercises the REAL gate logic with
 * fake control store / secrets / provisioning / config / email.
 */
export function __setProvisioningGateDeps(
  patch: Partial<ProvisioningGateDeps>,
): () => void {
  const prev = { ...deps };
  Object.assign(deps, patch);
  return () => Object.assign(deps, prev);
}

// -----------------------------------------------------------------------------
// getTenantAutoApprove
// -----------------------------------------------------------------------------

/**
 * Whether new tenant applications should be approved automatically. Defaults to
 * **FALSE** (manual admin review) — see module header. The cron backstop
 * (Agent 22) consults this; the license is the real gate.
 */
export async function getTenantAutoApprove(): Promise<boolean> {
  return deps.getAutoApproveConfig();
}

// -----------------------------------------------------------------------------
// approveTenant
// -----------------------------------------------------------------------------

/**
 * Approve a `pending` tenant: mint exactly ONE crt_live token, attach its hash,
 * stamp the license-verified audit fields, flip status to `approved`, then hand
 * off to the provisioning service to spin up the Neon data plane.
 *
 * Returns the token PLAINTEXT exactly once (the caller surfaces it and discards
 * it). The plaintext is never logged and never returned again.
 *
 * @param tenantId    the tenant to approve.
 * @param approvedBy  admin email / id (doubles as the license verifier), or a
 *                    system marker like "auto-approve" / "auto-approve-cron".
 * @throws TenantNotFoundError  when no tenant matches `tenantId`.
 * @throws TenantUnavailableError when the tenant is not `pending`.
 */
export async function approveTenant(
  tenantId: string,
  approvedBy: string,
): Promise<ApproveTenantResult> {
  const tenant = await deps.findTenant(tenantId);
  if (!tenant) {
    throw new TenantNotFoundError(`Tenant ${tenantId} not found`);
  }
  // Only a `pending` application may be approved. Re-approving an already
  // approved/active tenant would mint a second token + re-provision — reject it.
  if (tenant.status !== "pending") {
    throw new TenantUnavailableError(
      `Tenant ${tenantId} is not pending approval (status: ${tenant.status})`,
      tenant.status,
    );
  }

  // 1. Mint EXACTLY ONE token. The plaintext is held transiently; only the hash
  //    is persisted (attachToken). Never logged.
  const minted = deps.mintToken();

  // 2. Attach its hash to the tenant (denormalized tokenHashes[] ⇄ tenant_tokens[]).
  await deps.attachToken(tenantId, {
    tokenHash: minted.hash,
    last4: minted.last4,
    name: "Initial provisioning token",
  });

  // 3. Flip status + stamp license-verified audit fields.
  const approved = await deps.saveApproved(tenant, approvedBy);

  // 4. Hand off to provisioning (Agent 16). If this throws, the tenant is already
  //    `approved` with a token attached — provisioning's own defensive path
  //    marks `provision_failed`, and re-running approval/provisioning is the
  //    recovery. We let a provisioning error propagate so the caller knows the
  //    data plane is not yet live (the token plaintext is still returned to the
  //    admin only on the success path below).
  await deps.provisionTenant(approved);

  // 5. Best-effort notify — must never throw.
  await deps.notifyApproved(approved).catch((err) => {
    console.error("[provisioning-gate] approval notification failed:", err);
  });

  // Plaintext returned ONCE.
  return { tenant: approved, token: minted.plaintext, last4: minted.last4 };
}

// -----------------------------------------------------------------------------
// rejectTenant
// -----------------------------------------------------------------------------

/**
 * Reject a tenant application: status `→ rejected` with a reason (+ `rejectedAt`).
 * No token is minted, no data plane is provisioned. Best-effort notify.
 *
 * @throws TenantNotFoundError when no tenant matches `tenantId`.
 */
export async function rejectTenant(
  tenantId: string,
  reason: string,
): Promise<ITenant> {
  const safeReason = (reason || "").trim() || "Rejected by admin";
  const rejected = await deps.setRejected(tenantId, safeReason);
  if (!rejected) {
    throw new TenantNotFoundError(`Tenant ${tenantId} not found`);
  }

  await deps.notifyRejected(rejected, safeReason).catch((err) => {
    console.error("[provisioning-gate] rejection notification failed:", err);
  });

  return rejected;
}
