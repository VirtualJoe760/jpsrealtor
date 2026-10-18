---
title: Chat / CHAP
status: current
last_verified: 2026-10-17
related: [./TOOLS_INDEX.md, ../listings/README.md, ../multi-tenant/README.md, ../routing/README.md, ../chatrealty-api/chap-search-pg.md]
supersedes: docs/archive/chat-production/CHAT_V3.md
---

# Chat / CHAP

## TL;DR

**CHAP = Chat + Map**, the conversational real-estate surface at `/chap` and the
platform's core differentiator. A user types ("homes in PGA West under $1.2M
with a pool", "cma for 77638 via venito", "what's the appreciation in La
Quinta"); `POST /api/chat-v3` parses the intent, runs a deterministic Mongo
lookup, streams a 1–4 sentence Groq narration over an `AUTHORITATIVE` stats
block, and the client mounts a real component (listing card, stats, CMA report,
appreciation chart, article list) under the text. Anything the parser can't pin
down falls back to a Groq tool-calling agent loop. The map lives on the same
page and is tied to the chat session. The chat-v3 pipeline (May 2026) replaced
the agent-loop-first chat-v2; the agent loop survives only as the fallback.

## Files

| Path | Purpose |
|---|---|
| `src/app/api/chat-v3/route.ts` | Production SSE endpoint (`POST`; `GET` health check) |
| `src/lib/chat-v2/query-parser.ts` | The parser itself (`parseQuery`, `Intent`, `ParsedQuery`) |
| `src/lib/chat-search/parse.ts` | Layer 0 — thin wrapper over the chat-v2 parser |
| `src/lib/chat-search/preview.ts` | Layer 1 — intent dispatcher → `PreviewResult` |
| `src/lib/chat-search/narrate.ts` | Layer 2 — Groq narrator (one-shot + streaming) and `describeContext()` |
| `src/lib/chat-search/nearby-pois.ts` | POI bundle + `resolveSnapshotMeta()` for map-bar overviews |
| `src/lib/chat-search/types.ts` | `PreviewResult`, `NarrationInput`, `SnapshotMeta` shapes |
| `src/lib/chat-v2/{tools,tool-executors,streaming,reasoning-routing,commands,system-prompt}.ts` | Layer 3 agent loop (kept as fallback) |
| `src/lib/chat-v2/listing-query.ts` | `buildListingQuery` / `computeAreaStats`, shared by Layers 1 and 3 |
| `src/app/chap/page.tsx` | CHAP page — `ChatWidget` + `MapLayer` co-located |
| `src/app/chat-v3/page.tsx` | Sandbox page on the same endpoint, no map or persistence |
| `src/app/components/chat/ChatWidget.tsx` | Calls `/api/chat-v3`, parses SSE, renders the message stream |
| `src/app/components/chat/ChatProvider.tsx` | Message state + `sessionStorage` persistence |
| `src/app/components/chat-v3/PreviewRenderer.tsx` | `PreviewResult.component` → production component |
| `src/app/components/chat/SnapshotCard.tsx` | Card above the snapshot text (hero photo, stat tiles, CTA) |
| `src/lib/map/resolve-spawn-point.ts` | Geolocation → Palm Desert fallback for map spawn |
| `docs/chat/TOOLS_INDEX.md` | **Tools registry — source of truth** |

## The pipeline

Route order in `chat-v3/route.ts`: slash command (`help` / `tutorial`) →
`locationSnapshot` body → parse → (`conversational` or confidence < 0.5 → agent
loop) → search-first. The client sends the whole message history every turn
(and a placeholder `userId: "demo-user"`); only the last user message is parsed.

### Layer 0 — Parse

