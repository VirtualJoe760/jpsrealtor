// src/config/credits.ts
// UNIFIED CREDITS CONFIG — single source of truth for all credit math.
//
// Model:
//   1 credit = $0.10 of platform-side spend value (universal — ads, mail, voicemail).
//   Markup happens at PURCHASE (subscription / top-up), not at SPEND.
//
//   Tier purchase rates (markup applied per tier):
//     Beginner     25% → $0.125 per credit → $125  buys 1,000 credits
//     Experienced  20% → $0.120 per credit → $500  buys 4,167 credits
//     Top Agent    15% → $0.115 per credit → $1000 buys 8,696 credits
//     Custom top-ups (>$999): treated as Top Agent rate (15%).
//
// All conversion helpers live here. Operations (debit/credit/balance) live
// in src/lib/credits.ts.

import type { MailType } from "@/lib/thanksio";

// ---------------------------------------------------------------------------
// Core constants
// ---------------------------------------------------------------------------

/** Universal dollar value unlocked by 1 credit at spend time. */
export const CREDIT_SPEND_VALUE = 0.10;

/** Credits required per $1 of platform-side spend. */
export const CREDITS_PER_SPEND_DOLLAR = 1 / CREDIT_SPEND_VALUE; // 10

/** Legacy alias retained for back-compat with existing imports. */
export const AD_SPEND_CREDITS_PER_DOLLAR = CREDITS_PER_SPEND_DOLLAR;

/** Legacy alias for what 1 credit is worth in ad spend. */
export const CREDIT_AD_VALUE = CREDIT_SPEND_VALUE;

// ---------------------------------------------------------------------------
// Subscription / top-up tier purchase rates
// ---------------------------------------------------------------------------

export type CreditTier = "beginner" | "experienced" | "topagent";

export interface CreditTierConfig {
  name: string;
  tier: CreditTier;
  monthlyPrice: number;
  monthlyCredits: number;
  markup: number;            // 0.25 = 25% markup
  costPerCredit: number;     // dollars the agent pays per credit at this tier
  spendValuePerCredit: number; // always CREDIT_SPEND_VALUE
}

const tier = (name: string, t: CreditTier, monthlyPrice: number, markup: number, monthlyCredits: number): CreditTierConfig => ({
  name,
  tier: t,
  monthlyPrice,
  monthlyCredits,
  markup,
  costPerCredit: CREDIT_SPEND_VALUE * (1 + markup),
  spendValuePerCredit: CREDIT_SPEND_VALUE,
});

export const CREDIT_TIERS: Record<CreditTier, CreditTierConfig> = {
  beginner:    tier("Beginner",    "beginner",    125,  0.25, 1000),
  experienced: tier("Experienced", "experienced", 500,  0.20, 4167),
  topagent:    tier("Top Agent",   "topagent",    1000, 0.15, 8696),
};

/** Markup rate applied to custom top-ups above $999. */
export const CUSTOM_TOPUP_MARKUP = 0.15;

// ---------------------------------------------------------------------------
// Per-piece spend costs (derived under $0.10/credit, ceil-rounded)
// Actual platform costs from Thanks.io / Drop Cowboy in comments.
// ---------------------------------------------------------------------------

export const DIRECT_MAIL_CREDITS: Record<MailType, number> = {
  postcard_4x6:  7,   // $0.65 actual → ceil(6.5) = 7
  postcard_6x9:  8,   // $0.72 actual → ceil(7.2) = 8
  postcard_6x11: 10,  // $0.93 actual → ceil(9.3) = 10
  letter:        10,  // $0.96 actual → ceil(9.6) = 10
  notecard:      17,  // $1.66 actual → ceil(16.6) = 17
};

/** Radius address lookup cost per record */
export const RADIUS_LOOKUP_CREDITS = 1; // $0.05 actual → 1 credit (rounded up from 0.5)

/** Data append (phone + email) cost per record */
export const DATA_APPEND_CREDITS = 2; // $0.20 actual → 2 credits

/** Voicemail drop per contact */
export const VOICEMAIL_DROP_CREDITS = 1; // $0.10 actual → 1 credit

// ---------------------------------------------------------------------------
// Messaging (Twilio SMS) + Email (Resend) — per-agent activation + metered use
// Flat setup fees (platform absorbs the underlying vendor bills); usage is
// metered in FRACTIONAL credits at ~vendor cost (markup already taken at purchase).
// ---------------------------------------------------------------------------

/** Flat one-time charge to activate per-agent text messaging (number + A2P). */
export const MESSAGING_SETUP_CREDITS = 250; // ~$25

