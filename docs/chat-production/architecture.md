# Chat Architecture — Search-First, AI Narrates

This is the target architecture for chat-v2 going forward. It supersedes the agent-loop-first design in `phase-1` through `phase-4-addendum.md`. Those phases stay valid (the loop still exists as a fallback), but the **default path** for real estate queries flips: deterministic search runs first, AI narrates over the resolved data.

> Core principle: the database does the heavy lifting. The AI narrates.

## Sources of truth

Four collections / endpoint families. Every user intent maps to one or more of these.

| # | Source | Backed by | Answers |
|---|---|---|---|
| 1 | **Neighborhoods** | `counties`, `cities`, `subdivisions`, `regions`, `LocationIndex` | "Where" — entity resolution, geographic hierarchy, names + slugs + aliases |
| 2 | **Listings** | `unified_listings` (active) + `unified_closed_listings` (closed, 5-year window) | "What's available / what sold" — every property + its street + its filters |
| 3 | **Insights** | `articles` (CMS) | "Why / how / where" — lifestyle, utilities, taxes, schools, climate, HOA rules, buying/selling guides |
| 4 | **CMA / market math** | Subdivision CMA stats (`cmaStats`), `/api/cma/...` endpoints, `getAppreciation` analytics | "How much" — comparable sales, trend math, valuation |

These are the four boxes. Every query is some combination of WHERE × WHAT × WHY × HOW MUCH.

## User intent taxonomy

Real users in this product ask roughly nine kinds of question. Cataloging all of them so we can verify the tool surface covers each.

### A. Property search ("find me listings")
- "Show me homes in Beverly Hills"
- "3-bed 2-bath under $1M in Indio"
- "Pool homes in PGA West"
- "Rentals in Palm Springs under $3000"
- "Land for sale in Riverside County"
- "Newest listings in Indian Wells"
- "Most expensive homes in La Quinta"
- "Best value (per sqft) in Palm Desert"

**Sources:** Neighborhoods (resolve location) + Listings (filter + return rows).

### B. Specific property lookup ("tell me about this property")
- "12345 Desi Drive"
- "Desi Drive in Indian Wells"
- "Listing #SW1234567"

**Sources:** Listings (address/slug match, multi-match if ambiguous).

### C. Street-level multi-listing ("everything on this street")
- "Homes on Hovley Lane"
- "Listings on El Paseo"

**Sources:** Listings (street regex on `unparsedAddress` AND/OR a precomputed street index).

### D. Area exploration ("what's this neighborhood like")
- "Tell me about Indian Wells"
- "What's PGA West?"
- "Coachella Valley overview"

**Sources:** Neighborhoods (the precomputed county/city/subdivision record with description, photo, listingCount, priceRange) + Listings (sample/stats) + Insights (any relevant articles).

### E. Aggregate market questions ("the numbers")
- "Average price in Beverly Hills"
- "Median rent in Indio"
- "How many gated homes in Indian Wells"
- "Average days on market in La Quinta"
- "Average sold price last 6 months in Palm Desert"

**Sources:** Listings (active, `$facet` over filtered set) OR Closed Listings (sold, time-windowed).

### F. Comparisons ("A vs B")
- "Compare PGA West vs Indian Wells Country Club"
- "Hovley Lane vs Washington Street"
- "Which subdivision in La Quinta has the best appreciation"

**Sources:** Listings + CMA (paired aggregate calls or trend math across multiple scopes).

### G. Trend / appreciation
- "5-year appreciation in PGA West"
- "How fast are prices rising in Palm Desert"
- "Sale-to-list ratio in Indio"

**Sources:** CMA + Closed Listings (time-windowed analytics).

### H. CMA / valuation
- "What's 12345 Desi Drive worth"
- "Generate a CMA"
- "Comparable sales near my property"

**Sources:** CMA endpoints (full report with comps).

### I. Lifestyle / educational ("insights")
- "Where is cheaper electric in Coachella Valley"
- "What's a short sale"
- "How do HOAs work"
- "Best schools in Palm Desert"
- "Summer cooling costs in the desert"

**Sources:** Insights (`$text` search on articles).

### J. Conversational / open-ended (fallback)
- "I'm thinking about relocating to CA, where do I start"
- "Should I rent or buy"

**Sources:** AI synthesis, optionally pulling from any of 1–4 as needed.

## Layered architecture

