# Phase 4 Summary — polish

**Commit on `chatlistings`:** `70cde127` (`refactor(chat-v2): component-first system prompt + RAG bloat fix`).

Net diff: **+101 / −511** lines across 5 files.

## What changed

### 1. `src/lib/chat-v2/system-prompt.ts` — full rewrite (457 → 125 lines)

Old prompt was a 450-line tutorial telling the model to:
- Prefix responses with `[LISTING_CAROUSEL]`, `[APPRECIATION]`, `[ARTICLE_RESULTS]`, `[LISTING_DETAIL]`, `[CMA_REPORT]` markers.
- Render Markdown stat tables that duplicated every number the UI was about to render structurally.
- Print example responses verbatim for ~10 query archetypes.

New prompt:
- States that **the UI renders components automatically** from tool results.
- Asks for **1–3 sentences of prose** per tool call that **highlight what's notable, not duplicate the numbers.**
- Documents all 8 tools (was documenting 5) with the right tool-selection rules — including the `propertyType="B"` path for rentals on `searchListings` / `getAreaStats`.
- Explicitly mentions that tools chain across iterations (up to 6) and parallel calls work.

The "voice" section is half a dozen lines: concise, friendly but not effusive, surface one notable fact rather than reciting the data.

### 2. `searchArticles` — RAG bloat killed (`tool-executors.ts:721–:739`)

Was returning `{ title, content }` with `content` set to `article.content || article.excerpt || article.seo?.description || ""`. Article bodies can be thousands of characters each. The loop re-sends the entire conversation on every iteration, so a single chained query containing one article reference could be re-feeding 5–10kB per iteration.

Now returns `{ title, summary }` with summary = `(excerpt | seo.description | content)` truncated at **300 chars** with word-boundary trim and ellipsis.

The frontend never read `content` from the tool result — `ChatResultsContainer.tsx` re-fetches the full article via `/api/articles/ai-search` for rendering. The model getting full bodies was pure context bloat.

### 3. `deriveTextInsights` deleted (`listing-query.ts`)

Was running a 100-document `.find()` on every `searchHomes` call to populate `stats.insights.isGated` and `stats.insights.hasGolf` via JavaScript regex on `publicRemarks`. The new prompt doesn't read those flags. Function deleted, `AreaStats.insights` field removed from the type, import dropped from `tool-executors.ts`.

**Net DB win:** one less Mongo round-trip per neighborhood query.

### 4. `executeSearchHomes` stats shape flattened

Was emitting:
```
stats: {
  ...,
  insights: {
    isGated, hasGolf, keywords,
    hoa: { min, max, avg, count },
    amenities: { poolPercentage, spaPercentage, viewPercentage }
  }
}
```

Now emits:
```
stats: {
  ...,
  hoa: { count, min, max, avg },
  amenities: { poolPct, spaPct, viewPct, fireplacePct, gatedPct, seniorPct }
}
```

Two wins: matches what `AreaStatsCard.tsx` already reads (no double-shape needed), and the field set is ~30% bigger because the `$facet` pipeline already calculates fireplace/gated/senior rates that the old `insights.amenities` shape was discarding.

### 5. `UserBehaviorEvent.tool` union widened (`types.ts:41`)

QA agent caught this. Was `"searchHomes" | "getAppreciation" | "searchArticles"` — three tools, missing the five that exist. The call site at `tool-executors.ts:86` was casting via `as any` so it didn't crash, but the type was lying. Now lists all 8 tool names.

### 6. ChatWidget marker regex — comment, not removal

Added a comment block above the first occurrence (`ChatWidget.tsx:347`) explaining why the marker-stripping regex chains are kept defensively even though the new prompt doesn't emit markers. Stripping is cheap and protects against model hallucination + in-flight messages produced under the older prompt.

## QA review

Spawned a `general-purpose` agent on the diff to flag stale references. **Result: no blocking issues.** Verified clean:

- No code reads `stats.insights.*` anywhere in `src/`.
- No code reads `articleSummaries[].content` anywhere.
- All `[LISTING_CAROUSEL]` etc. references in the codebase are either the defensive ChatWidget regex strips (intentional) or `src/lib/chat/response-parser.ts` (legacy parser, runs on already-clean text).
- `route.ts:84–:106` location-snapshot mode self-contained, no marker references.
- Tool descriptions in `tools.ts` match the new prompt's tool list.
- `verify-chat-stats.ts` runs cleanly; uses only `computeAreaStats` which still exists and emits `hoa` + `amenities` at the right shape.

