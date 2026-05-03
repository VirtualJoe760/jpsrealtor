# Phase 3 Summary — real agent loop

**Commit on `chatlistings`:** `ba42bd32` (`feat(chat-v2): real bounded agent loop with parallel tool calls`).

## What changed

Single feature commit, four files, +220/-208 lines net (most of the deletion is the old fixed-two-turn pipeline coming out).

### `src/lib/chat-v2/streaming.ts` — rewritten

Old shape: function received the first stream as a parameter, consumed it for tool calls, then made one second call with `tools` omitted.

New shape:

```
while (iteration <= MAX_ITERATIONS) {
  stream = groq.create({ tools: ALL_TOOLS, parallel_tool_calls: true, stream: true })
  consume → assistantText, toolCalls[]
  if (toolCalls.length === 0) break  // natural termination
  if (sameBatchAsLastIteration) break // model stuck
  push assistant message; execute each tool; emit components; push tool results
  if (iteration === MAX_ITERATIONS) break
}
```

`MAX_ITERATIONS = 6`, configurable constant at the top of the file (line 26). Tools and `parallel_tool_calls: true` are passed on **every** iteration. The old skip-second-call optimization is gone — not bypassed conditionally, deleted. Per the plan and your sanity-check note: when listingOptions or clarification components are emitted, the model gets a normal next iteration where it writes its own narration. The component event for the UI fires regardless.

### `src/app/api/chat-v2/route.ts` — simplified

Old: route called `groq.chat.completions.create(...)` directly, then passed the resulting Stream to `streamWithToolSupport`.
New: route hands `{ groq, messages, userId, model, temperature, maxTokens }` to the loop. The loop owns every Groq call.

### `src/app/components/chat/ChatWidget.tsx` — components merge

Three SSE-parser call sites (`~:368`, `~:585`, `~:814`) were doing `components = data.components` — overwrite. The new loop emits one `{components}` event per tool result, so a single response can produce `neighborhood + areaStats + appreciation` from chained calls. All three sites now spread-merge:

```ts
components = { ...(components || {}), ...data.components };
```

Token accumulator (`fullText += data.token`) was already correct for multi-burst streaming; verified before changing anything.

### `src/lib/chat-v2/listing-query.ts` — documentation

Added a comment block (lines ~205–215) explaining the `poolYn | poolYN | pool` triple-OR pattern. The data has three different field-name spellings depending on which MLS feed sourced it, and `verify-chat-stats.ts` proved that collapsing to just `poolYn` would silently regress the Beverly Hills pool rate from 73% back to 0%. The next person to touch this file will not need to discover that the hard way.

## Behavior changes you'll notice

### What unblocks

| Query the model couldn't handle pre-Phase-3 | Why it works now |
|---|---|
| *"compare avg price on Hovley Lane vs Washington Street in Palm Desert"* | Two parallel `getAreaStats` calls in iteration 1, narrated in iteration 2. |
| *"find pool homes under $1M in Indio, then tell me which subdivision has the best 5-year appreciation"* | `searchListings` (or `searchHomes`) iteration 1 → `getAppreciation` iteration 2 informed by the first result → narration iteration 3. |
| *"average rental income on El Paseo"* | `getAreaStats` with `scope=street, cityName=Palm Desert, propertyType=B` → narration. The error-recovery path: if the model forgets `cityName`, the executor returns `{ success: false, error }`, the loop appends that as a tool result, and iteration 2 retries with the fix. |
| *"what's a good neighborhood in Beverly Hills for a $5M budget?"* | The model can now call `getAreaStats` for stats, then `searchHomes` filtered to confirm, then narrate. |

### What stays the same

- Listing-detail flow (`getListingDetails` for `12345 Desi Drive`) — same UX.
- Single-tool, single-turn queries (`show me homes in PDCC`) — terminate at iteration 1 (model produces narration alongside the tool call) or iteration 2 (model writes only the tool call in iteration 1, narration follows in iteration 2). Either way, ~one extra round-trip vs the old hard-coded pipeline. This is the cost of correctness.
- Skip-second-call paths for `listingOptions` / `clarification` are gone, but the UX is intact: components render the same; the model just writes a real "I found 3 listings on Desi Drive" sentence instead of a canned one.

### Worst-case latency

6 iterations × ~2-3s per turn = 12-18 seconds for a deeply-chained query. The streaming UX masks most of this (tokens and components arrive in real time), but a query that legitimately needs 4-5 iterations is going to feel slow. Phase 4 will look at routing chained queries to a faster reasoning-tuned model.

## Beverly Hills bounce-rate hypothesis

You called this out and it's worth restating in this doc: pre-Phase-2, queries like *"show me homes in Beverly Hills"* returned a stats card claiming **avg $1.4M / max $1.9M** for a market whose actual median is $6.25M and max is $135M. Anyone arriving from a luxury-intent search and seeing those numbers would correctly conclude the site doesn't have luxury inventory and bounce. **The product was functionally broken for luxury markets**, not mistuned — that's a Beverly Hills, Bel Air, Malibu, Newport Beach, La Jolla story, not a one-city story. If GA4 has bounce-rate data on those city queries, the Phase 2 deploy date is the change point to look for. Same goes for Irvine, where the AI literally never saw a single single-family home in the city's 263 SFR inventory.

## Manual test plan

Start the dev server. Watch the server logs for `[Streaming] Iteration N/6` lines — those mark each loop turn.

