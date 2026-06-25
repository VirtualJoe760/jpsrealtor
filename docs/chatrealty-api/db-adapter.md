---
title: DB-Agnostic Adapter — Interface, DTOs & Mappers
status: partial
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

`status: partial` — Agent 01's contract (`adapter.ts`, `to-dto.ts`) and its tests
are landed. The implementations behind the interface are owned by other agents
and are not yet present: `mongo-adapter.ts` (Agent 02), `postgres-adapter.ts` +
Drizzle schema (Agent 09). Update this doc to `current` once an adapter
implements the interface and passes the shared contract suite.

## Files

| File | Owner | Role | State |
|---|---|---|---|
| `src/lib/db/adapter.ts` | Agent 01 | Pure interfaces: `DbAdapter`, `ListingRepo`, `ContactRepo`, `ListingFilter`, `FindOpts`, `ListingDTO`, `ContactDTO`, range/bbox helpers | **landed** |
| `src/lib/db/to-dto.ts` | Agent 01 | `toListingDTO` / `toContactDTO` — the ONLY place fields are collapsed | **landed** |
| `src/lib/db/__tests__/to-dto.test.ts` | Agent 01 | Contract tests (fallbacks + attribution invariant) | **landed** |
| `src/lib/db/mongo-adapter.ts` | Agent 02 | Legacy/self-host Mongo implementation | to build |
| `src/lib/db/postgres-adapter.ts`, `schema/*` | Agent 09 | Neon/Postgres + Drizzle | to build |

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
