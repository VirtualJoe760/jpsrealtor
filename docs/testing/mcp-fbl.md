---
title: The Loop — architecture of an autonomous QA system
status: current
last_verified: 2026-08-05
related: [README.md, coverage.md, agents/tom/README.md]
audience: external — written to be read without prior context
---

# The Loop

An autonomous quality system in which one AI agent builds a product, a second
adversarially evaluates it, and a third repairs what the second found — with no
human in the critical path.

This document covers the architecture only: the roles, the control plane, the
synchronisation guarantees, how the design scales to evaluating many independent
data sources concurrently, and how failures observed in production enter the
same machinery as work the system schedules for itself. It assumes no prior
knowledge of the product.

---

## 1. What is actually under test

Conventional test suites assume a deterministic artifact: given this input, the
function returns that output. The artifact here is not like that.

The product is a platform that lets a non-technical user build a working web
application by talking to an AI assistant. The assistant follows a **build
guide** — a document served over MCP that instructs the model step by step.

So the thing that determines whether the product works is a **procedure**: a
document, written for a language model, executed by a language model, producing
software. There is no function to call and no return value to assert on.

```
   CONVENTIONAL TARGET              THIS TARGET

   code → deterministic output      document → LLM interprets it → software
   assert(f(x) == y)                ??? 
```

That yields the system's defining inversion:

```
   ┌──────────────────────────────────────────────────┐
   │  THE INSTRUCTIONS ARE THE PRODUCT.               │
   │  A defective build is a symptom.                 │
   │  The instruction that misled the builder         │
   │  is the defect.                                  │
   └──────────────────────────────────────────────────┘
```

A bug in one generated application affects one user. An ambiguous sentence in
the guide affects every user who follows it. The system therefore ranks
**guide-versus-reality mismatches** above ordinary defects — including cases
where the instructions are *technically* correct but written in language the
actual audience cannot follow.

Because the artifact is interpreted by a model, the only instrument that can
evaluate it is also a model. That constraint produces everything below.

---

## 2. Roles

Three autonomous roles. The separation between them is a correctness property,
not an organisational convenience.

```
        ┌──────────────────────────────────────────────────────────────┐
        │                                                              │
        │   ┌───────────┐    brief    ┌──────────────┐                 │
        │   │           │────────────►│              │                 │
        │   │   JUDGE   │             │   BUILDER    │                 │
        │   │           │◄────────────│              │                 │
        │   └─────┬─────┘  questions  └──────┬───────┘                 │
        │         │        + result          │                         │
        │         │                          │ executes the            │
        │         │ evaluates the            │ build guide             │
        │         │ running system           ▼                         │
        │         │                   ┌─────────────┐                  │
        │         │                   │ THE ARTIFACT│                  │
        │         │                   └─────────────┘                  │
        │         │                                                    │
        │         │ structured report                                  │
        │         ▼                                                    │
        │   ┌─────────────┐      repairs       ┌─────────────────┐     │
        │   │   CONTROL   │───────────────────►│    REPAIRER     │     │
        │   │    PLANE    │◄───────────────────│                 │     │
        │   └─────────────┘  completion +      └─────────────────┘     │
        │                    resolution notes                          │
        └──────────────────────────────────────────────────────────────┘
```

| Role | Lifetime | Responsibility |
|---|---|---|
| **Builder** | Ephemeral — one process per test | Executes the build guide faithfully. Reports friction at the moment it is encountered. |
| **Judge** | Persistent, scheduled | Selects what to test, provisions the scenario, spawns the builder, evaluates the running system, emits the report. |
| **Repairer** | Persistent, event-driven | Verifies each claim against source, repairs, updates documentation, closes the report, re-arms the system. |

**No role evaluates its own output.** The builder does not grade, the judge does
not repair, the repairer does not test. Each boundary is a place where
self-assessment would otherwise conceal a defect — a builder reporting "all
checks pass" is reporting on work it has every incentive to believe in.

