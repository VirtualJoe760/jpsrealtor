/**
 * Location Comparison Calculator
 *
 * Compare two locations side-by-side with detailed metrics and insights.
 */

import type { MarketStats } from '../aggregators/market-stats';

export interface ComparisonResult {
  location1: {
    name: string;
    stats: MarketStats;
  };
  location2: {
    name: string;
    stats: MarketStats;
  };
  differences: {
    avgPriceDiff: number;
    avgPriceDiffPercent: number;
    medianPriceDiff: number;
    medianPriceDiffPercent: number;
    inventoryDiff: number;
    inventoryDiffPercent: number;
    pricePerSqftDiff?: number;
    pricePerSqftDiffPercent?: number;
    domDiff?: number;
    domDiffPercent?: number;
  };
  insights: string[];
  winner?: string;
}

/**
 * Compare two locations based on their market stats
 */
export function compareLocations(
  location1Name: string,
  location1Stats: MarketStats,
  location2Name: string,
  location2Stats: MarketStats
): ComparisonResult {
  // Calculate differences
  const avgPriceDiff = location1Stats.avgPrice - location2Stats.avgPrice;
  const avgPriceDiffPercent =
    location2Stats.avgPrice > 0 ? (avgPriceDiff / location2Stats.avgPrice) * 100 : 0;

  const medianPriceDiff = location1Stats.medianPrice - location2Stats.medianPrice;
  const medianPriceDiffPercent =
    location2Stats.medianPrice > 0 ? (medianPriceDiff / location2Stats.medianPrice) * 100 : 0;

  const inventoryDiff = location1Stats.totalListings - location2Stats.totalListings;
  const inventoryDiffPercent =
    location2Stats.totalListings > 0
      ? (inventoryDiff / location2Stats.totalListings) * 100
      : 0;

  const pricePerSqftDiff =
    location1Stats.avgPricePerSqft && location2Stats.avgPricePerSqft
      ? location1Stats.avgPricePerSqft - location2Stats.avgPricePerSqft
      : undefined;

  const pricePerSqftDiffPercent =
    pricePerSqftDiff !== undefined && location2Stats.avgPricePerSqft
      ? (pricePerSqftDiff / location2Stats.avgPricePerSqft) * 100
      : undefined;

  const domDiff =
    location1Stats.avgDaysOnMarket && location2Stats.avgDaysOnMarket
      ? location1Stats.avgDaysOnMarket - location2Stats.avgDaysOnMarket
      : undefined;

  const domDiffPercent =
    domDiff !== undefined && location2Stats.avgDaysOnMarket
      ? (domDiff / location2Stats.avgDaysOnMarket) * 100
      : undefined;

  // Generate insights
  const insights: string[] = [];

  // Price insights
  if (Math.abs(avgPriceDiffPercent) > 10) {
    const higher = avgPriceDiff > 0 ? location1Name : location2Name;
    const lower = avgPriceDiff > 0 ? location2Name : location1Name;
    insights.push(
      `${higher} is ${Math.abs(avgPriceDiffPercent).toFixed(
        1
      )}% more expensive than ${lower} on average.`
    );
  } else {
    insights.push(`${location1Name} and ${location2Name} have similar average prices.`);
  }

  // Inventory insights
  if (Math.abs(inventoryDiffPercent) > 25) {
    const more = inventoryDiff > 0 ? location1Name : location2Name;
    const less = inventoryDiff > 0 ? location2Name : location1Name;
    insights.push(
      `${more} has ${Math.abs(inventoryDiffPercent).toFixed(
        0
      )}% more inventory than ${less}.`
    );
  }

  // Price per sqft insights
  if (
    pricePerSqftDiffPercent !== undefined &&
    Math.abs(pricePerSqftDiffPercent) > 10
  ) {
    const higher = pricePerSqftDiff! > 0 ? location1Name : location2Name;
    const lower = pricePerSqftDiff! > 0 ? location2Name : location1Name;
    insights.push(
      `${higher} has ${Math.abs(pricePerSqftDiffPercent).toFixed(
        1
      )}% higher price per sqft than ${lower}.`
    );
  }

  // Days on market insights
  if (domDiff !== undefined && Math.abs(domDiff) > 10) {
    const faster = domDiff < 0 ? location1Name : location2Name;
    const slower = domDiff < 0 ? location2Name : location1Name;
    insights.push(
      `Properties in ${faster} sell ${Math.abs(domDiff).toFixed(
        0
      )} days faster than in ${slower}.`
    );
  }

  // Affordability insight
  if (Math.abs(avgPriceDiffPercent) > 20) {
    const affordable = avgPriceDiff > 0 ? location2Name : location1Name;
    insights.push(`${affordable} offers better affordability for buyers.`);
  }

  // Market activity insight
  if (inventoryDiff > 50) {
    const active = inventoryDiff > 0 ? location1Name : location2Name;
    insights.push(`${active} has a more active market with significantly more listings.`);
  }

  return {
    location1: { name: location1Name, stats: location1Stats },
    location2: { name: location2Name, stats: location2Stats },
    differences: {
      avgPriceDiff,
      avgPriceDiffPercent,
      medianPriceDiff,
      medianPriceDiffPercent,
      inventoryDiff,
      inventoryDiffPercent,
      pricePerSqftDiff,
      pricePerSqftDiffPercent,
      domDiff,
      domDiffPercent,
    },
    insights,
  };
}

/**
 * Determine which location is "better" based on buyer preferences
 */
export function determineWinner(
  comparison: ComparisonResult,
  preferences: {
    prioritizeAffordability?: boolean;
    prioritizeInventory?: boolean;
    prioritizeSpeed?: boolean;
  } = {}
): string {
  let score1 = 0;
  let score2 = 0;

  const { location1, location2, differences } = comparison;

  // Affordability scoring (lower price is better)
  if (preferences.prioritizeAffordability) {
    if (differences.avgPriceDiff < 0) score1 += 2;
    else score2 += 2;
  } else {
    if (differences.avgPriceDiff < 0) score1 += 1;
    else score2 += 1;
  }

  // Inventory scoring (more inventory is better for buyers)
  if (preferences.prioritizeInventory) {
    if (differences.inventoryDiff > 0) score1 += 2;
    else score2 += 2;
  } else {
    if (differences.inventoryDiff > 0) score1 += 1;
    else score2 += 1;
  }

  // Market speed scoring (faster sales indicate hot market)
  if (preferences.prioritizeSpeed && differences.domDiff !== undefined) {
    if (differences.domDiff < 0) score1 += 1;
    else score2 += 1;
  }

  // Value scoring (better price per sqft)
  if (differences.pricePerSqftDiff !== undefined) {
    if (differences.pricePerSqftDiff < 0) score1 += 1;
    else score2 += 1;
  }

  return score1 > score2 ? location1.name : location2.name;
}
