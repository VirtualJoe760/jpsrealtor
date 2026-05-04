# Chat Migration Roadmap — Search-First Architecture

**Status**: Planning → Phase 1
**Target branch**: `chatlistings`
**Last updated**: 2026-05-04

## Goal

Replace the agent-loop-first `/api/chat-v2` powering `/chap` with a search-first
flow validated in `/test-chat`. The end state: parser resolves intent →
preview runs deterministic data lookup → narrator speaks over the resolved
data → agent loop survives only as a Layer 3 fallback for conversational and
low-confidence queries.

The new chat lands at `/chat-v3` (this roadmap's build target). Once stable,
it replaces `/chap` in place.

## Why this migration

The current `/api/chat-v2` calls Groq with all tools available and lets the
model orchestrate. That works for one-shot lookups but produces:

- **Non-deterministic latency** (1–60s depending on tool-call count)
- **Hallucinated counts** ("8 active listings" when there are 28) because the
  model can't see whether its tools agreed with each other
- **Component drift** — tools emit components, the model emits prose, the
  two are reconciled on the client by a regex strip

`/test-chat` proved a different architecture: deterministic data lookup
first, AI narrates over that data. The narrator can't fabricate numbers
because they're injected as authoritative context. Components render from
preview output, not from tool result metadata. Latency is bounded by the
slowest of preview + narrate (typically 300–1500ms total).

## Constraints to preserve through the migration

- **SSE contract** — ChatWidget reads `content` / `token` / `components` /
  `tool_calls` / `done`. New API must emit the same shape.
- **`locationSnapshot` mode** — map-bar overviews skip tools and emit a
  brief markdown response. Preserve.
- **Multi-turn history** — chat persists 5 conversations with their
  components attached. New flow must serialize compatibly.
- **Auth + userId enforcement** — session userId always wins over body.

## Phases

### Phase 1 — Lift test-chat into shared modules

Move the route logic into `src/lib/chat-search/` so both `/test-chat` and
the new `/api/chat-v3` can use it.

- `src/lib/chat-search/parse.ts` — `parse(message): Promise<ParsedQuery>`
- `src/lib/chat-search/preview.ts` — `runPreview(parsed): Promise<PreviewResult>`
  (the big intent switch from `api/test-chat/preview/route.ts`)
- `src/lib/chat-search/narrate.ts` — `streamNarration({parsed, preview, searchResults}): AsyncIterable<string>`
- `src/lib/chat-search/types.ts` — `PreviewResult`, `NarrationOptions`, etc.

Test-chat routes become 10-line wrappers calling the lib functions.

**Gate**: `/test-chat` works end-to-end on the new modules with no behavior
change.

### Phase 2 — Build `/api/chat-v3` SSE endpoint

New POST route. Same SSE contract as `/api/chat-v2` so the client widget
swap is the only client-side change.

Flow per request:
1. Auth + extract last user message
2. Detect commands (`/help` etc) — same fast-path as v2
3. If `locationSnapshot` set → emit brief markdown overview (no tools), done
4. If `messages.length > 2` → fall through to Layer 3 agent loop (multi-turn)
5. `parsed = await parse(lastMessage.content)`
6. If `parsed.intent === "conversational"` or `parsed.confidence < 0.5` →
   Layer 3 fallback
7. Else: run `runPreview(parsed)` and emit one `components` SSE event from
   the result, then stream narration tokens via `streamNarration(...)`,
   then `{done: true}`

Layer 3 fallback reuses the existing `streamWithToolSupport` from
`src/lib/chat-v2/streaming.ts` — no rewrite needed.

**Gate**: hitting `/api/chat-v3` from a curl with a sample query streams
back a valid SSE response with components + narration.

### Phase 3 — Build `/chat-v3` page + new ChatWidget

The page mirrors `/chap` structurally (map, filters, favorites, listing
panels) but the chat surface is a new `ChatWidgetV3` that:

- Hits `/api/chat-v3` instead of `/api/chat-v2`
- Renders components from the `components` SSE event using the same
  renderer logic as test-chat's `ComponentPreview` (CMAReport, AppreciationContainer,
  ListingCarousel, ListingListView, ListingDetailCard, ArticleResults,
  SubdivisionCmaSection)
- Persists the same `ComponentData` shape into chat history so existing
  conversation persistence keeps working

The map / filters / favorites stay shared — `/chat-v3/page.tsx` imports
the same MapLayer, MapSearchBar, FavoritesPannel, ListingBottomPanel as
`/chap/page.tsx`.

**Gate**: `/chat-v3` end-to-end test — type a query, see narration stream
in, components render below, conversation persists across reloads.

### Phase 4 — Component parity audit