One consequence is worth stating explicitly: **the judge evaluates the running
system, not the source.** Source inspection tells you what was intended.
Only exercising the deployed artifact tells you what happens.

---

## 3. The control plane

The three roles share exactly two pieces of state and never communicate
directly. Everything crosses one HTTP boundary.

```
                 ┌─────────────────────────────┐
                 │        CONTROL PLANE        │
                 │                             │
                 │   armed : boolean           │
                 │   reports[] : queue         │
                 │                             │
                 └──────┬───────────────┬──────┘
                        │               │
          POST report   │               │  claim / complete
          + disarm      │               │  + resolution notes
                        │               │
                 ┌──────▼─────┐   ┌─────▼──────┐
                 │   JUDGE    │   │  REPAIRER  │
                 └────────────┘   └────────────┘
```

The interface is three calls: read state, submit a report, set the flag. That is
the entire contract between roles. Neither needs to know the other exists, be
running at the same time, or share a filesystem, process table, or host.

### Invariant 1 — each side may write one direction only

```
                    ┌─────────────┐
                    │    armed    │
                    └──────┬──────┘
              ┌────────────┴────────────┐
        ┌─────▼─────┐             ┌─────▼─────┐
        │   JUDGE   │             │ REPAIRER  │
        │           │             │           │
        │ may clear │             │  may set  │
        │  → false  │             │  → true   │
        │           │             │           │
        │ set ✗ 403 │             │ clear ✗   │
        └───────────┘             └───────────┘
```

The judge can halt testing but cannot resume it. Only evidence that repairs
landed — the repairer closing a report — re-arms the system.

This is the load-bearing idea. It is a **one-bit channel in which neither party
can forge the other's half**. If the judge could re-arm itself, the signal would
carry no information: it would be asserting that its own findings had been
addressed. Enforcement is server-side, so the guarantee does not depend on
either agent behaving correctly — an agent that tries to write the wrong
direction receives a 403.

### Invariant 2 — bounded work in flight

```
   submit ──► ┌────────────────────────────┐
              │  is a report unresolved ?  │
              └──────┬──────────────┬──────┘
                   yes              no
                     │               │
                     ▼               ▼
              409 rejected      accepted + disarm
              (alarm)
```

A rejection means the previous cycle never completed. It is an **alarm, not
backpressure** — the correct response is to halt and escalate, never to retry or
enqueue. Two unresolved reports would mean two repair streams mutating one
codebase concurrently, and neither report's findings could be attributed to the
resulting state.

---

## 4. Liveness is not the same as dispatch

A subtle failure appears once the judge is a **scheduled** process rather than a
blocking one.

```
   ASSUMED                        ACTUAL

   dispatch                       tick ─► dispatch
      │                           tick ─► ?
      │ (blocks)                  tick ─► ?
      ▼                           tick ─► ?
   evaluate                            ...
      │                           (build still running)
      ▼                           tick ─► evaluate + report
   report
```

The dispatch precondition — *armed, and no unresolved report* — remains true for
a build's **entire duration**, because it only clears when the report is
submitted at the very end. A judge that blocks is fine. A judge that wakes on a
timer sees an unchanged "go" signal and dispatches a second build on top of the
first.

The fix is a locally held **in-flight marker**, written in the same operation as
the dispatch and cleared only on a successful report.

```
   ┌────────────────────────────────────────────────┐
   │  CONTROL-PLANE INVARIANTS   protect the        │
   │                             REPAIRER           │
   │                                                │
   │  IN-FLIGHT MARKER           protects the       │
   │                             BUILDER            │
   └────────────────────────────────────────────────┘
```

With one constraint that generalises well beyond this system:

> **A marker proves an event occurred. It never proves a process is alive.**

A supervisor that reads a marker and infers "running" will wait indefinitely on
a dead worker. The resolving rule: *silence requires positive proof of a live
child; absent that proof, treat it as dead.* Liveness must be established by
observing actual state — process tables, filesystem artifacts — never by the
absence of a message. Completion notifications delivered on a best-effort basis
are a convenience, not a signal you can build on: a missing message means
neither success nor failure, and a supervisor that treats it as either will be
wrong.

