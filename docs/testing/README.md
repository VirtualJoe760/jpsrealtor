---
title: Judge Loop — automated test-site feedback
status: current
last_verified: 2026-08-04
related: [agents/tom.md, mcp/web-design/README.md, ../AGENTS.md, ../content-templates/copy-voice.md]
---

# The judge loop

An automated QA cycle. **Test Claude** builds a ChatRealty site from a brief;
**Tom** — a real OpenClaw agent — scores it against a rubric, coaches it, and
submits a markdown session report here; **our routine** reads the report, fixes
what it names, and re-arms the loop.

> **Everything runs on Joe's Mac.** The original design split this across two
> machines and the docs still carry that framing in places. The handshake below
> survives the collapse intact because the API enforces it server-side, not
> because the machines were separate.

- **`agents/tom.md`** — the judge as built: his files, tools, cron, dispatch
  mechanism, and the environment facts that cost a night to learn. Start here.
- **`mcp/web-design/README.md`** — the reference: every endpoint with examples,
  the report format, the judging standard, failure-mode table.

## What this loop is actually for

Not "does Test Claude build a nice site." **The build guide is the product under
test.** Every place the guide told Test Claude something the product
contradicted is a defect in what real agents consume, and those findings outrank
cosmetic bugs.

Two rules follow from that, and they're the ones most easily lost:

- **Tom's job is to break the product, not to please Joe.** A session that found
  nothing is a session that didn't look hard enough. Agreeableness is a failure
  mode.
- **Real listing data is mandatory, and assumed broken.** A site running on
  fictitious sample listings is unjudgeable — a documented failure to connect
  real data is a *good* session; a silent fallback to samples is a wasted one.

## Gotchas

- The **toggle is the handshake**, and each side writes one direction only: Tom
  turns testing **OFF** (his PATCH rejects `testingOn: true` with 403), the
  routine turns it **ON**. That's what stops the two halves racing.
- **One open report at a time.** `POST` returns `409 report_pending` while a
  report is `new`/`in_progress`. A second report while one is open means the
  loop is broken — the refusal is the alarm, not a queue-full condition.
- **The market is GPS MLS only** (Greater Palm Springs). It's the only MLS the
  Spark test credentials cover; any other market yields a site with no listings.
- The routine's schedule runs **only while the Claude Code app is open**.
  Nothing is lost when it's closed — reports queue in Mongo — but fixes wait.
- **A marker file proves dispatch, never liveness.** See `agents/tom.md`.

## The state machine

```
                     testingOn = true
        ┌──────────────────────────────────────────┐
        ▼                                          │
  Tom spawns Test Claude (sessions_spawn)          │
        │  build → judge → coach → file bugs       │
        ▼                                          │
  Tom POSTs MD report  ──►  testingOn = false      │
        │                                          │
        ▼                                          │
  routine (every 5 min) sees status "new"          │
        │  read → verify → fix → docs → commit     │
        ▼                                          │
  routine marks report "complete" ─────────────────┘
        (same command sets testingOn = true)
```

Tom's dispatch condition: `testingOn === true && (latestReport is null ||
latestReport.status === "complete")`.

**The design's blind spot:** that condition stays true for a build's entire
duration, because it only clears when the report is POSTed at the end. It
assumes a judge that dispatches then blocks. Tom is a cron job firing every 15
minutes, so he keeps an **in-flight marker** on disk to avoid dispatching a new
persona on top of a running build. The API invariants protect the routine from
the judge; the marker protects Test Claude from the judge.

## The judge's API

Auth: a normal `crt_live_` skill token in the `Authorization: Bearer` header —
mint one at chatrealty.io/agent/settings → Integrations (either purpose; no
extra scope). Base: `https://jpsrealtor.com`.

| Call | Body | Purpose |
|---|---|---|
| `GET /api/skill/testing` | — | Poll. Returns `{ testingOn, latestReport: { id, title, status, resolutionNotes } }`. `resolutionNotes` (present once complete) is our fix summary — Tom relays it verbatim into the next brief as "recently fixed, please re-verify". |
| `POST /api/skill/testing` | `{ title, markdown, testingOff: true }` | Submit the report and turn testing off in one call. `markdown` ≤ 200k chars. |
| `PATCH /api/skill/testing` | `{ testingOn: false }` | Turn testing off separately. `true` is rejected with 403. |

### Report format (convention, not schema)

The routine reads whatever arrives, but this shape gets acted on fastest:

```markdown
# <one-line session title>

## Verdict
gates passed/failed, score, ship-ready or not

## Bugs found            ← the section the routine acts on
one H3 per bug: repro, expected, actual, severity,
and the bug id if Test Claude filed it via report_bug

## Guide-vs-reality mismatches
every place the guide contradicted the product — including the
real-data hookup attempt, which LEADS the report when it fails

## What Test Claude was told to improve

## Session notes
```

## Our side (this repo)

- **Admin page:** `/admin/agent-feedback` — the toggle (with who last flipped
  it), every report with verbatim markdown, manual status controls.
- **CLI (`scripts/agent-feedback.mjs`):** `check` (exit 3 = nothing new) ·
  `show <id>` · `claim <id>` · `complete <id> "notes"` (also sets
  `testingOn=true` — one command, both halves of the handshake) ·
  `toggle on|off`. Needs `npm install` in the repo root to run.
- **Routine:** scheduled task `judge-loop-check`, every 5 minutes. Claims a new
  report, **verifies each claim against the code before fixing** (reports can be
  wrong about root cause), fixes, updates docs in the same commit, then
  completes — which re-arms Tom.
- **Storage:** `agenttestreports` + `testingstates` (singleton), models in
  `src/models/AgentTesting.ts`.

## What makes `resolutionNotes` useful

Tom relays them verbatim into the next brief, so they should read as
instructions to a builder, not as a changelog: what changed, what to re-verify,
and **whether the fix is actually published**.

That last point is live: two sessions running, Tom reported that a fix named in
`resolutionNotes` didn't exist in the npm-published package. *"The fix is
committed but not released"* is invisible to a builder following the guide, and
it makes the next session re-find a bug you believe is fixed.

## Relationship to the other feedback channels

`report_bug` and `give_feedback` remain the structured channels — bugs and full
session zips. The judge report is the **orchestration layer** on top: verdict,
fix list, and the status that drives the loop. The routine cross-references bug
ids named in the report against `scripts/cr-bugs.mjs`.

Until 2026-08-04 those tools were unreachable from a spawned subagent, so bugs
lived only in Tom's markdown and nothing reached the bug system. Fixed by
registering `@chatrealty/mcp-server` with OpenClaw — see `agents/tom.md`.
