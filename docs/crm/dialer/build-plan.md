---
title: Dialer Full Implementation Plan
status: partial
last_verified: 2026-10-18
related: [README.md, backend-contracts.md, validation-and-operations.md, retell-overflow.md]
---

# Full implementation plan

## Outcome and scope

Turn the existing Contacts/dialer UI into a persistent prospecting workspace comparable in workflow to Mojo: explicit queue selection, immediate start, one/two/three lines, one human conversation, prerecorded voicemail, appropriate extra-answer handling, optional existing Retell agent, contact/property research, email follow-up and reliable resume. Twilio is the first voice provider. Telnyx migration is a later measured decision, not a prerequisite or a simultaneous rewrite.

This document is the implementation authority for the complete scope. [Implementation status](./implementation-status.md) records what exists; all unchecked milestones here remain planned. The first implementation slice now saves bounded simulation queues and explicit note/outcome checkpoints; see implementation-status.md. Production voice, live-call recovery, live credit metering, prerecorded delivery, AI routing and dialer email sending remain unimplemented.

## Latest planning decisions

- Fund calling through the existing credits system: purchased packs/tickets, metered voice usage and optional explicit auto-top-up. First audit and repair the reportedly inactive billing flow. [Credits and billing](./credits-and-billing.md) defines wallet reservations, settlement, provider funding, payment failures and release gates; these are prerequisites for paid calling, not post-launch polish.

- Build the core dialer, persistence, contact actions, recording library and follow-up features before finalizing Retell's script. Develop AI transport/state handling with fixtures; live AI remains disabled until the specific script and tools are approved and tested.
- Support multiple named recordings, both uploaded and recorded in-app, with separate voicemail and overflow purposes. Select assets per session and retain the exact asset version on each playback attempt.
- Plan around **10 dialing hours per week**, approximately **43.3 hours per month** using 52 weeks / 12 months. This is workspace usage, not a monthly dollar budget or a promise of billable minutes: multiple legs, ringing, provider rounding, AI time and optional services affect actual spend.
- The actual monthly spending cap, callback number, Retell agent/version, eligible audience and automatic progression after no-answer/bad-line outcomes still require confirmation. Short affirmative answers do not identify account resources or establish recipient eligibility.

## User journey

1. Select contacts or choose a tag/filter set in Contacts. Show source, count, eligible/blocked/duplicate/missing-phone counts; choose one phone per contact and explicitly confirm the queue snapshot through Open in dialer.
2. Create a ready saved session without calling. Choose callback number, mode, voicemail asset, overflow policy and optional Retell agent. Show provider readiness, audio readiness, cost limits and any missing eligibility requirements.
3. Start dialer immediately calls the first eligible item or an allowed multi-line batch. The server reserves capacity before submitting provider commands. If no eligible contact exists, explain why and place zero calls.
4. Keep line status visible. In mobile view the user swipes between Dialer and the complete Contact page; desktop keeps both visible. Contact includes existing editable notes/phone/status, property research, photos and MLS comps. Queue selection remains stable while the session runs.
5. The first eligible human answer claims the agent connection. Other prospect legs never hear that conversation. Machines take the eligible voicemail path; additional people take the configured eligible overflow/Retell path. Stop launching new calls while the human is occupied.
6. During a connected conversation, write client notes, move/add tags and book an appointment in the same workspace. End the conversation and save disposition and pending actions, optionally create a callback task or email draft. Send & next requires an explicit send action and durable result. Initially start the next batch explicitly after wrap-up; automatic continuous progression is a later configurable behavior, not assumed approval.
7. Pause, leave or lose connection: new calls stop; in-flight legs reconcile and retain their individual outcomes. Reopen a saved session, resolve uncertain calls or incomplete wrap-up, then press Resume dialer. Do not redial simply because the page was restored.
8. Finish with a session summary and explicit retry-skipped/no-answer or new-session choices. Newsletter invitations link to the recipient's signup flow rather than enrolling contacts.

## Implementation principles

- MongoDB is the source of truth for sessions, reservations, attempts, playback, drafts and action results. Browser state is presentation/cache only.
- Next.js serves UI, authenticated commands, short-lived voice tokens and signed provider webhooks. A durable server runner handles outbox delivery, reconciliation, timeouts and session progression; provider callbacks cannot depend on browser presence.
- Default to one active calling session per agent, up to three occupied destination slots, one human audio slot and bounded optional AI slots. Count unresolved provider state as occupied capacity.
- App ownership/eligibility/credit/budget checks precede provider actions. Protect the provider-side connection path as well as the UI command path.
- Provider/account/agent-version and source data are explicit. Do not promote an approximate MLS match or an AI-generated statement into verified contact facts.
- Use the current contact editor and existing mail/suppression systems where their semantics fit. Reuse must not inherit missing ownership, idempotency or consent checks.

