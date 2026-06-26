// src/lib/tenant/provision-service.ts
//
// Agent 16 — tenant provisioning service (orchestration).
//
// This is the HIGH-LEVEL orchestration that turns an APPROVED tenant into an
// ACTIVE one with a live, dedicated Neon/Postgres data plane. It is the product
// counterpart of the one-shot `scripts/neon-setup.ts` CLI: same proven flow
// (createProject → CREATE EXTENSION postgis/pg_trgm → apply 0001_init.sql), but
// driven by the control store and wrapped in the defensive lifecycle the build
// plan mandates (build_plan §6.2 / Agent 16 acceptance).
//
// BOUNDARY (build_plan §5 / §6.2): the Neon-API *mechanics* (typed HTTP client,
// createProject/deleteProject, pooled-URI derivation) live in
// `src/lib/neon/client.ts` (Agent 08). THIS file owns the ORCHESTRATION only —
// it composes those primitives, runs the migration over `pg`, encrypts and
// stores the conn strings, and flips the tenant lifecycle status. It never
// re-implements Neon HTTP and never opens a data-plane connection that outlives
// the call.
//
// THE FLOW (provisionTenant, for an APPROVED tenant):
//   1. createProject (Neon)  → projectId + DIRECT + POOLED conn URIs
//   2. connect over the DIRECT uri with `pg`
//   3. CREATE EXTENSION postgis; CREATE EXTENSION pg_trgm
//   4. apply src/lib/reso/migrations/0001_init.sql (idempotent), stamp ledger
//   5. ENCRYPT (secrets.ts) the pooled + direct conn strings
//   6. store the ciphertext + the neon projectId on the Tenant (control store)
//   7. set status "active"
//
// DEFENSIVE (build_plan §6.2 gotchas): on ANY failure we mark `neon.status`
// "failed" + `lastProvisionError`, BEST-EFFORT `deleteProject` (so a half-built
// Neon project is not orphaned and billed), and re-throw. We NEVER leave a
// half-state silently. The returned tenant NEVER carries a plaintext conn string
// (the ciphertext fields are decryptable only inside the keystone resolver).
//
// SECRETS (build_plan §3.7 #6): the conn strings (which embed a password) are
// AES-256-GCM-encrypted before they touch the control store, and are NEVER
// logged, echoed, or returned to a caller. `lastProvisionError` carries only the
// failure message (which our own code constructs without secret material).
//
// teardownTenant: deleteProject (swallowing a 404) + clear the stored conn
// strings + projectId so the tenant can be re-provisioned cleanly.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { Client } from "pg";

import {
  createProject,
  deleteProject,
  NeonApiError,
  type CreatedProject,
} from "@/lib/neon/client";
import { encryptSecret } from "@/lib/secrets";
import { TenantRepo } from "@/lib/control/store";
import { TenantUnavailableError } from "@/lib/tenant/errors";
import type { ITenant } from "@/models/control/Tenant";

// -----------------------------------------------------------------------------
// Migration path resolution (mirrors scripts/neon-setup.ts).
// -----------------------------------------------------------------------------
//
// 0001_init.sql is Agent 04's canonical per-tenant data-plane migration; we only
// CALL it (build_plan §5 Agent-04 ↔ Agent-16 coordination). It already carries
// the `CREATE EXTENSION postgis/pg_trgm` preamble and the `schema_migrations`
// ledger table, and is fully idempotent (all `CREATE ... IF NOT EXISTS`).

const HERE = dirname(fileURLToPath(import.meta.url));
// src/lib/tenant → src/lib/reso/migrations
const MIGRATION_PATH = join(
  HERE,
  "..",
  "reso",
  "migrations",
  "0001_init.sql",
);

// -----------------------------------------------------------------------------
// Injectable dependencies (the ONLY seam tests swap — no live Neon / pg / Mongo)
// -----------------------------------------------------------------------------
//
// Every external system is reachable through this `deps` object so the unit test
// can run the REAL orchestration logic with fully fake collaborators: a fake
// Neon API, a fake `pg.Client`, a fake control store, and a fake encryptor. That
// is the build_plan §3.6 rule for the provisioning subsystem — all external
// calls mocked, failure paths asserted, NO live project creation.

