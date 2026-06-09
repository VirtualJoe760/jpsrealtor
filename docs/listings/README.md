---
title: Listings / MLS
status: current
last_verified: 2026-06-05
related: [../multi-tenant/README.md]
---

# Listings / MLS

## TL;DR

ChatRealty aggregates listings from **8 MLS associations** (CRMLS, CLAW, Southland
Regional, GPS, High Desert, Bridge, Conejo Simi Moorpark, ITECH) into a single
MongoDB collection `unified_listings` (~76k active listings, ~2.1M photos).
Ingestion runs on a **separate DigitalOcean VPS** via Python cron jobs — not on
Vercel. The Next.js app is read-only against this data; the VPS pipeline is the
write path. A separate `unified_closed_listings` collection holds 5 years of
closed sales powering the CMA system. Subdivisions and cities are pre-aggregated
into their own collections with pre-built `cmaStats` for sub-200ms reads.

## Files

| File | Role |
|---|---|
| `F:\web-clients\joseph-sardella\jpsrealtor\src\models\unified-listing.ts` | Active listings schema (100+ fields, 2dsphere index) |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\models\unified-closed-listing.ts` | Closed sales schema (mirrors active, 5-year TTL) |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\models\subdivisions.ts` | Pre-aggregated neighborhoods + `cmaStats` + `communityFacts` |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\models\cities.ts` | Pre-aggregated city stats |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\models\photos.ts` | Legacy `Photo` model — DEPRECATED, kept for backward compat |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\mls-listings\route.ts` | Public search API (filters, geobounds, swipe) |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\unified-listings\route.ts` | Universal lookup API (listingKey, slug, $near radius) |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\listing\[listingKey]\photos\route.ts` | Per-listing photo fetch |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\mls-listings\[slugAddress]\page.tsx` | Listing detail page |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\listings\fetch-primary-photos.ts` | Batched Spark Replication API photo fetch (50/batch, 1h cache) |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\scripts\mls\backend\unified\run-pipeline.py` | VPS pipeline orchestrator |
| `F:\web-clients\joseph-sardella\jpsrealtor\crontab.vps` | VPS cron schedule |

## UnifiedListing model

The `unified_listings` collection holds Active/Pending listings from all 8 MLSs.
Schema is **camelCase** (flattened from RESO `StandardFields`) with 100+ optional
fields covering core details, location, timestamps, media, features, agent/office,
schools, IDX compliance, and a Mixed-type `cmaStats` block written by the
listing-CMA cron.

| Property | Rule |
|---|---|
| Unique key | `listingKey` is globally unique across all MLSs |
| Source identification | `mlsSource` (human-readable, e.g. `GPS`, `CRMLS`) + `mlsId` (26-digit Spark MLS ID) |
| Geospatial | `coordinates: { type: "Point", coordinates: [lng, lat] }` with **2dsphere index** for `$near` queries |
| Hot indexes | `mlsSource+mlsId`, `city+standardStatus`, `subdivisionName+standardStatus`, plus 8 compound indexes for bed/bath search by city or subdivision |
| Strict mode | Mongoose strict mode WILL silently drop unschema'd fields — `cmaStats` is declared `Schema.Types.Mixed` for this reason |

### Property type codes (Spark/MLS letter codes)

| Code | Meaning | Notes |
|---|---|---|
| `A` | Residential (sale) | Default; SFRs, condos, townhomes |
| `B` | Residential Lease (rental) | **Reuses `listPrice` as the monthly rent — there is no separate rent field** |
| `C` | Residential Income (multi-family) | 2-4 units |
| `D` | Land | Vacant lots, acreage |
| `E-I` | Manufactured / Commercial / Business / Vacation | Not currently ingested |

## MLS sources

8 associations aggregated into `unified_listings`. ~76k active listings, ~2.1M
photos. Coverage:

