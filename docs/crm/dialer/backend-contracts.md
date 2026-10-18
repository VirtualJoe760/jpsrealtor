---
title: Dialer Backend Contracts
status: partial
last_verified: 2026-10-18
related: [README.md, build-plan.md, session-continuity.md, retell-overflow.md]
---

# Backend contracts

Most contracts below remain proposed. The first simulation persistence slice implements DialerSession and GET/POST sessions plus GET/PATCH session detail; it uses at most 250 embedded queue items for atomic versioned checkpoints. DialerAttempt, DialerAgentState and DialerAction now implement transactional simulation call commands and wrap-up. Separate queue rows, live provider commands/outbox and reconciliation remain planned before live orchestration. See simulation-controller.md for the implemented contract. MongoDB owns durable state, the server owns authorization and telephony actions, and the browser renders a reconciled view. Implement a single controller that can start with one line and extend to three; do not ship a second independent triple-line state machine.

## Existing integration points

| Absolute path | Role / constraint |
|---|---|
| F:\web-clients\joseph-sardella\jpsrealtor\src\app\agent\contacts\page.tsx | Workspace entry and frozen local launch snapshot; replace local-only session ownership with saved session APIs |
| F:\web-clients\joseph-sardella\jpsrealtor\src\app\components\crm\ContactsTab.tsx | Existing selection/tag filters and Open in dialer action |
| F:\web-clients\joseph-sardella\jpsrealtor\src\app\components\crm\ContactViewPanel.tsx | Existing normal/embedded contact editing, notes, photos, map and market activity |
| F:\web-clients\joseph-sardella\jpsrealtor\src\app\components\crm\DialerMockup.tsx | Current simulated calling UI; rename/refactor into production workspace at voice cutover; confine samples to isolated preview |
| F:\web-clients\joseph-sardella\jpsrealtor\src\app\components\crm\dialer\ | Existing contact/property components; proposed provider client adapters live here or in a dedicated hooks folder |
| F:\web-clients\joseph-sardella\jpsrealtor\src\lib\twilio.ts | SMS/provisioning only today; avoid adding a second eager voice client here |
| F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\crm\sms\webhook\route.ts | Existing signature-check example; validate new voice callbacks against the fixed configured public URL |
| F:\web-clients\joseph-sardella\jpsrealtor\src\proxy.ts | Default-deny API surface; narrowly allow signed provider callback URLs, keep user commands authenticated |
| F:\web-clients\joseph-sardella\jpsrealtor\src\models\Contact.ts | Existing ownership, phone/email arrays and legacy fields, suppression, property facts and notes |
| F:\web-clients\joseph-sardella\jpsrealtor\src\models\VoicemailScript.ts | Campaign/Drop Cowboy model; reuse only suitable metadata/helpers, not delivery state or live campaign actions |
| F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\crm\send-email\route.ts | Existing Resend/verified-sender/credit path; add contact-scoped orchestration and durable dedup around sending |
| F:\web-clients\joseph-sardella\jpsrealtor\worker\index.js | Browser notification service worker; not server job infrastructure |

## Implemented credit-mode boundary

CreditReservation and server-only hold/settlement primitives exist; live usage collection is still pending. New credit-pack payments use SandboxCreditLedger for test mode and CreditLedger for live mode, with CreditBillingCustomer mappings keyed by owner/mode. GET /api/crm/dialer/billing returns safe Stripe mode/signing-configuration presence and the corresponding wallet; voice and auto-top-up remain disabled. See credits-and-billing.md and stripe-test-setup.md for boundaries and unresolved legacy grants. No call-control or provider action is authorized by a test credit balance.

## Proposed models and indexes

Add schemas under F:\web-clients\joseph-sardella\jpsrealtor\src\models\ before any write paths. Every private record has userId, timestamps, safe response projections and ownership-scoped reads. Record provider/account IDs explicitly and do not put raw provider credentials in these public DTOs or under agentProfile.

