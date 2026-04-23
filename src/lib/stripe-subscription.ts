// src/lib/stripe-subscription.ts
// Stripe subscription utility library — customer management, checkout, portal,
// feature gates, and subscription lifecycle helpers.

import Stripe from "stripe";
import { STRIPE_PRICES, tierFromPriceId } from "@/config/stripe-prices";
import type { SubscriptionTier, BillingInterval } from "@/models/AgentSubscription";

// ---------------------------------------------------------------------------
// Stripe SDK — lazy singleton (same pattern as stripe-identity.ts)
// ---------------------------------------------------------------------------

let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not defined");
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
    });
  }
  return stripe;
}

export { getStripe };

// ---------------------------------------------------------------------------
// Customer management
// ---------------------------------------------------------------------------

/**
 * Create a Stripe customer for the given user, or return the existing
 * customer ID stored on their AgentSubscription document.
 */
export async function createOrGetStripeCustomer(user: {
  _id: string;
  email: string;
  name?: string;
  stripeCustomerId?: string; // from AgentSubscription
}): Promise<string> {
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const s = getStripe();
  const customer = await s.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { userId: user._id.toString() },
  });

  return customer.id;
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export async function createCheckoutSession(opts: {
  userId: string;
  customerId: string;
  tier: Exclude<SubscriptionTier, "free">;
  billingInterval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
}): Promise<Stripe.Checkout.Session> {
  const s = getStripe();
  const priceId = STRIPE_PRICES[opts.tier][opts.billingInterval];

  const params: Stripe.Checkout.SessionCreateParams = {
    customer: opts.customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    metadata: {
      userId: opts.userId,
      tier: opts.tier,
      billingInterval: opts.billingInterval,
    },
    subscription_data: {
      metadata: {
        userId: opts.userId,
        tier: opts.tier,
        billingInterval: opts.billingInterval,
      },
      ...(opts.trialDays ? { trial_period_days: opts.trialDays } : {}),
    },
    allow_promotion_codes: true,
  };

  return s.checkout.sessions.create(params);
}

// ---------------------------------------------------------------------------
// Customer Portal
// ---------------------------------------------------------------------------

export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const s = getStripe();
  return s.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

// ---------------------------------------------------------------------------
// Subscription read / update / cancel
// ---------------------------------------------------------------------------

export async function getSubscriptionDetails(subscriptionId: string) {
  const s = getStripe();
  const sub = await s.subscriptions.retrieve(subscriptionId, {
    expand: ["default_payment_method", "latest_invoice"],
  });

  const priceId =
    sub.items.data[0]?.price?.id ?? "";
  const mapped = tierFromPriceId(priceId);

  return {
    id: sub.id,
    status: sub.status,
    tier: mapped?.tier ?? null,
    billingInterval: mapped?.interval ?? null,
    currentPeriodStart: new Date((sub.items.data[0]?.current_period_start ?? sub.start_date) * 1000),
    currentPeriodEnd: new Date((sub.items.data[0]?.current_period_end ?? sub.start_date) * 1000),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null,
    priceId,
    raw: sub,
  };
}

export async function cancelSubscription(
  subscriptionId: string,
  immediately = false
): Promise<Stripe.Subscription> {
  const s = getStripe();
  if (immediately) {
    return s.subscriptions.cancel(subscriptionId);
  }
  // Cancel at end of current period
  return s.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

export async function updateSubscription(
  subscriptionId: string,
  newPriceId: string
): Promise<Stripe.Subscription> {
  const s = getStripe();
  const sub = await s.subscriptions.retrieve(subscriptionId);
  const itemId = sub.items.data[0]?.id;

  if (!itemId) {
    throw new Error("No subscription item found");
  }

  return s.subscriptions.update(subscriptionId, {
    items: [{ id: itemId, price: newPriceId }],
    proration_behavior: "create_prorations",
  });
}

// ---------------------------------------------------------------------------
// Feature gate
// ---------------------------------------------------------------------------

type FeatureFlag =
  | "customDomain"
  | "subdomain"
  | "customBackgrounds"
  | "blogPosts"
  | "testimonials"
  | "leadCapture"
  | "agentMatching"
  | "representationAgreements"
  | "analytics"
  | "exportData"
  | "apiAccess"
  | "webhooks";

/**
 * Check if a user has access to a boolean feature based on their
 * AgentSubscription record.  Requires a pre-loaded subscription doc
 * (to avoid coupling this module to mongoose directly).
 */
export function checkFeatureAccess(
  features: Record<string, unknown> | null | undefined,
  feature: FeatureFlag
): boolean {
  if (!features) return false;
  return Boolean(features[feature]);
}

/**
 * Convenience wrapper that loads the subscription from the DB and checks.
 * Import AgentSubscription model at call-site to keep this lib decoupled.
 */
export async function checkFeatureAccessForUser(
  userId: string,
  feature: FeatureFlag,
  AgentSubscription: {
    findOne: (q: Record<string, unknown>) => Promise<{ features?: Record<string, unknown> } | null>;
  }
): Promise<boolean> {
  const sub = await AgentSubscription.findOne({
    agentId: userId,
    status: { $in: ["active", "trialing"] },
  });
  return checkFeatureAccess(sub?.features, feature);
}
