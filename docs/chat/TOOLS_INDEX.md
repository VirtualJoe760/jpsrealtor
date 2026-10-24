---
title: Chat Tools Index
status: current
last_verified: 2026-10-17
related: [README.md, ../chatrealty-api/chap-search-pg.md, ../listings/README.md]
supersedes: docs/archive/chat-production/TOOLS_INDEX.md
---

# Chat Tools Index

> **TL;DR.** Source of truth for everything the chat can call, dispatch or
> emit on `/chap` (production), `/chat-v3` (sandbox page) and the
> `/api/chat-v3` SSE endpoint. Today that is **8** agent-loop tools (Layer 3),
> **8** parser intents wired to Layer 1 previews (plus a "describe X"
> pre-dispatch), **3** consumed `chatv3:*` window events (plus one orphan
> dispatch, `chatv3:toast`), and **8** SSE event shapes. Add to this file in
> the same commit as any new tool / preview primitive / window event.

Architecture overview: [`README.md`](./README.md). Verified against code
2026-10-17; `tools.ts:NN` line refs are the `name:` line of each tool.

---

## Layer 3 — Agent-loop tools

Defined in `src/lib/chat-v2/tools.ts` (`ALL_TOOLS`, 8 entries; `getToolByName`
looks one up). The model calls these only when the parser punts to the agent
loop (intent `conversational`, confidence < 0.5, multi-turn follow-ups, and
`locationSnapshot` — where the prompt forbids tool use but the array is still
sent).

| Tool | Purpose | Emits `components.*` | Source |
|---|---|---|---|
| `searchHomes` | Property search with comprehensive filters (price, beds, baths, sqft, amenities, geographic) | `neighborhood` | `tools.ts:23` · `executeSearchHomes` |
| `getListingDetails` | Single property by address / slug / listingKey | `listingDetail` (one match) or `listingOptions` (several) | `tools.ts:223` · `executeGetListingDetails` |
| `searchListings` | Multiple listings in a scope — street, county, zip, subdivision, city | `listingResults` | `tools.ts:265` · `executeSearchListings` |
| `getAreaStats` | Aggregate stats: count, avg/median price, $/sqft, sqft, HOA, propertySubType breakdown, amenity rates | `areaStats` | `tools.ts:336` · `executeGetAreaStats` |
| `getAppreciation` | Market appreciation, ROI, value over time | `appreciation` | `tools.ts:176` · `executeGetAppreciation` |
| `generateCMA` | Comparative Market Analysis for a specific property | `cmaReport` | `tools.ts:244` · `executeGenerateCMA` |
| `searchArticles` | Educational content (lifestyle, schools, energy, HOAs, climate, neighborhoods) | `articles` | `tools.ts:202` · `executeSearchArticles` |
| `askClarification` | Ask before guessing — multiple-choice button render | `clarification` | `tools.ts:393` · inline case in `executeTool` |

Executors: `src/lib/chat-v2/tool-executors.ts` (`executeTool` is the switch;
an unregistered name returns `Unknown tool`). Loop engine:
`src/lib/chat-v2/streaming.ts:streamWithToolSupport`:

- Up to `MAX_ITERATIONS = 6` rounds; tools are sent on every round with
  `parallel_tool_calls: true`; a repeated identical (name, args) batch breaks
  the loop with a canned `token`.
- Model: `PRIMARY_MODEL = "openai/gpt-oss-120b"` (`reasoning-routing.ts`).
  Setting env `CHAT_REASONING_MODEL` opts multi-call phrasing (compare / vs /
  "and then" …) into that model with `<think>` blocks stripped
  (`ThinkStripper`). Route passes `temperature: 0.7`, `maxTokens: 2048`.
- Only these `data.component` values survive to the client — `projectComponent`
  in `streaming.ts`: `neighborhood`, `appreciation`, `articles`,
  `listingOptions`, `listingDetail`, `cmaReport`, `clarification`,
  `listingResults`, `areaStats`. A new component name not added there is
  **silently dropped**. The client renders them via
  `src/app/components/chat/ChatResultsContainer.tsx`.
