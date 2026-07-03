---
title: Stripe Billing & Credits
status: current
last_verified: 2026-07-02
supersedes: docs/archive/STRIPE_BILLING_SYSTEM.md
related:
  - ../campaigns/co-marketing-adspend.md
  - ./README.md
---

# Stripe Billing & Credits

## TL;DR

ChatRealty bills via Stripe (test mode today) for **subscriptions** (agent tiers +
general-user Pro) and **one-time credit top-ups**, plus **Stripe Identity** for
agent KYC. All ad/mail/voicemail/co-marketing spend runs on the **internal credit
ledger** — Stripe is only touched to *buy* credits or subscribe. Checkout is
server-created → redirect to Stripe-hosted pages (no card data touches the app;
PCI-safe). **No Stripe Connect/payouts** — co-marketing settles via credits.

## Plan availability & free-tier gating (2026-07)

**Only the Free plan is purchasable today.** The paid tiers (Beginner /
Experienced / Top Agent) are built end-to-end — model, Stripe checkout,
webhooks, credit grants — but are shown **"Coming soon" and disabled** in the
UI. New agents pick a plan inside the forced first-run setup wizard (Free only)
and manage billing under **Settings → Billing**; the standalone
`/agent/subscription` page is retired and 302-redirects to
`/agent/settings?section=billing`.

Free-tier agents get a reduced portal (Dashboard, Contacts, CMS, Settings) with
Email / Messages / Campaigns hidden, and **every credit-spending / outbound
route returns 403** for a free, non-admin agent (server-side enforcement, not
just UI hiding). Admins and any paid-tier agent are exempt. The whole rule is
`block iff (isFreeTier && !isAdmin)`.

**Tier source of truth is `AgentSubscription.tier` — or no record at all →
"free"** — resolved via `src/lib/subscription-helpers.ts`
(`getAgentTier` / `isFreeTier` / `hasPaidTier`), keyed by `agentId`. This is the
per-agent tier, distinct from the legacy per-user `User.subscriptionTier`. The
JWT carries `agentTier` + `isAdmin` so client gating avoids a DB call.

> Full gating map, the forced-onboarding flow, the complete server-side 403
> route list, and the **multi-tenant interaction (public-site "Coming Soon"
> gate vs. the feature-tier gate)**:
> **[free-tier-gating.md](./free-tier-gating.md)**.

## Canonical credit model (single source of truth)

`src/config/credits.ts` — **1 credit = $0.10 spend value**; markup is applied at
**purchase**, not spend.

| Tier | Price/mo | Credits | Cost/credit | Markup |
|---|---|---|---|---|
| Beginner | $125 | 1,000 | $0.125 | 25% |
| Experienced | $500 | 4,167 | $0.120 | 20% |
| Top Agent | $1,000 | 8,696 | $0.115 | 15% |

- `CreditLedger` (`src/models/CreditLedger.ts`) is canonical; **`PointsLedger.ts`
  is a back-compat shim** that re-derives `POINTS_TIERS` from `CREDIT_TIERS`.
- `creditsForPurchase(dollars, tier)` and `purchasePriceForCredits(credits, tier)`
  are the inverse helpers used by top-ups **and** co-marketing funding.

## Stripe surfaces

| Surface | Route | Notes |
|---|---|---|
| Agent subscription checkout | `POST /api/stripe/checkout` | tiers; admin gets free Top Agent |
| Agent subscription status | `GET /api/stripe/subscription` | syncs from Stripe if DB stale |
| Billing portal | `POST /api/stripe/portal` | self-service |
| General-user Pro | `GET/POST/DELETE /api/user/subscription` | $9.99/mo |
| Credit top-up | `POST /api/points/topup` | dynamic amount, mode=`payment` |
| Identity (KYC) | `src/lib/stripe-identity.ts` + `/api/webhooks/stripe-identity` | separate secret |
| Admin comping | `POST /api/admin/credits` | internal ledger only (no Stripe) |
| Account deletion | `/api/auth/delete-account` | cancels the Stripe subscription |

Client checkout is initiated from `pricing/PricingClient.tsx`,
`agent/settings/.../BillingStep.tsx`, `dashboard/subscription/page.tsx` — each
POSTs then `window.location = url`. (The standalone `agent/subscription` page is
retired — `src/proxy.ts` redirects it to Settings → Billing. Paid checkout is
dormant while only Free is purchasable, but the plumbing stays intact.)

## Webhook — `POST /api/webhooks/stripe`

Signing secret: `STRIPE_WEBHOOK_SECRET`. Signature verified via
`constructEvent(rawBody, sig, secret)` on the **raw** `request.text()` body. ✓

| Event | Action |
|---|---|
| `checkout.session.completed` (subscription) | upsert `AgentSubscription`, sync `User`, credit monthly points |
| `checkout.session.completed` (points_topup) | credit purchased points |
| `customer.subscription.updated` | sync tier/status/period/cancel |
| `customer.subscription.deleted` | downgrade to free |
| `invoice.payment_succeeded` | log invoice; credit renewal points (>25-day guard) |
| `invoice.payment_failed` | mark `past_due` |
| **`charge.refunded`** | **reverse credits granted for a refunded top-up** (full refunds; partials logged for manual review) |

