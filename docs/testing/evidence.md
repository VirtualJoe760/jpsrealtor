---
title: Evidence — what the loop has actually produced
status: current
last_verified: 2026-08-05
related: [mcp-fbl.md, README.md, agents/tom/MEMORY.md]
audience: external — readable without ChatRealty context
---

# Evidence

`mcp-fbl.md` describes how the loop is built. This file is the record of what it
has done, drawn from the report store and the judge's own cross-session memory.

Every number here is computed from `agenttestreports` in MongoDB or quoted from
`agents/tom/MEMORY.md`. Nothing is estimated. The method for reproducing each
figure is at the bottom.

---

## 1. The record

Ten sessions have been dispatched; six produced a scored report. Sessions 1–4
failed at dispatch (see `agents/tom/README.md` — six mechanism dead-ends in one
night) and never reached a build.

| # | Persona / market | Score | Gates | Findings | Report | Report → fixed |
|---|---|---|---|---|---|---|
| 5 | Priya Manohar — Sacramento | 75 | 7/7 | 1 | 7.6k | 107 min |
| 6 | Marcus Delgado — Orange County | 67 | 7/7 | 2 | 8.2k | 337 min |
| 7 | Diane Calloway — GPS / La Quinta | 67 | 5/7 | 4 | 8.3k | 21 min |
| 8 | Carter Winslow — GPS / Rancho Mirage | 55 | 6/7 | 13 | 12.1k | 30 min |
| 9 | Sandra Okafor — GPS / Cathedral City | 82 | Gate 7 fail | 10 | 15.2k | 13 min |
| 10 | Elena Varga — GPS / Palm Springs | 71 | 6/7 | 5 | 12.5k | open |

*Findings = `###` headings in the report, the unit the fixing routine acts on.
Session 8 was filed at 55 with the judge noting his own read was 78; the filed
number is used throughout. Session 9's verdict names the failed gate without
the `n/7` line, so the count is not machine-readable for that row.*

---

## 2. The score went down, and that is the finding

The instinct is to read a rising score as a healthy system. This loop produced
the opposite, and the drop is the most informative thing in the table.

```
  score                                    findings per session
  85 │                    ●9                 13 │           ●8
  80 │                                       12 │
  75 │ ●5                        ●10         11 │
  70 │                                       10 │              ●9
  65 │      ●6   ●7                           5 │                   ●10
  60 │                                        4 │      ●7
  55 │            ●8                          2 │ ●6
     └────────────────────────                1 │ ●5
       5   6   7   8   9  10                     └──────────────────
                                                   5  6  7  8  9  10
```

Sessions 5 and 6 scored **7/7 gates and produced one and two findings between
them.** They were also built on fictitious sample listings, for markets
(Sacramento, Newport Beach) outside the only MLS the test credentials cover.
Every dimension that depends on real inventory — the buyer's journey, truth,
geography consistency, IDX attribution, every CHAP result — was unmeasurable,
and the rubric returned comfortable numbers anyway.

That is precisely the failure mode the judge's own instructions name:

> A session where I found nothing is not a success — it is a session where I
> didn't look hard enough. A 92 that missed a broken data hookup is worse than
> a 54 that found it.

Two rules landed at session 7 — market restricted to the one MLS the
credentials actually serve, and real listing data made mandatory rather than
optional. Gates began failing immediately (5/7), findings went 1 → 2 → 4 → 13,
and the score fell to 55.

**Nothing about the product got worse between session 6 and session 8. The
measurement started working.** A score series is only comparable within a fixed
rubric, and this one changed at session 7 by design; the findings count is the
more honest series across that boundary.

---

## 3. Traceability — finding to release to re-verification

The loop's central claim is that fixes are re-checked by a later session rather
than believed. That claim is auditable. Each row below was found in one
session, shipped in a numbered release, and confirmed by a *different* session
that had no knowledge of the fix beyond the resolution notes relayed to it.

| Finding | Found | Released | Re-verified |
|---|---|---|---|
| Two CHAP presentations both reachable | 5 | 0.10.0 | 8 |
| Guide referenced features not yet published to npm | 5–6 | 0.10.0 | 7 |
| Tailwind radius classes bypassing the `--radius` token | 6 | 0.11.0 | 8 |
| Listing cards missing IDX attribution on one token path | 7 | 0.11.0 | 8 |
| Site showed the token holder, not the agent it was built for | 5–7 | 0.11.0 | 8 |
| Neighborhood index derived from an unfiltered listing sample | 7 | 0.11.0 | 8 |
| Default browse returned national inventory, not the service area | 8 | 0.12.0 | 9 |
| CHAP result cards linked off-site | 8 | 0.12.0 | 9 |
| CHAP recycled prior search results for market questions | 8 | 0.12.0 | 9 |
| `401` on every page load from an auth bridge call | 8 | 0.12.0 | 9 |