---

## 5. What drives the work

A scheduler needs an objective. Scoring a build produces a number; a number does
not say what to test next, and a system optimising a score will drift toward
whatever is cheapest to score well on.

So the judge's input is not a score history but a **coverage matrix** — an
explicit enumeration of capability × configuration, each cell in one of three
states.

```
                    ┌──────────────────────────────────────┐
   COVERAGE  ──────►│  pick the highest-priority           │
   MATRIX           │  untested cell                       │
                    └──────────────┬───────────────────────┘
                                   ▼
                    ┌──────────────────────────────────────┐
                    │  synthesise a scenario that           │
                    │  exercises exactly that cell          │
                    └──────────────┬───────────────────────┘
                                   ▼
                    ┌──────────────────────────────────────┐
                    │  dispatch · evaluate · report         │
                    └──────────────┬───────────────────────┘
                                   ▼
                    ┌──────────────────────────────────────┐
                    │  cell transitions only when a LATER,  │
                    │  independent run confirms it          │
                    └──────────────────────────────────────┘
```

Three properties follow:

- **The objective is enumerable.** "Done" is a defined state — every cell
  confirmed — rather than an indefinite process.
- **A cell advances only on independent confirmation.** The run that repairs a
  capability never marks it working; a subsequent run does, with no knowledge of
  the repair beyond the resolution notes relayed to it. Fixes are re-verified,
  not believed.
- **Scenarios are narrow by construction.** One configuration per run. A run
  that exercises many capabilities at once reports that *something* failed and
  cannot say which configuration caused it.

Reporting is bounded on purpose. Discovery is cheap for the judge and repair is
expensive for everything downstream, so a run terminates when it has enough to
act on: immediately on a structural failure — because the next build will differ
materially and further observations are already stale — and otherwise at a small
number of findings ranked by severity. Throughput of the *cycle* matters more
than the volume of any single report.

---

## 6. Scaling to many independent data sources

This is where the architecture earns its shape.

The product is a data framework. It ingests a real-estate feed from any of
roughly 500–600 independent regional associations, normalises it to one internal
schema, and serves it. Those feeds nominally follow a shared standard and in
practice diverge constantly: fields present in one association and absent in
another, identical concepts under different keys, differing vocabularies for the
same enumeration, and vendors whose payloads do not follow the standard at all.

**The normalisation layer is the real system under test, and it can only be
tested against real feeds.** No fixture reproduces the ways a live feed differs
from its specification — that is precisely the information a fixture lacks.

### Why the harness does not grow with the number of feeds

Each data source is a **row**, not a new test suite:

```
   association │ ingest │ normalise │ serve │ refresh │ gaps identified
   ────────────┼────────┼───────────┼───────┼─────────┼────────────────
      A        │   ✔    │     ✔     │   ✔   │    ✔    │ none
      B        │   ✔    │     ✔     │   ✔   │    ·    │ no subdivision
      C        │   ✔    │     ·     │   ·   │    ·    │ non-standard keys
      D        │   ·    │     ·     │   ·   │    ·    │
      …        │        │           │       │         │
```

Onboarding an association means adding a row and supplying credentials. The
judge synthesises the scenario, the builder executes the same guide, and the
same normalisation path is exercised against a new shape of input. **No new test
code is written per feed** — which is the only way an approach like this reaches
hundreds of sources.

What the system is looking for is not "did it work" but a classification:

| Outcome | Meaning |
|---|---|
| Normalises cleanly | The mapping covers this source |
| Field absent | The source does not carry it — must be **surfaced as absent**, never silently empty |
| Key differs | Same concept, different name — extend the mapping |
| Absent but derivable | Candidate for optional enrichment, explicitly labelled as derived |
| Shape unsupported | The normaliser needs a new adapter |

"This association has no subdivision data" is a **result**, not a failure — but
only if the system detects and reports it. Silent absence is the defect, because
downstream features degrade with no explanation to the end user.

