---
title: Commerce (Stripe + Credits + Transactions)
status: current
last_verified: 2026-10-28
related: [./stripe-billing.md, ./free-tier-gating.md, ../agent-onboarding/README.md, ../admin/README.md, ../multi-tenant/README.md]
supersedes: docs/archive/STRIPE_BILLING_SYSTEM.md
---

# Commerce

## TL;DR

Two live systems run through Stripe:
(1) **`AgentSubscription`** — monthly recurring tier gating features and seeding
marketing credits. Since 2026-10-28 the only paid plan for sale is **Basic,
$125/month** (internal tier `beginner`); Experienced $500 / Top Agent $1000 stay
defined for old records but cannot be bought (see "One plan for sale" below);
(2) **`CreditLedger`** — in-app credit balance (1 credit = $0.10 of platform
spend value) used to pay for ads, direct mail, voicemail drops, SMS and email,
with markup baked in at purchase time (25% / 20% / 15% by tier).
A third model, **`Transaction`** (closed-deal commission maths), is schema-only —
see [transactions-and-partnerships.md](./transactions-and-partnerships.md).
Admin users bypass billing entirely: free Top Agent tier with 0% markup on
top-ups. `PointsLedger` is a deprecated re-export shim over `CreditLedger` —
new code MUST import from `@/models/CreditLedger` and `@/config/credits`.

## Files

### Planned dialer billing and verification gap

The [dialer credits plan](../crm/dialer/credits-and-billing.md) adds purchased credit packs, voice/AI metering, shared-wallet reservations and optional automatic top-ups. The user reports that current credits are inactive or broken; existing ledger, checkout and webhook code does not establish production readiness. Audit and reconcile the full payment-to-grant-to-spend path before enabling paid voice. The ledger/helpers now include reserved funds and voice usage types, with server-only transactional reservation/settlement primitives. Manual top-up quotes use unified pricing and paid-only, PaymentIntent-keyed fulfillment for completed/delayed-success events. Auto-top-up orchestration and live voice usage collection remain planned. Legacy save writers now use optimistic concurrency; conflicts require reconciliation, not blind provider retries. The new top-up route preserves purchase-time markup through one validated quote function; old unversioned Checkout grants remain honored. New packs use whole-cent pricing, accept optional request idempotency keys and do not accept promotion codes. Customer Stripe payments and platform Twilio funding remain separate operational flows. New test-mode packs now use a separate sandbox_credit_ledgers collection and CreditBillingCustomer mappings keyed by owner/mode. Checkout fails readiness without matching keys and a webhook signing secret; signed top-up event modes are checked. GET /api/points follows the configured wallet mode and labels test balances; the legacy real-spend command is blocked in test mode. See [Stripe sandbox setup](../crm/dialer/stripe-test-setup.md). Historical balances, subscription grants and admin bonuses still require a mode audit before live activation.

This update verifies only the dialer integration findings above against the reviewed code; older subscription pricing and availability descriptions below were not revalidated as part of this planning change.

