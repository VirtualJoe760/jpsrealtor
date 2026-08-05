---
title: Bootstrap prompt — build the judge + Test Claude loop on the other machine
status: partial
last_verified: 2026-08-04
related: [README.md, ../../agents/tom.md]
---

<!--
  HOW TO USE THIS FILE (for Joseph): copy everything below the second `---`
  into a fresh Claude session on the testing machine. It is fully
  self-contained — that machine cannot read this repo, so nothing in it
  references files that only exist here.

  STATUS 2026-08-04: this bootstrap already ran — the judge exists as the
  OpenClaw agent Tom (see ../../agents/tom.md), and the as-built loop differs
  from this prompt in ways learned after it was written (sessions_spawn
  dispatch, the in-flight marker, Tom's real tool surface). Kept as the
  bootstrap record; if it is ever re-run, tom.md is the source of truth for
  anything the two disagree on.
-->

---

# Set up the ChatRealty testing loop on this machine

You are setting up an automated QA loop on THIS machine. You will create two
agent skills and one recurring routine. Read this whole file before creating
anything.

## What you are part of

ChatRealty is a real-estate SaaS platform (chatrealty.io). Licensed agents use
it to scaffold their own Next.js listing websites via an MCP server and a CLI
(`npx create-chatrealty-site`). The platform is in a testing phase: test
builds are run on this machine, judged on this machine, and the findings are
fixed on Joseph's machine by an automated routine there.

The full cycle, across both machines:

```
[testingOn = true, last report complete]        ← the dispatch condition
   JUDGE (this machine) dispatches TEST CLAUDE (this machine)
   Test Claude builds a site with the ChatRealty MCP, files bugs as it goes
   Judge scores the finished site against the rubric below
   Judge coaches Test Claude on what to improve
   Judge POSTs a markdown session report → testingOn flips false
        ↓
   Joseph's machine (every 5 min): reads the report, verifies and fixes
   what it names, marks it complete → testingOn flips true
        ↓
   Judge sees complete + true → dispatches the next test         (repeat)
```

Two invariants keep this race-free — do not work around them:

1. **You may only turn testing OFF.** The API rejects `testingOn: true` from
   this side with 403. Testing turning back ON is the other machine's signal
   that fixes have landed.
2. **One open report at a time.** If `POST` returns `409 report_pending`, do
   NOT retry, queue, or fold work into a second report. A 409 means the other
   side has not finished; wait and poll.

## Setup — do this first

1. **Token.** The API authenticates with a ChatRealty skill token
   (`crt_live_…`). Joseph will place it in this machine's environment as
   `CHATREALTY_JUDGE_TOKEN`. Never ask for it in chat, never echo it, never
   write it into a skill file — reference the env var only.
2. **Verify connectivity** before building anything:

   ```bash
   curl -s https://jpsrealtor.com/api/skill/testing \
     -H "Authorization: Bearer $CHATREALTY_JUDGE_TOKEN"
   ```

   Expect JSON like `{"testingOn":true,"latestReport":null}` (or a report
   object). A 401 means the token is wrong — stop and tell Joseph.
3. **Confirm the ChatRealty MCP server is connected** in this environment
   (tools like `get_build_guide`, `report_bug`, `give_feedback`, `whoami`).
   Test Claude needs it; the judge does not.

## The API (your only interface to the other machine)

Base `https://jpsrealtor.com`, header `Authorization: Bearer $CHATREALTY_JUDGE_TOKEN`.

| Call | Body | Returns / notes |
|---|---|---|
| `GET /api/skill/testing` | — | `{ testingOn, latestReport: { id, title, status, submittedAt, completedAt, resolutionNotes } }`. `resolutionNotes` is non-null only when status is `complete` — it is the fix summary from the other machine. Relay it to Test Claude verbatim when dispatching. |
| `POST /api/skill/testing` | `{ "title", "markdown", "testingOff": true }` | `201` on success. `409 report_pending` = wait. `markdown` ≤ 200k chars. Always pass `testingOff: true` — submitting and disarming are one move. |
| `PATCH /api/skill/testing` | `{ "testingOn": false }` | Exists as a fallback; you normally never need it. `true` is rejected. |

## Skill 1 — the judge routine

Create a skill (plus a recurring schedule, every 10–15 minutes) that:

1. `GET /api/skill/testing`.
2. **Dispatch condition:** `testingOn === true` AND (`latestReport` is null OR
   `latestReport.status === "complete"`). If not met, stop silently — the
   other machine is working, or a report is pending.
3. On dispatch: invoke Test Claude (skill 2) with a **test brief**. Vary the
   brief between sessions so builds differ — rotate at minimum:
   - persona: name, brokerage, years in business, specialty
   - market: **Greater Palm Springs only** — Palm Springs, Palm Desert,
     La Quinta, Rancho Mirage, Indian Wells, Indio, Cathedral City, Desert Hot
     Springs, Coachella, Bermuda Dunes. GPS is the only MLS the test
     credentials cover; a persona anywhere else yields a site with zero real
     listings and an unjudgeable session. Rotate cities and positioning inside
     the footprint, never the region
   - positioning: luxury / first-time buyers / investment / relocation
   - design direction: e.g. "warm and editorial", "monochrome and sharp",
     "coastal and airy" — one phrase, let Test Claude interpret it
   - include `resolutionNotes` from the last report, if any, as "recently
     fixed — please re-verify these areas"
4. When Test Claude reports back (finished site + its own list of issues hit):
   judge the site against the rubric below. Judge the RENDERED site in a
   browser, not the code: DevTools console open before first load and kept
   open; walk every route at desktop and 375px width; heart a listing while
   signed out; ask CHAP three questions (one specific search, one
   conversational, one nonsense); submit one test lead; read the copy.
5. Coach Test Claude: tell it, concretely, what to do better next session.
6. Make sure Test Claude filed its bugs via the MCP `report_bug` tool and its
   session zip via `give_feedback` — if it skipped that, have it do so now.
7. Compose the session report (format below) and `POST` it with
   `testingOff: true`.
8. Stop. Do not dispatch again until the condition in step 2 holds.

## Skill 2 — Test Claude

Create a skill that, given a test brief:

1. Runs `whoami` on the ChatRealty MCP, then follows `get_build_guide`
   faithfully — the guide IS the product being tested, so deviate only when
   stuck, and note every deviation for the judge.
2. Builds in **test-data mode** (localhost only). Hard rules:
   - NEVER deploy a test-data site anywhere. The sample listings are
     fictitious; publishing them violates MLS/IDX display rules.
   - Never put a token or key in chat or in committed files.
   - Never publish to social media.
3. Files every defect it hits via `report_bug` AT THE MOMENT it hits it
   (exact errors verbatim, secrets redacted), and uploads the session via
   `give_feedback` (source-only zip — no `.env`, no `node_modules`).
4. Reports back to the judge with: the running site's local URL, the variant
   choices it made and why, every bug or friction point it hit (including
   ones it worked around), and anything the guide told it that did not match
   reality — guide-vs-reality mismatches are the single most valuable finding
   this loop produces.

## The judging rubric

**Gates — any single failure means NOT SHIPPABLE, name it in the verdict:**

1. IDX attribution ("Listed by {office} — {agent}") everywhere listings render:
   grid cards, detail pages, map popups, CHAP result cards
2. Agent name + license number + brokerage visible on every route, never
   behind a sign-in or contact gate
3. Right person, right market — zero sample-persona remnants (header, footer,
   About, `<title>`, OG tags); geography consistent with the brief's market
4. Mode honesty — test-data banner present in test mode; no deploy attempted
5. Token boundary — no `crt_live_` in page source or browser-originated
   network requests; all data flows through the site's own API routes
6. Neutral listing copy — nothing implying any listing is stale, overpriced,
   or mispriced; no valuations or investment advice
7. Functional floor — every route renders with content, no build errors,
   usable at 375px with no horizontal scroll

**Dimensions (score /100):**

| Wt | Dimension | Judge by |
|---|---|---|
| 20 | Buyer's journey | Search → browse → save → inquire works end to end; map and grid agree; filters actually filter |
| 20 | Unmistakably theirs | Against the stock template look, this reads as a designed brand: deliberate hero/card/CHAP/map choices that fit the brief's positioning |
| 15 | CHAP done right | Exactly one presentation mounted, others absent; branded result cards WITH attribution; graceful off/failure states |
| 15 | Truth | Stats match the visible inventory; declined features absent rather than stubbed; counts agree across surfaces |
| 10 | Copy voice | Concrete over adjectival; sells being there; no market comparisons; no "won't last / priced to sell" register |
| 10 | Craft | Console stays clean across the whole session; no stray default hues surviving the restyle; focus states, alt text, contrast |
| 10 | Process | A mock existed and was iterated BEFORE the build; choices were made per-axis; bugs were filed when hit, not batched or skipped |

**Verdict bands:** all gates + ≥85 = ship-ready · 70–84 = ship with punch
list · <70 = name the failing dimension for rebuild.

## The report format

```markdown
# Session <n> — <persona>, <market>, <positioning>

## Verdict
Gates: <x>/7 passed (failed: <which, or "none">)
Score: <n>/100 — <band>

## Bugs found
### <one H3 per bug, most severe first>
- Severity: critical | high | medium | low
- Repro: <steps>
- Expected / Actual: <one line each>
- Filed: report_bug id <id>   ← or "not filed: <reason>"

## Guide-vs-reality mismatches
<every place the build guide said something the product contradicted — even
small wording. These get fixed fastest.>

## What Test Claude was told to improve
- <coaching points>

## Session notes
<variants chosen, mock iterations, anything odd>
```

The `## Bugs found` section is what the other machine's routine acts on — one
bug per H3, repro steps it can follow, and the `report_bug` id whenever one
exists so the two systems cross-reference.

## What done looks like

Both skills exist, the judge's schedule is running, connectivity is verified,
and — if the dispatch condition currently holds — the first test session has
been dispatched. Tell Joseph: the schedule cadence you chose, the first test
brief you issued, and anything about this environment that blocked you.