/** Flat one-time charge to activate per-agent email sending (verified domain). */
export const EMAIL_SETUP_CREDITS = 100; // ~$10

/** Metered cost per SMS segment (~$0.0079 vendor → 0.10 credit ≈ $0.01). */
export const SMS_SEND_CREDITS = 0.10;

/** Metered cost per outbound email (~$0.0004 vendor → 0.02 credit ≈ $0.002). */
export const EMAIL_SEND_CREDITS = 0.02;

/** Estimate SMS segments for a message body (GSM-7 160/seg, Unicode 70/seg). */
export function smsSegments(body: string): number {
  const text = body || "";
  const per = [...text].some((c) => c.charCodeAt(0) > 127) ? 70 : 160;
  return Math.max(1, Math.ceil(text.length / per));
}

/** Fractional credits to send one SMS of the given body. */
export function estimateSmsCredits(body: string): number {
  return Math.round(smsSegments(body) * SMS_SEND_CREDITS * 1000) / 1000;
}

// ---------------------------------------------------------------------------
// Conversion helpers — SPEND side (universal $0.10/credit)
// ---------------------------------------------------------------------------

/** Credits required to cover a dollar amount of platform spend (rounds up). */
export function dollarsToCredits(dollars: number): number {
  return Math.ceil(dollars / CREDIT_SPEND_VALUE);
}

/** Dollar spend value of a credit balance. */
export function creditsToDollars(credits: number): number {
  return Math.round(credits * CREDIT_SPEND_VALUE * 100) / 100;
}

/** Daily ad budget (dollars) → credits over `days` days. */
export function adBudgetToCredits(dailyBudgetDollars: number, days: number = 1): number {
  return CREDITS_PER_SPEND_DOLLAR * dailyBudgetDollars * days;
}

// ---------------------------------------------------------------------------
// Conversion helpers — PURCHASE side (tier-dependent markup)
// ---------------------------------------------------------------------------

/** Credits granted for a given dollar purchase at a given tier. */
export function creditsForPurchase(dollars: number, t: CreditTier): number {
  return Math.floor(dollars / CREDIT_TIERS[t].costPerCredit);
}

/** Dollar price for a number of credits at a given tier. */
export function purchasePriceForCredits(credits: number, t: CreditTier): number {
  return Math.round(credits * CREDIT_TIERS[t].costPerCredit * 100) / 100;
}

/** Effective markup for a top-up amount (custom rate kicks in above $999). */
export function topUpMarkup(dollars: number, baseTier: CreditTier): number {
  if (dollars > 999) return CUSTOM_TOPUP_MARKUP;
  return CREDIT_TIERS[baseTier].markup;
}

// ---------------------------------------------------------------------------
// Operation cost estimators (used by /api/credits/quote and wizards)
// ---------------------------------------------------------------------------

export function estimateDirectMailCredits(
  mailType: MailType,
  recipientCount: number,
  options?: { radiusSearch?: boolean; appendData?: boolean }
): number {
  const perPiece = DIRECT_MAIL_CREDITS[mailType];
  let total = perPiece * recipientCount;
  if (options?.radiusSearch) total += RADIUS_LOOKUP_CREDITS * recipientCount;
  if (options?.appendData)   total += DATA_APPEND_CREDITS   * recipientCount;
  return total;
}

export function estimateVoicemailCredits(contactCount: number): number {
  return VOICEMAIL_DROP_CREDITS * contactCount;
}

// ---------------------------------------------------------------------------
// Display labels — for UI
// ---------------------------------------------------------------------------

export const DIRECT_MAIL_LABELS: Record<MailType, { label: string; credits: number; description: string }> = {
  postcard_4x6:  { label: "Postcard (4x6)",       credits: DIRECT_MAIL_CREDITS.postcard_4x6,  description: "Standard postcard — great for just listed/sold" },
  postcard_6x9:  { label: "Postcard (6x9)",       credits: DIRECT_MAIL_CREDITS.postcard_6x9,  description: "Large postcard — ideal for CMA reports and highlights" },
  postcard_6x11: { label: "Postcard (6x11)",      credits: DIRECT_MAIL_CREDITS.postcard_6x11, description: "Oversized postcard — maximum visual impact" },
  letter:        { label: "Letter",                credits: DIRECT_MAIL_CREDITS.letter,        description: "Printed letter in envelope — detailed CMA, personal outreach" },
  notecard:      { label: "Handwritten Notecard", credits: DIRECT_MAIL_CREDITS.notecard,      description: "Simulated handwriting — thank you notes, follow-ups" },
};
