---
title: ChatRealty API — Build Plan
status: current
last_verified: 2026-06-24
related: [./architecture.md, ./research.md]
---

# ChatRealty API — Build Plan

> **What this is.** The single, executable build plan for turning ChatRealty's
> single-tenant `/api/skill/*` + MCP surface into a **managed, database-per-tenant
> (Neon/Postgres), RESO-aligned real-estate backend (BaaS)**. It reconciles nine
> per-subsystem specs into one coherent program of work for ~25 parallel coding
> agents. Read [`architecture.md`](./architecture.md) and [`research.md`](./research.md)
> first — this plan implements the decisions settled there; it does not re-litigate them.

## How to use this plan

This plan is executed by **~25 parallel coding agents under `ultracode`**. Each agent
owns a **disjoint set of files** wherever possible. The plan is structured so you can:

1. Read **Global conventions** (§3) — these are binding on every agent. The ORM, the
   tenant-scoping rule, naming, response/error shapes, and the per-task "definition of
   done" are non-negotiable and resolve every cross-spec contradiction.
2. Read the **Dependency graph + phases** (§4) — know what is blocked by the keystone
   tenant-resolver vs. what can start on day one.
3. Find your assignment in **The 25-agent work breakdown** (§5). It names the files you
   OWN (create/modify), your upstream dependencies (agent-tasks that must land first),
   and crisp acceptance criteria. **Do not write files another agent owns.** Where two
   tasks must touch one file, the plan names the coordination explicitly and splits by
   region or sequences the edits.
4. Use **Per-subsystem file-by-file detail** (§6) as your implementation reference — the
   reconciled, de-duplicated spec for your subsystem, with contradictions already resolved.
5. Heed **Risks & spikes-first** (§7) — the **CHAP-on-PostGIS port** and the **Neon
   serverless connection-pooling load test** gate the rest of the program.

**Coordination protocol.** When your task and another both need to touch a shared file
(`skill-auth.ts`, `skill-scopes.ts`, `package.json`, `architecture.md`), the plan assigns
exactly **one owner** for that file and lists the *other* tasks as "coordinate — request
the edit from the owner." Never edit a shared file you don't own; instead the owner lands
a single edit that satisfies all consumers (e.g. one `SkillAuthSuccess` shape, one
`package.json` dep block). Conflicting edits to a shared file are a build-breaking bug.

---

## 3. Global conventions

### 3.1 Stack

| Layer | Choice |
|---|---|
| Runtime | Next.js (App Router) on Vercel, Node ≥18, TypeScript strict |
| Data plane (per-tenant) | **Neon serverless Postgres**, database-per-tenant, scale-to-zero, PostGIS + pg_trgm |
| Control plane | **Existing shared MongoDB** (Mongoose) — see §3.3 reconciliation |
| ORM / query layer | **Drizzle ORM** over `@neondatabase/serverless` (the single global choice — §3.2) |
| Serverless DB driver | `@neondatabase/serverless` (HTTP `neon()` for one-shot reads; WebSocket `Pool` only for transactions/DDL) |
| Client cache | `lru-cache` (per-tenant adapter/connection cache) |
| Rate-limit KV | Upstash Redis (`@upstash/redis`, REST) |
| Secrets | `src/lib/secrets.ts` (AES-256-GCM) — **reused unchanged** |
| Sync package | Standalone `@chatrealty/sync` TS/Node package (`commander`, `zod`, `undici`, `dotenv`) |
| MCP | Existing `packages/mcp-server` (stdio) + hosted OAuth bridge |

### 3.2 The ONE ORM — Drizzle (global convention)

**Chosen: Drizzle ORM.** Typed, SQL-first, zero-codegen, with first-class
`@neondatabase/serverless` HTTP/WS support and a raw `sql` escape hatch for PostGIS —
the things Prisma (engine binary + per-tenant `DATABASE_URL`) and Kysely (no
schema-as-types) do worse for serverless multi-tenancy.