| File | Purpose |
|---|---|
| `F:\web-clients\joseph-sardella\jpsrealtor\src\models\AgentSubscription.ts` | Subscription lifecycle: tier, status, period dates, Stripe IDs, features, invoices, payment failures, addons, discounts, referrals. Pre-save hook auto-sets `features` block from `tier`. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\models\CreditLedger.ts` | Credit balance + transactions[]. Collection name still `pointsledgers` (no data migration). Methods: `creditPoints()`, `debitPoints()`. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\models\PointsLedger.ts` | **DEPRECATED** back-compat shim — re-exports `CreditLedger` + legacy `POINTS_TIERS` shape derived from `CREDIT_TIERS`. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\models\Transaction.ts` | Closed-deal commission record. **Schema only — no importers.** |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\models\Partnership.ts` | Agent ↔ service-partner co-marketing with RESPA JMA, cost-split terms, and `billingHistory`. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\config\credits.ts` | **Single source of truth for credit math.** `CREDIT_SPEND_VALUE = $0.10`, `CREDIT_TIERS`, `CUSTOM_TOPUP_MARKUP = 0.15`, conversion helpers. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\config\stripe-prices.ts` | Stripe price IDs + `TIER_DETAILS` UI catalog. `tierFromPriceId()` reverse lookup. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\stripe-subscription.ts` | Lazy Stripe SDK singleton, `createOrGetStripeCustomer()`, `createCheckoutSession()`, `createCustomerPortalSession()`, `checkFeatureAccess()`. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\stripe-identity.ts` | Stripe Identity verification session creation (KYC). **PARKED** since 2026-07-23 — unreachable. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\stripe\checkout\route.ts` | POST — agent subscription checkout. Admin fast-path bypasses Stripe. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\stripe\portal\route.ts` | POST — customer billing portal session. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\webhooks\stripe\route.ts` | POST — subscription lifecycle + top-up payment events. Signature-verified. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\webhooks\stripe-identity\route.ts` | POST — identity verification events. Signature-verified. **PARKED.** |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\points\topup\route.ts` | POST — one-time credit top-up checkout. Rate resolved from purchase amount + the **ledger's** `tier` field (not `AgentSubscription.tier`). |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\agent\verify-identity\route.ts` | POST — would start a Stripe Identity session. **PARKED** — needs phase `inquiry_approved`, which nothing sets. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\admin\credits\route.ts` | POST — admin "gift credits" (`bonus` ledger entry, no Stripe). See [../admin/README.md](../admin/README.md). |

## Subscription tiers

Tier pricing, feature limits, and credit allocation are all set by the
`pre("save")` hook on `AgentSubscription` (lines 290-400) keyed off `tier`.
`TIER_DETAILS` in `src/config/stripe-prices.ts` is the UI mirror.

| Tier | $/mo | Credits/mo | Markup | Custom domain | Photos | Videos | Custom pages | Analytics | API | Support |
|---|---:|---:|---:|---|---:|---:|---:|---|---|---|
| Free | $0 | 0 | — | no | 10 | 1 | 1 | no | no | community |
| Beginner | $125 | 1,000 | 25% | no | 50 | 3 | 5 | yes | no | email |
| Experienced | $500 | 4,167 | 20% | yes | 200 | 10 | 20 | yes | no | priority |
| Top Agent | $1,000 | 8,696 | 15% | yes | 999 | 50 | 100 | yes | yes | dedicated |

### One plan for sale: Basic (2026-10-28)

ChatRealty currently sells **one** plan: **Basic, $125/month** — the internal
`beginner` tier, renamed for display only (the tier key, existing records and
credit math are unchanged). `SELLABLE_TIERS` / `SELLABLE_INTERVALS` in
`src/config/stripe-prices.ts` drive every plan picker (`/pricing`,
`/agent/subscription`, Settings → Billing) and `/api/stripe/checkout`, which
now rejects Experienced, Top Agent and annual billing. Experienced and Top
Agent stay defined so old records still resolve. `/pricing` previously sold
Starter/Professional/Enterprise ids the checkout never accepted; it now shows
Free + Basic, monthly only.

**Live Stripe objects** (account `acct_1Q5X8KGI9m3f5P10`, "chatRealty"):

| Object | ID |
|---|---|
| Product "ChatRealty Basic" | `prod_VWjtiTAR54bh2a` |
| Price $125/month (`lookup_key: chatrealty_basic_monthly`) | `price_1UVgPHGI9m3f5P10C3sxgw4D` |
| Webhook → `https://www.chatrealty.io/api/webhooks/stripe` (7 events: checkout completed / async succeeded, subscription updated / deleted, invoice succeeded / failed, charge refunded) | `we_1UVgPHGI9m3f5P10ZtwO8a8Z` |

