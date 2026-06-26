// src/lib/tenant/__tests__/provision-service.test.ts
//
// Agent 16 — provisioning service tests. Node built-in runner ONLY (no vitest/
// jest):
//   npx tsx --test src/lib/tenant/__tests__/provision-service.test.ts
//
// NO LIVE NEON / pg / MONGO. Every external system is injected through the
// service's `__setProvisionServiceDeps` seam, so each test runs the REAL
// orchestration (the createProject → migrate → encrypt → store → active flow,
// and the defensive rollback) against fully fake collaborators. Zero network,
// zero Mongoose, zero Neon project creation (build_plan §3.6 provisioning rule).
//
// We assert:
//   • the happy path calls createProject, applies the migration (extensions +
//     0001_init + ledger over the DIRECT conn), ENCRYPTS both conn strings
//     BEFORE storing them, stores the neon projectId, and sets status "active";
//   • the returned tenant never carries a plaintext conn string;
//   • a non-approved tenant is rejected before any Neon call;
//   • the FAILURE path marks status "provision_failed" + lastProvisionError and
//     best-effort deleteProject's the half-built project, then re-throws;
//   • teardownTenant deletes the project (swallowing a 404) and clears conn
//     strings.

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

// A test encryption key BEFORE anything reads it — the service imports secrets.ts
// transitively. Never logged, never persisted. (The real encryptor is replaced
// by a fake in every test anyway, but the module-load guard still wants it.)
process.env.SECRETS_ENCRYPTION_KEY =
  process.env.SECRETS_ENCRYPTION_KEY || crypto.randomBytes(32).toString("base64");
// resolve-tenant / control store → mongoose.ts reads MONGODB_URI at module load.
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:0/test";

import type { ITenant } from "@/models/control/Tenant";
import { TenantUnavailableError } from "@/lib/tenant/errors";
import { NeonApiError } from "@/lib/neon/client";
import {
  provisionTenant,
  teardownTenant,
  __setProvisionServiceDeps,
  type ProvisionServiceDeps,
  type PgClientLike,
  type ProvisionedPatch,
} from "@/lib/tenant/provision-service";

// -----------------------------------------------------------------------------
// Fakes
// -----------------------------------------------------------------------------

const DIRECT_URI = "postgresql://u:secretpw@ep-foo.us-west-2.aws.neon.tech/neondb";
const POOLED_URI =
  "postgresql://u:secretpw@ep-foo-pooler.us-west-2.aws.neon.tech/neondb";

/** Records every query a fake pg client receives, in order. */
interface FakePgClient extends PgClientLike {
  queries: string[];
  connectCalls: number;
  endCalls: number;
}

function makeFakePgClient(opts: { failQuery?: string } = {}): FakePgClient {
  const c: FakePgClient = {
    queries: [],
    connectCalls: 0,
    endCalls: 0,
    async connect() {
      c.connectCalls += 1;
    },
    async query(sql: string) {
      c.queries.push(sql);
      if (opts.failQuery && sql.includes(opts.failQuery)) {
        throw new Error(`fake pg failure on: ${opts.failQuery}`);
      }
      return { rows: [] };
    },
    async end() {
      c.endCalls += 1;
    },
  };
  return c;
}

/** A minimal mutable tenant doc the fake store hands back and mutates. */
function makeTenant(status: ITenant["status"]): ITenant {
  return {
    tenantId: "tenant_x",
    status,
    neon: {},
    connStringEncrypted: undefined,
    directConnStringEncrypted: undefined,
    lastProvisionError: undefined,
  } as unknown as ITenant;
}

/**
 * A fake control store backed by one in-memory tenant. `saveProvisioned` /
 * `markFailed` / `clearProvisioned` mutate it so tests can assert final state.
 */
function makeFakeStore(tenant: ITenant | null) {
  const calls = {
    saveProvisioned: 0,
    markFailed: 0,
    clearProvisioned: 0,
    lastSavePatch: null as ProvisionedPatch | null,
    lastFailError: null as string | null,
  };
  const store: Pick<
    ProvisionServiceDeps,
    "findTenant" | "saveProvisioned" | "markFailed" | "clearProvisioned"
  > = {
    async findTenant() {
      return tenant;
    },
    async saveProvisioned(_id, patch) {
      calls.saveProvisioned += 1;
      calls.lastSavePatch = patch;
      if (!tenant) return null;
      tenant.neon.projectId = patch.neonProjectId;
      tenant.connStringEncrypted = patch.connStringEncrypted;
      tenant.directConnStringEncrypted = patch.directConnStringEncrypted;
      tenant.status = "active";
      return tenant;
    },
    async markFailed(_id, lastError) {
      calls.markFailed += 1;
      calls.lastFailError = lastError;
      if (!tenant) return null;
      tenant.status = "provision_failed";
      tenant.lastProvisionError = lastError;
      return tenant;
    },
    async clearProvisioned() {
      calls.clearProvisioned += 1;
      if (!tenant) return null;
      tenant.connStringEncrypted = undefined;
      tenant.directConnStringEncrypted = undefined;
      tenant.neon.projectId = undefined;
      tenant.status = "teardown";
      return tenant;
    },
  };
  return { store, calls };
}

