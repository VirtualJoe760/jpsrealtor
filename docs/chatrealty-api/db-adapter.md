---
title: DB-Agnostic Adapter — Interface, DTOs & Mappers
status: current
last_verified: 2026-06-25
related: [./build_plan.md, ./architecture.md]
---

# DB-Agnostic Adapter (`src/lib/db/`)

> **TL;DR.** A thin, dialect-independent `DbAdapter` interface plus the canonical
> camelCase DTOs and the single mapper module that collapses raw Mongo/Postgres
> rows into them. This is the Phase-0 contract every other subsystem codes
> against (the Mongo adapter, the Postgres adapter, the CHAP repo, the OData
> handler, the sync package). It is **interface + mappers only** — no driver, no
> global connection.

`status: current` — Agent 01's contract (`adapter.ts`, `to-dto.ts`), Agent 02's
Mongo adapter (`mongo-adapter.ts`), and Agent 09's Postgres adapter
(`postgres-adapter.ts` + Drizzle schema) are all landed with tests. The Postgres
adapter passes the shared contract suite **LIVE against Neon** (see below).

## Files

| File | Owner | Role | State |
|---|---|---|---|
| `src/lib/db/adapter.ts` | Agent 01 | Pure interfaces: `DbAdapter`, `ListingRepo`, `ContactRepo`, `ListingFilter`, `FindOpts`, `ListingDTO`, `ContactDTO`, range/bbox helpers | **landed** |
| `src/lib/db/to-dto.ts` | Agent 01 | `toListingDTO` / `toContactDTO` — the ONLY place fields are collapsed | **landed** |
| `src/lib/db/__tests__/to-dto.test.ts` | Agent 01 | Contract tests (fallbacks + attribution invariant) | **landed** |
| `src/lib/db/mongo-adapter.ts` | Agent 02 | Legacy/self-host Mongo implementation (`createMongoAdapter`) | **landed** |
| `src/lib/db/__tests__/mongo-adapter.test.ts` | Agent 02 | Query-reproduction + read-path contract tests (node:test) | **landed** |
| `src/lib/db/postgres-adapter.ts` | Agent 09 | Neon/Postgres implementation (`createPostgresAdapter`) via Drizzle neon-http | **landed** |
| `src/lib/db/schema/{listings,contacts,index}.ts` | Agent 09 | Drizzle table definitions mirroring `0001_init.sql` (property/member/office/media + contact + registry/migrations) | **landed** |
| `drizzle.config.ts` | Agent 09 | drizzle-kit config (schema barrel + `NEON_DIRECT_CONN_URI` for migrations) | **landed** |
| `src/lib/db/migrations/*` | Agent 09 | drizzle-kit-generated reference DDL (the canonical per-tenant migration is Agent 04's `0001_init.sql`) | **landed** |
| `src/lib/db/__tests__/postgres-adapter.test.ts` | Agent 09 | Shared contract suite, **LIVE** against Neon (skips cleanly without conn) | **landed** |

## Postgres adapter (`postgres-adapter.ts`, Agent 09)

`createPostgresAdapter(conn)` implements `DbAdapter` against a tenant's Neon
Postgres DB. It is the SQL twin of the Mongo adapter — the SAME
`ListingFilter`/`FindOpts` inputs, mapped to parameterized SQL instead of Mongo
query objects, and the SAME `to-dto.ts` mappers so DTOs are byte-identical
across dialects. Design:

- **Driver split (build_plan §6.2/§6.3).** Reads go over **Drizzle's neon-http
  driver** (`drizzle(neon(conn), { schema })`) — a one-shot HTTP fetch per query,
  no pool to leak. Dynamic, parameterized SQL is composed with Drizzle's `sql`
  tag + `sql.join` (every caller value is a bound parameter; identifiers come
  only from a fixed internal allow-list). A WebSocket **`Pool` is opened lazily**
  and used **only** for the raw `query(text, params)` escape hatch when it
  carries positional params or is a mutating statement; `close()` ends that pool
  if it was opened (the HTTP reader needs no close).
- **`ListingFilter` → SQL**, clause-for-clause with the Mongo builder: `status`
  defaults Active; `propertyType` wildcard-skip; price/yearBuilt ranges;
  **dual-column bed/bath OR**; `onMarketDate` as a real `timestamptz` range (no
  string trap on Postgres); `hasPool` reads the **typed `pool_yn` column OR the
  `extras` fallback** (build_plan §6.5 — avoids the amenity under-report);
  registered `extras` fields → parameterized `extras->>'k' = $n` equality; `bbox`
  → PostGIS `ST_Contains(ST_MakeEnvelope(…,4326), geom)` with a lat/lng-box
  fallback for null-geom rows.
- **Casing bridge.** Postgres returns snake_case; `to-dto.ts` reads camelCase, so
  every SELECT aliases columns (`list_agent_name AS "listAgentName"`). The `pool`
  signal is projected as `COALESCE(pool_yn, (extras->>'poolYN')::boolean, false)`
  so the DTO's `pool` matches the `hasPool` filter semantics.
- **Attribution (§3.8).** `list_agent_name` / `list_office_name` are always in the
  projection; the live contract test asserts their presence on every DTO.
- **Contacts.** No `ownerId`/`userId` scoping — on the Postgres path the database
  IS the tenant boundary. The `contact` table is defined in the Drizzle schema but
  is **not yet in `0001_init.sql`** (CRM-on-Postgres is a later cutover, Agent 21);
  the live test scopes its fixtures by an `extras.testMarker`.

The contract test runs **LIVE against Neon**: it loads `NEON_POOLED_CONN_URI`
from `.env.local`, **skips cleanly** when absent, seeds ~20 `property` rows under
a unique marker prefix, exercises find/get/count (city+price+beds, bbox, hasPool
incl. the extras-only fallback, a custom `extras` field), asserts DTO shape +
attribution, and **deletes every seeded row in a `finally`** (never logs a
secret). Run: `npx tsx --test src/lib/db/__tests__/postgres-adapter.test.ts`.

## Mongo adapter (`mongo-adapter.ts`, Agent 02)

`createMongoAdapter(conn, { ownerId?, collections? })` implements `DbAdapter` over
an existing native Mongo connection handle (a `mongoose.Connection` or raw
`mongodb.Db` — anything with `.collection(name)`). It reproduces today's exact
`/api/skill/*` query objects so the legacy single-tenant path is byte-identical
before and after the adapter seam. What it preserves:

- **Native `.collection` reads only** — never a Mongoose model — so the
  `onMarketDate` ISO-string range (`StrRange`) is compared lexically and not
  silently cast to a `Date` (the schema declares it `Date`; the DB stores a
  string). Mongoose query-casting would make that range never match.
- **Dual bed/bath `$or`** clauses (`bedroomsTotal||bedsTotal`,
  `bathroomsTotalInteger||bathsTotal`) accumulated into `$and`, in the same key
  order the search route builds.
- **`userId: ownerId` contact scoping** — the legacy single-tenant `auth.user._id`
  scope, stamped on every contact `find`/`get`.
- **DTO collapse via Agent 01's `toListingDTO`/`toContactDTO`** — the adapter never
  invents its own row mapping; `Mixed` fields (`cmaStats`/`cashflowStats`) pass
  through the native read untouched.
- **`query()` (raw SQL) throws `unsupported`** — that escape hatch is Postgres/CHAP
  only. **`close()` is a no-op** — the connection lifecycle is owned by the keystone
  resolver, not the adapter.

The pure query builders `buildListingMongoQuery(filter)` and
`buildContactMongoQuery(params)` are exported so the contract test asserts the
emitted filter equals the hand-built Mongo query object with **no live DB**.

## The two hard rules this contract enforces

1. **No global data-plane connection (build_plan §3.3).** `adapter.ts` exposes
   only the *interface*. A `DbAdapter` is always tenant-scoped and handed back by
   the keystone resolver (`resolveAdapter(tenantId)`). There is no module-level
   `db` and no way to declare one here.
2. **Attribution invariant (build_plan §3.8 — HARD/IDX-compliance).**
   `ListingDTO.listAgentName` and `ListingDTO.listOfficeName` are **non-optional**
   `string` fields. `toListingDTO` *always* populates them (empty string when the
   source row genuinely lacks the data — never `undefined`, never dropped). The
   contract test fails if either is missing on any mapped listing. This makes it
   structurally impossible for a downstream surface to serve a listing without
   attribution.

## Collapses performed in `to-dto.ts` (the only place)

Routes and adapters must touch DTOs, not raw rows — otherwise the Mongo and
Postgres dialects drift. `toListingDTO` reproduces today's inline mappers in
`src/app/api/skill/listings/search/route.ts` and matches them byte-for-byte:

| DTO field | Collapse |
|---|---|
| `beds` | `bedroomsTotal ?? bedsTotal` |
| `baths` | `bathroomsTotalInteger ?? bathsTotal` |
| `sqft` | `livingArea ?? buildingAreaTotal` |
| `pool` | `poolYN` ?? `poolYn` ?? `pool` ?? (`poolFeatures` present and not `"None"`) |
| `primaryPhotoUrl` | `primaryPhotoUrl` → `media[0].uriLarge/uri1024/uri800/uri640/MediaURL` (camel + Pascal variants) |
| `thumbUrl` | `/_next/image?url=<encoded raw>&w=640&q=75` (render-ready) |
| `currentPrice` | `currentPrice ?? currentPricePublic ?? listPrice` |
| `daysOnMarket` | MLS snapshot `?? floor((now − onMarketDate)/day)` |
| `listAgentName` | `listAgentName ?? listAgentMarketingName ?? listAgentViewName ?? ""` |
| `listOfficeName` | `listOfficeName ?? listOfficeViewName ?? ""` |

`toContactDTO` collapses `phones[]`/`emails[]` (primary-first) with the deprecated
scalar `phone`/`email` as the final fallback, and `firstName lastName ||
organization || "Unnamed contact"` for the display name.

## Gotchas

- **`OdataQuery` is Agent 05's** (`src/lib/skill-api/odata/parse.ts`). It does not
  exist at Phase-0 day-one, so `adapter.ts` declares the structural
  `OdataQueryLike` to stay compilable standalone; Agent 05's `OdataQuery` is
  assignable to it. Do **not** redefine `OdataQuery` here or widen it into an
  expression tree — the grammar is intentionally flat / AND-only.
- **`onMarketDate` is a lexical ISO string, not a Date** — `ListingFilter` carries
  it as a `StrRange` precisely because casting to a Date silently never matches
  the stored strings (the `.collection` bypass in the Mongo adapter).
- **No test runner is wired in the repo.** The test backfills typed
  `describe`/`it`/`expect` only when a real runner is absent, so it runs
  standalone via `npx tsx src/lib/db/__tests__/to-dto.test.ts` and unmodified
  under a future jest/vitest. It compiles under `tsc --strict`.
