# Stripe Subscription System

Backend infrastructure for agent subscription billing via Stripe.

## Architecture

```
src/
  config/stripe-prices.ts        # Price IDs + tier details for UI
  lib/stripe-subscription.ts     # Stripe SDK helpers (customer, checkout, portal, feature gates)
  models/AgentSubscription.ts    # MongoDB model (pre-existing)
  app/api/
    stripe/
      checkout/route.ts          # POST — create Checkout session
      portal/route.ts            # POST — create Customer Portal session
      subscription/route.ts      # GET  — current subscription status
    webhooks/
      stripe/route.ts            # POST — Stripe webhook receiver
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Server-side Stripe API key (`sk_test_...` / `sk_live_...`) |
| `STRIPE_PUBLISHABLE_KEY` | Client-side key for Stripe.js (`pk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook endpoint signing secret (`whsec_...`) |

## Pricing Tiers

| Tier | Monthly | Annual | Key Features |
|------|---------|--------|--------------|
| Free | $0 | $0 | Subdomain, 10 photos, community support |
| Starter | $49 | $470 | 50 photos, blog, analytics, email support |
| Professional | $99 | $950 | Custom domain, 200 photos, API, priority support |
| Enterprise | $299 | $2,870 | 999 photos, webhooks, dedicated support |

## API Endpoints

### POST `/api/stripe/checkout`
Create a Stripe Checkout session. Requires `realEstateAgent` role.

**Body:**
```json
{
  "tier": "starter" | "professional" | "enterprise",
  "billingInterval": "monthly" | "annual",
  "successUrl": "optional override",
  "cancelUrl": "optional override"
}
```

**Response:** `{ sessionId, url }` — redirect user to `url`.

### POST `/api/stripe/portal`
Create a Stripe Customer Portal session for self-service billing management.

**Body:** `{ "returnUrl": "optional" }`

**Response:** `{ url }`

### GET `/api/stripe/subscription`
Get the authenticated user's current subscription status, features, and usage.

**Response:** tier, status, features, billingInterval, currentPeriodEnd, usage, etc.

## Webhook Events

Endpoint: `POST /api/webhooks/stripe`

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create AgentSubscription, sync User model |
| `customer.subscription.updated` | Sync tier/status/period changes |
| `customer.subscription.deleted` | Cancel subscription, downgrade to free |
| `invoice.payment_succeeded` | Log to billing history |
| `invoice.payment_failed` | Mark past_due, log failure |

Webhook signature is verified via `STRIPE_WEBHOOK_SECRET`. Raw body is read with `request.text()` (required for signature verification in Next.js App Router).

## Setup Steps

1. **Create Stripe products/prices** in Dashboard or via CLI, then update placeholder IDs in `src/config/stripe-prices.ts`.
2. **Set env vars** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).
3. **Register webhook** in Stripe Dashboard pointing to `https://yourdomain.com/api/webhooks/stripe` with the events listed above.
4. **Configure Customer Portal** in Stripe Dashboard (branding, allowed actions).
5. **Test with Stripe CLI:** `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

## Feature Gating

Use `checkFeatureAccess()` or `checkFeatureAccessForUser()` from `src/lib/stripe-subscription.ts`:

```typescript
import { checkFeatureAccessForUser } from "@/lib/stripe-subscription";
import AgentSubscription from "@/models/AgentSubscription";

const canUseBlog = await checkFeatureAccessForUser(userId, "blogPosts", AgentSubscription);
```

## User Model Sync

The webhook handler syncs subscription state to the User model fields:
- `subscriptionTier` (free/pro/starter/enterprise)
- `subscriptionStatus` (active/cancelled/past_due/trialing)
- `subscriptionExpiresAt`
- `stripeSubscriptionId`

Note: User model uses "pro" while AgentSubscription uses "professional" — the webhook maps between them.