Production needs `STRIPE_SECRET_KEY` (live), `STRIPE_WEBHOOK_SECRET` (that
endpoint's `whsec_`), `STRIPE_PRICE_BEGINNER_MONTHLY` (the live price) and **no**
test publishable key — `stripeConfiguration()` refuses checkout when a test
publishable key sits beside a live secret. Nothing in the client uses the
publishable key. Development and preview keep the test keys. The webhook must
use the `www` host: `chatrealty.io` 308-redirects and Stripe does not follow.

No live price exists for the consumer **Pro** plan ($9.99) or the annual
prices, so those checkouts fail in live mode until one is created.

**Feature gating by tier:** only the **Free** tier is purchasable today; paid tiers are shown
"Coming soon". New agents are forced through the setup wizard (with a plan step) on first run, and
free-tier agents get a reduced nav + Settings with Email / Messages / Campaigns hidden **and** blocked
server-side. The one rule is `hidePaid = isFreeTier && !isAdmin` (admins + paid agents see everything).
Full gating map, onboarding-wizard flow, and the server-side 403 route guards live in
[`free-tier-gating.md`](./free-tier-gating.md). Tier resolver: `src/lib/subscription-helpers.ts`.

**Admin bypass:** users with `roles: ["admin"]` skip Stripe entirely. The
checkout route upserts an `AgentSubscription` with `tier: "topagent"`,
`monthlyPrice: 0`, and a 10-year `currentPeriodEnd`, then credits the full
8,696 Top Agent monthly credits straight to the ledger. Top-ups for admins
use 0% markup ($1 = $1 spend value). See `src/app/api/stripe/checkout/route.ts:75-130`
and `src/app/api/points/topup/route.ts:61-63`.

## AgentSubscription model

One doc per agent. Key fields beyond the tier/status basics:

- **Stripe IDs:** `stripeCustomerId` (indexed), `stripeSubscriptionId` (unique sparse), `stripePriceId`, `stripePaymentMethodId`.
- **Period tracking:** `currentPeriodStart`, `currentPeriodEnd` (indexed for cron expiry checks), `cancelAt`, `cancelledAt`, `pausedAt`, `isTrialing`, `trialStartDate/EndDate`.
- **Features block:** fully-denormalized capability flags (`customDomain`, `maxPhotos`, `blogPosts`, `analytics`, `apiAccess`, `supportLevel`, etc.). Reset on every tier change by the pre-save hook — don't manually mutate `features` without also setting `tier`.
- **`usage` block:** rolling counters used for displaying limits in the UI and for upsell prompts.
- **`invoices[]`:** mirror of Stripe invoice history (`invoiceId`, `amount`, `status`, `paidAt`, `dueDate`, `invoiceUrl`). Appended by the `invoice.payment_succeeded` webhook handler.
- **`paymentFailures[]`:** retry tracking for `invoice.payment_failed`.
- **`addons[]`:** future feature — per-month additional charges layered on top of base tier.
- **`discount`:** Stripe coupon mirror (`percentage`, `amountOff`, `duration`, `durationInMonths`).
- **`referredBy` + `referralCredits`:** agent-to-agent referral attribution.

Static helper: `AgentSubscription.findExpiring(daysUntilExpiration)` returns
active subs renewing within the window.
Instance helper: `sub.cancel(immediately, reason, feedback)`.

## CreditLedger (formerly PointsLedger)

The credit system uses a **universal spend value** (1 credit = $0.10) and bakes
markup in at PURCHASE time — never at spend time. This means a credit is always
worth the same when spent on a campaign; tiers just buy them at different rates.

| Tier | Cost per credit | Spend value per credit | Markup |
|---|---:|---:|---:|
| Beginner | $0.125 | $0.10 | 25% |
| Experienced | $0.120 | $0.10 | 20% |
| Top Agent | $0.115 | $0.10 | 15% |
| Custom top-up >$999 | $0.115 | $0.10 | 15% |

Per-piece costs (rounded UP from actual platform cost in `src/config/credits.ts`):
postcard 4×6 = 7 credits, 6×9 = 8, 6×11 = 10, letter = 10, notecard = 17,
radius lookup = 1/record, data append = 2/record, voicemail drop = 1/contact.
Use `dollarsToCredits()` for ad budget conversions.

**Transaction types** (`CreditTransactionType`):
`subscription_credit`, `topup_purchase`, `campaign_spend`, `refund`, `bonus`,
`partner_split_credit`, `partner_split_debit`, `messaging_setup`,
`email_setup`, `sms_send`, `email_send`, `adjustment`.

**Channels** (`CampaignChannel`): `google_ads`, `meta_ads`, `youtube_ads`,
`direct_mail`, `voicemail_drop`, `sms`, `email`.

Storage gotcha: Mongoose collection name is **still `pointsledgers`** — the
model was renamed but the collection name was kept to avoid a data migration.
See `CreditLedger.ts:152`.

## Transactions, partnerships, Stripe Identity

Moved to [transactions-and-partnerships.md](./transactions-and-partnerships.md).
In short: `Transaction` (commission maths) is schema-only — nothing imports it;
`Partnership` is the live agent ↔ service-partner cost-share record (RESPA JMA);
Stripe Identity is **parked** since 2026-07-23.

## Stripe Checkout + Portal

**Customer creation** (`createOrGetStripeCustomer`): returns the
`stripeCustomerId` already on the `AgentSubscription` doc, or creates a new
Stripe customer with `metadata.userId` and returns the new ID.

**Subscription checkout** (`POST /api/stripe/checkout`):
1. Authz: must have `roles: ["realEstateAgent"]`.
2. 409 if an active/trialing subscription already exists.
3. Admin bypass writes a free Top Agent sub directly (see above).
4. Otherwise: ensure customer → `createCheckoutSession({ tier, billingInterval, successUrl, cancelUrl })` with `mode: "subscription"`, line item from `STRIPE_PRICES[tier][interval]`, `allow_promotion_codes: true`, and `subscription_data.metadata` carrying `userId / tier / billingInterval`.
5. Returns `{ sessionId, url }`.

**Customer portal** (`POST /api/stripe/portal`): loads `stripeCustomerId` from
the agent's subscription doc, creates a `billingPortal.sessions` with the
provided `returnUrl`. Self-service plan changes, payment method updates, and
cancellations all flow through here (Stripe-hosted) — webhook events then
sync state back to `AgentSubscription`.

**Top-up checkout** (`POST /api/points/topup`): one-time payment mode. Tier
rate resolution layers (purchase amount THEN the subscriber tier, which the
route reads from the credit ledger's `tier` field, `src/app/api/points/topup/route.ts:53-84`):

| Purchase amount | Non-subscriber | Beginner | Experienced | Top Agent | Admin |
|---|---|---|---|---|---|
| $10 – $124 | 35% margin | tier rate | tier rate | tier rate | 0% |
| $125 – $499 | Beginner | Beginner | tier rate | tier rate | 0% |
| $500 – $999 | Experienced | Experienced | Experienced | tier rate | 0% |
| $1,000+ | Top Agent | Top Agent | Top Agent | Top Agent | 0% |

Stripe metadata carries `type: "points_topup"`, `points`, `tier`, `amount` so
the webhook can credit the ledger on `checkout.session.completed`.

## Gotchas

- **`PointsLedger` is deprecated.** New code MUST import from
  `@/models/CreditLedger` and `@/config/credits`. The shim re-exports the model
  unchanged but routes legacy `POINTS_TIERS` math through the credits config.
  Twelve routes still import the shim (checked 2026-10-17): `api/admin/{credits,stats,subscriptions}`,
  `api/campaigns/[id]/{launch-ads,send,send-mail,send-simple}`,
  `api/dropcowboy/campaign`, `api/points`, `api/points/topup`,
  `api/stripe/{checkout,subscription}`, `api/webhooks/stripe`. They keep
  working; swap them when you touch them.
- **Mongoose collection name mismatch.** `CreditLedger` model writes to the
  `pointsledgers` collection (`CreditLedger.ts:152`). If you query directly via
  the driver, use the old collection name.
- **Webhook signature verification is real** — both `/api/webhooks/stripe` and
  `/api/webhooks/stripe-identity` call `stripe.webhooks.constructEvent(body,
  sig, secret)` and return 400 on failure. They do NOT use Turnstile (Turnstile
  is for the public auth/lead forms, not server-to-server webhooks).
- **Caching (fixed 2026-07-25).** `vercel.json` now stamps every `/api/*`
  response `no-store, max-age=0`, and the page catch-all
  (`/((?!api/|_next/).*)`) is `max-age=0, must-revalidate`, so the webhooks
  and billing routes are no longer exposed to the old year-long `immutable`
  catch-all.
- **Admin tier display.** When rendering "current plan" in dashboards, check
  `user.roles?.includes("admin")` BEFORE reading `subscription.tier` — admins
  always show as Top Agent at $0 with 10-year period, and top-up math uses
  `adSpendRate: 1.0`. Don't display "saved $X by being admin" or markup
  delta UI to admin users (`/api/points/topup/route.ts:61-63`).
- **Pre-save hook overwrites `features`.** Any time you set `subscription.tier`,
  the entire `features` block is reset to the tier defaults (`AgentSubscription.ts:290-400`).
  Tier-and-features changes need to land tier first, then features overrides.
- **Annual pricing isn't wired.** `STRIPE_PRICES[tier].annual` is still
  `price_PLACEHOLDER_*_annual`. Until those products exist in Stripe, the
  `billingInterval: "annual"` path will 500 at checkout creation.

## Reference implementation

For the canonical Stripe checkout flow (auth → tier validation → admin fast-path
→ customer create-or-get → checkout session create → metadata for webhook
routing), see `src/app/api/stripe/checkout/route.ts`. It's the template for
any new Stripe integration in this repo.

## Related

- `./stripe-billing.md` — webhook events, idempotency, env vars, go-live runbook.
- `./free-tier-gating.md` — free-tier feature gating, forced onboarding wizard, and server-side 403 guards.
- `../agent-onboarding/README.md` — agent application phases (and why Stripe Identity is parked).
- `../admin/README.md` — admin Subscriptions page and credit gifting.
- `../multi-tenant/README.md` — domain ownership vs. session user, relevant when scoping subscription-related UI.
- `../crm/README.md` — Partnership integrations, contact campaign history.
- (planned) `commerce/campaigns.md` — Google/Meta/Thanks.io/Drop Cowboy campaign mechanics and credit debit flow.

## Migration log

Legacy commerce docs, audited 2026-05-21 and re-checked 2026-10-17. All
four now live in `docs/archive/` and stay there:

| Archived doc | Why it stays archived |
|---|---|
| `STRIPE_BILLING_SYSTEM.md` | Superseded by this README + `stripe-billing.md`; old `$0.125`/credit math (750/3,200/6,800 credits) |
| `PRICING_STRATEGY.md` | Jan 2026 planning doc ("Inside vs Outside Agent", eXp rev-share) — never shipped |
| `chatrealty/SUBSCRIPTION_UI.md` | Old tier names (starter/professional/enterprise); components still exist but `PricingCard`'s local `TIERS` is stale (see free-tier-gating.md) |
| `multi-tenant/index.md` (pricing section) | `free/pro/ultimate/investor` enum that never reached production |