### What makes concurrency possible

Three properties, each an architectural decision rather than an optimisation:

**Per-tenant data isolation.** Every test run provisions its own database.
There is no shared fixture to corrupt, so runs against different associations
cannot interfere, and a run that writes malformed data damages only itself.
Teardown is dropping one database.

**Stateless evaluation.** The judge holds no cross-run state in memory — each
wake-up reconstructs context from durable artifacts. Concurrency is therefore
bounded by infrastructure, not by the evaluator's context window.

**Server-side invariants.** The guarantees in §3 are enforced at the control
plane, not by agent cooperation. Adding builders or judges does not weaken them
and does not require re-reasoning about correctness.

### The current bound, and how it lifts

Invariant 2 serialises the system deliberately: one unresolved report at a time,
because concurrent repair streams on one codebase make findings unattributable.
That is correct while repairs are global — a normalisation fix affects every
association.

It is also the throughput ceiling. Testing many associations in parallel means
**partitioning the report queue** along the axis where repairs are independent —
per association, or per adapter — so that unrelated streams proceed
concurrently while the invariant continues to hold *within* each partition.
The one-directional write guarantee is unaffected; it is per-partition already.

That is a queue-partitioning change, not a redesign. The property that makes it
tractable is that the invariants were specified over an abstract report stream
rather than a global lock.

---

## 7. Reactive ingress — production failures as work items

Everything above describes a system that decides for itself what to test. That
covers the space you can anticipate. It does not cover the failure that only
appears on a real customer's machine, against a feed you have never held
credentials for.

So the coverage matrix is not the only producer of work. The second producer is
**the field**.

### The assistant is the sensor

The same MCP server that serves the build guide exposes a feedback tool. When a
customer's AI assistant encounters something it cannot resolve — a feed that
will not authenticate, a field the normaliser rejects, an instruction that does
not match what the product actually does — it invokes that tool rather than
improvising a workaround or silently degrading.

This is worth stating precisely, because it inverts the usual reporting
relationship. The reporter is not a human who noticed something looked wrong
and wrote a paragraph about it. It is **the process that was executing the
instructions at the moment they failed**, with the failing step, the verbatim
error, and the surrounding state still in hand.

A ticket therefore carries what a reproduction needs:

```
   association / feed vendor        what the instruction claimed
   the step being executed          how far it got: auth ▸ fetch ▸
   verbatim error text                normalise ▸ persist ▸ serve
   payload SHAPE (keys, types)      guide + package versions
   env var NAMES, never values      no credentials, no customer records
```

Redaction is structural, not a review step: the tool transmits field *names*
and payload *shapes*, never values. Shape is what the normaliser is tested
against; the customer's records are irrelevant to reproducing the defect and
are never collected.

### Tickets are coverage cells with evidence

The important property is that an inbound ticket and a matrix cell are **the
same unit of work**. A cell says *"this configuration is unverified."* A ticket
says *"this configuration is broken, and here is the trace."* Both resolve to:
synthesise a scenario exercising exactly this configuration, run the loop,
confirm on a later independent run.

```
   ┌────────────────────┐
   │  COVERAGE MATRIX   │──┐        proactive: what we haven't verified
   └────────────────────┘  │
                           ├──►  ┌──────────────┐
   ┌────────────────────┐  │     │ TARGET CELL  │──►  the loop, unchanged
   │  INBOUND TICKETS   │──┘     └──────────────┘
   └────────────────────┘           reactive: what reality just broke
```

Nothing downstream changes. The dispatch machinery, the invariants, the
isolation model and the confirmation rule are identical whichever producer
supplied the target. The queue gains a second source; the loop does not gain a
second mode.

Priority follows from provenance: a configuration reality has already broken
outranks one that is merely unverified.

### Triage, and why volume decouples from work

Raw tickets are not work items. Between ingress and dispatch sits a triage
stage the judge owns:

