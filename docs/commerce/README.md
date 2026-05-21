---
title: Commerce (Stripe + Credits + Transactions)
status: current
last_verified: 2026-05-21
related: [../auth/README.md, ../multi-tenant/README.md]
supersedes: docs/STRIPE_BILLING_SYSTEM.md
---

# Commerce

## TL;DR

Three layered systems that all run through Stripe but serve different purposes:
(1) **`AgentSubscription`** — monthly recurring tier (Beginner $125 / Experienced
$500 / Top Agent $1000) gating features and seeding marketing credits;
(2) **`CreditLedger`** — in-app credit balance (1 credit = $0.10 of platform
spend value) used to pay for Google/Meta ads, direct mail, and voicemail drops,
with markup baked in at purchase time (25% / 20% / 15% by tier);
(3) **`Transaction`** — closed-deal commission breakdown with stacked fees
(swipe 15%, referral 25%, data broker 5%, handoff 5%, company split variable).
Admin users bypass billing entirely: free Top Agent tier with 0% markup on
top-ups. `PointsLedger` is a deprecated re-export shim over `CreditLedger` —
new code MUST import from `@/models/CreditLedger` and `@/config/credits`.

## Files

| File | Purpose |
|---|---|
| `F:\web-clients\joseph-sardella\jpsrealtor\src\models\AgentSubscription.ts` | Subscription lifecycle: tier, status, period dates, Stripe IDs, features, invoices, payment failures, addons, discounts, referrals. Pre-save hook auto-sets `features` block from `tier`. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\models\CreditLedger.ts` | Credit balance + transactions[]. Collection name still `pointsledgers` (no data migration). Methods: `creditPoints()`, `debitPoints()`. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\models\PointsLedger.ts` | **DEPRECATED** back-compat shim — re-exports `CreditLedger` + legacy `POINTS_TIERS` shape derived from `CREDIT_TIERS`. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\models\Transaction.ts` | Closed-deal record with `commission.fees[]`, `feeTracking` block, and `attribution`. Pre-save hook computes fee amounts and net commission. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\models\Partnership.ts` | Agent ↔ service-partner co-marketing with RESPA JMA, cost-split terms, and `billingHistory`. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\config\credits.ts` | **Single source of truth for credit math.** `CREDIT_SPEND_VALUE = $0.10`, `CREDIT_TIERS`, `CUSTOM_TOPUP_MARKUP = 0.15`, conversion helpers. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\config\stripe-prices.ts` | Stripe price IDs + `TIER_DETAILS` UI catalog. `tierFromPriceId()` reverse lookup. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\stripe-subscription.ts` | Lazy Stripe SDK singleton, `createOrGetStripeCustomer()`, `createCheckoutSession()`, `createCustomerPortalSession()`, `checkFeatureAccess()`. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\stripe-identity.ts` | Stripe Identity verification session creation (KYC). |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\stripe\checkout\route.ts` | POST — agent subscription checkout. Admin fast-path bypasses Stripe. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\stripe\portal\route.ts` | POST — customer billing portal session. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\webhooks\stripe\route.ts` | POST — subscription lifecycle + top-up payment events. Signature-verified. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\webhooks\stripe-identity\route.ts` | POST — identity verification events. Signature-verified. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\points\topup\route.ts` | POST — one-time credit top-up checkout. Tier rate resolved by subscription tier + purchase amount. |
| `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\agent\verify-identity\route.ts` | POST — kicks off Stripe Identity session from agent application flow. |

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

Annual pricing is defined (`monthlyPrice * ~9.6`) but Stripe annual price IDs
are still placeholders — `STRIPE_PRICES.beginner.annual` etc. are `price_PLACEHOLDER_...`.

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
`partner_split_credit`, `partner_split_debit`, `adjustment`.

**Channels** (`CampaignChannel`): `google_ads`, `meta_ads`, `youtube_ads`,
`direct_mail`, `voicemail_drop`.

Storage gotcha: Mongoose collection name is **still `pointsledgers`** — the
model was renamed but the collection name was kept to avoid a data migration.
See `CreditLedger.ts:122`.

## Transactions (commission tracking)

`Transaction` records a closed deal end-to-end: parties, sale price, commission
percentages, stacked fees, attribution, timeline events, and uploaded documents.
The pre-save hook (lines 293-312) computes:

```
commission.totalCommissionAmount = salePrice * (totalCommissionRate / 100)
each fee.amount = totalCommissionAmount * (fee.percentage / 100)
commission.agentNetCommission = agentGrossCommission - sum(fee.amounts)
```

**Stacked fee model** — the `commission.fees[]` array can hold any combination
of these `FeeType` values (each with its own `recipient`):

| Fee type | Default % | Recipient | When applied |
|---|---:|---|---|
| `swipe_match` | 15% | platform (ChatRealty) | Deal originated through swipe match (`feeTracking.swipeMatchFee.agentMatchId`) |
| `referral` | 25% | referring agent | Out-of-state agent referred the client |
| `data_broker` | 5% | agent or team | Agent/team that provided MLS access |
| `handoff` | 5% | handoff agent | Lead was handed off mid-pipeline |
| `company_split` | variable | brokerage | Brokerage's share (typically 20-30%) |

The `feeTracking` block is a denormalized mirror keyed by fee type for
reporting/lookups (vs. the array-shaped `commission.fees[]` which drives the
math). Both are updated on every save.

**Attribution** carries `source` (`swipe_match | ai_chat | map_search |
direct_contact | referral | open_house | other`), `cookieId`, `sessionId`,
`initialContactDate`, and optional links to `AgentMatch` and representation
agreement docs.

## Partnership (cost-sharing + RESPA)

`Partnership` models the agent ↔ service-provider relationship (mortgage,
title, etc.) for legal cost-shared marketing under RESPA's Joint Marketing
Agreement framework.

- **Compound unique index** on `(agentId, servicePartnerId)` — only one
  partnership per pair.
- **Cost split terms:** `equal` | `percentage` (`agentPercentage`/`partnerPercentage`) | `fixed` (`fixedAgentAmount`/`fixedPartnerAmount`), capped by `maxMonthlyContribution`.
- **RESPA compliance:** `jointMarketingAgreement` flag, signed JMA document URL (Cloudinary), `jmaSignedAt`, explicit `agreedToTerms` consent.
- **Linked campaigns:** `campaigns[]` references — when a campaign is created through a partnership, credits are debited from both sides per the terms.
- **`billingHistory[]`:** per-campaign breakdown with `agentShare`, `partnerShare`, paid flags, and optional `stripeInvoiceId`.

Status: `pending | active | suspended | terminated`. Active partnership flow
is wired end-to-end but actual debit-on-campaign mechanics are still being
hardened — see `docs/STRIPE_BILLING_SYSTEM.md:540-549` for the current state.

## Stripe Identity (KYC)

Identity verification is part of the agent application flow, not subscription
checkout — it gates phase transitions in `user.agentApplication`.

1. Applicant reaches `inquiry_approved` phase.
2. `POST /api/agent/verify-identity` calls `createIdentityVerificationSession()`
   with `type: "document"` and `require_id_number / require_live_capture /
   require_matching_selfie`. The returned `url` is sent to the user.
3. User completes verification on Stripe.
4. `POST /api/webhooks/stripe-identity` receives one of:
   - `identity.verification_session.verified` → `phase = "verification_complete"`, success email via Resend.
   - `identity.verification_session.requires_input` → status `"requires_input"`, retry email.
   - `identity.verification_session.canceled / processing` → logged only.

Auth on the webhook is **Stripe signature verification**
(`STRIPE_IDENTITY_WEBHOOK_SECRET`), NOT Turnstile — same signature pattern as
the subscription webhook. Both webhooks set `export const dynamic = 'force-dynamic'`.

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
rate resolution layers (purchase amount THEN subscription tier):

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
  Two routes (`/api/stripe/checkout/route.ts`, `/api/points/topup/route.ts`,
  `/api/webhooks/stripe/route.ts`) still import the shim — they keep working,
  but new work should swap them.
- **Mongoose collection name mismatch.** `CreditLedger` model writes to the
  `pointsledgers` collection (`CreditLedger.ts:122`). If you query directly via
  the driver, use the old collection name.
- **Webhook signature verification is real** — both `/api/webhooks/stripe` and
  `/api/webhooks/stripe-identity` call `stripe.webhooks.constructEvent(body,
  sig, secret)` and return 400 on failure. They do NOT use Turnstile (Turnstile
  is for the public auth/lead forms, not server-to-server webhooks).
- **`vercel.json` catch-all caches everything else.** The last `headers` rule
  sets `Cache-Control: public, max-age=31536000, immutable` on `/(.*)`. Only
  `/api/auth/*`, `/auth/*`, `/dashboard*`, and `/api/user/*` are explicit
  `no-store`. `/api/webhooks/*` falls through to the catch-all at the edge —
  the routes themselves set `export const dynamic = 'force-dynamic'` which
  prevents Next.js prerender caching, but the `vercel.json` headers are added
  at the edge regardless. In practice this is harmless because Stripe POSTs
  (POST responses aren't cached by CDNs by default), but it's worth tightening
  with explicit `no-store` rules for `/api/webhooks/*`.
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

- `../auth/README.md` — agent application phases that gate Stripe Identity.
- `../multi-tenant/README.md` — domain ownership vs. session user, relevant when scoping subscription-related UI.
- `../crm/README.md` — Partnership integrations, contact campaign history.
- (planned) `commerce/campaigns.md` — Google/Meta/Thanks.io/Drop Cowboy campaign mechanics and credit debit flow.

## Migration log

Legacy `/docs/` commerce, billing, and pricing docs audited 2026-05-21:

| Doc | Path | Classification | Action |
|---|---|---|---|
| Stripe Billing System | `F:\web-clients\joseph-sardella\jpsrealtor\docs\STRIPE_BILLING_SYSTEM.md` | SUPERSEDED — Apr 24 2026, mostly current but has stale credit math (uses old `$0.125/credit` model — actual is `$0.10/credit` under unified `credits.ts`; "750 credits for Beginner" should be 1,000; "3,200 credits for Experienced" should be 4,167; "6,800 for Top Agent" should be 8,696). Useful sections (webhook event table, env vars, Stripe price IDs, service-partner TODO) merged into this README. | Move to `docs-v2/archive/` once cutover; mark `supersedes` to this README. |
| Pricing Strategy | `F:\web-clients\joseph-sardella\jpsrealtor\docs\PRICING_STRATEGY.md` | OUTDATED — Jan 17 2026 "Planning" doc that predates Stripe rollout. Proposes "Inside vs Outside Agent" tiers and eXp rev-share that never shipped. Conflicts with current Beginner/Experienced/Top Agent. | Move to `docs-v2/archive/` with one-line note "January 2026 planning doc, superseded by commerce/README.md". |
| Subscription UI | `F:\web-clients\joseph-sardella\jpsrealtor\docs\chatrealty\SUBSCRIPTION_UI.md` | PARTIAL — describes `PricingCard`, `/pricing` page, and `BillingStep` correctly but uses old tier names "starter/professional/enterprise" (current is `beginner/experienced/topagent`). Component file paths still exist. | Add frontmatter `status: partial`, fix tier-name references in body, link from this README's Related section. Or rewrite as `docs-v2/commerce/ui.md`. |
| Multi-tenant index pricing section | `F:\web-clients\joseph-sardella\jpsrealtor\docs\multi-tenant\index.md` (lines 936-967, 1182, 1246) | OUTDATED — March 16 2026 architecture-design doc; references `"free | pro | ultimate | investor"` subscription enum and "sponsored" status that never made it into production. Conflicts with `SubscriptionTier` type. Doc itself is superseded by `docs-v2/multi-tenant/README.md`. | Strip pricing references from any future archive; doc as a whole is already superseded per `docs-v2/multi-tenant/README.md` frontmatter. |
