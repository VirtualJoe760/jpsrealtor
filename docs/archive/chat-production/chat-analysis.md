# Chat V2 Implementation — Analysis

Snapshot of the active chat stack (`/api/chat-v2` + `src/lib/chat-v2/*` + `src/app/components/chat/*`) with the goal of identifying what's blocking multi-result display and aggregate-style reasoning.

---

## 1. Architecture overview

**Entry point (frontend):** `src/app/components/chat/ChatWidget.tsx`
- Three separate `fetch("/api/chat-v2")` call sites: `:279`, `:536`, `:767` (initial chat, follow-up, retry — all duplicate the same SSE-parsing logic).
- SSE parser lives inline at `:327–:380` (and again at `:570`, `:804`). Reads `data: {...}` lines, splits on `token`, `components`, `done` event types.
- Final assembled message — `cleanText` + `components` — is appended via `addMessage(...)` in `ChatProvider.tsx:311`.

**Entry point (backend):** `src/app/api/chat-v2/route.ts`
- `POST` handler at `:23`. Auth, command-detection short-circuit, optional location-snapshot prompt override, then **regex-based pre-routing** at `:118–:127` (forces `getListingDetails` if a street pattern matches the user message).
- Calls `groq.chat.completions.create(...)` at `:131` with `tools: ALL_TOOLS`, `stream: true`.
- Hands the stream to `streamWithToolSupport` (`src/lib/chat-v2/streaming.ts:20`), which is the agent loop.

**Tool execution:** `src/lib/chat-v2/tool-executors.ts:16` — `executeTool` switches on tool name and dispatches to per-tool functions.

**Result rendering:** `src/app/components/chat/ChatResultsContainer.tsx` reads the `components` object and renders one of: `ListingCarousel`, `ListingListView`, `ChatMapView`, `AppreciationContainer`, `MarketStatsCard`, `ArticleResults`, `CMAReport`. Listings are not embedded in the SSE — the component fetches them itself from `/api/subdivisions/.../listings` or `/api/cities/.../listings` (`ChatResultsContainer.tsx:81–:300`).

---

## 2. Model & config

| Setting | Value | Where |
|---|---|---|
| Model | `openai/gpt-oss-120b` | `route.ts:132`, `streaming.ts:189` |
| Temperature | `0.7` (both turns) | `route.ts:137`, `streaming.ts:192` |
| `max_tokens` | `2048` (both turns) | `route.ts:138`, `streaming.ts:193` |
| Streaming | `true` | `route.ts:136` |
| `tool_choice` | `"auto"`, except `"forced"` when a street regex matches | `route.ts:123–:127, :135` |
| `parallel_tool_calls` | **Not set anywhere** in `src/` (grep: no matches) | — |

There is a separate `src/lib/groq.ts` defining `GROQ_MODELS.FREE = "llama-3.1-8b-instant"` and `PREMIUM = "openai/gpt-oss-120b"`, but `route.ts` ignores it and hard-codes the premium model string.

**System prompt:** `src/lib/chat-v2/system-prompt.ts` — single 457-line template literal. Optionally appended with a "LOCATION SNAPSHOT MODE" override (`route.ts:84–:106`) when a `locationSnapshot` is present in the body. The bulk of the prompt is response-formatting rules: which `[MARKER]` to put at the start of the message, which fields of `stats.insights` to read from, and several full example responses to imitate.

---

## 3. Tool definitions

Source: `src/lib/chat-v2/tools.ts:16` (`ALL_TOOLS`). Six tools, all surfaced to every request:

