---
title: Chat Tools Index
status: current
last_verified: 2026-05-23
related: [README.md]
supersedes: docs/archive/chat-production/TOOLS_INDEX.md
---

<!-- Updated 2026-05-23 for locationSnapshot SnapshotCard payload. -->


# Chat Tools Index

**Surface area for `/chap` (production) and `/chat-v3` (sandbox), backed by `/api/chat-v3`.**

Single source of truth for everything the chat can call, dispatch, or
emit. Add to this file in the same commit as any new tool / preview
primitive / window event.

See [`README.md`](./README.md) for the chat-v3 architecture overview.

---

## Layer 3 — Agent-loop tools

Defined in `src/lib/chat-v2/tools.ts`. The model calls these when the
parser punts to the agent loop (intent=conversational, confidence<0.5,
multi-turn follow-ups, anything not yet wired into Layer 1).

| Tool | Purpose | Source |
|---|---|---|
| `searchHomes` | Property search with comprehensive filters (price, beds, baths, sqft, amenities, geographic) | `tools.ts:23` |
| `getListingDetails` | Single specific property by address / slug / listingKey | `tools.ts:223` |
| `searchListings` | Multiple listings in a scope — street, county, zip, subdivision | `tools.ts:265` |
| `getAreaStats` | Aggregate stats: count, avg/median price, $/sqft, sqft, HOA, propertySubType breakdown, amenity rates | `tools.ts:336` |
| `getAppreciation` | Market appreciation, ROI, value over time | `tools.ts:176` |
| `generateCMA` | Comparative Market Analysis for a specific property | `tools.ts:244` |
| `searchArticles` | Educational content (lifestyle, schools, energy, HOAs, climate, neighborhoods) | `tools.ts:202` |
| `askClarification` | Ask before guessing — multiple-choice button render | `tools.ts:393` |

Executors live in `src/lib/chat-v2/tool-executors.ts`. The agent loop
itself is `src/lib/chat-v2/streaming.ts:streamWithToolSupport`.

---

## Layer 1 — Search-first preview primitives

Defined in `src/lib/chat-search/preview.ts`. Dispatched deterministically
from `parsed.intent`. The narrator (`narrate.ts`) speaks over the
result; components mount from `preview.component`.

| Intent | Primitive | Component returned |
|---|---|---|
| `listing-detail` | `findOne` by houseNumber + slug, status=Active | `listingDetail` → `ListingDetailCard` |
| `listing-search` | `buildListingQuery + computeAreaStats + find(50)` | `neighborhood` → stats + `ListingOptionsViewer` (Panel/List/Map toggle) |
| `street-listings` | `buildListingQuery` scoped to street + countDocuments | `listingResults` → `ListingOptionsViewer` |
| `aggregate` | `computeAreaStats` (`$facet`) | `areaStats` → `StatsCard` |
| `compare` | `computeAreaStats × 2` parallel | `compare` → side-by-side `StatsCard` |
| `trend` | `/api/analytics/appreciation` (origin-aware) | `trend` → `AppreciationContainer` |
| `cma` (address) | `findOne` + `adaptPrebuiltCmaStats` (auto-promote on full-address signal) | `cma` cmaScope=`listing` → `CMAReport` |
| `cma` (subdivision) | `Subdivision.findOne` → slug | `cma` cmaScope=`subdivision` → `SubdivisionCmaSection` |
| `cma` (street/fallback) | `multiSourceSearch` + `LISTING_PROJECTION` hydrate | `cma` cmaScope=`listingOptions` → `ListingOptionsList` (Details + CMA buttons) |
| `insights` | `Article.find $text $search`, top 5 | `articles` → `ArticleResults` |
| `conversational` | passthrough — falls through to Layer 3 | n/a |

Preview output shape: `PreviewResult` in `src/lib/chat-search/types.ts`.
Renderer: `src/app/components/chat-v3/PreviewRenderer.tsx`.

---

## Special routes inside `/api/chat-v3`

| Route | Trigger | Behavior |
|---|---|---|
| Slash commands | `detectCommand` matches `/help` etc. | One-shot `content` SSE event with the command's markdown |
| `locationSnapshot` mode | Map-bar search (request body has `locationSnapshot`) | `fetchNearbyPOIs` + `resolveSnapshotMeta` resolve POIs, hero photo, area stats, and page link; Layer 3 with snapshot system prompt; `wrapAgentStreamWithSnapshotMeta` emits `{ snapshotMeta }` SSE event upfront so the `SnapshotCard` renders immediately above the streaming text |
| Layer 3 fallback | conversational / confidence < 0.5 | `streamWithToolSupport` from `chat-v2/streaming.ts` with full message history + all 8 tools |