const createdProject = {
  projectId: "proj_123",
  directConnUri: DIRECT_URI,
  pooledConnUri: POOLED_URI,
  defaultDatabase: "neondb",
  defaultRole: "neondb_owner",
};

/** A fake encryptor we can detect in the stored ciphertext. */
const fakeEncrypt = (plaintext: string) => `enc(${plaintext})`;

beforeEach(() => {
  // Nothing global to reset — every test installs its own deps and restores.
});

// =============================================================================
// Happy path — full flow, encryption-before-store, status active.
// =============================================================================
test("provisionTenant: creates project, migrates, encrypts, stores, sets active", async () => {
  const tenant = makeTenant("approved");
  const { store, calls } = makeFakeStore(tenant);
  const pg = makeFakePgClient();

  let createProjectCalls = 0;
  let deleteProjectCalls = 0;
  let createPgCalls = 0;

  const restore = __setProvisionServiceDeps({
    createProject: async (opts) => {
      createProjectCalls += 1;
      assert.ok(opts.name.includes("tenant_x"), "project name carries tenantId");
      return createdProject;
    },
    deleteProject: async () => {
      deleteProjectCalls += 1;
    },
    createPgClient: (uri) => {
      createPgCalls += 1;
      assert.equal(uri, DIRECT_URI, "migration must run over the DIRECT uri");
      return pg;
    },
    readMigrationSql: () => "-- migration body\nCREATE TABLE IF NOT EXISTS property();",
    encryptSecret: fakeEncrypt,
    ...store,
  });

  try {
    const result = await provisionTenant({ tenantId: "tenant_x" });

    // createProject called exactly once; no rollback.
    assert.equal(createProjectCalls, 1);
    assert.equal(deleteProjectCalls, 0, "no rollback on success");

    // Migration applied over the direct conn: connect + extensions + body + ledger.
    assert.equal(createPgCalls, 1);
    assert.equal(pg.connectCalls, 1);
    assert.equal(pg.endCalls, 1, "client always end()ed");
    const joined = pg.queries.join("\n");
    assert.ok(/CREATE EXTENSION IF NOT EXISTS postgis/i.test(joined), "postgis enabled");
    assert.ok(/CREATE EXTENSION IF NOT EXISTS pg_trgm/i.test(joined), "pg_trgm enabled");
    assert.ok(joined.includes("CREATE TABLE IF NOT EXISTS property"), "migration body applied");
    assert.ok(/schema_migrations/i.test(joined), "ledger stamped");

    // Conn strings ENCRYPTED before store (ciphertext, not plaintext).
    assert.equal(calls.saveProvisioned, 1);
    const patch = calls.lastSavePatch!;
    assert.equal(patch.neonProjectId, "proj_123", "neon projectId stored");
    assert.equal(patch.connStringEncrypted, `enc(${POOLED_URI})`, "pooled encrypted");
    assert.equal(patch.directConnStringEncrypted, `enc(${DIRECT_URI})`, "direct encrypted");
    assert.ok(patch.connStringEncrypted.startsWith("enc("), "stored value is the ciphertext wrapper");

    // Status flipped to active; returned tenant carries NO plaintext conn string.
    assert.equal(result.status, "active");
    assert.equal((result as any).connString, undefined);
    assert.ok(
      (result.connStringEncrypted ?? "").startsWith("enc("),
      "stored field is ciphertext, never plaintext",
    );

    assert.equal(calls.markFailed, 0, "no failure marker on success");
  } finally {
    restore();
  }
});

// =============================================================================
// Guard — a non-approved tenant is rejected before any Neon call.
// =============================================================================
test("provisionTenant: rejects a non-approved tenant before creating a project", async () => {
  const tenant = makeTenant("pending");
  const { store } = makeFakeStore(tenant);
  let createProjectCalls = 0;

  const restore = __setProvisionServiceDeps({
    createProject: async () => {
      createProjectCalls += 1;
      return createdProject;
    },
    ...store,
  });

  try {
    await assert.rejects(
      () => provisionTenant({ tenantId: "tenant_x" }),
      (err: unknown) => err instanceof TenantUnavailableError,
    );
    assert.equal(createProjectCalls, 0, "no Neon project created for a non-approved tenant");
  } finally {
    restore();
  }
});

