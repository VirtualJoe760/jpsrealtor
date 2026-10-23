---
title: The repairer — where it lives and how it runs
status: partial
last_verified: 2026-10-17
related: [README.md, tickets.md, agents/tom/AGENTS.md, tom.md, loop-console.md]
---

> **Partial — read "Where it lives" with this caveat.** The CLI, the firing
> sequence and the constraints below were checked against
> `scripts/agent-feedback.mjs` on 2026-10-17. *Which machine runs the task, and
> whether it is registered and firing right now, could not be established from
> code* — the docs disagree about it (see "Where it lives"). Confirm on
> `/admin/loop`: the Repairer presence chip is green only if it acted in the
> last 10 minutes.

# The repairer

The third role in the loop (`tom.md` §2): reads the judge's report,
verifies each claim against the code, fixes, updates docs in the same commit,
closes the report — which re-arms testing.

This file answers one question the other docs don't: **where is it, actually?**

## Where it lives

| | |
|---|---|
| **What** | A Claude Code **scheduled task**, id `judge-loop-check` |
| **Machine** | Written for Joe's Windows machine (the `F:\web-clients\joseph-sardella\jpsrealtor` checkout). Since the 2026-08-05 consolidation `README.md` and `agents/tom/USER.md` say the task runs on Joe's **Mac** with everything else — **unreconciled**: on 2026-10-17 the Windows app's scheduled-task list did *not* contain `judge-loop-check`, though the prompt file below still exists there |
| **Prompt** | `~/.claude/scheduled-tasks/judge-loop-check/SKILL.md` on whichever machine runs it (the Windows copy is `C:\Users\DellaMSI\.claude\scheduled-tasks\judge-loop-check\SKILL.md`, last edited 2026-08-05) — *not* in this repo |
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

**Known stale line in the Windows copy of the prompt:** its step 2 says
"fetching marks them read". That is the pre-ack-on-reply behaviour. The CLI's
`messages` command is a pure read and only `reply` acks
(`scripts/agent-feedback.mjs:55-92`); a prompt that believes otherwise will
"fetch and go silent", which is exactly the failure ack-on-reply exists to
prevent. Fix the prompt wherever it actually runs.

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

`scripts/agent-feedback.mjs` — the repairer's entire interface. Direct Mongo,
so no API invariant applies to it. `MONGODB_URI` comes from a **hard-coded**
`F:/web-clients/joseph-sardella/jpsrealtor/.env.local` (line 22), not from the
current directory — on a machine without that path it must already be in the
environment.

| Command | Does |
|---|---|
| `check` | Exit 3 = nothing (the cheap poll). Exit 0 + JSON when a `new` report or unread console message exists |
| `claim <id>` / `show <id>` / `complete <id> "notes"` | The report lifecycle; `complete` also re-arms testing |
| `messages` / `reply "text"` | The `/admin/loop` chat channel; `reply` is the ack that marks Joe's messages answered |
| `tickets` / `ticket-resolve <fp> "notes"` | Open, triaged and in-progress fingerprints (25 max, population first); close one when its fix lands |
| `toggle on\|off` | Manual override. Stamps `updatedBy: "admin"`, not `"routine"` |

Not in the CLI: Tom's Idle/Working switch (`tomMode`). That is the operator's
switch, set from `/admin/loop` only — the repairer never touches it.

What the repairer must **never** run: nothing here overlaps Tom's side, and
Tom is forbidden from running any of this — the one-direction handshake only
means something because each side stays off the other's half.

## Constraints, stated honestly

- **Desktop-bound.** No app open, no repairs. Reports and messages queue in
  Mongo losslessly, but the clock runs. This is the known ceiling
  (`tom.md` §6 names lifting it — an always-on runner — as the path to
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
