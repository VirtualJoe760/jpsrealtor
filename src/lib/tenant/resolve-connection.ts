// src/lib/tenant/resolve-connection.ts
//
// Agent 10 — THE KEYSTONE: tenant connection resolver + LRU adapter cache.
//
// This single file reconciles Spec 2's `resolve-connection.ts` and Spec 3's
// `resolve-connection.ts` — they describe the SAME keystone; there is exactly
// one (build_plan §6.2). Every data-plane access in the product funnels through
// here:  auth → tenantId → resolveAdapter(tenantId) → pooled, LRU-cached
// `DbAdapter`.  Handlers NEVER construct an adapter, NEVER open a Pool, NEVER
// import a module-level `db` (build_plan §3.3 — the ABSOLUTE tenant-scoping
// rule).  Isolation is the database boundary itself: a tenant's token maps to
// exactly one Neon DB.
//
// WHAT THIS DOES
//   • resolveAdapter(tenantId)          — pooled, LRU-cached Postgres adapter for
//                                         an ACTIVE tenant. Second call for the
//                                         same id returns the cached instance
//                                         (the adapter factory runs ONCE).
//   • resolveAdapterForRequest(auth)    — the request entrypoint. Uses
//                                         auth.tenantId; FALLS BACK to the
//                                         DEFAULT_TENANT_ID Mongo adapter when
//                                         auth carries no tenantId (the
//                                         incremental dogfood cutover — most of
//                                         the legacy single-tenant traffic still
//                                         rides Mongo while tenants migrate).
//   • getTenantSql / evictTenantSql     — the lower-level raw-SQL handle (raw
//     / __resetTenantCache                `neon()` reader + lazy WS `Pool`) for
//                                         subsystems (CHAP) that need SQL, not a
//                                         DbAdapter. Same LRU, same lifecycle.
//
// LIFECYCLE (build_plan §6.2 gotchas):
//   • The LRU is keyed by `tenantId`. On evict/dispose/TTL-expiry it MUST call
//     `adapter.close()` (which `pool.end()`s the WS pool) — otherwise pools leak
//     and exhaust Postgres connection caps (the keystone's #1 failure mode, §7
//     Spike #2). `close()` is fire-and-forget on dispose (LRU dispose is sync).
//   • The conn string is decrypted ONLY here, held transiently, NEVER logged,
//     NEVER returned to a client (build_plan §3.7 #6).
//   • A non-active / missing tenant throws `TenantUnavailable` → 503 via the
//     skill-api error mapper. We never silently serve a non-active tenant —
//     status is a security boundary (build_plan §6.1).
//
// MOCKABILITY: the control-DB lookup (`resolveTenantById`) and the two adapter
// factories are injected through a module-level `deps` object that tests swap
// via `__setResolveConnectionDeps`. That keeps the unit tests free of any live
// Mongo / Neon connection while exercising the real cache + lifecycle logic.

import { LRUCache } from "lru-cache";
import { neon, Pool } from "@neondatabase/serverless";

import type { DbAdapter } from "@/lib/db/adapter";
import { createPostgresAdapter } from "@/lib/db/postgres-adapter";
import { createMongoAdapter, type MongoConnLike } from "@/lib/db/mongo-adapter";
import {
  resolveTenantById,
  decryptTenantConnUri,
  type ITenant,
} from "@/lib/tenant/resolve-tenant";
import { TenantUnavailableError } from "@/lib/tenant/errors";

// -----------------------------------------------------------------------------
// The default (legacy / dogfood) tenant
// -----------------------------------------------------------------------------
//
// During the incremental cutover, a request that carries NO tenantId (a legacy
// single-tenant skill install, or the dogfood ChatRealty deployment) resolves
// to the existing shared Mongo data plane via `DEFAULT_TENANT_ID`. This is the
// ONE place the Mongo fallback is wired; product tenants always carry a
// tenantId and take the Postgres path.

export const DEFAULT_TENANT_ID = "__default__";

