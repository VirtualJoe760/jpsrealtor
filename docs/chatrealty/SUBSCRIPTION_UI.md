# Subscription UI

## Overview

Two subscription interfaces: a public pricing page and a billing step inside the agent settings wizard.

## Components

### PricingCard (`src/app/components/pricing/PricingCard.tsx`)

Reusable card component shared between the pricing page and billing step.

- Props: `tier`, `isAnnual`, `isCurrentPlan`, `isLight`, `onSelect`, `disabled`, `compact`
- Exports `TIERS` array with all four tier configurations (free/starter/professional/enterprise)
- Shows "Most Popular" badge on Professional tier
- Shows "Current Plan" badge when `isCurrentPlan` is true
- Annual pricing displays per-month cost with yearly savings callout

### Public Pricing Page (`src/app/pricing/page.tsx`)

- Server component wrapper with SEO metadata
- Client component at `src/app/pricing/PricingClient.tsx`
- Monthly/Annual toggle (annual shows "2 months free" badge)
- 4 tier cards: 1-col mobile, 2-col tablet, 4-col desktop
- Free tier CTA goes to `/auth/signin`
- Paid tier CTAs call `POST /api/stripe/checkout` and redirect to Stripe Checkout
- Detects current plan if user is logged in via `GET /api/stripe/subscription`
- Uses SpaticalBackground for visual consistency with chat-landing page

### Billing Step (`src/app/agent/settings/components/steps/BillingStep.tsx`)

Added as the final step in SettingsWizard (after Service Areas).

**No subscription / Free plan view:**
- Current plan card showing Free tier
- Upgrade prompt with link to `/pricing`
- Usage meters if available

**Active subscription view:**
- Plan card: tier name, status badge (active/trialing/past_due), next billing date, amount
- "Manage Billing" button opens Stripe Customer Portal via `POST /api/stripe/portal`
- Usage meters: photos, videos, custom pages (progress bars with high-usage warning at 80%)
- "Change Plan" expandable section with compact PricingCards (paid tiers only, 2-col grid)
- Billing history table: date, amount, status badge, invoice link

## API Endpoints Required

These endpoints must be implemented server-side:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/stripe/checkout` | POST | Creates Stripe Checkout session. Body: `{ tier, billingInterval }`. Returns `{ url }` |
| `/api/stripe/portal` | POST | Creates Stripe Customer Portal session. Returns `{ url }` |
| `/api/stripe/subscription` | GET | Returns current subscription, usage, and invoices |

## Wizard Integration

- `SettingsStepIndicator.tsx`: Added `"billing"` to `SettingsStep` type and `STEPS` array with `CreditCard` icon
- `SettingsWizard.tsx`: Imported `BillingStep` and added `case "billing"` to `renderStep()`

## Tier Details

| Tier | Monthly | Annual | Key Features |
|---|---|---|---|
| Free | $0 | $0 | Subdomain, 10 photos, 1 video |
| Starter | $49 | $490 | Custom domain, 50 photos, 3 videos, lead capture |
| Professional | $99 | $990 | 200 photos, 10 videos, analytics, API, blog |
| Enterprise | $299 | $2,990 | 999 photos, 50 videos, webhooks, 100 custom pages |
