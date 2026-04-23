// src/config/stripe-prices.ts
// Stripe price IDs and tier details for subscription system

import type { SubscriptionTier, BillingInterval } from "@/models/AgentSubscription";

// ---------------------------------------------------------------------------
// Price ID mapping — replace placeholders with real Stripe Price IDs after
// creating products in the Stripe Dashboard (or via API / Stripe CLI fixtures).
// ---------------------------------------------------------------------------

export const STRIPE_PRICES: Record<
  Exclude<SubscriptionTier, "free">,
  Record<BillingInterval, string>
> = {
  starter: {
    monthly: "price_PLACEHOLDER_starter_monthly",
    annual: "price_PLACEHOLDER_starter_annual",
  },
  professional: {
    monthly: "price_PLACEHOLDER_pro_monthly",
    annual: "price_PLACEHOLDER_pro_annual",
  },
  enterprise: {
    monthly: "price_PLACEHOLDER_enterprise_monthly",
    annual: "price_PLACEHOLDER_enterprise_annual",
  },
};

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
  annualPrice: number; // total annual (not per-month)
  description: string;
  features: string[];
  highlighted?: boolean; // mark "most popular" in UI
}

export const TIER_DETAILS: Record<SubscriptionTier, TierDetail> = {
  free: {
    name: "Free",
    tier: "free",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Get started with a basic agent profile",
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
  starter: {
    name: "Starter",
    tier: "starter",
    monthlyPrice: 49,
    annualPrice: 470,
    description: "Everything you need to build your online presence",
    features: [
      "Everything in Free",
      "50 gallery photos",
      "3 videos",
      "5 custom pages",
      "Custom backgrounds",
      "Blog posts",
      "Representation agreements",
      "Analytics dashboard",
      "Email support",
    ],
  },
  professional: {
    name: "Professional",
    tier: "professional",
    monthlyPrice: 99,
    annualPrice: 950,
    description: "Full-featured platform for serious agents",
    highlighted: true,
    features: [
      "Everything in Starter",
      "Custom domain",
      "200 gallery photos",
      "10 videos",
      "20 custom pages",
      "Data export",
      "API access",
      "Priority support",
    ],
  },
  enterprise: {
    name: "Enterprise",
    tier: "enterprise",
    monthlyPrice: 299,
    annualPrice: 2870,
    description: "For top producers and teams",
    features: [
      "Everything in Professional",
      "Unlimited photos (999)",
      "50 videos",
      "100 custom pages",
      "Webhooks",
      "Dedicated support",
      "Custom integrations",
    ],
  },
};

// Feature keys that map to the AgentSubscription.features object
export type FeatureKey = keyof TierDetail["features"] extends never
  ? string
  : string;
