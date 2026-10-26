---
title: Listings / MLS
status: partial
last_verified: 2026-10-25
related: [caching-and-traffic.md, ../multi-tenant/README.md, ../chat/README.md, ../chatrealty-api/data-tiers.md, ../mcp/tools.md]
---

# Listings / MLS

## TL;DR

ChatRealty aggregates listings from **8 MLS associations** into one MongoDB
collection, **`unified_listings`** (in-market inventory, ~85k rows), with closed
sales in a separate **`unified_closed_listings`** (5-year TTL). Ingestion is Python
cron on a **DigitalOcean VPS**, not Vercel and (for most jobs) not this repo; the
Next.js app is read-only against these collections. Subdivisions and cities are
pre-aggregated into their own collections with pre-built `cmaStats` /
`cashflowProfile` blocks, so pages read in ~200ms instead of aggregating live.
Separately, an agent's *own* MLS key can seed their **tenant Postgres database**
from Settings — see [Hosted MLS seeding](#hosted-mls-seeding-tenant-databases).

> **Partial.** Code-checkable parts (models, routes, pages, map stack, favorites)
> were verified 2026-10-17. NOT re-checked: live row counts, whether each VPS cron
> still runs, `mlsSource` spellings beyond GPS/CRMLS/CLAW/SOUTHLAND, and the
> "≈1.4k subdivisions" figure.

## Files

| File | Role |
|---|---|
| `src/models/unified-listing.ts` | Active listings (`collection: "unified_listings"`, 2dsphere index) |
| `src/models/unified-closed-listing.ts` | Closed sales (`unified_closed_listings`, TTL index `closeDate_ttl_5years`); header lists the 8 MLS IDs |
| `src/models/subdivisions.ts` | Neighborhoods + `cmaStats`, `rentStats`, `cashflowProfile`, `communityFacts` |
| `src/models/cities.ts` | City stats (+ `cashflowProfile`; **no** `cmaStats`) |
| `src/app/api/mls-listings/route.ts` | Canonical public search: `listingType`→`propertyType`, price/beds/baths/sqft/lot/year/amenity/HOA/city/subdivision/`mlsSource`/`excludeKeys` filters, radius overrides the bounding box, `openhouses` `$lookup`, `s-maxage=3600, stale-while-revalidate=604800` |
| `src/app/api/mls-listings/[slugAddress]/route.ts` | Single-listing JSON for browser callers (map, chat cards); CDN `s-maxage=600` |
| `src/lib/listings/listing-detail.ts` | Shared in-process reads (`getEnrichedListing`, `getListingPhotos`) used by the detail page, its OG image and both API routes — see [caching-and-traffic.md](caching-and-traffic.md) |
| `src/app/api/unified-listings/route.ts` | Lookup by `listingKey`/`slugAddress`, true `$near` radius (meters) |
| `src/app/api/listings/[listingKey]/photos/route.ts` | Per-listing photos, DB-first (siblings: `listings/{nearby,related,quick-search}`) |
| `src/lib/listings/fetch-primary-photos.ts` | Batched Spark photo fetch (50 keys/request per `mlsId`, 1h cache) |
| `src/scripts/mls/backend/unified/` | Python pipeline in this repo: `run-pipeline.py`, `unified-fetch.py`, `flatten.py`, `seed.py`, `update-status.py`, `closed/` |
| `crontab.vps` | VPS schedule as of 2026-04-20 (see Gotchas) |

## Collections and names

| Name | What |
|---|---|
| `unified_listings` | The real collection the model and VPS write to; raw-driver code (`src/lib/market-stats.ts`) uses this name |
| `unifiedlistings` | A MongoDB **view** over `unified_listings` (`scripts/create-backwards-compatible-views.js`). Used by `spark-roster.ts`, `scripts/build-location-index.js` and the root `AGENTS.md`. Same data |
| `unified_closed_listings` | Closed history, **a different collection**. Powers the CMA engine (`src/lib/cma/`) and trend analytics; rows older than 5 years vanish. `buildListingQuery(..., { dataset: "closed" })` can target it, but no caller passes that today, so chat's "sold …" phrasing still reads active listings ([../chat/TOOLS_INDEX.md](../chat/TOOLS_INDEX.md), Known gap) |
| `subdivisions`, `cities` | Pre-aggregated area docs built from active listings by cron |
| `points_of_interest`, `openhouses`, `location_index` | Google Places POIs, open houses, entity-recognition index |

## UnifiedListing model

Schema is **camelCase** (flattened from RESO `StandardFields`), 100+ optional
fields, plus Mixed-type `cmaStats` and `cashflowStats` blocks.

| Property | Rule |
|---|---|
| Unique key | `listingKey` (`unique: true`) across all MLSs |
| Source | `mlsSource` (e.g. `GPS`, `CRMLS`) + `mlsId` (26-digit Spark MLS ID) |
| Geospatial | `coordinates: { type: "Point", coordinates: [lng, lat] }`, 2dsphere index |
| Hot indexes | `mlsSource+mlsId`, `city`/`subdivisionName`/`propertyType` + `standardStatus`, eight compound bed/bath indexes, two `cashflowStats` indexes |
| Strict mode | Undeclared fields are dropped silently, hence `Schema.Types.Mixed` for the VPS blocks. Add new Python-side fields to the schema too |

| Code | `propertyType` | Notes |
|---|---|---|
| `A` | Residential (sale) | Default; SFRs, condos, townhomes |
| `B` | Residential Lease (rental) | **`listPrice` is the monthly rent** — no separate rent field |
| `C` | Residential Income (multi-family) | 2–4 units |
| `D` | Land | Vacant lots, acreage |

The VPS fetch pulls only `A`–`D` (`unified-fetch.py`); chat and search share one
mapping (`normalizePropertyType` in `src/lib/chat-v2/listing-query.ts`,
`listingType` in `mls-listings/route.ts`).

## MLS sources

CRMLS, CLAW, Southland Regional, GPS (Greater Palm Springs), High Desert, Bridge,
Conejo Simi Moorpark, ITECH — all via the Spark Replication API, which exposes
RESO `StandardFields`, so one flattener (`flatten.py`) serves them all. Active
inventory was ~85k at the 2026-08 measurement in
[../chatrealty-api/data-tiers.md](../chatrealty-api/data-tiers.md) (~76k in a June audit).

The MLS IDs each source is keyed by (same list as `src/models/unified-closed-listing.ts:6-13`):

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

## VPS cron pipeline

Droplet at `/root/jpsrealtor`; Vercel only reads. `crontab.vps` (edited 2026-04-20):

| When | Job | Script |
|---|---|---|
| Mon–Sat 6 AM | Incremental fetch (25h window) | `run-pipeline.py --all --incremental` |
| Sun 3 AM | Full weekly resync | `run-pipeline.py --all` |
| Daily 7 AM | Status update (Active/Pending → Closed) | `update-status.py` |
| Daily 8 AM | Subdivision CMA build | `build-subdivision-cma.py --all` |
| Daily 9 AM / 9:30 AM | Photo cache / delta sync into `media[]` | `cache-photos.py` / `fetch-photos.py --all --delta` |
| Daily 10 AM | Historical closed sync | `historical_closed_sync.py` |

Order: **fetch → status → CMA → photos**. `--purge` is **disabled** since the
April 6 2026 incident that wiped active listings; records leave Active only via
status transitions. Newer builders — `build-cashflow-profile.py` (`cashflowProfile`,
Tue + Fri) and `build-listing-cma.py` (listing `cmaStats`) — are PyMongo jobs in the
separate `chatrealty-backend` repo, per comments in `src/models/subdivisions.ts` and
`src/app/components/mls/ListingClient.tsx`; `crontab.vps` doesn't list them, and
this repo doesn't say which job writes `rentStats` / `cashflowStats`.

## Subdivisions and cities

`subdivisions` is pre-aggregated from active listings: identity (`name`, `slug`,
`normalizedName`, `city`, `county`, `region`), aggregate stats, `description`/`photo`,
**`communityFacts`** (HOA, amenities, demographics, market velocity — enums in the
schema), and VPS-written Mixed blocks: **`cmaStats`** (`active`, `closed`,
`absorptionRate`, `quality.confidence`, `bySubType[]`, top comps, `trends`,
`narrative`), **`rentStats`** (rental going rate) and **`cashflowProfile`**
(four-strategy rollup read by the `get_area_cashflow` MCP tool, see
[../mcp/tools.md](../mcp/tools.md)). Subdivision pages read these in ~200ms vs ~15s
live. Master communities (PGA West) carry no real CMA; their courses/phases do.
`cities` has the same shape minus `cmaStats` and the sub-type breakdown, plus
`isOcean` and `subdivisionCount`.

## Photos

`unified_listings.media[]` is the primary store: **PascalCase** Spark fields
(`MediaKey`, `MediaURL`, `Uri800`, `Order` …). The old `Photo` model/collection is
DEPRECATED with no importers; Cloudinary is on-demand only. Sync is asynchronous
(9:00 / 9:30 AM, hours after the 6 AM fetch), so new listings briefly show
placeholders. `/api/listings/[listingKey]/photos` is **DB-first**: it serves
`media[]` (lowercased to `uri800` etc.), falls back to a live Spark fetch only when
nothing is stored, then to `primaryPhotoUrl`, and reports `source: "db" | "spark" |
"primaryPhotoUrl" | "none"`. Reading the synced array keeps photos working after a
listing goes off-market and leaves the live Spark feed.

## Frontend routes

- `/mls-listings` — search index. `/mls-listings/[slugAddress]` — detail page: a server component that reads the listing and photos in-process via `src/lib/listings/listing-detail.ts` (10-min data cache; it no longer fetches its own API over HTTP — [caching-and-traffic.md](caching-and-traffic.md)); its CMA section renders pre-built `cmaStats` via `adaptPrebuiltCmaStats`, else `CMAReport` falls back to `/api/cma/subdivision/{slug}` then `/api/cma/generate`. `/mls-listings/[slugAddress]/map` — listing-scoped map.
- `/neighborhoods/[cityId]` — city page (reads `cities`) with `events`, `hoa-contact-info`, `local-business`, `school-district` sub-pages. `/neighborhoods/[cityId]/[slug]` — subdivision page (reads `subdivisions`, embeds `SubdivisionCmaSection`). The old `…/buy` and `…/sell` variants are gone.
- `/chap` — chat + full-screen map ([../chat/README.md](../chat/README.md)). `/map` has only a metadata layout (`page.tsx.disabled`), so it serves no page.

## Map stack

Two libraries on purpose: **`@vis.gl/react-maplibre`** (MapLibre GL) draws the public
map (`mls/map/MapView.tsx`, `map/ListingsMap.tsx`, `chat/ChatMapView.tsx`) and the CRM
contact panel (`crm/ContactViewPanel.tsx`); **`react-leaflet`** (SSR-safe) is used by
`crm/PropertyMap.tsx` and `campaigns/PinDropMap.tsx`. `mapbox-gl` and `react-map-gl`
remain in `package.json` but nothing in `src/` imports them. Clustering/polygon
internals: archived [MAPPING_SYSTEM_ARCHITECTURE](../archive/map/MAPPING_SYSTEM_ARCHITECTURE.md), not re-verified.

## Favorites

The DB is the source of truth once signed in. `useFavorites`
(`src/app/utils/map/useFavorites.ts`) uses `localStorage["likedListings"]` **only for
guests**; at login it merges them into the account via `POST
/api/user/favorites/{listingKey}` and clears the key — never write it while
authenticated. The per-key POST returns **410** for a listing no longer in
`unified_listings`; the bulk POST is merge-only. `GET /api/user/favorites` joins
`unified_listings` and self-heals: favorites no longer Active move to
`statusChangedListings` (also run once per session by `useFavoritesSync` →
`POST …/sync-status`), and photos come from the synced `media[]`.

## Hosted MLS seeding (tenant databases)

An agent can seed **their own tenant database** (Neon Postgres via `getTenantSql`)
from their stored MLS key: choose associations, property types and closed-history
lookback in Settings (`MlsSeedPanel.tsx`), see a size estimate against their plan
tier, and `src/lib/mls-seed.ts` pulls resumable chunks driven by `/api/cron/mls-sync`
(every 5 minutes in `vercel.json`) plus a 3 AM Pacific nightly update that also
deletes rows that left scope. Routes: `src/app/api/integrations/mls-feed/{estimate,scope,seed,verify,networks}`;
scope in `src/lib/mls-scope.ts`; tiers in `src/lib/data-tiers.ts`; writer is
`packages/chatrealty-sync` (compiled `dist/`). Sizes, tiers and preflight live in
[../chatrealty-api/data-tiers.md](../chatrealty-api/data-tiers.md) — not repeated here.

## Gotchas

- **`crontab.vps` drifted from the repo.** `cache-photos.py`, `fetch-photos.py`, `build-subdivision-cma.py` and `historical_closed_sync.py` are referenced by path but are not tracked here; they live on the VPS / in `chatrealty-backend`. A VPS outage means stale listings while Vercel keeps serving Mongo.
- **Three names, two collections.** `unified_listings` = `unifiedlistings` (view); `unified_closed_listings` is separate. Search reads active, CMA/trends read closed; the wrong one returns zero or wrong data.
- **`media[]` is PascalCase**; the photos API lowercases it and the detail page maps it back to `SparkPhoto`. Anything reading `media[]` directly must use PascalCase. `primaryPhotoUrl` is unreliable across MLS sources — `fetch-primary-photos.ts` papers over it.
- **Subdivision hierarchy fields are undeclared.** `parentSubdivision`, `hierarchyLevel` (skill route, `cashflow-query.ts`) and `isMasterCommunity`, `childSubdivisions`, `childCount`, `parentSubdivisionName` (`/api/cma/subdivision/[slug]`) exist in the data but not in `subdivisions.ts`. They work only because reads use `.lean()` and Mongoose 8 doesn't strip unknown query paths; declare them before writing them from TS.
- **Listings belong to other brokerages.** Keep attribution, never alter listing photos, and never ship test-data mode (root `AGENTS.md`).

## Related

- [../multi-tenant/README.md](../multi-tenant/README.md) — public listing endpoints don't scope by domain owner
- `docs/archive/cma/LISTING_CMA_BACKEND_BUILDER.md` — listing `cmaStats` builder (archived, not re-verified)

## CRM dialer property panels

The [dialer preview](../crm/dialer/README.md) includes mobile Home and Comps panels. They reuse saved contact facts, ContactPropertyCarousel, the read-only contact enrichment endpoint, and contact-owned closed-sale comparables. Property enrichment can return a neighborhood reference, so the workspace preserves match cautions and saved facts. Photo lookup independently requires address-matched metadata and never substitutes neighborhood images. Comps use `unified_closed_listings`, real date/radius filters, and available like-kind facts; returned-subset medians are labeled. Active asking prices are distinct from sale prices. No sample listing records or prices are fabricated.

Sold-comps map interactions (verified 2026-10-18): pointer hover or keyboard focus previews the MLS photo, sold price, address and beds/baths/size without zooming. Click/tap opens a native property-details dialog with saved closed-listing media, description, sale/build/lot/pool facts, attribution and external research links. Sale-list Property details offers the same view, including sales without map coordinates. The contact-owned comparables route projects `primaryPhotoUrl`/`media`/`publicRemarks`/`listingId` from `unified_closed_listings`; the shared photo lookup may separately reuse exact-address active MLS photos or discover public property-page photos. Missing facts/photos remain explicitly unavailable. Mobile map gestures preserve one-finger panel scrolling.

Property photo enrichment (2026-10-18): contacts and sold-property dialogs share free, best-effort address-verified photo lookup and provenance-aware caching. POST lookups can seed declared `externalPhotos` fields on contacts/closed listings; MLS media is preserved. Source blocks are reported; no paid search provider or bypass is used. See [property-photo-discovery](../crm/property-photo-discovery.md).