// -----------------------------------------------------------------------------
// Raw-SQL handle (the lower-level export CHAP/PostGIS consumers use)
// -----------------------------------------------------------------------------
//
// A stable per-tenant handle exposing the raw `neon()` HTTP reader (for one-shot
// reads) and a lazily-opened WS `Pool` (for transactions / DDL). It is cached on
// the same `DbAdapter` instance (the Postgres adapter already owns a lazy pool),
// so a consumer that wants raw SQL and a consumer that wants the DbAdapter share
// ONE pooled connection per tenant — never two.

export interface TenantSql {
  /** The tenant id this handle is scoped to. */
  readonly tenantId: string;
  /** One-shot HTTP reader (`neon()`), ideal for serverless reads — no pool. */
  readonly sql: ReturnType<typeof neon>;
  /** Lazily-opened WS pool for transactions / DDL. `end()`ed on evict. */
  getPool(): Pool;
  /** End the WS pool if it was opened. Called by the LRU dispose. */
  close(): Promise<void>;
}

// -----------------------------------------------------------------------------
// Injectable dependencies (the ONLY seam tests swap — no live Mongo/Neon)
// -----------------------------------------------------------------------------

export interface ResolveConnectionDeps {
  /** Control-plane lookup: tenantId → ACTIVE tenant doc (or null). */
  resolveTenantById: (tenantId: string) => Promise<ITenant | null>;
  /** Decrypt a resolved tenant's pooled conn string. */
  decryptConnUri: (tenant: ITenant, kind?: "pooled" | "direct") => string;
  /** Build a Postgres adapter from a decrypted conn string. */
  createPostgresAdapter: (conn: string) => DbAdapter;
  /** Build the DEFAULT_TENANT_ID Mongo adapter (legacy / dogfood fallback). */
  createDefaultMongoAdapter: () => Promise<DbAdapter>;
}

/**
 * Default Mongo fallback: lazily import the shared Mongoose connection and wrap
 * its native `Db` handle in the Mongo adapter. Imported lazily so the keystone
 * (and its unit tests) never pull in Mongoose / open a socket unless the default
 * path is actually taken.
 */
async function defaultMongoAdapter(): Promise<DbAdapter> {
  const dbConnect = (await import("@/lib/mongoose")).default;
  const conn = await dbConnect();
  // `mongoose.connect()` resolves the mongoose instance; its `.connection.db`
  // is the native `mongodb.Db`, which satisfies `MongoConnLike` (it exposes
  // `.collection(name)`). The Mongo adapter only ever takes native collection
  // handles from it — preserving the schema-casting bypass (Agent 02).
  const nativeDb = (conn?.connection?.db ?? conn?.db) as MongoConnLike | undefined;
  if (!nativeDb) {
    throw new TenantUnavailableError(
      "Default tenant Mongo connection is unavailable",
    );
  }
  return createMongoAdapter(nativeDb);
}

const deps: ResolveConnectionDeps = {
  resolveTenantById,
  decryptConnUri: decryptTenantConnUri,
  createPostgresAdapter,
  createDefaultMongoAdapter: defaultMongoAdapter,
};

/**
 * Swap the keystone's dependencies (control-DB lookup + adapter factories).
 * TEST-ONLY. Returns a restore function. Resetting the cache is the caller's job
 * (`__resetTenantCache`) so a swap doesn't serve a stale cached adapter.
 */
export function __setResolveConnectionDeps(
  patch: Partial<ResolveConnectionDeps>,
): () => void {
  const prev = { ...deps };
  Object.assign(deps, patch);
  return () => Object.assign(deps, prev);
}

// -----------------------------------------------------------------------------
// The LRU adapter cache (one instance per tenantId)
// -----------------------------------------------------------------------------
//
// `max` bounds resident pools (build_plan §6.2: ~50–200); `ttl` evicts idle
// tenants so a long-lived serverless instance doesn't pin every pool forever.
// `dispose` is where the lifecycle invariant lives: ANY removal (evict, TTL,
// manual delete, set-overwrite) MUST `close()` the adapter so its WS pool ends.
// LRU `dispose` is synchronous, so we kick off `close()` fire-and-forget and
// swallow its rejection (a failed pool-end must not crash the process).

const ADAPTER_CACHE_MAX = 200;
const ADAPTER_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min idle TTL

function disposeAdapter(adapter: DbAdapter): void {
  // Fire-and-forget: LRU dispose is sync; never throw out of it.
  void Promise.resolve()
    .then(() => adapter.close())
    .catch(() => {
      /* a failed close must not crash the host — pools are best-effort ended */
    });
}

