---
title: ChatRealty API — Connection Resolver (THE KEYSTONE)
status: current
last_verified: 2026-06-25
related:
  - ./build_plan.md
  - ./control-plane.md
  - ./neon-setup.md
  - ./db-adapter.md
  - ./architecture.md
---

# Connection Resolver — the keystone

> **TL;DR.** `src/lib/tenant/resolve-connection.ts` is **the keystone** of the
> database-per-tenant platform (build_plan §4 / §6.2). It is the single funnel
> through which every data-plane access flows:
> `auth → tenantId → resolveAdapter(tenantId) → pooled, LRU-cached DbAdapter`.
> Handlers NEVER construct an adapter, open a `Pool`, or import a module-level
> `db` (build_plan §3.3 — the ABSOLUTE tenant-scoping rule). It reconciles
> Spec 2's and Spec 3's `resolve-connection.ts` into ONE file. It builds on the
> Neon-free control-plane resolver (`resolve-tenant.ts`, see
> [control-plane.md](./control-plane.md)).

## Linchpin files

| File | Role |
|---|---|
| `src/lib/tenant/resolve-connection.ts` | THE KEYSTONE. `resolveAdapter` / `resolveAdapterForRequest` + the LRU adapter cache + `getTenantSql` / `evictTenantSql`. |
| `src/lib/tenant/resolve-tenant.ts` | The Neon-free half it builds on: `resolveTenantById`, `decryptTenantConnUri`. |
| `src/lib/db/postgres-adapter.ts` | `createPostgresAdapter(conn)` — the per-tenant Neon adapter the keystone builds. |
| `src/lib/db/mongo-adapter.ts` | `createMongoAdapter(conn)` — the legacy / dogfood fallback for `DEFAULT_TENANT_ID`. |
| `src/lib/secrets.ts` | AES-256-GCM decrypt of the pooled conn string (inside the resolver only). |

## Public surface

| Export | Signature | Notes |
|---|---|---|
| `resolveAdapter` | `(tenantId) => Promise<DbAdapter>` | Pooled, LRU-cached by `tenantId`. Second call returns the cached instance (factory runs once). Throws `TenantUnavailableError` (→503) on missing/non-active. |
| `resolveAdapterForRequest` | `(auth: { tenantId?: string \| null }) => Promise<DbAdapter>` | Request entrypoint. Uses `auth.tenantId`; FALLS BACK to the `DEFAULT_TENANT_ID` Mongo adapter when absent (the incremental dogfood cutover). |
| `evictAdapter` | `(tenantId) => boolean` | Removes + closes (`pool.end()`) a cached adapter. For teardown / conn-string rotation. |
| `getTenantSql` | `(tenantId) => Promise<TenantSql>` | Lower-level raw-SQL handle (`neon()` reader + lazy WS `Pool`) for CHAP/PostGIS consumers. Not defined for the default Mongo tenant. |
| `evictTenantSql` | `(tenantId) => boolean` | Removes + ends a cached `TenantSql` pool. |
| `DEFAULT_TENANT_ID` | `"__default__"` | The legacy / dogfood Mongo tenant key. |
| `__setResolveConnectionDeps` / `__resetTenantCache` | test-only | Inject the control-DB lookup + adapter factories; reset (and close) both caches. |

## How a request resolves

1. The handler wrapper (`withSkill`/`withOdata`, Agent 13) calls
   `resolveAdapterForRequest(auth)`.
2. **No `tenantId`** → `resolveAdapter(DEFAULT_TENANT_ID)` → the shared Mongo data
   plane (lazy `import("@/lib/mongoose")`, wrap the native `Db` in the Mongo
   adapter). This is the cutover fallback — most legacy traffic still rides Mongo.
3. **A `tenantId`** → `resolveTenantById(id)` (one indexed control-plane lookup,
   `status:"active"` only) → `decryptTenantConnUri(tenant, "pooled")` →
   `createPostgresAdapter(conn)`.
4. The built adapter is cached in the LRU under `tenantId`. The next call for the
   same tenant returns it directly — no second factory, no second pool.

## Caching & lifecycle (the invariant that prevents pool leaks)

- **One adapter per `tenantId`.** Concurrent first-calls collapse onto a single
  in-flight construction (`inflight` map) so two requests never race two pools.
- **LRU bounds + idle TTL.** `max: 200`, `ttl: 10min` (build_plan §6.2). An idle
  tenant evicts so a long-lived serverless instance doesn't pin every pool.
- **Dispose closes the pool.** ANY removal — evict, TTL expiry, manual delete,
  `clear()` — fires `dispose → adapter.close() → pool.end()`. This is the
  keystone's #1 failure-mode guard: a leaked WS pool exhausts Postgres connection
  caps (build_plan §7 Spike #2). LRU `dispose` is synchronous, so `close()` is
  fired fire-and-forget with its rejection swallowed (a failed pool-end must not
  crash the host).
- **A throw never poisons the cache.** The adapter is `set()` only AFTER a
  successful build; an unavailable tenant leaves the cache untouched, so a later
  (now-active) resolve succeeds.

## Gotchas

- **The conn string is decrypted only here**, held transiently, NEVER logged,
  NEVER returned to a client (build_plan §3.7 #6).
- **`status` is a security boundary.** `resolveTenantById` filters
  `status:"active"`; a suspended/pending/teardown tenant resolves to `null` and
  the keystone throws `TenantUnavailableError` (→503) — never silently served.
- **The default Mongo path is lazy.** `@/lib/mongoose` is imported only when the
  default tenant is actually resolved, so the keystone (and its unit tests) never
  pull in Mongoose unless that path is taken.
- **`getTenantSql` is Postgres-only.** The default Mongo tenant has no SQL handle
  — `getTenantSql(DEFAULT_TENANT_ID)` throws `TenantUnavailableError`.
- **Mockability.** The control-DB lookup and both adapter factories are injected
  through a `deps` object swapped by `__setResolveConnectionDeps`, so unit tests
  exercise the real cache + lifecycle with zero live Mongo / Neon.

## Tests

`src/lib/tenant/__tests__/resolve-connection.test.ts` — Node built-in runner, **no
live Mongo**. The control-DB lookup + adapter factories are injected; the test
asserts: (a) second resolve hits the cache (factory once) + concurrent collapse,
(b) evict / `__resetTenantCache` close the adapter (`pool.end()` via `close()`),
(c) a missing/non-active tenant throws `TenantUnavailable` (and never poisons the
cache), (d) an absent `tenantId` falls back to the default Mongo adapter. PLUS an
**optional live smoke test**: when `.env.local` carries `NEON_POOLED_CONN_URI` it
builds a REAL Postgres adapter and round-trips `SELECT 1` (skips gracefully when
absent; never logs the conn string; closes the adapter in a `finally`).

```
npx tsx --test src/lib/tenant/__tests__/resolve-connection.test.ts
```