/** The minimal `pg.Client`-shaped surface the migration runner uses. */
export interface PgClientLike {
  connect(): Promise<void>;
  query(sql: string, values?: unknown[]): Promise<unknown>;
  end(): Promise<void>;
}

export interface ProvisionServiceDeps {
  /** Create a Neon project (returns projectId + direct + pooled conn URIs). */
  createProject: (opts: { name: string; regionId?: string }) => Promise<CreatedProject>;
  /** Delete a Neon project (teardown / rollback). Caller swallows a 404. */
  deleteProject: (projectId: string) => Promise<void>;
  /**
   * Open a `pg` client over a DIRECT conn string (for CREATE EXTENSION + DDL —
   * pgBouncer/pooled endpoints cannot run session DDL).
   */
  createPgClient: (directConnUri: string) => PgClientLike;
  /** Read the 0001_init.sql migration text. */
  readMigrationSql: () => string;
  /** AES-256-GCM-encrypt a conn string before it touches the control store. */
  encryptSecret: (plaintext: string) => string;
  /** Load a tenant by id (any status). */
  findTenant: (tenantId: string) => Promise<ITenant | null>;
  /**
   * Persist the provisioned data-plane coordinates + encrypted conn strings and
   * flip the tenant to `active`. Returns the updated tenant. Implemented over
   * the Mongoose document so it round-trips a real save in production but is
   * trivially fakeable in tests.
   */
  saveProvisioned: (
    tenantId: string,
    patch: ProvisionedPatch,
  ) => Promise<ITenant | null>;
  /** Mark a failed provision: neon failure status + lastError, keep status off "active". */
  markFailed: (tenantId: string, lastError: string) => Promise<ITenant | null>;
  /** Clear the stored conn strings + projectId on teardown. */
  clearProvisioned: (tenantId: string) => Promise<ITenant | null>;
}

/** The fields written on a successful provision. */
export interface ProvisionedPatch {
  neonProjectId: string;
  databaseName: string;
  roleName: string;
  connStringEncrypted: string;
  directConnStringEncrypted: string;
}

// -----------------------------------------------------------------------------
// Default dependency implementations (the production wiring).
// -----------------------------------------------------------------------------

/**
 * Default `saveProvisioned`: load the tenant doc, stamp the neon coordinates +
 * encrypted conn strings, set status "active", `.save()`. Done on the live
 * Mongoose document because `TenantRepo.setStatus` intentionally only carries
 * the audit fields — the neon/secret fields are written here, in the one module
 * that owns provisioning.
 */
async function defaultSaveProvisioned(
  tenantId: string,
  patch: ProvisionedPatch,
): Promise<ITenant | null> {
  const tenant = await TenantRepo.findByTenantId(tenantId);
  if (!tenant) return null;

  tenant.neon.projectId = patch.neonProjectId;
  tenant.neon.databaseName = patch.databaseName;
  tenant.neon.roleName = patch.roleName;
  tenant.neon.provisionedAt = new Date();
  tenant.connStringEncrypted = patch.connStringEncrypted;
  tenant.directConnStringEncrypted = patch.directConnStringEncrypted;
  tenant.status = "active";
  tenant.provisionedAt = new Date();
  // A successful provision clears any prior failure marker.
  tenant.lastProvisionError = undefined;

  await tenant.save();
  return tenant;
}

/**
 * Default `markFailed`: stamp `lastProvisionError` and set status
 * "provision_failed" (a non-active status — the keystone treats it as
 * unavailable). NEVER include secret material in `lastError`.
 */
async function defaultMarkFailed(
  tenantId: string,
  lastError: string,
): Promise<ITenant | null> {
  return TenantRepo.setStatus(tenantId, "provision_failed", {
    lastProvisionError: lastError,
  });
}

/** Default `clearProvisioned`: wipe conn strings + neon projectId on teardown. */
async function defaultClearProvisioned(tenantId: string): Promise<ITenant | null> {
  const tenant = await TenantRepo.findByTenantId(tenantId);
  if (!tenant) return null;
  tenant.connStringEncrypted = undefined;
  tenant.directConnStringEncrypted = undefined;
  tenant.neon.projectId = undefined;
  tenant.status = "teardown";
  await tenant.save();
  return tenant;
}

