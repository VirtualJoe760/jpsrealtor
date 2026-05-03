# Latency Deep Dive — chat-v2

User reported: chat responses take a very long time. This document enumerates every plausible cause with mechanics and impact estimates, then ranks proposed fixes. Instrumentation has been added so the next test run will produce real numbers; until then this is hypothesis-driven.

## What I dismissed too quickly in the test playbook

I said "worst-case 12–18s for chained queries; the streaming UX masks most of it." That was wrong on two counts:

1. **The streaming UX does NOT mask iter 1.** Iteration 1 typically emits **only the tool call** with no `content` deltas. From the user's perspective: they hit send, the typing indicator spins for 1–3 seconds, *then* a component card appears, *then* text starts streaming in iter 2. The first 2/3 of the wait is dead air.
2. **Even simple, single-tool queries take 2 iterations.** The architecture I shipped requires iter 1 for the tool decision and iter 2 for the narration of the result. Every tool-using response pays this cost. The screenshot the user sent (desi drive → clarification → "Indian Wells" → 2-listing match) hit this twice — ~4 Groq round-trips, plus a slow DB query in the middle.

## Iteration cost — the elephant

Every Groq round-trip costs **time-to-first-token + token-emit-time**. For `openai/gpt-oss-120b` on Groq's free/standard tier:

- Time-to-first-token: 200ms–1s typical, **up to 3s under queue pressure**.
- Token rate: ~100 tok/s on streaming output.
- Iter 1 emits a tool call (~50–100 tokens of JSON); ~1.0–2.0s total.
- Iter 2 emits narration (~50–150 tokens); ~1.5–2.5s total.

**Minimum cost per tool-using response: ~3–5s, before tool execution.** Two-tool chains: 5–9s. The user's observed "very long" maps to this.

## Tool-execution suspects (instrumentation will name and shame)

### `getListingDetails` — non-anchored regex collection scan

`tool-executors.ts:756–:768`. For non-numeric queries like `"desi drive"`:

```ts
const slugRegex = startsWithNumber
  ? new RegExp(`^${slugQuery}`)  // anchored — uses slugAddress index
  : new RegExp(slugQuery);       // CONTAINS — full collection scan
```

The comment on line 759 (`"still fast for short patterns"`) is wishful. A non-anchored regex on `slugAddress` cannot use the B-tree index — Mongo runs a **COLLSCAN** across every document. At ~76,000 active listings, this is **1–3 seconds**.

The fallback (`tool-executors.ts:770–:778`) is even worse: a multi-word lookahead regex on `unparsedAddress`. Same COLLSCAN, more regex backtracking. Easily another 1–2s when it runs.

For Desi Drive specifically, if the slug data uses `desi-dr` (abbreviation) but the user types `desi drive`, the slug regex returns 0 hits and the fallback runs — **two collection scans per call**, ~2–4s tool execution.

**This is probably the single biggest single-tool latency.**

### `getListingDetails` — photo lookup

`tool-executors.ts:786–:796`. For listings whose `primaryPhotoUrl` is null, a follow-up query selects the entire `media` array:

```ts
const photoLookups = await UnifiedListing.find(
  { listingKey: { $in: missingPhotos.map(...) } },
).select('listingKey media').lean();
```

The `media` array can be 10–20 photo records per listing, each with multiple URI variants (`Uri800`, `Uri1024`, `Uri1600`, `MediaURL`, etc.). 10 listings × 15 media items × 5 URIs each = 750 string fields. **Multi-MB Mongo round-trip** even though we only need one URL per listing. ~300ms–1s.

### `searchHomes` / `getAreaStats` — `$facet` over filtered sets

The Phase 2 aggregation is solid for correctness but does **5 parallel pipelines** in one `$facet`. For Beverly Hills (296 listings) it's fine. For Riverside County (could be 10k+) it could be slow. Instrumentation will reveal.

### `searchArticles` — Mongo `$text` on Article collection

Pre-Phase-4: inlined full article bodies as tool result, bloating subsequent iteration prompts (10kB+ articles re-sent every iteration). **Phase 4 fixed this** to 300-char summaries. Should no longer be a hotspot.

## Conversation-bloat suspect

