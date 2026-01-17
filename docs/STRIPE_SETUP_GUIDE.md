# Stripe Integration Setup Guide

**Last Updated:** January 17, 2026
**Status:** In Progress

---

## Table of Contents

1. [Overview](#overview)
2. [Stripe Account Setup](#stripe-account-setup)
3. [Environment Variables](#environment-variables)
4. [Product & Price Setup](#product--price-setup)
5. [Webhook Configuration](#webhook-configuration)
6. [Testing](#testing)

---

## Overview

This guide walks through setting up Stripe for the subscription and payment system.

### Installed Packages
- `stripe` (v17.4.0) - Server-side Stripe SDK
- `@stripe/stripe-js` (v5.2.0) - Client-side Stripe SDK

---

## Stripe Account Setup

### Step 1: Create Stripe Account

1. Go to [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Create an account
3. Activate your account
4. **Important:** Keep test mode enabled for development

### Step 2: Get API Keys

1. Navigate to **Developers** → **API keys**
2. Copy the following keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)
3. Keep these keys secure - we'll add them to `.env.local`

### Step 3: Enable Customer Portal

1. Navigate to **Settings** → **Billing** → **Customer portal**
2. Click **Activate**
3. Configure settings:
   - Allow customers to update payment methods: ✓
   - Allow customers to update subscriptions: ✓
   - Allow customers to cancel subscriptions: ✓
   - Products: Select all subscription products

---

## Environment Variables

Add the following to your `.env.local` file:

```bash
# Stripe Keys
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe URLs
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Security Note:** Never commit `.env.local` to git. It's already in `.gitignore`.

---

## Product & Price Setup

### Products to Create in Stripe Dashboard

Go to **Products** → **Add product** for each tier:

#### 1. General User Premium
- **Name:** General User Premium
- **Description:** Unlimited AI messages, favorites, and alerts
- **Pricing:**
  - Price: $9.99 USD
  - Billing period: Monthly
  - Price ID: Save this (e.g., `price_xxxxx`)

#### 2. Investor Pro
- **Name:** Investor Pro
- **Description:** Unlimited CMA, cash flow analysis, and market insights
- **Pricing:**
  - Price: $49 USD
  - Billing period: Monthly
  - Price ID: Save this

#### 3. Investor Enterprise
- **Name:** Investor Enterprise
- **Description:** API access, bulk analysis, and dedicated support
- **Pricing:**
  - Price: $149 USD
  - Billing period: Monthly
  - Price ID: Save this

#### 4. Inside Agent Pro
- **Name:** Inside Agent Pro
- **Description:** Enhanced CRM with 1000 AI tokens and 500 voicemail credits
- **Pricing:**
  - Price: $99 USD
  - Billing period: Monthly
  - Price ID: Save this

#### 5. Outside Agent
- **Name:** Outside Agent
- **Description:** Full CRM platform with lead generation tools
- **Pricing:**
  - Price: $399 USD
  - Billing period: Monthly
  - Price ID: Save this

#### 6. Outside Agent Enterprise
- **Name:** Outside Agent Enterprise
- **Description:** Custom integrations and dedicated account manager
- **Pricing:**
  - Price: $999 USD
  - Billing period: Monthly
  - Price ID: Save this

#### 7. Team Starter
- **Name:** Team Starter (5 agents)
- **Description:** Team dashboard and shared contacts for up to 5 agents
- **Pricing:**
  - Price: $299 USD
  - Billing period: Monthly
  - Price ID: Save this

#### 8. Team Pro
- **Name:** Team Pro (10 agents)
- **Description:** Advanced team analytics and bulk credits for up to 10 agents
- **Pricing:**
  - Price: $799 USD
  - Billing period: Monthly
  - Price ID: Save this

### Add-On Products (One-time or Metered)

#### AI Token Pack
- **Name:** 500 AI Tokens
- **Pricing:** $20 USD (one-time)

#### Voicemail Credit Pack
- **Name:** 100 Voicemail Credits
- **Pricing:** $30 USD (one-time)

---

## Webhook Configuration

### Step 1: Install Stripe CLI (for local development)

**Windows:**
```bash
# Using Scoop
scoop install stripe

# Or download from https://github.com/stripe/stripe-cli/releases
```

**Mac:**
```bash
brew install stripe/stripe-cli/stripe
```

### Step 2: Login to Stripe CLI

```bash
stripe login
```

This will open a browser window to authorize the CLI.

### Step 3: Forward Webhooks to Local Server

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This will output a webhook signing secret (starts with `whsec_`). Add this to your `.env.local` as `STRIPE_WEBHOOK_SECRET`.

###Step 4: Set Up Production Webhooks

When deploying to production:

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.updated`
5. Copy the webhook signing secret and update production env vars

---

## Testing

### Test Card Numbers

Use these test cards in test mode:

**Successful Payment:**
- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

**Payment Requires Authentication (3D Secure):**
- Card: `4000 0025 0000 3155`

**Payment Declined:**
- Card: `4000 0000 0000 9995`

### Test Workflow

1. **Create Checkout Session**
   ```bash
   curl -X POST http://localhost:3000/api/stripe/checkout \
     -H "Content-Type: application/json" \
     -d '{"priceId": "price_xxxxx", "userId": "user_id_here"}'
   ```

2. **Complete Checkout**
   - Use test card `4242 4242 4242 4242`
   - Complete the checkout flow

3. **Verify Webhook Received**
   - Check webhook logs in Stripe CLI
   - Verify database updated with subscription

4. **Test Customer Portal**
   ```bash
   curl -X POST http://localhost:3000/api/stripe/portal \
     -H "Content-Type: application/json" \
     -d '{"customerId": "cus_xxxxx"}'
   ```

### Monitoring

**Stripe Dashboard:**
- View all payments: **Payments**
- View subscriptions: **Subscriptions**
- View customers: **Customers**
- View webhooks: **Developers** → **Webhooks**
- View logs: **Developers** → **Logs**

---

## Price IDs Configuration File

After creating all products, create a configuration file:

`src/config/stripe-prices.ts`:
```typescript
export const STRIPE_PRICES = {
  general_premium: 'price_xxxxx', // Replace with actual price ID
  investor_pro: 'price_xxxxx',
  investor_enterprise: 'price_xxxxx',
  inside_agent_pro: 'price_xxxxx',
  outside_agent: 'price_xxxxx',
  outside_agent_enterprise: 'price_xxxxx',
  team_starter: 'price_xxxxx',
  team_pro: 'price_xxxxx',

  // Add-ons
  ai_tokens_500: 'price_xxxxx',
  voicemail_credits_100: 'price_xxxxx',
} as const;

export type StripePriceId = typeof STRIPE_PRICES[keyof typeof STRIPE_PRICES];
```

---

## Next Steps

1. ✅ Install Stripe packages
2. ⏳ Create Stripe account and get API keys
3. ⏳ Add environment variables
4. ⏳ Create products and prices in Stripe Dashboard
5. ⏳ Set up webhook forwarding for local development
6. ⏳ Create subscription database models
7. ⏳ Implement checkout API route
8. ⏳ Implement webhook handler
9. ⏳ Implement billing portal
10. ⏳ Test end-to-end flow

---

**Last Updated:** January 17, 2026
**Next:** Create Stripe account and configure products
