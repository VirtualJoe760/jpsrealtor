---
title: Judge Loop — automated test-site feedback
status: current
last_verified: 2026-07-31
related: [mcp/web-design.md, ../AGENTS.md, ../content-templates/copy-voice.md]
---

# The judge loop

> Deep dive: `mcp/web-design.md` — every endpoint with examples, the report
> format, the judging rubric, and the failure-mode table. This README is the
> orientation; that file is the reference.

An automated QA cycle across two machines. **Test Claude** builds a ChatRealty
site; a **judge** (not a Claude session) scores it, coaches Test Claude, has it
file `report_bug`/`give_feedback`, and submits a markdown session report here;
**our routine** reads the report, fixes what it names, and re-arms the loop.

## Gotchas

- The **toggle is the handshake**, and each side may only write one direction:
  the judge turns testing **OFF** (its PATCH rejects `testingOn: true`), the
  routine turns it **ON**. This is what stops the two machines racing.
- **One open report at a time.** `POST` returns `409 report_pending` while a
  report is `new`/`in_progress`. A second report while one is open means the
  loop is broken — the refusal is the alarm.
- The routine's schedule runs **only while the Claude Code app is open** on
  Joseph's machine. Nothing is lost when it's closed — reports queue in Mongo —
  but fixes wait.

## The state machine

```
                     testingOn = true
        ┌──────────────────────────────────────────┐
        ▼                                          │
  judge dispatches Test Claude                     │
        │  (build, score, coach, file bugs)        │
        ▼                                          │
  judge POSTs MD report  ──►  testingOn = false    │
        │                                          │
        ▼                                          │
  routine (every 5 min) sees status "new"          │
        │  read → fix → update docs → commit       │
        ▼                                          │
  routine marks report "complete" ─────────────────┘
        (same command sets testingOn = true)
```

The judge's dispatch condition: `latestReport.status === "complete" && testingOn === true`.

## The judge's API (the other machine)

Auth: a normal `crt_live_` skill token in the `Authorization: Bearer` header —
mint one at chatrealty.io/agent/settings → Integrations (either purpose works;
these endpoints require no extra scope). Base: `https://jpsrealtor.com`.

| Call | Body | Purpose |
|---|---|---|
| `GET /api/skill/testing` | — | Poll. Returns `{ testingOn, latestReport: { id, title, status, resolutionNotes } }`. `resolutionNotes` (present once complete) is our fix summary — relay it to Test Claude as guidance for the next build. |
| `POST /api/skill/testing` | `{ title, markdown, testingOff: true }` | Submit the session report and turn testing off in one call. `markdown` ≤ 200k chars. |
| `PATCH /api/skill/testing` | `{ testingOn: false }` | Turn testing off separately, if preferred. `true` is rejected with 403. |

### Report format (markdown, by convention not schema)

The routine reads whatever is submitted, but reports that follow this shape get
fixed faster:

```markdown
# <one-line session title>

## Verdict
gates passed/failed, score if scored, ship-ready or not

## Bugs found            ← the section the routine acts on
one H3 per bug: repro, expected, actual, severity,
and the bug id if Test Claude already filed it via report_bug

## What Test Claude was told to improve

## Session notes
what was built, which variants were chosen, anything odd
```

## Our side (this repo)

- **Admin page:** `/admin/agent-feedback` — the toggle (with who last flipped
  it), every report with verbatim markdown, and manual status controls for
  unsticking the loop when either machine is down.
- **CLI (`scripts/agent-feedback.mjs`):** `check` (exit 3 when nothing new —
  the routine's cheap poll) · `show <id>` · `claim <id>` · `complete <id>
  "notes"` (also sets testingOn=true — one command, both halves of the
  handshake) · `toggle on|off`.
- **Routine:** scheduled task `judge-loop-check`, every 5 minutes. On a new
  report it claims it, fixes what it names, updates the docs it touched (per
  `docs/AGENTS.md`), commits, then completes — which re-arms the judge.
- **Storage:** `agenttestreports` + `testingstates` (singleton), models in
  `src/models/AgentTesting.ts`.

## Relationship to the other feedback channels

`report_bug` and `give_feedback` still exist and Test Claude should still use
them — they carry structured bugs and full session zips. The judge report is
the *orchestration* layer on top: it says "this session happened, here is the
verdict, here is what to fix", and its status drives the loop. The routine
cross-references bug ids named in the report against `scripts/cr-bugs.mjs`.
