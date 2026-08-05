---
title: The Loop — architecture of an autonomous QA cycle
status: current
last_verified: 2026-08-05
related: [README.md, agents/tom.md, mcp/web-design/README.md]
audience: external — written to be readable without ChatRealty context
---

# The Loop

An autonomous QA cycle in which one AI agent builds a product, a second AI
agent adversarially judges it, and a third fixes what the second found — with
no human in the critical path.

This document explains the architecture: the actors, how they synchronise, why
the synchronisation is shaped the way it is, and which failure modes it was
built to survive. It is written to be read by someone with no prior context.

---

## 1. The problem being solved

ChatRealty is a SaaS platform that lets licensed real-estate agents scaffold
their own website. The agent talks to an AI assistant, which follows a **build
guide** served over MCP, and a working site comes out.

The thing that needs testing is therefore not a UI or an API. It's a
**procedure** — a document that instructs an AI, executed by an AI, producing
software. Traditional tests can't touch it. The only way to know whether the
guide works is to have an AI follow it end-to-end and report where it broke.

That gives the loop its defining principle:

```
              ┌────────────────────────────────────────┐
              │  THE BUILD GUIDE IS THE PRODUCT.       │
              │  A site that fails to build correctly  │
              │  is a symptom. The guide that misled   │
              │  the builder is the defect.            │
              └────────────────────────────────────────┘
```

A cosmetic bug in a generated site affects one site. A wrong sentence in the
guide affects every agent who follows it. So the loop ranks
**guide-vs-reality mismatches** above everything else it finds.

---

## 2. The actors

Four participants, three of them autonomous.

```
        ┌─────────────────────────────────────────────────────────────┐
        │                          THE LOOP                           │
        │                                                             │
        │   ┌───────────┐   brief    ┌──────────────┐                 │
        │   │           │───────────►│              │                 │
        │   │    TOM    │            │  TEST CLAUDE │                 │
        │   │ the judge │◄───────────│  the builder │                 │
        │   │           │  questions │              │                 │
        │   └─────┬─────┘  + result  └──────┬───────┘                 │
        │         │                         │                         │
        │         │ scores the              │ builds by following     │
        │         │ rendered site           │ the build guide         │
        │         │                         ▼                         │
        │         │                  ┌─────────────┐                  │
        │         │                  │  THE SITE   │                  │
        │         │                  │ (localhost) │                  │
        │         │                  └─────────────┘                  │
        │         │                                                   │
        │         │ markdown report                                   │
        │         ▼                                                   │
        │   ┌─────────────┐        fixes        ┌─────────────────┐   │
        │   │  REPORT API │────────────────────►│  DEV CLAUDE     │   │
        │   │  (shared    │◄────────────────────│  the routine    │   │
        │   │   state)    │   "complete" +      │  (in the repo)  │   │
        │   └─────────────┘   resolutionNotes   └─────────────────┘   │
        │                                                             │
        └─────────────────────────────────────────────────────────────┘
                                    │
                                    │ watches, unsticks
                                    ▼
                              ┌───────────┐
                              │   HUMAN   │
                              └───────────┘
```

| Actor | Nature | Responsibility |
|---|---|---|
| **Test Claude** | ephemeral AI coding session, one per test | Builds a site by following the build guide faithfully. Files bugs the moment it hits them. |
| **Tom** | persistent AI agent on a 15-minute schedule | Invents the test scenario, spawns the builder, adversarially judges the result, writes the report. |
| **Dev Claude** | AI agent running inside the product's repo | Reads the report, verifies each claim against the code, fixes, commits, re-arms the loop. |
| **Human** | — | Watches. Intervenes only when the loop jams. |

The critical property: **no actor grades its own work.** The builder doesn't
judge, the judge doesn't fix, the fixer doesn't test. Each boundary is a place
where self-assessment would otherwise hide a defect.

---

## 3. The cycle

