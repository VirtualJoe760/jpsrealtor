/**
 * Days On Market (DOM) Statistics
 *
 * Calculate days on market statistics and trends.
 */

import type { ActiveListing } from '../aggregators/active-listings';

export interface DOMStats {
  avgDaysOnMarket: number;
  medianDaysOnMarket: number;
  minDaysOnMarket: number;
  maxDaysOnMarket: number;
  p25: number;
  p75: number;
  freshListings: number; // < 7 days
  staleListings: number; // > 90 days
  marketVelocity: 'fast' | 'moderate' | 'slow';
}

/**
 * Calculate comprehensive DOM statistics
 */
export function calculateDOMStats(listings: ActiveListing[]): DOMStats {
  const validDOM = listings
    .map((l) => l.daysOnMarket)
    .filter((dom): dom is number => dom !== undefined && dom !== null)
    .sort((a, b) => a - b);

  if (validDOM.length === 0) {
    return {
      avgDaysOnMarket: 0,
      medianDaysOnMarket: 0,
      minDaysOnMarket: 0,
      maxDaysOnMarket: 0,
      p25: 0,
      p75: 0,
      freshListings: 0,
      staleListings: 0,
      marketVelocity: 'moderate',
    };
  }

  // Calculate stats
  const sum = validDOM.reduce((acc, dom) => acc + dom, 0);
  const avg = Math.round(sum / validDOM.length);

  const p25Index = Math.floor(validDOM.length * 0.25);
  const p50Index = Math.floor(validDOM.length * 0.5);
  const p75Index = Math.floor(validDOM.length * 0.75);

  const freshListings = validDOM.filter((dom) => dom < 7).length;
  const staleListings = validDOM.filter((dom) => dom > 90).length;

  // Determine market velocity based on median DOM
  const median = validDOM[p50Index];
  let marketVelocity: 'fast' | 'moderate' | 'slow';

  if (median < 30) {
    marketVelocity = 'fast';
  } else if (median < 60) {
    marketVelocity = 'moderate';
  } else {
    marketVelocity = 'slow';
  }

  return {
    avgDaysOnMarket: avg,
    medianDaysOnMarket: median,
    minDaysOnMarket: validDOM[0],
    maxDaysOnMarket: validDOM[validDOM.length - 1],
    p25: validDOM[p25Index],
    p75: validDOM[p75Index],
    freshListings,
    staleListings,
    marketVelocity,
  };
}

/**
 * Categorize listings by DOM
 */
export function categorizeListingsByDOM(listings: ActiveListing[]): {
  fresh: ActiveListing[]; // < 7 days
  recent: ActiveListing[]; // 7-30 days
  moderate: ActiveListing[]; // 31-60 days
  aging: ActiveListing[]; // 61-90 days
  stale: ActiveListing[]; // > 90 days
} {
  const fresh: ActiveListing[] = [];
  const recent: ActiveListing[] = [];
  const moderate: ActiveListing[] = [];
  const aging: ActiveListing[] = [];
  const stale: ActiveListing[] = [];

  for (const listing of listings) {
    const dom = listing.daysOnMarket;

    if (dom === undefined || dom === null) continue;

    if (dom < 7) {
      fresh.push(listing);
    } else if (dom <= 30) {
      recent.push(listing);
    } else if (dom <= 60) {
      moderate.push(listing);
    } else if (dom <= 90) {
      aging.push(listing);
    } else {
      stale.push(listing);
    }
  }

  return { fresh, recent, moderate, aging, stale };
}

/**
 * Get DOM trend insights
 */
export function getDOMInsights(stats: DOMStats): string[] {
  const insights: string[] = [];

  // Market velocity insight
  if (stats.marketVelocity === 'fast') {
    insights.push(
      `Properties are selling quickly with a median of ${stats.medianDaysOnMarket} days on market.`
    );
  } else if (stats.marketVelocity === 'slow') {
    insights.push(
      `The market is moving slowly with a median of ${stats.medianDaysOnMarket} days on market.`
    );
  } else {
    insights.push(
      `The market is balanced with a median of ${stats.medianDaysOnMarket} days on market.`
    );
  }

  // Fresh listings insight
  if (stats.freshListings > 10) {
    insights.push(
      `${stats.freshListings} properties are brand new (less than 7 days on market).`
    );
  }

  // Stale listings insight
  if (stats.staleListings > 5) {
    insights.push(
      `${stats.staleListings} properties have been on the market for over 90 days.`
    );
  }

  // Variance insight
  const variance = stats.maxDaysOnMarket - stats.minDaysOnMarket;
  if (variance > 180) {
    insights.push(
      `There's high variance in days on market, ranging from ${stats.minDaysOnMarket} to ${stats.maxDaysOnMarket} days.`
    );
  }

  return insights;
}
