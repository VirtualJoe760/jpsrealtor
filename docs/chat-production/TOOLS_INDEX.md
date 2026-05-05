# Chat Tools Index

**Surface area for `/chap` (production) and `/chat-v3` (sandbox), backed by `/api/chat-v3`.**

Single source of truth for everything the chat can call, dispatch, or
emit. Add to this file in the same commit as any new tool / preview
primitive / window event.

Last sync: 2026-05-05 · See `CHAT_V3.md` for architecture, `MIGRATION_ROADMAP.md` for phases.

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
| `locationSnapshot` mode | Map-bar search (request body has `locationSnapshot`) | `fetchNearbyPOIs` enriches with cached Google Places, then Layer 3 with snapshot system prompt |
| Layer 3 fallback | conversational / confidence < 0.5 | `streamWithToolSupport` from `chat-v2/streaming.ts` with full message history + all 8 tools |

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

Defined in:
- `src/app/components/chat-v3/ListingOptionsList.tsx` (dispatches both)
- `src/app/components/chat-v3/ListingOptionsCarousel.tsx` (dispatches both)
- `src/app/components/cma/CMACompTable.tsx` (active comp rows dispatch open-listing-panel)
- `src/app/components/mls/map/ListingBottomPanel.tsx` (AI button dispatches send-message — "Tell me about {address}")

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

---

## Open work referenced from this index

- **Phase 4** (per `MIGRATION_ROADMAP.md`) — full component-shape parity audit across all preview primitives
- **Phase 5** — narrator routing by intent (reasoning model for compare/cma)
- **Backend Python** — `BACKEND_FIX_COMP_RADIUS.md` (comp pool geo filter), `BACKEND_FIX_COMP_POOL_SPA.md` (P/S/G column normalization)
