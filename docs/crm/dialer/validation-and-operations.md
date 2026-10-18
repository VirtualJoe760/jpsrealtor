---
title: Dialer Validation and Operations
status: partial
last_verified: 2026-10-17
related: [README.md, build-plan.md, backend-contracts.md]
---

# Validation and operations

## Test strategy

Use a deterministic simulation provider, signed webhook fixtures, fake clocks and mocked mail/AI integrations before controlled telephony tests. Provider success responses alone do not verify persistence, routing or completion. Read records back and inspect all destination/agent/SIP/playback legs. No live prospect calls, campaigns, email sends or voicemail drops are test fixtures.

| Area | Required evidence |
|---|---|
| Ownership | Another agent cannot read/mutate session, queue, call, audio, draft, transcript or tool targets; malformed IDs and expired permissions fail safely |
| Queue launch | Selected IDs or server-resolved tags produce the intended deduplicated snapshot; empty/deleted/suppressed/missing-phone contacts explain exclusions; changing filters does not mutate the launched queue |
| Start and resume | Open/GET/reload create zero calls; explicit Start immediately creates the eligible first batch once; Resume reconciles unknown legs and unfinished wrap-up before dialing |
| Persistence | Closing/reopening and a second device restore progress, notes/drafts, selected number, paused status and unresolved outcomes |
| Capacity | Duplicate Start, simultaneous tabs, expired leases and webhook races never exceed destination slots or one human conversation; ambiguous creates remain reserved |
| Triple-line | Two/three simultaneous human answers produce exactly one agent bridge; other audio is isolated; late AMD cannot hijack the conversation |
| Voicemail | Human/machine/fax/unknown, beep/silence/timeout, operator override and playback interruption produce correct states; no sales audio is played on an ineligible human path |
| Overflow | Eligible script/version is selected; callback/opt-out works; minimum ringing, timing, pacing and campaign counters reflect actual classifications and uncertainty |
| Retell | Two AI sessions remain isolated; unavailable capacity, SIP delay, registration timeout and tool replay are bounded; custom hand-back never disconnects the current human call |
| Email | Draft only versus Send is unambiguous; unsubscribed/missing address/unverified sender/insufficient funds are handled; duplicate actions produce at most one accepted send/charge |
| Newsletter | Invitation creates no subscriber mutation; correct agent signup link; no silent reactivation; lookup failure displays unknown |
| Costs | Per-leg billed units and rounding, detection, conference/SIP, audio, AI and email charges reconcile; estimated, reserved and settled spend remain distinct |
| Mobile | Real iOS/Android microphone permissions, headset changes, audio interruptions, screen lock/backgrounding, keyboard, safe areas, swipe/vertical scroll and orientation tested; do not promise browser audio survives background suspension |
| Desktop/accessibility | Independent queue/dialer/contact scroll, all numbers and existing inline edit behavior, keyboard navigation, focus recovery, status announcements, light/dark themes and reduced motion |
| Property research | Subject versus nearby-photo matching is clear; active asking price is separate from sold price; closed-sale date/radius filters and per-returned-subset medians are accurate; new-tab links preserve workspace state |
| Recovery | Drop/lateness/replay/out-of-order events, provider outage, database outage, worker restart and uncertain transfer/hangup/send converge without duplicate side effects |

Before implementation commits run npx tsc --noEmit; before shipping page changes run npx next build. Record existing unrelated warnings/failures separately. Documentation-only planning does not require a build. Previously reported mockup checks are not proof of future production backend or authenticated live-data behavior.

## Readiness and release

1. Provision only the confirmed account configuration/secret references and a dedicated controlled test setup. Verify number ownership and keep existing SMS/inbound routing intact.
2. Deploy migrations/indexes and private settings projections before enabling writers. Restart local Mongoose processes after schema changes and verify persisted fields.
3. Deploy runner, inbox/outbox, canonical signed callbacks, monitoring and feature flags with outbound features off. Verify callback reachability and rejection of forged requests.
4. Use expressly approved controlled numbers/recipients for paid telephony, prerecorded, AI and email checks. Confirm actual caller ID, two-way audio and lifecycle per leg.
5. Pilot Joseph-only single-line plus saved resume. Enable email, voicemail, multi-line and AI only after their independent test and eligibility gates. No production fictitious listings or silent test-data fallback.
6. Observe representative traffic long enough to reconcile provider billing and operational failures; select the observation period and limits during readiness review rather than inventing success thresholds afterward.
7. Broader release requires documented configuration, support runbook, evidence of safety/quality gates and a rollback drill. Retell and Telnyx remain separately flaggable.

## Observability and operator controls

Correlate owner/session/item/attempt/action, Twilio leg IDs, Retell call IDs and email send IDs. Redact phone/email/body/transcript details from routine logs; store required evidence under controlled access and a defined retention policy. Track provider event lag, signature failures, inbox/outbox/dead-letter counts, expired reservations, unknown state age, agent-bridge latency, overflow/abandonment counters, playback failures, AI concurrency/duration/handoff failures, email acceptance/bounce and budget variance.

Provide operations to pause new work, inspect/reconcile a stuck attempt, end all tracked legs, disable AI or voicemail, and retry an eligible outbox job after confirming provider state. Operator actions are audited, owner-scoped and idempotent. Never release a stuck slot just by deleting its record.

## Spending and pricing

Use current actual account rates during readiness review. Formula: sum billed units per destination, browser, SIP and conference leg plus detection/playback/storage/AI charges, number rental, applicable surcharges/taxes and email credits. Avoid quoting a combined per-minute rate as the total cost of a triple-line/AI session.

Set per-call/AI duration bounds, daily/session budget reservations and feature-level kill switches. Show estimates separately from settled provider charges; delayed usage means app limits are protective controls, not a guaranteed exact invoice cap. Disable automatic concurrency burst or expensive unapproved features where configurable. Report attempts, conversations, AI-handled calls, voicemail outcomes, total spend and cost per real human conversation without counting overflow as a human conversation.

## Rollback and failure behavior

Disable new token/start/next/routing/send creation and scheduler claims through flags. Keep authenticated hangup/end-all, signed callbacks, persisted history and reconciliation operating until in-flight legs settle. Stop new work on browser disconnection according to session policy; do not depend on beforeunload to end paid calls. Maintain provider-side duration bounds for orphan protection.

If a provider action's outcome is unknown, show reconciling and retain its reservation. If mail acceptance is uncertain, retain the send action and query/reconcile rather than resending. If AI fails, use only a separately eligible fallback; otherwise record failure and end safely. Retrying a whole batch is never a substitute for resolving each line.

Rollback of a future Telnyx switch applies to new sessions after active sessions drain; historical attempts retain original provider references. Preserve migrations/history and avoid destructive deletion of state as a rollback mechanism.

## Completion evidence

Each milestone records implemented files, migrations, contract/race tests, controlled-pilot evidence, remaining limitations, provider/account assumptions and documentation updates. The overall dialer is complete only when all required selected-scope milestones pass; a working mockup, first successful call or near-complete token/time budget is not completion.