This **supersedes any contradicting spec**: Spec 3 (Drizzle) is canonical; Spec 5's
generic `db.query<T>(sql, params)` is implemented as a thin method **on the Drizzle-backed
`DbAdapter`** (it wraps Drizzle's `sql` raw runner), **not** a second driver. No subsystem
picks its own ORM. The data-plane schema lives in Drizzle table definitions
(`src/lib/db/schema/*`); the RESO catalog (`src/lib/reso/data-dictionary.ts`) is the
**source of truth for column naming** that those Drizzle tables consume. Migrations are
managed by **drizzle-kit** and applied **at tenant-provision time** (never at app boot).

### 3.3 The ABSOLUTE tenant-scoping rule

> **There is NO global data-plane DB connection. Ever. Every data access goes through the
> per-request tenant Neon client returned by the keystone resolver.**

- A handler obtains its DB **only** from auth context: `auth → tenantId → resolveAdapter(tenantId) → DbAdapter`. It **never** imports a module-level `db`, never calls `dbConnect()` for data-plane reads, never `new Pool()` inside a route.
- The resolver returns a **pooled, LRU-cached, tenant-scoped** adapter. Pool/connection lifecycle is owned by the resolver subsystem; handlers neither open nor close clients.
- **Isolation is the database boundary itself** — a token maps to exactly one Neon DB. The legacy `resolveDomainOwner`/`session.user.id` scoping split is **irrelevant** for the product API (architecture §2). The Mongo adapter still takes an `ownerId` so the *legacy* single-tenant path keeps its `userId` scoping, but in the Postgres tenant model the DB is the isolation boundary.

**Control-plane reconciliation (resolves Spec 1 ↔ Spec 2 contradiction).** Spec 1 wrote
the control plane as Postgres-via-adapter; Spec 2 and Spec 9 wrote it as Mongoose on the
existing shared Mongo. **Decision: the control plane stays on the existing shared
MongoDB** (Mongoose `Tenant` model + token subdocs), because (a) the human `User` already
lives there and `ownerUserId` is a same-store reference, (b) it avoids standing up a second
Postgres control DB before the keystone even exists, and (c) it matches the "don't migrate
to launch" posture. Therefore:

- The **`Tenant` registry is a Mongoose model** at `src/models/control/Tenant.ts` (Spec 2's shape wins; Spec 1's `TenantRepo`/`TenantTokenRepo` *interface* is preserved as thin functions over the Mongoose model so call sites read identically, but they are **not** a Postgres adapter binding).
- The Postgres DDL in Spec 1 and Spec 9 for `tenants`/`tenant_tokens`/`metering_*` is **re-homed**: `metering_*` tables and `tenant_api_tokens` live in the **control store**. Since the control store is Mongo, metering rows are written as Mongo collections via the control connection (or to a dedicated small Neon control DB **only if** the load test in §7 shows Mongo write volume is a problem — deferred, not built day one). Build agents write metering through a single `control` binding (`src/lib/control/store.ts`), never a hand-rolled second mechanism.
- **Token→tenant resolution** denormalizes `tokenHash → tenantId` onto the `Tenant` document (`tokenHashes[]` + a `tenant_tokens` subarray) for an O(1) lookup, exactly as Spec 2 describes. Token mint/revoke MUST update both the denormalized array and the legacy `User.agentProfile…apiTokens` path during cutover (§6.1 gotchas).

### 3.4 Naming

- **Files/dirs:** kebab-case (`resolve-connection.ts`, `postgres-adapter.ts`). Next.js route files stay `route.ts`.
- **Postgres columns:** `snake_case` (`listing_key`, `on_market_date`).
- **TS fields / DTOs:** `camelCase` (`listingKey`, `onMarketDate`).
- **RESO names:** `PascalCase` (`ListingKey`, `BedroomsTotal`) — carried explicitly in `data-dictionary.ts`, never derived by naive transform (`poolYN`→`pool_yn`, `bathroomsTotalInteger`→`bathrooms_total_integer` need hand-mapping; reserved words `"view"`/`"order"` are quoted in DDL).
- **Tokens:** `crt_live_*`, sha256-hashed (`src/lib/secrets.ts` `hashToken`), unchanged format.
- **Scopes:** catalog in `src/lib/skill-scopes.ts` is the single source of truth.
- **MCP resource URIs:** `guide://chatrealty/*`.
- **Docs:** kebab-case under `docs/{area}/`, frontmatter required, no dates in filenames.

### 3.5 Standard response + error shapes

All `/api/skill/*` responses use the OData-flavored envelope from `src/lib/skill-api/response.ts`:

```jsonc
// collection
{ "value": [ ... ], "@odata.count": 123, "@odata.nextLink": "…or null",
  "meta": { "top": 50, "skip": 0, "hasMore": true },
  "items": [ ... ] }   // legacy alias emitted during the MCP deprecation window (§6.6)
// single resource
{ /* the resource object */ }
// error
{ "error": { "code": "invalid_odata", "message": "…", "param": "$filter", "details": {} } }
```

- Every response sets `Cache-Control: no-store` (per-tenant data is never shared-cacheable; this preserves today's behavior and the §"Auth-Gated Cache Leak" memory).
- `@odata.count` is emitted **only** when the caller passes `$count=true` (counting is expensive; never unconditional).
- **MCP back-compat (decision):** `ok()` emits **both** `value` and legacy `items` during a dated deprecation window, recorded in `docs/tech-debt.md`. This is the chosen mitigation (over a `/v2` split) so the MCP server's current `{ items, total, skip, limit, hasMore }` consumers don't break at cutover.
- Error→status mapping is centralized in `mapErrorToResponse` (`src/lib/skill-api/errors.ts`): `TenantUnavailable`→503, `NotFound`→404, `TenantSuspended`/`tenant_not_active`→403, validation→400, OAuth/scope→401/403.

### 3.6 Testing expectations

- **Pure logic** (OData parser, flatten/map, DTO mappers, `normalizePropertyType`, `dedupeAndRank`, area-stats SQL builders) — unit-tested, no DB, no network.
- **Adapter contract** — a single shared contract suite runs against **both** the Mongo adapter (today's query objects) and the Postgres adapter (Neon test DB, ≥20 seeded rows). Byte-identical DTOs across dialects is the bar.
- **Parity** — route cutovers prove response JSON is byte-identical to the pre-change Mongo path via `DEFAULT_TENANT_ID` (snapshot test).
- **Resolver** — second call hits cache (constructor invoked once); evict closes the pool (`pool.end()` asserted); non-active tenant throws `TenantUnavailable`.
- **Provisioning/Neon/metering** — all external calls (Neon API, Upstash, email) **mocked**; failure paths asserted (partial-provision rollback, fail-open limiter, swallowed metering errors).
- **CHAP regression** — `percentile_disc(0.5)` where exact parity with current medians is needed; amenity counts must read both typed column AND `extras` fallback.

### 3.7 Per-task "Definition of Done"

A task is **done** only when ALL of the following hold:

1. Files **owned** are created/modified; **no file owned by another task is touched**.
2. Acceptance criteria pass; tests at the level required by §3.6 are green.
3. **No global data-plane connection** is introduced (no module-level `db`, no `new Pool()` in a route, no `dbConnect()` for data-plane reads). Tenant scoping verified.
4. TypeScript compiles strict; no `any` leaks across a public export boundary.
5. **Docs updated in the same change** per repo CLAUDE.md: the area README under `docs/{area}/` (create if absent), `last_verified: 2026-06-24`, and any linchpin-table row flipped from "to build" to the concrete file. Doc drift is a build bug.
6. Secrets never logged; decrypted conn strings never returned to any client; one-time token plaintext never logged.
7. **Listing attribution present** (§3.8) on every task that selects, maps, returns, or renders listing data.

### 3.8 Listing attribution invariant (HARD RULE — MLS/IDX compliance)

> **Listing data MUST NEVER be served or rendered without the listing agent and listing brokerage attribution.** This is an IDX display-rule requirement, not a nicety — a violation is a compliance bug, same severity as a tenant leak.

- **Required fields** (`unified-listing.ts`, camelCase, top-level): `listAgentName` + `listOfficeName` at minimum; include `listAgentPreferredPhone` / `listOfficePhone` where the surface allows. The sync MUST map the RESO sources: `ListAgentFullName`→`listAgentName`, `ListOfficeName`→`listOfficeName`, the MLS IDs, and phones. (No co-list fields exist today.)
- **Every listing DTO carries attribution.** `toListingDTO` (Agent 01) MUST include `listAgentName` + `listOfficeName`; a listing DTO without them **fails the contract test**. This makes attribution structurally impossible to drop downstream.
- **Every serving/rendering surface displays it** — search results, card grids, detail sheets, the MCP listing-board, and CHAP narration (the narrator prompt MUST cite "Listed by {office} — {agent}").
- **Audited gaps to fix (2026-06-24)** are mapped to owners in §8.1. Compliant already: the public detail page, the skill detail route, the chat `ListingDetailCard`.

### 3.9 LLM-first documentation (a deliverable, not an afterthought)

> Documentation is a product surface, written for Claude first. The MCP serves docs as resources (`guide://chatrealty/*`); they must be structured, explicit, and example-rich so an LLM can build against them with zero tribal knowledge.

- Every published doc (the RESO Data Dictionary, the build-guide, each `/api/skill/*` resource, the sync setup, neighborhoods) ships as **LLM-optimized markdown**: explicit field tables (type / enum / nullable), copy-paste examples, the attribution invariant restated inline, and "common mistakes" callouts.
- The Data Dictionary doc (Agent 03) is the canonical example. The build-guide the MCP serves is generated from the same source so it never drifts. All live under `docs/{area}/` with frontmatter per repo CLAUDE.md.

---

## 4. Dependency graph + build phases

**The keystone** is `src/lib/tenant/resolve-connection.ts` (token → `tenantId` → decrypted
conn string → pooled, LRU-cached tenant `DbAdapter`). It depends on the control-plane
`Tenant` model + `resolve-tenant.ts` and on the `DbAdapter` adapter constructors. **Almost
nothing data-plane runs in production until it lands** — but most of the *code* can be built
in parallel against its **interface** (the `DbAdapter` type and the `resolveAdapter` signature),
using stubs/mocks, then integrated.

```
                          ┌───────────────────────────────────────────────┐
 PHASE 0 (day one,        │  DbAdapter interface + DTOs (Spec 3 Task A)    │  ← contract
 parallel, interface-     │  RESO data-dictionary + ddl (Spec 4 A/B)      │     publishers
 first; no keystone       │  OData parser + envelope + errors (Spec 6 A)  │
 needed):                 │  Mongo adapter (Spec 3 A)                      │
                          │  Secrets/skill-auth (exist)                   │
                          └───────────────┬───────────────────────────────┘
                                          │  publishes types
                ┌─────────────────────────┼──────────────────────────────────┐
 PHASE 1        ▼                          ▼                                  ▼
 (keystone   Control-plane Tenant    Neon API client +              Postgres adapter +
  build):    model + resolve-tenant  provision/teardown             Drizzle schema/migrations
             (Spec 1 A / Spec 2 A)   (Spec 2 B / Spec 9 B)          (Spec 3 B / Spec 4 B)
                │         │                  │                            │
                └────┬────┴──────────────────┴──────────┬─────────────────┘
                     ▼                                    ▼
        ┌───────────────────────────┐      resolve-connection.ts (THE KEYSTONE)
        │ approval gate (Spec 1 C)  │      (Spec 2 C / Spec 3 C — single owner)
        │ skill-auth tenant binding │
        └──────────────┬────────────┘
                        ▼
 PHASE 2 ───────────────────────────────────────────────────────────────────────
 (de-globalize on the keystone):
   handler wrapper withSkill/withOdata (Spec 6 B) ── needs resolve-connection
   route cutovers (Spec 3 D, Spec 6 C/D) ────────── needs wrapper + adapters
   CHAP repo port + preview/map/poi (Spec 5 A–D) ── needs DbAdapter + keystone
   custom-fields registry + extras (Spec 4 C) ───── needs DbAdapter
 PHASE 3 ───────────────────────────────────────────────────────────────────────
   provisioning service + route (Spec 9 B) ──────── needs gate + Neon client + migrations
   KV rate limiter (Spec 9 A) ──────────────────── independent (only skill-auth)
   metering write path + middleware + cron (Spec 9 C/D)
   signup/admin/cron routes (Spec 1 D)
 PHASE 4 ───────────────────────────────────────────────────────────────────────
   packages/chatrealty-sync (Spec 8 A–D) ───────── needs db-adapter export + dictionary
   MCP tiers/tools/resources (Spec 7 A–D) ───────── needs /api/skill routes live
```

**Start day-one in parallel (Phase 0, no keystone needed):** the `DbAdapter` interface +
DTOs, the RESO data-dictionary + DDL generator, the OData parser + envelope + errors, the
Mongo adapter, and the KV rate limiter (touches only `skill-auth.ts`). These publish the
types everyone else codes against.

**Blocked by the keystone (Phase 2+):** route cutovers, the handler wrapper's actual tenant
injection, the CHAP preview/map/POI ports' *integration*, provisioning's live Neon spin-up.
These can be **written** against stubs in Phase 0/1 but only **integrate** once
`resolve-connection.ts` is real.

---

## 5. The 25-agent work breakdown

Grouped by phase. Each entry: **name · subsystem · OWNS (files) · depends-on · acceptance**.
File ownership is disjoint; shared-file coordination is named explicitly.

### Phase 0 — Interface & contract publishers (start day one, no keystone)

**Agent 01 — DbAdapter interface + DTOs + mappers**
- Subsystem: DB-Agnostic Adapter (Spec 3 Task A).
- OWNS: `src/lib/db/adapter.ts`, `src/lib/db/to-dto.ts`.
- Depends: none (publishes the `DbAdapter`, `ListingFilter`, `ListingDTO`, `ContactDTO`, `FindOpts` contract everyone imports).
- Accept: `DbAdapter`/`ListingRepo`/`ContactRepo` interfaces compile; `toListingDTO`/`toContactDTO` collapse `bedroomsTotal||bedsTotal`, `bathroomsTotalInteger||bathsTotal`, `poolYN/poolYn`, and the photo-URL fallback chain; DTOs are camelCase and byte-identical to today's inline `.map(...)` output for 3 representative rows.

**Agent 02 — Mongo adapter (legacy/self-host path)**
- Subsystem: DB-Agnostic Adapter (Spec 3 Task A).
- OWNS: `src/lib/db/mongo-adapter.ts`.
- Depends: 01 (interface only).
- Accept: `createMongoAdapter(conn)` reproduces today's exact Mongo query objects — the `.collection` native bypass for the `onMarketDate` string-vs-Date trap, the `$or` dual bed/bath clauses, `userId: ownerId` scoping, `.lean()`/native reads for `Mixed` `cmaStats`/`cashflowStats`; unit test asserts emitted filter equals the hand-built one for 3 inputs. No route edits.

**Agent 03 — RESO Data Dictionary catalog**
- Subsystem: RESO Schema (Spec 4 Task A).
- OWNS: `src/lib/reso/data-dictionary.ts`, `docs/chatrealty-api/data-dictionary.md`.
- Depends: none (publishes canonical column naming — `name`/`resoName`/`pgType`/`type`/`nullable`/`indexed` per field — that Drizzle schema and the sync mapper consume).
- Accept: `RESOURCES` exports Property/Member/Office/Media; `getField("Property","listingKey")` resolves; enum fields carry `enumValues`; unit test asserts no duplicate field names per resource and every `resoName` is PascalCase; markdown doc derived from the catalog with required frontmatter.

**Agent 04 — DDL generator + init migration**
- Subsystem: RESO Schema (Spec 4 Task B).
- OWNS: `src/lib/reso/ddl.ts`, `src/lib/reso/migrations/0001_init.sql`.
- Depends: 03 (import only).
- Accept: `buildFullSchemaDDL()` emits valid SQL for all four resources + `custom_field_registry` + `schema_migrations`, PostGIS GiST on `property.geom`, GIN(`jsonb_path_ops`) on every `extras`, ported compound indexes, quoted `"view"`/`"order"`; runs against a throwaway PostGIS Postgres and tables/indexes exist; **reconciliation test** asserts `0001_init.sql` == `buildFullSchemaDDL()` output. **Coordinate with Agent 09:** `0001_init.sql` is the canonical per-tenant data-plane migration; the provisioning runner (Agent 16) invokes it — Agent 04 owns its content, Agent 16 only calls it.

**Agent 05 — OData parser + standard envelope + errors**
- Subsystem: REST+OData Surface (Spec 6 Task A).
- OWNS: `src/lib/skill-api/odata/parse.ts`, `src/lib/skill-api/response.ts`, `src/lib/skill-api/errors.ts`, `src/lib/skill-api/__tests__/*`.
- Depends: none (publishes `OdataQuery` — the contract the Postgres adapter's `find(resource, OdataQuery)` consumes; db-adapter imports it, does not redefine).
- Accept: `parseOdata` round-trips `$filter=City eq 'Palm Desert' and ListPrice ge 500000`, `$select`, `$orderby ListPrice desc`, `$top`/`$skip`, `$count=true`; rejects unknown fields + malformed filters with `invalid_odata` + correct `param`; **AND-only** grammar rejects `or`/parentheses with a clear message; `ok()`/`okOne()`/`fail()` produce the documented envelope (with the legacy `items` alias) and `no-store`; zero Next/DB imports in `parse.ts`.

**Agent 06 — KV sliding-window rate limiter**
- Subsystem: Provisioning/Metering/Rate-limit (Spec 9 Task A).
- OWNS: `src/lib/rate-limit-kv.ts`; edits to `src/lib/rate-limit.ts` (deprecation/fallback export). **Owns the `skill-auth.ts` rate-limit edit only** (see coordination below).
- Depends: none functionally; coordinates the `skill-auth.ts` shared file.
- Accept: `checkRateLimit` is atomic across instances (Upstash sorted-set pipeline: `zremrangebyscore`+`zadd`+`zcard`+`pexpire`, `zrem` the rejected hit); **fails open** with a warning when `isKvConfigured()` is false, falling back to in-memory; bucket key prefixed with `tenantId` (collision-free); returns 429 with correct `Retry-After`; unit test proves two concurrent callers share one window.
- **Coordination (shared `skill-auth.ts`):** Agent 06 owns the rate-limit edit (`skillRateLimit` → async, `tenantId` bucket key). Agent 11 owns the *tenant-binding* edit (`SkillAuthSuccess` gains `tenantId` + lazy `getSql()`). To avoid two owners on one file: **Agent 11 lands the consolidated `skill-auth.ts` edit** (adds `tenantId`, lazy `getSql()`, async `skillRateLimit` calling `rate-limit-kv`, `research` rate tier, re-exports `requireScope`/`skillRateLimit`). Agent 06 delivers `rate-limit-kv.ts` + the swap *spec* and reviews; Agent 11 integrates. One owner, one edit.

### Phase 1 — Keystone build (control plane → resolver)

**Agent 07 — Control-plane Tenant model + token resolver + errors**
- Subsystem: Tenant Model / Connection Resolver (Spec 1 Task A + Spec 2 Task A).
- OWNS: `src/models/control/Tenant.ts`, `src/lib/tenant/resolve-tenant.ts`, `src/lib/tenant/errors.ts`, `src/lib/control/store.ts` (the single control-store binding).
- Depends: `secrets.ts`, `mongoose.ts` (exist).
- Accept: **Mongoose** `Tenant` model registered hot-reload-safe (`mongoose.models.Tenant ?? model(...)`), carrying `tenantId/slug/ownerUserId/status/license/neon/secrets/metering/tokenHashes[]/tenant_tokens[]` per the reconciled shape (§6.1); `resolveTenantByTokenHash(hash)` returns the active tenant in one lookup (excludes revoked/suspended), `null` on miss; `decryptConnString()` helper present; `TenantUnavailableError`/`TenantNotFoundError` exported. No Neon imports here. Thin `TenantRepo`/`TenantTokenRepo` function wrappers expose Spec 1's interface over the Mongoose model.

**Agent 08 — Neon API client + provision/teardown**
- Subsystem: Connection Resolver / Provisioning (Spec 2 Task B).
- OWNS: `src/lib/neon/client.ts`, `src/lib/neon/provision.ts`; `.env.example` Neon additions.
- Depends: 07 (writes `neon.*` + encrypted conn strings onto the `Tenant`), `secrets.ts`.
- Accept: all Neon HTTP via `neonApi<T>` (no inline `fetch`); `provisionTenantDatabase` creates project→DB→least-priv role, **polls project to `active`**, encrypts **pooled** + **direct** conn strings, runs the bootstrap (`CREATE EXTENSION postgis`, `pg_trgm`, `_crt_meta`) over the **direct** conn, sets `status:"active"`; injected failure → best-effort `deleteProject` + `status:"failed"` + `lastProvisionError`; `teardownTenantDatabase` evicts cache + deletes project (swallows 404). **Coordinate with Agent 16:** `provision.ts` exports `provisionTenantDatabase`; the higher-level `provision-service.ts` orchestration (token mint + migration trigger) is Agent 16's — agree the boundary so they don't both write `provision.ts`. **Decision: Agent 08 owns `src/lib/neon/provision.ts` (Neon-API mechanics only); Agent 16 owns `src/lib/tenant/provision-service.ts` (orchestration).**

**Agent 09 — Drizzle data-plane schema + Postgres adapter + migrations + deps**
- Subsystem: DB-Agnostic Adapter (Spec 3 Task B).
- OWNS: `src/lib/db/schema/listings.ts`, `src/lib/db/schema/contacts.ts`, `src/lib/db/schema/index.ts`, `drizzle.config.ts`, `src/lib/db/migrations/*`, `src/lib/db/postgres-adapter.ts`. **Owns the `package.json` dependency block (single owner — see coordination).**
- Depends: 01 (interface), 03 (column naming — consume `data-dictionary.ts`; if racing, mirror `unified-listing.ts` with a `// TODO reconcile` marker).
- Accept: `drizzle-kit generate` produces DDL matching §6.3 (PostGIS, GIN on `extras`, GiST on `geom`, dual bed/bath columns kept, real `timestamptz on_market_date`); `createPostgresAdapter(conn)` implements `DbAdapter` (HTTP `neon()` for reads, `Pool` only for tx), bbox → `ST_MakeEnvelope`/`ST_Contains`, `hasPool`/`extras` → JSONB predicates; passes the **same** adapter-contract suite as Agent 02 against a 20-row Neon test DB.
- **Coordination (shared `package.json`):** Agent 09 is the **single owner** of all dependency additions (`drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`, `lru-cache`, `@upstash/redis`). Agents 06, 08, 11, 17 list deps they need; Agent 09 lands one consolidated dependency block. `pg` already present.

**Agent 10 — THE KEYSTONE: tenant connection resolver + LRU adapter cache**
- Subsystem: Connection Resolver (Spec 2 Task C + Spec 3 Task C — reconciled single owner).
- OWNS: `src/lib/tenant/resolve-connection.ts`.
- Depends: 07 (`resolve-tenant`), 09 (`createPostgresAdapter`), 02 (`createMongoAdapter`), `secrets.ts`.
- Accept: `resolveAdapter(tenantId)` / `resolveAdapterForRequest(auth)` return a **pooled, LRU-cached** `DbAdapter` keyed by `tenantId` (second call hits cache — constructor invoked once; `dispose`/`evict` calls `adapter.close()`/`pool.end()`); decrypts conn string via `secrets.ts`; **falls back to `DEFAULT_TENANT_ID` Mongo** when `auth.tenantId` absent (incremental dogfood cutover); throws `TenantUnavailable` (→503) on missing/inactive tenant; control-DB lookup is mockable (tests without Neon); also exports the lower-level `getTenantSql`/`evictTenantSql`/`TenantSql` handle for subsystems that need raw SQL. **This single file reconciles Spec 2's `resolve-connection.ts` and Spec 3's `resolve-connection.ts` — they are the same keystone; do not build two.**

**Agent 11 — skill-auth tenant binding + scopes + rate tier (shared-file owner)**
- Subsystem: Identity/Auth seam (Spec 1 Task B + Spec 2 Task D + Spec 6 Task B scope edits + Spec 9 Task A swap).
- OWNS (single owner of these shared files): `src/lib/skill-auth.ts`, `src/lib/skill-scopes.ts`. Plus `src/lib/tenant/resolve-tenant.ts` *consumer* re-exports if needed (coordinate with 07 — 07 owns the file).
- Depends: 06 (`rate-limit-kv`), 07 (`resolveTenantByTokenHash`), 10 (lazy `getSql()` thunk source).
- Accept: `SkillAuthSuccess` gains `tenantId: string` + lazy `getSql()` (identity-only paths like `whoami` do NOT open a Neon pool until called); a token bound to an active tenant yields `auth.tenantId` and a working `auth.getSql()`; valid token with no tenant → `{ ok:false, status:403, reason:"no_tenant_for_token" }`; `skillRateLimit` is async, KV-backed, `tenantId`-keyed; `requireScope`/`skillRateLimit` re-exported for `resolve-tenant.ts`; `"research:read"` added to `SCOPES` with a `client_research`/`research` preset (NOT added to agent presets); `"research"` rate tier added. **Does NOT edit any `/api/skill/*` route.** This is the one place all auth/scope/rate edits land — every other spec that "modifies skill-auth.ts/skill-scopes.ts" routes its change through Agent 11.

**Agent 12 — Approval gate + PlatformConfig toggle**
- Subsystem: Control Plane (Spec 1 Task C).
- OWNS: `src/lib/tenant/provisioning-gate.ts`, `src/models/PlatformConfig.ts` (add `moderation.tenantAutoApprove?: boolean`, default `false`).
- Depends: 07 (`Tenant` model/repos), 16 (`provisionApprovedTenant` — may stub initially).
- Accept: `approveTenant` flips `pending→approved`, mints exactly one token (plaintext returned **once**, never logged), stamps license-verified audit fields, calls (stubbed-if-needed) provisioning; `rejectTenant` sets `rejected`+reason; `getTenantAutoApprove` defaults OFF; emails best-effort, never throw.

### Phase 2 — De-globalize on the keystone

**Agent 13 — Handler wrapper (withSkill/withOdata) + field maps**
- Subsystem: REST+OData Surface (Spec 6 Task B).
- OWNS: `src/lib/skill-api/handler.ts`, `src/lib/skill-api/field-maps.ts`.
- Depends: 05 (`OdataQuery`/envelope), 10 (`resolveAdapterForRequest`), 11 (auth/scope/tier), 04/03 (field names).
- Accept: `withSkill`/`withOdata` fuse auth→scope→rate-limit→**tenant adapter injection**→OData-parse in that order; the wrapper **never opens a client** — it calls the keystone's pooled resolver; `mapErrorToResponse` maps adapter errors to 404/403/503; `allowedFieldSet` unions core fields + registry-`searchable` custom fields (prefixed `extras.`); `research:read` routes pick tier from `RouteConfig.rateTier`, not the scope. Compiles against the real keystone (10) and stubs only where a downstream route is absent.

**Agent 14 — CHAP repo port + Postgres listing queries**
- Subsystem: CHAP-on-PostGIS (Spec 5 Task A) — **the #1 spike (§7)**.
- OWNS: `src/lib/chat-search/repo/listing-repo.ts`, `src/lib/chat-search/repo/postgres-listing-repo.ts`, `src/lib/chat-search/repo/index.ts`; edits to `src/lib/chat-v2/listing-query.ts` (keep types + `normalizePropertyType`; `@deprecate` `buildListingQuery`/`computeAreaStats` for product, keep for legacy Mongo).
- Depends: 01/09 (`DbAdapter`/`db.query`), 10 (tenant client), 03 (column names).
- Accept: `findListings`/`countListings`/`areaStats`/`findListingByAddress`/`findListingsByKeys`/`resolveStreetKeys` implemented over the adapter; `areaStats` uses one CTE (`percentile_cont`/`percentile_disc` + `COUNT FILTER`) matching `AreaStats` shape; amenity counts read **both** typed column AND `extras` fallback; every `ListingFilters` field maps to the equivalent SQL predicate; scope uses `= ANY($variants)` (never `ILIKE` on scope fields); `property_type` filtered first (rental `B` reuses `list_price` as rent); no Mongoose import. **Publishes `listing-repo.ts` interface signatures day-one of Phase 2** so Agents 15/19 build against them in parallel.

**Agent 15 — CHAP entity search + parser decoupling**
- Subsystem: CHAP-on-PostGIS (Spec 5 Task B).
- OWNS: `src/lib/chat-search/repo/entity-search.ts`; edits to `src/lib/chat-v2/query-parser.ts` and `src/lib/chat-search/parse.ts` (inject `resolveEntity`, do not hard-import Mongo).
- Depends: 14 (repo interface), 09 (`db.query`).
- Accept: `multiSourceSearch` returns ranked `SearchResult[]` from Postgres FTS (`tsvector`) + `pg_trgm` ILIKE with the **pure `dedupeAndRank`** ordering ported verbatim; `parseQuery(msg, { resolveEntity })` classifies the existing intent corpus identically (snapshot test); abbreviation map (`pdcc`, `pga`, KNOWN_COUNTIES/REGIONS) still resolves; Postgres `identifyEntityType` reads `location_index`. Edits `listing-query.ts`? **No** — only Agent 14 edits that file; Agent 15 imports its types.

**Agent 16 — Provisioning service orchestration + provision route**
- Subsystem: Provisioning (Spec 1 gate-handoff + Spec 9 Task B).
- OWNS: `src/lib/tenant/provision-service.ts`, `src/app/api/control/tenants/[id]/provision/route.ts`.
- Depends: 07 (`Tenant`), 08 (`provisionTenantDatabase`/Neon mechanics), 09 (`runTenantMigrations`/`0001_init.sql` runner), 12 (gate), `secrets.ts`.
- Accept: `provisionApprovedTenant(tenantId)` is **idempotent** (re-run on `ready` is a no-op), asserts `licenseStatus==="approved"`, sets `provisioning`→ Neon spin-up → `encryptSecret(pooled)` stored → `runTenantMigrations(direct)` → mint token via `generateApiToken` → `attachTenantToken` → `ready`; on failure `provision_failed`+reason; route is **admin-guarded**, returns plaintext token **once** with `NO_STORE`, `GET` polls status and **never** returns the conn string. Neon API mocked in tests. Owns `provision.ts`? **No** — Agent 08 owns Neon mechanics; Agent 16 owns orchestration only.

**Agent 17 — Custom-field registry API + extras validation**
- Subsystem: RESO Schema / Custom Fields (Spec 4 Task C).
- OWNS: `src/lib/tenant/custom-fields.ts`, `src/lib/reso/extras.ts`.
- Depends: 03 (`getField`/`ResoResource`), 01 (`TenantDb`/`DbAdapter` interface).
- Accept: full CRUD on `custom_field_registry` through an **injected** `TenantDb` (never a global); `registerCustomField` rejects core-RESO-field shadowing + invalid identifiers (`^[a-z][a-zA-Z0-9_]{0,62}$`) + enforces enum-values-present; `validateExtras` drops unregistered keys and coerces by declared type; `extrasFilterClause` emits **parameterized** `extras->>'name'` SQL (no value interpolation); tests use a stubbed `TenantDb`.

**Agent 18 — CHAP preview dispatch + POI/snapshot port**
- Subsystem: CHAP-on-PostGIS (Spec 5 Task D).
- OWNS: `src/lib/chat-search/preview.ts`, `src/lib/chat-search/nearby-pois.ts`, `src/lib/chat-search/poi-repo.ts`.
- Depends: 14 (`ListingRepo`), 15 (`entitySearch`), 17 (registry for `extras` amenity filterability — soft).
- Accept: `runPreview(parsed, { repo, articleRepo, subdivisionRepo, entities })` produces identical `PreviewResult` shapes for **all** intents (listing-detail, aggregate/search, street-listings, compare, trend, cma incl. listingOptions, insights, describe-intent) against a seeded Postgres fixture, verified against the `types.ts` component-shape contract; `nearby-pois.ts` resolves center + radius via PostGIS `ST_DWithin(geom, …::geography, radiusMeters)`; `resolveSnapshotMeta` reads pre-computed `cma_stats` JSONB; **no Mongoose imports remain in `chat-search/`**. Does not edit `preview.ts`'s callers — only `preview.ts` itself.

**Agent 19 — CHAP map data layer + clusters + map-clusters route**
- Subsystem: CHAP-on-PostGIS (Spec 5 Task C).
- OWNS: `src/lib/chat-search/map-data.ts`, `src/lib/chat-search/repo/postgres-map-queries.ts`; edits to `src/app/api/map-clusters/route.ts` (extract DB calls, keep SSE + static boundary merge + cache headers).
- Depends: 14 (declares `mapBounds`/`mapClusters` signatures on the interface; Agent 19 implements the **bodies in its own `postgres-map-queries.ts`** to avoid colliding with Agent 14's `postgres-listing-repo.ts`), 10 (`resolveTenant`).
- Accept: zoom 12+ returns viewport listings via `geom && ST_MakeEnvelope`; grid clustering returns `count`/`avgPrice`/centroid matching the prior aggregation within rounding (`ST_SnapToGrid` or `round(ST_X/grid)*grid`); SSE responses byte-compatible with the current client; static county/city/region boundary merge unchanged; route uses `getListingRepo(await resolveTenant(req))`, no `dbConnect`/`UnifiedListing`.

**Agent 20 — Migrate read/collection routes to the wrapper**
- Subsystem: REST+OData Surface (Spec 6 Task C) — supersedes Spec 3 Task D's three reference routes (this agent does the full GET-collection set).
- OWNS: GET-collection routes under `src/app/api/skill/listings/**`, `src/app/api/skill/market/**`, `src/app/api/skill/articles/route.ts` (GET), `src/app/api/skill/landing-pages/route.ts` (GET), `src/app/api/skill/rentals/**`.
- Depends: 13 (wrapper), 14/09 (adapter repos), 11 (auth/scope).
- Accept: each route uses `withOdata`, queries via `db.find`/adapter repos, returns the standard envelope (with legacy `items` shim), supports `$select/$filter/$orderby/$top/$skip` against its `ResourceFieldMap`; response JSON byte-identical to pre-change via `DEFAULT_TENANT_ID` snapshot; **no `dbConnect`/`UnifiedListing` import remains**. Does NOT touch contacts/POST/single-resource (Agent 21).

**Agent 21 — Migrate single-resource + write + contacts/me routes; add saved-search route**
- Subsystem: REST+OData Surface (Spec 6 Task D) + CHAP saved-search write path (Spec 6/7).
- OWNS: `src/app/api/skill/contacts/**`, `src/app/api/skill/me/**`, `[id]`/`[slugId]`/`[listingKey]` single-resource routes, all POST handlers, NEW `src/app/api/skill/research/saved-searches/route.ts`.
- Depends: 13 (wrapper), 11 (`research:read` scope/tier), 14 (repo), 10 (keystone).
- Accept: single-resource routes use `withSkill` + `okOne`/`fail(404)`; POST routes keep `write` tier + `fail(400,"validation_failed",…)`; saved-search route is **hard-bound to the token's tenant**, `scope:"research:read"`, `rateTier:"research"`, writes only the one saved-search/lead signal, returns **no PII**; no overlap with Agent 20's files.

### Phase 3 — Provisioning surface, metering, signup

**Agent 22 — Signup + admin review + auto-approve cron**
- Subsystem: Control Plane (Spec 1 Task D).
- OWNS: `src/app/api/tenant/signup/route.ts`, `src/app/api/admin/tenants/[id]/review/route.ts`, `src/app/api/cron/auto-approve-tenants/route.ts`.
- Depends: 07 (`Tenant`/repos), 12 (gate), 11 (already added `research:read` — Agent 22 does NOT touch `skill-scopes.ts`).
- Accept: signup creates a `pending` tenant linked to the session `User`, rejects duplicate-owner with 409, honors the auto-approve toggle; admin review is `isAdmin`-gated, returns once-only token on approve; cron is `CRON_SECRET`/`INTERNAL_API_SECRET`-gated and **only auto-approves when `tenantAutoApprove` is ON** (license is the real gate — §7 legal-review flag).

**Agent 23 — Metering write path + middleware + schema + rollup cron**
- Subsystem: Metering (Spec 9 Tasks C + D).
- OWNS: `src/lib/metering/record.ts`, `src/lib/metering/meter-middleware.ts`, the control-store metering definitions (`tenant_api_tokens` + `metering_*` collections/tables via `control/store.ts` — coordinate with Agent 07 who owns `store.ts`: Agent 23 adds metering write functions in a sibling `src/lib/metering/store.ts`, not inside Agent 07's file), `src/app/api/cron/metering-rollup/route.ts`.
- Depends: 07 (control store), 10 (resolver, for per-tenant row/photo counts).
- Accept: `recordApiCall` non-blocking, batches (≥50 or 2s, `waitUntil` flush), never throws into the caller; `recordSyncRun`/`recordStorageSnapshot` single-write; `withMetering` wraps a handler without altering its response; writes target the **control store**; rollup cron idempotent per `(tenantId, usageDate)`, skips cold/unreachable tenant DBs without failing the run; **no gating logic** (free-for-now, record only).

### Phase 4 — Sync package & MCP

**Agent 24 — `packages/chatrealty-sync` (customer-side daily cron)**
- Subsystem: Sync (Spec 8 Tasks A–D, consolidated — one package, one agent owns the package; if split, by `src/commands/*` per Spec 8's coordination note).
- OWNS: entire `packages/chatrealty-sync/**` (`package.json`, `tsconfig.json`, `src/cli.ts`, `src/config.ts`, `src/mls/client.ts`, `src/mls/flatten.ts`, `src/mls/map-to-dictionary.ts`, `src/writer/{index,direct-neon,ingest-endpoint}.ts`, `src/state.ts`, `src/sync.ts`, `src/index.ts`, `src/commands/{seed,sync,init,doctor}.ts`, `README.md`, examples); edits to root workspaces config if not already a `packages/*` glob.
- Depends: 09 (`@chatrealty/db-adapter` `upsertProperties`/`upsertCustomFields` — `DirectNeonWriter` is a thin shell over it), 03 (`DATA_DICTIONARY_FIELDS` core-vs-`extras` split), 08 (scoped conn string/ingest token — may stub).
- Accept: RESO Web API is the **default** dialect (`@odata.nextLink` pagination, `value[]`, `$filter ModificationTimestamp gt`), Spark is the compat path (skiptoken-until-unchanged, ported from `unified-fetch.py`); `flatten` ports `flatten.py` (canonical YN casing `poolYN`/`spaYN`/…, GeoJSON coordinates, land/lease derivation, slug, `null` on no-`ListingKey`); unmapped fields fall to `extras` (assert in test); `seed`→`sync` run end-to-end with stubs, watermark persists with a ≥26h overlap window, `--dry-run` writes nothing, **never `--purge`** (no deletes); secrets from env only (never in the config file); `doctor` validates config/creds/DB/`$metadata`; `init` writes config + `.env` template + `custom_field_registry` entries from the interview; ESM `bin` has a shebang.

**Agent 25 — MCP tiers + seeding/field-discovery tools + build-guide resources + wiring**
- Subsystem: MCP Server (Spec 7 Tasks A–D).
- OWNS: `packages/mcp-server/src/tools/{seed_status,discover_custom_fields,register_custom_field,save_search}.ts`, `packages/mcp-server/src/resources/build-guide.ts`, `packages/mcp-server/src/tiers.ts`, `packages/mcp-server/src/config.ts`, `packages/mcp-server/src/tools/index.ts`, `packages/mcp-server/src/index.ts`, `src/lib/mcp-tool-bridge.ts`, `src/lib/mcp-oauth.ts`, `docs/mcp/README.md`, `docs/mcp/tools.md`. **Does NOT touch `src/lib/skill-scopes.ts`** — Agent 11 already added `research:read`/`research` preset; Agent 25 consumes them.
- Depends: 11 (scopes), 17 (`/api/skill/custom-fields`), 21 (`/api/skill/saved-searches`), 20 (`/api/skill/schema`, `/api/skill/sync/status`).
- Accept: three seeding/discovery `ToolDef`s + `save_search` compile as thin `/api/skill/*` wrappers (`register_custom_field` enforces `enumValues` when `type=enum`, rejects core-field shadowing); `BUILD_GUIDE_RESOURCES`+`guideByUri` serve the four `guide://chatrealty/*` resources (live `data-dictionary.json` fetches `/api/skill/schema` via **threaded `config`**; static `.md` backtick-safe); `toolsForTier`/`isToolAllowedForTier` implemented — **both transports filter `tools/list` AND reject disallowed `tools/call`** (defense in depth); `research` tier = read surface + the single `save_search` write, excludes all CRM/CMS/images/social/`register_custom_field`; tier derives from OAuth-resolved scopes (hosted) / `CHATREALTY_TIER` env (stdio); new tools in `ALL_TOOLS`; docs bumped with new count/tiers/resources/`last_verified: 2026-06-24`.

> **Agent-count note.** Tasks naturally number 25 (Agents 01–25). Spec 8's sync package and
> Spec 7's MCP work are each one owning agent here (with the internal `src/commands/*` split
> for sync as a sub-coordination); if `ultracode` has spare capacity, Agent 24 may fan out
> into 24a (MLS client + flatten/map) and 24b (writers + CLI + docs) along Spec 8's
> `src/commands/*` boundary, and Agent 14 (the CHAP spike) may pair with a reviewer — these
> are the two best fan-out candidates.

---

## 6. Per-subsystem file-by-file detail (reconciled & de-duplicated)

> Contradictions already resolved here: **ORM = Drizzle everywhere** (§3.2); **control
> plane = Mongo/Mongoose** (§3.3); **`resolve-connection.ts` is ONE keystone file owned by
> Agent 10** (Spec 2 and Spec 3 described the same file); **`skill-auth.ts` / `skill-scopes.ts`
> have ONE owner (Agent 11)** — every spec's "modify skill-auth/scopes" routes through it;
> **`provision.ts` (Neon mechanics, Agent 08) is distinct from `provision-service.ts`
> (orchestration, Agent 16)**; **`package.json` deps have ONE owner (Agent 09)**.

### 6.1 Control plane & tenant model (Specs 1 + 2, reconciled)

**`src/models/control/Tenant.ts`** (Agent 07) — Mongoose model (NOT Postgres). Hot-reload-safe
registration. Fields merge both specs:
`tenantId`(slug/uuid, unique), `ownerUserId`(Mongo `User._id` string — opaque cross-store
correlation, never JOINed), `slug`, `displayName`, `status`
(`pending|approved|provisioning|active|suspended|teardown|rejected|provision_failed`),
`license{number,state,mlsId,verifiedAt,verifiedBy}`,
`neon{projectId,branchId,databaseName,roleName,endpointId,region,provisionedAt}`,
`connStringEncrypted`(AES-256-GCM, **pooled** `-pooler` URI; never returned to a client),
`directConnStringEncrypted`(DDL only),
`secrets{anthropicKeyEnc,anthropicLast4}`,
`metering{rowCount,photoCount,lastSyncAt}`,
`tokenHashes[]`(sha256 hex, indexed — O(1) resolve) + `tenant_tokens[]`
({tokenHash,last4,name,scopes,createdAt,lastUsedAt,revokedAt}),
audit (`appliedAt/approvedAt/rejectedAt/rejectionReason/provisionedAt/lastProvisionError`).
Instance `decryptConnString()`. Indexes: `{tenantId:1}` unique, `{tokenHashes:1}`,
`{ownerUserId:1}` unique, `{status:1}`.

**`src/lib/tenant/resolve-tenant.ts`** (Agent 07) — `resolveTenantByTokenHash(hash)` →
active tenant in one lookup (excludes revoked/suspended), `resolveTenantById(id)`. Re-exports `ITenant`.

**`src/lib/tenant/provisioning-gate.ts`** (Agent 12) — port of `partner-moderation.ts`:
`getTenantAutoApprove()`(default **OFF**), `setTenantAutoApprove`, `approveTenant(id,by)`
(flips status, mints **one** token via `generateApiToken`, stamps license audit, calls
`provisionApprovedTenant`, best-effort email), `rejectTenant(id,reason)`. Plaintext token
returned **once**, never logged.

**Routes** (Agent 22): `signup` (NextAuth session → links `ownerUserId`, 409 on duplicate
owner, honors toggle), `admin/.../review` (`isAdmin`-gated approve/reject), `cron/auto-approve-tenants`
(`CRON_SECRET`-gated, **only when toggle ON** — license is the real gate).

**Gotchas:** status is a **security boundary** checked on every request (`tenant_not_active`→403),
not just a directory filter; token plaintext shown once; `tokenHashes` denormalization MUST
stay in sync with `tenant_tokens` + legacy `User.agentProfile…apiTokens` on every mint/revoke;
control-store binding must be pooled/cached (it's hit on every request).

### 6.2 Tenant→connection resolver + Neon provisioning (Spec 2 keystone, reconciled)

**`src/lib/neon/client.ts`** (Agent 08) — `neonApi<T>` (Bearer `NEON_API_KEY`, throws
`NeonApiError` with redacted body) + typed `createProject`/`createDatabase`/`createRole`/
`getConnectionUri`/`deleteProject`/`deleteDatabase`.

**`src/lib/neon/provision.ts`** (Agent 08) — `provisionTenantDatabase`/`teardownTenantDatabase`/
`rotateTenantConnString`. **Polls project to `active`** before returning. Bootstrap DDL over
**direct** conn: `CREATE EXTENSION postgis`, `pg_trgm`, `_crt_meta`. Partial-failure → best-effort
`deleteProject` + `status:"failed"`. Pooled URI for runtime, direct URI for DDL only.

**`src/lib/tenant/resolve-connection.ts`** (Agent 10 — THE KEYSTONE) — `resolveAdapter(tenantId)`/
`resolveAdapterForRequest(auth)` returning a pooled, LRU-cached `DbAdapter`; lower-level
`getTenantSql`/`getTenantSqlForTokenHash`/`evictTenantSql`/`__resetTenantCache` + the stable
`TenantSql` handle (raw `neon()` + `Pool`) for raw-SQL consumers. LRU `max~50–200`,
TTL `5–10min`, `dispose`→`close()`/`pool.end()`. `DEFAULT_TENANT_ID` Mongo fallback for dogfood.
`TenantUnavailable`→503.

**Gotchas:** pooled (`-pooler`/pgBouncer) endpoint + HTTP `neon()` for reads, WS `Pool` only
for tx; DDL/`CREATE EXTENSION` MUST use the **direct** (non-pooled) conn (pgBouncer can't run
session DDL); LRU `dispose` MUST `pool.end()` or pools leak; conn string encrypted before it
touches the control store, decrypted only inside the resolver, never logged; confirm PostGIS
enabled on the Neon plan (spike §7).

### 6.3 DB-agnostic adapter + Drizzle schema (Spec 3, canonical ORM)

**`src/lib/db/adapter.ts`** (Agent 01) — `DbAdapter` (`dialect`, `listings:ListingRepo`,
`contacts:ContactRepo`, `raw`, `close()`), `ListingFilter`/`NumRange`/`StrRange`/`FindOpts`,
`ListingDTO`/`ContactDTO`. **`OdataQuery` is imported from `src/lib/skill-api/odata/parse.ts`
(Agent 05 owns it)** — the adapter's `find(resource, OdataQuery)`/`get(resource,id)` surface
consumes that type; do not redefine. Also exposes a `query<T>(sql, params)` raw runner (wraps
Drizzle `sql`) for the CHAP repo (Spec 5).

**`src/lib/db/schema/{listings,contacts,index}.ts`** (Agent 09) — Drizzle `pgTable`s; column
naming consumed from `data-dictionary.ts` (Agent 03). `properties`/`contacts` with `geom`
(PostGIS), `extras` JSONB, `raw` JSONB, dual bed/bath columns, GIN/GiST indexes.

**`src/lib/db/postgres-adapter.ts`** (Agent 09) — `createPostgresAdapter(conn)` via
`drizzle(neon(conn), {schema})`; bbox→`ST_MakeEnvelope`/`ST_Contains`/`ST_DWithin`,
`hasPool`/`extras`→JSONB predicates; `close()` is a no-op for neon-http.

**`src/lib/db/mongo-adapter.ts`** (Agent 02) — wraps Mongoose; reproduces exact current
queries (`.collection` bypass, `$or` bed/bath, `userId` scoping, `Mixed` native reads).

**`src/lib/db/to-dto.ts`** (Agent 01) — shared `toListingDTO`/`toContactDTO` (the **only**
place fields are collapsed; routes touch DTOs only or dialects drift).

**Per-tenant DDL (§6.3, owned by Agent 04's `0001_init.sql` + Agent 09's drizzle migrations —
reconciled to be identical via the §3.6 reconciliation test):** `property` (RESO subset +
`geom geometry(Point,4326)` + `extras jsonb` + `raw jsonb`), `contact`, `member`, `office`,
`media`, `custom_field_registry`, `schema_migrations`. PostGIS GiST on `geom`, GIN(`jsonb_path_ops`)
on every `extras`, ported compound indexes. Applied **at provision time**, not boot.

### 6.4 RESO schema + custom fields (Spec 4)

**`src/lib/reso/data-dictionary.ts`** (Agent 03) — versioned catalog
(`DATA_DICTIONARY_VERSION`, `RESOURCES`, `getResource`/`getField`), carrying all three casings
explicitly. Source of truth for column naming (Agents 04, 09, 24 consume it).

**`src/lib/reso/ddl.ts`** (Agent 04) — `buildResourceDDL`/`buildFullSchemaDDL`/`pgColumnClause`;
emits the four resource tables + registry + migration ledger, PostGIS preamble, GIN/GiST.

**`src/lib/tenant/custom-fields.ts`** (Agent 17) — registry CRUD over an **injected `TenantDb`**;
`validateCustomFieldName` (`^[a-z][a-zA-Z0-9_]{0,62}$`), reject core-field shadowing, enum-values
required for enum.

**`src/lib/reso/extras.ts`** (Agent 17) — `validateExtras` (drop unregistered, coerce by type),
`extrasFilterClause` (parameterized, no value interpolation).

**Gotchas:** custom field never shadows a core RESO column; `extras` coercion must precede
`(extras->>'x')::numeric` casts; `list_price` doubles as rent for type `B` (no phantom `rent`
column); Mongo→RESO promotion is a deliberate review (lossy by design — unpromoted/unregistered
fields drop to `extras` or vanish).

### 6.5 CHAP on PostGIS (Spec 5 — the #1 spike)

Split cleanly: **DB-free parse/intent/narrate layer ports verbatim**; **Mongo-bound data layer
is rewritten behind `ListingRepo`**. `listing-repo.ts` (Agent 14) is the port published day-one
of Phase 2; `postgres-listing-repo.ts` (Agent 14), `postgres-map-queries.ts` (Agent 19),
`entity-search.ts` (Agent 15), `map-data.ts` (Agent 19), `preview.ts`+`nearby-pois.ts`+`poi-repo.ts`
(Agent 18) consume it. `listing-query.ts` keeps types + `normalizePropertyType` (Agent 14 sole
editor); `query-parser.ts`/`parse.ts` get `resolveEntity` injected (Agent 15).

**`areaStats`** = single-CTE `percentile_cont`/`percentile_disc` + `COUNT FILTER` replacing the
Mongo `$facet`. **Amenities** read typed column **then** `extras` fallback. **Street resolve**
collapses the two-step `search_index` hack into one `pg_trgm`/`tsvector` query (preserve the
full-phrase post-filter). **Clusters** = `ST_SnapToGrid` / `round(ST_X/grid)*grid`.

**Highest-correctness risk:** amenity field-name drift (`poolYn`/`poolYN`/`pool`) MUST be
normalized to one canonical `pool_yn` **at sync time** (Agent 24) or area stats silently
under-report (the Beverly Hills 0%-vs-73% bug). Median: use `percentile_disc(0.5)` where exact
regression parity is required.

### 6.6 REST + OData surface + scopes (Spec 6)

`parse.ts`/`response.ts`/`errors.ts` (Agent 05); `handler.ts`/`field-maps.ts` (Agent 13);
scope/auth edits (Agent 11). **AND-only flat filter grammar** (no `or`/parentheses) keeps parsing
total and injection-safe and frees the SQL adapter from an expression tree. Wrapper order:
auth→scope→rate-limit→**tenant adapter injection (keystone)**→OData-parse. `@odata.count` opt-in.
**MCP back-compat:** dual `value`+`items` during the deprecation window (recorded in `tech-debt.md`).
Routes: Agent 20 (GET collections) and Agent 21 (single/POST/contacts/me + saved-search) — disjoint.

### 6.7 MCP server (Spec 7)

Seeding/discovery tools + `save_search` (thin `/api/skill/*` wrappers), `build-guide.ts`
(`guide://chatrealty/*` resources, live `data-dictionary.json` via threaded `config`),
`tiers.ts` (`agent` vs `research`), two-layer tier enforcement (`tools/list` filter **and**
`tools/call` reject). All Agent 25. `research:read` scope comes from Agent 11.

### 6.8 Customer-side sync (Spec 8)

`@chatrealty/sync` standalone package (Agent 24). RESO Web API default, Spark compat. Ports
`unified-fetch.py` (pagination/retry/count), `flatten.py` (camelize/YN-casing/land-lease/slug),
`seed.py` (batched upsert). Two writers (`direct-neon` via db-adapter / `ingest-endpoint`).
Watermark with overlap window, **never `--purge`**, secrets from env only, unmapped fields → `extras`.

### 6.9 Provisioning, free tier, metering & rate limiting (Spec 9)

KV limiter (Agent 06, integrated by Agent 11), provision service + route (Agent 16), metering
write path + middleware + rollup cron (Agent 23). Metering writes target the **control store**,
free-for-now (record only, never gate, never block — buffer + `waitUntil`, swallow errors).
Pooled URI encrypted for runtime; direct URI for the one-shot migration runner then discarded.
Limiter **fails open** with a loud warning on Redis outage.

---

## 7. Risks & spikes-first

> Two items gate the program. **Do them before committing the dependent agents.**

### Spike #1 (highest priority) — CHAP-on-PostGIS port

The CHAP chat+map engine is the moat (architecture §6) and the largest re-platforming risk
(architecture §10.3, §11.2). Spike **Agent 14's `areaStats` + amenity + street-resolve paths**
on a real Neon PostGIS DB seeded with representative data **before** Agents 15/18/19 build on the
interface. Specifically prove:

- **Amenity correctness** — the `poolYn`/`poolYN`/`pool` OR-soup MUST collapse to one canonical
  typed column **at sync time** (Agent 24), with an `extras` fallback in `COUNT FILTER`. If sync
  doesn't normalize, area stats silently under-report (the documented Beverly Hills 0%-vs-73%
  defect). This is the single highest-correctness risk in the whole plan.
- **Median parity** — `percentile_cont` interpolates; the Mongo `$sortArray` floor-index does not.
  Use `percentile_disc(0.5)` where regression tests demand exact parity (±1 cell otherwise).
- **PostGIS availability on the chosen Neon region/plan** — confirm `CREATE EXTENSION postgis`
  succeeds (some extensions are gated); if not, geo degrades to lon/lat `BETWEEN` box queries.
- **Street resolve** — confirm a `pg_trgm` GIN index on `unparsed_address` replaces the 68s
  Mongo `/i` COLLSCAN + `search_index` two-step, while preserving the full-street-phrase post-filter.

Resolves architecture §10.3 ("how much of `chat-search/` is reused vs rewritten"). Until this
spike lands green, treat Agents 15/18/19 as **interface-only** work.

### Spike #2 — Neon serverless connection-pooling load test

The keystone's failure mode is **connection exhaustion** (architecture §2 gotcha): Vercel
functions × N tenants can blow Postgres connection caps. **Before opening free signups**, load-test:

- Pooled (`-pooler`/pgBouncer) endpoint + HTTP `neon()` for one-shot reads; WS `Pool` reserved
  for transactions only.
- The LRU adapter cache (`max`, TTL) actually `pool.end()`s on eviction (no leaked pools).
- **Cold-start** behavior — scale-to-zero means a tenant's first query pays wake latency; verify
  the lazy `getSql()` thunk keeps identity routes (`whoami`) from triggering a wake, and
  `TenantUnavailable`→503 surfaces cleanly on a failed wake.
- The control-store `findByHash`/token-resolve path is hit on **every** request — verify it's a
  single indexed lookup and the control binding is pooled/cached, or it becomes the very
  bottleneck the per-tenant cache was meant to avoid.

### Other tracked risks

| Risk | Mitigation | Owner |
|---|---|---|
| **24h auto-approve provisions a real DB on an unverified license** | Default `tenantAutoApprove` OFF; cron honors the toggle; **legal review** before paid-GA (architecture §7) | Agents 12, 22 |
| **MCP response-shape break** (`items`→`value`) | `ok()` emits both during a dated deprecation window; note in `tech-debt.md` | Agents 05, 25 |
| **Token-store split during cutover** (legacy `User…apiTokens` ↔ `tenant_tokens`) | `skill-auth` checks both until legacy retired; mint/revoke updates both | Agent 11 |
| **Rate-limiter fail-open during an abuse spike** | Fail open but log loudly; explicit metered in-memory fallback | Agent 06 |
| **Metering blocking a request** | Buffer + `waitUntil`, swallow all errors, never gate | Agent 23 |
| **Partial Neon provisioning leaks paid resources** | try/catch best-effort `deleteProject` + `status:"failed"` | Agent 08 |
| **Custom-field shadows core RESO column / SQL injection via `extras`** | `registerCustomField` rejects shadowing + bad identifiers; `extrasFilterClause` parameterized | Agent 17 |
| **DTO drift between dialects** | Routes touch DTOs only; shared contract suite runs against both adapters | Agents 01, 02, 09 |
| **`--purge` data loss** (Apr 6 2026 incident) | Sync **never deletes**; status transitions move listings out of Active | Agent 24 |
| **Don't migrate legacy `jpsrealtor.com`** | Mongo adapter is legacy-only; PG adapter is greenfield/tenant-zero | Agents 02, 09 |

---

## 8. Addendum (2026-06-24): Neighborhoods, Listing Attribution, LLM-first docs

Two requirements added after the core plan; both in scope. Total is now **~31 agent-tasks** (25 core + 6 neighborhoods). **Listing attribution is NOT a new agent fleet** — it is the binding invariant §3.8, folded into the existing owners of each listing surface.

### 8.1 Listing attribution — enforcement map (no new agents; binding acceptance)

Audited 2026-06-24 against the code. Each existing owner adds attribution to the file it already owns (no collisions):

| Surface | File (owner) | Today | Required change |
|---|---|---|---|
| Listing DTO | `src/lib/db/to-dto.ts` (Agent 01) | missing | `ListingDTO` + `toListingDTO` include `listAgentName`, `listOfficeName` (+ phones); contract test rejects a DTO without them |
| CHAP search projection | `src/lib/chat-search/preview.ts` (CHAP agent, Spec 5) | missing | add the two fields to `LISTING_PROJECTION` + `mapListing()` |
| CHAP narration | `src/lib/chat-search/narrate.ts` (CHAP agent, Spec 5) | missing | narrator prompt MUST cite "Listed by {office} — {agent}" when present |
| Skill search route | `src/app/api/skill/listings/search/route.ts` (API agent, Spec 6) | missing | add the two fields to projection + response |
| MCP board + tools | `packages/mcp-server/src/ui/listing-board.ts`, `tools/show_listing_board.ts`, `tools/search_listings.ts` (MCP agent, Spec 7) | missing | render an attribution line on every card; fix the `search_listings` docstring to match reality |
| Public / skill-detail / chat-detail | `ListingAttribution.tsx`, `/api/skill/listings/[listingKey]`, `ListingDetailCard.tsx` | ✅ | reference implementation — no change |

The sync mapper (Spec 8) MUST map `ListAgentFullName`/`ListOfficeName`/MLS-IDs/phones so attribution exists in every tenant DB from the first seed.

### 8.2 Neighborhoods subsystem (NEW — Agents 26–31)

A fast, **pre-aggregated** hierarchy (Region → County → City → Subdivision) + POIs — today on Mongo, ported to per-tenant Postgres+PostGIS. Part of the data plane, built by the customer-side sync, read by CHAP + skill routes + whatever neighborhood UI the customer scaffolds.

**Subdivision tier is OPTIONAL — city + county are the only guaranteed tiers.** Not every MLS association carries subdivision data. The pipeline MUST treat `subdivisionName` as **nullable** and **degrade gracefully**: always build `region → county → city` (every listing has city + county); build the `subdivision` tier and its `cmaStats` / `communityFacts` / subdivision routes **only when subdivision data exists** for that tenant. A tenant with no subdivision data simply has city/county neighborhoods — no error, no empty subdivision pages. CHAP and the skill routes fall back to city/county scope when a listing has no subdivision.

**Claude-assisted subdivision derivation (opt-in, area-dependent).** Where the MLS lacks subdivisions but the area is well-known, the seeding / field-discovery flow MAY let Claude **derive** a subdivision per listing (from address / geo / local knowledge) and write it into `subdivisionName`. Derived values MUST be stamped `source: "derived"` (vs `"mls"`) so they are distinguishable from authoritative MLS data, never presented as official, and easy to exclude where provenance matters. This is per-tenant opt-in, never automatic.

**Affects:** Agent 26 — `subdivisions.source` enum (`'mls' | 'derived'`), `listings.subdivision_name` nullable, and `cities`/`counties` are the required tiers (subdivision indexes tolerate emptiness). Agent 30 — build the subdivision tier **conditionally** (skip cleanly when absent) and consume Claude-derived values when the tenant has enabled derivation.

**Grounded current shape:** pre-built models replaced ~26s aggregations with ~200ms indexed reads. `subdivisions` (nightly-cron `cmaStats` + curated `communityFacts`), `cities`/`counties`/`regions`, `LocationIndex` (autocomplete/center), `PointOfInterest` (Google Places cache, bounding-box queried). Listings link by **string match** on `subdivisionName` + `city` (no FK). Linchpins: `src/models/{subdivisions,cities,counties,regions,PointOfInterest,community-facts,LocationIndex}.ts`, `src/lib/neighborhoods-data.ts`, `src/lib/chat-search/nearby-pois.ts`, `src/lib/cma/subdivision-profile.ts`, `src/app/api/{neighborhoods,skill/market}/*`, `src/app/neighborhoods/*`, `src/scripts/mls/backend/master_sync.py`.

**Prereq spike:** the nightly `cmaStats` is a schema-less Mongo `Mixed` blob — extract a sample and define strict tables **before** Agent 26 (this is a second spike alongside CHAP-on-PostGIS, §7).

- **Agent 26 — Neighborhoods schema (Postgres).** OWNS `src/lib/db/schema/neighborhoods.ts`, `src/lib/reso/migrations/0002_neighborhoods.sql`. Tables: `regions`, `counties`, `cities`, `subdivisions`, `location_index`, `points_of_interest`, `community_facts`, `cma_stats` (+ child `cma_stats_by_subtype`, `cma_top_comps` — denormalize the `Mixed` blob). PostGIS `geom` on `cities`/`subdivisions`/`points_of_interest` + GiST indexes; `(slug, city)` composite unique (slugs collide across cities). Depends: 09 (drizzle), 03 (naming), 26-spike.
- **Agent 27 — Neighborhoods repo/adapter methods.** OWNS `src/lib/db/neighborhoods-repo.ts` (PG + Mongo behind `DbAdapter`): directory tree, city/subdivision by slug, `cmaStats` read, **POI bounding-box → `ST_DWithin`/`ST_MakeEnvelope`**. Depends: 01, 02, 26, 09.
- **Agent 28 — Neighborhoods skill routes (tenant-scoped).** OWNS `src/app/api/skill/market/neighborhoods/[slug]/route.ts`, `.../subdivisions/[slug]/route.ts`, and a tenant-scoped `/api/skill/market/directory` (port of `/api/neighborhoods/directory`). Depends: keystone (10), handler wrapper (Phase 2), 27. Accept: byte-parity with the current Mongo route output for `DEFAULT_TENANT_ID`.
- **Agent 29 — POI + geo port.** OWNS `src/lib/chap/nearby-pois.ts` (PostGIS bounding-box port of `chat-search/nearby-pois.ts`) + geo-center/street-lookup helpers behind the adapter. Depends: 26, 27. Coordinates with the CHAP agents (Spec 5) that consume the POI bundle.
- **Agent 30 — Neighborhoods aggregation builders in `packages/chatrealty-sync`.** OWNS the `neighborhoods-builder` module: after listing seed/sync, recompute `cities`/`subdivisions` aggregates + `cmaStats` + refresh `location_index`; fetch/refresh POIs. The customer-side replacement for the Python `master_sync.py` aggregate step; `cmaStats` stays a daily job (per §0), now per-tenant. Depends: 26, sync-package agents (Spec 8).
- **Agent 31 — Neighborhoods MCP tools + LLM-first doc.** OWNS the `get_neighborhood_info` / `get_subdivision_cma` tool wrappers (point at the new routes) + `docs/chatrealty-api/neighborhoods.md` (LLM-first: hierarchy, tables, POI model, the slug-collision rule, examples). Depends: 28, MCP agents (Spec 7).

**Out of scope for v1 neighborhoods:** the curated `communityFacts` enrichment pipeline (seed as-is per tenant, automate later) and the public Next.js neighborhood *pages* (the customer builds their own UI; we ship the data + build-guide).

### 8.3 Lead capture: end-user signup → auto-Contact (NEW — Agent 32)

**Already proven in the legacy app — this is a PORT, not an invention.** Today `linkUserToAgent()` (`src/lib/signup-origin.ts`) runs on every end-user signup (`/api/auth/register`, `/api/leads/{buy,sell}-intake`, OAuth in `lib/auth.ts`, `/api/campaign/submit`) and creates-or-links a deduped `Contact` assigned to the agent (`Contact.userId`), linked to the end-user (`linkedUserId`), `source: "website"`, tagged `["Website Signup", domain]`, **non-blocking** (a CRM error never fails signup).

**Invariant (product):** any end-user who registers through a tenant's surface is automatically **upserted as a Contact in that tenant's CRM**, deduped by email/phone, linked to their end-user account, stamped source + tag — the entry point of the lead loop (the Contact then accrues favorites + saved searches).

**Per-tenant simplification:** legacy scopes a contact to an agent via `Contact.userId` with dedup `(userId, phone)`. In the product **the database IS the agent** (db-per-tenant), so contacts need no `userId` agent-scoping — dedup is a per-tenant unique on `phone` + a soft email match, mirroring `linkUserToAgent`'s lookup (`emails.address` / legacy `email` / `linkedUserId`). Port the legacy `source` enum, tags, structured `phones[]`/`emails[]` + legacy mirror so the CRM shape matches.

**Two integration paths (both auto-assign to the tenant):**
1. **Product-provided end-user identity** — the API offers end-user registration/auth per tenant (so favorites / saved-searches / auto-contact work out of the box); registration calls the upsert.
2. **BYO-auth** — agents using their own auth call `POST /api/skill/contacts/from-signup` (tenant token) with the new user's details; same upsert, same dedup.

**Agent 32 — Lead capture & end-user identity.**
- OWNS: `src/lib/db/schema/end-users.ts` (end-user account table in the tenant DB: email/name/phone, marketing consent, link to favorites/saved-searches), `src/lib/crm/upsert-contact-from-signup.ts` (the ported `linkUserToAgent` upsert, adapter-backed, deduped, non-blocking), `src/app/api/skill/contacts/from-signup/route.ts` (BYO-auth endpoint) + the product end-user registration route.
- Depends: keystone (10), Contact schema/adapter (Agents 01 / 09 / CRM schema), and the saved-search lead-loop work (§6 CHAP).
- Accept: an end-user registration (or a `from-signup` call) creates exactly **one** tenant Contact; a re-signup with the same email/phone **does not duplicate** (updates/links instead); `source` + tag + `linkedUserId` stamped; non-blocking (signup never fails on a contact error); favorites/saved-searches by that end-user resolve to the same Contact.
