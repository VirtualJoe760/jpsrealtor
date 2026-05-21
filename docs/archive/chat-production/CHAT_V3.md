# Chat v3 — Search-First Architecture

**Status**: Production (live in `/chap` via ChatWidget on `/api/chat-v3`)
**Branch**: `chatlistings`
**Last updated**: 2026-05-04

---

## What chat-v3 is

`chat-v3` replaces the agent-loop-first chat pipeline with a deterministic
**parser → preview → narrate** pipeline. The agent loop survives only as a
Layer 3 fallback for conversational and low-confidence queries.

The same `ChatWidget` powers `/chap` as before. The endpoint flipped from
`/api/chat-v2` to `/api/chat-v3`, and a new `preview` SSE event mounts
production components below the assistant message via `PreviewRenderer`.

## Why we moved off agent-loop-first

The previous `/api/chat-v2` called Groq with all tools available and let
the model orchestrate. That worked for one-shot lookups but produced:

- **Non-deterministic latency** — 1–60s depending on tool-call count
- **Hallucinated counts** — "8 active listings" when there were 28,
  because the model couldn't see if its tools agreed with each other
- **Component drift** — tools emitted components, the model emitted
  prose, and the two were reconciled on the client by a regex strip

The new flow runs the actual Mongo query first, hands the model a
labeled `AUTHORITATIVE` block of stats it can't fabricate around, then
streams a 1–4 sentence narration. Components render directly from the
preview output, not from tool result metadata.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ POST /api/chat-v3                                               │
│                                                                 │
│ 1. Auth + commands fast-path (slash commands → markdown event)  │
│ 2. locationSnapshot → Layer 3 with snapshot system prompt       │
│ 3. parse(lastMessage) → ParsedQuery                             │
│ 4. If conversational || confidence < 0.5 → Layer 3 fallback     │
│ 5. Else: runPreview(parsed) → emit one `preview` event          │
│         → streamNarration(...) → emit `token` events            │
│         → emit `done`                                           │
└─────────────────────────────────────────────────────────────────┘
```

### Layer 0 — Parser (`src/lib/chat-search/parse.ts`)

Thin re-export of `parseQuery` from `src/lib/chat-v2/query-parser.ts`.
Classifies the message into one of:
- `listing-detail` (specific property)
- `listing-search` (filter + scope)
- `street-listings` (bare street name)
- `aggregate` (stats over a scope)
- `compare` (two scopes)
- `trend` (appreciation analytics)
- `cma` (listing or subdivision-level CMA)
- `insights` (educational / article-driven)
- `conversational` (everything else)

Plus resolves entities via the LocationIndex (cities, subdivisions,
counties, addresses, streets) and extracts filters (price, beds, baths,
HOA, amenities, etc.).

### Layer 1 — Preview (`src/lib/chat-search/preview.ts`)

`runPreview(parsed)` dispatches to the right Mongo primitive per intent
and returns a `PreviewResult` shape:

| Intent | Primitive | Component returned |
|---|---|---|
| `listing-detail` | `findOne` by houseNumber + slug | `listingDetail` |
| `listing-search` | `buildListingQuery + computeAreaStats + find(6)` | `neighborhood` |
| `aggregate` | `computeAreaStats` ($facet) | `areaStats` |
| `street-listings` | `buildListingQuery + find(20)` | `listingResults` |
| `compare` | `computeAreaStats × 2` (parallel) | `compare` |
| `trend` | `/api/analytics/appreciation` | `trend` |
| `insights` | `Article.find $text $search` | `articles` |
| `cma` (address) | `findOne + adaptPrebuiltCmaStats` | `cma` (listing scope) |
| `cma` (subdivision) | `Subdivision.findOne` | `cma` (subdivision scope) |

The preview always returns a fully-formed object; null components fall
to Layer 3.

### Layer 2 — Narrator (`src/lib/chat-search/narrate.ts`)

Two entry points:
- `narrate(input)` — JSON one-shot, used by `/api/test-chat/narrate`
- `streamNarration(input)` — async generator yielding token strings,
  used by `/api/chat-v3` for SSE

Builds a context block via `describeContext()` that labels Layer 1
stats as **AUTHORITATIVE** so the model quotes them verbatim. Hard rules
in the system prompt forbid fabrication, banned openings ("I pulled..."),
and meta-narration ("the search router found..."). Per-intent rules
shape tone — direct for listing-detail, headline-first for
aggregate/listing-search, comp-aware for CMA.

Default model: `llama-3.1-8b-instant` on Groq (~1s, fast enough to feel
synchronous after the preview lands).

### Layer 3 — Agent loop fallback

When the parser yields `conversational` or `confidence < 0.5`, the
route hands off to `streamWithToolSupport` from
`src/lib/chat-v2/streaming.ts` — the same engine that powered chat-v2.
This is also where:
- Multi-turn follow-ups land ("show me the 4-bed ones") because the
  parser correctly returns low-confidence on context-dependent queries
- locationSnapshot (map-bar overviews) lands with a tools-disabled
  system prompt
- Anything we haven't migrated yet

---

## SSE protocol

`/api/chat-v3` emits these event shapes (matches chat-v2 plus one new
event for search-first):

```
data: {"content": "..."}        # full markdown (commands, snapshots)
data: {"token": "..."}          # one narration token (search-first)
data: {"preview": {...}}        # Layer 1 component payload (search-first)
data: {"components": {...}}     # legacy chat-v2 component map (Layer 3)
data: {"tool_calls": [...]}     # Layer 3 tool-call metadata
data: {"done": true}            # stream terminator
```

Both `preview` and `components` can coexist on a single message:
search-first turns set `preview`; agent-loop turns set `components`.
The renderer picks whichever is present.

---

## File map

```
src/lib/chat-search/             # shared lib used by /api/chat-v3 and /api/test-chat
  parse.ts                         # Layer 0 — re-export of chat-v2 query-parser
  preview.ts                       # Layer 1 — intent dispatcher
  narrate.ts                       # Layer 2 — Groq narration (JSON + streaming)
  types.ts                         # PreviewResult / NarrationInput / SearchResultRow