```
   ticket ──► normalise ──► fingerprint ──► cluster ──► assess ──► goal
                              │                │          │
                              │                │          └─ known cell?
                              │                │             new shape?
                              │                │             environment-local?
                              │                └─ N reports, one work item
                              └─ hash(association shape · failing step ·
                                      error class · versions)
```

**Fingerprinting is what makes this scale.** One association changing a field
name generates a ticket from every customer on that association — potentially
hundreds. They share a fingerprint, so they collapse into a single work item
carrying a population count.

That produces the property the whole design turns on:

> **Ticket volume scales with customers. Work volume scales with distinct
> failure modes.** Those are different curves, and only the second one has to be
> serviced.

Population count also supplies priority for free: a fingerprint seen across
many tenants is a defect in the shared normalisation path; a fingerprint seen
once, on one machine, is more likely local — and is triaged as such rather than
consuming a full cycle.

Assessment is a judgment, so the judge makes it: is this an existing cell
regressing, a known association presenting a new shape, an association not yet
in the matrix at all, or something specific to one environment? Each answer
produces a different goal, and the goal — not the ticket — is what the loop
consumes.

### Reproduction without customer data

A ticket is only actionable if the failure can be reproduced without touching
the customer's tenant. Two properties of the architecture make that possible:

- **The failure is a property of the feed shape, not the records.** The
  fingerprint captures the association, the payload shape, and the failing step.
  That is sufficient to construct an equivalent scenario against the same
  association's feed.
- **Every run provisions its own data plane.** Reproduction happens in an
  isolated database that is created for the run and dropped after it, so no
  customer tenant is read, written, or risked.

The output is a new row or cell in the matrix. A failure reported once from the
field becomes a configuration the system verifies from then on — which is how
the covered surface grows toward the real distribution of feeds rather than the
one that was anticipated.

### Closing the customer's loop

The repairer's resolution notes already flow to the next run for
re-verification. The same record resolves the originating fingerprint, and
therefore every ticket clustered under it — including the tenants that never
received an individual response, because they never needed one. The fix is
confirmed by an independent run before that resolution is considered real.

## 8. Why this shape

```
   ┌────────────────────────────────────────────────────────┐
   │                                                        │
   │  SEPARATION      no role evaluates its own output      │
   │                                                        │
   │  UNFORGEABLE     a one-bit channel where neither       │
   │  HANDSHAKE       party can write the other's half      │
   │                                                        │
   │  BOUNDED WORK    one unresolved unit; a refusal is     │
   │                  an alarm, not backpressure            │
   │                                                        │
   │  LIVENESS ≠      a flag proves an event, never a       │
   │  DISPATCH        running process                       │
   │                                                        │
   │  ENUMERABLE      progress is a coverage matrix, not    │
   │  OBJECTIVE       a score — "done" is a defined state   │
   │                                                        │
   │  INDEPENDENT     a capability is confirmed by a run    │
   │  CONFIRMATION    that did not perform the repair       │
   │                                                        │
   │  ISOLATION       per-run data plane; no shared         │
   │                  fixture, teardown is a drop           │
   │                                                        │
   │  ONE UNIT OF     scheduled coverage and field-reported │
   │  WORK            failures resolve to the same target;  │
   │                  the queue gains a producer, the loop  │
   │                  gains nothing                         │
   │                                                        │
   │  DECOUPLED       fingerprinting collapses N reports    │
   │  VOLUME          into one work item — tickets scale    │
   │                  with customers, work with distinct    │
   │                  failure modes                         │
   │                                                        │
   └────────────────────────────────────────────────────────┘
```

The generalisable result: **autonomous agents need the same structural
guarantees as distributed systems.** One-way state transitions, bounded work in
flight, liveness checks that do not trust a flag, idempotent operations, and an
explicit rule that a stale instruction halts rather than improvises.

The agents were rarely the hard part. The synchronisation was — and the pieces
that make it scale to hundreds of data sources are the ordinary ones: an
enumerable objective, isolated per-run state, and invariants enforced by the
control plane rather than by cooperation.