```
   ┌──────────────────────────────────────────────────────────────────────┐
   │                                                                      │
   │   [testingOn = TRUE]  ◄── "the system is ready for a new test"       │
   │            │                                                         │
   │            ▼                                                         │
   │   ┌────────────────────┐                                             │
   │   │ 1. TOM DISPATCHES  │  invents persona + market + positioning     │
   │   │                    │  writes BRIEF.md, spawns a child session    │
   │   └─────────┬──────────┘                                             │
   │             │                                                        │
   │             ▼                                                        │
   │   ┌────────────────────┐                                             │
   │   │ 2. BUILD RUNS      │  Test Claude follows the guide.             │
   │   │    (minutes-hours) │  Asks Tom when the brief is silent.         │
   │   └─────────┬──────────┘  Files bugs as it hits them.                │
   │             │                                                        │
   │             ▼                                                        │
   │   ┌────────────────────┐                                             │
   │   │ 3. TOM JUDGES      │  in a real browser: every route,            │
   │   │                    │  two viewports, gates then dimensions       │
   │   └─────────┬──────────┘                                             │
   │             │                                                        │
   │             ▼                                                        │
   │   ┌────────────────────┐                                             │
   │   │ 4. REPORT POSTED   │──────► [testingOn = FALSE]                  │
   │   └─────────┬──────────┘        "a report is waiting; don't test"    │
   │             │                                                        │
   │             ▼                                                        │
   │   ┌────────────────────┐                                             │
   │   │ 5. DEV CLAUDE      │  claims → verifies each claim against       │
   │   │    FIXES           │  the code → fixes → updates docs → commits  │
   │   └─────────┬──────────┘                                             │
   │             │                                                        │
   │             ▼                                                        │
   │   ┌────────────────────┐                                             │
   │   │ 6. MARKED COMPLETE │──────► [testingOn = TRUE]                   │
   │   └─────────┬──────────┘        + resolutionNotes for the next brief │
   │             │                                                        │
   └─────────────┘   the next test re-verifies what was just fixed
```

Step 6 is what closes the loop into a loop. `resolutionNotes` — dev Claude's
summary of what it changed — is relayed **verbatim** into the next brief as
*"recently fixed, please re-verify these areas."* A fix that didn't work gets
caught by the next cycle rather than believed.

---

## 4. Synchronisation: two invariants

Three autonomous agents share one piece of state and never talk directly. Two
rules keep that race-free.

### Invariant 1 — each side writes one direction only

```
                    ┌─────────────────┐
                    │   testingOn     │
                    │   (boolean)     │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
        ┌─────▼─────┐                 ┌─────▼─────┐
        │    TOM    │                 │ DEV CLAUDE│
        │           │                 │           │
        │  may set  │                 │  may set  │
        │   FALSE   │                 │   TRUE    │
        │           │                 │           │
        │  TRUE  ✗  │                 │  FALSE ✗  │
        │  403      │                 │           │
        └───────────┘                 └───────────┘
```

Tom can stop testing but cannot restart it. Only evidence that fixes landed —
dev Claude completing a report — turns testing back on. If Tom could set it
himself, the signal would mean nothing: he'd be asserting his own work was
addressed.

**This is the load-bearing idea.** It's a one-bit channel where neither party
can forge the other's half.

### Invariant 2 — one open report at a time

```
   POST /report ──► ┌──────────────────────────────────┐
                    │ is a report new / in_progress ?  │
                    └───────┬──────────────────┬───────┘
                          yes                  no
                            │                   │
                            ▼                   ▼
                    409 report_pending      201 accepted
                    "the alarm"             + testingOn = FALSE
```

A 409 means the previous report was never processed. It is an **alarm, not a
rate limit** — the correct response is to stop and escalate, never to retry or
queue a second report. Two open reports would mean two sets of fixes racing on
the same codebase.

---

## 5. Across machines

The loop was designed for two machines that share **nothing** — no filesystem,
no process table, no memory. Everything crosses through one HTTP API.

```
 ┌────────────────────────────┐          ┌────────────────────────────┐
 │      MACHINE A             │          │      MACHINE B             │
 │      "the test rig"        │          │      "the repo"            │
 │                            │          │                            │
 │  ┌──────┐    ┌──────────┐  │          │  ┌──────────────────────┐  │
 │  │ TOM  │───►│   TEST   │  │          │  │     DEV CLAUDE       │  │
 │  │      │◄───│  CLAUDE  │  │          │  │  (inside the repo)   │  │
 │  └───┬──┘    └──────────┘  │          │  └──────────┬───────────┘  │
 │      │                     │          │             │              │
 └──────┼─────────────────────┘          └─────────────┼──────────────┘
        │                                              │
        │  POST report + testingOff                    │  claim / complete
        │  GET  poll                                   │  GET  check
        │                                              │
        └──────────────────►┌──────────────────┐◄──────┘
                            │   REPORT API     │
                            │                  │
                            │  testingOn: bool │
                            │  reports[]       │
                            │  (persistent DB) │
                            └──────────────────┘
                                the ONLY shared state
```

