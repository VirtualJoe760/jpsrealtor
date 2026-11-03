// src/config/site-setup.ts
// The $300 custom-site setup (site-platform plan P5 / decision D7): a one-time
// fee, sold only to agents with an ACTIVE paid Basic subscription. Joseph builds
// the site with Claude acting on the agent's account. Docs: docs/commerce/site-setup.md.

/** One-time price in cents. */
export const SITE_SETUP_PRICE_CENTS = 30000;
export const SITE_SETUP_PRODUCT_NAME = "ChatRealty custom site setup";
export const SITE_SETUP_DESCRIPTION =
  "One-time setup: a custom website built for you with Claude on your ChatRealty account.";

/**
 * Optional pre-created Stripe Price (one-time, $300). When unset, checkout
 * uses inline price_data with the amount above, so no Stripe product has to
 * exist in either mode before launch.
 */
export const SITE_SETUP_PRICE_ID = process.env.STRIPE_PRICE_SITE_SETUP || "";

/** Subscription tiers that may buy a setup (Basic = internal key "beginner"). */
export const SITE_SETUP_ELIGIBLE_TIERS = ["beginner"] as const;

/** Checkout metadata type — the webhook routes on this. */
export const SITE_SETUP_CHECKOUT_TYPE = "site_setup";

export const SITE_SETUP_STYLES = [
  { id: "modern", label: "Modern & minimal" },
  { id: "luxury", label: "Luxury" },
  { id: "classic", label: "Classic & warm" },
  { id: "bold", label: "Bold & colorful" },
  { id: "coastal", label: "Coastal / desert / resort" },
  { id: "other", label: "Something else (describe below)" },
] as const;

export type SiteSetupStatus =
  | "awaiting_payment" // checkout created, not paid
  | "intake_pending"   // paid, waiting for the agent's intake form
  | "intake_received"  // ready for Joseph to start
  | "in_progress"      // being built
  | "live"             // handed off ("your site is live" email sent)
  | "refunded"
  | "cancelled";

/** Statuses an admin can move an order to by hand. */
export const SITE_SETUP_ADMIN_STATUSES: SiteSetupStatus[] = [
  "intake_pending",
  "intake_received",
  "in_progress",
  "live",
  "cancelled",
];
