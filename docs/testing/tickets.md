---
title: Tickets — reactive ingress, fingerprinting, and triage
status: current
last_verified: 2026-08-05
related: [mcp-fbl.md, coverage.md, README.md, repairer.md, agents/tom/AGENTS.md]
---

# Tickets

The loop's second producer of work. The coverage matrix (`coverage.md`) says
what is **unverified**; a ticket says what is **broken**, with the trace
attached. Both resolve to the same unit — a target the judge briefs a session
toward — so the queue gained a producer and the loop gained nothing.

`mcp-fbl.md` §7 is the architecture; this file is the implementation reference.

## The pipeline

```
 customer's AI hits a data failure
        │
        ▼
 MCP tool `report_data_issue`          packages/mcp-server/src/tools/
        │  POST                        report_data_issue.ts
        ▼
 /api/skill/tickets                    clusters on write (fingerprint)
        │
        ▼
 ticketfingerprints collection         one row per DISTINCT failure mode,
        │                              carrying a population count
        ▼
 Tom's poll (GET /api/skill/testing)   openTickets rides the same response
        │                              his dispatch condition reads
        ▼
 TRIAGE (Tom)                          fingerprint → goal → brief
        │
        ▼
 the loop, unchanged                   build · judge · report · repair
        │
        ▼
 fingerprint resolved                  repairer: ticket-resolve (or the
                                       admin console) once a session confirms
```

## The fingerprint

```
sha256( lower(association) · lower(failingStep) · lower(errorClass) · packageVersion )
```

computed in `src/models/LoopTicket.ts` (`computeFingerprint`). When the
reporter supplies no `errorClass`, `deriveErrorClass` reduces the verbatim
error's first line to a clusterable label — lowercased, with quoted strings,
paths, hex ids, and numbers masked — so the same failure from two machines
hashes identically.

**This is what makes ticket volume scale with customers while work volume
scales with distinct failure modes.** An association renaming a field produces
a ticket from every tenant on that association; they share a fingerprint and
arrive at triage as one work item with a population count. Population is
priority for free: many tenants ⇒ shared-path defect; one machine ⇒ probably
environment-local, triaged as such rather than consuming a session.

Version is part of the hash deliberately — the same error on 0.20 and 0.21 is
two clusters, because "did this survive the version bump" is a question the
data should answer, not blur.

### Reopening

A fresh ticket landing on a **resolved** fingerprint reopens it atomically
(`ingestTicket`). A recurrence after a claimed fix is the loop's highest-value
signal and must never be absorbed silently into a closed cluster. The filer is
told their report reopened it.

## Statuses

```
open ──► triaged ──► in_progress ──► resolved
  ▲         (Tom sets goal)              │
  └──────── fresh ticket reopens ────────┘
```

| Status | Meaning | Who sets it |
|---|---|---|
| `open` | Reported, not yet assessed | ingress |
| `triaged` | Tom assessed it and wrote a `goal` | Tom |
| `in_progress` | A session or repair is working it | Tom / repairer |
| `resolved` | Fix landed and (ideally) a later session confirmed | repairer / admin |

## API

Skill-token auth, split by direction: **POST is open to any valid
`crt_live_` token** (filing a failure must never be the thing a scope
forbids); **GET and PATCH require an admin-account token** — tickets carry
verbatim traces from every tenant, so customers file into the queue but never
browse it, and the triage/chat surfaces belong to the loop's own agents
(whose tokens live on the owner account). Redaction is enforced structurally:
`envVarNames` containing `=` rejects the whole ticket.

| Call | Body / params | Purpose |
|---|---|---|
| `POST /api/skill/tickets` | `{ association, failingStep, errorText, howFar?, errorClass?, payloadShape?, envVarNames?, packageVersions?, notes? }` | File. Returns `{ fingerprint, population, status, reopened }` |
| `GET /api/skill/tickets?status=open` | — | Fingerprints, population-first (triage read) |
| `GET /api/skill/tickets?fingerprint=x&tickets=3` | — | One cluster + its recent tickets |
| `PATCH /api/skill/tickets` | `{ fingerprint, status?, goal?, triageNote?, resolutionNotes?, reportId? }` | Move through triage |

Tom's existing poll (`GET /api/skill/testing`) also carries
`openTickets: { count, fingerprints[≤5] }` and `unreadMessages`, so ticket
awareness costs him zero extra calls on the no-op path.

## Triage — Tom's assessment

Raw tickets are not work items. For each open fingerprint, population-first,
Tom answers one question — *which of these is it?*

| Assessment | Goal it produces |
|---|---|
| A known coverage cell regressing | Re-verify that cell; lead the brief with the resolution notes that claimed it fixed |
| A known association presenting a new shape | Extend the normaliser mapping; session confirms the field lands |
| An association not in the matrix at all | New matrix row; the standard onboarding chain |
| Environment-local (population 1, machine-specific trace) | `triaged` with a note; no session spent |

He writes the goal onto the fingerprint (`PATCH`), and the goal — not the
ticket — is what the next brief consumes. **Tickets outrank coverage cells**:
a configuration reality has already broken beats one that is merely
unverified.

## Dual mandate

The producers coexist by design. No open fingerprints ⇒ the loop is
coverage-driven, exactly as before (`coverage.md`, highest untested cell).
Open fingerprints ⇒ triage first. Tom's own data problems and customers'
field failures flow through the same machinery — which is the point: the
harness built to test ChatRealty internally **is** the customer-feedback
system, not a sibling of it.

## Surfaces

- **`/admin/loop`** — fingerprints with population and status, expandable,
  manual resolve; the loop stage; chat to each agent. Nav: "Loop Console".
- **`scripts/agent-feedback.mjs`** — `tickets` (open fingerprints),
  `ticket-resolve <fingerprint> "notes"` (repairer closes one when its fix
  lands).
- **MCP** — `report_data_issue` (@chatrealty/mcp-server ≥ 0.21.0). The tool
  description carries the redaction rules; the server enforces them again.

## Console chat — delivery semantics

`loopmessages` backs the `/admin/loop` chat to each agent (`tom` /
`repairer`). It is a **mailbox**: Tom reads on his 15-minute cron, the
repairer on its 5-minute poll, and the UI labels expectations accordingly.

The load-bearing rule is **ack-on-reply**: reading marks nothing, and a
message is "answered" only when the agent's reply lands — the reply is the
delivery receipt. Marking on fetch would stamp `readAt` before the response
crossed the wire, so a dropped connection could leave a message everyone's
records called read that no agent ever saw; and since `unreadMessages > 0` is
the only automated trigger to fetch, it would never be fetched again. With
the reply as the ack, a dropped response leaves the message unread and the
next poll re-delivers — double-delivery is the safe failure for a mailbox.
Both agents' standing duty is to reply on the firing they read, so the ack
costs no extra request.

## Verified live

2026-08-05, against production: a ticket filed with a non-admin customer
token returned `201` with a computed fingerprint and population count; the
same token was refused (`403`) from the triage queue and the `tom` message
channel; the fingerprint was then closed with `ticket-resolve`. That
fingerprint remains visible on `/admin/loop` as a worked example of the full
lifecycle.

## Storage

`ticketfingerprints`, `looptickets`, `loopmessages` — models and the
`ingestTicket` write path in `src/models/LoopTicket.ts`. The ingest is
race-safe (aggregation-pipeline bump; unique index on `fingerprint` closes
the concurrent-first-ticket race) and the reopen check reads the pre-image,
the only place "was it resolved before this ticket?" exists.
