# Phase 2 Summary — data layer fixes

**Commits on `chatlistings` since Phase 1:**

| SHA | Subject |
|---|---|
| `4b2801ce` | feat(chat-v2): shared listing-query helper for filters + $facet stats |
| `a20503b7` | refactor(chat-v2): rewrite executeSearchHomes on shared helper |
| `99f5e223` | feat(chat-v2): searchListings + getAreaStats tools |
| `595ca93b` | test(chat-v2): script comparing old 50-row stats logic vs new $facet pipeline |

## What changed

### New files
- **`src/lib/chat-v2/listing-query.ts`** (762 lines) — three primitives every Phase 2 tool now uses:
  - `ListingScope` union covering `county | city | subdivision | subdivisionGroup | street | zip` — the three-layer geographic taxonomy plus street and zip targeting.
  - `BuildOptions.dataset: 'active' | 'closed'` — swaps the collection (`UnifiedListing` ↔ `UnifiedClosedListing`) and the price/date field (`listPrice`/`onMarketDate` ↔ `closePrice`/`closeDate`). **Architectural readiness for closed-listings tools**; not yet exposed in any tool schema.
  - `buildListingQuery(scope, filters, opts)` — translates every filter advertised in `tools.ts` into a Mongo query.
  - `computeAreaStats(scope, filters, opts)` — single `$facet` aggregation over the **full** filtered set.
  - `deriveTextInsights(scope, filters, opts)` — small `publicRemarks` text scan for `isGated`/`hasGolf`. Marked for removal in Phase 4.
- **`src/app/components/chat/AreaStatsCard.tsx`** — renderer for the new `getAreaStats` tool. Shows headline numbers, propertySubType breakdown, HOA, amenity rates. Special-cases `propertyType="B"` to display monthly + annualized rent.
- **`scripts/verify-chat-stats.ts`** — before/after harness; runnable via `npx tsx scripts/verify-chat-stats.ts`. Output captured in §Verification.

### Modified files
- `src/lib/chat-v2/tools.ts` — added `searchListings` and `getAreaStats` schemas. Tool count is now **8** (was 6).
- `src/lib/chat-v2/tool-executors.ts` — `executeSearchHomes` rewritten on the shared helper (–400 / +217 lines net). Added `executeSearchListings` and `executeGetAreaStats`.
- `src/lib/chat-v2/streaming.ts` — added `listingResults` and `areaStats` to the component whitelist. Per the plan, **NOT** added to the skip-second-call optimization at lines 171–184 — the model gets a real second turn to narrate.
- `src/app/components/chat/ChatProvider.tsx` — `ComponentData` typings extended with `listingResults` and `areaStats`.
- `src/app/components/chat/ChatResultsContainer.tsx` — renders `listingResults` via existing `ListingListView`, `areaStats` via new `AreaStatsCard`.

## The aggregation pipeline (isolated)

Located at `src/lib/chat-v2/listing-query.ts:294–:557`. Single `$facet` with five branches over the fully filtered Mongo query:

1. **`headline`** — `count`, `avg/min/max` price, `avgSqft`, `avgPricePerSqft` via `$group` + `$avg`. Median price/sqft/$/sqft via `$sortArray` → `$arrayElemAt` at `floor(size/2)` (uses MongoDB 5.2+ `$sortArray`). All wrapped in `$let` so the sorted array is computed once per metric.
2. **`bySubType`** — `$group` by `propertySubType` with `count`, `avgPrice`, `avgPricePerSqft`. Sorted descending by count and capped at 20.
3. **`hoa`** — only listings with `associationFee > 0`; `count`, `min`, `max`, `avg` of the fee.
4. **`amenities`** — single-pass counts for pool/spa/view/fireplace/gated/senior, OR'ing across both lowercase (`poolYn`) and legacy uppercase (`poolYN` / bare `pool`) field names. Percentages computed in JS at the end.
5. **`newListings`** — `$addFields` `daysSince` from `onMarketDate` (or `closeDate` for closed dataset), match `≤7` days, `$count`.

Result sizes are all bounded inside the pipeline (no JS `.limit()`). Median works up to ~1M listings per scope before hitting the 16MB doc cap on `$push`'d arrays — well above any conceivable CA city.

