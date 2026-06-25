---
title: "Spike 1 — CHAP → Postgres/PostGIS feasibility"
status: current
last_verified: 2026-06-25
related:
  - ./build_plan.md
  - ./architecture.md
  - ../listings/README.md
---

# Spike 1 — CHAP → Postgres/PostGIS feasibility

> **Scope.** This is the #1 gating risk for the ChatRealty-API program (build_plan §7,
> architecture §10.3). It maps every Mongo query / aggregation that powers CHAP listing
> search, map-bounds, and area stats to its Drizzle-`sql`/PostGIS equivalent, marks what is
> reusable as-is vs. must be rewritten, and flags the riskiest translations. **No application
> code is changed by this spike** — it is the design that Agent 14 (`listing-repo` +
> `postgres-listing-repo`), Agent 15 (entity search), Agent 18 (preview/POI), and Agent 19
> (map data) implement.

## Verdict (TL;DR)

**Feasible. No blocker found.** The CHAP engine cleanly splits into a **DB-free intent/parse/rank
layer that survives verbatim (~40% of the LOC, ~all of the hard-won logic)** and a **Mongo-bound
data layer that is a mechanical rewrite behind one `ListingRepo` interface (~60%)**. Every Mongo
construct used has a direct Postgres/PostGIS equivalent. The geo layer is *easier* in PostGIS, not
harder, because the map already queries a lat/lng bounding box (not `$geoWithin`), so the only geo
upgrade required is `ST_MakeEnvelope`/`ST_DWithin` — a strict improvement, not a risk.

**Survives as-is (port the file unchanged, or nearly):**
- `src/lib/chat-v2/query-parser.ts` — pure intent/entity classification; only DB touch is an
  injected `identifyEntityType` (Agent 15 swaps the resolver, keeps the parser).
- `src/lib/chat-v2/listing-query.ts::normalizePropertyType` — pure string→code mapper. **Keep verbatim.**
- `src/lib/search/multi-source-search.ts::dedupeAndRank` — pure ranking. **Port verbatim** (Agent 15).
- `src/lib/chat-search/narrate.ts` — prompt construction (not read; DB-free by design per build_plan §8.1).
- The `entityToScope`, `mapListing`, `pickLocalPhoto`, `boxFor`, `pickTop`, `describePOIBundle`,
  `stripCmaPreamble`, all the regex preambles — pure helpers, port verbatim.

**Must be rewritten (Mongo query objects / aggregation pipelines → SQL):**
- `buildListingQuery` → `findListings`/`countListings` SQL predicate builder.
- `computeAreaStats` (`$facet`) → one `areaStats` CTE (`percentile_*` + `COUNT(*) FILTER`).
- `preview.ts` intent dispatch's inline `UnifiedListing.findOne/find` calls → repo calls.
- `multiSourceSearch`'s `searchIndexHits` + street `$text` two-step → `tsvector`/`pg_trgm`.
- `nearby-pois.ts` lat/lng box → `ST_DWithin`; `resolveSnapshotMeta` regex → indexed equality / FTS.
- `map-clusters/route.ts` grid `$group` + city `$group` → `ST_SnapToGrid`/`round()` `GROUP BY`.

**Main risks (all mitigable, none blocking):**
1. **Amenity field-name drift** (`poolYn`/`poolYN`/`pool`) — the single highest-correctness risk.
   Must collapse to one canonical typed column **at sync time** (Agent 24), with an `extras`
   fallback in `COUNT FILTER`. This is the documented Beverly Hills 0%-vs-73% defect.
2. **Median parity** — `percentile_cont` interpolates; the Mongo `$sortArray` floor-index does not.
   Use `percentile_disc(0.5)` where regression parity is required.
3. **`onMarketDate` string-vs-Date trap** — solved structurally by a real `timestamptz` column at
   sync time; do **not** port the `$toDate` defensive coercion.
4. **Dual bed/bath OR-clauses** — sync should write one canonical numeric column; until then, an
   `OR`/`COALESCE` predicate reproduces the Mongo `$or` exactly.
5. **PostGIS availability** on the chosen Neon region/plan — confirm `CREATE EXTENSION postgis`
   succeeds; degrade to lon/lat `BETWEEN` box queries if gated (the map path already works that way).

---

## 1. The reuse boundary (what survives vs. what is rewritten)

CHAP is three layers. Only the bottom one touches Mongo.

