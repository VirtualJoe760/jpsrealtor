---
title: The repairer — where it lives and how it runs
status: current
last_verified: 2026-08-05
related: [README.md, tickets.md, agents/tom/AGENTS.md, mcp-fbl.md]
---

# The repairer

The third role in the loop (`mcp-fbl.md` §2): reads the judge's report,
verifies each claim against the code, fixes, updates docs in the same commit,
closes the report — which re-arms testing.

This file answers one question the other docs don't: **where is it, actually?**

## Where it lives

| | |
|---|---|
| **What** | A Claude Code **scheduled task**, id `judge-loop-check` |
| **Machine** | Joe's Windows machine (the `F:\web-clients\joseph-sardella\jpsrealtor` checkout) |
| **Prompt** | `C:\Users\DellaMSI\.claude\scheduled-tasks\judge-loop-check\SKILL.md` — *not* in this repo |
| **Schedule** | Every 5 minutes, **only while the Claude Code desktop app is open** |
| **Identity in the loop** | `updatedBy: "routine"` on the toggle; the `repairer` chat channel |

Each firing is a fresh Claude session with no memory of the last — the same
constraint Tom runs under, solved the same way: all state lives in Mongo, and
the firing reconstructs context from it.

The prompt file is the repairer's `AGENTS.md`-equivalent. It is **not**
version-controlled here; when its behaviour changes, this doc is the record
and the change is made via the scheduled-task tooling. (Asymmetry with Tom,
whose files ARE in the repo at `agents/tom/` — his propagate by git pull; the
repairer's live in the task store.)

## A firing, start to finish

```
 fire (cron */5, local time)
   │
   ▼
 node scripts/agent-feedback.mjs check
   │
   ├── exit 3 ─► STOP, silently. The no-op path must stay cheap —
   │             288 firings/day and most do nothing.
   │
   ▼ exit 0 (a new report and/or unread console messages)
 messages? ─► agent-feedback.mjs messages → act → reply "…" (the ack)
 report?   ─► claim <id> → show <id>
   │
   ▼
 fix — verify each claim against the code FIRST (reports can be wrong
 about root cause), AGENTS.md rules, docs in the same commit,
 cross-reference cr-bugs + ticket fingerprints, commit, push
   │
   ▼
 complete <id> "resolution notes"     ← marks complete AND sets
   │                                    testingOn=true: one command,
   ▼                                    both halves of the handshake
 ticket-resolve <fingerprint> "…"     ← for any fingerprint the fix closed
   │
   ▼
 one short message to Joe (outcome first)
```

## The CLI

`scripts/agent-feedback.mjs` — the repairer's entire interface. Direct Mongo
via `.env.local`; run from the repo root.

| Command | Does |
|---|---|
| `check` | Exit 3 = nothing (the cheap poll). Exit 0 + JSON when a `new` report or unread console message exists |
| `claim <id>` / `show <id>` / `complete <id> "notes"` | The report lifecycle; `complete` also re-arms testing |
| `messages` / `reply "text"` | The `/admin/loop` chat channel; `reply` is the ack that marks Joe's messages answered |
| `tickets` / `ticket-resolve <fp> "notes"` | Open fingerprints; close one when its fix lands |
| `toggle on\|off` | Manual override |

What the repairer must **never** run: nothing here overlaps Tom's side, and
Tom is forbidden from running any of this — the one-direction handshake only
means something because each side stays off the other's half.

## Constraints, stated honestly

- **Desktop-bound.** No app open, no repairs. Reports and messages queue in
  Mongo losslessly, but the clock runs. This is the known ceiling
  (`mcp-fbl.md` §6 names lifting it — an always-on runner — as the path to
  production support; a documented SLA is the interim).
- **Serialised.** One open report at a time, by API invariant. Correct while
  repairs are global to one codebase; the throughput wall once ticket volume
  arrives. The lift is partitioning the report queue per association/adapter.
- **resolutionNotes are load-bearing.** Tom relays them verbatim into the
  next brief for re-verification, and they resolve every ticket clustered
  under a fingerprint. They are written for the *next builder*, not as a
  changelog.

## Chatting with it

`/admin/loop` → Repairer tab. It reads on its next firing (≤5 min while the
app is open) and answers with `reply` — the console shows "answered" once the
reply lands and "awaiting reply" until then. The reply is the delivery
receipt: a read that dies before replying leaves the message unread for the
next firing. It is a mailbox, not a live socket; the UI says so wherever a
chat box might imply otherwise.