The API is the entire contract. Neither machine needs to know the other exists,
be awake at the same time, or agree on anything except the meaning of one
boolean and one report status.

**Today all three actors run on one machine.** That changed nothing
architecturally, because the invariants were never enforced by the machine
boundary — they're enforced server-side by the API. The collapse to one host is
a deployment detail, and the design still supports splitting them again.

What the collapse *did* change is discipline: with the repo now physically
reachable from the judge, Tom's instructions must explicitly forbid touching it.
A boundary that used to be enforced by physics is now enforced by rules.

---

## 6. The layer the design missed

The state machine above has a blind spot that only appears once the judge is a
**scheduled** process rather than a blocking one.

```
   THE ASSUMPTION                        THE REALITY
   ──────────────                        ───────────

   judge dispatches                      cron fires  ─► dispatch
        │                                cron fires  ─► ??? 
        │  (blocks, waiting)             cron fires  ─► ???
        ▼                                cron fires  ─► ???
   judge scores                          cron fires  ─► ???
        │                                     ...
        ▼                                (build still running)
   judge reports                         cron fires  ─► score + report
```

`testingOn` stays `true` and no report exists for a build's **entire duration**
— the condition only clears at the very end. A judge that blocks is fine. A
judge that wakes every 15 minutes sees an unchanged "go" signal and dispatches
a *second* build, then a third.

There is a second reason the marker carries so much weight. The platform is
supposed to deliver the child's completion back to the judge as a message, and
in practice that message is frequently lost — often enough that the judge
cannot treat its absence as information. So the judge is left with two things
it can actually trust: a file it wrote itself when it dispatched, and the state
of the build directory on disk.

The fix is a local **in-flight marker** — a file the judge writes when it
dispatches and clears only when it successfully reports:

```
        ┌──────────────────────────────────────────────┐
        │  API INVARIANTS      protect the FIXER        │
        │                      from the judge           │
        │                                               │
        │  IN-FLIGHT MARKER    protects the BUILDER     │
        │                      from the judge           │
        └──────────────────────────────────────────────┘
```

With one hard-won caveat:

> **A marker proves a build was dispatched. It never proves one is alive.**

A judge that reads the marker and infers "in flight" will sit silently while a
dead build rots. The rule that fixes it: *silence requires positive proof of a
live child; if you cannot verify, treat it as dead; never go quiet on an
incomplete site without saying why.*

---

## 7. Anatomy of a test session

```
 TOM                          TEST CLAUDE                   THE SITE
  │                                │                            │
  ├─ poll API ────────────────►    │                            │
  │  testingOn && last complete    │                            │
  │                                │                            │
  ├─ invent persona                │                            │
  │  (fictitious agent, market,    │                            │
  │   positioning, design phrase)  │                            │
  │                                │                            │
  ├─ write BRIEF.md ──────────────►│                            │
  ├─ write permission allowlist ──►│                            │
  ├─ spawn child session ─────────►│                            │
  ├─ write in-flight marker        │                            │
  │                                ├─ read build guide          │
  │                                ├─ scaffold ────────────────►│
  │◄──── "what licence number?" ───┤                            │
  ├───── quotes BRIEF.md ─────────►│                            │
  │                                ├─ connect real data ───────►│
  │                                ├─ file bug (guide wrong)    │
  │◄──── "build complete" ─────────┤                            │
  │                                                             │
  ├─ open browser ────────────────────────────────────────────►│
  ├─ walk every route, 2 viewports                             │
  ├─ ask CHAP 3 questions (incl. nonsense)                     │
  ├─ submit a test lead                                        │
  ├─ check 7 gates, score 100 points                           │
  │                                                             │
  ├─ POST report + testingOff ──► API
  ├─ clear marker
  ▼
```

Two details worth lifting out:

**The judge invents the scenario.** Persona, brokerage, licence number, phone,
market, positioning, and a one-phrase design direction — all fabricated, so the
builder never stalls waiting for a decision. The brief file is canonical: when
the builder asks a question, the judge answers *from the file* and appends
anything new to it. Answering from memory produces two contradictory licence
numbers, which the judge would then score as a defect it authored itself.

**Design questions get handed back.** Asked "which layout should I use?", the
judge names the trade-off and makes the builder choose and justify. Choosing
for it would mean grading its own design.

---

## 8. Adversarial stance