| Layer | Files | DB-bound? | Disposition |
|---|---|---|---|
| **Intent + entity parse** | `chat-v2/query-parser.ts`, `chat/utils/entity-recognition.ts` | parse is pure; entity-recognition imports `LocationIndex`+`dbConnect` | **Parser survives verbatim**; entity-recognition's resolver is replaced (Agent 15) — see §5 |
| **Rank/merge** | `search/multi-source-search.ts` (`dedupeAndRank`) | pure | **Verbatim** (Agent 15) |
| **Data primitives** | `chat-v2/listing-query.ts`, `chat-search/preview.ts`, `chat-search/nearby-pois.ts`, `search/multi-source-search.ts` (the `*Hits` fns), `api/map-clusters/route.ts` | **yes — rewrite** | §2–§7 below |

`normalizePropertyType` lives in the rewritten file but is itself pure — **Agent 14 keeps it as the
sole editor and ports it unchanged**; the SQL builder calls it first to derive the `property_type`
letter + optional sub-type regex (which becomes an `ILIKE` on `property_sub_type`).

---

## 2. `buildListingQuery` → SQL predicate builder (Agent 14)

Source: `src/lib/chat-v2/listing-query.ts` lines 192–515. Every clause maps 1:1. Column names below
are the target snake_case (RESO data-dictionary, Agent 03); all values are **bind parameters**
(Drizzle `sql` placeholders) — never interpolated.

### 2.1 Base + scope

| Mongo (today) | Postgres (Drizzle `sql`) | Notes |
|---|---|---|
| `propertyType: "A".."D"` | `property_type = $type` | from `normalizePropertyType`. **Filter this first** (rental `B` reuses `list_price` as rent). |
| `propertySubType: { $nin: ["Co-Ownership","Timeshare"] }` | `property_sub_type <> ALL($excluded)` (or `NOT (property_sub_type = ANY(...))`) | keep the fractional-ownership exclusion |
| `propertySubType.$regex: /condo/i` | `property_sub_type ILIKE '%condo%'` | only when the parser asked for a sub-type narrow; safe (scope already narrows the set) |
| `[priceField]: { $exists, $ne:null, $gt:0 }` | `list_price IS NOT NULL AND list_price > 0` | `closePrice`→`close_price` for the closed dataset |
| `standardStatus: "Active"` (active only) | `standard_status = 'Active'` | closed dataset omits this |
| `closeDate >= since` (closed window) | `close_date >= $since` | real `timestamptz` |
| **scope: county / city / subdivision** — `nameVariants()` `$in` over space↔hyphen drift | `county_or_parish = ANY($variants)` / `city = ANY($variants)` / `subdivision_name = ANY($variants)` | **port `nameVariants` verbatim** and bind the array. **Use `= ANY()`, never `ILIKE`** on scope fields (build_plan §6.5 / Agent 14 acceptance). |
| `subdivisionGroup` `$in` | `subdivision_name = ANY($names)` | |
| `zip` `postalCode = z` | `postal_code = $zip` | |

The Mongo code's whole reason for `nameVariants` + a forbidden `/i` regex (lines 235–250) is that a
case-insensitive anchored regex forces a COLLSCAN on 76k docs. **In Postgres this concern evaporates:**
a plain `= ANY()` over a b-tree (or a `citext` column / functional `lower()` index) is indexed and
case-handling is a column-type decision, not a query hazard. Keep `nameVariants` only to absorb
space↔hyphen drift; case-insensitivity should be handled by column collation/`citext` at the schema
level (Agent 09).

### 2.2 Street fast-path (lines 275–334) — the 68s COLLSCAN killer