`parseQuery(message)` → `{ raw, entities, filters, intent, dataset, metric?, confidence }`.
Pure function (entity lookup aside). Precedence: "I'm thinking about…" →
conversational; CMA keywords → `cma`; insights keywords → `insights`; two entities
+ compare words → `compare`; trend words → `trend`; aggregate words →
`aggregate`; address (or house # + street name) → `listing-detail`; "homes on X
Street" or a bare street name → `street-listings`; ZIP or a resolved
city / subdivision / county → `listing-search`; else `conversational`. Filters (`price`, `beds`, `pool`, `sort`,
`maxDaysOnMarket` for "new this week", `closedSinceDays`, …) come from
`extractFilters`. The intents: `listing-detail`, `listing-search`,
`street-listings`, `aggregate`, `compare`, `trend`, `cma`, `insights`,
`conversational` (the `Intent` type also lists `unknown`, which the parser never
returns). Street suffixes are a closed list on purpose — new street styles resolve
through the "describe X" search-index path in Layer 1, not by extending it.

### Layer 1 — Preview

`runPreview(parsed, { origin })` runs a "describe X" pre-check
(`tell me about / details for / describe …` → `multiSourceSearch` → route by the
top hit's type), then one `if (parsed.intent === …)` branch per intent, and
returns a `PreviewResult` whose `component` tells the UI what to mount. The full
intent → primitive → component table, including the four `cma` sub-paths and the
full-address auto-promote, is in [TOOLS_INDEX.md](./TOOLS_INDEX.md#layer-1--search-first-preview-primitives).
Listings come from `unifiedlistings` (Active only); see
[../listings/README.md](../listings/README.md). The route emits `{preview}` as
soon as this resolves, before any token.

### Layer 2 — Narrate

`streamNarration(input)` (async generator, used by the route) and `narrate(input)`
(JSON) call Groq with `NARRATOR_PROMPT`: bans meta-narration and robot openings
("I pulled…"), forbids fabrication, enforces per-intent rules (answer-first for
insights, one sentence for CMA, 2–4 for stats), and mandates quoting
`totalListings` from the Layer 1 stats verbatim even when autocomplete returned
fewer rows. Model `openai/gpt-oss-20b`, `reasoning_effort: "low"`, `temperature
0.55`, `max_tokens 400`, ~0.2 s. The narrator sees `describeContext()` output —
a labelled `AUTHORITATIVE` block — never raw documents.

### UI — render

`PreviewRenderer` maps `component` → `ListingDetailCard`, a local `StatsCard`
plus `ListingOptionsViewer` (Panel / List / Map toggle over
`ListingOptionsCarousel` + `ListingOptionsList`), `AppreciationContainer`,
`CMAReport`, `SubdivisionCmaSection`, or `ArticleResults`. In-message buttons talk
back to `ChatWidget` through `chatv3:*` window events (see TOOLS_INDEX).

### Layer 3 — Agent-loop fallback

For `conversational` / low-confidence turns (multi-turn follow-ups like "show me
the 4-bed ones" land here) the route calls `streamWithToolSupport`: up to 6
Groq rounds over the 8 tools in `tools.ts`, model `openai/gpt-oss-120b`, tool
results projected into `{components}` events that `ChatResultsContainer`
renders. Most production traffic never reaches it. Details and limits are in
TOOLS_INDEX.

### `locationSnapshot` (map-bar overview)

When the user picks a place in the map search bar, `MapSearchBar` dispatches
`requestLocationInsights`; `ChatWidget` posts `locationSnapshot {name, type}`.
The route skips Layers 0–2: `fetchNearbyPOIs` (cached `points_of_interest` within
~3 miles, top 5 per category) and `resolveSnapshotMeta` run in parallel, the
snapshot system prompt quotes 2–3 real POIs by name, and the agent-loop engine
streams `token` events after a leading `{snapshotMeta}` event that mounts
`SnapshotCard`. Payload tables are in TOOLS_INDEX.

## Map integration

The map is **MapLibre** (`@vis.gl/react-maplibre`, `src/app/components/mls/map/MapView.tsx`,
loaded through `MapLayer`), co-located with the chat on `/chap` and revealed by a
clip-path wipe. State lives in `MapStateContext` (`mapVisible` and `mapViewState`
in `sessionStorage`). When a search-first result carries coordinates, `ChatWidget`
calls `prePositionMap` with the listings' bounds so the map opens on them. A
manual toggle with no target runs `resolveSpawnPoint()`: browser geolocation if
inside California, else Palm Desert (zoom 10).

URL contract on `/chap` (the URL always wins over saved state):

| Param | Effect |
|---|---|
| `view=map` or `map=open` | Show the map; with `lat`/`lng`/`zoom` skip the spawn resolver |
| `listing=<slug>` | Restore the selected listing panel |
| `aiQuery=<text>` | Hide the map, auto-send the text to `ChatWidget`, then strip the param. Used by the AI button in `ListingBottomPanel` |
| no `view` | Chat view; the sidebar "Chat" link closes the map even if state had it open |

The map toggle sync never re-adds `?view=map` from state. **New Chat** clears
messages, hides the map and calls `resetMapState()`, so the spawn re-resolves.
`/` has no chat view: it is the insights homepage (`HomeClient`), and on
chatrealty.io the `chat-landing` page, which only links to `/chap`. The insights
"Ask chat" button pushes `/chap?chat=…`, a param nothing currently reads.

## POI display

POIs come from the `points_of_interest` collection (Google Places sync),
fetched through `GET /api/pois` for the viewport. The hook `usePOIs` only asks at
zoom ≥ 12, but the API returns nothing below zoom 14, only `golf` / `park` /
`attraction` at 14–15, and every category from 16 (max 500 rows). `MapView`
draws markers at zoom ≥ 14, grouping nearby ones with `clusterPOIs`; clicking a
marker opens an info card. The snapshot narrator uses the same collection via
`fetchNearbyPOIs`.

## Persistence

Chat is **not** multi-conversation. `ChatProvider` keeps one flat `messages`
array in `sessionStorage` (`jps-chat-messages`) with a sliding 5-minute expiry
(`jps-chat-expiration`, refreshed on every change); closing the tab or idling
past five minutes drops it. Each `ChatMessage` carries optional `preview`
(Layer 1), `components` (Layer 3) and `snapshotMeta`, so replay re-mounts
whatever was emitted. Nothing is stored server-side.

## Gotchas

- **TOOLS_INDEX sync.** New `tools.ts` entries, `preview.ts` intents and
  `chatv3:*` events MUST update `docs/chat/TOOLS_INDEX.md` in the same commit.
- **Narrator model.** Confirm the model against `DEFAULT_MODEL` in `narrate.ts`.
  Groq removes models without warning: on 2026-09-15 `llama-3.1-8b-instant` and
  `llama-3.3-70b-versatile` returned 404 `model_not_found`, the route sent
  `{preview}` then `{error, done}`, and every reply rendered as a component with
  no text. If chat goes text-less, `curl -X POST https://www.chatrealty.io/api/chat-v3`
  and look for an `error` event before blaming the widget; `GET
  https://api.groq.com/openai/v1/models` lists what the key can use. Don't pick
  `qwen/*` — it streams `<think>` into `delta.content`.
- **Layer 1 count beats autocomplete count.** The narrator must quote Layer 1's
  `totalListings`; re-check that after any `describeContext()` change.
- **Closed-sales phrasing isn't honored yet.** The parser sets `dataset:
  "closed"`, but Layer 1 always queries Active listings (TOOLS_INDEX, Known gap).
- **Layer 3 text is `token`, not `content`.** `content` is only the slash-command
  one-shot, so snapshot mode streams `token` events.
- **Map state is session-scoped on purpose.** Don't persist it across chats.
- **Debugging "slow / inventing stuff":** first check whether the turn went through
  Layer 1 (fast, AUTHORITATIVE) or fell to Layer 3 (slower, freer-form) — the
  route logs `parsed: intent=… confidence=…` and `Low-confidence or conversational → Layer 3`.
- **`/api/chat*` is public** (`src/proxy.ts` public prefixes). The route trusts
  `body.userId` for anonymous callers; interest tracking in `user-analytics.ts`
  looks users up by `email`, so it only matches when the id is an email.
- **Postgres twin is not wired.** `src/lib/chap/` ports area stats / preview / POIs to
  tenant Neon DBs but nothing imports it; scaffolded agent sites run their own
  `/api/chat` tool loop over `/api/skill/*`. See
  [../chatrealty-api/chap-search-pg.md](../chatrealty-api/chap-search-pg.md).

## Related

- [TOOLS_INDEX.md](./TOOLS_INDEX.md) — every tool, intent, SSE event and window event
- [../routing/README.md](../routing/README.md) — how host/subdomain proxying lands traffic on `/chap`
- [../multi-tenant/README.md](../multi-tenant/README.md) — agent scoping (the chat itself isn't agent-scoped; downstream lead capture is)
- `docs/archive/chat-production/CHAT_V3.md` and `MIGRATION_ROADMAP.md` — superseded architecture and cutover history; the rest of the old `docs/chat/`, `docs/chat-v2/` and `docs/chat-production/` material is archived under `docs/archive/`
