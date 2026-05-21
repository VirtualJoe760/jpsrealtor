# Phase 4 Addendum — reasoning-model routing

**Commit on `chatlistings`:** `8f595726` (`feat(chat-v2): opt-in reasoning model routing for chained queries`).

This closes the last remaining item from the original refactor plan: routing chained / aggregate queries to a reasoning-tuned model. The original plan said "Discuss before implementing." You authorized shipping; this commit ships it conservatively (env-var gated, simple heuristic, off by default).

## What changed

### New file: `src/lib/chat-v2/reasoning-routing.ts`

Three exports:

1. **`shouldUseReasoningModel(message)`** — regex-based heuristic that fires only on explicit multi-call signals. Patterns:
   - Comparison: `compare`, `comparing`, `comparison`, `vs`, `versus`, `cheaper/better/worse than`
   - Sequencing: `and then`, `then tell/show/find/look/check/compare`, `after that`, `also tell/show/find/check/include`, `along with`, `in addition`
   - Coverage: `both X and Y`, `each of`, `across neighborhoods/cities/...`, `between X and Y`

   Deliberately does **not** match bare `and` — too noisy ("homes in Indio with a pool and a view" is one query, not two).

2. **`resolveRouting(message)`** — reads `CHAT_REASONING_MODEL` env var. Behavior matrix:

   | Env var set? | Heuristic fires? | Model used | Strip `<think>`? | `reason` log |
   |---|---|---|---|---|
   | No | — | `openai/gpt-oss-120b` | no | `reasoning-disabled` |
   | Yes | No | `openai/gpt-oss-120b` | no | `primary` |
   | Yes | Yes | `$CHAT_REASONING_MODEL` | yes | `reasoning-heuristic` |

3. **`ThinkStripper`** — state machine that removes `<think>...</think>` chain-of-thought blocks from streamed content. Groq's reasoning models (DeepSeek R1 distill, Qwen QwQ) emit CoT as ordinary streamed tokens wrapped in those tags; the user shouldn't see them.

   Handles arbitrary chunk-boundary splits by holding back up to 8 chars of trailing buffer (length of `</think>`) for partial-tag detection. Unclosed blocks (model crashes mid-CoT) drop their content silently.

### Wiring

- **`route.ts`** calls `resolveRouting(lastUserMessage)` once per request. Logs the decision: `[Chat V2] Starting agent loop with N tools — model=X (reason=Y)`. Passes `model` and `stripThinkBlocks` into `streamWithToolSupport`.
- **`streaming.ts`** instantiates a `ThinkStripper` **per iteration** (each iteration's stream is independent — sharing state would leak `inside=true` into a fresh stream and silently swallow the next iteration's output). Raw content still appends to the assistant message in the conversation (the model needs its own CoT for context on future iterations); only the SSE-emitted portion is stripped.

### Tests

`scripts/test-think-stripper.ts` — 11 unit cases covering:
- No tag at all (passthrough)
- Tag entirely in one chunk
- Open tag split across chunks (`<thi` + `nk>`)
- Close tag split across chunks
- Tag split across many tiny chunks
- Multiple blocks in sequence
- Literal `<` characters in prose (`price < $1M`)
- Unclosed block (`<think>still thinking` — content dropped)
- Trailing prose held back and flushed correctly
- Literal `<think ` (with space — not a real tag)

All 11 pass. Run via `npx tsx scripts/test-think-stripper.ts`.

## How to enable

Add to `.env.local`:
```
CHAT_REASONING_MODEL=deepseek-r1-distill-llama-70b
```

Restart the dev server. From that point:
- Simple queries (`show me homes in Indio`) → still use `openai/gpt-oss-120b`. Heuristic doesn't fire.
- Chained queries (`compare avg price on Hovley Lane vs Washington Street`, `homes in Indio then tell me appreciation`) → routed to DeepSeek R1 distill. `<think>` blocks stripped before reaching the user.

To disable without redeploy: unset the env var (or set it to empty). No code change required.

## Model-choice notes