Four layers. The user's message flows top-to-bottom; each layer is allowed to terminate the response or pass to the next.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Layer 0 — Query Parser (deterministic, ~5–20ms)                     │
│  • Parse the user message into { entities, filters, intent }         │
│  • LocationIndex match for cities/subdivisions/counties              │
│  • Address regex (number + street + suffix)                          │
│  • Street-name index match                                           │
│  • Filter extraction (price, beds, baths, amenities, dates)          │
│  • Intent classifier (search / detail / aggregate / compare / etc.)  │
└─────────────────────────────────┬────────────────────────────────────┘
                                  │ structured query
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Layer 1 — Search Service (deterministic, ~50–500ms)                 │
│  • Given parsed query, call the right search primitive               │
│  • Returns { component, data } the frontend can render directly      │
│  • Emits the component event over SSE *before* AI runs               │
│  • If intent=unknown or low-confidence → return null, pass to L3     │
└─────────────────────────────────┬────────────────────────────────────┘
                                  │ component + summary
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Layer 2 — AI Narrator (single pass, ~1–2s)                          │
│  • One Groq call, NO tools, NO loop                                  │
│  • Input: original user message + L0 understanding + L1 result       │
│  • Output: 1–3 sentences of prose, streamed to the bubble            │
│  • If L1 returned null, layer is skipped and L3 runs instead         │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  Layer 3 — AI Agent Loop (fallback, current chat-v2 stack)           │
│  • Bounded loop with all 8 tools, MAX_ITERATIONS=6                   │
│  • Used when L0 intent is conversational, educational, or unknown    │
│  • Used when L1 fails to produce a confident result                  │
│  • Reasoning-model routing applies here too                          │
└──────────────────────────────────────────────────────────────────────┘
```

**Latency targets:**
- Search-routed query (L0 → L1 → L2): **<2s end-to-end**, ~500ms to first component, narration in flight by 1s.
- Fallback query (L0 → L3): same as today (3–8s typical).

**Observability:** every request logs `[L0 intent=X, entity=Y, filters=Z]`, `[L1 component=X, ms=Y]`, `[L2 narration started, model=X, ms=Y]` so we can attribute time precisely.

## Layer 0 — Query Parser

Single module: `src/lib/chat-v2/query-parser.ts`. Pure functions, no I/O except `LocationIndex` lookup (which is cached / indexed).

Output shape:
```ts
interface ParsedQuery {
  raw: string;
  entities: ResolvedEntity[];   // resolved against LocationIndex
  filters: ListingFilters;      // reused from existing helper
  intent: Intent;
  confidence: number;           // 0–1
}

type ResolvedEntity =
  | { type: 'address'; raw: string; houseNumber: string; street: string; city?: string }
  | { type: 'street'; raw: string; street: string; city?: string }
  | { type: 'subdivision'; name: string; cityId?: string; isGroup: boolean; subdivisions?: string[] }
  | { type: 'city'; name: string; cityId: string }
  | { type: 'county'; name: string }
  | { type: 'region'; name: string }
  | { type: 'zip'; value: string };

type Intent =
  | 'listing-detail'      // address present
  | 'listing-search'      // entity + filters / no special keyword
  | 'street-listings'     // street entity, no house number
  | 'aggregate'           // "average", "median", "typical", "how many"
  | 'compare'             // "compare", "vs", "versus", "than"
  | 'appreciation'        // "appreciation", "ROI", "trend", "value over"
  | 'cma'                 // "CMA", "what's it worth", "comparable sales"
  | 'insights'            // educational / lifestyle keywords + no entity OR generic entity
  | 'conversational'      // no entity, no aggregate keyword, open-ended
  | 'unknown';