### Loop-correctness queries

| # | Query | Expected loop behavior |
|---|---|---|
| 1 | `compare avg price on Hovley Lane vs Washington Street in Palm Desert` | Iter 1: two parallel `getAreaStats` calls. Iter 2: model narration + done. Two `[Streaming] Executing getAreaStats` log lines under one iteration. Two `AreaStatsCard`s render. |
| 2 | `find pool homes under 1M in Indio then tell me which subdivision has the best 5-year appreciation` | Iter 1: `searchHomes` (or `searchListings`). Iter 2: `getAppreciation` for the named subdivision. Iter 3: narration. Three iteration log lines. |
| 3 | `homes on Hovley Lane` (no city) | Iter 1: `searchListings` with `scope=street`, no `cityName`. Tool returns `{ success: false, error: "scope='street' requires cityName" }`. Iter 2: model writes "Which city?" or calls `askClarification`. **Should not infinite-loop** — duplicate detection triggers if the model retries with the same args. |
| 4 | `tell me about Desi Drive` | Iter 1: `getListingDetails` returns `listingOptions` with multiple matches. Iter 2: model narrates "I found 3 listings on Desi Drive — which one?" (or similar). UI cards render after iter 1. **No canned text** anymore — verify the sentence is model-generated. |
| 5 | `show me homes in Beverly Hills` | Iter 1: `searchHomes` → `neighborhood` component. Iter 2: narration with median/avg/max numbers reflecting Phase 2 fixes. Done. |

### Streaming-UX queries

| # | Query | What to verify |
|---|---|---|
| 6 | `compare avg price on Hovley Lane vs Washington Street in Palm Desert` | Watch the bubble: text from iter 1 (if any) → AreaStatsCards render → text from iter 2 narration. All in one bubble. **No earlier prose lost** — full stream concatenates. |
| 7 | Anything triggering 3+ iterations | Bubble fills progressively as iterations complete. No "ghost" empty bubble between iterations. |

### Failure-mode queries

| # | Query | Expected handling |
|---|---|---|
| 8 | A nonsense location like `homes in Atlantis` | `searchHomes` returns empty stats. Loop terminates after one iteration. Model writes a graceful "I don't see listings there" message. |
| 9 | A query the model gets stuck on (rare to provoke deliberately) | If model issues the same `(name, args)` set twice in a row, loop emits `_(I'm asking for the same data twice...)_` and breaks. |
| 10 | Force iteration cap (artificial; e.g., a query you know would chain >6 calls) | Loop emits `_(I ran out of reasoning steps...)_` and a `done` event with `iterationsHit: true` in metadata. |

### Multi-component layout

| # | Query | What to verify |
|---|---|---|
| 11 | `compare PGA West homes against Indian Wells appreciation` | One bubble shows: a `neighborhood` component AND an `appreciation` component AND model narration. The component-merge fix is what makes both render — pre-fix, only the second event would render. |

## Verification harness re-run

`npx tsx scripts/verify-chat-stats.ts` was run after the Phase 3 commit. NEW `$facet` numbers are identical to the Phase 2 baseline:

- Beverly Hills: 296 listings, $11,498,763 avg, $6,250,000 median, $14k–$135M range, 73% pool, 54% spa, 85% view, 222 SFR / 73 Condo / 1 Townhouse.
- Irvine: 667 listings, $2,106,395 avg, $1,746,888 median, $468k–$17M range, 92% pool, 64% spa, 66% view, 356 Condo / 263 SFR / 41 TH / 7 Manuf.

Helper integrity intact — Phase 3 didn't regress aggregate math. (The OLD column shifted slightly between Phase 2 and Phase 3 runs because `find().limit(50)` without an explicit sort is non-deterministic — bonus evidence that the old code was unstable on top of being sample-biased.)

The OLD column will continue to drift between runs — that's expected and fine. Watch the **NEW** column for stability across phases.

## Decisions queued for Phase 4

1. **System prompt** — still tells the model to render `[LISTING_CAROUSEL]` markers and Markdown stat tables. With component-first rendering, those tables duplicate UI data. Strip the table instructions; tell the model the UI handles numbers.
2. **`searchArticles` RAG bloat** — still inlines full article bodies into tool results that get fed back to the model. Trim to title + 300-char summary; the frontend re-fetches via `/api/articles/ai-search` anyway.
3. **`deriveTextInsights`** — still runs a 100-doc `publicRemarks` scan on every `searchHomes` call to populate `insights.isGated` / `insights.hasGolf`. Delete once the system prompt stops asking for those flags.
4. **Reasoning-model routing** — for queries with `>=2` expected tool calls, route to a reasoning-tuned model on Groq (DeepSeek R1 distill or Qwen reasoning) for better chained planning. Discuss heuristic vs. user toggle.
5. **Closed-listings tool surface** — helper supports `dataset: 'closed'` architecturally. Possible Phase 4+ work: add a `getMarketTrends` tool covering DOM, sale-to-list ratio, YoY appreciation rather than tacking a flag onto existing tools. Per your guidance: design conversation, not a Phase 3 concern.

## Status

**Done.** Awaiting your manual sign-off on the test plan above before starting Phase 4.

If anything in queries 1–7 produces weird inter-iteration prose or a missing bubble, that's a real bug in this phase. Queries 8–11 are validation, not blockers.
