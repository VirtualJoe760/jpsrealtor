---
title: Twilio Voice Adapter and Status Inbox
status: partial
last_verified: 2026-10-18
related: [README.md, provider-jobs.md, backend-contracts.md, implementation-status.md]
---

# Twilio voice adapter and status inbox

The server now has a separate lazy Twilio voice adapter and a signed status endpoint. Live call creation remains hard-disabled in twilioVoiceConfiguration even if DIALER_TWILIO_DISPATCH_ENABLED is true. No simulation controller, UI or scheduled worker invokes the adapter. The existing SMS integration is unchanged.

## Adapter boundary

`F:\web-clients\joseph-sardella\jpsrealtor\src\lib\dialer\twilio-voice.ts` builds bounded PSTN call plans with the configured callback origin, POST callbacks, four progress events, a ringing timeout, a maximum call duration and recording disabled. It accepts no arbitrary TwiML or callback URL. SIP/client destinations are outside this first plan type. Call options are a plan, not authorization: the future producer must prove owned eligible contact, provider-verified caller ID, agent audio readiness, policy and reserved funding before enabling dispatch.

The REST client is created only when needed, using TWILIO_VOICE_API_KEY_SID/SECRET and TWILIO_ACCOUNT_SID, with SDK retries disabled and a 10-second request timeout. fetchCall checks the returned account and call identity and exposes bounded status/duration/price fields. Provider prices are reconciliation evidence, not immediate wallet charges. createCall remains blocked before client initialization; the missing signed voice/TwiML handler is intentionally still session-gated.

## Signed status endpoint

POST /api/crm/dialer/webhooks/twilio/status?jobId=<job-id> is the sole new exact self-authenticating path in src/proxy.ts. Other dialer routes retain session authentication. Configure DIALER_PUBLIC_BASE_URL to one HTTPS origin with no credentials, path, query or fragment, on a platform-served host rather than a tenant deployment that rewrites its API surface.

The handler bounds streamed input at 16 KiB, requires a form body, and verifies X-Twilio-Signature using TWILIO_AUTH_TOKEN against the configured canonical URL. It ignores forwarded host headers, rejects duplicate form keys, validates account/call/status/sequence/duration and verifies before any database access. Signature validation does not depend on an API key secret. Configuration absence returns 503; invalid signed input returns 403; media/size errors return 415/413. Database/index/correlation failure returns 503 so delivery is not acknowledged. Responses are empty with no-store; no raw callback bodies, phone data or credentials are logged.

`F:\web-clients\joseph-sardella\jpsrealtor\src\lib\dialer\twilio-status-inbox.ts` persists normalized evidence in DialerProviderEvent, with a required nonpartial unique job/call/sequence index. Its transaction requires an already-dispatched Twilio create job bound to the configured providerAccountId, binds the call ID if unknown, and marks the create command succeeded. This means the provider created the call, not that a person answered or the conversation ended. Exact replays succeed without another event; changed payloads or a different call identity fail. The worker's late REST result cannot replace a callback-bound call identity.

Out-of-order callbacks are retained as evidence; this inbox does not project attempt state, advance a queue, release the agent slot, release credit holds or settle usage. It stores neither raw requests nor contact phone numbers. Events have no TTL.

## Configuration and remaining gates

The safe readiness script uses the same config parser and reports presence/format booleans only. No credentials were changed. Remaining work: funded transactional live producer, caller-ID verification, browser audio/token and signed voice instructions, ordered status projection, provider reconciliation/usage settlement, worker hosting/backoff/operator tooling and controlled integration tests. A dispatch flag alone cannot enable calls in this revision.

Offline validation uses the installed Twilio SDK's real signature functions, a fake REST client and simulated transactions. Tests cover lazy/blocked dispatch, bounded plans, identity checks, invalid signatures/hosts/accounts, duplicate/oversized fields, event replay/conflict/rollback, HTTP acknowledgment rules and exact middleware gating. These checks do not prove live Mongo transactions/index deployment, Twilio delivery or audio quality.

Twilio protocol reference: [Call resource status callbacks](https://www.twilio.com/docs/voice/api/call-resource). Callback status initiated is explicitly supported even though the installed REST SDK CallStatus union omits it. Restart existing Mongoose processes to load the added required job providerAccountId schema field; existing jobs lacking account binding must be reconciled rather than inferred.