| Tool | Required args | What the executor returns | Free-form text? |
|---|---|---|---|
| `searchHomes` (`tools.ts:20`) | `location` + ~25 optional filters (price/beds/baths/sqft/lot/year/amenity bools/HOA/sort/eastOf/westOf/...) | `{ component: "neighborhood", neighborhood: { type, name, normalizedName, subdivisionSlug \| cityId, filters }, location, stats, metadata }` (`tool-executors.ts:474–:551`) | **Mostly structured.** `stats.insights.keywords` is a string array, but the rest is typed numbers/booleans. |
| `getAppreciation` (`tools.ts:174`) | `location`, optional `period` ∈ `1y/3y/5y/10y` | `{ component: "appreciation", location: { city \| subdivision \| county }, period }` — **just an identifier**, no data (`tool-executors.ts:581–:589`) | Structured ID-only |
| `searchArticles` (`tools.ts:201`) | `query` | `{ component: "articles", query, articleSummaries: [{ title, content }] }` — content is **full Markdown article body** stuffed back to the model for RAG synthesis (`tool-executors.ts:642–:654`) | **Free-form.** `content` is unbounded prose; the model is then expected to paraphrase. |
| `getListingDetails` (`tools.ts:222`) | `address` | Three possible shapes: `{ component: "listingDetail", listingDetail: {...}, listing: {...} }` (single match, `tool-executors.ts:818–:882`), `{ component: "listingOptions", listingOptions: [...] }` (multi-match, `:757–:766`), or `{ listingDetail: null, message }` (miss). | Structured |
| `generateCMA` (`tools.ts:243`) | `address` | `{ component: "cmaReport", cmaReport: { listingKey, address, subdivisionName, price, city }, listing: {...} }` (`tool-executors.ts:976–:999`) | Structured |
| `askClarification` (`tools.ts:264`) | `question`, optional `options[]`, `context` | `{ component: "clarification", clarification: { question, options, context } }` (`tool-executors.ts:48–:58`) | Structured |

Frontend whitelist of recognised components: `streaming.ts:114–:135`. Anything not in this switch (`neighborhood / appreciation / articles / listingOptions / listingDetail / cmaReport / clarification`) is dropped silently.

---

## 4. Agent loop

It is **a fixed two-turn pipeline, not a loop**. From `streaming.ts`:

1. **Turn 1** (already kicked off in `route.ts:131`) — the streaming response is iterated at `:39–:72`. Tokens are forwarded as `{token}` SSE events; tool-call deltas accumulate in a `toolCalls[]` array indexed by `toolCall.index`.
2. After the first stream ends, **all** tool calls are executed sequentially via `for (const toolCall of toolCalls)` at `:98`. Each result is converted to a single component shape and emitted as one `{components}` SSE event (`:142`).
3. **Skip-second-call optimization** (`:171–:184`): if the components are `listingOptions` or `clarification`, a canned text token is emitted and we return. No second model call.
4. Otherwise, **Turn 2** (`:188–:206`) — second `groq.chat.completions.create` with the original messages + the assistant tool-call message + tool-result messages, **with `tools` omitted** (comment at `:194` explicitly says this prevents further tool calling).