The loop's most important property isn't mechanical. A judge optimising to
please its operator produces comfortable scores forever, and a comfortable
score is indistinguishable from a healthy product until a customer finds the
defect.

```
     ┌─────────────────────────┬─────────────────────────┐
     │   AGREEABLE JUDGE       │   ADVERSARIAL JUDGE     │
     ├─────────────────────────┼─────────────────────────┤
     │ takes the happy path    │ takes the path most     │
     │                         │ likely to FAIL          │
     │ asks the easy question  │ asks the nonsense one   │
     │ tests what's documented │ tests what ISN'T        │
     │ "seems fine"            │ pushes until it holds   │
     │                         │ or breaks               │
     │ rounds up               │ names the failure       │
     ├─────────────────────────┼─────────────────────────┤
     │ score: 88               │ score: 61               │
     │ defects found: 2        │ defects found: 9        │
     │ VALUE: near zero        │ VALUE: high             │
     └─────────────────────────┴─────────────────────────┘
```

Stated as the judge's own rule: *a session where you found nothing is a session
where you didn't look hard enough. A 92 that missed a broken data hookup is
worse than a 54 that found it. The findings are the product; the score just
ranks them.*

This extends to the riskiest path in the system. The real-data connection is
**assumed broken** and exercised every single session, because a precise
account of *how* it fails is worth more than another site that quietly fell
back to sample data. So:

> A session that fails to connect real data but documents the failure precisely
> is a **good** session. A session that silently falls back to samples is a
> **wasted** one.

---

## 9. Failure modes

Every one of these was observed, not theorised.

| Failure | Symptom | Root cause | Mitigation |
|---|---|---|---|
| **Double dispatch** | New scenario every 15 min on top of a running build | Dispatch condition stays true for the whole build | In-flight marker |
| **Silent death** | Build dead 40 min, judge quiet | Marker read as proof of life | Silence requires positive proof; ambiguity ⇒ treat as dead |
| **Lost completion signal** | Builder finishes; judge never told | The platform's completion message is delivered on a best-effort basis and has failed repeatedly | Treat no-message as no-information; find the build on disk instead. Require the builder to leave a written marker, instructed in the launch string and not only in the brief |
| **Self-assessment** | Builder reports "all gates pass" | Builder grading its own work | Judge re-verifies independently in a browser |
| **Capability drift** | Dispatch silently does nothing | Instructions referenced tools the agent didn't have | Agent must stop and escalate on an unknown tool, never improvise |
| **Instruction drift** | Agent follows the stale copy | Same rule written in two places | One source of truth; the other points at it |
| **Wrong test data** | Site renders inventory from the wrong region | Scenario market outside the data source's coverage | Constrain scenarios to what the credentials actually serve |
| **Orphaned processes** | Deleted directories reappear | Dev server outlives its parent session | Teardown kills the server, then verifies, then deletes |
| **Unreleased fix** | Same bug re-found after being "fixed" | Fix committed but not published | Judge reports it as a distinct, high-priority class |

The last one is the loop justifying itself: it caught, twice, that a fix
described in `resolutionNotes` didn't exist in the published package. No human
was watching for that.

---

## 10. Why this shape

```
    ┌──────────────────────────────────────────────────────────┐
    │                                                          │
    │   SEPARATION      no actor grades its own work           │
    │                                                          │
    │   ONE-BIT         a channel neither side can forge       │
    │   HANDSHAKE                                              │
    │                                                          │
    │   SERIALISATION   one open report; a refusal is an       │
    │                   alarm, not backpressure                │
    │                                                          │
    │   ADVERSARIAL     the judge is rewarded for finding      │
    │   INCENTIVE       problems, not for high scores          │
    │                                                          │
    │   EVIDENCE        every score cites a screenshot,        │
    │   DISCIPLINE      log line, or file — or isn't given     │
    │                                                          │
    │   FEEDBACK        fixes are re-verified by the next      │
    │   CLOSURE         cycle, never assumed                   │
    │                                                          │
    └──────────────────────────────────────────────────────────┘
```

The generalisable lesson is that **autonomous agents need the same structural
guarantees as distributed systems** — idempotency, one-way state transitions,
liveness checks that don't trust a flag, and an explicit rule that a stale
instruction must halt rather than improvise. The AI parts were rarely the hard
parts. The synchronisation was.

---

## Further reading (internal)

- `README.md` — orientation and the API contract
- `agents/tom.md` — the judge as built: tools, dispatch, failure history
- `mcp/web-design/README.md` — the full operational reference and rubric
