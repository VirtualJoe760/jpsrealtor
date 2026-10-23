---
title: Stripe Sandbox Setup and Credit Isolation
status: partial
last_verified: 2026-10-18
related: [README.md, credits-and-billing.md, implementation-status.md, ../../commerce/README.md]
---

# Stripe sandbox setup

## Verified local configuration

Read-only inspection of the local .env.local and the safe readiness script found Stripe test secret/publishable key prefixes, matching modes, and no configured STRIPE_WEBHOOK_SECRET. This establishes local configuration presence only, not valid credentials, Stripe account access, webhook reachability or deployment configuration. No keys were printed or changed and no Stripe request was made.

Twilio account and signature credentials are present locally. The new dialer's TWILIO_VOICE_API_KEY_SID/SECRET, TWILIO_VOICE_TWIML_APP_SID and DIALER_PUBLIC_BASE_URL were not configured under those names. Existing SMS integration is preserved. Account/caller-ID/voice permissions still need provider verification.

Run `npx tsx scripts/check-dialer-readiness.ts` from the repository to inspect effective process variables plus local .env.local without initializing providers or MongoDB. Output contains mode/configuration booleans only. Do not print env files or provider configuration objects while diagnosing setup.

## Implemented mode boundaries

- src/lib/stripe-mode.ts recognizes test/live server keys, checks configured public-key modes, and reports whether a webhook signing secret is present. Key presence is not a successful account or callback verification. Hosted Checkout does not require a browser publishable key, but conflicting configured public keys fail readiness.
- New credit-pack purchases in test mode grant only to SandboxCreditLedger in sandbox_credit_ledgers. Live purchases grant to CreditLedger in pointsledgers. Existing real outbound spend/reservation helpers continue using pointsledgers; sandbox credits cannot fund them.
- CreditBillingCustomer stores a separate owner/mode/customer mapping. Checkout does not copy unknown-mode legacy customer IDs or overwrite User.stripeCustomerId. Subscription customer/portal consolidation is still a separate audit task.
- Signed top-up events must match the configured server key mode, event mode and Checkout object mode. Quote mode metadata, when present, must also match. Refund lookup for the existing top-up refund handler selects the corresponding wallet; partial-refund/debt/recovery hardening remains pending.
- GET /api/points and the read-only dialer balance endpoint return the configured mode's wallet. The dashboard marks test credits explicitly; the inline dialer credit section was removed in favor of the existing navigation credit entry. The legacy POST /api/points real-campaign spend command rejects test/missing/unknown configurations. No simulation call consumes either wallet.
- Credit checkout returns 503 before any Stripe request if the server key/mode or webhook signing secret is missing or configured keys conflict. No credentials appear in the readiness response.

This isolation applies to new credit-pack purchases. Historical pointsledgers balances were not moved, repriced or certified as live-funded. Legacy subscription grants/admin bonuses and their test-mode behavior still require audit before live calling or auto-billing. Changing keys alone must not certify an existing balance for production use.

## Remaining setup and verification

1. Choose the intended Stripe test environment and confirm the server key is valid there. Keep credentials in local/deployment secret storage; never paste them into chat or source control.
2. Configure a test webhook endpoint for /api/webhooks/stripe. For local development, use Stripe CLI forwarding to the actual Next.js server port, not the standalone dialer mockup preview. Save the matching CLI/endpoint signing secret locally as STRIPE_WEBHOOK_SECRET; a Dashboard endpoint secret and a CLI listener secret are different resources.
3. Deliver checkout.session.completed and checkout.session.async_payment_succeeded events for an authenticated test purchase. Test full refunds separately through charge.refunded. A generic synthetic event without this app's quote metadata is not a valid wallet purchase.
4. Verify persisted sandbox grant, replay/delayed-event behavior, checkout return-page state and unchanged production wallet. Confirm the required owner/mode and wallet unique indexes exist. These checks have not yet run against the user's Stripe/Mongo accounts.
5. Verify Twilio voice credentials, callback host, displayed caller ID, credit transaction support, usage reconciliation and budget limits before any live calling. Keep automatic top-ups and real voice off until their own readiness gates pass.

Official references: [Stripe API keys and sandbox/live resources](https://docs.stripe.com/keys), [Stripe webhook setup and local forwarding](https://docs.stripe.com/webhooks). The application never treats a test payment as real platform revenue.
