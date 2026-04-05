/**
 * CMA Comp Scoring Algorithm
 *
 * Scores potential comparables against the subject property (0-100).
 * Confidence-aware: doesn't penalize unknown attributes.
 * Weight redistribution: when factors don't apply, their weight
 * is redistributed proportionally to remaining factors.
 */

import {
  CMASubject,
  ScoringWeights,
  ScoreBreakdown,
  ResolvedListingAttributes,
  parseViewCategories,
} from "./types";
import { TierParams } from "./types";

interface CompCandidate {
  subdivisionName: string | null;
  livingArea: number;
  lotSize: number;
  bedsTotal: number;
  bathsTotal: number;
  yearBuilt: number;
  garageSpaces: number;
  stories: number;
  landType: string;
  architecturalStyle: string | null;
  closeDate?: string;        // For recency scoring (closed comps)
  onMarketDate?: string;     // For active comps
  resolved: ResolvedListingAttributes;
}

// ─── Individual Scoring Functions ───

function scoreSqft(subjectSqft: number, compSqft: number): number {
  if (!subjectSqft || !compSqft) return 0.5;
  const diff = Math.abs(compSqft - subjectSqft) / subjectSqft;
  return Math.max(0, 1 - diff);
}

function scoreSubdivision(subjectSub: string | null, compSub: string | null): number {
  if (!subjectSub || !compSub) return 0;
  return subjectSub.toLowerCase().trim() === compSub.toLowerCase().trim() ? 1 : 0;
}

function scoreBedBath(
  subjectBeds: number, compBeds: number,
  subjectBaths: number, compBaths: number
): number {
  const bedDiff = Math.abs(compBeds - subjectBeds);
  const bathDiff = Math.abs(compBaths - subjectBaths);

  let bedScore: number;
  if (bedDiff === 0) bedScore = 1;
  else if (bedDiff === 1) bedScore = 0.65;
  else if (bedDiff === 2) bedScore = 0.3;
  else bedScore = 0;

  let bathScore: number;
  if (bathDiff === 0) bathScore = 1;
  else if (bathDiff <= 1) bathScore = 0.65;
  else if (bathDiff <= 2) bathScore = 0.3;
  else bathScore = 0;

  return (bedScore + bathScore) / 2;
}

function scorePoolSpa(subject: ResolvedListingAttributes, comp: ResolvedListingAttributes): { score: number; applicable: boolean } {
  const subjectPool = subject.pool.value;
  const compPool = comp.pool.value;
  const subjectSpa = subject.spa.value;
  const compSpa = comp.spa.value;

  // If subject's pool/spa status is unknown, this factor doesn't apply
  if (subjectPool === null && subjectSpa === null) return { score: 0, applicable: false };

  let poolMatch = 0;
  let spaMatch = 0;
  let factors = 0;

  if (subjectPool !== null) {
    factors++;
    if (compPool === null) poolMatch = 0.5;              // Unknown comp = neutral
    else if (compPool === subjectPool) poolMatch = 1;     // Match
    else poolMatch = 0;                                    // Mismatch
  }

  if (subjectSpa !== null) {
    factors++;
    if (compSpa === null) spaMatch = 0.5;
    else if (compSpa === subjectSpa) spaMatch = 1;
    else spaMatch = 0;
  }

  return {
    score: factors > 0 ? (poolMatch + spaMatch) / factors : 0,
    applicable: factors > 0,
  };
}

function scoreLotSize(subjectLot: number, compLot: number): { score: number; applicable: boolean } {
  if (!subjectLot || !compLot) return { score: 0, applicable: false };
  const diff = Math.abs(compLot - subjectLot) / subjectLot;
  return { score: Math.max(0, 1 - diff), applicable: true };
}

function scoreView(subject: ResolvedListingAttributes, comp: ResolvedListingAttributes): { score: number; applicable: boolean } {
  const subjectCats = subject.viewCategories;
  const compCats = comp.viewCategories;

  // If subject has no view, this factor doesn't apply
  if (subjectCats.length === 0) return { score: 0, applicable: false };

  if (compCats.length === 0) return { score: 0.2, applicable: true }; // Comp has no view

  // Count matching categories
  const matches = subjectCats.filter(c => compCats.includes(c)).length;
  if (matches > 0) {
    return { score: matches / subjectCats.length, applicable: true };
  }

  return { score: 0.1, applicable: true }; // Both have views but different types
}

function scoreRecency(dateStr: string | undefined, maxMonths: number): number {
  if (!dateStr) return 0.5;
  const date = new Date(dateStr);
  const monthsAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 30);
  return Math.max(0, 1 - monthsAgo / maxMonths);
}

function scoreYearBuilt(subjectYear: number, compYear: number): number {
  if (!subjectYear || !compYear) return 0.5;
  const diff = Math.abs(compYear - subjectYear);
  return Math.max(0, 1 - diff / 30);
}

function scoreArchStyle(subjectStyle: string | null, compStyle: string | null): { score: number; applicable: boolean } {
  if (!subjectStyle) return { score: 0, applicable: false };
  if (!compStyle) return { score: 0.3, applicable: true };

  const subjectKeywords = subjectStyle.toLowerCase().split(/[,\s]+/).filter(Boolean);
  const compKeywords = compStyle.toLowerCase().split(/[,\s]+/).filter(Boolean);
  const matches = subjectKeywords.filter(k => compKeywords.includes(k)).length;

  if (matches > 0) return { score: Math.min(1, matches / subjectKeywords.length), applicable: true };
  return { score: 0, applicable: true };
}