src/app/api/chat-v3/route.ts       # production SSE endpoint
src/app/api/chat-v2/route.ts       # legacy endpoint (still wired up; not user-facing)

src/app/api/test-chat/             # sandbox for iterating on the pipeline
  parse/route.ts                     # POST { message } → { parsed }
  preview/route.ts                   # POST { parsed } → PreviewResult
  narrate/route.ts                   # POST { message, parsed, preview, ... } → { narration }

src/app/components/chat-v3/
  PreviewRenderer.tsx                # mounts the right production component per PreviewResult

src/app/components/chat/
  ChatWidget.tsx                     # production widget — calls /api/chat-v3, captures preview
  ChatProvider.tsx                   # ChatMessage now carries optional preview field
  ChatResultsContainer.tsx           # legacy components renderer (Layer 3 fallback)

src/app/chat-v3/page.tsx           # standalone chat-v3 sandbox (no map / filters)
src/app/chap/page.tsx              # production home page — uses ChatWidget on /api/chat-v3
src/app/test-chat/page.tsx         # parser + preview + narrator side-by-side validator
```

---

## CMA integration

CMAs route through the `cma` intent. Two scopes:

### Listing-level CMA

Triggered by an `address` entity ("cma for 77095 desi drive").

- Resolution: `slugAddress` regex `^${houseNum}-` (status-agnostic — CMA
  applies to Active/Pending/Closed)
- Data: `UnifiedListing.cmaStats` subdoc (Schema.Types.Mixed) written by
  `build-listing-cma.py` on a twice-weekly VPS cron (Mon + Thu 1 AM)
- Adapter: `adaptPrebuiltCmaStats(stats, listing)` bridges the Python
  flat shape to the TS `ResolvedAttribute` shape components expect
- Render: `<CMAReport listingKey={...} subdivisionName={...} result={preloaded} />`
- Fallback: when `cmaStats` is missing, `result` is undefined and
  `CMAReport` falls back to `/api/cma/generate` on its own

### Subdivision-level CMA

Triggered by a `subdivision` entity ("cma for indian wells country club").

- Resolution: `Subdivision.findOne({ $or: [{slug}, {name}] })` to verify
  existence; slug derived from the entity name if not already on it
- Data: lazy-fetched by the section component via
  `/api/cma/subdivision/[slug]` under an IntersectionObserver
- Render: `<SubdivisionCmaSection slug={...} />`

### Components inside a CMA report

`CMAReport` (listing) renders, in order:
1. **Header** — title + tier + comp counts
2. **Subject + Narrative** — 2-column grid with `CMASubjectCard` + `CMANarrative`
3. **Price Position** — `<PricePositionCard>` (premium / at-market / advantage)
4. **Active Comparables** — `<CMACompTable>` table
5. **Closed Comparables** — `<CMACompTable>` table
6. **Market Analysis** — 2×2 chart grid (PricePerSqftBar, PriceTrendLine,
   DaysOnMarketBar, SalePriceRatioPie)
7. **Comparable Properties Map** — `<ListingsMap>`
8. **AI disclaimer** — amber callout with `useAgentProfile()`-resolved
   contact (name, tel, email)

`CMACompTable` column visibility:
- `Listing #` — removed (useless 26-digit MLS keys)
- `Date` — closed only (it's the close date)
- `LP/SqFt` — active only (closed reports `SP/SqFt` instead)
- `Orig LP` — removed (Python schema doesn't carry it)
- `P/S/G` — hidden until the Python builder normalizes `pool/spa`
  field-name variants on comp objects (see
  `docs/cma/BACKEND_FIX_COMP_POOL_SPA.md`)

### Price Position Card

`<PricePositionCard>` evaluates the subject against the **closed median**
(truer signal — what people actually paid) and the **active median**
(what's currently competing). Two dimensions:
- Total list price (vs `stats.closed.medianPrice`, `stats.active.medianPrice`)
- Price per sqft (vs `stats.closed.avgPricePerSqft`, `stats.active.avgPricePerSqft`)

Threshold: ±5% defines "at market." Outside that:
- **Premium** (≥+5%) — "Positioned above the market — commands a premium"
- **At market** (within ±5%) — "Aligned with the market — fair pricing"
- **Price advantage** (≤−5%) — "Priced below the market — value advantage"

Both ends are framed positively. Sellers see premium positioning;
buyers see value. The narrator can quote either depending on audience.

### AI disclaimer

Every CMAReport ends with an amber callout reading:

> ✨ AI-generated CMA · This analysis was generated automatically from
> MLS data. For an in-depth, human-reviewed valuation, contact
> {agent.name} at {agent.phone} or {agent.email}.

The agent profile comes from `useAgentProfile()` which hits
`/api/agent/public` and falls back to Joseph's contact info.

---

## ChatMessage shape

`src/app/components/chat/ChatProvider.tsx` defines:

```ts
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  timestamp: Date;
  listings?: Listing[];
  components?: ComponentData;       // legacy chat-v2 shape (agent-loop turns)
  preview?: PreviewResult | null;   // chat-v3 search-first shape
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}
```

Both `components` and `preview` are optional. ChatWidget renders both
side-by-side: `<ChatResultsContainer components={...}>` for the legacy
shape and `<PreviewRenderer preview={...}>` for the new shape.

---

## Adding a new intent

1. **Parser** — add the intent to `Intent` union in
   `src/lib/chat-v2/query-parser.ts` and a detection branch in
   `parseQuery`. Set confidence ≥ 0.5 to skip Layer 3 fallback.
2. **Preview** — add an `if (parsed.intent === "<your-intent>")` block
   in `src/lib/chat-search/preview.ts` returning a `PreviewResult` with
   a `component` discriminator.
3. **Renderer** — add a branch in
   `src/app/components/chat-v3/PreviewRenderer.tsx` that mounts the
   right production component for your discriminator.
4. **Narrator** — add a per-intent paragraph to the system prompt in
   `src/lib/chat-search/narrate.ts` describing tone and what data to
   quote. Add a context-builder branch in `describeContext()` for the
   `AUTHORITATIVE` data block.
5. **Test** — add a canonical query to `/test-chat` and confirm
   end-to-end before shipping.

---

## Production cutover notes

What changed when chat-v3 went live:

- **`ChatWidget.tsx`** — three `/api/chat-v2` → `/api/chat-v3` swaps;
  added `data.preview` capture in the SSE stream loop; passed `preview`
  to `addMessage(...)`; mounted `<PreviewRenderer>` next to
  `<ChatResultsContainer>` in the message render
- **`ChatProvider.tsx`** — added `preview?: PreviewResult | null` to
  `ChatMessage`; widened `addMessage` signature; spread `preview` into
  the new message object
- **`/api/chat-v2`** — left wired up. No traffic flows through it from
  the production UI but it's not deleted (escape hatch for one release)

Rollback: revert the three URL swaps in `ChatWidget.tsx`. The new lib
modules and routes coexist with the legacy ones.

---

## Open work

- **Phase 4** — full component-shape parity audit (listingDetail,
  neighborhood, areaStats, listingResults, compare, articles all need
  the same end-to-end check that CMA + trend already passed)
- **Phase 5** — narrator routing by intent (reasoning model for
  compare / multi-step CMA narratives; instant model for simple
  intents)
- **Phase 6** — multi-turn entity carry-forward ("show me the 4-bed ones
  in that subdivision" inheriting prior context) — currently falls to
  Layer 3, which works but loses the search-first speed advantage
- **Backend Python** — fix `build-listing-cma.py` to write `pool` /
  `spa` on comp objects under canonical field names so the P/S/G
  column can come back (`docs/cma/BACKEND_FIX_COMP_POOL_SPA.md`)

---

## Definition of done (canonical queries)

These should all work end-to-end on `/chap`:

| Query | Expected component |
|---|---|
| `cma for 77095 desi drive` | `CMAReport` (listing) |
| `cma for indian wells country club` | `SubdivisionCmaSection` |
| `compare PGA West vs Indian Wells Country Club` | side-by-side stats |
| `4-bed homes in palm desert under 800k` | `ListingListView` |
| `appreciation in la quinta over 5 years` | `AppreciationContainer` |
| `is now a good time to sell in coachella valley` | `ArticleResults` (Layer 3) |
| `tell me about indio` (map snapshot) | brief markdown overview |
| `show me the 4-bed ones` (follow-up) | Layer 3 with prior context |