## Dependency-ordered build backlog

Effort labels compare complexity (M = moderate, L = substantial, XL = substantial concurrency/provider work). They are not calendar promises. Estimate dates after discovery and the controlled provider spike; account approvals and policy review can affect the critical path.

### A. Baseline, account readiness and architecture decisions — M

- [x] Inspect local credential mode without printing secrets; add a safe readiness script and isolated Stripe test wallet/customer paths. Local test Stripe keys exist, signing-secret configuration is missing, and dialer-specific voice key/app/callback configuration remains outstanding. Provider account validity, callback reachability and database/index checks are not yet verified.

- [ ] Audit the current mockup, Contacts launch selection, ContactViewPanel embedded mode, property/comps APIs, sender configuration, suppression storage and available task system.
- [ ] Confirm Twilio account/caller-ID/Voice API key/TwiML App and geographic/capacity limits without printing secrets. Preserve existing SMS routes.
- [ ] Confirm the actual callback number and keep existing-carrier callbacks as initial behavior. Porting/in-app inbound routing is separate scope.
- [ ] Select a durable server runner with an ADR: hosting, deployment, database access, bounded job leases, scheduled recovery and monitoring. Existing worker/index.js is only a PWA push service worker.
- [ ] Verify Mongo transaction/index support and settle the state/API contracts in backend-contracts.md.
- [ ] Inspect Retell agent configuration read-only and record transport/version/tools/concurrency/storage requirements; do not reconfigure it yet.
- [ ] Define call eligibility, suppression source, recipient timezone behavior, message policies, review owner, pilot limits and retention. Unknown timezone or unsupported message eligibility fails closed.

Exit: versioned contracts and operational setup checklist approved for implementation; unresolved account facts are explicit blockers for live pilot, not for mock development.

### B. Persistent sessions and queue control — L; depends on A

- [x] Transactional simulation controller: separate attempts, global agent slot through wrap-up, request-hashed action deduplication, start/answer/end/save commands, restored active state and client retry/reopen handling. Required index checks fail closed; actual Mongo concurrency/permissions verification and live provider outbox/reconciliation remain pending.

- [x] Initial simulation persistence: bounded owned queue creation, recent-session listing, restore, explicit note/outcome checkpoints, request-key deduplication and compare-and-set conflict detection. This does not satisfy live-session orchestration/recovery milestones below.

- [ ] Add the proposed schemas/indexes before any writes; add explicit safe DTOs.
- [ ] Create sessions from owned contact IDs or server-resolved filters/tags; store an ordered, deduplicated queue and selection source. Validate selected numbers and record exclusions.
- [ ] Implement recent/paused session listing, session detail, start/pause/resume/complete/archive commands, immutable launch membership and versioned updates.
- [ ] Persist per-item status, per-number attempts, notes/drafts, outcomes, selected contact/panel and pending wrap-up. Use item states rather than a single cursor as the resume authority.
- [ ] Add agent/session and line-slot reservations, idempotency/action records, durable outbox, webhook inbox and reconciliation jobs. Ship simulation-provider tests before a live provider.
- [ ] Wire current UI to saved sessions; show last-active time, progress, next unresolved item, unsaved/saved drafts, conflict and reconciling states.

Exit: refresh, crash and a second device cannot lose completed work or create duplicate simulated attempts. Opening/restoring a session creates no provider actions.

### C. Single-line Twilio voice foundation — L; depends on B

- [x] Offline-tested credit foundation: canonical manual purchase quotes, paid-only payment-key grants, transactional credit holds/releases/settlement, shared debit guards and read-only available/reserved balance display. Actual payment-account/index/replica-set verification, call usage collection, hold extension and auto-top-up are still pending.

- [ ] Complete the [credit billing foundation](./credits-and-billing.md): verified manual purchase/grant, shared-wallet reservations, fixed-precision metering, idempotent per-leg settlement and low-balance behavior before enabling live voice. Add optional auto-top-up only after manual funding works; enforce purchase and usage caps independently.