| Model | Core fields | Required constraints/indexes |
|---|---|---|
| DialerSettings | Provider/account reference, enabled features, approved caller IDs, destination policy, line/AI capacity, budgets, message policies | Unique userId; verified caller-ID ownership; secret references only |
| DialerSession | Name/source filters, immutable provider/config snapshot, mode, status, progress summaries, active batch, version, lastActiveAt, paused/completedAt | userId+status+lastActiveAt; one active session through DialerAgentState; separate queue rows |
| DialerQueueItem | Session/contact, ordinal, selected normalized phone, status, eligibility/skip reason, draft/disposition references | Unique sessionId+ordinal; dedup sessionId+normalizedPhone; userId+sessionId+status; ownership checked at creation and before each call |
| DialerAttempt (simulation implemented; live dimensions planned) | Session/item/contact, destination/caller-ID snapshot, batch/line slot, transport/detection/routing state, human disposition, provider legs, times, errors, estimated/settled usage | userId+contactId+createdAt; unique owner+startActionId; sparse unique provider+account+legId via separate leg records if needed |
| DialerAgentState | Active session, bounded destination slot reservations, humanConversationAttemptId, AI reservations, lease/version, reconciliation marker | Unique userId; compare-and-set on version and slot occupancy; stale leases never authorize a replacement by themselves |
| DialerAction | Command type, request hash, owner/session, idempotency key, pending/unknown/completed result | Unique userId+command+idempotencyKey; same key with changed payload returns conflict |
| DialerOutboxJob | Action/attempt, provider command, dedup key, status, nextAttemptAt, lease, attempts, sanitized result | Unique command dedup key; claimable status+nextAttemptAt; never blind-retry an ambiguous call/email create |
| DialerProviderEvent | Provider/account/event identity, sanitized payload, signature verification metadata, receipt/provider time, processing state | Unique provider+account+eventId or documented stable hash; status+receivedAt; bounded retained payload |
| DialerAudioAsset | Owner, purpose, storage key, version/hash, duration/format, approval/eligibility metadata, retiredAt | Owner+purpose+status; immutable referenced versions; no deletion that breaks in-flight playback |
| DialerFollowUp | Contact/session/attempt, dueAt/timezone, task type/text, status | Reuse an existing suitable task model if found; owner+status+dueAt; idempotent creation from disposition |
| DialerEmailDraft | Session/contact/attempt, selected recipient, template/version, subject/body, invitation link/flag, draft version/status | owner+sessionId+contactId; optimistic draft saves; encrypted content if existing storage policy requires |
| DialerEmailSend | Draft snapshot, send action, provider message ID, accepted/delivered/failed times, credit settlement | Unique sendActionId; provider+messageId lookup; reconcile uncertain acceptance before retry |
| DialerSuppression | Normalized destination, channel, owner/global scope, source/consent evidence, reason/time | Reuse existing authoritative suppression storage if available; duplicate contacts cannot bypass normalized-number/email suppression |

Do not overload Campaign with dialing state merely because campaigns already exist. Define a stable compliance campaign/group identifier for pacing and reporting with verified measurement semantics. Contact notes remain separate from call-note drafts, and telephony outcome remains separate from agent disposition. Audit model/index assumptions against production Mongo before migration; no destructive data migration is implied.

## State and command semantics

Session states: ready → starting → running → pausing → paused → running, with completing/completed, failed and archived terminal/control paths. Explicit resume passes through reconciliation/readiness checks; archived/completed sessions never auto-restart.

Queue states: pending → reserved → in-flight → wrap-up → completed. Skipped, suppressed and unavailable/deleted are separate outcomes; failed/unknown attempts remain unresolved until policy determines retry eligibility. Multiple lines mean there can be several unresolved items; a single integer cursor is only a display hint.

Attempt dimensions are separate: transport (reserved/creating/unknown/ringing/answered/ended), detection (pending/human/machine/fax/unknown), handler (unassigned/human/voicemail/overflow/AI), playback state, and business disposition. Preserve raw provider state alongside normalized state. Store timestamps sufficient to reconstruct answer, greeting-end where observable, classification, bridge, playback and completion without equating them.

The start/resume command acquires the active session/version, checks owned queue items and eligibility, reserves capacity and estimated spend, persists attempts/outbox entries, and returns accepted action IDs. Provider calls happen from those durable commands. Never mark an item completed just because a call-create request returned success.

Winner assignment is an atomic claim of the single human-conversation slot. All branches act on the same attempt ID; duplicate callbacks cannot generate new bridges or audio playback. Unknown create, transfer, send or hangup responses reserve capacity and show reconciling until an authoritative provider check or operator action resolves them.

Suppression from a disposition or authorized AI tool persists before any later outbound reservation. If a multi-document transaction is unavailable, use a versioned recoverable action sequence with explicit partial-failure states and deny progression until resolved. Queue membership is frozen, but ownership, current suppression, deleted contacts and a changed phone are revalidated; a changed target requires a deliberate selection rather than silently substituting a number.

## Proposed HTTP surface

All paths below are new contracts unless explicitly noted above. Responses include Cache-Control: no-store. Session commands return action/version/state and safe projections, not raw provider credentials or unrestricted payloads. POST mutations use Idempotency-Key; version-sensitive mutations return 409 with the current safe state on conflict. GET has no provider-create, send or subscription side effects.