### `locationSnapshot` card payload

Resolved server-side in `src/lib/chat-search/nearby-pois.ts:resolveSnapshotMeta` and emitted as one `{ snapshotMeta }` SSE event before the LLM narration begins. `SnapshotCard` (`src/app/components/chat/SnapshotCard.tsx`) mounts above the streaming text and contains: hero photo, name + type pill, up to 4 stat tiles, CTA button to the area page.

**Perf rule:** the resolver MUST stay <100ms — it runs inline before the LLM call and any latency delays first-token. It reads pre-computed cached fields only (one `findOne` per snapshot, no aggregations). A prior version aggregated on the fly from `UnifiedListing` (5000-doc scan + case-insensitive regex on 76k listings) and pushed snapshot turnaround to ~13s; the fix consolidated everything onto the cached docs below.

#### Per-type resolution (one `findOne` each, all cached fields)

| `snapshot.type` | Source doc | `heroPhoto` | `stats` | `pageLink` URL |
|---|---|---|---|---|
| `subdivision` | `Subdivision.findOne({name: /^.../i})` | `sub.photo` | `cmaStats.active.{count, medianPrice, avgPricePerSqft, avgDom}` (built nightly by the VPS cron); falls back to top-level `listingCount` / `medianPrice` when `cmaStats` isn't built | `/neighborhoods/{findCityByName(sub.city).city.id}/{sub.slug}` |
| `city` | `City.findOne({name: /^.../i})` | `c.photo` | `c.listingCount`, `c.medianPrice` (no `$/sqft` or DOM cached on the City model — those tiles are omitted) | `/neighborhoods/{findCityByName(name).city.id}` |
| `county` | `LocationIndex.findOne({name, type:"county"})` | always null (no curated county photos) | `loc.activeListingCount` only | `/neighborhoods/{soCalCounties.find(c => c.name === name).slug}` |
| `region` / unknown | not resolved | null | null | null — card omits the CTA button; narrator falls back to the generic suggestion language |

Hero photo is rendered via `next/image` with `unoptimized` so external CDN URLs work without `next.config` changes.

## "Describe X" resolver (preview.ts pre-dispatch)

Catches `tell me about X / what about X / details for X / describe X / info on X / give me info on X` queries before any intent dispatch runs. Strips the preamble, runs `multiSourceSearch` against `search_index`, routes by the top hit's type:

| Top hit type | Routes to | Notes |
|---|---|---|
| `listing` | `listingDetail` component | Sale-first (propertyType='A'), falls through to ANY when no sale exists at the address. Sanity-checks that resolved listing's address contains every word of the subject — guards against $text false positives. |
| `subdivision` | `neighborhood` component (subdivision scope) | Runs `computeAreaStats` + 50-listing search |
| `city` | `neighborhood` component (city scope) | Same |

This is the **scalable address-resolution path**. Suffix-agnostic — "Summit Cove", "Via Venito", "Calle Real", any future-MLS street style — all become text the index ranks. Don't extend `STREET_SUFFIXES` to chase new suffixes; this path covers them.

---

## Auxiliary helpers

These don't fit in the primary tables but are routinely composed by the
above. Worth knowing about before reinventing.

### Chat-search lib (`src/lib/chat-search/`)

- `parse(message)` → `ParsedQuery` — Phase A parser (re-exports chat-v2 `parseQuery`)
- `runPreview(parsed, {origin})` → `PreviewResult` — the big intent dispatcher
- `narrate(input)` / `streamNarration(input)` — Groq narrator (llama-3.1-8b-instant default)
- `describeContext(input)` — builds the AUTHORITATIVE block the narrator quotes
- `fetchNearbyPOIs(name, type, radiusMiles?)` → `POIBundle` — POI fetch for snapshots
- `describePOIBundle(bundle)` → markdown — drop-in for system prompt
- `resolvePageUrl(name, type)` → `{ url, label } | null` — canonical page URL for snapshot mode
- `resolveSnapshotMeta(name, type)` → `SnapshotMeta` — bundles hero photo + area stats + page link for the `SnapshotCard` (one round-trip per snapshot)

### Listings lib (`src/lib/listings/`)

- `fetchPrimaryPhotos(listings)` — Spark API photo batch (1 hop for N listings)
- `LISTING_PROJECTION` (in preview.ts) — canonical Mongo projection for chat surfaces

