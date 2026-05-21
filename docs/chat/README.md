---
title: Chat / CHAP
status: current
last_verified: 2026-05-21
related: [../listings/README.md, ../multi-tenant/README.md]
supersedes: docs/chat-production/CHAT_V3.md
---

# Chat / CHAP

## TL;DR

**CHAP = Chat + Map**, the unified conversational real-estate experience and the platform's core differentiator. A user types ("homes in PGA West under $1.2M with a pool", "cma for 77638 via venito", "what's the appreciation in La Quinta"), CHAP parses the intent, runs a deterministic Mongo lookup, narrates the result in 1–4 sentences with a fast LLM, and mounts a production component (listing card, stats, CMA report, appreciation chart, article picker) right below the response. The map view is part of the same surface — geolocation-aware, POI-aware, and tied to the chat session. The chat-v3 architecture (May 2026) replaced the agent-loop-first chat-v2; legacy intent-classifier docs are stale.

## Files

| Path | Purpose |
|---|---|
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\chat-search\parse.ts` | Layer 0 — message → ParsedQuery (thin wrapper over chat-v2 query-parser) |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\chat-search\preview.ts` | Layer 1 — intent dispatcher → PreviewResult |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\chat-search\narrate.ts` | Layer 2 — Groq narrator (one-shot + streaming) |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\chat-search\nearby-pois.ts` | POI bundle for `locationSnapshot` map-bar overviews |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\chat-search\types.ts` | `ParsedQuery`, `PreviewResult`, `NarrationInput` shapes |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\chat-v3\route.ts` | Production SSE endpoint |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\chap\page.tsx` | CHAP page — ChatWidget + MapLayer co-located |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\components\chat\ChatWidget.tsx` | The widget that calls `/api/chat-v3` and renders the message stream |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\components\chat\ChatProvider.tsx` | Conversation state, persistence (5 convos), preview field on messages |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\components\chat-v3\PreviewRenderer.tsx` | Maps `PreviewResult.component` → production component |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\map\resolve-spawn-point.ts` | Geolocation → Palm Desert fallback for map spawn |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat-production\TOOLS_INDEX.md` | **Tools registry — source of truth** |

## The 4-layer architecture (chat-v3, May 2026)

The old `/api/chat-v2` was agent-loop-first: it handed Groq every tool and let the model orchestrate. That produced non-deterministic latency (1–60s), hallucinated counts (model said "8 listings" when Mongo had 28), and tool/prose drift the client had to reconcile with regex. chat-v3 inverts the flow — Mongo runs first, the LLM speaks over an `AUTHORITATIVE` block of stats it cannot fabricate around. Production endpoint is `/api/chat-v3` for `/chap`.

### Layer 0 — Parse

`F:\web-clients\joseph-sardella\jpsrealtor\src\lib\chat-search\parse.ts`

User message → `ParsedQuery` with `{ intent, entities, filters, confidence, raw }`. Currently a thin re-export of `chat-v2/query-parser.ts` — kept as its own module so the future LLM intent classifier only touches one import surface.

Intents: `listing-detail`, `listing-search`, `street-listings`, `aggregate`, `compare`, `trend`, `cma`, `insights`, `conversational`.

### Layer 1 — Preview

`F:\web-clients\joseph-sardella\jpsrealtor\src\lib\chat-search\preview.ts`

