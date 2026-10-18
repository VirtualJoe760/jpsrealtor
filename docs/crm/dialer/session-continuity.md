---
title: Dialer Saved Sessions and Continuity
status: partial
last_verified: 2026-10-18
related: [README.md, ../README.md]
---

Implementation sequence and shared contracts: [full build plan](./build-plan.md) and [backend contracts](./backend-contracts.md). This document expands its feature requirements.

## Saved sessions: implemented simulation and remaining requirements

A launched group must become an agent-owned server-persisted session, not only a local array. Resume across reloads, app restarts and devices is a product requirement; the first persistence slice now saves bounded simulation queues and explicit note/outcome checkpoints and restores the first unfinished item. Transactional simulation attempts now restore ringing/connected/wrap-up, and one active attempt per agent is enforced across sessions through wrap-up. Provider reconciliation, autosave and live-call recovery remain planned; see simulation-controller.md. Start dialer initiates the first call immediately; merely opening or restoring a session never places a call.

| Capability | Required behavior |
|---|---|
| Saved session identity | Name/source tag, owner, created/last-active timestamps, original contact-ID order and selected phone per item. Store IDs and authorized snapshots, not a new contact database. |
| Resume entry | Contacts shows recent paused/incomplete sessions: list name, reviewed/remaining count, last active time, next contact, and Resume / Start new choices. |
| Resume point | Return to the earliest unresolved queue item according to saved order; show the last attempted item if it needs an outcome. Do not infer completion from array position or a call ending. |
| Explicit resume | Opening a saved session restores context only. Resume dialer explicitly starts the next eligible unfinished contact, consistent with Start dialer's immediate calling behavior. |
| Pause | Stops queue progression. An existing call may finish and its notes/outcome remain saveable; distinguish Pause after this call from End call. |
| Wrap-up recovery | Preserve an answered attempt needing disposition. On restore, ask for the missing outcome before allowing the next call; do not redial it automatically. |
| Crash recovery | Reconcile provider state before releasing the active-call lock. A lost browser connection or expired lease must not trigger a duplicate call. |
| Completed and skipped items | Completed outcomes are durable. Record skipped reason separately; offer an explicit revisit-skipped / retry-no-answer pass rather than silently restarting the list. |
| Notes and follow-ups | Autosave call-note drafts with a visible saved/unsaved indicator; distinguish these from normal contact notes. A follow-up outcome can create a dated task. |
| Phone attempts | Track which number was tried on contacts with multiple phones. Reopening cannot silently switch numbers or retry the same number without a deliberate action. |
| List changes | Keep launched membership/order fixed. New tag members require an explicit refresh/new session; removed/deleted contacts and newly suppressed numbers are revalidated before calling. |
| Concurrent devices | One active agent session enforced server-side; single-line uses one attempt reservation, while the multi-line target adds up to three line reservations and exactly one active human conversation. Show which session is in use, and require deliberate handoff after checking provider state. |
| Finished lists | Summary with attempts, outcomes, remaining follow-ups, and explicit options to archive, retry selected outcomes, or start a fresh session. |

Extend the implemented DialerSession / DialerAttempt controller and the proposed DialerQueueItem contract rather than creating a parallel persistence mechanism. Add resume listing/detail and explicit pause/resume routes to the session contract; mutations use a version or compare-and-set guard and idempotency keys. Persist queue reservation and attempt state atomically or with recoverable transitions. Browser storage may cache display state, but is not the authority for ownership, active calls, or progress. Never store provider credentials in browser storage.

Acceptance: pause/reload on item N returns to the same unresolved item; completed items stay completed; a call ending without disposition restores wrap-up; a second device cannot create an overlapping call; fresh suppression blocks a resumed item; reopening alone creates zero provider calls. Show unsaved work and reconciliation states instead of pretending every interrupted session is ready.


For the required triple-line milestone, resume every in-flight line and pending playback separately; see [multi-line calling and recordings](./multi-line-and-recordings.md).
