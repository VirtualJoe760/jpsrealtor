---
title: "Spike — Subdivision cmaStats Strict Postgres Schema"
status: current
last_verified: 2026-06-25
related:
  - ./build_plan.md
  - ./architecture.md
  - ../../src/models/subdivisions.ts
---

# Spike 2 — Subdivision `cmaStats` → strict Postgres schema

> **What this is.** A read-only spike that enumerates every field actually used in
> the nightly subdivision `cmaStats` Mongo `Mixed` blob (`src/models/subdivisions.ts`,
> `cmaStats: { type: Schema.Types.Mixed }`) and the sibling `rentStats` blob, then
> proposes a **strict, denormalized Postgres schema** (3 CMA tables + 1 rent table)
> that the per-tenant Neon data plane can adopt. **No code was changed.** This gates
> the neighborhoods/subdivisions schema (build_plan §8.2, Agents 04/09/14/18).

## TL;DR

- The subdivision `cmaStats` blob is **one row of pre-computed market analytics per
  subdivision**, written nightly by the VPS Python cron (`build-listing-cma.py`),
  with two embedded denormalizable arrays (`bySubType`, `topComps`/`top*Comps`).
- It is **schema-less today on purpose** (`Mixed` so Mongoose `.lean()` reads don't
  drop unschema'd keys). The TS interface `ISubdivision.cmaStats` in
  `subdivisions.ts` is **aspirational/partial** — the live blob carries fields the
  interface omits, and *consumers read both an old-schema variant and a new-schema
  variant*. The strict schema below is the **superset** that covers every consumer.
- Proposed denormalization: **`cma_stats`** (1:1 with subdivision, headline +
  `active` + `closed` + `quality` + `profile` + `absorption` flattened to typed
  columns), **`cma_stats_by_subtype`** (1:N), **`cma_top_comps`** (1:N), and a
  separate **`subdivision_rent_stats`** (1:1, the `rentStats` going-rate blob).
- **Two real traps for the migrator** (see §5): (a) the **old-schema/new-schema
  split** — `totals`/`profile`/`topComps` (old) vs `active`/`closed`/`bySubType`/
  `top{Active,Closed}Comps` (new) coexist in production; the strict schema keeps a
  column for each; (b) the **listing-level `cmaStats`** on `unified-listing.ts` is a
  *completely different blob* (`subject`/`activeComps`/`closedComps`/`searchCriteria`/
  `__source` markers) and is **out of scope here** — do not conflate.

---

## 1. Source of truth — what writes and reads the blob

**Writer:** the VPS nightly cron (`build-listing-cma.py`, referenced in MEMORY
"Subdivision CMA System" — 1,424 subdivisions). It writes a flat, JSON-friendly
shape into `subdivisions.cmaStats` and `subdivisions.rentStats`. We never re-declare
the shape in Mongoose (`Mixed`) so the evolving Python output is read verbatim on
`.lean()`.

**Readers (every consumer that touches `cmaStats`/`rentStats`, with the fields each
actually reads):**

| File | Fields read |
|---|---|
| `src/models/subdivisions.ts` | TS interface `ISubdivision.cmaStats` (partial — see §2), `rentStats: any` |
| `src/app/api/cma/subdivision/[slug]/route.ts` | `cmaStats.bySubType[].subType`, `cmaStats.topComps[].propertySubType` (**old-schema** `topComps`) |
| `src/app/api/cma/subdivision/[slug]/narrative/route.ts` | `cmaStats.totals`, `.active`, `.closed`, `.bySubType`, `.profile`, `.quality`, `.narrative`, `.narrativeGeneratedAt` (**old-schema** `totals`/`profile`) |
| `src/app/api/skill/market/subdivisions/[slug]/route.ts` | `cmaStats.totals` (presence test), `cmaStats.active.count` (parent-vs-leaf detection) |
| `src/app/components/cma/subdivision/CmaMarketSnapshot.tsx` | `active.count`, `closed.{minClosePrice,maxClosePrice,avgClosePrice,medianClosePrice,avgPricePerSqft,medianPricePerSqft,avgDom,saleToListRatio,avgPriceReductionPct,sampleStartDate,sampleEndDate}` |
| `src/app/components/cma/subdivision/CmaCommunityProfile.tsx` | `profile.{sampleSize,dominantSubType,poolCommunity,spaCommunity,viewCommunity,gatedCommunity,seniorCommunity,typicalGarage,typicalBeds,typicalBaths,typicalSqftRange{p25,median,p75},typicalYearBuiltRange{p25,median,p75}}` (**old-schema** `profile`) |
| `src/app/components/cma/subdivision/CmaSubTypeBreakdown.tsx` | `bySubType[].{subType,count,avgPrice,avgPricePerSqft}` (note: shape differs from the TS interface's `bySubType` — see §5) |
| `src/app/components/cma/subdivision/CmaCompsTable.tsx`, `CmaSalesTimeline.tsx` | `topComps[].{address,slugAddress,closeDate,closePrice,originalListPrice,listPrice,salePpsf,saleToListRatio,livingArea,bedsTotal,bathsTotal,yearBuilt,garageSpaces,daysOnMarket,propertySubType}` (these are actually fed `salesHistory` from `unified_closed_listings`, but the column set defines what a top-comp row needs) |
| `src/app/components/cma/subdivision/CmaQualityBadge.tsx` | `quality.{confidence,notes}` |
| `src/lib/chat-search/nearby-pois.ts` | `cmaStats.active` (whole block, for POI hover stats) |
| `src/lib/listings/cashflow-query.ts` (`getGoingRate`) | `rentStats` (whole blob — passed through) |
| `src/app/api/skill/rentals/going-rate/route.ts` | `rentStats` (passed through) |

> **Old vs new schema, explicitly.** `narrative/route.ts` and `CmaCommunityProfile`
> read `cmaStats.totals` / `cmaStats.profile`; the TS interface and `CmaMarketSnapshot`
> read `cmaStats.active` / `cmaStats.closed`. `market/subdivisions/[slug]/route.ts`
> branches on exactly this (`cmaStats.totals !== undefined && !cmaStats.active?.count`
> ⇒ "parent subdivision with old empty totals"). The strict schema therefore keeps
> **both** the new `active_*`/`closed_*` columns **and** a small set of old-schema
> compatibility columns/JSONB so neither reader breaks during cutover.

---

## 2. The blob shape — field-by-field (new schema, from `ISubdivision.cmaStats`)

`subdivisions.ts` lines 132–190. Types are the Mongo/TS types; `?` = optional in the
interface (treat as nullable).

```
cmaStats {
  lastUpdated: Date
  sampleWindow: { months:int, startDate:Date, endDate:Date, listingCap:int }
  active: {
    count:int, medianPrice:num, avgPrice:num, minPrice:num, maxPrice:num,
    medianPricePerSqft:num, avgPricePerSqft:num, avgDom:num,
    medianSqft:num, avgSqft:num, avgBeds:num, avgBaths:num
  }
  closed: {
    count:int, medianClosePrice:num, avgClosePrice:num,
    medianPricePerSqft:num, avgPricePerSqft:num, avgDom:num,
    saleToListRatio:num, minClosePrice:num, maxClosePrice:num,
    avgPriceReductionPct:num, sampleStartDate:Date, sampleEndDate:Date
  }
  absorptionRate: num
  quality: { confidence:string("high"|"good"|"medium"|"low"|"insufficient"), notes:string[] }
  bySubType: [{
    subType:string, activeCount:int, closedCount:int, medianSalePrice:num,
    avgSalePpsf:num, avgDom:num, avgSaleToListRatio:num,
    sampleStartDate:Date, sampleEndDate:Date
  }]
  subdivisionProfile?: Record<string,unknown>   // free-form; keep as JSONB
  topActiveComps?: unknown[]                     // keep as JSONB array OR rows (see §3)
  topClosedComps?: unknown[]
  trends?: Record<string,unknown>                // free-form; keep as JSONB
  narrative?: string
  narrativeGeneratedAt?: Date
}
```

**Old-schema fields actually read by live consumers (not in the interface but
present in production docs):**

- `cmaStats.totals` — object; presence used as the "old-schema parent" sentinel.
- `cmaStats.profile` — the `CmaCommunityProfile` shape (`sampleSize`, `dominantSubType`,
  `poolCommunity`/`spaCommunity`/`viewCommunity`/`gatedCommunity`/`seniorCommunity`
  (bool|null), `typicalGarage`/`typicalBeds`/`typicalBaths` (num),
  `typicalSqftRange{p25,median,p75}`, `typicalYearBuiltRange{p25,median,p75}`).
- `cmaStats.topComps` — old-schema flat comp array (the `CmaCompsTable` `TopComp` shape).

**`bySubType` shape divergence:** the *interface* declares `bySubType[]` with
`activeCount/closedCount/medianSalePrice/avgSalePpsf/avgSaleToListRatio`, but
`CmaSubTypeBreakdown.tsx` consumes `{subType,count,avgPrice,avgPricePerSqft}` and the
aggregation builder in `listing-query.ts` (lines 666–695) emits exactly
`{subType,count,avgPrice,avgPricePerSqft}`. The strict `cma_stats_by_subtype` table
carries **both column sets** (all nullable) so either producer maps cleanly.

### `rentStats` (the sibling going-rate blob)

`rentStats` is `Mixed`/`any` and mirrors the `rent_rates` collection
(`src/models/rent-rate.ts`, `strict:false`). Per the model header comment it holds:
`goingRate`, `byBedroom`, `active`/`rented`/`furnished`/`unfurnished` blocks, and
`quality.confidence`. It is **passed through untouched** by `getGoingRate` and the
`rentals/going-rate` route (no consumer destructures it field-by-field today), so it
denormalizes to a thin row + one JSONB payload column (§3.4).

---

## 3. Proposed strict Postgres schema

Conventions per build_plan §3.4: `snake_case` columns, real `timestamptz`,
`numeric` for money/ratios, `integer` for counts. All non-key analytic columns are
**nullable** (the cron may emit partial blobs; "parent" subdivisions have empty
totals). One row per subdivision in `cma_stats`; child arrays normalized out.

These tables live in the **per-tenant Neon DB** (data plane), keyed to the
subdivision row (assumes Agent 14/18's `subdivisions` table exists with a PK
`subdivision_id` and a unique `slug`). FK `on delete cascade` so a subdivision
rebuild can wipe + reinsert.

### 3.1 `cma_stats` (1:1 with subdivision)

| column | type | null | notes |
|---|---|---|---|
| `subdivision_id` | `bigint` | no | **PK**, FK → `subdivisions(id)` on delete cascade |
| `last_updated` | `timestamptz` | yes | `cmaStats.lastUpdated` |
| `sample_window_months` | `integer` | yes | `sampleWindow.months` |
| `sample_window_start` | `timestamptz` | yes | `sampleWindow.startDate` |
| `sample_window_end` | `timestamptz` | yes | `sampleWindow.endDate` |
| `sample_window_listing_cap` | `integer` | yes | `sampleWindow.listingCap` |
| `active_count` | `integer` | yes | `active.count` — also the leaf-vs-parent sentinel |
| `active_median_price` | `numeric(14,2)` | yes | `active.medianPrice` |
| `active_avg_price` | `numeric(14,2)` | yes | `active.avgPrice` |
| `active_min_price` | `numeric(14,2)` | yes | `active.minPrice` |
| `active_max_price` | `numeric(14,2)` | yes | `active.maxPrice` |
| `active_median_ppsf` | `numeric(10,2)` | yes | `active.medianPricePerSqft` |
| `active_avg_ppsf` | `numeric(10,2)` | yes | `active.avgPricePerSqft` |
| `active_avg_dom` | `numeric(8,2)` | yes | `active.avgDom` |
| `active_median_sqft` | `numeric(10,2)` | yes | `active.medianSqft` |
| `active_avg_sqft` | `numeric(10,2)` | yes | `active.avgSqft` |
| `active_avg_beds` | `numeric(5,2)` | yes | `active.avgBeds` |
| `active_avg_baths` | `numeric(5,2)` | yes | `active.avgBaths` |
| `closed_count` | `integer` | yes | `closed.count` |
| `closed_median_close_price` | `numeric(14,2)` | yes | `closed.medianClosePrice` |
| `closed_avg_close_price` | `numeric(14,2)` | yes | `closed.avgClosePrice` |
| `closed_min_close_price` | `numeric(14,2)` | yes | `closed.minClosePrice` |
| `closed_max_close_price` | `numeric(14,2)` | yes | `closed.maxClosePrice` |
| `closed_median_ppsf` | `numeric(10,2)` | yes | `closed.medianPricePerSqft` |
| `closed_avg_ppsf` | `numeric(10,2)` | yes | `closed.avgPricePerSqft` |
| `closed_avg_dom` | `numeric(8,2)` | yes | `closed.avgDom` |
| `closed_sale_to_list_ratio` | `numeric(6,4)` | yes | `closed.saleToListRatio` (e.g. 0.9823) |
| `closed_avg_price_reduction_pct` | `numeric(6,4)` | yes | `closed.avgPriceReductionPct` |
| `closed_sample_start` | `timestamptz` | yes | `closed.sampleStartDate` |
| `closed_sample_end` | `timestamptz` | yes | `closed.sampleEndDate` |
| `absorption_rate` | `numeric(8,4)` | yes | `absorptionRate` |
| `quality_confidence` | `text` | yes | `quality.confidence` (enum-as-text; CHECK in §3.5) |
| `quality_notes` | `text[]` | yes | `quality.notes` |
| `narrative` | `text` | yes | `narrative` |
| `narrative_generated_at` | `timestamptz` | yes | `narrativeGeneratedAt` |
| `profile` | `jsonb` | yes | **old-schema** `cmaStats.profile` (kept whole — `CmaCommunityProfile` reads many keys; cheaper as JSONB than 18 columns) |
| `totals` | `jsonb` | yes | **old-schema** `cmaStats.totals` (sentinel; free-form) |
| `subdivision_profile` | `jsonb` | yes | `subdivisionProfile` (free-form) |
| `trends` | `jsonb` | yes | `trends` (free-form) |
| `extras` | `jsonb` | yes | catch-all for unmapped cron keys (mirrors the `extras` convention in build_plan §4) |

> **Why `profile`/`totals` stay JSONB, not columns.** They are the *old-schema*
> variant read by exactly two consumers (`CmaCommunityProfile`, narrative route).
> Flattening them to ~20 columns doubles the table width for a deprecated shape.
> JSONB keeps the readers working (`profile->>'dominantSubType'`,
> `profile->'typicalSqftRange'->>'median'`) without committing the new strict schema
> to legacy keys. When the old readers are retired, drop these two columns.

### 3.2 `cma_stats_by_subtype` (1:N)

Covers **both** the interface shape and the `CmaSubTypeBreakdown` shape (all nullable).

| column | type | null | notes |
|---|---|---|---|
| `id` | `bigint generated always as identity` | no | PK |
| `subdivision_id` | `bigint` | no | FK → `subdivisions(id)` on delete cascade |
| `sub_type` | `text` | no | `bySubType[].subType` (`"Unknown"` when null upstream) |
| `count` | `integer` | yes | `bySubType[].count` (builder/`CmaSubTypeBreakdown` shape) |
| `avg_price` | `numeric(14,2)` | yes | `bySubType[].avgPrice` |
| `avg_ppsf` | `numeric(10,2)` | yes | `bySubType[].avgPricePerSqft` |
| `active_count` | `integer` | yes | `bySubType[].activeCount` (interface shape) |
| `closed_count` | `integer` | yes | `bySubType[].closedCount` |
| `median_sale_price` | `numeric(14,2)` | yes | `bySubType[].medianSalePrice` |
| `avg_sale_ppsf` | `numeric(10,2)` | yes | `bySubType[].avgSalePpsf` |
| `avg_dom` | `numeric(8,2)` | yes | `bySubType[].avgDom` |
| `avg_sale_to_list_ratio` | `numeric(6,4)` | yes | `bySubType[].avgSaleToListRatio` |
| `sample_start` | `timestamptz` | yes | `bySubType[].sampleStartDate` |
| `sample_end` | `timestamptz` | yes | `bySubType[].sampleEndDate` |

Unique: `(subdivision_id, sub_type)` — one row per subtype per subdivision.

### 3.3 `cma_top_comps` (1:N)

Denormalizes `topActiveComps` / `topClosedComps` (interface) **and** the old-schema
`topComps` (route + `CmaCompsTable`), discriminated by `comp_kind`. Column set is the
`CmaCompsTable.TopComp` union plus what the comp JSON carries.

| column | type | null | notes |
|---|---|---|---|
| `id` | `bigint generated always as identity` | no | PK |
| `subdivision_id` | `bigint` | no | FK → `subdivisions(id)` on delete cascade |
| `comp_kind` | `text` | no | `'active' \| 'closed'` (from `topActiveComps`/`topClosedComps`; old `topComps` ⇒ `'closed'`) |
| `position` | `integer` | yes | preserve array order for stable render |
| `listing_key` | `text` | yes | comp `listingKey` when present |
| `address` | `text` | yes | `topComps[].address` |
| `slug_address` | `text` | yes | `topComps[].slugAddress` |
| `property_sub_type` | `text` | yes | `topComps[].propertySubType` (filtered on in route) |
| `close_date` | `timestamptz` | yes | `topComps[].closeDate` |
| `close_price` | `numeric(14,2)` | yes | `topComps[].closePrice` |
| `list_price` | `numeric(14,2)` | yes | `topComps[].listPrice` |
| `original_list_price` | `numeric(14,2)` | yes | `topComps[].originalListPrice` |
| `sale_ppsf` | `numeric(10,2)` | yes | `topComps[].salePpsf` |
| `sale_to_list_ratio` | `numeric(6,4)` | yes | `topComps[].saleToListRatio` |
| `living_area` | `numeric(10,2)` | yes | `topComps[].livingArea` |
| `beds_total` | `numeric(5,2)` | yes | `topComps[].bedsTotal` |
| `baths_total` | `numeric(5,2)` | yes | `topComps[].bathsTotal` |
| `year_built` | `integer` | yes | `topComps[].yearBuilt` |
| `garage_spaces` | `numeric(5,2)` | yes | `topComps[].garageSpaces` |
| `days_on_market` | `integer` | yes | `topComps[].daysOnMarket` |
| `extras` | `jsonb` | yes | any extra comp keys the cron emits |

Index: `(subdivision_id, comp_kind, position)`.

### 3.4 `subdivision_rent_stats` (1:1, the `rentStats` blob)

`rentStats` has no field-level consumer (passed through whole), so it is a thin row.

| column | type | null | notes |
|---|---|---|---|
| `subdivision_id` | `bigint` | no | PK, FK → `subdivisions(id)` on delete cascade |
| `going_rate` | `numeric(12,2)` | yes | `rentStats.goingRate` (promoted for cheap area sorting) |
| `quality_confidence` | `text` | yes | `rentStats.quality.confidence` |
| `last_updated` | `timestamptz` | yes | written by cron, if present |
| `payload` | `jsonb` | no | the full `rentStats` blob (`byBedroom`, `active`/`rented`/`furnished`/`unfurnished` blocks, etc.) |

> ZIP-level `rent_rates` (`src/models/rent-rate.ts`) is a *separate* collection and
> out of scope for this spike — but it mirrors this `payload`-centric shape, so a
> `rent_rates` table would look identical keyed by `postal_code` instead.

### 3.5 Indexes & constraints

- `cma_stats`: PK `subdivision_id`. Partial/btree index
  `cma_stats(active_count)` to support the leaf-vs-parent sentinel query in
  `market/subdivisions/[slug]/route.ts`. GIN on `profile`, `subdivision_profile`,
  `trends`, `extras` (`jsonb_path_ops`) per build_plan §3.4 if those become
  filterable; otherwise omit (they are read-by-key, not searched).
- `CHECK (quality_confidence IN ('high','good','medium','low','insufficient'))` —
  nullable, so `NULL` allowed.
- `cma_stats_by_subtype`: PK `id`, unique `(subdivision_id, sub_type)`, index
  `(subdivision_id)`.
- `cma_top_comps`: PK `id`, index `(subdivision_id, comp_kind, position)`.
- `subdivision_rent_stats`: PK `subdivision_id`.

---

## 4. DDL sketch

```sql
-- One row per subdivision. All analytic columns nullable (cron emits partial blobs;
-- parent subdivisions carry empty totals).
CREATE TABLE cma_stats (
  subdivision_id              bigint PRIMARY KEY
    REFERENCES subdivisions(id) ON DELETE CASCADE,
  last_updated                timestamptz,
  sample_window_months        integer,
  sample_window_start         timestamptz,
  sample_window_end           timestamptz,
  sample_window_listing_cap   integer,

  active_count                integer,
  active_median_price         numeric(14,2),
  active_avg_price            numeric(14,2),
  active_min_price            numeric(14,2),
  active_max_price            numeric(14,2),
  active_median_ppsf          numeric(10,2),
  active_avg_ppsf             numeric(10,2),
  active_avg_dom              numeric(8,2),
  active_median_sqft          numeric(10,2),
  active_avg_sqft             numeric(10,2),
  active_avg_beds             numeric(5,2),
  active_avg_baths            numeric(5,2),

  closed_count                integer,
  closed_median_close_price   numeric(14,2),
  closed_avg_close_price      numeric(14,2),
  closed_min_close_price      numeric(14,2),
  closed_max_close_price      numeric(14,2),
  closed_median_ppsf          numeric(10,2),
  closed_avg_ppsf             numeric(10,2),
  closed_avg_dom              numeric(8,2),
  closed_sale_to_list_ratio   numeric(6,4),
  closed_avg_price_reduction_pct numeric(6,4),
  closed_sample_start         timestamptz,
  closed_sample_end           timestamptz,

  absorption_rate             numeric(8,4),

  quality_confidence          text
    CHECK (quality_confidence IN ('high','good','medium','low','insufficient')),
  quality_notes               text[],

  narrative                   text,
  narrative_generated_at      timestamptz,

  -- old-schema compatibility (deprecated readers); drop when retired
  profile                     jsonb,
  totals                      jsonb,

  subdivision_profile         jsonb,
  trends                      jsonb,
  extras                      jsonb
);

CREATE INDEX cma_stats_active_count_idx ON cma_stats (active_count);

CREATE TABLE cma_stats_by_subtype (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subdivision_id      bigint NOT NULL REFERENCES subdivisions(id) ON DELETE CASCADE,
  sub_type            text   NOT NULL,
  count               integer,
  avg_price           numeric(14,2),
  avg_ppsf            numeric(10,2),
  active_count        integer,
  closed_count        integer,
  median_sale_price   numeric(14,2),
  avg_sale_ppsf       numeric(10,2),
  avg_dom             numeric(8,2),
  avg_sale_to_list_ratio numeric(6,4),
  sample_start        timestamptz,
  sample_end          timestamptz,
  UNIQUE (subdivision_id, sub_type)
);

CREATE TABLE cma_top_comps (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subdivision_id      bigint NOT NULL REFERENCES subdivisions(id) ON DELETE CASCADE,
  comp_kind           text   NOT NULL CHECK (comp_kind IN ('active','closed')),
  position            integer,
  listing_key         text,
  address             text,
  slug_address        text,
  property_sub_type   text,
  close_date          timestamptz,
  close_price         numeric(14,2),
  list_price          numeric(14,2),
  original_list_price numeric(14,2),
  sale_ppsf           numeric(10,2),
  sale_to_list_ratio  numeric(6,4),
  living_area         numeric(10,2),
  beds_total          numeric(5,2),
  baths_total         numeric(5,2),
  year_built          integer,
  garage_spaces       numeric(5,2),
  days_on_market      integer,
  extras              jsonb
);

CREATE INDEX cma_top_comps_lookup_idx
  ON cma_top_comps (subdivision_id, comp_kind, position);

CREATE TABLE subdivision_rent_stats (
  subdivision_id      bigint PRIMARY KEY REFERENCES subdivisions(id) ON DELETE CASCADE,
  going_rate          numeric(12,2),
  quality_confidence  text,
  last_updated        timestamptz,
  payload             jsonb NOT NULL
);
```

---

## 5. Migration notes & traps (read before building)

1. **Old-schema / new-schema coexistence is real and load-bearing.** Production docs
   carry *either* `{active,closed,bySubType,top{Active,Closed}Comps}` (new) *or*
   `{totals,profile,topComps}` (old). `market/subdivisions/[slug]/route.ts` literally
   branches on `cmaStats.totals !== undefined && !cmaStats.active?.count`. Keep the
   `totals` + `profile` JSONB columns until the old readers
   (`CmaCommunityProfile`, `narrative/route.ts`) are ported.

2. **`bySubType` has two shapes.** The TS interface says
   `{activeCount,closedCount,medianSalePrice,avgSalePpsf,…}`; the aggregation builder
   (`listing-query.ts` 666–695) and `CmaSubTypeBreakdown.tsx` say
   `{count,avgPrice,avgPricePerSqft}`. `cma_stats_by_subtype` carries both column sets
   (all nullable). Map whichever the cron actually emits per subdivision.

3. **`topComps` vs `topActiveComps`/`topClosedComps`.** The interface declares
   `topActiveComps`/`topClosedComps`; the live route + table read a flat `topComps`.
   `cma_top_comps.comp_kind` reconciles all three (old flat `topComps` → `'closed'`).
   Note that today the subdivision detail route actually feeds the comps table from a
   live `unified_closed_listings` query (`salesHistory`), not from the blob — so the
   `cma_top_comps` rows may be sparse/empty in current data; size the migration to
   tolerate empty top-comp arrays.

4. **`numeric` precision for ratios.** `saleToListRatio` / `avgSaleToListRatio` /
   `avgPriceReductionPct` are fractions (e.g. `0.9823`, rendered `×100`). Use
   `numeric(6,4)`, **not** integer percents — the readers multiply by 100 themselves.

5. **Dates are real `timestamptz`, not strings.** Unlike the listing `onMarketDate`
   string-vs-Date trap (build_plan §6.x, Agent 02), the subdivision blob's date fields
   come from the Python cron as ISO/Date and have no string-typed equivalents in the
   readers — store as `timestamptz`.

6. **Out of scope — listing-level `cmaStats`.** `unified-listing.ts` *also* has a
   `cmaStats` field, but it is a **different blob**: `{subject, activeComps,
   closedComps, stats, searchCriteria, tier, inferences, limitations, __source,
   __generatedAt}` consumed by `adaptPrebuiltCmaStats` (`src/lib/cma/adapt-prebuilt-stats.ts`)
   and `chat-search/preview.ts`/`narrate.ts`. Do **not** fold it into these tables —
   it belongs to the per-listing CMA path and needs its own spike if/when migrated.

7. **Rebuild-friendly cascade.** The nightly cron overwrites the whole blob. The
   Postgres equivalent is a per-subdivision delete+reinsert of the child rows
   (`cma_stats_by_subtype`, `cma_top_comps`) and an upsert of `cma_stats` /
   `subdivision_rent_stats`. The `ON DELETE CASCADE` FKs make a "delete the
   subdivision, reinsert" path safe too.