| Short name | Full name | MLS ID | Coverage |
|---|---|---|---|
| `CRMLS` | California Regional MLS | `20200218121507636729000000` | LA / OC / Ventura / Riverside / San Bernardino |
| `CLAW` | Combined LA / Westside | `20200630203341057545000000` | LA region |
| `SOUTHLAND` | Southland Regional | `20200630203518576361000000` | SoCal |
| `GPS` | Greater Palm Springs | `20190211172710340762000000` | Coachella Valley |
| `HIGH_DESERT` | High Desert MLS | `20200630204544040064000000` | Victorville, Hesperia, Apple Valley |
| `BRIDGE` | Bridge MLS | `20200630204733042221000000` | California |
| `CONEJO_SIMI_MOORPARK` | Conejo Simi Moorpark | `20160622112753445171000000` | Conejo Valley |
| `ITECH` | ITECH | `20200630203206752718000000` | California |

All 8 MLSs go through the Spark Replication API, which exposes RESO-compliant
`StandardFields` — meaning we ingest with **one flattener** rather than per-MLS
mapping.

## VPS cron pipeline

Ingestion runs on a **DigitalOcean droplet** (`/root/jpsrealtor`), not on Vercel.
The Next.js app on Vercel is read-only against MongoDB.

Schedule from `F:\web-clients\joseph-sardella\jpsrealtor\crontab.vps`:

| When | Job | Script |
|---|---|---|
| Mon-Sat 6 AM | Incremental fetch (25h window) | `run-pipeline.py --all --incremental` |
| Sun 3 AM | Full weekly resync | `run-pipeline.py --all` |
| Daily 7 AM | Status update (Active/Pending → Closed transitions) | `update-status.py` |
| Daily 8 AM | Subdivision CMA build | `build-subdivision-cma.py --all` |
| Daily 9 AM | Photo cache | `cache-photos.py` |
| Daily 9:30 AM | Photo delta sync into `unified_listings.media` | `fetch-photos.py --all --delta` |
| Daily 10 AM | Historical closed sync | `historical_closed_sync.py` |

Pipeline order (conceptually): **fetch → status → CMA → photos**.

`--purge` flag is **DISABLED** after the April 6 2026 incident that wiped active
listings. Stale listings are not auto-removed; status transitions are the only
way records leave Active.

## Closed listings

`unified_closed_listings` is a **separate collection** mirroring the
`unified_listings` schema but for closed sales. It is the data source for the
CMA system. Header of `unified-closed-listing.ts` lists all 8 MLS IDs explicitly.
Retention: 5 years via TTL index. Historical backfill runs daily (10 AM cron).

## Subdivisions

1,424 documents in the `subdivisions` collection, pre-aggregated from
`unified_listings`. Each subdivision carries:

- Core identity (`name`, `slug`, `normalizedName`, `city`, `county`, `region`)
- Aggregate stats (`listingCount`, `priceRange`, `avgPrice`, `medianPrice`, property-type counts)
- Enriched content (`description`, `photo`, `features`, `keywords`)
- **`communityFacts`** — deep deck (HOA fees, golf/pickleball/tennis, security, demographics, market velocity, view corridors, airport noise, flood, casita prevalence — see `subdivisions.ts` for full enum list)
- **`cmaStats`** — pre-built nightly by `build-subdivision-cma.py`: `active`, `closed`, `absorptionRate`, `quality.confidence`, `bySubType[]`, `topActiveComps`, `topClosedComps`, `trends`, `narrative`

The pre-built model pattern is the performance win: subdivision pages read
`cmaStats` directly in **~200ms**, vs ~15s for live aggregation. The PGA West
hierarchy is live (parent subdivision → child sub-subdivisions).

Cities use the same pattern (`cities.ts`) — fewer fields, no per-subType
breakdown, but same aggregation cron.

## Photos

| Storage | Purpose |
|---|---|
| `unified_listings.media[]` | Embedded photo array (PascalCase fields from Spark: `MediaURL`, `Uri800`, `Uri1024`, `Order`, etc.) — primary store |
| `photos` collection | **DEPRECATED** but still queried by `/api/listing/[listingKey]/photos` (note: the route uses lowercase `uri800` etc. — see Gotchas) |
| Spark Replication API direct | `fetch-primary-photos.ts` batches up to 50 keys per request, grouped by `mlsId`, with 1h Next cache |
| Cloudinary | On-demand uploads (not part of the cron path) |

Photo sync is asynchronous: the photo cron (9 AM / 9:30 AM) runs hours after
the fetch cron (6 AM), so new listings briefly show with placeholder images
until the next sync wave.