const deps: ProvisionServiceDeps = {
  createProject: (opts) => createProject(opts),
  deleteProject: (projectId) => deleteProject(projectId),
  createPgClient: (directConnUri) =>
    new Client({ connectionString: directConnUri }) as unknown as PgClientLike,
  readMigrationSql: () => readFileSync(MIGRATION_PATH, "utf8"),
  encryptSecret: (plaintext) => encryptSecret(plaintext),
  findTenant: (tenantId) => TenantRepo.findByTenantId(tenantId),
  saveProvisioned: defaultSaveProvisioned,
  markFailed: defaultMarkFailed,
  clearProvisioned: defaultClearProvisioned,
};

/**
 * Swap the provisioning service's dependencies. TEST-ONLY. Returns a restore
 * function. Mirrors the keystone's `__setResolveConnectionDeps` seam so the unit
 * test exercises the REAL orchestration with fake Neon/pg/store/secrets.
 */
export function __setProvisionServiceDeps(
  patch: Partial<ProvisionServiceDeps>,
): () => void {
  const prev = { ...deps };
  Object.assign(deps, patch);
  return () => Object.assign(deps, prev);
}

// -----------------------------------------------------------------------------
// Input normalization
// -----------------------------------------------------------------------------

/** Accept either a tenant doc or a `{ tenantId }` handle. */
export type ProvisionInput = ITenant | { tenantId: string };

function inputTenantId(input: ProvisionInput): string {
  const id = (input as { tenantId?: unknown }).tenantId;
  if (typeof id !== "string" || id.length === 0) {
    throw new TenantUnavailableError("provisionTenant: a tenantId is required");
  }
  return id;
}

// -----------------------------------------------------------------------------
// Migration runner (over the DIRECT connection)
// -----------------------------------------------------------------------------
//
// Mirrors scripts/neon-setup.ts: connect, CREATE EXTENSION postgis + pg_trgm,
// apply the idempotent 0001_init.sql, stamp the schema_migrations ledger. The
// migration file ALSO carries the extension preamble, so the explicit CREATE
// EXTENSION calls here are belt-and-suspenders (and make the intent obvious /
// give a clearer failure if PostGIS is unavailable on the plan). Everything runs
// inside a try/finally that always `end()`s the client so a connection never
// leaks out of provisioning.

async function applyMigrationOverDirect(directConnUri: string): Promise<void> {
  const client = deps.createPgClient(directConnUri);
  try {
    await client.connect();
    // Extensions FIRST (PostGIS is mandatory for the geo/map layer; pg_trgm for
    // street-resolve search). DDL must run on the direct (non-pooled) conn.
    await client.query("CREATE EXTENSION IF NOT EXISTS postgis;");
    await client.query("CREATE EXTENSION IF NOT EXISTS pg_trgm;");

    const sql = deps.readMigrationSql();
    // `pg` runs the multi-statement idempotent migration in one round-trip.
    await client.query(sql);

    // Stamp the migration ledger (idempotent via ON CONFLICT).
    await client.query(
      `INSERT INTO schema_migrations (version) VALUES ($1)
       ON CONFLICT (version) DO NOTHING;`,
      ["0001_init"],
    );
  } finally {
    // Best-effort close; a failed end() must not mask the original error.
    await client.end().catch(() => {
      /* swallow */
    });
  }
}

// -----------------------------------------------------------------------------
// provisionTenant
// -----------------------------------------------------------------------------

/**
 * Provision the dedicated Neon/Postgres data plane for an APPROVED tenant and
 * flip it to `active`.
 *
 * On success the tenant carries its neon `projectId`, encrypted pooled + direct
 * conn strings, and `status: "active"`. The returned tenant NEVER carries a
 * plaintext conn string.
 *
 * On ANY failure: the tenant is marked `provision_failed` + `lastProvisionError`
 * (no secret material), a best-effort `deleteProject` cleans up the (possibly
 * half-built) Neon project so it is not orphaned/billed, and the original error
 * is re-thrown. We never leave a half-state silently (build_plan §6.2).
 *
 * @param input the tenant doc or a `{ tenantId }` handle. Must resolve to a
 *   tenant in status `approved` (the only legal pre-provision state).
 */