Properties:
- `parallel_tool_calls`: never passed → relies on Groq/GPT-OSS default (which can already emit multiple tool calls in one assistant turn — they just get executed serially in JS).
- **Max iterations: 1.** There is no `while (toolCalls.length > 0)` wrapper. The model cannot call a tool, look at the result, then call another tool informed by it. If turn 2 attempted a tool call, it would be ignored (tools aren't passed).
- Tool-result messages are still built (`:150–:154`), but stringified results are only consumed by turn 2's text-only response.

---

## 5. Database layer

Mongo via Mongoose. Models: `@/models/unified-listing` (active listings) and `@/models/article` (CMS).

**`searchHomes` (`tool-executors.ts:152–:408`):**
- Builds a Mongo filter `dbQuery` with `standardStatus: "Active"`, `propertyType: "A"` (excludes rentals/multifamily/land — see `:172`), and a `propertySubType: { $nin: ["Co-Ownership", "Timeshare"] }`.
- Adds case-insensitive regex matches for `city` / `subdivisionName` / `$in` for subdivision groups.
- Adds optional `listPrice`, `bedsTotal`, `bathsTotal`/`bathroomsTotalInteger`, `poolYn`. **Most filters listed in the tool schema (spa, view, fireplace, gatedCommunity, seniorCommunity, garageSpaces, stories, year, sqft, lot, HOA, eastOf/westOf, sort) are NOT applied to the DB query here** — they're only passed downstream to `/api/subdivisions/.../listings` via the frontend (see `ChatResultsContainer.tsx:117–:171`). So the AI's `stats` block is computed against a less-filtered set than the carousel actually displays.
- **Aggregation strategy:** one `countDocuments` (`:221`), one aggregation pipeline (`:226–:254`) — but only for "new listings in past 7 days." Then `find(...).limit(50).lean()` (`:261–:265`) pulls **a 50-listing sample**, and **all** other stats are computed in JavaScript: avg/median price, property-type counts/avg/$/sqft (`:268–:290`), HOA min/max (`:312–:314`), pool/spa/view percentages (`:317–:333`), `isGated` / `hasGolf` heuristics from `publicRemarks` text (`:336–:342`). No `$avg`, `$group`, `$bucket`, or `$facet` is ever issued for any of these.

**`getListingDetails` (`tool-executors.ts:672–:883`):**
- Slug-prefix regex on `slugAddress`, falling back to a multi-word regex on `unparsedAddress` (`:711–:723`). `.limit(10)` for multi-match, single `findOne` for single match.

**`searchArticles`:** Mongo `$text` search on `Article` collection with `score: { $meta: "textScore" }`, `.limit(3)` (`:608–:620`). Top 3 full bodies are inlined into the tool result.

**`getAppreciation` and `generateCMA`:** No DB query at the tool layer — they return identifiers and the frontend component (`AppreciationContainer`, `CMAReport`) fetches its own data from `/api/analytics/appreciation` and `/api/cma/...`.

---

## 6. Result rendering

**Listings are structured components, not text.** The contract:

1. Backend tool emits `{ component: "neighborhood", neighborhood: {...}, stats: {...} }`.
2. `streaming.ts:114–:135` re-projects to `{ components: { neighborhood: {...} } }` and writes one SSE event.
3. `ChatWidget.tsx:365–:368` captures it onto the message object.
4. `ChatResultsContainer.tsx:68–:72` reacts to `components.neighborhood` and **fires a separate REST fetch** to `/api/subdivisions/{slug}/listings` or `/api/cities/{cityId}/listings` to actually get the listing array — the model's response stream contains zero listing rows.
5. `ListingCarousel` / `ListingListView` / `ChatMapView` render those listings. Pagination is page-of-30 via the same endpoint (`ChatResultsContainer.tsx:177–:178`).

**Listing detail / CMA / appreciation / articles** all follow the same pattern: tool returns identifier, dedicated component renders it (`ChatResultsContainer.tsx:678–:721`).

The model's *text* output is rendered separately as Markdown in the message bubble. The system prompt asks it to parrot `stats.totalListings`, `stats.avgPrice`, `stats.propertyTypes`, etc. as Markdown tables. **There is duplication** — the model is told to print stats that the UI also has structured access to via the same `stats` object (which the frontend ignores in `MarketStatsCard` for neighborhood queries — only `components.marketStats` triggers it, and no tool emits that key).

---

## 7. Specific weaknesses — top 5

### W1. The agent loop is a single round-trip; aggregate reasoning has no iteration budget
**Where:** `src/lib/chat-v2/streaming.ts:75–:208`
The for-await over the first stream collects tool calls; tool calls are executed once; a second model call runs **with `tools` omitted** (`:194`). For a question like *"what's the average rental income on Hovley Lane,"* the model would need to (a) search listings on a street, (b) inspect their rents, (c) compute the average — minimum two reasoning steps, each conditional on the previous result. The current shape can't support that, and there is no `maxIterations` knob to raise. Also `parallel_tool_calls` is never set, so behavior is implementation-default.

### W2. Stats are computed in JS over a 50-row sample, not in MongoDB
**Where:** `src/lib/chat-v2/tool-executors.ts:261` (`.limit(50)`) and `:268–:378` (every average/median/pct/range)
For any subdivision or city with > 50 active listings, "Average price," "$/sqft by property type," "% with pools," and "HOA range" are all sample-biased. For city queries (Beverly Hills 278, Irvine 538 per the prompt examples) the displayed stats are wrong by construction. The DB has the data; the code just never asks for `$group` / `$avg` / `$bucket`. This is also where any *new* aggregate question ("average rental income," "median DOM by ZIP") would need to live, but the function isn't shaped for it.

### W3. There is no tool for street-scoped or area-scoped multi-listing queries
**Where:** `src/lib/chat-v2/tools.ts:222–:236` (`getListingDetails`) and `:23–:168` (`searchHomes`)
- `searchHomes` requires `location` and routes through `identifyEntityType`, which only resolves city / subdivision / subdivision-group / county / region / general. A street name returns "general" or fails — `tool-executors.ts:148` then warns "No listings API for type" and returns empty stats.
- `getListingDetails` does match by street regex but caps at `.limit(10)` (`:714, :723`) and renders as `listingOptions` cards in a "pick one" UI — not a list of all listings on the street. The skip-second-call canned text at `streaming.ts:177` (`"I found N listings... Which one would you like to know more about?"`) hard-locks this into a disambiguation flow even when the user wants to see them all.

There is no tool whose schema is "give me every active listing matching arbitrary geographic + attribute filters and return the rows." The closest is the `/api/cities/[id]/listings` REST endpoint — but it's not exposed to the model.

### W4. Tool schemas advertise filters the executor doesn't apply at the DB layer
**Where:** `src/lib/chat-v2/tools.ts:81–:163` vs. `src/lib/chat-v2/tool-executors.ts:194–:215`
The schema offers `spa`, `view`, `fireplace`, `gatedCommunity`, `seniorCommunity`, `garageSpaces`, `stories`, `minSqft/maxSqft`, `minLotSize/maxLotSize`, `minYear/maxYear`, `eastOf/westOf/northOf/southOf`, `hasHOA/maxHOA/minHOA`, and `sort`. The executor (`:194–:215`) only translates `minPrice`, `maxPrice`, `beds`, `baths`, `pool`, and `propertyType` into the Mongo query. Everything else is silently passed to the frontend via `filters: {...}` and re-applied in the listings-list endpoint. The model's `stats` therefore ignores those filters entirely — telling the user "I found **23 non-HOA homes east of Washington with pool**" when `stats.totalListings` was computed against "all active homes in La Quinta with pools."

### W5. Free-form RAG content for articles inflates context for a low-value second turn
**Where:** `src/lib/chat-v2/tool-executors.ts:642–:654` and `streaming.ts:188–:206`
`searchArticles` inlines up to 3 full article `content` bodies into the tool-result message. Those messages are then passed back to turn 2 (`streaming.ts:190`), which is bounded to `max_tokens: 2048` and instructed to "synthesize." This is the only tool returning unbounded prose. It works, but it (a) bloats input tokens unpredictably, (b) is the largest single source of latency for non-listing queries, and (c) the frontend re-fetches the same articles via `/api/articles/ai-search` (`ChatResultsContainer.tsx:311`) anyway, so the inlined content only feeds the model paraphrase — duplicate work.

### Bonus: regex pre-routing in the API handler is brittle
**Where:** `src/app/api/chat-v2/route.ts:118–:127`
`hasStreetAddress` forces `tool_choice: getListingDetails` if a street-suffix pattern matches. This means *any* question that mentions "Desi Drive" — including "what's the average price of homes on Desi Drive" — gets locked to the single-listing tool, defeating any future multi-listing or aggregate tool you add.

---

## What this means for your refactor

The architecture is single-shot RAG, not agentic. Multi-listing display and area-level math both want the same two missing primitives:

1. **A real agent loop** — `while (toolCalls.length)` with a `maxIterations` cap, tools passed on every turn, and `parallel_tool_calls: true` so the model can fan out.
2. **Aggregation tools that hit Mongo** — `$group`/`$avg`/`$bucket` over the full filtered set (not a 50-row sample), returning structured rows the UI can render as a table or chart.

The component-first rendering layer is actually a strength here — once the backend produces structured aggregate results (e.g., `{ component: "aggregateStats", rows: [{ street: "Hovley Ln", avgPrice: ..., avgRent: ... }] }`), adding a renderer in `ChatResultsContainer.tsx` is mechanical. The blockers are upstream: the loop and the SQL/aggregation layer.