```

Resolution order:
1. **Address regex** first — `\b\d{1,6}\s+[A-Za-z][\w\s]*?\s+(drive|dr|street|st|...|terrace|ter)\b`. If matched, intent is `listing-detail`.
2. **LocationIndex pass** — match the message against indexed city/subdivision/county/region names + aliases. Find longest match. If matched, intent is whatever the keyword analysis says (default `listing-search`).
3. **Street-name index pass** — if a street suffix is present without a leading number, check the street index. `street-listings` intent.
4. **Aggregate-keyword pass** — `\b(average|avg|median|typical|how many|count of|total)\b` → `aggregate`.
5. **Compare-keyword pass** — `\b(compare|comparing|vs\.?|versus|better|cheaper|pricier than)\b` → `compare`.
6. **Appreciation-keyword pass** — `\b(appreciation|appreciat|ROI|return on|trend|over (the )?(\d+ )?years?)\b` → `appreciation`.
7. **CMA-keyword pass** — `\b(CMA|comparable sales|comp(s)?|what'?s it worth|valuation)\b` → `cma`.
8. **Insights-keyword pass** — `\b(electric|utility|HOA|school|climate|weather|short sale|first[- ]time|tax|mortgage|loan|how do)\b` AND no listing entity → `insights`.
9. **Filter extraction** — runs orthogonally to all of the above. Pulls price ranges (`under $1M`, `$500k-$1M`), beds (`3-bed`, `3 bed`, `3br`), baths, sqft (`under 2000 sqft`), amenities (`pool`, `gated`, `view`, `fireplace`), HOA (`no HOA`, `under $300/month`), property type (`condo`, `house`, `townhouse`).
10. **Confidence score** — high (0.9+) when entity + clear keyword match. Low (<0.6) when message is ambiguous.

If nothing fires → intent `conversational`, low confidence, pass to L3.

## Layer 1 — Search Service

Single module: `src/lib/chat-v2/search-service.ts`. Routes on intent, calls existing primitives, returns the component shape the SSE protocol already speaks (`{ component, data }`).

Routing table:

| Intent | Action | Existing primitive reused | Component emitted |
|---|---|---|---|
| `listing-detail` | Lookup address (number + street + optional city) | Address-anchored slug index OR new fast street index | `listingDetail` (single) or `listingOptions` (multi-match) |
| `listing-search` | Build `ListingScope` from entity, filters from parser, call `buildListingQuery` + paged find | `searchHomes` executor logic, but pre-resolved | `neighborhood` (city/sub) or `listingResults` (street/county/zip) |
| `street-listings` | Treat street as scope, call `searchListings` primitive | `searchListings` executor | `listingResults` |
| `aggregate` | Build scope + filters, call `computeAreaStats` | `getAreaStats` executor | `areaStats` |
| `compare` | Two paired `computeAreaStats` calls | `getAreaStats` × 2 | `areaStats` × 2 (frontend renders side-by-side) |
| `appreciation` | Call appreciation analytics endpoint | `getAppreciation` executor | `appreciation` |
| `cma` | Lookup property, call CMA endpoint | `generateCMA` executor | `cmaReport` |
| `insights` | Article `$text` search | `searchArticles` executor | `articles` |
| `conversational` / `unknown` / low-confidence | Fall through to L3 | — | — |

**Confidence threshold:** `confidence >= 0.7` to commit to L1; otherwise pass to L3 with parsed query as context. Tunable.

**Component emission timing:** L1 emits the `{ components: ... }` SSE event the moment the data is ready, *before* L2 starts. The user sees the listings/cards while AI narration is still queuing up.

## Layer 2 — AI Narrator (single pass)

Replaces the agent loop for search-routed queries. Single Groq call, no tools, no looping.

```ts
const messages = [
  { role: "system", content: NARRATOR_PROMPT },
  // condensed conversation history (last 4 turns max)
  ...recentHistory,
  { role: "user", content: userMessage },
  { role: "system", content: `[search resolved: ${describeL1Result(parsed, l1Result)}]` },
];

const stream = await groq.chat.completions.create({
  model: "openai/gpt-oss-120b",
  messages,
  stream: true,
  temperature: 0.5,
  max_tokens: 256,           // narration only
  // NO tools, NO tool_choice
});
```

**`NARRATOR_PROMPT`:** ~50 lines, much shorter than current system prompt. Tells the model:
- "The UI is showing the user a {component name} with the data below."
- "Write 1–3 sentences of prose. Acknowledge what was found, surface one notable observation, optionally suggest a follow-up."
- "Do NOT duplicate numbers, tables, or listing-by-listing details — those render in the component."
- "Do NOT invent facts. If a field isn't in the data, don't mention it."

**Latency:** ~1–1.5s for 30–50 narration tokens. Streams in immediately after L1's component event so the user perceives one continuous response.

**Conversation logging:** before returning, append a synthetic assistant message to conversation history capturing both the L1 component (compressed to a description) and the narration. Future turns get full context for follow-ups.

## Layer 3 — AI Agent Loop (fallback)

The current chat-v2 stack — no behavior change. Used when:
- L0 returns `intent: conversational`
- L0 returns `intent: unknown`
- L0 confidence < 0.7
- L1 explicitly errors (e.g., LocationIndex miss, tool exception)

Reasoning-model routing (Phase 4 addendum) still applies here. The 8 tools are still callable. `MAX_ITERATIONS = 6`.

Where Layer 3 is also useful:
- Multi-step queries the parser can't decompose (e.g., *"compare PGA West appreciation against the average rental ROI in Indio"* — combines aggregate + appreciation + comparison; L0 would tag it `compare` but L1's pair-of-getAreaStats won't capture the appreciation half)
- Educational + entity combos (*"what's the climate like in Indio"* — insights search but with location context)
- Account / preference operations (future)

## Tool surface — final shape

Existing tools (post-Phase-4) are **kept**. They're still useful as Layer 3 primitives and as named functions Layer 1 can call internally. The change is *which layer* invokes them.

| Tool | Layer 1 calls? | Layer 3 (AI loop) calls? | Notes |
|---|---|---|---|
| `searchHomes` | No (direct primitive used) | Yes | Wrapper for neighborhood-scoped search |
| `searchListings` | Yes (deterministic from `street-listings`) | Yes | Multi-listing with scope |
| `getAreaStats` | Yes (`aggregate`, `compare`) | Yes | The `$facet` pipeline |
| `getAppreciation` | Yes (`appreciation`) | Yes | Trend math |
| `getListingDetails` | No (direct lookup used) | Yes | Single property |
| `generateCMA` | Yes (`cma`) | Yes | Comp analysis |
| `searchArticles` → rename **`searchInsights`** | Yes (`insights`) | Yes | Lifestyle / educational |
| `askClarification` | No (L0 already handles ambiguity at parse time) | Yes | Free-text clarification |

### Tool surface additions to consider

- **`getMarketTrends(scope, dataset, period, metric)`** — closed-listings analytics: DOM, sale-to-list ratio, YoY appreciation, list-price drops. Currently the helper supports `dataset: 'closed'` architecturally but no tool exposes it. Worth introducing as part of the closed-listings rollout.
- **`compareScopes(scopes[], filters, metrics[])`** — convenience over multiple `getAreaStats` calls. Reduces L1 logic for `compare` intent. Optional.

## Routing decision tree (worked examples)

**`desi drive`**
- L0 → entities: `[{ type: 'street', street: 'Desi Drive' }]`, intent: `street-listings`, confidence: 0.85
- L1 → calls street-search primitive → returns 4 listings across Indian Wells (2) + Palm Desert (2) → emits `listingResults`
- L2 → "Found 4 listings on Desi Drive — 2 in Indian Wells, 2 in Palm Desert. Want to narrow to a city?"
- Total: ~1.5s

**`12345 Desi Drive`**
- L0 → entities: `[{ type: 'address', houseNumber: '12345', street: 'Desi Drive' }]`, intent: `listing-detail`, confidence: 0.95
- L1 → indexed slug lookup → 1 match → emits `listingDetail`
- L2 → "Here's 12345 Desi Drive — a 4-bed/3-bath in Indian Wells Country Club. Want photos or comps?"
- Total: ~1s

**`average price on Hovley Lane in Palm Desert`**
- L0 → entity `street: Hovley Lane`, city `Palm Desert`, aggregate keyword `average price`, intent `aggregate`, confidence: 0.9
- L1 → `computeAreaStats({ scope: street, ... })` → emits `areaStats`
- L2 → "Hovley Lane averages $850k across 12 active listings, with single-family homes dominating. Want to see the listings?"
- Total: ~2s

**`compare PGA West vs Indian Wells Country Club`**
- L0 → two subdivision entities, compare keyword, intent `compare`, confidence: 0.9
- L1 → two parallel `computeAreaStats` calls → emits `areaStats` × 2
- L2 → "PGA West runs larger and pricier than Indian Wells Country Club, with both skewing single-family. Want appreciation data on either?"
- Total: ~2s

**`where is cheaper electric in coachella valley`**
- L0 → entity `region: Coachella Valley`, insights keyword `electric`, intent `insights`, confidence: 0.85
- L1 → `searchInsights` → returns 3 article summaries → emits `articles`
- L2 → "IID serves La Quinta and Coachella with notably lower rates than SCE, which serves the western valley cities. The article goes deeper into average summer bills."
- Total: ~2s

**`I'm thinking about relocating to California, where should I start`**
- L0 → no entity, no aggregate keyword, intent `conversational`, confidence: 0.3
- L1 → null, pass through
- L3 → AI loop, possibly calls `searchInsights("relocating to California")` and writes a longer response
- Total: ~3–6s (acceptable for genuinely conversational queries)

**`tell me about the cheaper one`** *(follow-up after a search)*
- L0 → no entity (anaphora), low confidence
- L1 → null, pass through
- L3 → AI loop with full conversation history (synthetic assistant messages from previous L2 narrations); model resolves "the cheaper one" from the rendered listingResults and calls `getListingDetails` on the right listingKey
- Total: ~3–5s

## What stays / what changes

### Stays
- All 8 tools and their executors (`tool-executors.ts`)
- The `listing-query.ts` helper (`buildListingQuery`, `computeAreaStats`)
- The agent loop in `streaming.ts` (now Layer 3, fallback)
- The phase-4 component-first system prompt (split into NARRATOR_PROMPT for L2, AGENT_PROMPT for L3)
- Reasoning-model routing (Layer 3 only)
- `verify-chat-stats.ts` regression harness
- Frontend rendering pipeline (`ChatResultsContainer`, `AreaStatsCard`, etc.)

### Changes
- `route.ts` becomes a router: parse → search → either (narrate single-pass) or (delegate to agent loop)
- `system-prompt.ts` splits into two prompts
- New: `query-parser.ts` (Layer 0)
- New: `search-service.ts` (Layer 1)
- New: `narrator.ts` (Layer 2, single-pass Groq call)

### Out of scope for this architecture (future)
- Account / favorites / saved searches
- Agent matching / lead capture (separate flow)
- Tour scheduling
- Multi-tenant per-agent prompt customization
- Closed-listings tool surface (the architecture supports it; just not wired)

## Reused infrastructure (we don't reinvent these)

| Existing | Used for |
|---|---|
| `LocationIndex` model + helpers | L0 entity resolution (already <50ms by design) |
| `/api/cities/[id]/listings` | L1 listing-search for cities — same logic, called server-side |
| `/api/subdivisions/[slug]/listings` | L1 listing-search for subdivisions |
| `computeAreaStats` (`listing-query.ts`) | L1 aggregate stats |
| Existing autocomplete endpoint (`d79cc79f`) | Possibly L0's address/street fast-path |
| Article `$text` search | L1 insights |
| Subdivision `cmaStats` precomputed records | L1 fast aggregate path for known subdivisions (skip $facet) |

## Open design choices (need your call before implementation)

1. **Layer 0 implementation** — pure regex/keyword parser, or a small tuned LLM (Groq `llama-3.1-8b-instant`)?
   - Regex is faster (~5ms) and deterministic but brittle on natural variation.
   - 8b model is ~200ms but handles "what's the typical price for a fixer-upper around indian wells" gracefully.
   - I lean **regex with 8b fallback when confidence is low** — best of both.

2. **Component-emission ordering** — emit L1 components before L2 narration starts, or wait and bundle?
   - Emit-first is faster perceived latency, but the bubble shows components without text for 1–2s.
   - I lean **emit-first**; component-with-no-text is a fine intermediate state.

3. **Synthetic conversation logging** — what exactly gets logged?
   - Option: the raw L1 result (high-fidelity but bloats prompt for follow-ups).
   - Option: a compressed description ("I showed the user 4 listings on Desi Drive: [keys list]. Narration: ...").
   - I lean **compressed description**, capped at ~500 chars.

4. **L1 confidence threshold** — 0.7 too low, 0.9 too high?
   - 0.7 is permissive; we'll route some borderline queries to L1 that maybe should've gone to L3.
   - 0.9 is strict; conversational queries with a stray location token still route to L1.
   - I lean **0.75 with telemetry**, tune once we have data.

5. **`searchHomes` deprecation** — it overlaps heavily with `searchListings` + `getAreaStats` post-Phase-2. With L1 doing the routing, do we keep `searchHomes` (for L3 backward compat) or merge it?
   - I lean **keep for now**, mark deprecated, remove once L1 covers all its cases in production.

6. **Closed-listings exposure** — wire `getMarketTrends` now or later?
   - Now: lets `appreciation`/`cma`/`compare` intents reach for it. More surface to test in this rollout.
   - Later: ship search-first first, add closed-listings tool when stable.
   - I lean **later** — fewer moving parts in the architecture rollout.

## Implementation phasing (proposed)

Once you sign off on the design above, suggested order:

1. **Phase A (1 PR)** — `query-parser.ts` Layer 0, with unit tests covering ~20 representative queries from the taxonomy. No wiring yet.
2. **Phase B (1 PR)** — `search-service.ts` Layer 1. Wraps existing primitives. No wiring yet.
3. **Phase C (1 PR)** — `route.ts` integration: pre-search, emit components, decide whether to invoke L2 narrator or L3 loop.
4. **Phase D (1 PR)** — `narrator.ts` Layer 2 + `NARRATOR_PROMPT`. Replace the existing system prompt for search-routed queries.
5. **Phase E (1 PR)** — observability + tuning: confidence threshold, parser edge cases, narration verbosity.

Each phase is independently shippable and reversible. We can pause / sign-off between any of them.

## Status

**Document drafted, awaiting design sign-off on the six open choices in §"Open design choices."**

Once you weigh in on those, I'll start with Phase A (the query parser) and we'll iterate.
