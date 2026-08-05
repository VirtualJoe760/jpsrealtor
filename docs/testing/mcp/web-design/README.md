---
title: Web-Design Judge Loop — full operational reference
status: current
last_verified: 2026-08-05
related: [../../agents/tom.md, create-agent.md, ../../README.md, ../../../content-templates/copy-voice.md, ../../../AGENTS.md]
---

# The web-design feedback loop, end to end

Automated QA for ChatRealty test sites. `docs/testing/README.md` is the
overview; this is the complete operational reference — every endpoint, the
report format, the judging standard, and how to unstick the loop.

> **All three actors run on Joe's Mac.** This document was written for a
> two-machine split and the framing survives in places. What made it race-free
> was never the machine boundary — it's the two API invariants below, enforced
> server-side.
>
> The judge is now a real agent: **`docs/testing/agents/tom.md`** covers his
> tools, dispatch mechanism, and the in-flight marker this design doesn't
> account for. Read it alongside this file.

## Actors

| Actor | What it is | Does |
|---|---|---|
| **Test Claude** | a Claude Code child session, spawned by Tom via `sessions_spawn` | Builds a site with the ChatRealty MCP (`get_build_guide` flow), files `report_bug` / `give_feedback` as it goes |
| **Tom** | an OpenClaw agent, cron `*/15` | Invents the persona, writes the brief, spawns the builder, scores the finished site against the rubric below, coaches, submits the report, turns testing off |
| **The routine** | scheduled task `judge-loop-check`, every 5 min | Reads the report, verifies + fixes what it names, updates docs, commits, completes the report (which re-arms testing) |
| **Joseph** | `/admin/agent-feedback` | Watches the loop; manual overrides when either half is down |

## Two standing rules that outrank everything below

1. **Tom's job is to break the product, not to please Joe.** A session that
   found nothing is a session that didn't look hard enough. A 92 that missed a
   broken data hookup is worse than a 54 that found it. Softening a finding or
   rounding a score up is a failure mode, not diplomacy.
2. **Real listing data is mandatory and assumed broken.** The market is **GPS
   MLS only** (Greater Palm Springs) because that's the only MLS the Spark test
   credentials cover. A documented failure to connect real data is a *good*
   session and leads the report; a silent fallback to sample listings is a
   wasted one.

   **There are no `SPARK_*` env vars — don't write briefs that ask for them.**
   The build guide's real-data path is `npx @chatrealty/sync init --token
   crt_live_…` (provisions the tenant DB) plus feed credentials in `.env.local`
   under RESO names: a Spark access token goes in as `RESO_BEARER_TOKEN` with
   `RESO_BASE_URL=https://replication.sparkapi.com/Reso/OData`, or RESO OAuth as
   `RESO_TOKEN_URL` / `RESO_CLIENT_ID` / `RESO_CLIENT_SECRET`. Session 8's brief
   told Test Claude to set `SPARK_OAUTH_KEY` / `SPARK_ACCESS_TOKEN`; nothing
   reads those. And `CHATREALTY_API_TOKEN` alone is **not** a connected feed —
   it authenticates the site to the API and reads the shared dataset, which is
   what that build shipped on.

## The cycle

```
 [testingOn = true]
        │
        ▼
 Tom → sessions_spawn's Test Claude ──► site gets built, bugs filed via MCP
        │   (marker written same turn; child reports its own completion)
        ▼
 Tom scores the RENDERED site in a browser (rubric below), coaches Test Claude
        │
        ▼
 Tom POST /api/skill/testing {title, markdown, testingOff:true}
        │                                 [testingOn = false, marker cleared]
        ▼
 routine (≤5 min later): claim → read → verify each claim → fix →
 update docs → commit/push → complete + "resolution notes"
        │                                 [testingOn = true]
        ▼
 Tom polls GET /api/skill/testing:
   latestReport.status == "complete" && testingOn == true  → next test,
   relaying resolutionNotes verbatim as "recently fixed, please re-verify"
```

