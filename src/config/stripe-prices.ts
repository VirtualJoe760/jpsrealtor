// src/config/stripe-prices.ts
// Stripe price IDs and tier details for subscription system
//
// Agent tiers (with marketing credits):
//   Beginner     $125/mo  →  750 pts  → $93.75 ad spend  (25% margin)
//   Experienced  $500/mo  → 3,200 pts → $400 ad spend    (20% margin)
//   Top Agent  $1,000/mo  → 6,800 pts → $850 ad spend    (15% margin)
//
// General user tier (no points):
//   Pro  $9.99/mo  → premium search features only

import type { SubscriptionTier, BillingInterval } from "@/models/AgentSubscription";

// ---------------------------------------------------------------------------
// Price ID mapping — replace placeholders with real Stripe Price IDs after
// creating products in the Stripe Dashboard.
// ---------------------------------------------------------------------------

// Agent subscription price IDs (monthly only for now)
export const STRIPE_PRICES: Record<
  Exclude<SubscriptionTier, "free">,
  Record<BillingInterval, string>
> = {
  beginner: {
    monthly: "price_1TPWCVGI9m3f5P10CfXu4rB6",
    annual: "price_PLACEHOLDER_beginner_annual",
  },
  experienced: {
    monthly: "price_1TPWDIGI9m3f5P10Essx6Kh1",
    annual: "price_PLACEHOLDER_experienced_annual",
  },
  topagent: {
    monthly: "price_1TPWEKGI9m3f5P10pj771Lmx",
    annual: "price_PLACEHOLDER_topagent_annual",
  },
};

// General user Pro subscription (no points, just premium features)
export const USER_PRO_PRICE_ID = "price_1SW75eGI9m3f5P10p8Ht99dn";

// Add Credits product price (one-time purchase, variable amount)
export const CREDITS_TOPUP_PRICE_ID = "price_1TPXKIGI9m3f5P10OYemYKxu";

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
    name: "Beginner",
    tier: "beginner",
    monthlyPrice: 125,
    annualPrice: 1200,
    description: "Launch your real estate marketing with 750 credits/month for Google Ads, Meta Ads, direct mail, and voicemail drops",
    monthlyPoints: 750,
    adSpendValue: 93.75,
    marginPercent: 25,
    features: [
      "750 marketing credits/month",
      "Google & Meta Ads campaigns",
      "Direct mail campaigns",
      "Voicemail drops",
      "Partner cost-splitting",
      "Basic analytics",
      "50 gallery photos",
      "5 custom pages",
      "Email support",
    ],
  },
  experienced: {
    name: "Experienced",
    tier: "experienced",
    monthlyPrice: 500,
    annualPrice: 4800,
    description: "Scale your business with 3,200 credits/month, better rates, and advanced campaign tools",
    monthlyPoints: 3200,
    adSpendValue: 400,
    marginPercent: 20,
    highlighted: true,
    features: [
      "3,200 marketing credits/month",
      "Better point rate ($0.80/$1 ad spend)",
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
    description: "Maximum ROI for top producers — 6,800 credits/month at the best rate with white-glove service",
    monthlyPoints: 6800,
    adSpendValue: 850,
    marginPercent: 15,
    features: [
      "6,800 marketing credits/month",
      "Best point rate ($0.85/$1 ad spend)",
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
