/**
 * CMA Tier Classification
 *
 * Classifies properties into affordable/residential/luxury tiers
 * and provides tier-specific parameters for comp searching and scoring.
 */

import { CMATier, TierParams, ScoringWeights } from "./types";

// ─── Weight Definitions ───

const RESIDENTIAL_WEIGHTS: ScoringWeights = {
  sqft: 20,
  subdivision: 15,
  bedBath: 12,
  poolSpa: 10,
  lotSize: 10,
  view: 8,
  recency: 10,
  yearBuilt: 5,
  archStyle: 3,
  stories: 3,
  garage: 2,
  landType: 2,
};

const AFFORDABLE_WEIGHTS: ScoringWeights = {
  sqft: 25,       // +5: sqft matters most in this range
  subdivision: 12, // -3: fewer subdivisions at this price
  bedBath: 17,     // +5: bed/bath count critical
  poolSpa: 5,      // -5: fewer pools
  lotSize: 5,      // -5: standard lots
  view: 3,         // -5: less view premium
  recency: 13,     // +3: market moves fast
  yearBuilt: 8,    // +3: condition matters more
  archStyle: 0,    // -3: less style variation
  stories: 5,      // +2: single-story preference strong
  garage: 4,       // +2: parking matters
  landType: 3,     // +1: lease vs fee critical at this price
};

const LUXURY_WEIGHTS: ScoringWeights = {
  sqft: 17,        // -3: less sqft-sensitive
  subdivision: 20, // +5: community is paramount
  bedBath: 8,      // -4: less rigid on bed count
  poolSpa: 10,     // same
  lotSize: 15,     // +5: lot size premium
  view: 13,        // +5: views are major value driver
  recency: 5,      // -5: fewer sales, longer lookback OK
  yearBuilt: 2,    // -3: often remodeled regardless
  archStyle: 6,    // +3: style matters to luxury buyers
  stories: 2,      // -1
  garage: 1,       // -1
  landType: 1,     // -1
};

// ─── Tier Parameters ───

const TIER_PARAMS: Record<CMATier, TierParams> = {
  affordable: {
    tier: "affordable",
    sqftRange: 300,
    lotTolerancePct: 0.30,
    lotToleranceFlat: 2000,
    yearBuiltTolerance: 15,
    maxCompsPerStatus: 5,
    radiusFallbackMiles: 3,
    dateRanges: {
      level1: 6,
      level2: 12,
      level3: 6,
      level4: 24,
      level5: 36,
    },
    weights: AFFORDABLE_WEIGHTS,
  },
  residential: {
    tier: "residential",
    sqftRange: 400,
    lotTolerancePct: 0.25,
    lotToleranceFlat: 3000,
    yearBuiltTolerance: 10,
    maxCompsPerStatus: 5,
    radiusFallbackMiles: 2,
    dateRanges: {
      level1: 6,
      level2: 12,
      level3: 6,
      level4: 24,
      level5: 36,
    },
    weights: RESIDENTIAL_WEIGHTS,
  },
  luxury: {
    tier: "luxury",
    sqftRange: 600,
    lotTolerancePct: 0.35,
    lotToleranceFlat: 5000,
    yearBuiltTolerance: 10,
    maxCompsPerStatus: 5,
    radiusFallbackMiles: 5,
    dateRanges: {
      level1: 9,   // Longer lookback — fewer luxury sales
      level2: 18,
      level3: 9,
      level4: 30,
      level5: 48,
    },
    weights: LUXURY_WEIGHTS,
  },
};

// ─── Tier Classification ───

export function classifyTier(listPrice: number, livingArea: number): CMATier {
  // Luxury: price > $1.5M OR sqft > 3,000
  if (listPrice > 1500000 || livingArea > 3000) return "luxury";

  // Affordable: price < $500K OR sqft < 1,500
  if (listPrice < 500000 || livingArea < 1500) return "affordable";

  // Everything else: residential
  return "residential";
}

export function getTierParams(tier: CMATier): TierParams {
  return TIER_PARAMS[tier];
}

/**
 * Get sqft search range adjusted for the subject's size.
 * Larger homes get wider search ranges.
 */
export function getSqftRange(subjectSqft: number, tier: CMATier): { min: number; max: number } {
  const params = TIER_PARAMS[tier];
  let range = params.sqftRange;

  // Scale range for very large homes
  if (subjectSqft > 4000) range = Math.round(range * 1.5);
  else if (subjectSqft > 3000) range = Math.round(range * 1.25);

  return {
    min: Math.max(0, subjectSqft - range),
    max: subjectSqft + range,
  };
}

/**
 * Get lot size tolerance based on subject lot and tier.
 */
export function getLotTolerance(subjectLotSqft: number, tier: CMATier): { min: number; max: number } {
  const params = TIER_PARAMS[tier];

  if (subjectLotSqft < 10000) {
    // Small lots: use flat tolerance
    return {
      min: Math.max(0, subjectLotSqft - params.lotToleranceFlat),
      max: subjectLotSqft + params.lotToleranceFlat,
    };
  }

  // Larger lots: use percentage
  const tolerance = subjectLotSqft * params.lotTolerancePct;
  return {
    min: Math.max(0, subjectLotSqft - tolerance),
    max: subjectLotSqft + tolerance,
  };
}
