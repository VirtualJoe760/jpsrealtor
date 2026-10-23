---
title: Dialer Credits and Automatic Billing
status: partial
last_verified: 2026-10-18
related: [README.md, build-plan.md, backend-contracts.md, ../../commerce/README.md]
---

# Credits and automatic billing

## Product decision and current evidence

Fund dialer use through the existing platform credit wallet. Users purchase credit packs (the user's proposed “tickets”) and can explicitly enable automatic top-ups. Display estimated calling minutes as a planning aid; credits are the accounting authority because line count, destinations, AMD, bridge/SIP services and Retell usage can have different costs.

Code review found CreditLedger, atomic conditional debits, unified credit helpers, fractional SMS/email prices, Stripe top-up checkout and signed payment webhooks. The initial billing implementation now adds voice_usage ledger entries, reservedCredits, transactional reservation/release/settlement primitives and a read-only dialer balance endpoint. Live voice quotes, automatic reservation extensions, provider usage collection and auto-top-up orchestration remain pending. The user's report that credits are inactive/broken requires an end-to-end audit; source code presence is not evidence of working production billing. Do not enable paid calling until that audit passes.

Existing policy in src/config/credits.ts defines one credit as $0.10 platform spend value with markup at purchase. Preserve it unless a separately reviewed pricing migration changes it; never silently apply another markup when spending. The top-up route now imports CreditLedger directly and uses credit-topup-quote.ts to reconcile the previously inconsistent small-purchase and $1,000+ rates with purchase-time markup. Existing legacy checkout grants remain honored; new versioned quotes are checked against the paid amount before fulfillment. The generic whole-credit dollarsToCredits helper is unsuitable for rounding each short voice leg independently; define fixed-precision accounting and explicit aggregation/rounding rules.

## Funding flow

1. User chooses a server-priced pack. Show price, credits, applicable markup/tax policy and conditional minute estimates. Never trust client-provided grant amounts or payment status.
2. Stripe collects payment. A verified, durably processed successful payment grants credits exactly once, including delayed-payment success handling. Checkout return pages do not grant credits. Reconcile interrupted webhooks and missing grants.
3. Before dialing, atomically reserve enough available balance for all proposed destination/browser/SIP/AI legs and a bounded usage interval. Other channels must respect the same reservations so SMS, email and calls cannot spend the same credits.
4. Extend reservations while calls run using the durable controller and provider-side duration limits. Low balance pauses new calls; give advance warning and a defined bounded end-of-call policy if funding cannot be renewed. Do not abruptly sever calls solely because a top-up is pending.
5. Persist metered units, provider IDs and a versioned rate snapshot. Settle actual usage idempotently, release unused holds and post auditable corrections when delayed provider charges arrive. Distinguish provisional estimates from final charges; do not debit both a combined call total and its component legs.

Customer wallet funding does not automatically fund Twilio. In the planned platform-funded model, Stripe pays the platform and Twilio bills the platform account separately. Monitor provider balance/account limits and configure provider funding operationally; pause starts when provider capacity/funding is unavailable even if a customer has credits. Decide platform account versus per-agent subaccounts during discovery. An existing agent-owned Twilio account must not be double-charged by the platform without an explicit billing model.

## Optional automatic top-up

- Off by default; explicit enrollment with a saved payment method, threshold, pack amount, per-period charge cap and clear cancellation controls. Top-up is a prepaid recharge, not an unlimited postpaid subscription.
- Audit existing Stripe customer ownership across User, AgentSubscription and ledger references. Use the selected customer's authorized payment method and server-owned prices. Store consent/configuration references, never card data.
- One active top-up per wallet, durable payment-attempt records and Stripe idempotency keys. Repeated threshold checks, tabs and webhook retries must not create multiple charges or grants. Pending payment is not spendable credit.
- Handle authentication-required, decline, expiration and provider outage with visible recovery, bounded retries and notifications. Do not repeatedly charge until success or automatically resume dialing after payment; require explicit resume when the session paused.
- Enforce separate limits for automatic purchases, dialer usage and Retell usage. Ten hours/week is a sizing assumption, not permission for unlimited auto-billing. Actual dollar caps, pack denominations and threshold remain to be selected.
- Define refunds, partial refunds, disputes, spent-credit recovery and administrative adjustments before release. Use traceable compensating entries and explicit debt/freeze rules; retain history.

## Planned contracts and interface

Extend CreditLedger schemas/types and shared helpers before writes; add voice/AI usage categories and idempotent settlement references. Use dedicated durable reservation, usage, payment-attempt and rate-version records where needed, rather than growing an unbounded high-frequency embedded transaction array. Audit/migrate legacy balances and rounding without losing purchased value.

Add owner-scoped billing readiness/balance/usage endpoints, server-priced checkout and auto-top-up settings/enrollment/cancellation commands. Keep payment webhooks signed and billing commands authenticated. Bind owner, payment, reservation, attempt and provider-leg identifiers together; the browser cannot award credits or submit authoritative usage. Reuse existing billing routes where their verified semantics fit instead of introducing a second wallet.

Use existing navigation credit management for available / reserved / settled credits, purchases, call-level costs and optional Auto top-up. Do not add a duplicate inline dialer credit section; show only an actionable funding error when a future live start is blocked. Display a failed/pending purchase clearly. Keep billing settings reachable on mobile without losing the active call or contact draft. Minute estimates identify assumed mode and rates and are never sold as guaranteed triple-line or AI talk time.

## Implementation order and acceptance

Before live voice: audit wallet/checkout/webhooks/entitlements/admin bypass; reconcile credit math and customer identities; add fixed-precision holds and settlement; wire single-line usage. Before multi-line/AI: prove shared-wallet contention and per-leg/AI metering. Auto top-up follows successful manual purchase/settlement validation and stays independently feature-flagged.

Use Stripe test mode and simulated provider usage first. Verify payment replay, two events for one payment, delayed success, crash after charge/before grant, simultaneous channels, reservation expiry with a live call, unknown provider outcomes, delayed adjustments, partial refunds, insufficient funds, failed off-session payment, cap enforcement and cancellation races. Admin bypass must not imply that provider usage is free or hide actual cost. No live purchase, stored-card charge or provider recharge is authorized by this planning update.

## Implemented billing foundation — 2026-10-18

- src/lib/credit-topup-quote.ts validates $10–$10,000 whole-cent purchases, preserves existing tier/amount upgrades and admin zero-markup behavior, and grants whole credits using canonical spend value and integer percentage math. This checkout limit is not an approved dialer monthly budget. No historical balance is retroactively repriced.
- src/app/api/points/topup/route.ts authenticates by session user ID, creates server-priced Checkout sessions, includes pricing version/markup snapshots and accepts an optional owner-scoped Idempotency-Key. No client-supplied credit amount is used. New packs do not accept promotion codes. Customer creation uses a stable owner/mode key and a CreditBillingCustomer mapping; it does not overwrite the subscription customer. Existing subscription/portal references still require audit.
- src/lib/credit-topup-fulfillment.ts handles paid top-ups atomically with the grant's PaymentIntent ID as the deduplication authority. The signed Stripe webhook routes completed and async-payment-succeeded events through it before the legacy pre-processing event claim. Unpaid completion grants nothing; interrupted delivery can retry safely; a missing persisted grant returns a retryable failure. New quote snapshots must match the paid amount; old unversioned sessions retain their original server-created grant values. Other subscription/refund event handling remains legacy and needs separate hardening.
- src/models/CreditReservation.ts and src/lib/dialer/credit-reservations.ts hold funds and settle/release them with Mongo transactions. Inputs are integer millicredits (0.001 credit = $0.0001 spend value). A reservation replay cannot add a second hold, settlement replay cannot charge twice, and changed payloads conflict. Usage above the hold is rejected for reconciliation; automatic extension is not implemented. No TTL releases unknown live-call costs. Future callers must bind the owned attempt and enforce budgets before invoking these server-only primitives.
- CreditLedger adds reservedCredits and voice_usage/voice categories. Atomic debits subtract reservations from availability and increment the document version. Optimistic concurrency on legacy save() writers prevents a stale balance from overwriting holds or concurrent grants. Nonfinite and sub-millicredit operation amounts are rejected; review existing ledger precision before activation. Version conflicts must be reconciled by callers, never blindly retry a previously delivered campaign. Literal pipeline transaction values prevent strings beginning with $ from becoming Mongo expressions.
- Shared credit helpers expose availableCredits and reservedCredits; ensureBalance checks available funds. The new GET /api/crm/dialer/billing is owner-scoped/read-only/no-store and returns voiceEnabled=false and autoTopupEnabled=false. The inline dialer credit display has been removed at the user's request. Credit management remains in the existing navigation; the read-only billing endpoint and wallet safety rules are unchanged. Existing purchase buttons no longer advertise stale hardcoded credit estimates.
- Tests: node scripts/tests/dialer-credits.test.cjs covers quote bounds, unpaid and replayed payments, versioned quote mismatch, signed-webhook dispatch, owner filters, reservation conflicts, transactional rollback, settlement caps/releases, shared debit guards and literal descriptions. Transaction/pipeline execution and Stripe delivery are simulated; live replica-set concurrency, index installation and payment-account verification remain required. Existing grant-history growth, subscription invoice deduplication, refunds/disputes and legacy campaign failure recovery must be resolved before enabling live calling/auto-billing.

Reference: [Stripe Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment) documents paid-status checks, delayed payment events and repeat fulfillment. Implementation uses the locally installed Stripe SDK types. No live charges or provider purchases were performed during this milestone.

## Stripe test-mode milestone — 2026-10-18

Local configuration uses test keys; no signing secret was present in local .env.local. [Stripe sandbox setup](./stripe-test-setup.md) records safe diagnostics and remaining setup. New test credit packs are isolated in sandbox_credit_ledgers; production spend/reservation helpers still use pointsledgers. Checkout/customer idempotency includes mode, and signed top-up event/Checkout/configured-key modes must agree. Readiness exposes no credentials and blocks checkout before a provider request when matching keys/signing configuration is missing. Dashboard and dialer balances explicitly label sandbox credits. Historical grants and legacy subscriptions were not migrated or certified as live revenue.