function scoreStories(subjectStories: number, compStories: number): { score: number; applicable: boolean } {
  if (!subjectStories) return { score: 0, applicable: false };
  if (!compStories) return { score: 0.5, applicable: true };
  return { score: subjectStories === compStories ? 1 : 0.3, applicable: true };
}

function scoreGarage(
  subjectGarage: number | null, compGarage: number | null
): { score: number; applicable: boolean } {
  if (subjectGarage == null) return { score: 0, applicable: false };
  if (compGarage == null) return { score: 0.5, applicable: true };
  const diff = Math.abs(compGarage - subjectGarage);
  if (diff === 0) return { score: 1, applicable: true };
  if (diff === 1) return { score: 0.6, applicable: true };
  return { score: 0.2, applicable: true };
}

function scoreLandType(subjectType: string, compType: string): number {
  if (!subjectType || !compType) return 0.5;
  return subjectType.toLowerCase() === compType.toLowerCase() ? 1 : 0;
}

// ─── Main Scoring Function ───

export function scoreComp(
  subject: CMASubject,
  comp: CompCandidate,
  params: TierParams,
): ScoreBreakdown {
  const weights = { ...params.weights };
  const maxDateMonths = comp.closeDate
    ? params.dateRanges.level5 // Use max lookback for normalization
    : 12; // Active comps: normalize to 12 months

  // Compute raw scores for each factor
  const rawScores = {
    sqft: scoreSqft(subject.livingArea, comp.livingArea),
    subdivision: scoreSubdivision(subject.subdivisionName, comp.subdivisionName),
    bedBath: scoreBedBath(subject.bedsTotal, comp.bedsTotal, subject.bathsTotal, comp.bathsTotal),
    poolSpa: scorePoolSpa(subject.resolved, comp.resolved),
    lotSize: scoreLotSize(subject.lotSize, comp.lotSize),
    view: scoreView(subject.resolved, comp.resolved),
    recency: scoreRecency(comp.closeDate || comp.onMarketDate, maxDateMonths),
    yearBuilt: scoreYearBuilt(subject.yearBuilt, comp.yearBuilt),
    archStyle: scoreArchStyle(subject.architecturalStyle, comp.architecturalStyle),
    stories: scoreStories(subject.stories, comp.stories),
    garage: scoreGarage(subject.resolved.garage.value, comp.resolved.garage.value),
    landType: scoreLandType(subject.landType, comp.landType),
  };

  // Identify non-applicable factors and redistribute their weight
  const nonApplicable: (keyof ScoringWeights)[] = [];
  if (!rawScores.poolSpa.applicable) nonApplicable.push("poolSpa");
  if (!rawScores.lotSize.applicable) nonApplicable.push("lotSize");
  if (!rawScores.view.applicable) nonApplicable.push("view");
  if (!rawScores.archStyle.applicable) nonApplicable.push("archStyle");
  if (!rawScores.stories.applicable) nonApplicable.push("stories");
  if (!rawScores.garage.applicable) nonApplicable.push("garage");

  // Redistribute weight from non-applicable factors
  let redistributable = 0;
  for (const key of nonApplicable) {
    redistributable += weights[key];
    weights[key] = 0;
  }

  if (redistributable > 0) {
    const applicableKeys = (Object.keys(weights) as (keyof ScoringWeights)[])
      .filter(k => !nonApplicable.includes(k) && weights[k] > 0);
    const totalApplicable = applicableKeys.reduce((sum, k) => sum + weights[k], 0);

    for (const key of applicableKeys) {
      weights[key] += (weights[key] / totalApplicable) * redistributable;
    }
  }

  // Compute final weighted scores
  const breakdown: ScoreBreakdown = {
    sqft: rawScores.sqft * weights.sqft,
    subdivision: rawScores.subdivision * weights.subdivision,
    bedBath: rawScores.bedBath * weights.bedBath,
    poolSpa: (rawScores.poolSpa.applicable ? rawScores.poolSpa.score : 0) * weights.poolSpa,
    lotSize: (rawScores.lotSize.applicable ? rawScores.lotSize.score : 0) * weights.lotSize,
    view: (rawScores.view.applicable ? rawScores.view.score : 0) * weights.view,
    recency: rawScores.recency * weights.recency,
    yearBuilt: rawScores.yearBuilt * weights.yearBuilt,
    archStyle: (rawScores.archStyle.applicable ? rawScores.archStyle.score : 0) * weights.archStyle,
    stories: (rawScores.stories.applicable ? rawScores.stories.score : 0) * weights.stories,
    garage: (rawScores.garage.applicable ? rawScores.garage.score : 0) * weights.garage,
    landType: rawScores.landType * weights.landType,
    total: 0,
  };

  breakdown.total = Object.entries(breakdown)
    .filter(([k]) => k !== "total")
    .reduce((sum, [, v]) => sum + (v as number), 0);

  return breakdown;
}
