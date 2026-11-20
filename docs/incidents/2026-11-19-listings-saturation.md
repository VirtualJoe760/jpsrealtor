---
last_verified: 2026-11-19
status: open
severity: major
---

# 2026-11-19 — Listings and map stopped rendering

Client-facing outage. The map rendered zero pins and city pages hung.
`/api/map-clusters`, `/api/listings/related` and `/api/cities/*/hoa` all returned
nothing, timing out at Vercel's 300-second ceiling. 99 runtime errors in a
30-minute window.

---

## 1. What it was NOT

Recorded first, because three plausible causes were each investigated and ruled
out by measurement. Re-litigating them costs an hour.

| Suspected | Verdict | Evidence |
|---|---|---|
| Vercel past due / suspended | **No** | Homepage 200 in 0.99 s and `/api/mortgage-rates` 401 in 0.16 s *while the map hung*. Functions were executing. The 300 s aggregations were themselves *sent by* Vercel functions. |
| DigitalOcean past due | **No** | Every invoice paid same-day by PayPal back to January. $39.62 was month-to-date usage due Dec 1. |
| The `unifiedlistings` **view** | **No** | It is a passthrough view (`$match: {}`) onto `unified_listings`, left by a migration. Timed both: identical, and both use an index. A real red herring — it *looks* damning. |
| Missing indexes | **No** | `unified_listings` carries **64** indexes, including two 2dsphere. |
| A recent code change | **No** | See §4. |

## 2. Root cause — a case-insensitive regex defeats the sort

`src/app/api/listings/related/route.ts:71` and `:103`:

```js
query.city = { $regex: new RegExp(`^${city}$`, "i") };
```

The regex is anchored, so the instinct is that it is index-friendly. It is not.
A regex cannot deliver results **in `listPrice` order**, so MongoDB must fetch
every matching Active listing, sort them in memory, and discard all but 6.

Measured on production data, same query otherwise:

| Variant | docs examined | time |
|---|---|---|
| Case-insensitive regex (production) | 1,962 | **34,556 ms** |
| Case-sensitive regex | 1,256 | 48,249 ms |
| **Exact equality** | **6** | **288 ms** |

**120x faster, 327x fewer documents.**

And the regex buys nothing. `city` has exactly one spelling in the collection:

```
distinct spellings of "palm desert": [{ _id: "Palm Desert", n: 1256 }]
```

Defensive code guarding a condition the data does not contain.

## 3. Two amplifiers

**Documents are twice the size they need to be.** Average 46.6 KB (p50 46.3,
max 120). `photos` + `media` are **74% of all bytes** — and `media` is a
byte-for-byte duplicate of `photos`: same ids, same `resourceUri`, all 27 URLs
shared, differing only in a dropped `caption`.

**The cache is a tenth of the data.** A 2 GB DigitalOcean cluster gives
WiredTiger **0.37 GB** against **3,145 MB** of listings, so nothing stays
resident and every fetch is a physical disk read.

Damage over 23 hours: **1,192,930,020 documents scanned, 17,312,318 returned**
(69:1), and **7,327 GB read from disk**.

## 4. Why it surfaced on 2026-11-19 and not earlier

Nothing changed in the code.

- The regex was written **2026-04-03** (`d29f5f53`), seven months earlier.
- `map-clusters/route.ts` untouched since **2026-06-05** (`60d67ba6`).
- The three most recent commits (Nov 16–17) are onboarding/setup-chat only.
- **Zero indexes were created in the 23 hours before the outage** — checked via
  `$indexStats.accesses.since` against cluster boot. No schema or index work
  occurred.

What changed was **traffic**. Crawlers began walking city pages statewide: the
Vercel logs show `la-mirada`, `lynwood`, `orland`, and one stuck map query was
searching **latitude 36.90–38.75, longitude -122.23** — the Bay Area. Each
crawled city page fans out into several DB-heavy calls (`HOASection`,
`CityStats`, `CityMap`, `FeaturedListings` each fetch independently).

A latent 34-second query became fatal when it started running thousands of times.