| Method / URL | Contract |
|---|---|
| GET/PATCH /api/crm/dialer/settings | Capabilities, verified caller IDs, mode and budget; privileged validation of policy changes |
| POST /api/crm/dialer/token | Short-lived agent/session-bound browser connection token after auth/readiness checks |
| GET/POST /api/crm/dialer/sessions | Owned recent sessions; create ordered queue from IDs or owned filter selection, with exclusions/counts |
| GET /api/crm/dialer/sessions/[id] | Snapshot, current lines, unresolved wrap-up, saved drafts and progress |
| POST /api/crm/dialer/sessions/[id]/commands | Typed start/resume/pause/complete/archive/retry-pass/end-all commands; start/resume may create calls only after explicit action |
| GET /api/crm/dialer/sessions/[id]/items | Paginated stable queue and result history; bounded query sizes |
| POST /api/crm/dialer/sessions/[id]/next | Explicit eligible next batch after wrap-up; line capacity and session lock enforced |
| GET /api/crm/dialer/attempts/[id] | Per-leg normalized status, event times, safe error and usage details |
| POST /api/crm/dialer/attempts/[id]/commands | Typed hangup/mute-routing where server needed/drop-voicemail/override-detection/request-or-accept-handoff; each checks state/ownership/capability |
| PATCH /api/crm/dialer/attempts/[id]/disposition | Versioned notes/outcome/task/suppression save; atomic progression barrier |
| GET/POST /api/crm/dialer/audio | Owned audio library and validated upload registration; object upload uses scoped URL and finalization |
| PATCH /api/crm/dialer/audio/[id] | Approve/retire metadata; immutable asset versions, no arbitrary external URL playback |
| GET/PUT /api/crm/dialer/sessions/[id]/drafts/[contactId] | Restore/autosave contact-specific email drafts with optimistic version |
| POST /api/crm/dialer/drafts/[id]/send | Explicit contact-authorized send/send-and-next, suppression and credit checks; durable send ID |
| POST /api/crm/dialer/attempts/[id]/appointments | Owned contact/agent booking, availability revalidation, durable booking ID and separate confirmation state |
| GET /api/crm/dialer/appointments/availability | Private availability from authenticated agent calendar settings; no arbitrary agentId |
| GET /api/crm/dialer/history | Paginated owned calls, dispositions, playback, AI and email outcomes; filters by contact/session/date |
| POST /api/crm/dialer/webhooks/twilio/voice | Signed provider connection instructions; bind identity/account/attempt to approved destination and caller ID |
| POST /api/crm/dialer/webhooks/twilio/status | Signed voice/detection/playback events; exact schema/routes finalized during spike |
| POST /api/crm/dialer/webhooks/retell | Verified AI lifecycle/analysis events; no unscoped CRM mutation |
| POST /api/crm/dialer/retell/tools/[tool] | Authenticated, attempt-bound callback/opt-out/handoff tools with allowlisted arguments |

Reuse existing owned property/comps endpoints and normal contact editing routes. Reuse existing email delivery/webhook integration where supported, but the dialer send/action contract must provide missing ownership and idempotency. Newsletter invite uses the agent's public signup URL; it is not an agent-side shortcut to POST /api/newsletter/subscribe.

## Runtime and provider interfaces

Proposed server code: F:\web-clients\joseph-sardella\jpsrealtor\src\lib\dialer\ (orchestration, policy, projections, outbox/inbox, reconciliation, costs, providers). User routes: F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\crm\dialer\. Proposed runner path/deployment is an A-milestone ADR, not an assumed existing worker.

Provider server adapter: capability discovery, verified identity check, agent token, create destination leg, bind human audio, start/stop audio asset, fetch/reconcile legs, terminate all tracked legs and usage lookup. Client adapter: connect/readiness, make/join authorized session connection, mute, DTMF, disconnect and normalized events. Retell adapter: capacity reservation, register/routable connection, context allowlist, event mapping and custom handoff/end. Mail remains a separate channel rather than hidden in the voice provider.

Use short bounded durable jobs with leases, retry/backoff and a dead-letter/operator path. Fast webhooks verify, persist and acknowledge; process slow work durably. after() may enqueue bounded work but cannot be the only recovery mechanism. Browser polling of persisted versioned state is sufficient initially; no persistent Vercel websocket or browser service-worker scheduler is required.

Planned server-only voice config: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN for signature validation, TWILIO_VOICE_API_KEY_SID/SECRET, TWILIO_VOICE_TWIML_APP_SID, DIALER_PUBLIC_BASE_URL. Finalize naming against deployment conventions; Retell key/agent version and runner credentials are likewise server-only. Authenticate canonical callback hosts and keep account/token scopes narrow. Rotate/configure through local/deployment secret storage, never chat, source code or a public profile response.

Implemented slice: [provider job foundation](./provider-jobs.md) supplies a schema, fenced Mongo leases and a bounded runner. Transactional production enqueue, scheduling and full reconciliation remain pending. The [Twilio adapter and signed status inbox](./twilio-voice-adapter.md) now provide gated call plans, account-bound lookup and durable status ingress; other provider contracts remain planned.