Walk every test-chat preview output type through `/chat-v3` and confirm
the rendered component matches `/mls-listings/[slugAddress]` and the
subdivision pages where applicable. Bridge any gaps.

| Preview component | Renderer | Status |
|---|---|---|
| `listingDetail` | `ListingDetailCard` | needs verify |
| `neighborhood` / `areaStats` | `AreaStatsCard` + `ListingCarousel` | needs verify |
| `listingResults` | `ListingListView` | needs verify |
| `compare` | `SubdivisionComparisonChart` | needs verify |
| `trend` | `AppreciationContainer` | wired in test-chat |
| `cma` (listing) | `CMAReport` | wired in test-chat |
| `cma` (subdivision) | `SubdivisionCmaSection` | wired in test-chat |
| `articles` | `ArticleResults` | wired in test-chat |

**Gate**: every test-chat output renders identically in `/chat-v3`.

### Phase 5 — Narrator routing

Reuse `resolveRouting()` heuristic but key off `parsed.intent`:

- `listing-detail` / `listing-search` / single-scope `aggregate` → `llama-3.1-8b-instant` (~1s)
- `compare` / `cma` / `trend` with explanation → reasoning model (Opus 4.6 or DeepSeek-R1)
- `conversational` → handled by Layer 3 fallback, doesn't go through narrator

### Phase 6 — Multi-turn handling

v1: any `messages.length > 2` falls through to Layer 3. The agent loop
already handles follow-ups naturally with full conversation context.

v2 (later): re-parse with previous turn's resolved entity carried as
context so "show me the 4-bed ones" routes through the search-first path
inheriting the prior subdivision.

### Phase 7 — Cutover

- Stabilize `/chat-v3` for ~1 week of internal use
- Once parity is validated: rename `/chap` → `/chap-legacy` (kept for 1
  release as escape hatch), rename `/chat-v3` → `/chap`
- Update redirects in `proxy.ts` and any nav links
- Delete `/api/chat-v2` route after 2 weeks of `/api/chat-v3` stability
- `/test-chat` stays as the dev sandbox for future intents

### Phase 8 — Cleanup

- Update `docs/chat-production/architecture.md` to reflect live wiring
- Move chat-v2 tools that are no longer reachable from the agent loop into
  archive or delete
- Document the chat-search lib module surface for future contributors

## Open decisions (settle before Phase 2)

1. **Search results in narrator**: test-chat passes both `searchResults` and
   `preview` to the narrator. Production may not need both — the preview
   already carries the resolved data. Drop `searchResults` from the
   narrator? Default: keep, evaluate after Phase 4.

2. **Parallel preview + narration**: test-chat runs them sequentially
   (preview first so the narrator gets stats). We could parallelize by
   emitting components mid-narration. Halves perceived latency. Worth doing
   in Phase 2 or defer? Default: defer to Phase 5.

3. **Caching**: pre-built CMA + subdivision stats are stable for ~3 days.
   Worth caching hot queries in process memory? Default: skip for v1, add
   if logs show high re-query rate.

## File map

New files this migration will introduce:

```
src/lib/chat-search/
  parse.ts
  preview.ts
  narrate.ts
  types.ts

src/app/api/chat-v3/
  route.ts

src/app/chat-v3/
  page.tsx

src/app/components/chat-v3/
  ChatWidget.tsx        # new widget (or wrap existing one)
  MessageRenderer.tsx   # renders narration + component
  ComponentRenderer.tsx # the test-chat ComponentPreview equivalent
```

Files this migration will modify:

```
src/app/api/test-chat/parse/route.ts     → wraps lib/chat-search/parse
src/app/api/test-chat/preview/route.ts   → wraps lib/chat-search/preview
src/app/api/test-chat/narrate/route.ts   → wraps lib/chat-search/narrate
```

Files this migration will not touch (until Phase 7 cutover):

```
src/app/chap/page.tsx
src/app/api/chat-v2/route.ts
src/app/components/chat/ChatWidget.tsx
src/lib/chat-v2/streaming.ts             # reused as Layer 3 fallback
```

## Definition of done

- `/chat-v3` works end-to-end for these canonical queries:
  - `cma for 77095 desi drive` → CMAReport
  - `cma for indian wells country club` → SubdivisionCmaSection
  - `compare PGA West vs Indian Wells Country Club` → side-by-side stats
  - `4-bed homes in palm desert under 800k` → ListingListView with stats
  - `appreciation in la quinta over 5 years` → AppreciationContainer
  - `is now a good time to sell in coachella valley` → ArticleResults + agent loop fallback
- Sub-2s p50 latency for high-confidence intents
- No regression on `locationSnapshot` mode
- Multi-turn conversations still work (via Layer 3)
- `/chap` traffic can be redirected to `/chat-v3` without client breakage
