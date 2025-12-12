/**
 * Price Per Square Foot Calculations
 *
 * Calculate price per square foot for individual listings or aggregate data.
 */

import type { ActiveListing } from '../aggregators/active-listings';

/**
 * Calculate price per sqft for a single listing
 */
export function calculatePricePerSqft(listing: ActiveListing): number | null {
  if (!listing.listPrice || !listing.livingArea || listing.livingArea <= 0) {
    return null;
  }

  return Math.round(listing.listPrice / listing.livingArea);
}

/**
 * Calculate average price per sqft for array of listings
 */
export function calculateAvgPricePerSqft(listings: ActiveListing[]): number {
  const validPrices = listings
    .map((listing) => calculatePricePerSqft(listing))
    .filter((price): price is number => price !== null);

  if (validPrices.length === 0) return 0;

  const sum = validPrices.reduce((acc, price) => acc + price, 0);
  return Math.round(sum / validPrices.length);
}

/**
 * Calculate median price per sqft for array of listings
 */
export function calculateMedianPricePerSqft(listings: ActiveListing[]): number {
  const validPrices = listings
    .map((listing) => calculatePricePerSqft(listing))
    .filter((price): price is number => price !== null)
    .sort((a, b) => a - b);

  if (validPrices.length === 0) return 0;

  const mid = Math.floor(validPrices.length / 2);

  if (validPrices.length % 2 === 0) {
    return Math.round((validPrices[mid - 1] + validPrices[mid]) / 2);
  }

  return validPrices[mid];
}

/**
 * Get price per sqft distribution
 */
export function getPricePerSqftDistribution(listings: ActiveListing[]): {
  min: number;
  max: number;
  avg: number;
  median: number;
  p25: number;
  p75: number;
} {
  const validPrices = listings
    .map((listing) => calculatePricePerSqft(listing))
    .filter((price): price is number => price !== null)
    .sort((a, b) => a - b);

  if (validPrices.length === 0) {
    return { min: 0, max: 0, avg: 0, median: 0, p25: 0, p75: 0 };
  }

  const p25Index = Math.floor(validPrices.length * 0.25);
  const p50Index = Math.floor(validPrices.length * 0.5);
  const p75Index = Math.floor(validPrices.length * 0.75);

  const sum = validPrices.reduce((acc, price) => acc + price, 0);

  return {
    min: validPrices[0],
    max: validPrices[validPrices.length - 1],
    avg: Math.round(sum / validPrices.length),
    median: validPrices[p50Index],
    p25: validPrices[p25Index],
    p75: validPrices[p75Index],
  };
}