- Property-type handling differs per tool. `searchListings` / `getAreaStats`
  pass `propertyType` (`A`–`D`) through `normalizePropertyType` in
  `listing-query.ts` (A=sale, B=rental, C=multifamily, D=land; also accepts
  house / condo / rental / land words). `searchHomes` instead copies its
  `house | condo | townhouse` enum into `filters.propertySubType`
  (`toListingFilters`), which `buildListingQuery` applies as an exact-equality
  match and never normalizes, so it is only as good as the stored
  `propertySubType` spelling.

---

## Layer 1 — Search-first preview primitives

Defined in `src/lib/chat-search/preview.ts` (`runPreview`). Dispatched
deterministically from `parsed.intent` (`Intent` in
`src/lib/chat-v2/query-parser.ts`). The narrator (`narrate.ts`) speaks over the
result; the component mounts from `preview.component`.

| Intent | Primitive | `component` → rendered by `PreviewRenderer` |
|---|---|---|
| `listing-detail` | `findOne` house# slug prefix + every street word, `standardStatus: Active`; sale (`propertyType A`) first, then any type; then an address-regex fallback | `listingDetail` → `ListingDetailCard` (`listing: null` + `reason` when nothing matches) |
| `listing-search` | `computeAreaStats` + `buildListingQuery` + `find(50)`; sort `priceAsc` → `listPrice` asc, `newest` → `onMarketDate` desc, else `listPrice` desc | `neighborhood` → stats + `ListingOptionsViewer` (Panel / List / Map toggle) |
| `aggregate` | `computeAreaStats` (`$facet`), no listing rows | `areaStats` → `StatsCard` |
| `street-listings` | `buildListingQuery` (street scope) `find(50)` + `countDocuments` | `listingResults` → `ListingOptionsViewer` |
| `compare` | `computeAreaStats` × 2 in parallel (needs ≥ 2 entities) | `compare` → side-by-side `StatsCard` |
| `trend` | `GET {origin}/api/analytics/appreciation?period=5y` (subdivision / city / county / zip only) | `trend` → `AppreciationContainer` |
| `insights` | `Article.find({status:"published", $text})`, top 5 | `articles` → `ArticleResults` |
| `cma` — address | `findOne` (sale first) + `adaptPrebuiltCmaStats` from `cmaStats` | `cma`, `cmaScope: "listing"` → `CMAReport` (generates fresh via `/api/cma/generate` when no prebuilt) |
| `cma` — subdivision | `Subdivision.findOne` → slug | `cma`, `cmaScope: "subdivision"` → `SubdivisionCmaSection` |
| `cma` — street, no house # | `buildListingQuery` street scope, `find(8)` | `cma`, `cmaScope: "listingOptions"` → `ListingOptionsList` (Details + Generate CMA) |
| `cma` — no entity | `multiSourceSearch` on the CMA-preamble-stripped text, re-ranked; **full address (house # + ZIP) with an exact top hit auto-promotes** to `cmaScope: "listing"`, otherwise `listingOptions` (≤ 8) | as above |
| `cma` — nothing resolved | `cma: null` + a "tell me which property" `reason` | `cma` with no `cmaScope` → note showing the `reason` |
| `conversational` / `unknown` | none — `component: null`, `reason: "preview not wired for intent: …"` (the route never gets here: it sends these to Layer 3) | n/a |

Preview shape: `PreviewResult` in `src/lib/chat-search/types.ts`. Renderer:
`src/app/components/chat-v3/PreviewRenderer.tsx` (also renders `preview.error`
and `reason`-only results as a note). Photos are attached to every listing set
by `attachPhotos` (local `primaryPhotoUrl` / `media[]` first, Spark batch via
`fetchPrimaryPhotos` for misses).

**Known gap:** the parser sets `dataset: "closed"` / `closedSinceDays` for
"sold …" phrasing, but `preview.ts` never passes `BuildOptions` to
`buildListingQuery` / `computeAreaStats`, so those queries run against the
Active collection (`BuildOptions.dataset` in `listing-query.ts` exists but
nothing passes it). A "sold last 6 months" answer is therefore built from Active
stats while the narrator is told `dataset: closed`.

### "Describe X" pre-dispatch (runs before any intent branch)

`DESCRIBE_PREAMBLE_RE` catches `tell me about / what about / what is … about /
info on / details for / describe / show me / give me info on / about` and strips
it. The remainder goes to `multiSourceSearch(subject, {limit: 6})`; the top hit's
type picks the component:

| Top hit | Result | Notes |
|---|---|---|
| `listing` | `listingDetail` | Sale-first (`propertyType A`), keeps the original hit if no sale exists. Every ≥ 3-char word of the subject must appear in the address, otherwise it returns `null` (guards `$text` false positives) |
| `subdivision` | `neighborhood` (subdivision scope) | `computeAreaStats` + 50 listings |
| `city` | `neighborhood` (city scope) | same |
| anything else / no hit / error | `null` → normal intent dispatch | |

This is the **scalable address-resolution path** — suffix-agnostic. Don't
extend `STREET_SUFFIXES` in the parser to chase new street suffixes.

---

## Special routes inside `/api/chat-v3`

`src/app/api/chat-v3/route.ts` (`POST`; `GET` is a health check returning
`{status, version: "3.0", pattern, fallbackToolCount}`). The `/api/chat*` prefix
is in the public list in `src/proxy.ts`, so no session is required.

| Route | Trigger | Behavior |
|---|---|---|
| Slash commands | `detectCommand` — the whole message is `help` or `tutorial`, with or without a leading `/` | One-shot `{content}` then `{done}` |
| `locationSnapshot` | Request body has `locationSnapshot {name, type}` — sent by `ChatWidget` on the `requestLocationInsights` window event | `fetchNearbyPOIs` + `resolveSnapshotMeta` (parallel) → agent loop with the snapshot system prompt → `wrapAgentStreamWithSnapshotMeta` emits `{snapshotMeta}` first, then forwards the loop's `{token}` / `{done}` events |
| Search-first | parsed intent not `conversational` and confidence ≥ 0.5 | `runPreview` → `{preview}` → `streamNarration` `{token}`s → `{done}` |
| Layer 3 fallback | `conversational`, confidence < 0.5 | `streamWithToolSupport` with the full message history + all 8 tools |

Sibling endpoints: `/api/chat-v2` (legacy agent-loop-only twin, same tools and
SSE, no in-repo caller), `/api/chat/community-facts` (GET community facts / POST
logs a missing fact to the console; no in-repo caller).

### `locationSnapshot` card payload

Resolved server-side in `src/lib/chat-search/nearby-pois.ts:resolveSnapshotMeta`
and emitted as one `{ snapshotMeta }` SSE event before the LLM narration begins.
`SnapshotCard` (`src/app/components/chat/SnapshotCard.tsx`) mounts above the
streaming text: hero photo, name + type pill, up to 4 stat tiles (active
listings, median, $/sqft, avg DOM — each shown only when present), and a CTA
`Link` to the area page.

**Perf rule:** the resolver MUST stay < 100 ms — it runs inline before the LLM
call and delays first token. It reads pre-computed cached fields only (one
`findOne` per snapshot, no aggregations). A prior version aggregated on the fly
from `UnifiedListing` (5000-doc scan + case-insensitive regex) and pushed
snapshot turnaround to ~13 s.

| `snapshot.type` | Source doc | `heroPhoto` | `stats` | `pageLink` URL |
|---|---|---|---|---|
| `subdivision` | `Subdivision.findOne({name: exact-ci})` | `sub.photo` | `cmaStats.active.{count, medianPrice, avgPricePerSqft, avgDom}` (nightly VPS cron); falls back to top-level `listingCount` / `medianPrice` | `/neighborhoods/{findCityByName(sub.city).city.id}/{sub.slug}` |
| `city` | `City.findOne({name: exact-ci})` | `c.photo` | `c.listingCount`, `c.medianPrice` (no $/sqft or DOM cached on `City`) | `/neighborhoods/{findCityByName(name).city.id}` |
| `county` | `LocationIndex.findOne({name, type:"county"})` | always null | `loc.activeListingCount ?? loc.listingCount` | `/neighborhoods/{soCalCounties.find(...).slug}` |
| `region` / unknown | not resolved | null | null | null — no CTA; narrator uses generic language |

Hero photo renders via `next/image` with `unoptimized`, so external CDN URLs
need no `next.config` change.

---

## Auxiliary helpers

Routinely composed by the sections above. Worth knowing before reinventing.

### Chat-search lib (`src/lib/chat-search/`)

- `parse(message)` → `ParsedQuery` — Layer 0, a thin wrapper over chat-v2 `parseQuery`
- `runPreview(parsed, {origin})` → `PreviewResult` — the intent dispatcher
- `narrate(input)` / `streamNarration(input)` — Groq narrator, `DEFAULT_MODEL = "openai/gpt-oss-20b"`, `reasoning_effort: "low"`, `temperature: 0.55`, `max_tokens: 400`. `NARRATOR_PROMPT` and `DEFAULT_MODEL` are exported
- `describeContext(input)` — builds the AUTHORITATIVE block the narrator quotes
- `fetchNearbyPOIs(name, type, radiusMiles = 3)` → `POIBundle` — bounding-box read of `points_of_interest`, top 5 per category, 8 overall picks
- `describePOIBundle(bundle)` → markdown for the system prompt
- `resolveSnapshotMeta(name, type)` → `SnapshotMeta` — hero photo + stats + page link in one round-trip
- `resolvePageUrl(name, type)` — exported but **unused** (superseded by `resolveSnapshotMeta`)
- Module-private in `preview.ts`: `LISTING_PROJECTION` (canonical Mongo projection for chat surfaces), `mapListing`, `attachPhotos`, `entityToScope`

### Listings / CMA / search libs

- `fetchPrimaryPhotos(listings)` — `src/lib/listings/fetch-primary-photos.ts`, Spark photo batch (1 hop for N listings)
- `adaptPrebuiltCmaStats(stats, listing)` — `src/lib/cma/adapt-prebuilt-stats.ts`, Python `cmaStats` → TS `CMAResult`; passes through `__source: "ts-engine"` objects written back by `/api/cma/generate`. Its 30-mile comp cap (`filterCompsByDistance`) and `fillMissingStats` are private to that file
- `multiSourceSearch(q, {limit})` — `src/lib/search/multi-source-search.ts`, autocomplete + describe / CMA fallback resolution

### Chat-v2 lib (`src/lib/chat-v2/`)

- `buildListingQuery(scope, filters, opts?)` → `{query, Model, priceField, dateField}` — scope-aware Mongo builder (city / subdivision / subdivisionGroup / county / zip / street). `opts.dataset: "closed"` switches to `UnifiedClosedListing` (`closePrice`, `closeDate`)
- `computeAreaStats(scope, filters, opts?)` → `AreaStats` (same fields as `PreviewStats` plus `newListingsPct`, `medianSqft`, `avgSqft`) — one `$facet` aggregation over the FULL filtered set
- `normalizePropertyType(raw)` — maps house / condo / townhouse / rental / land words and `A`–`D` codes onto the schema
- `streamWithToolSupport(...)` — agent-loop SSE engine (used by `/api/chat-v2` and the Layer 3 fallback)
- `resolveRouting(message)` — model choice (see Layer 3 above)
- `detectCommand(text)` / `getCommandResponse(cmd)` — slash-command fast path (`help`, `tutorial`)
- `trackToolUsage(event)` (`user-analytics.ts`) — fire-and-forget interest tracking for `searchHomes` / `getAppreciation`

### Postgres twin (not wired)

`src/lib/chap/` (`area-stats.ts`, `search-pg.ts`, `nearby-pois.ts`) ports the
Mongo area-stats / preview / POI path to a tenant Neon database. Nothing
outside `src/lib/chap/` imports it yet — see
[`../chatrealty-api/chap-search-pg.md`](../chatrealty-api/chap-search-pg.md).

---

## Window-event extension surface

In-message components dispatch these on `window`; `ChatWidget` listens and
routes them through its existing handlers (listeners are the three `useEffect`s
at the top of `src/app/components/chat/ChatWidget.tsx`).

| Event | Payload | Listener behavior |
|---|---|---|
| `chatv3:send-message` | `{ message: string }` | Submits a fresh chat turn via `handleAIQuery` → parser → preview → narrate |
| `chatv3:open-listing-panel` | `{ listing, siblings?, index? }` | Builds a queue from `siblings` (one-item fallback), clamps `index`, calls `handleOpenListingPanel(queue, startIndex)` so swipes traverse the visible group |
| `chatv3:toggle-favorite` | `{ listing }` | Maps the slim `PreviewListing` onto the production mapListing shape and calls `toggleFavorite` from `useMLSContext` |
| `chatv3:toast` | `{ message }` | **No listener exists.** Dispatched by the Share button in `ListingDetailCard.tsx` after copying the link, so the "Link copied" toast never shows |

Dispatch sites:

| Event | Dispatched from |
|---|---|
| `chatv3:send-message` | `chat-v3/ListingOptionsList.tsx` (Generate CMA), `chat-v3/ListingOptionsCarousel.tsx` (Generate CMA), `chat/ListingDetailCard.tsx` (See Similar Listings, Market Appreciation, Generate CMA), `cma/CMAReport.tsx` (Tell me about, similar homes, appreciation) |
| `chatv3:open-listing-panel` | `chat-v3/ListingOptionsList.tsx`, `chat-v3/ListingOptionsCarousel.tsx`, `cma/CMACompTable.tsx` (active comp rows), `cma/CMAReport.tsx` |
| `chatv3:toggle-favorite` | `chat-v3/ListingOptionsCarousel.tsx` only |
| `chatv3:toast` | `chat/ListingDetailCard.tsx` |

(All paths under `src/app/components/`.) The AI sparkle button in
`mls/map/ListingBottomPanel.tsx` does **not** use the event bus: it navigates to
`/chap?aiQuery=Tell me about {address}`, which `src/app/chap/page.tsx` turns into
`ChatWidget`'s `autoSendMessage`.

Related non-`chatv3:` event: `requestLocationInsights` — dispatched by
`map/MapSearchBar.tsx` and `mls/map/search/MapSearchBar.tsx` with
`{locationName, locationType, city, state}`; `ChatWidget` answers it with a
`locationSnapshot` request.

---

## SSE event shapes (`/api/chat-v3` → ChatWidget)

| Event | When emitted | Consumer |
|---|---|---|
| `{ content: string }` | Slash commands — full markdown one-shot | Replaces streaming text |
| `{ token: string }` | Search-first narration; **also all agent-loop text, including `locationSnapshot`** | Appended to streaming text |
| `{ preview: PreviewResult }` | Search-first Layer 1 result, sent before the first token | Stored on `ChatMessage.preview`, rendered by `PreviewRenderer` |
| `{ components: ComponentData }` | Layer 3, one event per tool result | Merged key-by-key into `ChatMessage.components`, rendered by `ChatResultsContainer` |
| `{ snapshotMeta: SnapshotMeta }` | First event in `locationSnapshot` mode (route-level wrapper) | `ChatMessage.snapshotMeta` → `SnapshotCard` above the text |
| `{ error: string, done: true }` | Search-first failure after the preview was sent (e.g. Groq model outage) | Visible fallback text instead of an empty bubble |
| `{ error: string }` | Agent-loop stream exception | Logged; stream closes |
| `{ done: true, iterationsHit? }` | Stream terminator (`iterationsHit` when the 6-round cap fired) | Marks the message complete |

`ChatWidget` also has a `data.tool_calls` branch and the route header comment
lists `{ tool_calls }`, but nothing on the server emits it, and the
`StreamEvent` type in `chat-v2/types.ts` is unused. `preview` and `components`
can coexist on one message.

---

## Adding a new tool — checklist

1. Decide the layer:
   - **Agent-callable** (model orchestrates) → add the definition to `ALL_TOOLS` in `tools.ts`, **a `case` in `executeTool`** plus its executor in `tool-executors.ts`, and the tool name to the `UserBehaviorEvent.tool` union in `chat-v2/types.ts`. If it returns a new `data.component`, add it to `projectComponent` in `streaming.ts` and a render branch in `ChatResultsContainer.tsx`
   - **Deterministic** (parser triggers it) → add the intent to `Intent` + the detection in `query-parser.ts`, add an `if (parsed.intent === ...)` branch in `preview.ts`
2. Update `PreviewResult` in `src/lib/chat-search/types.ts` if the primitive returns a new component shape
3. Add a renderer branch in `src/app/components/chat-v3/PreviewRenderer.tsx`
4. Add a context block in `narrate.ts:describeContext()` so the narrator gets AUTHORITATIVE data
5. Add a per-intent rule in `NARRATOR_PROMPT` (tone, what to quote, what not to invent)
6. **Update this file** — add the row to the right table
7. Smoke-test on the `/chat-v3` sandbox page (or `/chap`) before shipping