Ten findings, three releases, every one confirmed by a subsequent independent
session. The identity finding is worth singling out: it was **structural** —
the site could not display the agent it was built for, because the profile
always resolved to the token holder. It survived three sessions as a known
unpassable gate before the fix landed.

---

## 4. What the loop caught that a human process would not

**Two fixes that were committed but never published.** Across sessions 5 and 6
the judge reported that a fix named in the resolution notes did not exist in
the npm package the builder actually installed. Builders were scaffolding
0.8.0 while the guide described 0.9.0 behaviour. "Committed" and "shipped" are
indistinguishable from inside the repository and completely distinguishable
from outside it — which is the position the judge occupies. *(Both packages
currently match their published versions: scaffolder 0.13.0, MCP server
0.20.9.)*

**Two regressions in fixes that had been marked complete.** Session 9 re-tested
two items the session 8 resolution notes claimed were fixed:

- *"Back to listings" preserving search filters* — the link's `href` was
  correct in the DOM, but navigation stripped the query parameters. Fixed,
  then broken again.
- *"View all N photos"* — the notes said the link now routed on-site. In
  session 9 the link was absent from the swipe deck entirely: removed rather
  than rerouted, or the fix never shipped.

Neither would have been noticed by the person who wrote the fix. Both were
found because the next session was handed the previous session's resolution
notes and told to re-verify them.

**The milestone, session 9.** The first session in which real MLS data flowed
end to end — provisioned tenant database, RESO feed, live listings rendering on
a generated site. The path had been assumed broken and exercised every session
on that assumption; the assumption was correct for eight sessions, and the
precise failure accounts produced along the way are what made the ninth work.

---

## 5. Cycle time

Time from report submitted to fixes committed and the loop re-armed:

```
   107 min   ██████████████████████████████████  session 5
   337 min   ████████████████████████████████████████████████████████ session 6
    21 min   ██████                                                   session 7
    30 min   █████████                                                session 8
    13 min   ████                                                     session 9
```

The first two sessions predate the automated fixing routine. From session 7 the
routine polls every five minutes, claims the report, verifies each claim
against the code before changing anything, fixes, updates documentation in the
same commit, and marks the report complete — which re-arms testing. Median
cycle time across the automated sessions is **25 minutes**.

The routine runs only while the desktop application is open. Nothing is lost
when it is closed — reports queue in the database — but the clock keeps running,
so these figures measure the automated path when it was available, not a
guaranteed service level.

---

## 6. What this does not establish

Stated plainly, because a reader evaluating this should not have to work it out
themselves.

- **n = 6.** Six scored sessions is a direction, not a statistic. No claim here
  is statistically significant.
- **One judge, no inter-rater reliability.** Nobody grades the judge. A
  systematic bias in his rubric would be invisible in this data, and there is
  currently no human-scored baseline to calibrate against.
- **Scores are not comparable across session 7.** The rubric's market and
  data-source requirements changed there deliberately. Comparing a session-6
  score to a session-9 score is comparing two different instruments.
- **One market, one data source.** Everything here is Greater Palm Springs on
  one MLS feed, because that is what the test credentials cover.
- **The Process dimension is pinned low by a harness bug, not by product
  quality.** In sessions 8 and 9 the builder exited without writing its
  completion markers, which costs points in a dimension measuring build
  discipline. That is a defect in the test rig.
- **No model is being trained.** Nothing here updates any weights. What
  changes between sessions is the guide, the template, and the judge's own
  instructions — artifacts, not parameters. The feedback is textual and acts on
  documents.

---

## 7. Reproducing these numbers

The session table, findings counts, and cycle times come from the report store:

```js
db.agenttestreports.find({}).sort({ createdAt: 1 })
// score:      /Score:\s*(\d+)\s*\/\s*100/
// gates:      /Gates:\s*(\d+)\s*\/\s*7/
// findings:   count of /^### /gm      (one H3 per finding, by report format)
// cycle time: completedAt - createdAt
```

The traceability table is transcribed from `agents/tom/MEMORY.md`, where each
resolved item carries a `← RESOLVED in vX.Y.Z (confirmed session N)` marker
that the judge maintains across sessions. Released versions are verifiable
against the public npm registry.

`/admin/loop` renders every report's verbatim markdown, the current
toggle state, and who last flipped it.
