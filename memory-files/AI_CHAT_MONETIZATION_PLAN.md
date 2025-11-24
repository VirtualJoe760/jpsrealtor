# AI Chat Monetization Plan with Groq
## Comprehensive Action Plan

---

## Executive Summary

**Goal:** Implement a freemium AI chat system using Groq that:
- Offers free limited access (basic model)
- Premium $10/month subscription for unlimited access (better models)
- Integrates with existing Payload CMS + Stripe
- Generates revenue while staying cost-effective

---

## Tier Structure

### **Free Tier**
- Model: `llama-3.1-8b-instant` (840 TPS - super fast)
- Limit: **100 messages per month** (generous for real estate focused chat)
- Cost to you: ~$0.013/month per user (basically free)
- Features:
  - Basic AI responses
  - Property search
  - Chat history

### **Premium Tier ($10/month)**
- Model: `llama-3.3-70b-versatile` (394 TPS - smarter, better quality)
- Limit: **Unlimited messages**
- Cost to you: ~$0.15-0.30/month per active user
- Profit margin: **~97% ($9.70-9.85 profit per user)**
- Features:
  - Faster, smarter AI
  - Unlimited messages
  - Priority support
  - Advanced property insights
  - Market analysis

---

## Implementation Plan

### **Phase 1: Setup Groq Integration** (30 min)

1. **Install Groq SDK**
   ```bash
   npm install groq-sdk
   ```

2. **Get Groq API Key**
   - Go to https://console.groq.com/
   - Sign up / Login
   - Generate API key
   - Add to `.env.local`:
     ```
     GROQ_API_KEY=gsk_your_key_here
     ```

3. **Update API Route** (`src/app/api/chat/stream/route.ts`)
   - Replace current implementation with Groq
   - Add user tier detection
   - Implement usage tracking

---

### **Phase 2: Usage Tracking System** (1 hour)

1. **Create Message Usage Model** (Payload CMS)
   ```typescript
   // src/collections/MessageUsage.ts
   {
     user: { type: 'relationship', relationTo: 'users' },
     messageCount: { type: 'number', default: 0 },
     lastResetDate: { type: 'date' },
     tier: { type: 'select', options: ['free', 'premium'] }
   }
   ```

2. **Create Usage Tracking API**
   ```
   POST /api/chat/usage/increment
   GET /api/chat/usage/check
   POST /api/chat/usage/reset
   ```

3. **Add Monthly Reset Logic**
   - Cron job or check on each request
   - Reset free tier counts on 1st of month

---

### **Phase 3: Payload CMS Integration** (1-2 hours)

1. **Create Subscription Collection**
   ```typescript
   // src/collections/Subscriptions.ts
   {
     user: { type: 'relationship', relationTo: 'users', unique: true },
     stripeCustomerId: { type: 'text' },
     stripeSubscriptionId: { type: 'text' },
     plan: { type: 'select', options: ['free', 'premium'] },
     status: { type: 'select', options: ['active', 'canceled', 'past_due'] },
     currentPeriodEnd: { type: 'date' }
   }
   ```

2. **Add to User Model**
   ```typescript
   // Add to existing users collection
   {
     subscriptionTier: { type: 'select', options: ['free', 'premium'], default: 'free' },
     messageCount: { type: 'number', default: 0 },
     messageResetDate: { type: 'date' }
   }
   ```

---

### **Phase 4: Stripe Integration** (1-2 hours)

1. **Create Stripe Product**
   - Go to Stripe Dashboard
   - Create Product: "AI Chat Premium"
   - Price: $10/month recurring
   - Get Product ID and Price ID

2. **Create Stripe Checkout Endpoint**
   ```
   POST /api/stripe/create-checkout-session
   POST /api/stripe/webhook (handle subscription events)
   ```

3. **Handle Webhook Events**
   - `customer.subscription.created` → Set user to premium
   - `customer.subscription.deleted` → Downgrade to free
   - `invoice.payment_succeeded` → Renew premium access
   - `invoice.payment_failed` → Notify user

---

### **Phase 5: Frontend Implementation** (2-3 hours)

1. **Usage Indicator Component**
   ```typescript
   // Show in chat sidebar or header
   Free: "15/50 messages used this month"
   Premium: "Unlimited ✨"
   ```

2. **Upgrade Prompt**
   - Show when user hits 40/50 messages
   - Show blocking modal at 50/50 messages
   - CTA: "Upgrade to Premium for $10/month"

3. **Subscription Management Page**
   - `/dashboard/subscription`
   - Show current plan
   - Upgrade/cancel buttons
   - Usage statistics
   - Billing history

4. **Update Chat Interface**
   - Show premium badge for premium users
   - Display model being used
   - Show "Upgrade for faster AI" for free users

---

### **Phase 6: Rate Limiting & Protection** (1 hour)

1. **Implement Rate Limiter**
   ```typescript
   // Prevent abuse
   - Free: Max 50 messages/month
   - Premium: Max 1000 messages/day (prevent extreme abuse)
   - Rate limit: Max 10 messages/minute (prevent spam)
   ```

2. **Add Cooldowns**
   - Free tier: 5 second cooldown between messages
   - Premium: No cooldown

---

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── stream/route.ts (UPDATED - Groq integration)
│   │   ├── usage/
│   │   │   ├── check/route.ts (NEW)
│   │   │   ├── increment/route.ts (NEW)
│   │   │   └── reset/route.ts (NEW)
│   │   └── stripe/
│   │       ├── checkout/route.ts (NEW)
│   │       └── webhook/route.ts (NEW)
│   └── dashboard/
│       └── subscription/page.tsx (NEW)
├── collections/
│   ├── MessageUsage.ts (NEW)
│   └── Subscriptions.ts (NEW)
├── components/
│   ├── chat/
│   │   ├── UsageIndicator.tsx (NEW)
│   │   └── UpgradeModal.tsx (NEW)
│   └── subscription/
│       ├── PricingCard.tsx (NEW)
│       └── SubscriptionManager.tsx (NEW)
└── lib/
    ├── groq.ts (NEW - Groq client)
    ├── usage-tracker.ts (NEW)
    └── subscription-utils.ts (NEW)
```

---

## Revenue Projections

### Assumptions:
- 1,000 monthly active users
- 10% conversion rate to premium

### Costs:
- Free users (900): $5.85/month
- Premium users (100): $15-30/month
- **Total Cost: ~$35/month**

### Revenue:
- Premium subscriptions: 100 × $10 = **$1,000/month**

### Profit:
- **$965/month** (96.5% profit margin)
- Scales very well with more users!

---

## Implementation Order

1. ✅ **Setup Groq** (quick win, get AI working fast)
2. ✅ **Basic usage tracking** (track message counts)
3. ✅ **Frontend indicators** (show users their usage)
4. ✅ **Stripe integration** (enable payments)
5. ✅ **Subscription management** (user can upgrade/cancel)
6. ✅ **Polish & testing** (ensure everything works)

---

## Next Steps

Ready to start? I'll begin with:
1. Installing Groq SDK
2. Implementing the API route with tier detection
3. Adding basic usage tracking

This will get the AI working fast on both mobile AND desktop, then we can layer in the monetization.

Shall I proceed?
