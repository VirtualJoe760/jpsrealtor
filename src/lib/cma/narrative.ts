/**
 * CMA Narrative Generator
 *
 * Generates a short, actionable narrative summary and lists limitations/inferences.
 */

import { CMAResult, CMAComp, CMASubject, CMATier, ResolvedAttribute } from "./types";

// ─── Inference Collector ───

export function collectInferences(subject: CMASubject, comps: CMAComp[]): string[] {
  const inferences: string[] = [];
  const allResolved = [subject.resolved, ...comps.map(c => c.resolved)];

  for (let i = 0; i < allResolved.length; i++) {
    const resolved = allResolved[i];
    const label = i === 0 ? subject.address : comps[i - 1]?.address || "Unknown";

    const check = (attr: ResolvedAttribute<any>, name: string) => {
      if (attr.level === "inferred-remarks") {
        inferences.push(`${name} for ${label} inferred from listing remarks (${Math.round(attr.confidence * 100)}%)`);
      } else if (attr.level === "inferred-subdivision") {
        inferences.push(`${name} for ${label} inferred from subdivision data (${Math.round(attr.confidence * 100)}%)`);
      }
    };

    check(resolved.pool, "Pool");
    check(resolved.spa, "Spa");
    check(resolved.view, "View");
    check(resolved.garage, "Garage");
    check(resolved.gatedCommunity, "Gated community");
    check(resolved.golf, "Golf course");
  }

  return inferences;
}

// ─── Limitation Collector ───

export function collectLimitations(
  result: Pick<CMAResult, "subject" | "tier" | "activeComps" | "closedComps" | "searchCriteria">
): string[] {
  const limitations: string[] = [];
  const { subject, activeComps, closedComps, searchCriteria } = result;

  // Not enough comps
  if (activeComps.length < 3) {
    limitations.push(`Only ${activeComps.length} active comparable(s) found — fewer than the recommended 3-5.`);
  }
  if (closedComps.length < 3) {
    limitations.push(`Only ${closedComps.length} closed comparable(s) found — fewer than the recommended 3-5.`);
  }

  // Had to expand beyond subdivision
  if (!searchCriteria.subdivisionMatched && subject.subdivisionName) {
    limitations.push(`Insufficient comparables in ${subject.subdivisionName}; search expanded to city-wide.`);
  }

  // Pool/spa mismatch
  if (subject.resolved.pool.value === true) {
    const closedWithPool = closedComps.filter(c => c.resolved.pool.value === true).length;
    if (closedWithPool < closedComps.length * 0.6 && closedComps.length > 0) {
      limitations.push(`Subject has a pool, but only ${closedWithPool}/${closedComps.length} closed comps have confirmed pools.`);
    }
  }

  // View mismatch
  if (subject.resolved.viewCategories.length > 0) {
    const viewType = subject.resolved.viewCategories[0];
    const compsWithView = closedComps.filter(c =>
      c.resolved.viewCategories.some(v => subject.resolved.viewCategories.includes(v))
    ).length;
    if (compsWithView < closedComps.length * 0.5 && closedComps.length > 0) {
      limitations.push(`Subject has ${viewType} view, but only ${compsWithView}/${closedComps.length} closed comps share a similar view.`);
    }
  }

  // Land type mismatch
  const leaseLandComps = closedComps.filter(c => c.landType === "Lease").length;
  if (subject.landType === "Fee" && leaseLandComps > 0) {
    limitations.push(`${leaseLandComps} closed comp(s) are on lease-land vs subject's fee-land — values may differ.`);
  }

  // Wide date range
  if (searchCriteria.levelsUsed.closed >= 4) {
    limitations.push(`Closed comp search required an extended lookback period (${searchCriteria.dateRangeUsed.closed}). Market conditions may have shifted.`);
  }

  return limitations;
}

// ─── Narrative Generator ───

export function generateNarrative(result: CMAResult): string {
  const { subject, tier, activeComps, closedComps, stats } = result;
  const parts: string[] = [];

  // Price positioning
  if (stats.closed.count > 0 && stats.closed.medianPrice > 0) {
    const diff = ((subject.listPrice - stats.closed.medianPrice) / stats.closed.medianPrice) * 100;
    const absDiff = Math.abs(diff).toFixed(1);

    if (diff > 5) {
      parts.push(`Listed ${absDiff}% above the median closed sale price of $${stats.closed.medianPrice.toLocaleString()}.`);
    } else if (diff < -5) {
      parts.push(`Listed ${absDiff}% below the median closed sale price of $${stats.closed.medianPrice.toLocaleString()}.`);
    } else {
      parts.push(`Listed within 5% of the median closed sale price of $${stats.closed.medianPrice.toLocaleString()}.`);
    }
  }

  // Price per sqft comparison
  if (stats.closed.avgPricePerSqft > 0 && subject.pricePerSqft > 0) {
    const subjectPpsf = subject.pricePerSqft;
    const avgPpsf = stats.closed.avgPricePerSqft;
    const diff = ((subjectPpsf - avgPpsf) / avgPpsf) * 100;

    if (Math.abs(diff) > 10) {
      parts.push(`At $${Math.round(subjectPpsf)}/sqft, the subject is ${diff > 0 ? "above" : "below"} the comp average of $${Math.round(avgPpsf)}/sqft.`);
    }
  }

  // Sale price to list ratio insight
  if (stats.closed.avgSalePriceToListRatio && stats.closed.avgSalePriceToListRatio > 0) {
    const ratio = stats.closed.avgSalePriceToListRatio;
    if (ratio < 0.95) {
      parts.push(`Comparable homes are selling at ${(ratio * 100).toFixed(1)}% of list price — buyers have negotiating leverage.`);
    } else if (ratio > 1.0) {
      parts.push(`Comparable homes are selling above list price (${(ratio * 100).toFixed(1)}%) — strong seller's market in this segment.`);
    }
  }

  // Days on market
  if (stats.closed.avgDaysOnMarket > 0) {
    const dom = Math.round(stats.closed.avgDaysOnMarket);
    if (dom <= 30) {
      parts.push(`Comps are moving quickly at an average of ${dom} days on market.`);
    } else if (dom >= 120) {
      parts.push(`Average days on market is ${dom} — expect a longer selling timeline in this segment.`);
    }
  }

  // Tier note
  if (tier === "luxury") {
    parts.push("Luxury tier: fewer comparable sales are available, widening the confidence range.");
  }

  return parts.join(" ");
}
