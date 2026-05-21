# Phase 1 Summary — drop regex pre-route

**Commit:** `af3a0183` (`refactor(chat-v2): drop regex pre-route that forced getListingDetails`)
**Scope:** one file, 13 lines removed, 2 changed.

## What changed

`src/app/api/chat-v2/route.ts`

- Removed the `hasStreetAddress` regex block (was lines 116–127): two regexes (`streetPattern`, `streetNameOnly`) plus the conditional `tool_choice` override that forced `{ type: "function", function: { name: "getListingDetails" } }` whenever either matched.
- `tool_choice` on the Groq call is now the literal string `"auto"`. No other call-site changes.
- Removed the `(forced: getListingDetails)` suffix from the request log.

Nothing else touched. `streaming.ts`, `tool-executors.ts`, `tools.ts`, `system-prompt.ts`, and the frontend are untouched.

## Why

Per the analysis (`docs/chat-production/chat-analysis.md` — "Bonus: regex pre-routing in the API handler is brittle"), the regex matched any message mentioning a street suffix, including aggregate-style queries like *"average price on Desi Drive"* — those got force-locked to the single-listing tool. With Phase 2 about to add `searchListings` and `getAreaStats`, leaving the override in place would mask the new tools entirely for street-mentioning queries.

## Manual test plan

Run dev server and try each in the chat. Expectation: the model picks the tool itself based on user intent. None of these should hard-route anywhere — we're testing that nothing is forced.

| # | Query | Expected tool | Why |
|---|---|---|---|
| 1 | `average price on Desi Drive` | **NOT** `getListingDetails`. Pre-Phase-2: probably `searchHomes` (best available) or model says it can't. | Aggregate intent on a street; before, this was forced to single-listing. |
| 2 | `homes on Hovley Lane` | **NOT** `getListingDetails`. Likely `searchHomes` for now. | Multi-listing intent on a street. |
| 3 | `tell me about 12345 Desi Drive` | `getListingDetails` (model's choice — house number + street is a single-property query) | Confirms we didn't break the single-listing path. |
| 4 | `tell me about Indian Wells` | `searchHomes` or `askClarification` | Sanity: city-level queries unaffected. |
| 5 | `show me homes in PGA West with pools` | `searchHomes` | Sanity: subdivision filter queries unaffected. |
| 6 | `what's the appreciation in La Quinta` | `getAppreciation` | Sanity: appreciation path unaffected. |

What to watch in the server log: lines starting `[Chat V2] Groq request sent with 6 tools available`. The old `🎯 Street address detected` line should be gone for **every** query.

## Decisions needed before Phase 2

None for Phase 1 itself. Two questions queued for Phase 2 kickoff:

1. **Rent fields on `UnifiedListing`** — Phase 2d needs to know what rent / income fields exist. Filtering happens at `tool-executors.ts:172` where `propertyType: "A"` (sales) is hardcoded and excludes type B (rentals). Need to confirm whether rentals are in the same collection (gated by `propertyType: "B"`) or somewhere else, and which field carries the rent figure.
2. **Median in Mongo** — `$bucketAuto` vs. `$sortByCount` vs. percentile via `$group` + `$arrayElemAt` over a sorted `$push`. I'll prototype the cleanest version and show it in the Phase 2 diff for sign-off rather than ask up front.

## Status

**Done.** Awaiting your sign-off before starting Phase 2 (filter parity + Mongo aggregation + `searchListings` + `getAreaStats`).
