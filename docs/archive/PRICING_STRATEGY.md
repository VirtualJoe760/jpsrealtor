# Pricing & Monetization Strategy

**Last Updated:** January 17, 2026
**Version:** 1.0
**Status:** Planning

---

## Table of Contents

1. [Overview](#overview)
2. [User Segments](#user-segments)
3. [Pricing Tiers](#pricing-tiers)
4. [Time-Gating Strategy](#time-gating-strategy)
5. [Feature Matrix](#feature-matrix)
6. [Revenue Streams](#revenue-streams)
7. [Implementation Plan](#implementation-plan)
8. [Database Schema](#database-schema)

---

## Overview

The platform uses a multi-tiered monetization strategy tailored to different user segments, with a unique eXp Realty integration for inside agents that leverages the rev-share model.

### Key Principles
- **Generous free tiers** for clients and inside agents
- **Time-gated** experience after 3 minutes for non-authenticated users
- **Usage-based** limits for free tiers
- **Rev-share model** for inside agents (eXp Realty)
- **Premium tiers** for outside agents and investors

---

## User Segments

### 1. General Users (Buyers & Sellers)
**Target:** People looking to buy, sell, or rent properties
**Monetization:** Freemium with daily limits

### 2. Investors
**Target:** Real estate investors analyzing multiple properties
**Monetization:** Paid tier for advanced analytics

### 3. Inside Agents (eXp Realty Sponsored)
**Target:** Agents joining under your eXp sponsorship
**Monetization:** Rev-share + optional premium add-ons

### 4. Outside Agents (Non-eXp)
**Target:** Agents from other brokerages
**Monetization:** Subscription + commission split

### 5. Teams
**Target:** Team leaders managing multiple agents
**Monetization:** Team subscription with per-seat pricing

---

## Pricing Tiers

### A. General Users (Buyers/Sellers)

#### Free Tier
**Price:** $0/month

**Limits:**
- 20 AI messages per day
- Map view only after message limit
- No CMA generation
- No neighborhood stats
- No saved favorites (requires account creation)
- Basic property search

**Time-Gating:**
- 3 minutes of unauthenticated browsing
- Prompt to create account to unlock features

#### Premium Client Tier
**Price:** $9.99/month (optional)

**Features:**
- Unlimited AI messages
- Full list and grid view access
- Save unlimited favorites
- Email property alerts
- Advanced search filters
- Neighborhood insights (coming soon)

---

### B. Investors

#### Investor Free Tier
**Price:** $0/month

**Limits:**
- 5 CMA generations per day
- 5 cash flow analyses per day
- 5 neighborhood stats requests per day
- Basic property search
- 20 AI messages per day

**Time-Gating:**
- 3 minutes of unauthenticated use
- Prompt to upgrade after hitting daily limits

#### Investor Pro
**Price:** $49/month

**Features:**
- Unlimited CMA generations
- Unlimited cash flow analysis
- Unlimited neighborhood stats
- Advanced investment metrics
- Market trend analysis
- Portfolio tracking (coming soon)
- Deal pipeline management (coming soon)
- Unlimited AI messages
- Priority support

#### Investor Enterprise
**Price:** $149/month

**Features:**
- Everything in Investor Pro
- API access for property data
- Bulk property analysis
- Custom reporting
- White-label CMA reports
- Dedicated account manager
- Advanced market forecasting (coming soon)

---

### C. Inside Agents (eXp Realty Sponsored)

#### Inside Agent Free Tier
**Price:** $0/month

**Revenue Model:** eXp Rev-Share
- 80/20 split until agent caps at $80,000 annual production
- 25% flat rate on referrals generated through platform

**Features:**
- Full CRM access (contacts, email, campaigns, messages)
- Basic AI message generation (100/month)
- Basic voicemail credits (50/month)
- Property search and CMA generation
- Campaign management
- Email/SMS integration
- Content management (CMS)
- Basic analytics

**Limits:**
- 100 AI message generations per month
- 50 voicemail drops per month
- 500 contacts maximum
- 5 active campaigns

#### Inside Agent Pro
**Price:** $99/month

**Revenue Model:** eXp Rev-Share + Subscription

**Features:**
- Everything in Free Tier
- 1,000 AI message generations per month
- 500 voicemail credits per month
- Unlimited contacts
- Unlimited campaigns
- Advanced analytics and reporting
- A/B testing for campaigns
- Custom email templates
- Priority AI processing
- API access

**Add-Ons:**
- Additional AI tokens: $20 per 500 tokens
- Additional voicemail credits: $30 per 100 credits
- Premium templates: $10/month

---

### D. Outside Agents (Non-eXp)

#### Outside Agent Tier
**Price:** $399/month

**Revenue Model:** Subscription + 10% commission split on deals closed through platform

**Features:**
- Full CRM access (contacts, email, campaigns, messages)
- 500 AI message generations per month
- 200 voicemail credits per month
- Unlimited contacts
- Unlimited campaigns
- Advanced analytics
- Lead generation tools
- Integration with external CRMs
- Email/SMS automation
- Content management
- Priority support

**Add-Ons:**
- Additional AI tokens: $30 per 500 tokens
- Additional voicemail credits: $50 per 100 credits
- White-label branding: $100/month
- API access: $200/month

#### Outside Agent Enterprise
**Price:** Custom (starts at $999/month)

**Revenue Model:** Subscription + 5% commission split

**Features:**
- Everything in Outside Agent Tier
- Unlimited AI generations
- Unlimited voicemail credits
- Custom integrations
- Dedicated account manager
- Custom branding
- Advanced API access
- Priority phone support
- Custom training sessions

---

### E. Teams

#### Team Starter
**Price:** $299/month (up to 5 agents)

**Features:**
- Everything in Inside Agent Free Tier (per agent)
- Team dashboard and analytics
- Shared contact pool
- Team campaign management
- Lead distribution system
- Team performance metrics

**Revenue Model:**
- eXp agents: Rev-share model applies per agent
- Non-eXp agents: 10% commission split per agent

#### Team Pro
**Price:** $799/month (up to 10 agents)

**Features:**
- Everything in Team Starter
- Advanced team analytics
- Custom team branding
- Bulk AI message generation (5,000/month shared)
- Bulk voicemail credits (2,000/month shared)
- Team training sessions
- Priority support

**Add-On:**
- Additional agent seat: $50/month per agent (eXp) or $150/month (non-eXp)

#### Team Enterprise
**Price:** Custom pricing

**Features:**
- Unlimited agents
- Custom integrations
- Dedicated account manager
- White-label platform
- Custom features development
- Advanced API access

---

## Time-Gating Strategy

### 3-Minute Timer for Unauthenticated Users

**Implementation:**
```typescript
// Track session start time
sessionStorage.setItem('session_start', Date.now());

// Check elapsed time on route changes and interactions
const elapsed = Date.now() - parseInt(sessionStorage.getItem('session_start'));
if (elapsed > 180000) { // 3 minutes
  showAuthPrompt();
}
```

**Trigger Points:**
- After 3 minutes of browsing
- When trying to save favorites
- When attempting to generate CMA
- When accessing neighborhood stats
- When viewing contact details in CRM (agents)

**Prompt Behavior:**
- Non-dismissible modal overlay
- Clear value proposition: "Create a free account to unlock full features"
- Social login options (Google, Facebook, Apple)
- Email/password registration
- "I'm an agent" vs "I'm looking for property" segmentation

---

## Feature Matrix

| Feature | General Free | General Premium | Investor Free | Investor Pro | Inside Agent Free | Inside Agent Pro | Outside Agent |
|---------|--------------|-----------------|---------------|--------------|-------------------|------------------|---------------|
| **Property Search** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Map View** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **List/Grid View** | After 20 msg | ✓ | After limits | ✓ | ✓ | ✓ | ✓ |
| **AI Messages** | 20/day | Unlimited | 20/day | Unlimited | 100/month | 1,000/month | 500/month |
| **Save Favorites** | ❌ (requires account) | ✓ | ❌ | ✓ | ✓ | ✓ | ✓ |
| **CMA Generation** | ❌ | ❌ | 5/day | Unlimited | ✓ | ✓ | ✓ |
| **Cash Flow Analysis** | ❌ | ❌ | 5/day | Unlimited | Limited | ✓ | ✓ |
| **Neighborhood Stats** | ❌ | ❌ | 5/day | Unlimited | ✓ | ✓ | ✓ |
| **CRM Access** | ❌ | ❌ | ❌ | ❌ | ✓ | ✓ | ✓ |
| **Email Campaigns** | ❌ | ❌ | ❌ | ❌ | ✓ | ✓ | ✓ |
| **SMS Messaging** | ❌ | ❌ | ❌ | ❌ | ✓ | ✓ | ✓ |
| **Voicemail Drops** | ❌ | ❌ | ❌ | ❌ | 50/month | 500/month | 200/month |
| **Analytics** | ❌ | ❌ | Basic | Advanced | Basic | Advanced | Advanced |
| **API Access** | ❌ | ❌ | ❌ | ❌ | ❌ | ✓ | Add-on |
| **Priority Support** | ❌ | ❌ | ❌ | ✓ | ❌ | ✓ | ✓ |

---

## Revenue Streams

### 1. Subscription Revenue

**Monthly Recurring Revenue (MRR) Projections:**

Assuming 1,000 total users across tiers:
- 500 General Users Free (conversion to premium: 5% = 25 users × $10 = $250)
- 100 Investor Free (conversion to Pro: 20% = 20 users × $49 = $980)
- 200 Inside Agents Free (conversion to Pro: 15% = 30 users × $99 = $2,970)
- 150 Outside Agents (× $399 = $59,850)
- 50 Teams (avg $500/team = $25,000)

**Total MRR:** ~$89,050
**Annual Recurring Revenue (ARR):** ~$1,068,600

### 2. eXp Rev-Share (Inside Agents)

**Assumptions:**
- 200 inside agents
- Average production: $40,000/year per agent
- 80/20 split = $8,000 per agent

**Annual Rev-Share Revenue:** $1,600,000

### 3. Commission Splits (Outside Agents)

**Assumptions:**
- 150 outside agents
- 10% commission split
- Average deals closed: $500,000 in volume per agent per year
- Average commission: 3% = $15,000
- Platform share: 10% = $1,500 per agent

**Annual Commission Revenue:** $225,000

### 4. Add-On Revenue

**Assumptions:**
- 30% of paid users purchase add-ons
- Average add-on spend: $30/month

**Monthly Add-On Revenue:** ~$750
**Annual Add-On Revenue:** $9,000

### Total Annual Revenue Potential

- Subscription Revenue: $1,068,600
- eXp Rev-Share: $1,600,000
- Commission Splits: $225,000
- Add-Ons: $9,000

**Total:** ~$2,902,600/year

---

## Implementation Plan

### Phase 1: User Segmentation & Time-Gating (Week 1-2)

1. **Create user type system**
   - Add `userType` field to User model
   - Values: `general`, `investor`, `inside_agent`, `outside_agent`, `team_leader`

2. **Implement time-gating**
   - Session timer for unauthenticated users
   - Auth prompt modal component
   - Redirect logic after 3 minutes

3. **Create registration flow**
   - User type selection during signup
   - Conditional onboarding based on type
   - eXp sponsorship code entry for inside agents

### Phase 2: Subscription Models (Week 3-4)

1. **Set up Stripe**
   - Create Stripe account
   - Add Stripe SDK to project
   - Configure webhook endpoints

2. **Create subscription plans in Stripe**
   - General Premium: $9.99/month
   - Investor Pro: $49/month
   - Investor Enterprise: $149/month
   - Inside Agent Pro: $99/month
   - Outside Agent: $399/month
   - Team Starter: $299/month
   - Team Pro: $799/month

3. **Database schema updates**
   - Add Subscription model
   - Add Usage model for tracking limits
   - Add billing fields to User model

### Phase 3: Usage Tracking (Week 5-6)

1. **Create usage tracking system**
   - AI message counter
   - CMA generation counter
   - Voicemail credit counter
   - Daily reset logic

2. **Implement feature gates**
   - Middleware to check subscription tier
   - Usage limit checks before feature access
   - Upgrade prompts when limits hit

3. **Create usage dashboard**
   - Show remaining credits
   - Usage history
   - Upgrade CTAs

### Phase 4: Billing & Checkout (Week 7-8)

1. **Pricing page**
   - Tier comparison table
   - Feature matrix
   - CTA buttons for each tier

2. **Stripe checkout integration**
   - Checkout session creation
   - Success/cancel redirects
   - Subscription confirmation emails

3. **Billing portal**
   - View current plan
   - Manage payment methods
   - Download invoices
   - Cancel/upgrade subscription

### Phase 5: eXp Integration (Week 9-10)

1. **eXp sponsorship system**
   - Sponsorship code validation
   - Rev-share tracking
   - Commission split calculator

2. **Agent onboarding**
   - eXp agent verification
   - Production tracking
   - Cap monitoring ($80,000 threshold)

3. **Referral system**
   - Referral link generation
   - 25% flat rate tracking
   - Payout automation

### Phase 6: Testing & Launch (Week 11-12)

1. **Test all payment flows**
   - Successful payments
   - Failed payments
   - Webhook handling
   - Subscription changes

2. **Load testing**
   - Concurrent users
   - Payment processing
   - Usage tracking accuracy

3. **Launch beta**
   - Invite-only for inside agents
   - Monitor metrics
   - Gather feedback
   - Iterate

---

## Database Schema

### User Model Updates

```typescript
interface User {
  // Existing fields...
  userType: 'general' | 'investor' | 'inside_agent' | 'outside_agent' | 'team_leader';
  subscriptionTier: 'free' | 'premium' | 'pro' | 'enterprise';
  subscriptionStatus: 'active' | 'past_due' | 'canceled' | 'trialing';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;

  // eXp specific
  isExpAgent: boolean;
  expSponsorCode?: string;
  annualProduction?: number; // Track for rev-share cap
  hasCapped: boolean; // $80,000 production cap

  // Commission tracking
  commissionSplit?: number; // 10% for outside agents, 25% for referrals

  // Team
  teamId?: string;
  teamRole?: 'leader' | 'member';

  // Billing
  billingEmail?: string;
  billingAddress?: Address;
  paymentMethodId?: string;
}
```

### Subscription Model

```typescript
interface Subscription {
  _id: string;
  userId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
  tier: 'premium' | 'pro' | 'enterprise';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Usage Model

```typescript
interface Usage {
  _id: string;
  userId: string;
  period: string; // YYYY-MM or YYYY-MM-DD for daily limits

  // AI Usage
  aiMessagesUsed: number;
  aiMessagesLimit: number;

  // Investor Features
  cmaGenerationsUsed: number;
  cmaGenerationsLimit: number;
  cashFlowAnalysesUsed: number;
  cashFlowAnalysesLimit: number;
  neighborhoodStatsUsed: number;
  neighborhoodStatsLimit: number;

  // Agent Features
  voicemailCreditsUsed: number;
  voicemailCreditsLimit: number;

  // Contacts
  totalContacts: number;
  contactsLimit: number;

  // Campaigns
  activeCampaigns: number;
  campaignsLimit: number;

  createdAt: Date;
  updatedAt: Date;
}
```

### Revenue Model

```typescript
interface Revenue {
  _id: string;
  userId: string;
  type: 'subscription' | 'rev_share' | 'commission_split' | 'add_on';
  amount: number;
  currency: 'USD';

  // For rev-share and commission tracking
  dealAmount?: number;
  splitPercentage?: number;

  // Stripe
  stripeInvoiceId?: string;
  stripePaymentIntentId?: string;

  status: 'pending' | 'paid' | 'failed' | 'refunded';
  paidAt?: Date;
  createdAt: Date;
}
```

---

## Next Steps

1. **Research eXp Realty API** - Determine if there's an API for production tracking and rev-share automation
2. **Create Stripe account** - Set up test and production environments
3. **Design pricing page UI** - Create mockups for tier comparison
4. **Implement time-gating** - Build session timer and auth prompt
5. **Build usage tracking** - Create middleware for feature gates
6. **Test payment flows** - Ensure smooth checkout experience

---

**Last Updated:** January 17, 2026
**Status:** Planning Phase
**Next Review:** After Phase 1 completion
