---
title: Durable Dialer Simulation Controller
status: partial
last_verified: 2026-10-18
related: [README.md, backend-contracts.md, session-continuity.md, implementation-status.md]
---

# Durable simulation controller

## Implemented boundary

The Contacts workspace now persists simulated call attempts instead of keeping ringing/connected/wrap-up state only in React. Start, simulated answer, End and note/outcome saves run through one transactional controller. Calls remain simulated: no provider SDK, microphone, Twilio request, worker, wallet hold, email or recording delivery is invoked by this controller.

New source: src/lib/dialer/simulation-controller.ts. New models: DialerAttempt, DialerAgentState and DialerAction. DialerSession retains its bounded embedded queue and adds activeAttemptId plus running/wrap-up states. The separate queue-row model, provider outbox/inbox, durable runner and live provider reconciliation are still future milestones. Extend this controller and schema rather than adding a parallel live state machine.

## Commands and state

POST /api/crm/dialer/sessions/[id]/commands accepts start, answer and end. PATCH /api/crm/dialer/sessions/[id] delegates note/outcome saves to the same controller. Both authenticate the owner, require a valid Idempotency-Key and expected session version, and return no-store safe session/active-attempt projections. Opening or restoring via GET creates no attempts.

| Command | Persisted behavior |
|---|---|
| start | Validate owned session/item, current contact ownership, suppression and unchanged selected phone. Atomically create one ringing simulation attempt, claim the agent's global slot and mark the session running. |
| answer | Only the active ringing simulation attempt can become connected. Save answeredAt; this endpoint is not a future trusted live-provider answer event. |
| end | Save endedAt and wrap-up state; retain the agent slot until an outcome is saved. Repeated End does not replace the original end time. |
| save notes | Save queue/attempt notes while preserving the current ringing/connected/wrap-up state. |
| save outcome | Require wrap-up for an active attempt. Save notes/outcome and completedAt, complete the item/attempt, clear the slot and pause/complete the session atomically. Items without attempts can still be manually reviewed/skipped. |

These are simulation outcomes, not real CRM status or suppression mutations. Contact deletion or ownership changes block new starts but do not prevent historical wrap-up from releasing an already-held slot. An unavailable contact renders a read-only queue placeholder, with editing and new starts blocked.

## Concurrency and recovery

- One DialerAgentState row per user prevents overlapping simulated attempts across different sessions/tabs. There is no TTL or automatic lock stealing. A conflict response includes the owned active session ID; Contacts offers an explicit Open unfinished calling session recovery action even when that queue is outside the recent list. Triple-line support will require bounded destination slots plus one human slot; this initial single-attempt field is not triple-line implementation.
- Each owner/request key has a durable DialerAction with a hash of the semantic command payload, including expected version and session. Exact retry returns current saved state before checking the old version; changed payload conflicts. The action, session, attempt and slot updates commit together. A failed write rolls all of them back.
- Mongo replica-set transaction support is required. Before mutations, initialize the agent/action models and inspect their actual unique, nonpartial, nonsparse owner and owner/key indexes. Missing constraints fail with 503; no provider action occurs. App roles must be able to inspect indexes. With autoIndex disabled, install the declared indexes operationally before use.
- Restart the Next/Mongoose process after these schema changes. The controller detects a cached session schema missing activeAttemptId/running support and returns an actionable 503 rather than allowing strict mode to discard fields.
- The client retains a command's key and exact body after an uncertain network/5xx failure. It refuses to replace that pending operation with a different command. Retry unchanged or explicitly reopen saved state. The reopen action warns before discarding local unsaved notes. A full refresh relies on persisted attempts/locks rather than browser keys to prevent another start.
- Fresh Start may schedule the simulated answer transition in the browser. Restoring an already-ringing attempt does not schedule a new answer; it remains available to End and wrap up. Restored connected attempts show elapsed time from saved timestamps; ended duration is retained after refresh. These display seconds are not billable usage.
- A replay returning another active contact updates the shown contact and preserves displaced note drafts in this tab in a copyable recovery section, with unsaved-work guards. Drafts still require explicit Save notes; they are not durable until saved. Queue changes remain blocked while an attempt needs wrap-up.

## Validation and remaining gates

node scripts/tests/dialer-controller.test.cjs covers command transitions, same-key replay/changed-payload conflicts, competing session starts, lock retention/release, stale versions, changed/blocked/deleted contacts, failure rollback and missing-index rejection. Transaction scheduling is simulated; actual Mongo conflict/retry behavior and deployed index permissions are not yet verified.

node scripts/tests/dialer-sessions.test.cjs covers session creation/ownership, HTTP command/checkpoint validation/delegation and restored rendering. Browser checks used actual workspace components with a separate offline fake backend and synthetic contacts: lost Start response plus retry created one attempt, saved notes/connected state survived reload, wrap-up survived reload, and Save outcome advanced without a new call. This does not prove live Mongo persistence or real-device audio behavior.

Before Twilio: verify database transactions/indexes, migrate the bounded queue contract as needed, choose/deploy the durable runner, persist provider commands/events with reconciliation, bind credit reservations to owned attempts, verify account/caller ID/callback configuration, and pass controlled telephony tests. Live voice, triple-line routing, auto-billing and Retell remain disabled/unimplemented.

The separate [provider job foundation](./provider-jobs.md) is not invoked by this simulation controller; simulated attempts cannot dispatch real calls.