### CMA lib (`src/lib/cma/`)

- `adaptPrebuiltCmaStats(stats, listing)` — Python `cmaStats` → TS `CMAResult`
- `filterCompsByDistance(comps, subject)` — 30mi haversine cap on out-of-region comps
- `fillMissingStats(rawStats, comps, priceField)` — recomputes price/sqft/lot/dom averages from comp arrays

### Search lib (`src/lib/search/`)

- `multiSourceSearch(q, options)` — autocomplete + cma street-fallback resolution

### Chat-v2 lib (`src/lib/chat-v2/`)

- `buildListingQuery(scope, filters)` → `{query, Model}` — scope-aware Mongo query builder (city/subdivision/county/zip/street/subdivisionGroup)
- `computeAreaStats(scope, filters)` → `PreviewStats` — `$facet` aggregation
- `streamWithToolSupport(...)` — agent-loop SSE engine (used by both `/api/chat-v2` and Layer 3 fallback in `/api/chat-v3`)
- `resolveRouting(message)` — routes to reasoning model on heuristic match
- `detectCommand(text)` / `getCommandResponse(cmd)` — slash command fast-path

---

## Window-event extension surface

In-message components (PreviewRenderer children) dispatch these events;
ChatWidget listens and routes them through its existing handlers.

| Event | Payload | Listener behavior |
|---|---|---|
| `chatv3:send-message` | `{ message: string }` | Submits as a fresh chat turn via `handleAIQuery` — flows through parser → preview → narrate |
| `chatv3:open-listing-panel` | `{ listing, siblings?, index? }` | Builds queue from `siblings` (one-item fallback), clamps `index`, calls `handleOpenListingPanel(queue, startIndex)` so swipes traverse the visible group |
| `chatv3:toggle-favorite` | `{ listing }` | Maps slim PreviewListing onto the production mapListing shape and calls `toggleFavorite` from `useMLSContext` — toggles like-state in the user's favorites |

Defined in:
- `src/app/components/chat-v3/ListingOptionsList.tsx` (dispatches both)
- `src/app/components/chat-v3/ListingOptionsCarousel.tsx` (dispatches both)
- `src/app/components/cma/CMACompTable.tsx` (active comp rows dispatch open-listing-panel)
- `src/app/components/mls/map/ListingBottomPanel.tsx` (AI button dispatches send-message — "Tell me about {address}")
- `src/app/components/chat/ListingDetailCard.tsx` (See Similar Listings + Generate CMA buttons dispatch send-message)

ChatWidget listeners: `src/app/components/chat/ChatWidget.tsx` near
the auto-send useEffect.

---

## SSE event shapes (`/api/chat-v3` → ChatWidget)

| Event | When emitted | Consumer |
|---|---|---|
| `{ content: string }` | Slash commands, full markdown one-shot | Replaces streaming text |
| `{ token: string }` | Search-first narration token | Appended to streaming text |
| `{ preview: PreviewResult }` | Search-first Layer 1 result | Stored on `ChatMessage.preview`, rendered via `PreviewRenderer` |
| `{ components: ComponentData }` | Layer 3 tool result | Stored on `ChatMessage.components`, rendered via `ChatResultsContainer` (legacy chat-v2 shape) |
| `{ tool_calls: any[] }` | Layer 3 metadata | Carried in conversation history |
| `{ snapshotMeta: SnapshotMeta }` | First event in `locationSnapshot` mode (route-level wrapper) | Stored on `ChatMessage.snapshotMeta`, rendered as `SnapshotCard` above the markdown text |
| `{ done: true }` | Stream terminator | Marks message complete |

Both `preview` and `components` can coexist on a single message.

---

## Adding a new tool — checklist

Before merging:

1. Decide the layer:
   - **Agent-callable** (model orchestrates) → add to `tools.ts` + executor, include in `ALL_TOOLS`
   - **Deterministic** (parser triggers it) → add intent to `query-parser.ts`, add `if (parsed.intent === ...)` branch in `preview.ts`
2. Update the `PreviewResult` type in `src/lib/chat-search/types.ts` if the new primitive returns a new component shape
3. Add a renderer branch in `src/app/components/chat-v3/PreviewRenderer.tsx`
4. Add a context block in `narrate.ts:describeContext()` for the new component (so the narrator gets AUTHORITATIVE data)
5. Add a per-intent rule in the narrator system prompt (tone, what to quote, what not to invent)
6. **Update this file** — add the row to the right table
7. Smoke-test on `/test-chat` before shipping