**What this cycle omits:** the dispatch condition stays true for a build's
entire duration, since it only clears at the POST. Tom therefore keeps an
in-flight marker on disk — otherwise he dispatches a fresh persona every 15
minutes on top of a running build. See `../../agents/tom.md`.

Two invariants make this race-free:

1. **Each side writes one toggle direction only.** Judge → OFF (its PATCH
   rejects `true` with 403). Routine → ON (as a side effect of `complete`).
2. **One open report at a time.** `POST` answers `409 report_pending` while any
   report is `new`/`in_progress`. A 409 is the alarm that the loop is stuck,
   not a queue-full condition to retry.

## The judge's API

Base `https://jpsrealtor.com`. Auth: `Authorization: Bearer crt_live_…` — a
normal skill token (chatrealty.io/agent/settings → Integrations; either
purpose; no extra scope). Rate-limited like every skill route.

### Poll

```bash
curl -s https://jpsrealtor.com/api/skill/testing \
  -H "Authorization: Bearer $CRT_TOKEN"
```
```json
{
  "testingOn": true,
  "latestReport": {
    "id": "66a9…", "title": "Session 12 — LA agent, luxury",
    "status": "complete",
    "submittedAt": "2026-07-31T18:02:11.000Z",
    "completedAt": "2026-07-31T18:31:40.000Z",
    "resolutionNotes": "Fixed X (commit abc123)… tell Test Claude to retry Y."
  }
}
```
`resolutionNotes` is non-null only once complete — relay it verbatim to Test
Claude when dispatching the next build.

### Submit the session report (and turn testing off)

```bash
curl -s -X POST https://jpsrealtor.com/api/skill/testing \
  -H "Authorization: Bearer $CRT_TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Session 12 — LA agent, luxury","markdown":"# …","testingOff":true}'
```
`201 { ok, reportId, status:"new", testingOn:false }` · `409 report_pending` if
one is already open · `400` on missing title/markdown or markdown > 200k chars.

### Toggle only (rarely needed — POST with `testingOff` covers the normal path)

```bash
curl -s -X PATCH https://jpsrealtor.com/api/skill/testing \
  -H "Authorization: Bearer $CRT_TOKEN" -H "Content-Type: application/json" \
  -d '{"testingOn":false}'
```

### Judge pseudocode

```
loop every N minutes:
  s = GET /api/skill/testing
  if s.testingOn and (s.latestReport is null or s.latestReport.status == "complete"):
      dispatch Test Claude (include s.latestReport.resolutionNotes, if any)
      … build happens; judge scores the result …
      POST report {title, markdown, testingOff: true}
  else: wait   # routine still working, or a report is pending
```

## The report format

Markdown, by convention (the routine reads whatever arrives, but this shape
gets acted on fastest — `## Bugs found` is the section the routine works from):

```markdown
# Session 12 — LA agent, luxury positioning

## Verdict
Gates: 6/7 passed (failed: attribution missing on CHAP result cards)
Score: 78/100 — ship with punch list

## Bugs found
### CHAP result cards missing "Listed by" attribution
- Severity: critical (compliance gate)
- Repro: ask CHAP "3 beds under 800k", inspect result cards
- Expected: "Listed by {office} — {agent}" per card
- Actual: price/beds/baths only
- Filed: report_bug id 66aa… (if Test Claude filed it)

### <next bug…>

## What Test Claude was told to improve
- …

## Session notes
Variants chosen: photo hero, full-page CHAP, outlined pills. Mock iterated 2x.
```

## The judging standard

The judge scores against this. Full derivation lives in the session that
produced it; the operative version:

**Gates — any one fails, the site is not shippable:**

