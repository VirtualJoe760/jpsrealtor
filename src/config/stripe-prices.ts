// src/config/stripe-prices.ts
// Stripe price IDs and tier details for subscription system.
//
// Credit math is derived from src/config/credits.ts (1 credit = $0.10 spend).
// Markup is applied at PURCHASE time, not at spend.
//
// Agent tiers (with marketing credits):
//   Basic        $125/mo  → platform access only; credits bought separately
//                          via top-up at $0.125/credit (25% markup)
//   Experienced  $500/mo  → 4,167 credits → $416.70 ad spend (20% markup)
//   Top Agent  $1,000/mo  → 8,696 credits → $869.60 ad spend (15% markup)
//
// General user tier (no credits):
//   Pro  $9.99/mo  → premium search features only

import type { SubscriptionTier, BillingInterval } from "@/models/AgentSubscription";

// ---------------------------------------------------------------------------
// Price ID mapping — replace placeholders with real Stripe Price IDs after
// creating products in the Stripe Dashboard.
// ---------------------------------------------------------------------------

// Agent subscription price IDs. Env-overridable so going LIVE is a pure env
// change (set STRIPE_PRICE_* in prod to the live price IDs) with no code edit;
// falls back to the current TEST-mode IDs. The reverse-lookup below is built
// from whatever is active, so tierFromPriceId() resolves live IDs automatically.
export const STRIPE_PRICES: Record<
  Exclude<SubscriptionTier, "free">,
  Record<BillingInterval, string>
> = {
  beginner: {
    monthly: process.env.STRIPE_PRICE_BEGINNER_MONTHLY || "price_1TPWCVGI9m3f5P10CfXu4rB6",
    annual: process.env.STRIPE_PRICE_BEGINNER_ANNUAL || "price_PLACEHOLDER_beginner_annual",
  },
  experienced: {
    monthly: process.env.STRIPE_PRICE_EXPERIENCED_MONTHLY || "price_1TPWDIGI9m3f5P10Essx6Kh1",
    annual: process.env.STRIPE_PRICE_EXPERIENCED_ANNUAL || "price_PLACEHOLDER_experienced_annual",
  },
  topagent: {
    monthly: process.env.STRIPE_PRICE_TOPAGENT_MONTHLY || "price_1TPWEKGI9m3f5P10pj771Lmx",
    annual: process.env.STRIPE_PRICE_TOPAGENT_ANNUAL || "price_PLACEHOLDER_topagent_annual",
  },
};

// Plans currently for sale. Since 2026-10-28 ChatRealty sells ONE plan —
// Basic, $125/month (internal tier key "beginner", kept so existing
// subscriptions, ledgers and credit math are untouched). Experienced and Top
// Agent stay defined so old records still resolve, but every plan picker and
// /api/stripe/checkout read this list, and only a monthly LIVE price exists.
export const SELLABLE_TIERS: Exclude<SubscriptionTier, "free">[] = ["beginner"];
export const SELLABLE_INTERVALS: BillingInterval[] = ["monthly"];

// General user Pro subscription (no points, just premium features)
export const USER_PRO_PRICE_ID = process.env.USER_PRO_STRIPE_PRICE_ID || "price_1SW75eGI9m3f5P10p8Ht99dn";

// Add Credits product price (one-time purchase, variable amount)
export const CREDITS_TOPUP_PRICE_ID = process.env.STRIPE_PRICE_CREDITS_TOPUP || "price_1TPXKIGI9m3f5P10OYemYKxu";

// Reverse lookup — given a Stripe price ID, return { tier, interval }
const priceToTierMap = new Map<string, { tier: Exclude<SubscriptionTier, "free">; interval: BillingInterval }>();
for (const [tier, intervals] of Object.entries(STRIPE_PRICES)) {
  for (const [interval, priceId] of Object.entries(intervals)) {
    priceToTierMap.set(priceId, {
      tier: tier as Exclude<SubscriptionTier, "free">,
      interval: interval as BillingInterval,
    });
  }
}

export function tierFromPriceId(priceId: string) {
  return priceToTierMap.get(priceId) ?? null;
}

// ---------------------------------------------------------------------------
// Tier details for pricing UI and feature-gate logic
// ---------------------------------------------------------------------------

export interface TierDetail {
  name: string;
  tier: SubscriptionTier;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: string[];
  monthlyPoints: number;       // Points included per month
  adSpendValue: number;        // Dollar value of ad spend included
  marginPercent: number;       // Platform margin percentage
  highlighted?: boolean;
}

export const TIER_DETAILS: Record<SubscriptionTier, TierDetail> = {
  free: {
    name: "Free",
    tier: "free",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Get started with a basic agent profile",
    monthlyPoints: 0,
    adSpendValue: 0,
    marginPercent: 0,
    features: [
      "Subdomain (agent.chatrealty.io)",
      "10 gallery photos",
      "1 video",
      "1 custom page",
      "Lead capture",
      "Agent matching",
      "Community support",
    ],
  },
  beginner: {
    name: "Basic",
    tier: "beginner",
    monthlyPrice: 125,
    annualPrice: 1200,
    description: "Full access to the ChatRealty platform — your website, CRM and AI tools.",
    // Platform access only (2026-10-28). Credits are a separate purchase; the
    // grant paths read CREDIT_TIERS.beginner.monthlyCredits, which is 0.
    monthlyPoints: 0,
    adSpendValue: 0,
    marginPercent: 25,
    features: [
      "Your own agent website with live MLS search",
      "CRM: contacts, inbox and follow-up",
      "AI tools: on-demand CMAs and cash-flow analysis",
      "Lead capture",
      "Analytics",
      "50 gallery photos · 5 custom pages",
      "Email support",
      // Campaigns/credits are off for agents until they launch
      // (src/config/feature-access.ts, CREDITS_FOR_SALE) — don't advertise them.
    ],
  },
  experienced: {
    name: "Experienced",
    tier: "experienced",
    monthlyPrice: 500,
    annualPrice: 4800,
    description: "Scale your business with 4,167 credits/month, better rates, and advanced campaign tools",
    monthlyPoints: 4167,
    adSpendValue: 416.7,
    marginPercent: 20,
    highlighted: true,
    features: [
      "4,167 marketing credits/month",
      "Better credit value per dollar",
      "Priority ad placement",
      "Advanced campaign analytics",
      "Custom audience targeting",
      "Unlimited partnerships",
      "Custom domain",
      "200 gallery photos",
      "20 custom pages",
      "Priority support",
    ],
  },
  topagent: {
    name: "Top Agent",
    tier: "topagent",
    monthlyPrice: 1000,
    annualPrice: 9600,
    description: "Maximum ROI for top producers — 8,696 credits/month at the best rate with white-glove service",
    monthlyPoints: 8696,
    adSpendValue: 869.6,
    marginPercent: 15,
    features: [
      "8,696 marketing credits/month",
      "Best credit value per dollar",
      "White-glove campaign management",
      "Custom reporting & dashboards",
      "API access",
      "Unlimited photos & videos",
      "100 custom pages",
      "Webhooks",
      "Dedicated support",
    ],
  },
};
