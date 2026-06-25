// src/lib/tenant/__tests__/resolve-connection.test.ts
//
// Agent 10 — keystone resolver tests. Node built-in runner ONLY (no vitest/jest):
//   npx tsx --test src/lib/tenant/__tests__/resolve-connection.test.ts
//
// NO LIVE MONGO. The control-DB lookup and BOTH adapter factories are injected
// through the keystone's `__setResolveConnectionDeps` seam, so every unit test
// exercises the REAL LRU cache + lifecycle logic with fully fake adapters —
// zero network, zero Mongoose, zero Neon.
//
// We assert:
//   (a) the second resolve for one tenant hits the cache (the adapter factory
//       runs exactly ONCE);
//   (b) eviction disposes the adapter (its `close()` / pool.end() is called);
//   (c) a non-active / missing tenant throws `TenantUnavailable`;
//   (d) an absent tenantId falls back to the DEFAULT Mongo adapter.
//
// PLUS an OPTIONAL live smoke test: IF `.env.local` carries NEON_POOLED_CONN_URI
// we build a REAL Postgres adapter from it and round-trip `SELECT 1`. It SKIPS
// gracefully when the var is absent, never logs the conn string, and cleans up
// (closes the adapter) in a finally.

import { test, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";

// A test encryption key BEFORE anything reads it (the keystone imports modules
// that pull in secrets.ts at load). Never logged, never persisted.
process.env.SECRETS_ENCRYPTION_KEY =
  process.env.SECRETS_ENCRYPTION_KEY || crypto.randomBytes(32).toString("base64");
// resolve-tenant.ts -> mongoose.ts reads MONGODB_URI at module load; give a
// dummy so the import does not throw. We never actually connect in unit tests.
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:0/test";

import type { DbAdapter } from "@/lib/db/adapter";
import type { ITenant } from "@/models/control/Tenant";
import { TenantUnavailableError } from "@/lib/tenant/errors";
import {
  resolveAdapter,
  resolveAdapterForRequest,
  evictAdapter,
  getTenantSql,
  DEFAULT_TENANT_ID,
  __setResolveConnectionDeps,
  __resetTenantCache,
} from "@/lib/tenant/resolve-connection";

// -----------------------------------------------------------------------------
// Fakes
// -----------------------------------------------------------------------------

/** A fake DbAdapter whose `close()` flips a flag so we can assert disposal. */
function makeFakeAdapter(
  dialect: "mongo" | "postgres",
): DbAdapter & { closed: boolean; closeCalls: number } {
  const a: any = {
    dialect,
    closed: false,
    closeCalls: 0,
    listings: {} as any,
    contacts: {} as any,
    async find() {
      return { items: [], total: 0, skip: 0, limit: 0, hasMore: false };
    },
    async get() {
      return null;
    },
    async query() {
      return [];
    },
    async close() {
      a.closed = true;
      a.closeCalls += 1;
    },
  };
  return a;
}

/** A minimal ACTIVE tenant shape carrying a (fake) encrypted pooled conn. */
function makeActiveTenant(tenantId: string): ITenant {
  return {
    tenantId,
    status: "active",
    connStringEncrypted: "ignored-ciphertext",
    directConnStringEncrypted: "ignored-ciphertext",
  } as unknown as ITenant;
}

beforeEach(() => {
  // Each test starts with empty caches (closing anything resident) and restored
  // mocks. Dep patches return a restore fn the test invokes itself.
  __resetTenantCache();
  mock.restoreAll();
});

// =============================================================================
// (a) Second resolve hits the cache — the adapter factory runs exactly ONCE.
// =============================================================================
test("resolveAdapter caches per tenantId — factory invoked once", async () => {
  let factoryCalls = 0;
  let lookupCalls = 0;
  const restore = __setResolveConnectionDeps({
    resolveTenantById: async (id: string) => {
      lookupCalls += 1;
      return makeActiveTenant(id);
    },
    decryptConnUri: () => "postgres://fake/conn",
    createPostgresAdapter: () => {
      factoryCalls += 1;
      return makeFakeAdapter("postgres");
    },
  });

  try {
    const a1 = await resolveAdapter("tenant_one");
    const a2 = await resolveAdapter("tenant_one");

    assert.equal(a1, a2, "second call must return the SAME cached instance");
    assert.equal(factoryCalls, 1, "adapter factory must run exactly once");
    assert.equal(lookupCalls, 1, "control-DB lookup must run exactly once");
    assert.equal(a1.dialect, "postgres");
  } finally {
    restore();
  }
});

// =============================================================================
// (a') Concurrent first-calls collapse onto one construction (no double pool).
// =============================================================================
test("resolveAdapter collapses concurrent first-calls to one factory run", async () => {
  let factoryCalls = 0;
  const restore = __setResolveConnectionDeps({
    resolveTenantById: async (id: string) => makeActiveTenant(id),
    decryptConnUri: () => "postgres://fake/conn",
    createPostgresAdapter: () => {
      factoryCalls += 1;
      return makeFakeAdapter("postgres");
    },
  });

  try {
    const [a1, a2] = await Promise.all([
      resolveAdapter("tenant_race"),
      resolveAdapter("tenant_race"),
    ]);
    assert.equal(a1, a2);
    assert.equal(factoryCalls, 1, "racing first-calls must share one construction");
  } finally {
    restore();
  }
});

// =============================================================================
// (b) Eviction disposes the adapter — close()/pool.end() is called.
// =============================================================================
test("evictAdapter closes the cached adapter (pool.end via close)", async () => {
  const fake = makeFakeAdapter("postgres");
  const restore = __setResolveConnectionDeps({
    resolveTenantById: async (id: string) => makeActiveTenant(id),
    decryptConnUri: () => "postgres://fake/conn",
    createPostgresAdapter: () => fake,
  });

  try {
    const a = await resolveAdapter("tenant_evict");
    assert.equal(a, fake);
    assert.equal(fake.closed, false);

    const evicted = evictAdapter("tenant_evict");
    assert.equal(evicted, true, "evict returns true when an entry was present");

    // LRU dispose fires close() fire-and-forget; let the microtask settle.
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(fake.closed, true, "evicted adapter must be closed");
    assert.equal(fake.closeCalls, 1, "close() called exactly once");

    // A fresh resolve after evict rebuilds (factory runs again).
    const evictedAgain = evictAdapter("tenant_evict");
    assert.equal(evictedAgain, false, "second evict finds nothing");
  } finally {
    restore();
  }
});

// =============================================================================
// (b') __resetTenantCache closes every resident adapter.
// =============================================================================
test("__resetTenantCache disposes all cached adapters", async () => {
  const a = makeFakeAdapter("postgres");
  const b = makeFakeAdapter("postgres");
  const queue = [a, b];
  const restore = __setResolveConnectionDeps({
    resolveTenantById: async (id: string) => makeActiveTenant(id),
    decryptConnUri: () => "postgres://fake/conn",
    createPostgresAdapter: () => queue.shift()!,
  });

  try {
    await resolveAdapter("t_a");
    await resolveAdapter("t_b");
    __resetTenantCache();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(a.closed, true);
    assert.equal(b.closed, true);
  } finally {
    restore();
  }
});

// =============================================================================
// (c) A non-active / missing tenant throws TenantUnavailable.
// =============================================================================
test("resolveAdapter throws TenantUnavailable for a missing/non-active tenant", async () => {
  let factoryCalls = 0;
  const restore = __setResolveConnectionDeps({
    // resolveTenantById filters status:"active" → a non-active tenant returns null.
    resolveTenantById: async () => null,
    createPostgresAdapter: () => {
      factoryCalls += 1;
      return makeFakeAdapter("postgres");
    },
  });

  try {
    await assert.rejects(
      () => resolveAdapter("tenant_suspended"),
      (err: unknown) => {
        assert.ok(err instanceof TenantUnavailableError);
        assert.equal((err as TenantUnavailableError).code, "tenant_unavailable");
        return true;
      },
    );
    assert.equal(factoryCalls, 0, "no adapter is built for an unavailable tenant");

    // A throw must NOT poison the cache: a later (now-active) resolve succeeds.
    const restore2 = __setResolveConnectionDeps({
      resolveTenantById: async (id: string) => makeActiveTenant(id),
      decryptConnUri: () => "postgres://fake/conn",
      createPostgresAdapter: () => makeFakeAdapter("postgres"),
    });
    try {
      const a = await resolveAdapter("tenant_suspended");
      assert.equal(a.dialect, "postgres");
    } finally {
      restore2();
    }
  } finally {
    restore();
  }
});

// =============================================================================
// (c') getTenantSql also throws TenantUnavailable for a missing tenant.
// =============================================================================
test("getTenantSql throws TenantUnavailable for a missing tenant", async () => {
  const restore = __setResolveConnectionDeps({
    resolveTenantById: async () => null,
  });
  try {
    await assert.rejects(
      () => getTenantSql("tenant_gone"),
      (err: unknown) => err instanceof TenantUnavailableError,
    );
  } finally {
    restore();
  }
});

// =============================================================================
// (d) Absent tenantId falls back to the DEFAULT Mongo adapter.
// =============================================================================
test("resolveAdapterForRequest falls back to the default Mongo adapter when no tenantId", async () => {
  let mongoFactoryCalls = 0;
  let pgFactoryCalls = 0;
  const restore = __setResolveConnectionDeps({
    createDefaultMongoAdapter: async () => {
      mongoFactoryCalls += 1;
      return makeFakeAdapter("mongo");
    },
    createPostgresAdapter: () => {
      pgFactoryCalls += 1;
      return makeFakeAdapter("postgres");
    },
  });

  try {
    const a = await resolveAdapterForRequest({}); // no tenantId
    assert.equal(a.dialect, "mongo", "default path must be the Mongo adapter");
    assert.equal(mongoFactoryCalls, 1);
    assert.equal(pgFactoryCalls, 0, "the Postgres factory must NOT run");

    // null tenantId behaves the same as absent.
    const b = await resolveAdapterForRequest({ tenantId: null });
    assert.equal(b, a, "default adapter is cached under DEFAULT_TENANT_ID");
    assert.equal(mongoFactoryCalls, 1, "default adapter built once, then cached");
  } finally {
    restore();
  }
});

// =============================================================================
// (d') A bound tenantId takes the Postgres path, not the Mongo fallback.
// =============================================================================
test("resolveAdapterForRequest with a tenantId takes the Postgres path", async () => {
  let mongoFactoryCalls = 0;
  const restore = __setResolveConnectionDeps({
    resolveTenantById: async (id: string) => makeActiveTenant(id),
    decryptConnUri: () => "postgres://fake/conn",
    createPostgresAdapter: () => makeFakeAdapter("postgres"),
    createDefaultMongoAdapter: async () => {
      mongoFactoryCalls += 1;
      return makeFakeAdapter("mongo");
    },
  });

  try {
    const a = await resolveAdapterForRequest({ tenantId: "tenant_pg" });
    assert.equal(a.dialect, "postgres");
    assert.equal(mongoFactoryCalls, 0, "the Mongo fallback must NOT run");
    assert.equal(DEFAULT_TENANT_ID, "__default__");
  } finally {
    restore();
  }
});

// =============================================================================
// OPTIONAL live smoke test — REAL Postgres adapter round-trips SELECT 1.
// Skips gracefully when NEON_POOLED_CONN_URI is absent. Never logs the conn.
// =============================================================================

/** Read a single key out of .env.local WITHOUT logging its value. */
function readEnvLocal(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return undefined;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && m[1] === key) {
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      return v;
    }
  }
  return undefined;
}

const NEON_CONN = readEnvLocal("NEON_POOLED_CONN_URI");

test(
  "LIVE: real Postgres adapter round-trips SELECT 1",
  { skip: !NEON_CONN ? "NEON_POOLED_CONN_URI absent — live smoke skipped" : false },
  async () => {
    // Use the REAL factory (no dep injection) so this exercises the genuine
    // createPostgresAdapter path against the provisioned Neon DB.
    const { createPostgresAdapter } = await import("@/lib/db/postgres-adapter");
    const adapter = createPostgresAdapter(NEON_CONN as string);
    try {
      const rows = await adapter.query<{ one: number }>(
        "SELECT 1 AS one",
      );
      assert.equal(rows[0]?.one, 1, "SELECT 1 must round-trip");
    } finally {
      // Clean up: close the adapter (ends any WS pool opened by query()).
      await adapter.close();
    }
  },
);