## 5. Why it spilled into the map

The map was never the problem — it was a **bystander**.

`/api/listings/related` and `/api/map-clusters` share one database on one vCPU
with one 0.37 GB cache. The related-listings query saturated CPU and cache; the
map's (already heavy) geo aggregation then could not get served.

The failure then fed itself: **there is no `maxTimeMS` on these queries**, so
when Vercel killed a function at 300 s, MongoDB kept executing the query nobody
was waiting for. Visitors retried, spawning more. Abandoned operations observed
climbing **34 → 83** during the investigation.

That is the spillover mechanism: shared, uncapped, single-vCPU resource plus
work that outlives its requester.

## 6. Second pass — why jpsrealtor went blank while chatrealty served listings

Joe's question: *"why is jpsrealtor not spawning listings but chatrealty is?"*
Both are one Vercel project, one codebase, one cluster, routed by hostname, and
neither `map-clusters` nor `listings/related` is host- or agent-scoped. The same
viewport returned **identical 401,824-byte responses in 22.4 s and 23.4 s**. So
the query was equally broken on both and the asymmetry was downstream. Two
further causes came out of chasing it.

### 6a. `map-clusters` ran an unbounded count that fetched every document

`route.ts` counted the viewport on **every request at zoom ≥ 7** to decide
clusters-vs-pins:

```js
listingCount = await UnifiedListing.countDocuments(matchStage);
```

`queryPlanner` gives the plan as **`COUNT ← FETCH ← IXSCAN`** on
`idx_geo_status_type` `{latitude, longitude, standardStatus, propertyType}`.
That index does not contain `listPrice`, so Mongo loaded **every matching
document (avg 46.6 KB)** off disk purely to evaluate `listPrice > 0`. The
planner picks it because the lat/long range looks most selective; it does not
price the fetch.

`idx_map_query_optimized` `{standardStatus, propertyType, latitude, longitude,
listPrice}` already existed, carries `listPrice`, and has equality on both
leading fields (both are set unconditionally). Hinting it answers the same count
from index keys alone — measured earlier at **157 ms with
`totalDocsExamined = 0`**, against 22.4 s.

This is the same lesson as §2 from the other direction: **IXSCAN was never the
cost — the FETCH stage was.** Two separate endpoints, two different wrong
indexes, one misreading of the plan.

Fixed with `.hint(MAP_INDEX_HINT).maxTimeMS(MAP_QUERY_MAX_MS)`. The count stays
exact, because it is shown to the user as the viewport total — capping it would
have silently changed the "762 listings" the UI displays.

### 6b. jpsrealtor.com is fronted by a Cloudflare Worker; www.chatrealty.io is not

The app sets `s-maxage=1800, stale-while-revalidate=86400` on every
`map-clusters` response. chatrealty.io receives exactly that
(`x-vercel-cache: HIT`). jpsrealtor.com received
`max-age=14400, s-maxage=300` with `stale-while-revalidate` **gone**
(`CF-Cache-Status: HIT`, no Vercel headers at all).

Zone settings, page rules and `browser_cache_ttl` are **identical** on both
zones — the rewrite was not zone configuration. It was a Worker:

```
jpsrealtor.com/api/map-clusters*  ->  jpsrealtor-listings-api   (13 such routes)
api.chatrealty.io/api/*           ->  jpsrealtor-listings-api
```

On chatrealty the worker is bound **only to the `api.` subdomain**, so
`www.chatrealty.io` reaches Vercel directly and keeps the app's headers. On
jpsrealtor.com the worker intercepts, and it had four defects:

1. Hardcoded `"Cache-Control": "public, max-age=300, s-maxage=300"`, discarding
   the origin's serve-stale grace and cutting the shared TTL six-fold.
2. **No timeout on the origin fetch** — a 22 s origin held the worker open.
3. On any origin failure it returned **502 with a populated R2 copy sitting
   unused** — no stale fallback.
4. **R2 entries never expired.** `cached-at` was written but never read.