export async function provisionTenant(input: ProvisionInput): Promise<ITenant> {
  const tenantId = inputTenantId(input);

  const tenant = await deps.findTenant(tenantId);
  if (!tenant) {
    throw new TenantUnavailableError(`Tenant ${tenantId} not found`);
  }
  // Only an APPROVED tenant may be provisioned. An already-active tenant is a
  // no-op-worthy state but, more importantly, must not be re-provisioned (that
  // would orphan its live project) — reject anything that is not "approved".
  if (tenant.status !== "approved") {
    throw new TenantUnavailableError(
      `Tenant ${tenantId} is not approved (status: ${tenant.status})`,
      tenant.status,
    );
  }

  // Track the created project so a failure AFTER createProject can roll it back.
  let createdProjectId: string | undefined;

  try {
    // 1. Create the Neon project (default DB + owner role + endpoint).
    const project = await deps.createProject({
      name: `chatrealty-tenant-${tenantId}`,
    });
    createdProjectId = project.projectId;

    // 2–4. Extensions + migration over the DIRECT conn.
    await applyMigrationOverDirect(project.directConnUri);

    // 5. Encrypt BOTH conn strings before they touch the control store.
    const connStringEncrypted = deps.encryptSecret(project.pooledConnUri);
    const directConnStringEncrypted = deps.encryptSecret(project.directConnUri);

    // 6–7. Persist coordinates + ciphertext, flip status → active.
    const updated = await deps.saveProvisioned(tenantId, {
      neonProjectId: project.projectId,
      databaseName: project.defaultDatabase,
      roleName: project.defaultRole,
      connStringEncrypted,
      directConnStringEncrypted,
    });
    if (!updated) {
      throw new TenantUnavailableError(
        `Tenant ${tenantId} vanished during provisioning`,
      );
    }
    return updated;
  } catch (err) {
    const message = provisionErrorMessage(err);

    // Defensive cleanup: mark failed, then best-effort delete the Neon project
    // so a half-built project is not orphaned. Neither cleanup step may mask the
    // original error — both are swallowed.
    await deps.markFailed(tenantId, message).catch(() => {
      /* swallow — the throw below is what the caller acts on */
    });
    if (createdProjectId) {
      await deps.deleteProject(createdProjectId).catch(() => {
        /* best-effort rollback; project may already be gone */
      });
    }

    throw err;
  }
}

// -----------------------------------------------------------------------------
// teardownTenant
// -----------------------------------------------------------------------------

/**
 * Tear down a tenant's data plane: delete its Neon project (swallowing a 404 —
 * already gone) and clear the stored conn strings + projectId so it can be
 * re-provisioned cleanly. Sets status `teardown`.
 *
 * @param input the tenant doc or a `{ tenantId }` handle.
 */
export async function teardownTenant(input: ProvisionInput): Promise<ITenant | null> {
  const tenantId = inputTenantId(input);

  const tenant = await deps.findTenant(tenantId);
  const projectId = tenant?.neon?.projectId;

  if (projectId) {
    try {
      await deps.deleteProject(projectId);
    } catch (err) {
      // A 404 means the project is already gone — that is success for teardown.
      if (!(err instanceof NeonApiError && err.status === 404)) {
        throw err;
      }
    }
  }

  return deps.clearProvisioned(tenantId);
}

// -----------------------------------------------------------------------------
// Error message extraction (no secrets ever)
// -----------------------------------------------------------------------------

/**
 * Build a safe `lastProvisionError` string. Never includes secret material — our
 * own errors carry only structural detail; a `NeonApiError` carries Neon's
 * message + the method+path that failed (no headers, no key — see client.ts).
 */
function provisionErrorMessage(err: unknown): string {
  if (err instanceof NeonApiError) {
    return `Neon API error (${err.status}) on ${err.endpoint}: ${err.message}`;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}
