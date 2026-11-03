// src/config/affiliates.ts
// Single source of truth for the affiliate program's money and timing rules.
// Change numbers here, never in the routes. Docs: docs/commerce/affiliates.md.
//
// Decided by Joseph 2026-11-02:
// - Flat $ per agent per month, every month the agent keeps paying.
// - Tier is set by the affiliate's count of CURRENTLY PAYING agents (churn
//   lowers it), and the tier rate applies to ALL of their paying agents.
// - Subscriptions only — never credit top-ups, marketing spend, or anything
//   tied to a real-estate transaction, lead or closing (DRE + RESPA §8).
// - Attribution: 90-day cookie, last click wins (A4).
// - Payouts: monthly, $50 minimum, commissions payable 30 days after the
//   agent's payment (A6).

export interface AffiliateTier {
  /** Inclusive lower bound of currently paying agents. */
  minAgents: number;
  /** Dollars per paying agent per month. */
  ratePerAgent: number;
  label: string;
}

/** Ascending by minAgents. The last tier whose minAgents <= count applies. */
export const AFFILIATE_TIERS: AffiliateTier[] = [
  { minAgents: 1, ratePerAgent: 5, label: "1–9 agents" },
  { minAgents: 10, ratePerAgent: 8, label: "10–24 agents" },
  { minAgents: 25, ratePerAgent: 12, label: "25–49 agents" },
  { minAgents: 50, ratePerAgent: 15, label: "50–99 agents" },
  { minAgents: 100, ratePerAgent: 20, label: "100–199 agents" },
  { minAgents: 200, ratePerAgent: 25, label: "200+ agents" },
];

/** Cookie that carries the affiliate code from the link click to signup/checkout. */
export const AFFILIATE_COOKIE = "cr_aff";
/** How long a click stays attributable. */
export const ATTRIBUTION_WINDOW_DAYS = 90;
/** "last": a newer click replaces an older one. "first": the first click sticks. */
export const ATTRIBUTION_MODEL: "first" | "last" = "last";

/** Days after the agent's payment before a commission can be paid out (refund window). */
export const REFUND_HOLD_DAYS = 30;
/** Minimum payable balance (dollars) before a transfer is sent; smaller balances roll over. */
export const PAYOUT_MINIMUM_USD = 50;
/** Day of the month payouts run (the cron runs daily and only transfers on this day). */
export const PAYOUT_DAY_OF_MONTH = 15;

/** The query parameter on affiliate links: https://chatrealty.io/?ref=CODE */
export const AFFILIATE_QUERY_PARAM = "ref";
export const AFFILIATE_LINK_BASE = "https://chatrealty.io";

/** Bump when the terms page changes materially; applicants record the version they accepted. */
export const AFFILIATE_TERMS_VERSION = "2026-11-02";

/** Codes: 4–20 chars, A–Z 0–9 and dashes. Stored uppercase. */
export const AFFILIATE_CODE_RE = /^[A-Z0-9][A-Z0-9-]{2,18}[A-Z0-9]$/;

export function normalizeAffiliateCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toUpperCase();
  return AFFILIATE_CODE_RE.test(code) ? code : null;
}

export function affiliateLink(code: string): string {
  return `${AFFILIATE_LINK_BASE}/?${AFFILIATE_QUERY_PARAM}=${encodeURIComponent(code)}`;
}

/** Tier for a count of currently paying agents; null when the count is 0. */
export function tierForCount(payingAgents: number): AffiliateTier | null {
  let match: AffiliateTier | null = null;
  for (const t of AFFILIATE_TIERS) if (payingAgents >= t.minAgents) match = t;
  return match;
}

/** Per-agent monthly rate in dollars, honoring an admin override when set. */
export function rateForCount(payingAgents: number, rateOverride?: number | null): number {
  if (typeof rateOverride === "number" && rateOverride >= 0) return rateOverride;
  return tierForCount(payingAgents)?.ratePerAgent ?? 0;
}
