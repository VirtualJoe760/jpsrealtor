---
title: Durable Provider Job Foundation
status: partial
last_verified: 2026-10-18
related: [README.md, backend-contracts.md, implementation-status.md]
---

# Durable provider jobs

The provider job schema, Mongo lease store and bounded runner are implemented as internal primitives. They are not scheduled, exposed through HTTP, enqueued by the simulation controller or connected to live dispatch. A separate gated Twilio adapter and signed status inbox are now implemented; see [Twilio voice](./twilio-voice-adapter.md). No live dialing is enabled.

## Recovery behavior

A queued job is atomically leased with a random fencing token. Eligibility/configuration preparation happens before dispatch intent. If preparation fails, no external request occurs and the lease can expire. Dispatch requires the matching token and an unexpired lease.

The worker persists dispatching before invoking the prepared provider request. An exception, missing provider identity or expired dispatching lease produces unknown state. Unknown jobs are never claimed again automatically: a timeout may have followed a successful call. The original fenced worker can still persist a late successful response. Other workers cannot finalize that claim. Succeeded jobs are never replayed.

The model records owner, session, attempt, command, deduplication key/hash, provider account and call identity; it deliberately stores no phone payload or credential. There is no TTL. The unique owner/key index is declared, but deployment/index verification is still required before adding a producer.

## Files

- `F:\web-clients\joseph-sardella\jpsrealtor\src\models\DialerProviderJob.ts`
- `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\dialer\provider-job-store.ts`
- `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\dialer\provider-job-runner.ts`
- `F:\web-clients\joseph-sardella\jpsrealtor\scripts\tests\dialer-provider-jobs.test.cjs`

## Remaining activation work

Implement a transactional producer binding owned live attempts, credit reservations and deduplication checks; verify cached schemas and deployed indexes. The lazy Twilio adapter and signed status inbox are implemented separately. Add the signed voice instruction handler, ordered attempt projection, unknown-request reconciliation and usage settlement. Select a durable hosting/runtime with bounded polling, shutdown handling, monitoring and operator recovery. Add retry/backoff and terminal failure policy for preparation failures before scheduling. The current primitive can repeatedly defer an unready job; no production runner should be enabled in this state.

Offline tests execute the real runner/store with a fake Mongo model and fake provider. They cover normal completion, preparation failure, lease expiry, stale fencing tokens, lost responses, crash after intent and late success. They do not prove Mongo atomicity, deployed indexes or provider behavior. Existing simulation attempts remain simulation-only; this job schema does not make them eligible for real calls.