- [ ] Implement provider interfaces, lazy server configuration, short-lived agent-bound client tokens and the Twilio browser SDK adapter.
- [ ] Establish the provider-controlled agent/destination bridge, canonical HTTPS signed callbacks and per-leg IDs. Prefer a transport that can extend to multi-line arbitration; prove any conference-versus-direct-bridge choice and cost in the spike.
- [ ] Authorize destinations/caller ID again at connection time. No arbitrary browser-supplied number or conference identifier is trusted.
- [ ] Start dialer launches the first eligible attempt once. Add microphone readiness, mute, hangup, DTMF, busy/no-answer/error, max duration, account restrictions and browser token recovery.
- [ ] Require an explicit authenticated session/command and confirmed audio readiness before launch; prevent duplicate start across tabs.
- [ ] Persist provider state and settle usage independently of the browser. Reconcile ambiguous create/hangup responses rather than retrying blindly.

Exit: controlled authorized calls prove two-way audio, displayed callback number, accurate destination-leg status, idempotent termination and recovery. No cold-prospect testing.

### D. Outcomes, notes, tags, appointments and email follow-up — L; depends on B; live sending after C pilot readiness

- [ ] Implement the [call outcomes and wrap-up contract](./call-wrap-up.md): No answer, Bad line, Connected and separate CRM lifecycle states; durable in-call notes and tag moves that preserve unrelated groups.
- [ ] Add owned appointment availability/booking commands using existing calendar/Appointment services, slot revalidation, idempotent event creation and separate notification delivery.
- [ ] Persist call dispositions separately from transport outcome; do-not-call suppresses the normalized phone before progression, including duplicate contacts.
- [ ] Reuse an existing suitable task model or add an owned callback-task model after discovery. Store due time/timezone and completion independently of queue position.
- [ ] Add editable Couldn't reach you / Great speaking with you / Invite to newsletter drafts using existing composer/template infrastructure.
- [ ] Add a contact-scoped follow-up send command with suppression, selected-address ownership, verified sending identity, paid-plan/balance and template-placeholder checks.
- [ ] Implement outbox/idempotent send accounting; maintain accepted versus delivered/failed state and durable Send & next behavior. Do not resend after uncertain responses until reconciled.
- [ ] Resolve the agent's canonical newsletter signup link and display subscriber status where authorized. Invitation does not add/reactivate subscribers.

Exit: drafts survive session resume; duplicate send actions cannot duplicate email or charge; sending failure does not advance the queue; an ongoing call is not interrupted.

### E. Voicemail audio library and delivery — L; depends on C and message-policy readiness

- [ ] Add separate agent-owned, versioned audio assets for voicemail and overflow: upload/record, preview, duration, valid format/size, approval status and secure delivery.
- [ ] Evaluate reuse of VoicemailScript audio metadata only. That existing model requires campaignId and tracks Drop Cowboy delivery; do not overload it with Twilio playback or accidentally launch ringless campaigns.
- [ ] Implement manual Drop voicemail and gated optional automatic drop. Use message-end detection with explicit human/machine/fax/unknown/timeout branches.
- [ ] Track playback request/start/completion/interruption/failure; a request is not proof of delivery. Provide operator override for misclassification.
- [ ] Keep prerecorded marketing eligibility and opt-out behavior separate from numeric caller-ID verification or contact existence.

Exit: fixtures and controlled calls demonstrate no recording over the active human conversation, correct greeting/beep behavior, failure recovery and distinct outcomes.

### F. Triple-line orchestration and simultaneous answers — XL; depends on B, C and E

- [ ] Extend credit reservations and settlements to simultaneous destination/browser/SIP legs and later AI costs; validate contention with existing SMS/email spending and prevent duplicate component/aggregate billing.

- [ ] Extend the common controller to one/two/three destination slots, each on a distinct contact. Keep one agent human-conversation slot across all tabs/devices.
- [ ] Atomically arbitrate near-simultaneous human answers. Isolate the winner; route others to their approved overflow path without cross-audio or duplicate bridge commands.
- [ ] Stop new dialing while the agent is occupied; resolve sibling legs safely. Include minimum ring time, uncertain AMD/timing and campaign-specific pacing/abandonment counters.
- [ ] Show line cards and independent voicemail/overflow/connected states. Never advance a queue by three just because a batch was launched.
- [ ] Add separate overflow recording and opt-out/follow-up handling; do not approve arbitrary on-the-other-line sales scripts or count recording delivery as a human-handled call.
- [ ] Measure collision rates, time-to-agent-audio, actual per-leg usage and budget reservations. Auto-reduce capacity or pause when policy or operational limits approach.