Each iteration appends:
- 1 assistant message (tool_calls JSON, ~500B–2kB)
- 1 tool result message (varies wildly: `clarification` is ~200B, `listingResults` with 50 listings is ~25kB, `listingDetail` ~3kB, `areaStats` ~5kB)

By iter 3–4 the prompt can grow to 30–50kB. Groq processes the **entire conversation** every iteration; prompt-token cost is linear in size. This shows up as inflated time-to-first-token on later iterations.

The new `[Streaming] Iteration N — prompt ~XXX tokens` log line will show this directly.

## The 2-iteration tax on `askClarification`

This one I want to flag carefully because of the user's earlier note (*"if you find yourself writing `if (component === 'listingOptions') skipLoop()`, stop and tell me"*).

Pattern observed in the screenshot:
- User: `desi drive`
- Iter 1: model emits `askClarification(question="Which city's Desi Drive?", options=[...])` with no content
- Tool runs (~5ms — pure passthrough)
- Iter 2: model paraphrases its own question — `"I'm ready to pull details once you let me know which city's Desi Drive..."`
- Total: 2 full Groq round-trips for a clarification flow.

For `askClarification`, the tool result IS the response. The model has **no new information** in iter 2 — it's just rewording itself. This is different from `listingOptions` (where iter 2 adds value: narration over multiple matches). I think the conditional skip the user warned against was specifically about `listingOptions`. **`askClarification` may be a legitimate special case.** Flagging for discussion rather than implementing.

The cleaner alternative: prompt the model to write the question text in iter 1 *alongside* the tool call. The architecture allows it (assistant messages can have both `content` and `tool_calls`); GPT-OSS just doesn't tend to do it without prompting. Would require system-prompt change, no skip needed.

## Groq tier / queueing

Free tier: 30 RPM, queued if exceeded. Even with a single user, **bursty queries trigger queueing** because each chat response is 2–4 calls within a few seconds. If you see iter 1 taking >3s and iter 2 fine, that's queue back-pressure.

`CHAT_REASONING_MODEL` swap (Phase 4 addendum) further compounds this: the reasoning model adds chain-of-thought tokens before the visible response, easily doubling per-iteration time.

## Ranked hypothesis table

| # | Hypothesis | Likely contribution | How to validate (after this commit) |
|---|---|---|---|
| 1 | 2-iteration architecture is the floor cost | 3–5s per tool-using response | `[Streaming] iter N done — groq XXms` lines: if iter 1 + iter 2 sum to ~3000ms, that's the floor |
| 2 | `getListingDetails` collection scan on non-anchored regex | +1–3s on text queries | `[Streaming] iter N done … tools [getListingDetails=NNNNms]` will show >1500ms |
| 3 | Iter 1 has no content → 2s of dead air for the user | Perceived latency, not real | Browser network tab: time from send to first SSE `token` event |
| 4 | Photo lookup pulling entire `media` arrays | +300ms–1s | `[executeGetListingDetails] ⚡ Lookup took XXXms` line — already present, line 781 |
| 5 | Conversation bloat on later iterations | +200ms–1s on iter 3+ | `[Streaming] Iteration N — prompt ~XXX tokens` line: watch token count grow |
| 6 | Groq tier queueing | Variable, could be 0 or 2s+ | iter 1 first-token time will be high (>1500ms) consistently if tier-limited |
| 7 | `askClarification` 2-iteration redundancy | +1.5–2.5s on every clarification | iter 2 after `askClarification` always runs ~1500ms with no new tool calls |

## Proposed fixes, ranked by impact / ease

### A. Fix `getListingDetails` to use prefix-anchored slug lookup or a dedicated text index *(big win, contained change)*

Replace the non-anchored regex with one of:
- A pre-built normalized lookup table (the `LocationIndex` model exists and has the autocomplete pipeline) — **fast** but requires building/syncing index entries for street names.
- An ngram or word-prefix index on `slugAddress` / `unparsedAddress` — Mongo supports text indexes; specific to this collection.
- For street-only queries (no house number), route to `searchListings` with `scope: "street"` instead of `getListingDetails`. The new tool already exists; it's a prompt-level redirect.

**Impact:** removes 1–3s for any text-based listing lookup. **Risk:** changing index strategy is a separate review; the prompt-redirect option is zero-risk.

### B. Make iter 1 emit narration alongside the tool call *(perceived latency win)*

