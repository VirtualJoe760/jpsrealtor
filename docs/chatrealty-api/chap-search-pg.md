---
title: "CHAP search on Postgres — area stats + glue"
status: current
last_verified: 2026-06-25
related:
  - ./spike-chap-postgis.md
  - ./build_plan.md
  - ./db-adapter.md
  - ./connection-resolver.md
---

# CHAP search on Postgres — area stats + glue

> **TL;DR.** The Postgres half of the CHAP listing-search/aggregate path
> (Agent 14, Spec 5 Task A). Two files under `src/lib/chap/`: `area-stats.ts`
> computes full-set `AreaStats` in ONE CTE; `search-pg.ts` is thin glue that
> fuses a page of listings (via the tenant `DbAdapter`) with those stats into the
> renderer's `PreviewResult` shape. This is the Postgres twin of the Mongo
> `computeAreaStats`/`preview.ts` path — the legacy Mongo chat-search is
> untouched and still serves the legacy single-tenant app.

## Files (linchpins)

| File | Role |
|---|---|
| `src/lib/chap/area-stats.ts` | `computeAreaStatsPg(runner, filter)` → `AreaStats`. One CTE: `percentile_disc(0.5)` medians + `COUNT(*) FILTER` amenity/sub-type counts + avg/min/max. |
| `src/lib/chap/search-pg.ts` | `searchListingsPg(adapter, filter, opts)` → preview-shaped result. Maps `ListingDTO`→`PreviewListing` (attribution carried) + `AreaStats`→`PreviewStats`. |
| `src/lib/chap/__tests__/area-stats.test.ts` | LIVE vs Neon: seeds 15 rows, asserts discrete median + per-type counts + the extras amenity fallback. |

## Why these choices (the spike's flagged risks)

- **Discrete median, never interpolated.** Medians use `percentile_disc(0.5)`,
  which picks an actual data point — matching the Mongo `$sortArray` floor-index.
  `percentile_cont` interpolates and would silently drift the medians
  (spike risk #2). The live test asserts the floor-index value (8th of 15).
- **Amenity field-name fallback (the Beverly Hills 0%-vs-73% defect, risk #1).**
  Every amenity `COUNT(*) FILTER` reads the canonical typed column OR an `extras`
  fallback: `pool_yn IS TRUE OR (extras->>'poolYN')::boolean IS TRUE …`. Amenities
  with NO typed column on the live `property` table (`association_fee`,
  `fireplaces_total`/`fireplace_yn`, `gated_community`, `age_restricted_55_plus`)
  are read from `extras` only. The test seeds one pool-in-extras-only row and
  asserts it is counted.
- **No string-date trap.** `on_market_date` is a real `timestamptz`; the
  recency facet is `on_market_date >= now() - interval '7 days'` (no `$toDate`).
- **Dual bed/bath OR** preserved (`bedrooms_total | beds_total`,
  `bathrooms_total_integer | bathrooms_total_decimal`) for parity until the sync
  canonicalizes (spike §9).

## Contract & invariants

- **Parameterized only (build_plan §6.5).** Every value is a bound `$N` param;
  only a fixed column allow-list and registry-validated `extras` keys are
  embedded as identifiers.
- **Tenant scoping (§3.3).** Neither file opens a connection. They receive a
  runner / `DbAdapter` already bound to one tenant's Neon DB by the keystone
  resolver (`src/lib/tenant/resolve-connection.ts`).
- **Attribution (§3.8).** `search-pg.ts` carries `listAgentName` +
  `listOfficeName` (+ phones) from the DTO onto every preview listing
  (`PreviewListingWithAttribution`) so no serving surface can drop attribution.
- **Output shape parity.** `AreaStats` is reproduced field-for-field from the
  Mongo `computeAreaStats` flattening (`src/lib/chat-v2/listing-query.ts`).

## Running the test

```
npx tsx --test src/lib/chap/__tests__/area-stats.test.ts
```

Loads `NEON_POOLED_CONN_URI`/`NEON_DIRECT_CONN_URI` from `.env.local`, seeds
marker-prefixed rows, asserts, and deletes them in a `finally`. The pool is
closed in an `after()` hook so the runner exits cleanly. The suite SKIPS (does
not fail) when `NEON_POOLED_CONN_URI` is absent.

## Not in scope here

`buildListingQuery` street fast-path, entity search (Agent 15), preview intent
dispatch (Agent 18), and map data (Agent 19) are separate owners. This package
owns only area stats + the aggregate/search glue.
