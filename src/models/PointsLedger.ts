// src/models/PointsLedger.ts
// DEPRECATED — this file is now a back-compat shim.
// New code should import from "@/models/CreditLedger" and "@/config/credits".
// Existing imports continue to work via the re-exports below.

import CreditLedger, {
  type ICreditLedger,
  type ICreditTransaction,
  type CreditTransactionType,
  type CampaignChannel,
} from "./CreditLedger";

import {
  CREDIT_TIERS,
  CUSTOM_TOPUP_MARKUP,
  creditsForPurchase,
  creditsToDollars,
  type CreditTier,
} from "@/config/credits";

// --- Legacy type re-exports (renamed) ---
export type PointsTier = CreditTier;
export type TransactionType = CreditTransactionType;
export type { CampaignChannel };
export type IPointsTransaction = ICreditTransaction;
export type IPointsLedger = ICreditLedger;

// --- Legacy tier config shape (kept identical to original) ---
export interface PointsTierConfig {
  name: string;
  tier: PointsTier;
  monthlyPrice: number;
  monthlyPoints: number;
  adSpendRate: number;
  costPerPoint: number;
  adValuePerPoint: number;
}

export const POINTS_TIERS: Record<PointsTier, PointsTierConfig> = (() => {
  const out: Record<string, PointsTierConfig> = {};
  for (const [key, cfg] of Object.entries(CREDIT_TIERS)) {
    out[key] = {
      name: cfg.name,
      tier: cfg.tier,
      monthlyPrice: cfg.monthlyPrice,
      monthlyPoints: cfg.monthlyCredits,
      adSpendRate: 1 / (1 + cfg.markup), // $ ad spend per $1 paid
      costPerPoint: cfg.costPerCredit,
      adValuePerPoint: cfg.spendValuePerCredit,
    };
  }
  return out as Record<PointsTier, PointsTierConfig>;
})();

/** Legacy custom top-up rate ($ ad spend per $1 paid). */
export const CUSTOM_TOPUP_RATE = 1 / (1 + CUSTOM_TOPUP_MARKUP);

// --- Legacy conversion helpers ---
export function dollarsToPoints(dollars: number, tier: PointsTier): number {
  return creditsForPurchase(dollars, tier);
}

export function pointsToAdSpend(points: number, _tier: PointsTier): number {
  // Universal $0.10/credit spend value (tier-independent under new model).
  return creditsToDollars(points);
}

// --- Legacy default export ---
export default CreditLedger;