**Idempotency:** every event is claimed in `ProcessedStripeEvent` (unique
`eventId`, 30-day TTL) before processing; duplicates/retries short-circuit. On a
processing error the claim is **released** and the handler returns **5xx** so
Stripe retries (a transient failure must never silently drop a paid event).

## Gotchas

- **The `$0.125` trap (FIXED).** The top-up route + domain pricing hard-coded
  `$0.125`/credit (the *old* model), under-granting ~20% and desyncing from
  subscriptions + co-marketing. Now use `CREDIT_SPEND_VALUE`/`dollarsToCredits`.
  If you compute credits anywhere, use `config/credits.ts` helpers — never a
  literal.
- **`STRIPE_WEBHOOK_SECRET` is required** and was MISSING from `.env.local` — the
  subscription webhook throws without it (no credits granted). Confirm it's set
  in every environment.
- **Test mode.** `STRIPE_SECRET_KEY` is `sk_test_*`. Nothing charges real money
  until the go-live runbook below is done.
- **Price IDs are env-overridable** (`STRIPE_PRICE_*`) with test fallbacks — going
  live is an env change, not a code edit.

## Recent fixes (2026-06-11)

1. Top-up credit math → canonical `CREDIT_SPEND_VALUE` (was `$0.125`); unit-tested
   to match `creditsForPurchase` + co-marketing across all tiers.
2. Webhook **idempotency** (`ProcessedStripeEvent`) — no more double-credits on retry.
3. Webhook now returns **5xx on processing failure** (was 200) so Stripe retries.
4. **`charge.refunded`** handler reverses top-up credits.
5. Domain pricing uses `dollarsToCredits` (was `$0.125`).
6. Price IDs env-overridable for clean go-live.

## GO-LIVE RUNBOOK (move out of test mode)

> Do this only AFTER verifying the fixes above in test mode. The key swap is a
> **financial-credential** step — perform it yourself in Vercel/Stripe.

1. **Stripe Dashboard → toggle to Live mode.** Re-create the products/prices live:
   Beginner/Experienced/Top Agent monthly, Pro, (optional) the annual prices.
   Copy each **live price ID**.
2. **Business/identity:** ensure the Stripe account is fully activated (bank,
   business details) and Identity is enabled in live.
3. **Register the live webhook:** Developers → Webhooks → Add endpoint →
   `https://www.jpsrealtor.com/api/webhooks/stripe` with events
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_succeeded`,
   `invoice.payment_failed`, **`charge.refunded`**. Copy its **live signing secret**.
   Repeat for `/api/webhooks/stripe-identity` (identity events).
4. **Set Vercel (Production) env vars** — live values:
   `STRIPE_SECRET_KEY=sk_live_…`, `STRIPE_PUBLISHABLE_KEY=pk_live_…`,
   `STRIPE_WEBHOOK_SECRET=whsec_…` (from step 3),
   `STRIPE_IDENTITY_WEBHOOK_SECRET=whsec_…`,
   `STRIPE_PRICE_BEGINNER_MONTHLY`, `STRIPE_PRICE_EXPERIENCED_MONTHLY`,
   `STRIPE_PRICE_TOPAGENT_MONTHLY`, `USER_PRO_STRIPE_PRICE_ID`
   (+ the `_ANNUAL` ones if annual is offered).
5. **Redeploy.** Smoke-test one real low-value transaction end-to-end: subscribe →
   credits land; top-up → credits land; refund it → credits reverse; check the
   webhook log shows the `ProcessedStripeEvent` dedupe.
6. **Do NOT enable annual billing** in the UI until live annual price IDs exist
   (placeholders will error at checkout).

## Remaining gaps (non-blocking)

- Partial refunds are logged, not auto-prorated.
- No rate-limiting on `/api/stripe/*` checkout/portal routes.
- Stripe client is re-instantiated per route (works; could share one `getStripe()`).
- `apiVersion: "2025-12-15.clover"` is pinned in each route — confirm it's intended.

## Env vars

| Var | Required | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | yes | `sk_test_`/`sk_live_` — sole mode signal |
| `STRIPE_WEBHOOK_SECRET` | yes | subscription webhook; **was missing locally** |
| `STRIPE_IDENTITY_WEBHOOK_SECRET` | identity | identity webhook |
| `STRIPE_PUBLISHABLE_KEY` | optional | unused (server-redirect checkout) |
| `STRIPE_PRICE_*` | go-live | override test price IDs with live ones |
| `USER_PRO_STRIPE_PRICE_ID` | go-live | Pro price override |
| `NEXT_PUBLIC_BASE_URL` / `NEXTAUTH_URL` | yes | checkout redirect base |
