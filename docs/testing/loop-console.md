---
title: Loop Console — the live admin surface, and how it streams
status: current
last_verified: 2026-08-05
related: [README.md, tickets.md, repairer.md, tom.md]
---

# Loop Console (`/admin/loop`)

The one admin surface for the feedback loop (consolidated 2026-08-05;
`/admin/agent-feedback` redirects here). This doc covers what's on it and —
mostly — how the streaming works, because that part has real design decisions
in it.

## Layout, top to bottom

| Panel | What it shows |
|---|---|
| **Stage banner** | Derived stage (armed / report-waiting / repairing / paused — computed, never stored), the flippable toggle, the `● live / ○ polling` stream badge, and presence chips for both agents |
| **Agent chat · Activity** | The mailbox to Tom and the repairer; the merged event timeline. Deliberately the first row — it's what "is anything happening?" actually asks |
| **Field tickets · Session reports** | Fingerprint clusters (population-first, expandable, resolvable); reports with full markdown on expand + lifecycle buttons. The tickets card is `self-start` so an empty queue doesn't render as a giant dead box |
| **Bug reports · Feedback submissions** | Read-only views of `report_bug` and `give_feedback` stores; triage stays in `scripts/cr-bugs.mjs` / `cr-feedback.mjs` |

## Freshness: two layers, deliberately

```
  ┌──────────────────────────────────────────────────────────┐
  │  SSE stream (/api/admin/loop/stream)     instant         │
  │  ── MongoDB change streams ──► browser EventSource       │
  ├──────────────────────────────────────────────────────────┤
  │  15s poll of GET /api/admin/loop         safety net      │
  │  runs ALWAYS, even while the stream is healthy           │
  └──────────────────────────────────────────────────────────┘
```

The poll never turns off. It is cheap (a handful of indexed reads), and it
bounds the damage of a silently dead stream at 15 seconds of staleness instead
of forever. The badge in the stage banner says which layer is currently
delivering: `● live` or `○ polling`.

## The stream (`src/app/api/admin/loop/stream/route.ts`)

SSE — **Server-Sent Events**: an admin-gated route that returns a
`text/event-stream` response and never finishes it. Four MongoDB **change
streams** (`collection.watch()`, Atlas replica set required) feed it:
`loopmessages`, `agenttestreports`, `ticketfingerprints`, `testingstates`.

Two event types only, and that asymmetry is the design:

| Event | When | Payload | Client reaction |
|---|---|---|---|
| `chat` | a `loopmessages` **insert** | the full message | append instantly (deduped by id — the poll may have won the race) |
| `bump` | anything else changed | `{ kind }` only | debounced (400ms) re-fetch of `GET /api/admin/loop` |

Why not typed events for every mutation? Because the composite GET is already
the single source of truth for page state, and duplicating its shaping logic
per event type is how a stream and a page drift apart. Chat gets the fast path
because appending one message is trivially safe; everything else goes through
the one code path that is always right. Bursts (a completed repair = report
update + toggle flip + fingerprint resolve) coalesce into one refetch via the
debounce.

## The serverless reconnect story

Vercel cuts the function at `maxDuration` (300s exported on the route), so the
connection dies every few minutes **by design**. Three built-in behaviours make
that invisible:

1. `EventSource` reconnects automatically — no client code.
2. The client treats every `open` as *"I may have missed events"* and
   re-fetches the GET. A full snapshot is one cheap call, so that is the
   entire resume story — no `Last-Event-ID` bookkeeping.
3. Between attempts, the 15s poll is still running.

A `: ping` SSE comment goes out every 25s so proxies don't reap the idle
connection, and the route's `cancel()` closes all four change streams — an
unclosed watcher is a leaked cursor on the cluster, and this route restarts
every few minutes forever.

## Presence chips

Derived, not reported — from things the agents already touch, so the chips
cannot claim liveness the system doesn't have:

- **Tom** — his skill token's `lastUsedAt`, stamped by every poll he makes.
  Green within 20 min (his cron is 15).
- **Repairer** — the latest of its last chat reply and last completed report.
  Green within 10 min (its poll is 5, while the desktop app is open).

## What streaming does NOT change

The chat is still a mailbox. Tom reads on his ~15-minute cron and the repairer
on its ~5-minute poll regardless of how fast their replies reach your screen —
streaming fixes how fast you *see*, not how fast they *answer*. A message
still shows "answered" only when the agent's reply lands, because the reply is
the delivery receipt (`tom.md` §4, ack by action). The UI keeps saying
this under the composer on purpose.

## Cost note

Each open console tab holds one function invocation with four change streams
for up to `maxDuration`, forever-renewing. At one operator this is noise;
if this console ever grows more viewers, move the fan-out to a single shared
watcher (or a pub/sub hop) rather than per-tab streams.
