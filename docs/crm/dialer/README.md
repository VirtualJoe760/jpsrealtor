---
title: CRM Dialer Build Plan
authority: product scope and implementation entry point
status: partial
last_verified: 2026-10-18
related: [../README.md, ../../ARCHITECTURE.md, ../../integrations/README.md]
---

# CRM dialer

## TL;DR

Build a Twilio-first calling workspace launched from selected Contacts or a tag/filter set. The target includes saved sessions, single/triple-line dialing, verified callback number, voicemail drops, simultaneous-answer handling, email follow-ups, newsletter invitations, and optional Retell AI overflow. The current implementation saves simulation queues, attempts and explicit note/outcome checkpoints, with recent-session resume and one agent slot held through wrap-up. Calls remain simulated; credit reservation primitives and paid-only purchase fulfillment are implemented behind disabled live-voice readiness. Production telephony, live recovery, usage collection and auto-top-up are not implemented.

## Start here

| Document | Purpose |
|---|---|
| [Full build plan](./build-plan.md) | Authoritative scope, dependency-ordered implementation work, completion gates and launch sequence |
| [Backend contracts](./backend-contracts.md) | Proposed models, state transitions, APIs, worker boundaries, locking and idempotency |
| [Credits and billing](./credits-and-billing.md) | Audit/repair existing wallet, purchased packs, metered calling, shared reservations and optional automatic top-ups |
| [Stripe sandbox setup](./stripe-test-setup.md) | Verified local test-mode configuration, isolated test credits/customers, signing-secret setup and remaining provider checks |
| [Implementation status](./implementation-status.md) | Existing code and mockup behavior; distinguish shipped UI from planned backend |
| [Saved sessions](./session-continuity.md) | Cross-device resume, progress, drafts and interruption recovery |
| [Twilio voice adapter](./twilio-voice-adapter.md) | Gated REST adapter, signed status endpoint, replay-safe inbox and remaining activation gates |
| [Simulation controller](./simulation-controller.md) | Persistent attempts, start/end/wrap-up commands, one-agent lock, request replay and UI recovery |
| [Multi-line and recordings](./multi-line-and-recordings.md) | Triple-line arbitration, voicemail, overflow audio, pacing and message eligibility |
| [Call outcomes and wrap-up](./call-wrap-up.md) | No answer/bad line/connected, client notes, tag moves and in-call appointment booking |
| [Email follow-ups](./email-follow-ups.md) | Quick drafts, Send & next, newsletter invitation, suppression and duplicate-send prevention |
| [Retell overflow](./retell-overflow.md) | Optional AI handling while the agent is occupied; SIP spike, handoff, capacity and eligibility |
| [Validation and operations](./validation-and-operations.md) | Testing matrix, cost measurement, controlled pilot, monitoring, rollback and acceptance |

## Accepted product decisions

- Select individual contacts or a tag/status/search/filter set, then Open in dialer. Snapshot the queue; do not silently launch the entire database or change membership when filters change.
- Open or restore a workspace without placing calls. Start dialer immediately starts the first eligible contact; multi-line mode starts an eligible batch up to the configured capacity. Resume dialer explicitly restarts eligible work after reconciliation.
- Mobile: swipe between Dialer, Contact and Queue. Desktop: queue left, dialer center, existing full contact page on the right. Keep call controls reachable and contact edits intact.
- Reuse ContactViewPanel, property images, MLS enrichment and closed-sale comps; preserve existing contact notes/status/phone editing. External property research opens new tabs.
- Display the agent's own verified callback number. Initially keep the current carrier and callback destination; outbound verification does not capture inbound calls or enable SMS from that number.
- Target one-, two- and three-line modes with exactly one human-agent conversation. Extra human answers follow a configured eligible overflow recording or optional Retell AI route.
- Offer multiple named recordings through upload and in-app recording, separating voicemail from overflow audio and retaining playback versions. Delivery is subject to recipient/message eligibility and detection safeguards.
- Build the core features first and finalize the specific Retell script last; keep live AI disabled until that script and tools pass review and controlled testing.
- Size cost planning for 10 dialing hours per week (approximately 43.3 monthly workspace hours). The dollar spending cap and actual provider billable usage remain separate, unresolved inputs.
- Save progress and unresolved attempts server-side for cross-device resume. No automatic redial on refresh, timeout or recovery.
- Quick email actions: Couldn't reach you, Great speaking with you, Invite to newsletter. Draft, review, Send or Send & next; invitation does not automatically subscribe.
- Begin with Twilio voice and existing SMS/email integrations. Keep provider-neutral CRM state and client/server adapters so Telnyx can be evaluated later with actual cost/quality data.

## Gotchas

- The UI currently simulates calls. Inline edits in the existing embedded contact page still use normal CRM persistence; simulation queue notes/outcomes now persist only through explicit checkpoint actions; they remain separate from real CRM notes and call history.
- The repo's worker/index.js is a browser push service worker, not a durable server dialing worker. Vercel after() is not a session scheduler.
- Single-line locking cannot be reused unchanged for triple-line calling: reserve one agent session, bounded destination slots and exactly one human-conversation slot.
- Voicemail, prerecorded human overflow and AI speech are separate eligibility paths. Recordings and AI do not automatically cure abandoned-call constraints.
- Retell Dial to SIP requires our own transfer/end logic; it cannot use Retell's built-in transfer feature.
- Add schema fields before writes, scope private records by session.user.id, keep secrets out of agentProfile and browser bundles, and verify actual persistence.

## Status and authority

All backend contracts and milestones below the entry point are proposals until implemented and verified. No outbound call, email, recording delivery, number purchase, agent reconfiguration, subscription change, commit or deployment is authorized by creating these documents. Implementation is underway; see implementation status for completed slices and remaining activation gates.

This entry point supersedes the earlier single-line-only sequencing in this folder. Where a topic document discusses its first implementation slice, the full build plan remains the authority for complete product scope. Unknown provider/account details are explicit discovery tasks rather than assumptions that capabilities are ready.

See [provider jobs](./provider-jobs.md) for the implemented, unscheduled dispatch foundation and remaining live adapter/reconciliation work.

[Agent audio and mobile calling](./agent-audio.md): implemented local device preferences/tests and the accepted phone bridge/dial-in implementation direction.
