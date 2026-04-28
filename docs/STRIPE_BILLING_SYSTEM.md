# Stripe Billing System — Complete Reference

**Last Updated:** April 24, 2026
**Status:** Active (Test Mode)

---

## Table of Contents

1. [Overview](#overview)
2. [Account Types & Subscription Tiers](#account-types--subscription-tiers)
3. [Marketing Credits System](#marketing-credits-system)
4. [Stripe Products & Price IDs](#stripe-products--price-ids)
5. [Architecture & File Map](#architecture--file-map)
6. [API Routes](#api-routes)
7. [Webhook Events](#webhook-events)
8. [Database Models](#database-models)
9. [Feature Gating](#feature-gating)
10. [Promotion Codes & Discounts](#promotion-codes--discounts)
11. [Environment Variables](#environment-variables)
12. [Webhook Setup](#webhook-setup)
13. [Testing](#testing)
14. [TODO: Service Partner Subscriptions](#todo-service-partner-subscriptions)

---

## Overview

ChatRealty has three distinct user types, each with their own subscription system:

| User Type | Role | Subscription System | Credits |
|-----------|------|---------------------|---------|
| General User | `endUser` | Free / Pro ($9.99/mo) | No |
| Real Estate Agent | `realEstateAgent` | Free / Beginner / Experienced / Top Agent | Yes |
| Service Partner | `serviceProvider` | TBD — needs implementation | TBD |

Revenue comes from two sources:
1. **Subscription fees** — monthly recurring via Stripe
2. **Marketing credit markup** — agents pay $1 but receive $0.75–$0.85 in actual ad spend

---

## Account Types & Subscription Tiers

### General Users (Home Buyers/Sellers)

Simple two-tier system with no marketing credits.

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | 10 AI queries/day, 50 favorites, 3 saved searches, basic filters |
| **Pro** | $9.99/mo | 100 AI queries/day, unlimited saves & searches, price alerts, advanced filters, priority support |

**API:** `GET/POST/DELETE /api/user/subscription`
**Stripe Price ID:** `price_1SW75eGI9m3f5P10p8Ht99dn`
**UI:** `/dashboard/subscription`

### Real Estate Agents

Credit-based tier system. Higher tiers include more credits at a better rate.

| Tier | Price | Credits/Mo | Ad Buying Power | Margin | Rate |
|------|-------|-----------|-----------------|--------|------|
| **Free** | $0 | 0 | $0 | — | — |
| **Beginner** | $125/mo | 750 | $93.75 | 25% | $0.75/$1 |
| **Experienced** | $500/mo | 3,200 | $400.00 | 20% | $0.80/$1 |
| **Top Agent** | $1,000/mo | 6,800 | $850.00 | 15% | $0.85/$1 |

**API:** `POST /api/stripe/checkout` | `GET /api/stripe/subscription` | `POST /api/stripe/portal`
**UI:** `/agent/subscription` (Overview, Plans, Billing tabs)

**Key features by tier:**

| Feature | Free | Beginner | Experienced | Top Agent |
|---------|------|----------|-------------|-----------|
| Custom domain | - | - | Yes | Yes |
| Gallery photos | 10 | 50 | 200 | 999 |
| Videos | 1 | 3 | 10 | 50 |
| Custom pages | 1 | 5 | 20 | 100 |
| Blog posts | - | Yes | Yes | Yes |
| Analytics | - | Yes | Yes | Yes |
| Data export | - | - | Yes | Yes |
| API access | - | - | - | Yes |
| Webhooks | - | - | - | Yes |
| Support | Community | Email | Priority | Dedicated |

### Service Partners (TODO)

Service partners (mortgage brokers, title officers, etc.) need their own subscription tiers. See [TODO section](#todo-service-partner-subscriptions) below.

---

## Marketing Credits System

### How Credits Work

1. Agent subscribes to a paid tier (Beginner/Experienced/Top Agent)
2. Stripe webhook fires on payment → credits are deposited to their `PointsLedger`
3. Agent spends credits on campaigns (Google Ads, Meta Ads, Direct Mail, Voicemail Drops)
4. Platform keeps the margin between credit cost and actual ad spend

### Credit Value

All credits have a fixed ad-spend value:

**1 credit = $0.125 in ad spend**

The margin comes from the cost-per-credit at each tier:

| Tier | Cost per Credit | Ad Value per Credit | Margin per Credit |
|------|----------------|--------------------|--------------------|
| Beginner | $0.1667 | $0.125 | $0.0417 (25%) |
| Experienced | $0.15625 | $0.125 | $0.03125 (20%) |
| Top Agent | $0.14706 | $0.125 | $0.02206 (15%) |

### Credit Top-Ups (Add Credits)

Users can buy additional credits anytime. The rate depends on their subscription tier and the purchase amount:

| Purchase Amount | Non-Subscriber | Beginner | Experienced | Top Agent |
|----------------|---------------|----------|-------------|-----------|
| Under $125 | 35% margin ($0.65/$1) | Tier rate | Tier rate | Tier rate |
| $125–$499 | Beginner rate | Beginner rate | Tier rate | Tier rate |
| $500–$999 | Experienced rate | Experienced rate | Experienced rate | Tier rate |
| $1,000+ | Top Agent rate | Top Agent rate | Top Agent rate | Top Agent rate |

Subscribers always get at least their tier's rate. Higher purchase amounts unlock better rates regardless of tier.

### Partnership Cost-Splitting

Agents and service partners can form partnerships to split campaign costs. This is the key value proposition — instead of one agent spending $500 alone, an agent and mortgage broker can split it $250/$250 through their partnership terms.

Partnership cost splits are tracked via the `Partnership` model's `terms` field (equal/percentage/fixed splits) and `billingHistory` array.

### Credit Transaction Types

| Type | Direction | Description |
|------|-----------|-------------|
| `subscription_credit` | Credit (+) | Monthly credits from subscription |
| `topup_purchase` | Credit (+) | Purchased additional credits |
| `campaign_spend` | Debit (-) | Spent on ad campaign |
| `refund` | Credit (+) | Credits returned from cancelled campaign |
| `bonus` | Credit (+) | Promotional bonus credits |
| `partner_split_credit` | Credit (+) | Credits received from partner split |
| `partner_split_debit` | Debit (-) | Credits sent to partner split |
| `adjustment` | Either | Manual admin adjustment |

### Campaign Channels

Credits can be spent on four channels:
- `google_ads` — Google Ads campaigns
- `meta_ads` — Meta (Facebook/Instagram) Ads
- `direct_mail` — Physical direct mail via Thanks.io
- `voicemail_drop` — Ringless voicemail drops

---

## Stripe Products & Price IDs

### Live Products (Test Mode)

| Product | Type | Price | Price ID | Stripe Product |
|---------|------|-------|----------|----------------|
| Pro | Recurring | $9.99/mo | `price_1SW75eGI9m3f5P10p8Ht99dn` | General user premium |
| Beginner | Recurring | $125/mo | `price_1TPWCVGI9m3f5P10CfXu4rB6` | Agent tier 1 |
| Experienced | Recurring | $500/mo | `price_1TPWDIGI9m3f5P10Essx6Kh1` | Agent tier 2 |
| Top Agent | Recurring | $1,000/mo | `price_1TPWEKGI9m3f5P10pj771Lmx` | Agent tier 3 |
| Add Credits | One-time | Variable | `price_1TPXKIGI9m3f5P10OYemYKxu` | Credit top-ups |

### Annual Prices (Not Yet Created)

Annual pricing placeholders exist in code but products have not been created in Stripe yet:
- `price_PLACEHOLDER_beginner_annual`
- `price_PLACEHOLDER_experienced_annual`
- `price_PLACEHOLDER_topagent_annual`

---

## Architecture & File Map

```
src/
  config/
    stripe-prices.ts              # Price IDs, tier details, tier-to-price mapping

  models/
    User.ts                       # subscriptionTier, stripeCustomerId on user doc
    AgentSubscription.ts          # Full subscription state, features, billing history
    PointsLedger.ts               # Credit balance, transactions, tier-based rates
    Partnership.ts                # Partnership terms, cost splits, billing history

  lib/
    stripe-subscription.ts        # Stripe SDK helpers (customer, checkout, portal, feature gates)
    stripe-identity.ts            # Stripe Identity for agent verification

  app/api/
    user/
      subscription/route.ts       # GET/POST/DELETE — general user Free/Pro

    stripe/
      checkout/route.ts           # POST — agent subscription checkout
      portal/route.ts             # POST — Stripe customer portal session
      subscription/route.ts       # GET  — agent subscription status

    points/
      route.ts                    # GET balance, POST spend credits
      topup/route.ts              # POST — create top-up checkout session

    webhooks/
      stripe/route.ts             # POST — subscription + payment + top-up events
      stripe-identity/route.ts    # POST — identity verification events

  app/
    dashboard/
      subscription/page.tsx       # General user pricing (Free vs Pro)

    agent/
      subscription/page.tsx       # Agent pricing (Free/Beginner/Experienced/Top Agent)
      dashboard/
        components/
          PointsSection.tsx       # Credit balance, top-up, transaction history
          PartnershipsSection.tsx  # Partner applications and active partnerships
```

---

## API Routes

### General User Subscription

#### `GET /api/user/subscription`
Returns current tier, status, and feature limits.

#### `POST /api/user/subscription`
Creates Stripe checkout session for Pro upgrade. Redirects to Stripe.

#### `DELETE /api/user/subscription`
Cancels Pro subscription at end of billing period.

### Agent Subscription

#### `POST /api/stripe/checkout`
```json
{
  "tier": "beginner" | "experienced" | "topagent",
  "billingInterval": "monthly",
  "successUrl": "https://...",
  "cancelUrl": "https://..."
}
```
Creates Stripe checkout session. Returns `{ sessionId, url }`.

#### `GET /api/stripe/subscription`
Returns agent's current subscription: tier, status, features, period dates, trial info.

#### `POST /api/stripe/portal`
```json
{ "returnUrl": "https://..." }
```
Creates Stripe customer portal session for self-service billing management.

### Marketing Credits

#### `GET /api/points?limit=20&offset=0`
Returns credit balance, tier, ad spend available, and paginated transaction history.

#### `POST /api/points`
Spend credits on a campaign.
```json
{
  "points": 500,
  "channel": "google_ads" | "meta_ads" | "direct_mail" | "voicemail_drop",
  "campaignId": "optional_campaign_id",
  "description": "Optional description"
}
```

#### `POST /api/points/topup`
Create checkout session to buy additional credits.
```json
{ "amount": 250 }
```
Returns `{ sessionId, url, points, tier, adSpendValue }`.

---

## Webhook Events

**Endpoint:** `POST /api/webhooks/stripe`
**Signing Secret:** `STRIPE_WEBHOOK_SECRET` env var

| Event | Action |
|-------|--------|
| `checkout.session.completed` (subscription) | Create/activate `AgentSubscription`, sync to `User`, credit monthly points to `PointsLedger` |
| `checkout.session.completed` (payment, type=points_topup) | Credit purchased points to `PointsLedger` |
| `customer.subscription.updated` | Sync tier, status, period dates, cancel state |
| `customer.subscription.deleted` | Mark cancelled, downgrade to free tier |
| `invoice.payment_succeeded` | Log to billing history, credit monthly points (with 25-day dedup guard) |
| `invoice.payment_failed` | Set status to past_due, log payment failure |

**Identity Webhook (separate endpoint):**

**Endpoint:** `POST /api/webhooks/stripe-identity`

| Event | Action |
|-------|--------|
| `identity.verification_session.verified` | Set `identityVerified=true`, send success email |
| `identity.verification_session.requires_input` | Update status, send retry email |

---

## Database Models

### User (subscription fields)

```typescript
{
  subscriptionTier: "free" | "pro" | "beginner" | "experienced" | "topagent",
  subscriptionStatus: string,
  subscriptionExpiresAt: Date,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
}
```

### AgentSubscription

Full subscription lifecycle tracking:
- Tier: `free | beginner | experienced | topagent`
- Status: `active | trialing | past_due | cancelled | paused`
- Stripe IDs: customerId, subscriptionId, priceId, paymentMethodId
- Period dates, trial dates, cancellation tracking
- Feature limits (auto-set via pre-save hook based on tier)
- Billing history (invoices array)
- Payment failure tracking
- Discount/promo code tracking
- Referral tracking

### PointsLedger

Credit balance and transaction history:
- `userId` — one ledger per user (unique index)
- `balance` — current credit count
- `totalEarned` / `totalSpent` — lifetime counters
- `tier` — current subscription tier (affects top-up rates)
- `transactions[]` — full history with type, amount, balanceAfter, channel, adSpendValue
- `lastSubscriptionCredit` — prevents double-crediting on renewal

---

## Feature Gating

Use `checkFeatureAccess()` or `checkFeatureAccessForUser()` from `lib/stripe-subscription.ts`:

```typescript
import { checkFeatureAccessForUser } from "@/lib/stripe-subscription";
import AgentSubscription from "@/models/AgentSubscription";

const hasCustomDomain = await checkFeatureAccessForUser(userId, "customDomain", AgentSubscription);
```

Available feature flags:
`customDomain`, `subdomain`, `customBackgrounds`, `blogPosts`, `testimonials`,
`leadCapture`, `agentMatching`, `representationAgreements`, `analytics`,
`exportData`, `apiAccess`, `webhooks`

---

## Promotion Codes & Discounts

Promotion codes are enabled on all checkout flows:
- Agent subscription checkout (`allow_promotion_codes: true`)
- General user Pro checkout (`allow_promotion_codes: true`)
- Credit top-up checkout (`allow_promotion_codes: true`)

### Creating Promo Codes in Stripe

1. Dashboard → Product catalog → Coupons → + Create coupon
2. Choose: percentage off or fixed amount
3. Set duration: once / repeating / forever
4. Add a customer-facing promo code
5. Users see "Add promotion code" field on checkout automatically

### Credit Sales

The credit system supports promotional rates via:
- Stripe coupons on top-up purchases
- `bonus` transaction type for free credits
- Admin `adjustment` transaction type for manual corrections

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Yes | Server-side API key (`sk_test_...` or `sk_live_...`) |
| `STRIPE_PUBLISHABLE_KEY` | Yes | Client-side key (`pk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Subscription webhook signing secret (`whsec_...`) |
| `STRIPE_IDENTITY_WEBHOOK_SECRET` | For identity | Identity webhook signing secret |
| `USER_PRO_STRIPE_PRICE_ID` | No | Override Pro price ID (defaults to hardcoded) |
| `NEXT_PUBLIC_BASE_URL` | No | Base URL for checkout redirects |
| `NEXTAUTH_URL` | No | Fallback base URL |

---

## Webhook Setup

### Local Development (Stripe CLI)

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward events to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy the webhook signing secret (whsec_...) to .env.local
```

### Production

1. Stripe Dashboard → Developers → Webhooks → + Add endpoint
2. **URL:** `https://www.jpsrealtor.com/api/webhooks/stripe`
3. **Events to listen for:**
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the signing secret to your production environment variables

### Identity Webhook (separate endpoint)

1. **URL:** `https://www.jpsrealtor.com/api/webhooks/stripe-identity`
2. **Events:**
   - `identity.verification_session.verified`
   - `identity.verification_session.requires_input`
   - `identity.verification_session.canceled`

---

## Testing

### Test Cards

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 3220` | Requires 3D Secure |
| `4000 0000 0000 9995` | Payment declined |
| `4000 0000 0000 0341` | Attaching fails |

Use any future expiry date and any 3-digit CVC.

### Test Workflow

1. **Agent subscription:** Go to `/agent/subscription` → Plans tab → Click Upgrade → Complete Stripe checkout → Verify credits appear on dashboard
2. **Credit top-up:** Dashboard → Marketing Credits → Buy More Credits → Complete checkout → Verify credits added
3. **General user Pro:** Go to `/dashboard/subscription` → Upgrade to Pro → Complete checkout → Verify features unlocked
4. **Promo code:** Create a coupon in Stripe → Apply code during checkout → Verify discounted amount

### Verifying Webhooks

Check server logs for `[stripe-webhook]` entries:
```
[stripe-webhook] Subscription created: user=... tier=beginner sub=sub_...
[stripe-webhook] Credited 750 credits to user=... (Beginner)
[stripe-webhook] Invoice paid: inv_... amount=125
[stripe-webhook] Top-up: 520 credits credited to user=... ($50)
```

---

## TODO: Service Partner Subscriptions

Service partners (`serviceProvider` role) currently have no subscription tiers. This needs to be built:

### Proposed Architecture

1. **Decide tier structure:** Do service partners use the same Beginner/Experienced/Top Agent tiers as agents, or get their own (e.g., Partner Basic / Partner Pro)?

2. **Key questions to answer:**
   - Do service partners need their own credit pool, or do they only contribute credits via partnership cost-splits?
   - Should partners be able to run campaigns independently, or only through agent partnerships?
   - What features should be gated by partner tier (directory visibility, number of partnerships, campaign types)?

3. **Implementation steps once decided:**
   - Create Stripe products/prices for partner tiers
   - Add partner tier enum to `AgentSubscription` model (or create a separate `PartnerSubscription` model)
   - Add price IDs to `stripe-prices.ts`
   - Update webhook to handle partner subscription events
   - Create `/partner/subscription` UI page
   - Wire credit allocation for partner tiers into `PointsLedger`

4. **Partnership billing integration:**
   - When a campaign is created through a partnership, credits are split according to the partnership `terms`
   - Both the agent's and partner's `PointsLedger` are debited proportionally
   - The `billingHistory` on the `Partnership` model tracks each split

### Current Partner Workflow (No Billing Yet)

- Partners apply via `/partner/settings/apply`
- Agent sees applications on dashboard → sends partnership request
- Partner accepts → partnership is active
- Cost split terms are set but **no actual billing/credit deduction is implemented yet**