## Verification — Beverly Hills + Irvine before/after

Reproducible via `npx tsx scripts/verify-chat-stats.ts`. Captured below.

### Beverly Hills (296 active listings, propertyType=A)

| Field | OLD (50-row JS sample) | NEW ($facet, full set) | Δ |
|---|---|---|---|
| Total listings | 296 | 296 | 0% |
| New (7 days) | 13 | 13 | 0% |
| Avg price | $1,404,660 | **$11,498,763** | +718% |
| Median price | $1,460,000 | **$6,250,000** | +328% |
| Min price | $14,000 | $14,000 | 0% |
| Max price | $1,899,000 | **$135,000,000** | +7,009% |
| HOA range | $327–$5,500 | **$300–$21,396** | — |
| Pool % | 0% | **73%** | — |
| Spa % | 0% | **54%** | — |
| View % | 0% | **85%** | — |

PropertySubType breakdown:

| SubType | OLD count | NEW count | OLD avg | NEW avg |
|---|---|---|---|---|
| Condominium | 40 | 73 | $1,390,200 | $3,156,507 |
| Single Family Residence | 9 | **222** | $1,430,667 | **$14,285,855** |
| Townhouse | 1 | 1 | $1,749,000 | $1,749,000 |

The old sample was 50 cheapest-condo rows from a `find().limit(50)` with no sort, so the model was reporting "Beverly Hills avg $1.4M" while in reality 222 of 296 listings were single-family homes averaging $14.3M. The luxury market — including the $135M max — was entirely invisible to the AI.

Pool/spa/view jumping 0%→73%/54%/85% is a separate fix: the old code only checked `poolYn` (lowercase per current schema) but the data has both `poolYn` and legacy `poolYN`/`pool` field names depending on MLS source. The new code OR's across all three.

### Irvine (667 active listings, propertyType=A)

| Field | OLD (50-row JS sample) | NEW ($facet, full set) | Δ |
|---|---|---|---|
| Total listings | 667 | 667 | 0% |
| Avg price | $1,400,740 | **$2,106,395** | +50% |
| Median price | $1,449,000 | **$1,746,888** | +21% |
| Max price | $2,880,000 | **$16,999,999** | +490% |
| HOA range | $108–$1,949 | **$30–$2,998** | — |
| Pool % | 0% | **92%** | — |

PropertySubType breakdown:

| SubType | OLD count | NEW count |
|---|---|---|
| Condominium | 50 | 356 |
| Single Family Residence | **0** | 263 |
| Townhouse | 0 | 41 |
| Manufactured On Land | 0 | 7 |

Even more striking: the 50-row sample for Irvine was 100% condos, so the model literally never saw a single Irvine single-family home — there are 263 of them.

## Filter parity (W4 closed)

Old `executeSearchHomes` translated 6 of the ~25 filters in `tools.ts` to the actual Mongo query: `minPrice`, `maxPrice`, `beds`, `baths`, `pool`, `propertyType`. The remaining filters (`spa`, `view`, `fireplace`, `gatedCommunity`, `seniorCommunity`, `garageSpaces`, `stories`, `minSqft`/`maxSqft`, `minLotSize`/`maxLotSize`, `minYear`/`maxYear`, `eastOf`/`westOf`/`northOf`/`southOf`, `hasHOA`/`minHOA`/`maxHOA`) were silently passed through to the frontend, which re-applied them when fetching the carousel. The `stats` returned to the model therefore did not match the listings the user saw.

After Phase 2, **every advertised filter is now applied at the Mongo query layer.** The implementation mirrors `src/app/api/cities/[cityId]/listings/route.ts` exactly (including the `OR` patterns across legacy field names), so the AI's stats and the carousel are now derived from the same filter set.

## New tool surface