**Detail-page photos are DB-first (June 2026).** `/api/listings/[listingKey]/photos`
now serves the synced `media[]` array first and only falls back to a live Spark
fetch when the DB has no stored media (then `primaryPhotoUrl` as a last resort);
the response carries a `source: "db" | "spark" | "primaryPhotoUrl" | "none"`
field. Previously the route *always* hit Spark live and ignored `media[]` — so a
listing that went **off-market** (and thus dropped out of the live Spark feed)
returned zero photos and showed a "no photo" placeholder even though its photos
were already synced. Reading `media[]` keeps photos working after off-market.

## Frontend routes

| Route | Purpose |
|---|---|
| `/mls-listings` | Search index page |
| `/mls-listings/[slugAddress]` | Listing detail page (uses `/api/mls-listings/[slugAddress]`) |
| `/mls-listings/[slugAddress]/map` | Listing-scoped map view |
| `/map` | Standalone full-screen map (layout only — content via chat session) |
| `/chap` | Map embedded inline within chat |
| `/neighborhoods/[cityId]` | City page (reads `cities` + `cmaStats`) |
| `/neighborhoods/[cityId]/[slug]` | Subdivision page (reads `subdivisions` + `cmaStats` + `communityFacts`) |
| `/neighborhoods/[cityId]/[slug]/buy` and `/sell` | Intent-targeted variants |

Map architecture (clustering, polygon boundaries, SSE streaming, hierarchical
zoom strategy) is documented separately — see
`F:\web-clients\joseph-sardella\jpsrealtor\docs\map\MAPPING_SYSTEM_ARCHITECTURE.md`.

## Gotchas

- **VPS pipeline is separate from Vercel.** A VPS outage means stale listings on the live site — Vercel keeps serving from MongoDB but no new data arrives until the droplet recovers.
- **Photo sync is asynchronous.** New listings can appear in `unified_listings` hours before their photos populate. The detail page falls back to `/images/no-photo.png`.
- **`--purge` is disabled.** Old/withdrawn listings won't be removed automatically; only the status-update cron transitions them out of Active.
- **`unified_listings` vs `unified_closed_listings` are separate collections.** A search query that hits the wrong one returns zero or wrong data. CMA reads closed, listing search reads active.
- **Rentals don't have a separate rent field.** For `propertyType = "B"`, `listPrice` is the monthly rent. UI code must branch on property type before formatting price labels.
- **`IMedia` interface is PascalCase (`Uri800`, `MediaURL`, `Order`)** because that's what Spark returns and what gets persisted into `unified_listings.media[]`. Some frontend code expects camelCase (`uri800`); this is a known drift point — anything reading `media[]` must use PascalCase or normalize.
- **Mongoose strict mode silently drops unschema'd fields.** When adding a new field on the Python side, also add it to `unified-listing.ts`, or it disappears on every read.
- **Property type code conflict in old docs.** Legacy `docs/listings/PROPERTY_TYPES_AND_DATA_PIPELINE.md` cites a different code mapping than the production code uses; trust the model file and `/api/mls-listings/route.ts`: A=sale, B=rental, C=multifamily, D=land.
- **PRIMARY photo fields are inconsistent.** `unified_listings.primaryPhotoUrl` exists but isn't reliably populated across all MLS sources; `fetch-primary-photos.ts` exists specifically to paper over this from Spark on-demand.

## Reference implementation

`F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\mls-listings\route.ts` is
the canonical search endpoint. It demonstrates:

- `listingType` → `propertyType` code mapping (sale=A, rental=B, multifamily=C, land=D)
- Full filter surface (price, beds/baths, sqft, lot, year, pool/spa/view/garage, HOA, gated/senior, land type, city, subdivision, mlsSource, excludeKeys for swipe)
- Bounding-box vs radius mutual override
- Aggregation pipeline: match → sort → page → openhouses lookup → project (including computed `pool`, `spa`, `hasHOA`, `primaryPhotoUrl` fallback chain)
- CDN cache headers (`s-maxage=3600`, `stale-while-revalidate=604800`)

For single-listing lookups or `$near` geospatial radius searches, use
`F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\unified-listings\route.ts`.

## Related