## Verification — `npx tsx scripts/verify-chat-stats.ts`

Re-run after this commit. NEW `$facet` numbers stable across all four phases:

| Scope | Total | Avg | Median | Pool % |
|---|---|---|---|---|
| Beverly Hills | 296 | $11,498,763 | $6,250,000 | 73% |
| Irvine | 670 | $2,106,129 | $1,746,888 | 92% |

Inventory drift between Phase 3 and Phase 4 runs (Irvine 667 → 670, +3 listings) — that's normal MLS churn during the day. Math is unchanged.

## Reasoning-model routing — deferred

The third item on the original Phase 4 plan was *"Consider routing queries with >=2 expected tool calls to a reasoning model (DeepSeek R1 distill or Qwen reasoning on Groq). Add a simple heuristic or let the user toggle it. **Discuss before implementing.**"*

Per that note, **not implementing it.** The decision points are:

- **Heuristic vs. toggle.** A heuristic ("if query mentions 'compare' or 'vs' or 'and then', route to reasoning model") is fast but wrong sometimes. A toggle is honest but requires UI surface and adds a setting users won't understand. Hybrid (auto-detect + manual override) is best but is the most work.
- **Which reasoning model.** DeepSeek R1 distill on Groq is fast and cheap; Qwen 32B reasoning is more capable. Have a preference?
- **Latency posture.** Reasoning models think longer (they emit hidden chain-of-thought tokens before producing a tool call). For a 3-iteration chained query that costs ~6 extra seconds at the model layer. The streaming UX masks most of it but the gap is real.
- **Streaming compatibility.** Some Groq reasoning models stream the chain-of-thought as visible tokens. The UI would need to either suppress those (hide the `<think>` block) or display them in a collapsible "reasoning" panel.

This is a 30-minute architecture conversation, not a "discuss in a comment" call. Flagging for whenever you want to take it up.

## What's left after Phase 4

Items that exist in the codebase but didn't make any phase:

- **`src/lib/chat/response-parser.ts`** — legacy parser still imported by `ChatWidget.tsx` as `cleanResponseText`. Now runs on already-clean text from the new prompt. Not blocking, but dead-code-ish; worth deleting in a future small PR.
- **Closed-listings tool surface.** `BuildOptions.dataset: 'closed'` is wired through `listing-query.ts` but no tool exposes it. Per Phase 3 sign-off note: design conversation, possibly a `getMarketTrends` tool covering DOM, sale-to-list ratio, YoY appreciation rather than a flag on existing tools.
- **`route.ts:84–:106` location-snapshot mode** — self-contained, but the prompt-override pattern is awkward now that it lives below a much-shorter `SYSTEM_PROMPT`. Could be moved to its own constant. Cosmetic.
- **`AreaStatsCard.tsx` polish.** Currently bare-bones. Sparklines / histograms of price distribution would be a natural follow-up.

## Complete refactor scorecard

| Phase | Commits | Net lines | What it unblocked |
|---|---|---|---|
| 1 | 2 | −13 | Removed regex pre-route forcing `getListingDetails` |
| 2 | 5 | −400+ in executor, +762 in helper | Filter parity, full-set aggregation, county scope, `searchListings`, `getAreaStats`, BH stats fix ($1.4M→$11.5M avg) |
| 3 | 2 | +220/−208 | Real bounded agent loop (max 6 iterations), parallel tool calls, dup-batch detection, error recovery |
| 4 | 1 | +101/−511 | Component-first prompt, searchArticles RAG trim, dead `deriveTextInsights` removed, stats shape flattened |

**Total:** 10 code commits, 4 doc summaries, ~1100 lines deleted, ~1100 added, but the 1100 added is mostly the `listing-query.ts` helper (one-time investment that 3 tools now share). The actual chat code is meaningfully smaller and meaningfully more correct.

## Status

**Done.**

The chat-v2 stack now:
- Picks tools without hard-coded regex routing (Phase 1)
- Computes stats over the full filtered set with every advertised filter applied at the DB layer, supports county/city/subdivision/street/zip scopes, and exposes a real `searchListings` tool for "show all listings on a street" plus `getAreaStats` for aggregate questions including rentals (Phase 2)
- Runs a real bounded agent loop with parallel tool calls so the model can chain "search → look at result → call another tool → narrate" (Phase 3)
- Has a component-first system prompt that tells the model to narrate, not duplicate, the data the UI renders (Phase 4)

Awaiting your manual sign-off on the Phase 3 + 4 test plans.