1. IDX attribution everywhere listings render (cards, detail, map popups, CHAP results)
2. License + brokerage on every route, never gated (distinct from the contact-gating choice)
3. Right person, right market — zero sample-persona remnants anywhere, **and
   the UNFILTERED `/listings` plus the homepage's featured homes show cities
   the agent serves.** Session 8 passed every identity check and failed here:
   the city filter worked, so nobody looked at the default, which was serving
   the newest listings statewide. Check the default, not the filter. Since
   create-chatrealty-site@0.12.0 the template scopes the default browse to
   `MARKET_CITIES` / `AGENT_SERVICE_AREAS` / the profile's service areas, and
   shows a dev-only notice when it has nothing to scope by.
4. Mode honesty — test data never deployed; real mode serves the agent's own feed
5. Token boundary — no `crt_live_` in page source or browser-originated calls
6. Neutral listing copy — nothing implying another agent's listing is stale/overpriced
7. Functional floor — clean `tsc`, clean build, every route 200, usable at 375px

**Dimensions (100):** buyer's journey 20 · unmistakably-theirs (anti-template)
20 · CHAP done right 15 · truth (geography/stats/declined-features) 15 · copy
voice 10 · craft (console, tokens, a11y) 10 · process artifacts (mock history,
per-axis choices, bugs filed not just fixed) 10.

**Method:** judge in a browser like a buyer — DevTools open before first load
and kept open; every route desktop + 375px; heart a listing signed out; three
CHAP queries including a nonsense one; one test lead; copy sweep against
`copy-voice.md`; diff against the pristine template; gates first; every point
granted or withheld cites a screenshot, file, or log line. **Verdict bands:**
gates + ≥85 ship-ready · 70–84 ship with punch list · <70 rebuild the failing
dimension.

## Our side

| Piece | Where |
|---|---|
| Models | `src/models/AgentTesting.ts` — `AgentTestReport`, `TestingState` (singleton; helpers `getTestingState` / `setTestingOn`) |
| Judge API | `src/app/api/skill/testing/route.ts` |
| Admin API | `src/app/api/admin/agent-feedback/route.ts` (session + `isAdmin`) |
| Admin page | `/admin/agent-feedback` — toggle + who flipped it, reports w/ verbatim markdown, manual status controls |
| CLI | `scripts/agent-feedback.mjs` — `check` (exit 3 = nothing new) · `show` · `claim` · `complete <id> "notes"` (also sets testingOn=true) · `toggle on\|off` |
| Routine | scheduled task `judge-loop-check`, `*/5 * * * *`; prompt lives at `~/.claude/scheduled-tasks/judge-loop-check/SKILL.md` |
| Storage | Mongo `agenttestreports`, `testingstates` |

The routine's contract, in order: cheap `check` (silent no-op on exit 3) →
`claim` → read → **verify every claim against the code before fixing** (reports
can be wrong about root cause — the "missing token minter" was a wrong URL in
the guide) → fix → cross-resolve any `report_bug` ids via `scripts/cr-bugs.mjs`
→ update the docs it touched, same commit (`docs/AGENTS.md` policy) → push →
`complete` with notes written for Test Claude's benefit → tell Joseph.

## Failure modes and recovery

| Symptom | Meaning | Fix |
|---|---|---|
| Judge gets `409 report_pending` | Routine hasn't processed the open report | Wait; if >1h, Joseph checks `/admin/agent-feedback` — the routine machine is probably closed (it only runs while the app is open) |
| `testingOn` stuck false, report complete | `complete` ran but toggle write failed (they're one command — rare) | Toggle from the admin page, or `node scripts/agent-feedback.mjs toggle on` |
| Report `in_progress` for hours | Routine claimed it then died mid-fix | Read the report; finish by hand or `complete` with honest notes; the next `check` resumes normal service |
| Judge sees `401` | Token revoked/expired | Mint a new one at chatrealty.io/agent/settings → Integrations |
| Two reports needed for one session | Don't. One session = one report | Fold addenda into the next session's report |

## Relationship to `report_bug` / `give_feedback`

Unchanged and still expected from Test Claude — structured bugs and full
session zips. The judge report is the **orchestration layer**: verdict + fix
list + the status that drives the loop. The routine cross-references bug ids
named in the report and resolves them alongside its fixes.