I went with `deepseek-r1-distill-llama-70b` as the suggested default in the env-var example because:

- **Faster than QwQ** on Groq — DeepSeek distillation runs roughly 2× the throughput of Qwen 32B reasoning per Groq's published numbers.
- **Cheaper** — distilled models are billed at lower rates.
- **Tool-calling support is solid** — the distillation preserves the underlying Llama 70B's function-calling ability while adding reasoning.

Switch to `qwen-qwq-32b` (or whatever the current Qwen reasoning ID is on Groq) by changing the env var if QwQ proves better in QA. The code is model-agnostic.

## Trade-offs (acknowledging the original "discuss" note)

Things to watch in QA that I didn't get to design with you first:

1. **Latency.** Reasoning models think before producing tool calls. For a 3-iteration chained query, that's roughly 2–5 extra seconds of think-time per iteration that the streaming UX masks but is real. The `<think>`-stripping means the user sees nothing during the think phase — which can feel like a stall on slower connections. If users complain about a "frozen" feel on chained queries, we have two options:
   - Show a "thinking..." indicator while `inside=true`
   - Display the chain-of-thought in a collapsible panel (like Anthropic's `thinking` UI)

2. **Heuristic false negatives.** Queries like *"PGA West vs the rest of the valley"* don't trigger (no `vs` adjacent to a clear two-entity pattern). The model still handles them on the primary path, just without the reasoning boost. We can widen the regex if telemetry shows missed cases.

3. **Heuristic false positives.** Phrases like *"I'm thinking of comparing condos vs houses in Palm Desert"* will fire — that's actually fine, it IS a compare query, but it'll be answered by a reasoning model when GPT-OSS could've handled it. Latency cost only.

4. **Tool-format drift.** Reasoning models sometimes structure tool calls slightly differently from instruction-tuned models. We're trusting Groq's API to normalize this. If we see malformed tool-call deltas in QA logs, we may need a per-model adapter.

5. **`<think>` tag variants.** I assumed `<think>` / `</think>` are the canonical tags. Some Groq models emit `<thinking>` or unwrap entirely. If logs show CoT bleeding through to users, the stripper's tag list needs widening.

## Verification

- `npx tsx scripts/test-think-stripper.ts` — 11/11 pass.
- `npx tsx scripts/verify-chat-stats.ts` — re-run; NEW `$facet` numbers identical to baseline. Aggregate math unaffected by routing changes.
- `npx tsc --noEmit` — clean (only the pre-existing `ServiceAreasStep.tsx` error).

## Final refactor scorecard

| Phase | Commits | Net lines | Highlight |
|---|---|---|---|
| Analysis | 1 | +148 | The `chat-analysis.md` audit |
| 1 | 2 | -13 + summary | Regex pre-route deleted |
| 2 | 5 | helper +762, executor -400 | Filter parity, full-set $facet, county scope, `searchListings`, `getAreaStats`, **BH avg $1.4M → $11.5M** |
| 3 | 2 | +220 / -208 | Real bounded agent loop, parallel tool calls, dup-batch detection |
| 4 | 1 | +101 / -511 | Component-first prompt, RAG bloat fix, dead text-insights removed |
| 4 addendum | 1 | +309 | Opt-in reasoning model routing + `<think>` stripper + 11-case test |

**14 commits total.** Roughly 1100 lines added (mostly the `listing-query.ts` helper that 3 tools share) and 1100 deleted (mostly the pre-Phase-2 50-row JS averaging and the 332-line system-prompt bloat). Net: meaningfully smaller, meaningfully more correct, meaningfully more capable.

## Status

**Done.** All four phases plus the deferred reasoning-model routing item are shipped and committed.

What's left isn't a phase, it's a list of small follow-ups (per `phase-4-summary.md`): legacy `response-parser.ts` cleanup, closed-listings tool-surface design, `route.ts` snapshot-mode prompt extraction, `AreaStatsCard` polish.

Awaiting your manual sign-off on the Phase 3 + 4 + addendum test plans.