Exit: deterministic race tests always produce one human bridge, zero cross-contact audio and correct durable recovery; controlled collisions meet approved timing/pacing rules. Triple-line is not enabled merely because three REST creates succeed.

### G. Optional Retell AI overflow — XL; depends on F and AI-specific readiness

- [ ] Run the SIP integration spike with the user's existing agent/version and an approved test configuration. Choose trunking versus per-call SIP routing based on actual controller/handoff requirements.
- [ ] Implement Retell adapter, agent context allowlist, AI-slot reservations, signed/authorized webhook/tool processing, state reconciliation and spend limits.
- [ ] Finalize the user's specific Retell script last, after the rest of the dialer is reviewable. Define disclosures, conversation branches, callback capture, opt-outs and permitted tools together; no provisional role is an approved production script. Qualification/booking/send tools remain disabled until explicitly configured and authorized.
- [ ] Add AI handling / callback captured / human handoff requested / failed line states and a short summary visible to Joseph.
- [ ] Implement custom transfer/end orchestration when Dial to SIP is selected; reserve human availability before acceptance and never interrupt another live conversation.
- [ ] Test two simultaneous AI overflow sessions, capacity/API/SIP failure, opt-out, tool abuse, transcript ownership, retention and human hand-back. Include eligible fallback if AI cannot connect in time.

Exit: AI-specific consent/message policy, agent configuration and controlled telephony/handoff tests pass. AI handling is not assumed to satisfy abandoned-call safe-harbor human-representative requirements.

### H. Operational pilot and release — L; depends on applicable enabled features above

- [ ] Add feature flags per agent and per capability: voice, saved sessions, email follow-up, prerecorded delivery, multi-line, AI overflow. Default new outbound capabilities off.
- [ ] Deploy controlled pilot infrastructure and callbacks; do not enable prospecting until readiness checks and explicitly authorized tests pass.
- [ ] Monitor event lag, reconciliation backlog, pending reservations, audio/bridge failures, overflow rates, duplicate actions, outbox retries, actual spend, send failures and AI duration/capacity.
- [ ] Run the release matrix in validation-and-operations.md, including mobile real-device audio/visibility behavior and multi-device recovery.
- [ ] Document support actions, missing callback diagnosis, provider outages, key rotation, budget exhaustion, opt-out disputes and recovery from a stuck line.
- [ ] Enable Joseph-only single-line, then recordings/email, then multi-line, then optional AI after each capability's gate. A staged pilot is not completion of unshipped target features.

Exit: measured pilot demonstrates reliable operations, accurate ownership/history and reconciled spend. Rollback prevents new actions while maintaining hangup, callbacks and recovery.

### I. Cost optimization and optional Telnyx migration — M/L; depends on measured H usage

- [ ] Compare actual billable units and quality for the same traffic, including browser/SIP/conference legs, machine detection, short-call/unanswered fees, AI minutes, recordings and email credits.
- [ ] Confirm Telnyx traffic acceptance, caller-ID verification, event/AMD/playback capabilities and selected Retell SIP handoff path.
- [ ] Implement the alternative client/server adapters behind capability flags and run the same contract/race/recovery suite.
- [ ] Drain active Twilio sessions before switching provider for new sessions; retain original provider IDs/history and existing Twilio SMS routing. Roll back new sessions to Twilio if needed.

Exit: measured savings/quality justify migration; no mixed-provider session or missing historical state. Provider replacement must not change contact ownership, saved progress or email semantics.

## Completion definition and unresolved choices

Complete means all required selected-scope capabilities above are implemented, documented and verified; optional Retell is included in planning but live routing requires its own gate. Pending saved sessions, triple-line, voicemail or email cannot be called complete merely because the UI looks finished.

Discovery must settle the durable runner, initial provider transport, verified callback number, eligible audience/consent/suppression source, timezone policy, approved recordings, Retell agent/version/tools, retention, pilot volumes, and actual budgets. No fixed delivery date or per-minute quote is promised before that work. Keep this backlog updated with implemented paths, checks and remaining limitations in each implementation commit.

## Agent audio scope addition — 2026-10-18

Browser input/output selection and local device checks are implemented. Add persistent phone agent audio with Call me and authenticated Dial in modes, plus native phone-app entry on mobile; keep caller ID separate from agent audio transport. See [agent audio](./agent-audio.md) for schema/security/credit and mobile lifecycle requirements. Phone bridge and live browser audio remain pending.
