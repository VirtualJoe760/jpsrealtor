// src/config/credit-costs.ts
// Unified credit cost table for all campaign channels.
//
// 1 credit = $0.125 in ad-spend value.
// Dollar costs are converted to credits by rounding up:
//   credits = Math.ceil(dollarCost / 0.125)
//
// The slight rounding surplus is additional platform margin on top of
// the subscription tier markup (15-25%).

import type { MailType } from "@/lib/thanksio";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Dollar value of 1 credit on the platform spend side */
export const CREDIT_AD_VALUE = 0.125;

// ---------------------------------------------------------------------------
// Direct Mail — Thanks.io (Paid Plan rates)
// ---------------------------------------------------------------------------

export const DIRECT_MAIL_CREDITS: Record<MailType, number> = {
  postcard_4x6: 6,   // actual $0.65 → 5.2 → 6
  postcard_6x9: 6,   // actual $0.72 → 5.76 → 6
  postcard_6x11: 8,  // actual $0.93 → 7.44 → 8
  letter: 8,          // actual $0.96 (windowed) → 7.68 → 8
  notecard: 14,       // actual $1.66 → 13.28 → 14
};

/** Radius address lookup cost per record */
export const RADIUS_LOOKUP_CREDITS = 1; // actual $0.05 → 0.4 → 1

/** Data append (phone + email) cost per record */
export const DATA_APPEND_CREDITS = 2; // actual $0.20 → 1.6 → 2

// ---------------------------------------------------------------------------
// Voicemail Drops — Drop Cowboy
// ---------------------------------------------------------------------------

/** Standard voicemail drop per contact */
export const VOICEMAIL_DROP_CREDITS = 1; // actual ~$0.10 → 0.8 → 1

// ---------------------------------------------------------------------------
// Digital Ads — Google Ads & Meta Ads
// ---------------------------------------------------------------------------

/** Credits per $1 of ad spend (no extra markup, straight conversion) */
export const AD_SPEND_CREDITS_PER_DOLLAR = 8; // $1.00 / $0.125

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a dollar amount to credits (rounds up) */
export function dollarsToCredits(dollars: number): number {
  return Math.ceil(dollars / CREDIT_AD_VALUE);
}

/** Convert credits to their dollar ad-spend value */
export function creditsToDollars(credits: number): number {
  return Math.round(credits * CREDIT_AD_VALUE * 100) / 100;
}

/**
 * Estimate total credit cost for a direct mail send.
 */
export function estimateDirectMailCredits(
  mailType: MailType,
  recipientCount: number,
  options?: { radiusSearch?: boolean; appendData?: boolean }
): number {
  let perPiece = DIRECT_MAIL_CREDITS[mailType];
  let total = perPiece * recipientCount;

  if (options?.radiusSearch) total += RADIUS_LOOKUP_CREDITS * recipientCount;
  if (options?.appendData) total += DATA_APPEND_CREDITS * recipientCount;

  return total;
}

/**
 * Estimate total credit cost for a voicemail campaign.
 */
export function estimateVoicemailCredits(contactCount: number): number {
  return VOICEMAIL_DROP_CREDITS * contactCount;
}

/**
 * Convert a daily ad budget (dollars) to credits.
 */
export function adBudgetToCredits(dailyBudgetDollars: number, days: number = 1): number {
  return AD_SPEND_CREDITS_PER_DOLLAR * dailyBudgetDollars * days;
}

// ---------------------------------------------------------------------------
// Display helpers — for UI labels
// ---------------------------------------------------------------------------

export const DIRECT_MAIL_LABELS: Record<MailType, { label: string; credits: number; description: string }> = {
  postcard_4x6: { label: "Postcard (4x6)", credits: 6, description: "Standard postcard — great for just listed/sold" },
  postcard_6x9: { label: "Postcard (6x9)", credits: 6, description: "Large postcard — ideal for CMA reports and highlights" },
  postcard_6x11: { label: "Postcard (6x11)", credits: 8, description: "Oversized postcard — maximum visual impact" },
  letter: { label: "Letter", credits: 8, description: "Printed letter in envelope — detailed CMA, personal outreach" },
  notecard: { label: "Handwritten Notecard", credits: 14, description: "Simulated handwriting — thank you notes, follow-ups" },
};