- `../multi-tenant/README.md` — public listing endpoints don't currently scope by domain owner; if/when "featured listings per agent" lands, that scoping rule applies
- `F:\web-clients\joseph-sardella\jpsrealtor\docs\map\MAPPING_SYSTEM_ARCHITECTURE.md` — map rendering, clustering, polygons
- `F:\web-clients\joseph-sardella\jpsrealtor\docs\cma\LISTING_CMA_BACKEND_BUILDER.md` — listing-level `cmaStats` builder cron

## Migration log

Legacy `/docs/` files reviewed for this rewrite:

| Title | Path | Classification | Action |
|---|---|---|---|
| Unified MLS Architecture | `docs\listings\UNIFIED_MLS_ARCHITECTURE.md` | PARTIAL | merged-here (numbers updated 87k → 76k; schema details kept as deep-dive reference) |
| Property Types & Data Pipeline | `docs\listings\PROPERTY_TYPES_AND_DATA_PIPELINE.md` | OUTDATED | merged-here; **conflicts with prod code mapping** (D=Land per code, not C); legacy doc to archive after sweep |
| Cities/Subdivisions Unified Integration | `docs\listings\CITIES_SUBDIVISIONS_UNIFIED_INTEGRATION.md` | OUTDATED | merged-here (collection layout described as pre-unification fragmented model) |
| Trello Import CMA and Unified | `docs\listings\TRELLO_IMPORT_CMA_AND_UNIFIED.md` | OUTDATED | archive (project-tracking artifact, not architecture) |
| MLS Data Architecture (per-agent) | `docs\architecture\MLS_DATA_ARCHITECTURE.md` | OUTDATED | rewrite-needed — describes per-agent `{tenantId}_{mls}_listings` collections which are NOT in use; production is single unified collection |
| Closed Listings System | `docs\architecture\CLOSED_LISTINGS_SYSTEM.md` | PARTIAL | merged-here (5-year retention, 8-MLS list confirmed); CMA detail belongs in own CMA area doc |
| Photos Model Migration | `docs\architecture\PHOTOS_MODEL_MIGRATION.md` | PARTIAL | merged-here (Photo→media migration confirmed but `/api/listing/[listingKey]/photos` still queries Photo collection — drift to log) |
| Photo Fix Complete | `docs\photos\PHOTO_FIX_COMPLETE.md` | OUTDATED | archive (completed work) |
| Photo Pipeline Analysis | `docs\photos\PHOTO_PIPELINE_ANALYSIS.md` | PARTIAL | merged-here (Spark batching strategy) |
| Hybrid Photo Strategy | `docs\photos\HYBRID_PHOTO_STRATEGY.md` | PARTIAL | merged-here (embedded media + Spark on-demand) |
| VPS Photo Setup | `docs\photos\VPS_PHOTO_SETUP.md` | OUTDATED | archive (setup-time artifact, current schedule lives in `crontab.vps`) |
| Photo Frontend Update | `docs\photos\PHOTO_FRONTEND_UPDATE.md` | OUTDATED | archive (completed work) |
| Mapping System Architecture | `docs\map\MAPPING_SYSTEM_ARCHITECTURE.md` | CURRENT | kept separate — large enough to own its area doc; cross-linked above |
| Map bug-fix docs (12 files) | `docs\map\MAPVIEW_FIXES.md`, `MAP_FIXES_COMPLETE.md`, `MAPLIBRE_RELOAD_FIX.md`, `SWIPE_QUEUE_FIX.md`, `MAP_INITIALIZATION_FIX.md`, `URL_BOUNDS_FIX_V2.md`, `INFINITE_LOOP_FIX.md`, `MAPLIBRE_FROZEN_ON_LOAD.md`, `MAPLIBRE_FROZEN_SOLUTION.md`, `MAPLIBRE_FROZEN_FOLLOWUP.md`, `MAPLIBRE_FROZEN_FINAL_SOLUTION.md`, `REFACTOR_PLAN.md`, `UNIFIED_LISTINGS_AUDIT.md` | OUTDATED | archive (all completed work / postmortems) |
| VPS Closed Listings | `docs\deployment\VPS_CLOSED_LISTINGS.md` | PARTIAL | merged-here (TTL + cron); deployment-step prose to archive |
| Cron Setup | `docs\deployment\CRON_SETUP.md` | OUTDATED | archive (superseded by `crontab.vps` as source of truth) |