Add to system prompt: *"When you call a tool, also write 1 short sentence in your response saying what you're looking up — e.g., 'Let me check Beverly Hills inventory.' Don't wait for the tool result to start writing."*

User sees text streaming during iter 1's ~1.5s window instead of dead air. Total time unchanged but **the wait feels half as long.** This is the cheapest highest-ROI change available.

**Impact:** eliminates ~1.5–2s of perceived dead air per response. **Risk:** GPT-OSS may not consistently comply; we'd need to measure. Worst case: no harm.

### C. Special-case `askClarification` to skip iter 2 *(real-time win, contained)*

Re-introduce a *single* skip-second-call branch only when the iter 1 batch is exclusively `askClarification` calls. The tool's data shape is `{ component: "clarification", clarification: { question, options, context } }` — the question IS the response. Frontend already renders the buttons from the component event.

This is the user-flagged anti-pattern, but I think the user's warning was specifically about `listingOptions` (where iter 2 adds value: narration over multiple matches). For `askClarification`, iter 2 has no information to add. Worth a discussion rather than just doing it.

**Impact:** removes 1.5–2.5s on every clarification flow. **Risk:** the user explicitly told me to flag this rather than implement it. Asking now.

### D. Trim `media` projection in photo lookup *(contained, easy)*

`tool-executors.ts:786–:796` selects the entire `media` array. We only need `media.0.Uri800 || media.0.Uri640 || media.0.Uri1024`. Project just `media.0`:

```ts
.select({ listingKey: 1, "media.0.Uri800": 1, "media.0.Uri640": 1, "media.0.Uri1024": 1 })
```

**Impact:** ~200–500ms reduction when this branch fires (only when listings lack `primaryPhotoUrl`). **Risk:** none.

### E. Fast model for iter-1 tool routing *(big architectural)*

Use Groq's `llama-3.1-8b-instant` (800+ tok/s, vs 100 for gpt-oss-120b) for iter 1's tool-decision step, only routing to the bigger model for iter 2's narration. The 8b model handles tool calls fine for simple cases.

**Impact:** maybe 50% reduction on iter 1 latency = 0.5–1s saved per response. **Risk:** model-quality regression on hard tool-decisions; needs careful testing.

### F. Streaming UI: show "looking up X..." indicator during iter 1 *(perceived only)*

Independent of B above — even without prompt-driven iter-1 narration, the frontend could show a "Looking up listings…" indicator during the silent window. This is a ChatWidget change, not a model change.

**Impact:** only perceived latency. **Risk:** trivial.

## Recommended next steps in order

1. **Run the same flow with the timing commit deployed** (commit `73af4afb`). Paste the server-log block. We need real numbers before any fix lands.
2. **Pick one of A or B.** A reduces real time on hot queries; B reduces perceived time on every query. They're independent — could do both.
3. **Decide on C.** I want explicit user direction before re-introducing any skip-iter-2 logic.
4. **D is a no-brainer** — small contained perf fix; can ship anytime.
5. **E is bigger** — defer until we have data showing iter 1 is the culprit (vs tool execution).

## Test protocol for capturing the data

Once the dev server is restarted with `73af4afb`:

1. Clear server log buffer.
2. Send `desi drive` in chat. Wait for full response.
3. Click `Indian Wells`. Wait for full response.
4. Capture every `[Streaming]` line from server logs.
5. Note the wall-clock duration of each response from the user's perspective (start typing → response complete).

The logs will produce, per response:
```
[Streaming] Iteration 1/6 — prompt ~XXX tokens
[Streaming] iter 1 done — groq XXms (first-token YYms), tools [name=ZZms, ...]
[Streaming] Iteration 2/6 — prompt ~XXX tokens
[Streaming] iter 2 done — groq XXms (first-token YYms), tools [...]
[Streaming] 🏁 Total Tms (N iters, groq Gms, tools Tms, overhead Oms)
```

That tells us exactly where the 8–12 second wall-clock is going. Then we pick fixes based on real data, not hypothesis ranking.

## Status

**Diagnosis without numbers, instrumentation deployed, awaiting real measurements.** Don't want to ship fixes blind — the wrong fix wastes time and confuses signal.

When you re-run the query, paste the server-log block and we'll know within 30 seconds which of the seven hypotheses are real.