So chatrealty always had a stale copy to serve and jpsrealtor had a cache that
turned a slow origin into an error. That is the whole asymmetry.

Two process findings matter more than the bug:

- **The worker had no source in the repo.** It existed only as a deployed
  bundle; it was recovered from the Workers API and committed to
  `workers/listings-api/`. A production cache layer in front of 13 API paths was
  invisible to code review.
- **Its last deploy was 2025-12-04**, eleven months before the outage. Like the
  regex (2026-04-03) and `map-clusters` (2026-06-05), it is latent fragility
  that only bit once the origin got slow — more evidence the trigger was traffic,
  not a change.

A cache in front of a slow origin must never be the reason the page is empty.

## 7. Fixes, by payoff

1. **Drop the `i` flag → exact match** in `listings/related` (both sites) and
   `cities/[cityId]/photos`. One line. 120x. Very likely ends the outage alone.
2. **`maxTimeMS` on every listings query**, so abandoned work dies in the
   database and cannot accumulate.
3. **Stop projecting `photos`/`media`** into endpoints that never render them.
4. **Drop `media`** — it duplicates `photos`. Halves the collection, doubles
   effective cache.
5. **42 of 64 indexes have never been used**, against 273 updates/min — each
   update maintains all 64. Separate task; do not bundle.

Done on 2026-11-19 (§6): the `map-clusters` count is hinted and time-bounded,
and the worker is in the repo with its caching corrected — **not yet deployed**,
because it fronts 13 production paths including the ChatRealty product API.

## 8. What this incident cost to learn

- A query plan showing `IXSCAN` is **not** proof a query is cheap. All three
  variants above used `IXSCAN`. The number that mattered was `docsExamined`
  (1,962 vs 6), and after that, document *size*.
- `avgObjSize` is the hinge statistic when cache is small. 1,962 docs is
  trivial at 1 KB and fatal at 46.6 KB.
- An outage with no code change is a **capacity** story, not a regression.
  Check traffic shape before `git log`.
- Vercel timing out and MongoDB still working is a silent amplifier. Timeouts
  must be set on **both** sides or load only ever ratchets up.


## 9. 2026-11-20 — the crawl, the block, and the covering index

### 9a. What was actually generating the load

Vercel CDN analytics, 12 h, by bot:

| Bot | Requests | Cached |
|---|---|---|
| meta-webindexer | 20K | 3.2% |
| meta-externalagent | 10K | 2.3% |
| applebot | 4.8K | 2.7% |
| semrush | 4.5K | 0% |
| ahrefsbot | 3.5K | 2.1% |
| **googlebot** | **820** | 1.6% |

Meta alone was 30,000 requests in 12 hours against Googlebot's 820. They walk
`/mls-listings/[slugAddress]` — **53K requests, 0% cached**, because
`getCatalogBaseUrlFromHeaders()` calls `headers()` and forces dynamic rendering.
With 84,564 listing pages a crawler never repeats a URL, so no CDN cache helps a
single-pass sweep; every hit is a fresh ~39 KB document read.

Vercel web analytics over 7 days made the nature of it plain: 23,016 "visitors",
**99% bounce, 1.015 pages per visit, 100% desktop**, and a grand total of
**14 referrals** from search engines. The platform was counting crawlers as people.

### 9b. Why it broke *now* when nothing had deployed

`main` had not moved since 2026-11-04. DigitalOcean metrics show CPU rising from
occasional spikes to continuous saturation from ~Oct 29, but the thing that
changed in the final week was **load average: under 30 → 100–120**. On one vCPU
that is ~100 operations queued. Utilisation climbed linearly for three weeks;
wait time went vertical only when it reached the ceiling. "It was fine a few days
ago" and "nothing changed" were both true.

### 9c. The Cloudflare rule that could never have worked

A rule already existed — "Challenge non-search bots on listing pages":

```
starts_with(http.request.uri.path, "/mls-listings/") and not cf.client.bot and ...
```

`cf.client.bot` means **verified** bot, and Meta's crawlers are verified. The
rule explicitly exempted the exact traffic saturating the database.