const adapterCache = new LRUCache<string, DbAdapter>({
  max: ADAPTER_CACHE_MAX,
  ttl: ADAPTER_CACHE_TTL_MS,
  // Dispose on evict / TTL / delete / overwrite — close the pool every time.
  dispose: (adapter) => disposeAdapter(adapter),
  // `noDisposeOnSet:false` (default) means overwriting a key disposes the old
  // value too — but we never overwrite a live key (resolveAdapter checks `has`
  // first), so a single tenant's adapter is constructed exactly once.
});

// In-flight construction guard: concurrent first-calls for the same tenant must
// share ONE adapter (and ONE pool), not race two factories. Keyed by tenantId.
const inflight = new Map<string, Promise<DbAdapter>>();

// -----------------------------------------------------------------------------
// resolveAdapter(tenantId)
// -----------------------------------------------------------------------------

/**
 * Resolve a pooled, LRU-cached `DbAdapter` for an ACTIVE tenant by id.
 *
 * The DEFAULT_TENANT_ID resolves to the legacy Mongo adapter (the dogfood
 * fallback). Every other id resolves the control-plane tenant, decrypts its
 * pooled conn string, and builds a Postgres adapter.
 *
 * Caching: the SECOND call for the same id returns the cached instance — the
 * adapter factory runs exactly once. A non-active / missing tenant throws
 * `TenantUnavailableError` (→503). The conn string is decrypted only inside this
 * function and never logged.
 */
export async function resolveAdapter(tenantId: string): Promise<DbAdapter> {
  if (!tenantId) {
    throw new TenantUnavailableError("No tenant id supplied");
  }

  const cached = adapterCache.get(tenantId);
  if (cached) return cached;

  // Collapse concurrent first-calls onto one construction.
  const pending = inflight.get(tenantId);
  if (pending) return pending;

  const build = (async (): Promise<DbAdapter> => {
    let adapter: DbAdapter;

    if (tenantId === DEFAULT_TENANT_ID) {
      adapter = await deps.createDefaultMongoAdapter();
    } else {
      const tenant = await deps.resolveTenantById(tenantId);
      if (!tenant) {
        // Missing OR non-active (resolveTenantById filters status:"active").
        throw new TenantUnavailableError(
          `Tenant ${tenantId} is not available`,
          tenant ? (tenant as ITenant).status : undefined,
        );
      }
      // Decrypt the POOLED conn string (runtime reads). Held transiently; never
      // logged, never returned to a client (build_plan §3.7 #6).
      const conn = deps.decryptConnUri(tenant, "pooled");
      adapter = deps.createPostgresAdapter(conn);
    }

    // Only cache AFTER a successful build, so a throw never poisons the cache.
    adapterCache.set(tenantId, adapter);
    return adapter;
  })();

  inflight.set(tenantId, build);
  try {
    return await build;
  } finally {
    inflight.delete(tenantId);
  }
}

// -----------------------------------------------------------------------------
// resolveAdapterForRequest(auth)
// -----------------------------------------------------------------------------

/** The minimal auth shape the keystone reads — just the bound tenant, if any. */
export interface TenantBoundAuth {
  /** The tenant the presented token is bound to. Absent → default Mongo path. */
  readonly tenantId?: string | null;
}

/**
 * Request entrypoint: resolve the adapter for an authenticated request. Uses
 * `auth.tenantId` when present; otherwise falls back to the DEFAULT_TENANT_ID
 * Mongo adapter (the incremental dogfood cutover — build_plan §3.3 / Agent 10).
 *
 * Handlers call THIS (via the withSkill/withOdata wrapper, Agent 13) and receive
 * a ready, pooled, tenant-scoped adapter — they never touch the cache, the conn
 * string, or a Pool directly.
 */
export async function resolveAdapterForRequest(
  auth: TenantBoundAuth,
): Promise<DbAdapter> {
  const tenantId = auth?.tenantId;
  if (!tenantId) {
    // Incremental cutover: no tenant bound → the legacy shared Mongo data plane.
    return resolveAdapter(DEFAULT_TENANT_ID);
  }
  return resolveAdapter(tenantId);
}