`runPreview(parsed)` dispatches the intent to a Mongo primitive and returns a `PreviewResult` whose `component` field tells the UI what to mount. See the TOOLS_INDEX table (below) for the full intent → primitive → component mapping. The dispatcher also runs a **"Describe X"** pre-check (`tell me about X / what about X / details for X / describe X / info on X`) that strips the preamble and routes by the top hit's type — this is the scalable, suffix-agnostic address-resolution path. There's also a `cma` search-index fallback that auto-promotes full-address queries (house # + ZIP) directly into a listing CMA instead of showing a disambiguation picker.

### Layer 2 — Narrate

`F:\web-clients\joseph-sardella\jpsrealtor\src\lib\chat-search\narrate.ts`

Two entry points: `narrate(input)` returns the full JSON; `streamNarration(input)` is an async generator yielding tokens for SSE. Both call Groq with a system prompt that bans meta-narration ("the search router found..."), bans robot openings ("I pulled..."), forbids fabrication, and enforces per-intent rules (lead with the headline for aggregate, lead with the answer for insights, single sentence for CMA, etc.). The narrator quotes `totalListings` from the Layer 1 stats block verbatim — if Layer 1 says 28, the LLM must say 28, even if autocomplete only returned 6 disambiguation rows.

Default model: `llama-3.1-8b-instant` on Groq, ~1s for a 1–4 sentence response. The narrator never sees raw documents — it sees `describeContext()` output, a labeled `AUTHORITATIVE` block of numbers.

### Layer 3 — UI / Agent loop fallback

`PreviewRenderer.tsx` mounts the right production component (`ListingDetailCard`, `AreaStatsCard`, `CMADisplay`, `AppreciationContainer`, `ListingOptionsCard`, `ArticleCard`, etc.) below the streaming narration. When the parser yields `conversational` or `confidence < 0.5`, the route hands off to `streamWithToolSupport` from `src/lib/chat-v2/streaming.ts` — the agent loop survives as fallback only, not the primary path. Multi-turn follow-ups ("show me the 4-bed ones") land here because they're context-dependent.

## Map integration

CHAP's map is **MapLibre-based**, co-located with the chat widget on the same page (`/chap`). The chat doesn't fork to a separate map view — it transitions in-place via a clip-path wipe. When the chat surfaces a result with coordinates (a listing, a neighborhood), the map can be pre-positioned via `viewState`; when the user manually toggles the map without a pre-positioned target, `resolveSpawnPoint()` runs:

1. Browser geolocation prompt → use those coords if California
2. Outside CA / denied / timed out → Palm Desert default

Map view is **session-scoped, tied to the chat session, and resets on New Chat**. Deep links (`?view=map&lat=…&lng=…&zoom=…`) skip the spawn resolver and honor the URL coords directly. URL is treated as the user's most recent intent — sidebar "Chat" button navigation (`router.push("/chap")`) closes the map even if session state had it open, because the URL says no map.

## POI display

POIs come from the `points_of_interest` collection (Google Places sync). Two-tier display rule:

| Tier | Zoom | Rendering |
|---|---|---|
| Communities (large landmarks) | 13+ | Individual labeled markers |
| Everything else (restaurants, parks, golf, shopping, etc.) | 15+ | Clustered, expand on zoom-in |

Clicking any POI opens an **info panel**. The map-search-bar overview mode (`locationSnapshot`) also pulls a categorized POI bundle via `fetchNearbyPOIs(name, type, radiusMiles)` and `describePOIBundle()` injects it into the system prompt — the snapshot narrator quotes 2–3 POIs by name from that authoritative list, never inventing businesses.

## Tools registry — the sync rule

**`F:\web-clients\joseph-sardella\jpsrealtor\docs\chat-production\TOOLS_INDEX.md` is the source of truth.** It enumerates everything the chat can call, dispatch, or emit across all three layers — Layer 1 preview primitives, Layer 3 agent-loop tools, and `chatv3:*` window events. Any new tool, any new preview intent, any new `chatv3:*` event MUST land in TOOLS_INDEX in the same commit it's introduced. Forget this and the tool will silently break (autocomplete won't know about it, the docs will be wrong, future Claude won't be able to find it).

The corresponding source files to update in sync:

| Layer | File |
|---|---|
| Layer 1 preview primitives | `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\chat-search\preview.ts` |
| Layer 3 agent-loop tools | `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\chat-v2\tools.ts` |
| Layer 3 executors | `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\chat-v2\tool-executors.ts` |
| UI renderer | `F:\web-clients\joseph-sardella\jpsrealtor\src\app\components\chat-v3\PreviewRenderer.tsx` |
| Window events | wherever they're dispatched / listened |
| **Registry** | `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat-production\TOOLS_INDEX.md` |

## Chat history / persistence

The root home (`/`) uses `?view=` params (`chat`, `map`) — insights is the default view. CHAP at `/chap` does the same with `?view=map`. ChatProvider persists conversations to localStorage with a **5-conversation cap** (FIFO eviction). Each `ChatMessage` carries an optional `preview` field (Layer 1 result) alongside the legacy `components` field (Layer 3 result), so message replay can re-mount whichever was originally emitted. New Chat resets the map's `viewState`, so the spawn point re-resolves on next map toggle.

## Gotchas

- **TOOLS_INDEX sync.** New `tools.ts` entries, new `preview.ts` intents, new `chatv3:*` events MUST update `docs/chat-production/TOOLS_INDEX.md` in the same commit. This is the most common drift in this subsystem.
- **Map view is session-scoped.** New Chat resets `viewState`; the spawn point re-resolves on next toggle. Don't try to persist map state across chats — it's intentional.
- **URL wins over saved state for `?view=map`.** Clicking the sidebar "Chat" link closes the map even if session state had it open. Don't add code that re-adds `?view=map` from state.
- **Narrator uses Groq (`llama-3.1-8b-instant`).** ~1s response, ~$0.0001/call. Per memory, the operator was experimenting with `openai/gpt-oss-120b` for higher quality — confirm current model against `DEFAULT_MODEL` in narrate.ts before quoting cost. The narrator can ONLY use data in the context block — it's prompted hard against fabrication, but cheap models still sometimes break the rule on edge cases. The `AUTHORITATIVE` label is doing real work.
- **Layer 1 stats vs. autocomplete count.** When Layer 1 returns 28 listings and autocomplete only returned 6 rows, the narrator MUST quote 28. The narrator prompt forbids counting the autocomplete candidates, but if you tweak `describeContext()` you can accidentally break this guarantee — review tests after any context-block change.
- **chat-v3 SUPERSEDED chat-v2 entirely** (intent-classifier era). The legacy `/docs/chat/` and `/docs/chat-v2/` directories are all stale — the parser primitive in `chat-v2/query-parser.ts` is still used (re-exported by Layer 0), but everything else in those docs (tool conflicts, intent classification troubleshooting, chat-v2 rewrite plans) is history.
- **The "agent loop" still exists** as the Layer 3 fallback, but most production traffic never hits it. If you're debugging "why is the chat slow / why is it inventing stuff", first confirm whether the request went through Layer 1 (deterministic, fast, AUTHORITATIVE) or fell through to Layer 3 (agent loop, slower, freer-form).
- **`locationSnapshot` mode** (map-bar search) bypasses Layer 1 entirely. It runs `fetchNearbyPOIs` + a snapshot system prompt against Layer 3 directly. Different SSE event (`content` not `token`).

## Reference implementation

The preview dispatcher in `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\chat-search\preview.ts` is the canonical reference for how an intent is resolved. It shows: how entities translate to a `ListingScope`, how `LISTING_PROJECTION` is the canonical Mongo projection for chat surfaces, how photos are batch-fetched from Spark as a fallback (`fetchPrimaryPhotos`), how the sale-first preference works (`propertyType='A'` before falling through to ANY), and how the search-index fallback re-ranks hits when `$text` scoring returns false positives. Read it before adding a new intent.

## Related

- [routing/README.md](../routing/README.md) — how the host/subdomain proxy lands traffic on `/chap`
- [multi-tenant/README.md](../multi-tenant/README.md) — agent scoping (the chat itself is not currently agent-scoped, but downstream lead capture is)
- `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat-production\TOOLS_INDEX.md` — full tool/intent/component table
- `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat-production\CHAT_V3.md` — current canonical architecture doc (superseded by this README; move to archive)
- `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat-production\MIGRATION_ROADMAP.md` — phase plan for the chat-v3 cutover

---

## Migration log (legacy doc audit)

Audit performed 2026-05-21. **Nothing was moved or deleted** — actions are documented for a future archive sweep.

### `docs/chat/` — ENTIRE DIRECTORY → ARCHIVE

Intent-classifier era (pre-v3). All references to the intent classifier, system-prompt tool conflicts, and Dec-19 troubleshooting are stale. The parser primitive in `chat-v2/query-parser.ts` is still in use (Layer 0 re-exports it), but no doc in this folder reflects the chat-v3 dispatch flow.

| File | Classification | Action |
|---|---|---|
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat\ARCHITECTURE.md` | OUTDATED | Archive |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat\CHAT_V2_REWRITE_PLAN.md` | HISTORICAL | Archive |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat\GRACEFUL_ERROR_RECOVERY_DEC19.md` | HISTORICAL | Archive |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat\INTENT_CLASSIFICATION.md` | OUTDATED | Archive |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat\INTENT_CLASSIFICATION_IMPROVEMENTS_DEC19.md` | HISTORICAL | Archive |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat\README.md` | OUTDATED | Archive |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat\SYSTEM_PROMPT_TOOL_CONFLICT_FIX_DEC19.md` | HISTORICAL | Archive |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat\TESTING.md` | OUTDATED (pre-v3 test plan) | Archive |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat\TOOLS.md` | OUTDATED — superseded by `docs/chat-production/TOOLS_INDEX.md` | Archive |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat\TROUBLESHOOTING.md` | OUTDATED | Archive |

### `docs/chat-v2/` — ENTIRE DIRECTORY → ARCHIVE

chat-v2 (agent-loop-first) era. The tool definitions in `tools.ts` it documents are still partially live as the Layer 3 fallback, but the architecture, filtering deep-dives, and city/sort implementation notes are all pre-v3 and have been superseded by the chat-v3 dispatch.

| File | Classification | Action |
|---|---|---|
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat-v2\ADDING_TOOLS.md` | OUTDATED — supplanted by TOOLS_INDEX sync rule | Archive |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat-v2\CHAT_SWIPE_QUEUE.md` | PARTIAL — swipe queue still exists in `/chap` map, but doc predates current flow | Archive (re-derive if needed) |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat-v2\CITIES_IMPLEMENTATION_ACTION_PLAN.md` | HISTORICAL | Archive |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat-v2\CITIES_IMPLEMENTATION_CHECKLIST.md` | HISTORICAL | Archive |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat-v2\CITY_LISTINGS_FILTERING_DEEP_DIVE.md` | OUTDATED — filtering now in `chat-v2/listing-query.ts`, reused by Layer 1 | Archive |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat-v2\COMPREHENSIVE_FILTERING_SYSTEM.md` | OUTDATED | Archive |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat-v2\ENTITY_RECOGNITION_OPTIMIZATION_PLAN.md` | HISTORICAL | Archive |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat-v2\SESSION_SUMMARY_DEC_19_CONTINUATION.md` | HISTORICAL | Archive |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat-v2\SORTING_OPTIONS_IMPLEMENTATION.md` | HISTORICAL | Archive |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat-v2\README.md` | OUTDATED | Archive |

### `docs/chat-production/` — MIXED

The three roadmap/architecture/registry docs are the **current canonical reference**. The phase summaries, chat-analysis, latency-deep-dive, and the pre-v3 architecture.md document the journey to chat-v3 and are HISTORICAL.

| File | Classification | Action |
|---|---|---|
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat-production\CHAT_V3.md` | CURRENT — superseded by this docs-v2/chat/README.md | Add `supersedes`, move to archive |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat-production\TOOLS_INDEX.md` | **CURRENT** | Keep — this is the source of truth for tools |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat-production\MIGRATION_ROADMAP.md` | CURRENT (phase plan, historical-leaning) | Keep, mark `status: partial` once cutover is fully complete |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat-production\architecture.md` | HISTORICAL — pre-v3 architecture | Archive |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat-production\chat-analysis.md` | HISTORICAL — analysis driving the chat-v3 design | Archive |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat-production\latency-deep-dive.md` | HISTORICAL — root-cause analysis for v2 latency | Archive |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat-production\phase-1-summary.md` | HISTORICAL — phase log | Archive |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat-production\phase-2-summary.md` | HISTORICAL | Archive |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat-production\phase-3-summary.md` | HISTORICAL | Archive |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat-production\phase-4-summary.md` | HISTORICAL | Archive |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\chat-production\phase-4-addendum.md` | HISTORICAL | Archive |

### Other chat-adjacent docs

| File | Classification | Action |
|---|---|---|
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\architecture\CHAT_ARCHITECTURE.md` | OUTDATED (Dec 2025, pre-v3) | Archive |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\GROQ_CONTEXT_GUIDE.md` | PARTIAL (Dec 2025) — model table OUTDATED (chat-v3 uses `llama-3.1-8b-instant`, not the listed models), context-building principles may still apply | Re-derive the model table from `narrate.ts` then archive the rest |
| `F:\web-clients\joseph-sardella\jpsrealtor\docs\AI_ARCHITECTURE_CONTEXT_AWARE.md` | OUTDATED (Dec 2025, pre-v3) | Archive |