Replaced by a Block rule at order 1 matching the user agents directly.
Cloudflare's own historical preview: **532,180 requests, 29.5% of all traffic,
last 30 days**. Verified after deploy — meta-externalagent, meta-webindexer,
ClaudeBot, GPTBot, Amazonbot, SemrushBot, AhrefsBot all 403; Googlebot, bingbot,
`facebookexternalhit` (share previews) and browsers all 200.

### 9d. The second FETCH nobody had found

With the count hinted, map-clusters still took ~10 s. The remainder was the
zoom 10–11 city-stats aggregation: its `$group` needs `city`, `listPrice`,
`propertyType`, `mlsSource` and lat/long together, and **no index carried that
combination**, so it fetched every listing in the viewport.

Two fixes:

1. **Skip it when the viewport is sparse.** The route ran the aggregation and
   then discarded it whenever the viewport held ≤ 300 listings. The hinted count
   already knew that, for free.
2. **`idx_map_query_covering`** `{standardStatus, propertyType, latitude,
   longitude, listPrice, city, mlsSource}`. `explain` now gives
   `GROUP ← PROJECTION_COVERED ← IXSCAN`, **no FETCH**.

`unified_listings` was at **MongoDB's hard cap of 64 indexes**, so this required
dropping one. `idx_geo_status_type` had **0 recorded uses over 2.1 days** (38 of
the 64 had none) and its fields are a subset of the new index's. Undo, if ever
needed:

```js
db.unified_listings.createIndex(
  { latitude: 1, longitude: 1, standardStatus: 1, propertyType: 1 },
  { name: "idx_geo_status_type" }
)
```

`idx_map_query_optimized` was deliberately **kept**, because the deployed route
hints it by name and dropping it would make that hint throw.

### 9e. Measured

| Stage | `/api/map-clusters`, cold viewport |
|---|---|
| Before anything | **18.7 – 22.4 s** |
| After the hinted count + bot block | 9.5 – 11.8 s |
| After `idx_map_query_covering` | **1.0 – 2.1 s** |

Database CPU went from pinned at 80–100% to 10–20%; load average from 100–120 to
under 2.

### 9f. Still open

- `/mls-listings/[slugAddress]` is still **0% cached**. Fixing it means dealing
  with `headers()` forcing dynamic render *and* the fact that output varies by
  host — cache it wrong and one agent's branding is served on another's domain
  (see `78295f27`). Needs a deliberate design pass, not a bolted-on header.
- **CORRECTION (2026-11-20): there is no `media` / `photos` duplicate.** An
  earlier revision of this section said `media` duplicated `photos`, was 74% of
  all bytes, and that dropping it was "the biggest remaining durable win". That
  was wrong, and wrong in a dangerous direction — `unified_listings.media[]` is
  the **primary photo store** ([../listings/README.md](../listings/README.md),
  Photos). The duplicate it referred to was a separate `photos` *collection*,
  and it was eliminated a year ago by `810b27f4` ("MIGRATION: Photos collection
  to unified_listings.media", 2025-12-06); the `Photo` model is gone from
  `src/models/`.

  The 38,976-byte average needs no duplicate to explain it: `media[]` carries
  **nine URI size variants per photo** (`Uri300`…`Uri2048`, `UriThumb`,
  `UriLarge`), so ~27 photos is tens of KB of legitimate data. Deleting it
  would have broken photos on every listing, and broken them *permanently* for
  off-market listings, which is exactly the case DB-first storage exists to
  serve.

  How the claim survived: it was carried across a context compaction as settled
  fact and repeated without re-deriving it, while `docs/listings/README.md` —
  which AGENTS.md rule 4 says to read first — stated the opposite in one line.

  The legitimate version of that optimisation is narrower: **stop projecting
  `media[]` into endpoints that never render photos.** `map-clusters` already
  excludes it; other listing endpoints have not been audited.
- **38 of 64 indexes have 0 recorded uses**, while every write maintains all 64.
- The collection lives in the **`admin`** database (`admin.unified_listings`).