// =============================================================================
// Failure path — migration fails → mark provision_failed + rollback deleteProject.
// =============================================================================
test("provisionTenant: on failure marks provision_failed and deletes the project", async () => {
  const tenant = makeTenant("approved");
  const { store, calls } = makeFakeStore(tenant);
  // Fail when the migration body runs (after extensions, after createProject).
  const pg = makeFakePgClient({ failQuery: "migration body" });

  let deletedProjectId: string | undefined;

  const restore = __setProvisionServiceDeps({
    createProject: async () => createdProject,
    deleteProject: async (projectId) => {
      deletedProjectId = projectId;
    },
    createPgClient: () => pg,
    readMigrationSql: () => "-- migration body\nbad",
    encryptSecret: fakeEncrypt,
    ...store,
  });

  try {
    await assert.rejects(() => provisionTenant({ tenantId: "tenant_x" }));

    // The half-built project is rolled back.
    assert.equal(deletedProjectId, "proj_123", "best-effort deleteProject the orphan");
    // The tenant is marked failed (NOT active), with a lastError message.
    assert.equal(calls.markFailed, 1);
    assert.equal(calls.saveProvisioned, 0, "never stored a half-state as active");
    assert.equal(tenant.status, "provision_failed");
    assert.ok((tenant.lastProvisionError ?? "").length > 0, "lastProvisionError recorded");
    // The pg client was still closed despite the failure.
    assert.equal(pg.endCalls, 1, "client end()ed even on failure");
  } finally {
    restore();
  }
});

// =============================================================================
// Failure path — failure BEFORE createProject (no project to roll back).
// =============================================================================
test("provisionTenant: createProject failure marks failed without a deleteProject", async () => {
  const tenant = makeTenant("approved");
  const { store, calls } = makeFakeStore(tenant);
  let deleteProjectCalls = 0;

  const restore = __setProvisionServiceDeps({
    createProject: async () => {
      throw new NeonApiError(402, "quota exceeded", "POST /projects");
    },
    deleteProject: async () => {
      deleteProjectCalls += 1;
    },
    ...store,
  });

  try {
    await assert.rejects(
      () => provisionTenant({ tenantId: "tenant_x" }),
      (err: unknown) => err instanceof NeonApiError,
    );
    assert.equal(deleteProjectCalls, 0, "no project was created — nothing to delete");
    assert.equal(calls.markFailed, 1);
    assert.ok(
      (calls.lastFailError ?? "").includes("quota exceeded"),
      "lastError carries the Neon message (no secrets)",
    );
    assert.equal(tenant.status, "provision_failed");
  } finally {
    restore();
  }
});

// =============================================================================
// teardownTenant — deletes project (swallows 404) + clears conn strings.
// =============================================================================
test("teardownTenant: deletes the project and clears stored conn strings", async () => {
  const tenant = makeTenant("active");
  tenant.neon.projectId = "proj_123";
  tenant.connStringEncrypted = "enc(pooled)";
  tenant.directConnStringEncrypted = "enc(direct)";
  const { store, calls } = makeFakeStore(tenant);

  let deletedProjectId: string | undefined;
  const restore = __setProvisionServiceDeps({
    deleteProject: async (projectId) => {
      deletedProjectId = projectId;
    },
    ...store,
  });

  try {
    const result = await teardownTenant({ tenantId: "tenant_x" });
    assert.equal(deletedProjectId, "proj_123", "deleted the tenant's project");
    assert.equal(calls.clearProvisioned, 1);
    assert.equal(result?.connStringEncrypted, undefined, "pooled conn cleared");
    assert.equal(result?.directConnStringEncrypted, undefined, "direct conn cleared");
    assert.equal(result?.neon.projectId, undefined, "projectId cleared");
  } finally {
    restore();
  }
});

test("teardownTenant: swallows a Neon 404 (project already gone)", async () => {
  const tenant = makeTenant("active");
  tenant.neon.projectId = "proj_gone";
  const { store, calls } = makeFakeStore(tenant);

  const restore = __setProvisionServiceDeps({
    deleteProject: async () => {
      throw new NeonApiError(404, "project not found", "DELETE /projects/proj_gone");
    },
    ...store,
  });

  try {
    // 404 is success for teardown — does NOT throw, still clears.
    const result = await teardownTenant({ tenantId: "tenant_x" });
    assert.equal(calls.clearProvisioned, 1, "still clears after a 404");
    assert.equal(result?.status, "teardown");
  } finally {
    restore();
  }
});

test("teardownTenant: re-throws a non-404 Neon error", async () => {
  const tenant = makeTenant("active");
  tenant.neon.projectId = "proj_err";
  const { store } = makeFakeStore(tenant);

  const restore = __setProvisionServiceDeps({
    deleteProject: async () => {
      throw new NeonApiError(500, "internal", "DELETE /projects/proj_err");
    },
    ...store,
  });

  try {
    await assert.rejects(
      () => teardownTenant({ tenantId: "tenant_x" }),
      (err: unknown) => err instanceof NeonApiError && (err as NeonApiError).status === 500,
    );
  } finally {
    restore();
  }
});