Both new tools accept `scope: 'street' | 'subdivision' | 'city' | 'county' | 'zip'` plus the full filter set. Street scope requires `cityName` (street names aren't unique across cities).

| Tool | Returns | Use case |
|---|---|---|
| `searchListings` | `{ listings: [...rows], totalCount, scope, filters, pagination, sort }` — actual rows, not just an identifier | "homes on Hovley Lane" |
| `getAreaStats` | `{ stats, propertyType, scope, filters }` — aggregate stats card | "average price on Hovley Lane", "average rental income in Indio" (with `propertyType="B"`) |

`searchListings` supports `limit` (default 50, max 200), `offset`, and `sort` ∈ `price-low / price-high / newest / oldest / sqft-low / sqft-high`. `sqft-low`/`sqft-high` use an aggregation pipeline (matches the pattern in `/api/cities/.../listings`); the others use `find().sort()`.

Neither tool is in the skip-second-call optimization, so the model gets a second turn to narrate the rows or aggregate.

## What was deliberately NOT touched

Per the plan:
- The agent loop (`streaming.ts:75–:208`) — still a fixed two-turn pipeline. Phase 3.
- `parallel_tool_calls` — still unset. Phase 3.
- `searchArticles` — still inlines full article bodies. Phase 4.
- `getAppreciation`, `generateCMA` — unchanged.
- The system prompt — still references `stats.insights.{isGated, hasGolf, hoa, amenities}`. The new code maps the new `AreaStats` shape back into that legacy shape so the existing prompt keeps working until Phase 4.

## Manual test plan

Start the dev server and try each. Watch server logs for the new aggregation pipeline running (`[searchHomes] Stats: N listings, avg $X, median $Y`).

| # | Query | Expected tool & shape | What proves it worked |
|---|---|---|---|
| 1 | `show me homes in Beverly Hills` | `searchHomes` → `neighborhood` component, stats card with median ~$6.25M (was ~$1.46M) | Carousel shows the same 296-listing set the AI summarizes |
| 2 | `homes in Irvine with a pool under $1.5M` | `searchHomes` → all filters now applied at DB layer | Pool filter applied to stats, not just to carousel — totals should match |
| 3 | `homes on Hovley Lane in Palm Desert` | `searchListings` (scope=street, cityName=Palm Desert) → list view of all matching listings | Returns rows, not "pick one" disambiguation |
| 4 | `average price on Hovley Lane in Palm Desert` | `getAreaStats` (scope=street) → `AreaStatsCard` | Card shows aggregate stats, no listing rows |
| 5 | `average rental income in Indio` | `getAreaStats` (scope=city, propertyType="B") → `AreaStatsCard` | Card shows monthly + annualized rent figures |
| 6 | `homes in Riverside County under $500K` | `searchHomes` → `neighborhood` (county scope, NEW in Phase 2a) | County now produces stats; previously fell back to empty |
| 7 | `tell me about 12345 Desi Drive` | `getListingDetails` (Phase 1 didn't break this) | Single listing card |

Edge cases worth checking:
- **Subdivision-group queries** ("BDCC") — should still work, scope mapped to `subdivisionGroup`.
- **Street query without cityName** — `searchListings` returns `{ success: false, error: ... }`. Streaming layer wraps that in an error tool result; the model should ask for the city.
- **Beverly Hills no-filter** — confirm the new median figure displays correctly in the message bubble (the system prompt still asks the model to render `stats.medianPrice`).

## Decisions queued for Phase 3 / Phase 4

1. **Closed-listings tool surface** — the helper supports `dataset: 'closed'` architecturally but no tool exposes it. Worth adding an arg to `getAreaStats` later for "average sold price last 6 months" questions, or a dedicated `getClosedStats` tool.
2. **AreaStatsCard polish** — currently bare-bones (headline numbers + table). Will probably want sparklines / charts in Phase 4 once the rendering layer is the only place stats appear.
3. **`searchListings` pagination UX** — the tool exposes `offset` but the renderer doesn't (yet) have prev/next buttons. Should pass `offset`/`limit` through to a "Load more" affordance, or rely on the model issuing a follow-up tool call (which Phase 3's real loop will support naturally).
4. **`isGated` / `hasGolf` JS scan** — `deriveTextInsights` still runs a 100-doc `publicRemarks` scan on every `searchHomes` call. Will be deleted in Phase 4 when the system prompt stops asking for these flags.

## Status

**Done.** Awaiting your manual sign-off on the seven test queries before starting Phase 3 (real agent loop).