// -----------------------------------------------------------------------------
// Eviction
// -----------------------------------------------------------------------------

/**
 * Evict a tenant's cached adapter and close its pool. Called by teardown /
 * conn-string rotation so the next resolve rebuilds against fresh credentials.
 * Deleting from the LRU triggers `dispose` → `adapter.close()` → `pool.end()`.
 * Returns true when an entry was present.
 */
export function evictAdapter(tenantId: string): boolean {
  return adapterCache.delete(tenantId);
}

// -----------------------------------------------------------------------------
// Lower-level raw-SQL handle (CHAP / PostGIS consumers)
// -----------------------------------------------------------------------------
//
// Some subsystems (the CHAP repo, Spec 5) want raw parameterized SQL, not the
// DbAdapter's typed repos. `getTenantSql(tenantId)` gives them a cached
// `TenantSql` over the SAME tenant Neon DB. It is a thin, independently-cached
// handle (its own LRU + dispose) so a tenant that only ever runs raw SQL still
// gets pooled, lifecycle-managed connections — and `evictTenantSql` ends them.

const SQL_CACHE_MAX = 200;
const SQL_CACHE_TTL_MS = 10 * 60 * 1000;

function disposeSql(handle: TenantSql): void {
  void Promise.resolve()
    .then(() => handle.close())
    .catch(() => {
      /* best-effort pool end */
    });
}

const sqlCache = new LRUCache<string, TenantSql>({
  max: SQL_CACHE_MAX,
  ttl: SQL_CACHE_TTL_MS,
  dispose: (handle) => disposeSql(handle),
});

const sqlInflight = new Map<string, Promise<TenantSql>>();

function buildTenantSql(tenantId: string, conn: string): TenantSql {
  const reader = neon(conn);
  let pool: Pool | null = null;
  return {
    tenantId,
    sql: reader,
    getPool(): Pool {
      if (!pool) pool = new Pool({ connectionString: conn });
      return pool;
    },
    async close(): Promise<void> {
      if (pool) {
        const p = pool;
        pool = null;
        await p.end();
      }
    },
  };
}

/**
 * Resolve a pooled, LRU-cached raw-SQL handle for an ACTIVE tenant. Same
 * resolve/decrypt path as `resolveAdapter`, but yields the `TenantSql`
 * (`neon()` reader + lazy WS `Pool`) instead of a `DbAdapter`. Not defined for
 * DEFAULT_TENANT_ID (the legacy path is Mongo — it has no SQL handle).
 */
export async function getTenantSql(tenantId: string): Promise<TenantSql> {
  if (!tenantId || tenantId === DEFAULT_TENANT_ID) {
    throw new TenantUnavailableError(
      "Raw SQL is not available for the default (Mongo) tenant",
    );
  }

  const cached = sqlCache.get(tenantId);
  if (cached) return cached;

  const pending = sqlInflight.get(tenantId);
  if (pending) return pending;

  const build = (async (): Promise<TenantSql> => {
    const tenant = await deps.resolveTenantById(tenantId);
    if (!tenant) {
      throw new TenantUnavailableError(`Tenant ${tenantId} is not available`);
    }
    const conn = deps.decryptConnUri(tenant, "pooled");
    const handle = buildTenantSql(tenantId, conn);
    sqlCache.set(tenantId, handle);
    return handle;
  })();

  sqlInflight.set(tenantId, build);
  try {
    return await build;
  } finally {
    sqlInflight.delete(tenantId);
  }
}

/**
 * Evict a tenant's raw-SQL handle and end its pool. Returns true when present.
 */
export function evictTenantSql(tenantId: string): boolean {
  return sqlCache.delete(tenantId);
}

// -----------------------------------------------------------------------------
// Test helper — reset BOTH caches (closing every pool) between tests.
// -----------------------------------------------------------------------------

/**
 * TEST-ONLY: clear both caches, disposing (closing) every resident adapter /
 * SQL handle. `LRUCache.clear()` fires `dispose` for each entry. Also drops any
 * in-flight construction promises.
 */
export function __resetTenantCache(): void {
  adapterCache.clear();
  sqlCache.clear();
  inflight.clear();
  sqlInflight.clear();
}