Today: a two-step hack — query the `search_index` `$text` collection to resolve the street phrase to
a set of `listingKey`s, then `listingKey: { $in: keys }`, then a JS post-filter keeping only labels
that contain the full street phrase (because `$text` tokenizes "desi drive" and matches "Hardesty
Drive"). Fallback is a case-**sensitive** Title-cased `\bphrase\b` regex.

**Postgres collapses this into one query** (build_plan §6.5):
```sql
-- GIN pg_trgm index on unparsed_address
WHERE unparsed_address ILIKE '%' || $street || '%'   -- the full phrase, not tokens
```
Because `pg_trgm` ILIKE matches the **contiguous phrase**, the tokenization false-positive that forced
the JS post-filter **disappears** — but **keep the full-street-phrase post-filter as a belt-and-suspenders
guard** anyway (build_plan §7: "preserve the full-street-phrase post-filter"). A `tsvector` phrase
query (`websearch_to_tsquery` / `<->` FOLLOWED-BY) is the alternative; `pg_trgm` ILIKE is simpler and
matches the existing substring semantics exactly. **Risk: low.** This is one of the clearest wins of the port.

### 2.3 Filters (the `$and`/`$or` accumulator, lines 340–508)

| Mongo | Postgres | Risk |
|---|---|---|
| price `$gte/$lte` merged into `priceField` | `list_price >= $min AND list_price <= $max` | none |
| `bedsTotal: n` (exact) | `beds_total = $n` | none |
| **baths `$or`**: `bathsTotal` OR `bathroomsTotalDecimal` OR `bathroomsTotalInteger` = n | `(baths_total = $n OR bathrooms_total_decimal = $n OR bathrooms_total_integer = $n)` | **see §9 dual bed/bath** — prefer one canonical column at sync |
| sqft `livingArea $gte/$lte` | `living_area BETWEEN` | none |
| **lot `$or`**: `lotSizeSqft` OR `lotSizeArea` | `(lot_size_sqft … OR lot_size_area …)` | low |
| year `yearBuilt $gte/$lte` | `year_built BETWEEN` | none |
| recency `onMarketDate >= since` | `on_market_date >= $since` | **see §8 date trap** — trivially correct on a real `timestamptz` column |
| **amenity `$or`** pool/spa/view (`poolYn`/`poolYN`/`pool`) | `(pool_yn IS TRUE OR (extras->>'pool')::bool IS TRUE)` | **see §10 — highest risk; fix at sync** |
| fireplace `$or` (`fireplacesTotal>=1` OR `fireplaceYN`) | `(fireplaces_total >= 1 OR fireplace_yn IS TRUE)` | low |
| gated `$or` (`gatedCommunity` OR `associationAmenities ~ /gated/i`) | `(gated_community IS TRUE OR association_amenities ILIKE '%gated%')` | low |
| senior `$or` (3 fields) | `(senior_community_yn IS TRUE OR age_restricted_55_plus IS TRUE …)` | low |
| garage `$or` (`garageSpaces` OR `parkingTotal` `$gte`) | `(garage_spaces >= $n OR parking_total >= $n)` | low |
| stories `$or` (`stories` OR `levels`) | `(stories = $n OR levels = $n)` | low |
| HOA `hasHOA=false` (`hoaYN:false` OR `$exists:false` OR `fee:0` OR fee `$exists:false`) | `(hoa_yn IS NOT TRUE OR association_fee IS NULL OR association_fee = 0)` | **`$exists:false` → `IS NULL`** (see §11) |
| HOA `hasHOA=true` (`hoaYN:true AND fee>0`, + min/max) | `(hoa_yn IS TRUE AND association_fee > 0 …)` | low |
| **directional geo** (`eastOf`/`westOf`/`northOf`/`southOf` → `getStreetCoordinate` → `longitude $gt/$lt`/`latitude $gt/$lt`) | `longitude > $lng` / `latitude > $lat` (or `ST_X(geom)`/`ST_Y(geom)`) | `getStreetCoordinate` stays a helper (boundary lookup); only the final lat/lng compare moves to SQL |

**`$exists` is the one non-obvious translation.** Mongo `$exists:false` means "field absent"; in a
typed Postgres column that is `IS NULL`. For `extras` JSONB keys it is `extras ? 'key'` (key-exists)
or `extras->>'key' IS NULL`. Get this right or the "no HOA" filter silently changes meaning.

---

## 3. `computeAreaStats` (`$facet`) → one `areaStats` CTE (Agent 14)

Source: lines 527–868. The Mongo `$facet` runs five sub-pipelines (headline, bySubType, hoa,
amenities, newListings) over the same `$match`. Postgres does this in **one pass** with conditional
aggregates + `percentile_*` window/ordered-set functions. This is the centerpiece of the spike.

### 3.1 Headline (count, avg/median price/sqft/$psf, min/max)

Mongo computes avg with `$avg`, then median by `$push`-ing every value into an array, `$sortArray`,
and taking the **floor-index element** (`$arrayElemAt[sorted, floor(size/2)]`). That is a **discrete**
median (an actual data point), not an interpolated one.

```sql
SELECT
  count(*)                                                   AS count,
  round(avg(list_price))                                    AS avg_price,
  min(list_price)                                           AS min_price,
  max(list_price)                                           AS max_price,
  round(avg(living_area))                                   AS avg_sqft,
  round(avg(list_price / NULLIF(living_area,0)))            AS avg_price_per_sqft,
  -- DISCRETE median to match the Mongo floor-index exactly:
  percentile_disc(0.5) WITHIN GROUP (ORDER BY list_price)              AS median_price,
  percentile_disc(0.5) WITHIN GROUP (ORDER BY living_area)
      FILTER (WHERE living_area > 0)                                   AS median_sqft,
  round(percentile_disc(0.5) WITHIN GROUP (ORDER BY list_price / NULLIF(living_area,0))
      FILTER (WHERE living_area > 0))                                  AS median_price_per_sqft
FROM property
WHERE <predicates from §2>;
```

**Median parity is a real subtlety (risk #2).** `percentile_disc(0.5)` picks the value at the
"first row whose cumulative distribution ≥ 0.5", which for even N differs from Mongo's
`floor(N/2)` index by at most one position (Mongo takes the **upper** of the two middles;
`percentile_disc` takes the **lower-or-equal**). For exact regression parity against the current
medians, **use `percentile_disc`, not `percentile_cont`** (cont interpolates and will never match a
floor-index median). If a future product decision prefers a "true" interpolated median, that is a
**deliberate behavior change**, documented — not a silent drift. The `$facet` `$divide` with a
`$cond` guard (`livingArea>0 ? price/area : null`) maps to `/ NULLIF(living_area,0)` (Postgres
returns NULL on divide-by-NULL, and `avg`/`percentile` skip NULLs — same effect as the Mongo `$cond`).

### 3.2 By-subtype breakdown → grouped subquery
```sql
SELECT coalesce(property_sub_type,'Unknown') AS sub_type,
       count(*) AS count,
       round(avg(list_price)) AS avg_price,
       round(avg(list_price / NULLIF(living_area,0))) AS avg_price_per_sqft
FROM property WHERE <predicates>
GROUP BY property_sub_type ORDER BY count DESC LIMIT 20;
```
Direct map of the `$group _id:"$propertySubType"` + `$ifNull` + sort + limit.

### 3.3 HOA → `FILTER`
```sql
SELECT count(*) FILTER (WHERE association_fee > 0)                       AS count,
       min(association_fee) FILTER (WHERE association_fee > 0)           AS min,
       max(association_fee) FILTER (WHERE association_fee > 0)           AS max,
       round(avg(association_fee) FILTER (WHERE association_fee > 0))    AS avg
FROM property WHERE <predicates>;
```
`null` when count is 0 (mirror the `r.hoa?.[0] || null` flattening in JS).

### 3.4 Amenity rates → `COUNT(*) FILTER` (the high-risk one — see §10)
```sql
count(*) FILTER (WHERE pool_yn IS TRUE OR (extras->>'pool')::bool IS TRUE)      AS pool_count,
count(*) FILTER (WHERE spa_yn  IS TRUE OR (extras->>'spa')::bool  IS TRUE)      AS spa_count,
count(*) FILTER (WHERE view_yn IS TRUE OR (extras->>'view')::bool IS TRUE)      AS view_count,
count(*) FILTER (WHERE fireplaces_total >= 1 OR fireplace_yn IS TRUE)           AS fireplace_count,
count(*) FILTER (WHERE gated_community IS TRUE)                                  AS gated_count,
count(*) FILTER (WHERE senior_community_yn IS TRUE OR age_restricted_55_plus IS TRUE) AS senior_count
```
The Mongo `$or`-of-three-casings (`poolYn`/`poolYN`/`pool`) **must not** be ported as three columns.
The canonical column is `pool_yn`, written by the sync after normalizing all three source casings;
the `extras->>'pool'` arm is the fallback for tenants whose feed carried only the bare name and the
sync routed it to `extras`. **The `::bool` cast requires `validateExtras` to have coerced the value
first** (build_plan §6.4 gotcha) or the cast throws on `"yes"`/`"Y"`.

The percentage conversion stays in JS exactly as today (`pct(n) = round(n/total*100)`).

### 3.5 New-listings (7-day) → `FILTER` with a real date
Mongo `$addFields daysSince` via `$subtract(new Date(), $toDate(dateRef))` then `$match {<=7,>=0}`.
Postgres (no `$toDate` needed):
```sql
count(*) FILTER (WHERE on_market_date >= now() - interval '7 days'
                   AND on_market_date <= now())  AS new_count
```

**All five facets collapse into a single `SELECT`** (headline + amenities + hoa + new-count are one
row; by-subtype is a second small query, or a `json_agg` lateral). The `AreaStats` shape (lines 89–115)
is reproduced byte-for-byte by the flattening JS, which **ports unchanged**.

---

## 4. `preview.ts` intent dispatch → repo calls (Agent 18, over Agent 14's repo)

`preview.ts` is mostly orchestration; the only Mongo it issues is inline `UnifiedListing.findOne/find`
and `Subdivision/Article.findOne`. Each becomes a repo method. The **regex-heavy address matching**
(the part that looks scary) is pure string logic that **ports verbatim** — only the final lookup changes.

| Intent / block | Mongo today | Postgres |
|---|---|---|
| `listing-detail` (lines 371–460) | `slugAddress: /^74300-/` + `unparsedAddress: /(?=.*quail)(?=.*lakes)/i` lookahead, sale-first then ANY | `slug_address LIKE '74300-%' AND unparsed_address ILIKE '%quail%' AND unparsed_address ILIKE '%lakes%'`, `ORDER BY (property_type='A') DESC LIMIT 1`. The multi-word lookahead → an AND of `ILIKE`s (one per street word) — **port the word-split logic verbatim**, swap the regex assembly for `ILIKE` predicates. |
| `aggregate`/`listing-search` (462–506) | `computeAreaStats` + `find().sort().limit(50)` | `areaStats()` + `findListings({...,limit:50,sort})` |
| `street-listings` (508–531) | `find().limit(50)` + `countDocuments` | `findListings` + `countListings` |
| `compare` (534–555) | 2× `computeAreaStats` | 2× `areaStats()` (parallel) |
| `trend` (557–626) | HTTP to `/api/analytics/appreciation` | **unchanged** — already an HTTP call, not Mongo |
| `insights` (628–661) | `Article.find({$text})` | `to_tsvector(title‖excerpt‖content) @@ websearch_to_tsquery($q)`, `ORDER BY ts_rank DESC LIMIT 5` |
| `cma` listing-level (664–766) | same slug+lookahead pattern, projects `cmaStats` Mixed blob | same `LIKE`+`ILIKE`; `cma_stats` is a JSONB column read straight through to `adaptPrebuiltCmaStats` |
| `cma` subdivision-level (768–801) | `Subdivision.findOne({$or:[{slug},{name}]})` | `SELECT … WHERE slug=$1 OR name=$2 LIMIT 1` |
| `cma` street-level / listingOptions (803–848) | `buildListingQuery` street path + `find().limit(8)` | `findListings` street scope, `limit:8` |
| `cma` search-index fallback (850–982) | `multiSourceSearch` + `find({listingKey:{$in}})` + JS re-rank | `multiSourceSearch` (PG-backed, §5) + `findListingsByKeys` + **the JS re-rank ports verbatim** |
| `resolveDescribeIntent` (193–303) | `multiSourceSearch` + per-type `findOne` | same, repo-backed |

The `cmaStats` `Mixed` blob (read by `adaptPrebuiltCmaStats`) becomes a **`jsonb` column** — read it
with `.lean()`-equivalent raw JSON; the adapter consumes the parsed object unchanged. **The
sale-first preference** (`propertyType:'A'` before ANY) becomes `ORDER BY (property_type='A') DESC`
or two sequential queries — semantically identical.

---

## 5. Entity search + parser decoupling (Agent 15)

### 5.1 What survives verbatim
- `chat-v2/query-parser.ts` is **already DB-free** except it calls `identifyEntityType` (imported
  from `chat/utils/entity-recognition.ts`). Inject `resolveEntity` instead of hard-importing →
  parser unchanged. Confirmed: the parser has **zero** `mongoose`/`@/models`/`dbConnect` imports.
- `multi-source-search.ts::dedupeAndRank` (lines 272–356) — **pure**; port verbatim (the exact-match
  → type-tier → source-pref → score ordering and the 2-article cap are the moat of autocomplete quality).
- `entity-recognition.ts`'s **abbreviation map** (`pdcc`→"palm desert country club", `pga`→"pga west"),
  `KNOWN_COUNTIES`, `KNOWN_REGIONS`, and the expansion logic are **pure data + string logic** — port verbatim.

### 5.2 What is rewritten
The DB-touching halves of `multiSourceSearch` and `identifyEntityType`:

| Mongo | Postgres |
|---|---|
| `searchIndexHits`: `search_index.$text` collection (denormalized nightly) | `to_tsvector` FTS over a `location_index`/listing-search table, OR a materialized `search_index` table with a `tsvector` GIN column + `ts_rank`. |
| `countyAndRegionHits` / `prefixHits`: `City/Subdivision/County/Region.find({name:/^q/i})` | `… WHERE name ILIKE $q || '%'` with a `pg_trgm` GIN (prefix + fuzzy in one index). The "$text can't prefix-match" gap that forced the separate regex layer **goes away** — `pg_trgm` does prefix and fuzzy natively, so the two layers can merge (but keeping them separate also works). |
| `identifyEntityType` → `LocationIndex.findOne` | `location_index` table lookup by `name`/`type` (indexed equality, optional `pg_trgm` fuzzy). |

The graceful-degradation-when-`search_index`-absent branch becomes "table empty" — same null-safe behavior.

---

## 6. Map data layer → PostGIS (Agent 19)

Source: `src/app/api/map-clusters/route.ts` (1357 lines). The route mixes three concerns; the SSE
envelope, static county/city/region **boundary merge** (from `@/data/*-boundaries`), and cache headers
**stay in the route unchanged**. Only the DB calls move to `postgres-map-queries.ts`.

### 6.1 Viewport listings (zoom 12+, lines 1176–1347)
Mongo: `find({ standardStatus:'Active', latitude:{$gte:south,$lte:north}, longitude:{$gte:west,$lte:east}, listPrice:{$gt:0}, …filters })`.
Postgres:
```sql
WHERE standard_status='Active'
  AND geom && ST_MakeEnvelope($west,$south,$east,$north, 4326)   -- index-assisted bbox
  AND list_price > 0
  -- + the same filter predicates as §2
```
`geom && ST_MakeEnvelope` uses the **GiST index** and is faster than the four-way lat/lng `BETWEEN`.
If PostGIS is unavailable (risk #5), the literal `latitude BETWEEN $south AND $north AND longitude
BETWEEN $west AND $east` reproduces today's behavior exactly (the map **already** queries this way).

### 6.2 Grid clustering (zoom <7 grid path, lines 898–957)
Mongo `$group` by `{ lat: round(lat/grid)*grid, lng: round(lng/grid)*grid }` with `$avg` centroid,
`$avg` price, `$min`/`$max`, `$addToSet` propertyTypes/mlsSources, `$push` sampleIds.
```sql
SELECT
  round(ST_Y(geom)/$grid)*$grid AS cell_lat,   -- grouping key only
  round(ST_X(geom)/$grid)*$grid AS cell_lng,
  count(*)                       AS count,
  avg(ST_Y(geom))                AS actual_lat,  -- true centroid, like $avg
  avg(ST_X(geom))                AS actual_lng,
  round(avg(list_price))         AS avg_price,
  min(list_price) AS min_price, max(list_price) AS max_price,
  array_agg(DISTINCT property_type) AS property_types,
  array_agg(DISTINCT mls_source)    AS mls_sources,
  (array_agg(listing_id))[1:10]     AS sample_listing_ids
FROM property WHERE geom && ST_MakeEnvelope(...) AND <filters>
GROUP BY cell_lat, cell_lng
ORDER BY count DESC LIMIT 1000;
```
`ST_SnapToGrid(geom, $grid)` is the idiomatic alternative for the grouping key. The "ACTUAL centroid
vs grid position" distinction the Mongo code is careful about (lines 931–948) maps exactly to
`avg(ST_Y)/avg(ST_X)` for placement while grouping by the snapped cell. **Match within rounding**
(Agent 19 acceptance).

### 6.3 City/county/region clustering (lines 353–896)
These are **mostly static-boundary merges already** (`REGION_BOUNDARIES`, `COUNTY_BOUNDARIES`,
`CITY_BOUNDARIES` from `@/data/*`) enriched with a `City/County/Region.find()` lookup, plus one live
`UnifiedListing.aggregate($group by $city)` for per-city stats (lines 781–798). The static merge and
centroid math **stay in the route**; the per-city `$group` becomes the same `GROUP BY city` SQL as §3.2.

### 6.4 Streaming
The `ReadableStream`/SSE batching, `text/event-stream` headers, and the `.cursor()` batch loop are
transport concerns — **unchanged**. Swap `UnifiedListing.find(...).cursor()` for a streamed PG query
(node-postgres cursor or a `LIMIT`-paged loop over the neon driver). Responses stay byte-compatible.

---

## 7. POI / nearby + snapshot meta → PostGIS (Agent 18 / Agent 29)

Source: `src/lib/chat-search/nearby-pois.ts`.

| Function | Mongo today | Postgres |
|---|---|---|
| `boxFor` + `PointOfInterest.find({latitude:{$gte..},longitude:{$gte..}, businessStatus:{$ne:'CLOSED_PERMANENTLY'}})` | lat/lng bounding box on `{latitude,longitude}` index | `ST_DWithin(geom, ST_MakePoint($lng,$lat)::geography, $radiusMeters)` — **true radius**, not a box. Strictly better than the `boxFor` approximation. `business_status <> 'CLOSED_PERMANENTLY'`. |
| `resolveCenter` (`LocationIndex.findOne({name:/^…$/i})` then `Subdivision`) | regex equality | `location_index` indexed equality (case via `citext`/`lower()`), `subdivisions` fallback |
| `resolveSnapshotMeta` (`Subdivision/City/LocationIndex.findOne` reading pre-computed `cmaStats`) | regex `^name$` + `.select(cmaStats…)` | indexed equality; `cma_stats` JSONB read straight through (mirrors build_plan §6.5 "reads pre-computed `cma_stats` JSONB") |
| `pickTop`, `describePOIBundle`, `escapeRegex`, `roundOrUndef` | pure | **verbatim** |

`boxFor`/`DEFAULT_RADIUS_MILES` can stay as the degrade path if PostGIS is gated; otherwise `ST_DWithin`
on a `geography` cast gives real distances. The `byCategory` grouping + `pickTop` rating×log(reviews)
ranking is pure JS — **unchanged**.

---

## 8. Risk: the `onMarketDate` string-vs-Date trap

**What it is.** `computeAreaStats` wraps the date in `$toDate(dateRef)` (line 817) before subtracting,
and the schema declares `onMarketDate: { type: Date }` — but the defensive `$toDate` exists because
across 8 MLS feeds some `onMarketDate`/`closeDate` values arrived as **strings**, not BSON dates, so a
naive `$subtract` would error or mis-sort. The model's index is on a `Date`, but the data isn't
uniformly typed.

**Why Postgres removes it.** The sync (Agent 24) writes `on_market_date timestamptz` with a single
parse/validation step. A typed column **cannot** hold a string, so the trap is structurally impossible
downstream. **Do NOT port the `$toDate` coercion** — that would be cargo-culting a Mongo-specific
workaround into SQL. The recency predicate is simply `on_market_date >= now() - interval '7 days'`.

**Action / acceptance:** the sync's date mapping must reject/repair unparseable dates at ingest
(write NULL + log, never a string). A row with NULL `on_market_date` is correctly excluded from
"new this week" (matches today's `$ne:null` guard). This is a **sync-side** invariant, flagged for Agent 24.

---

## 9. Risk: the dual bed/bath OR-clauses

**What it is.** Some MLSs populate `bathsTotal`, others `bathroomsTotalDecimal`, others
`bathroomsTotalInteger`; the `baths` filter ORs all three (lines 355–363) and `mapListing` falls back
across them (`bathsTotal ?? bathroomsTotalDecimal ?? bathroomsTotalInteger`). Same story for beds
(`bedsTotal ?? bedroomsTotal`) and lot size (`lotSizeSqft || lotSizeArea`).

**Two-tier translation:**
- **Correct end-state (preferred):** the sync writes **one canonical** `baths_total` /
  `beds_total` / `lot_size_sqft` (COALESCE-ing the sources at ingest, the same way `toListingDTO`
  collapses them — build_plan §6.3 "dual bed/bath columns kept" + Agent 01's collapse). Then the
  filter is a plain `baths_total = $n` and the OR-soup vanishes.
- **Faithful interim (until sync canonicalizes):** keep both columns and reproduce the Mongo `$or`:
  `(baths_total = $n OR bathrooms_total_decimal = $n OR bathrooms_total_integer = $n)`. For the
  fallback-read semantics, `COALESCE(baths_total, bathrooms_total_decimal, bathrooms_total_integer)`.

Build_plan §6.3 explicitly says "dual bed/bath columns **kept**" — so the schema carries both, and the
repo's filter must OR across them to preserve parity until canonicalization. **Risk: low**, but it's a
parity trap if someone drops it to a single column without the sync change landing first.

---

## 10. Risk #1 (highest correctness): amenity field-name drift — the Beverly Hills bug

**What it is.** The single most dangerous translation. Across 76k listings from 8 MLSs, the **same
boolean** appears under three names: `poolYn` (current schema), `poolYN` (legacy uppercase), `pool`
(bare). The code ORs all three in both the filter (lines 408–438) and the `COUNT FILTER` amenity
counts (lines 726–802), with a load-bearing comment: *"DO NOT collapse to just `poolYn`:
verify-chat-stats.ts proved Beverly Hills pool % was reported as 0% pre-Phase-2 and is actually 73%."*

**Why it's the top risk.** If the Postgres schema has only `pool_yn` and the sync maps just one source
casing, every listing whose feed used `poolYN` or `pool` reads as **false**, and area-stats silently
under-report — exactly the 0%-vs-73% defect, but now baked into a typed column where it's invisible.

**The fix (build_plan §7, §6.5 — this is a SYNC invariant, not a query one):**
1. **Sync (Agent 24) normalizes all source casings to ONE canonical typed column** `pool_yn`
   (`spa_yn`, `view_yn`, …) at ingest. This is where correctness is won or lost.
2. **The `COUNT FILTER` reads the typed column AND an `extras` fallback:**
   `count(*) FILTER (WHERE pool_yn IS TRUE OR (extras->>'pool')::bool IS TRUE)` — covers tenants
   whose unmapped bare-name field landed in `extras`.
3. **`validateExtras` must coerce `extras` values to real booleans** before the `::bool` cast, or a
   `"yes"`/`"Y"`/`1` value throws or mis-counts (build_plan §6.4 gotcha).
4. **Regression test (build_plan §3.6):** seed a Beverly-Hills-like fixture with mixed casings; assert
   the PG amenity % equals the Mongo % (the 73% figure), not 0%.

**Verdict:** the OR-soup is *correct* and must be **preserved in spirit** — but its right home is the
sync's canonicalization step (write once, clean), with the query keeping only a typed-column +
`extras` two-way OR as the safety net. Porting three columns into SQL would be the wrong fix.

---

## 11. Other translation notes (correctness-preserving)

- **`$exists`** → `IS NULL`/`IS NOT NULL` for typed columns; `extras ? 'key'` for JSONB keys. Appears
  in the HOA `hasHOA=false` clause (§2.3) and the map `associationYN=false` branch.
- **`$ifNull` / `??`** → `COALESCE`.
- **`$round`** → `round()`; mind that Mongo `$round` and SQL `round()` both round-half-away-from-zero
  for the integer case used here — parity holds.
- **`$addToSet`** → `array_agg(DISTINCT …)` (order not guaranteed in either; fine — both feed Sets).
- **`$slice: [arr, 10]`** → `(array_agg(…))[1:10]`.
- **`.lean()` Mixed reads** (`cmaStats`, `cashflowStats`) → `jsonb` columns returned as parsed JSON; no
  Mongoose hydration concern.
- **Photo fallback chain** (`pickLocalPhoto`: `primaryPhotoUrl` → `media[].Uri800/640/1024/MediaURL`)
  — `media` is per-listing nested data; either a `jsonb media` column (read + pick in JS, verbatim) or
  a joined `media` table with `ORDER BY "order" LIMIT 1`. The JS `pickLocalPhoto` ports verbatim over a
  `jsonb` column. `fetchPrimaryPhotos` Spark fallback is an external HTTP call — unchanged.
- **Case-insensitive scope matching** — handled at the **schema** layer (`citext` or a `lower()`
  functional index), removing the Mongo "no `/i` on indexed fields" hazard entirely.

---

## 12. PostGIS availability (risk #5) + what to actually run in the spike

Before Agents 15/18/19 build on the interface, run these against a **real Neon PostGIS DB seeded with
representative Coachella-Valley data** (build_plan §7):

1. `CREATE EXTENSION postgis;` succeeds on the chosen Neon region/plan. If gated → geo degrades to
   lon/lat `BETWEEN` box queries (the map already works this way; §6.1) and `ST_DWithin` POI radius
   degrades to `boxFor` (§7). **Confirm before committing the geo-dependent agents.**
2. **Amenity correctness:** seed mixed-casing pool data; assert `COUNT FILTER` (typed + `extras`)
   reproduces the 73% figure, not 0% (§10).
3. **Median parity:** assert `percentile_disc(0.5)` matches the current Mongo floor-index medians on a
   known fixture (±1 cell tolerance only where unavoidable; §3.1).
4. **Street resolve:** `pg_trgm` GIN on `unparsed_address` replaces the 68s COLLSCAN + `search_index`
   two-step, with the full-phrase post-filter preserved (§2.2).

Until this spike lands green, treat Agents 15/18/19 as **interface-only** work (build_plan §7).

---

## 13. Effort estimate / how much of chat-search survives

| Bucket | Files | Disposition | Approx. |
|---|---|---|---|
| Pure parse / intent / rank / helpers | `query-parser.ts`, `dedupeAndRank`, `normalizePropertyType`, abbreviation+KNOWN_* data, all regex preambles, `mapListing`/`pickLocalPhoto`/`boxFor`/`pickTop`/`describePOIBundle` | **survive verbatim** | ~40% of LOC, ~90% of the hard-won logic |
| Mongo query objects → SQL predicate builder | `buildListingQuery` | **rewrite** (mechanical, 1:1) | Agent 14 |
| `$facet` → CTE | `computeAreaStats` | **rewrite** (the centerpiece) | Agent 14 |
| Inline `findOne/find` in dispatch | `preview.ts` | **rewrite to repo calls** (string logic stays) | Agent 18 |
| `$text` / regex entity layers | `multiSourceSearch.*Hits`, `identifyEntityType` | **rewrite to tsvector/pg_trgm** | Agent 15 |
| Geo box/cluster aggregations | `nearby-pois.ts`, `map-clusters/route.ts` DB calls | **rewrite to PostGIS** (transport/SSE/static merge stay) | Agents 18/19 |

**Bottom line:** the moat (intent understanding, entity ranking, the careful address-matching and
sale-first logic, the area-stats *shape*) is all reusable. What gets rewritten is the
query-construction mechanics, and every construct has a direct, well-understood Postgres equivalent.
**The port is feasible and de-risked by this mapping; the only places that demand test-backed care are
the five flagged risks — and four of the five are won at sync time, not in the query.**
