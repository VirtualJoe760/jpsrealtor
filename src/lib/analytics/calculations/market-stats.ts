/**
 * Market Statistics Calculations
 *
 * Calculate Days on Market, Price Per Sqft, HOA fees, and Property Tax statistics
 *
 * @module analytics/calculations/market-stats
 */

import type { ActiveListing } from '../aggregators/active-listings';
import type { ClosedSale } from '../aggregators/closed-sales';

// ============================================================================
// TYPES
// ============================================================================

export interface DaysOnMarketStats {
  average: number;
  median: number;
  min: number;
  max: number;
  distribution: {
    under30: number;
    days30to60: number;
    days60to90: number;
    days90to180: number;
    over180: number;
  };
  trend: 'fast-moving' | 'moderate' | 'slow-moving';
  sampleSize: number;
}

export interface PricePerSqftStats {
  average: number;
  median: number;
  min: number;
  max: number;
  distribution: {
    under200: number;
    range200to300: number;
    range300to400: number;
    range400to500: number;
    over500: number;
  };
  sampleSize: number;
}

export interface HOAFeeStats {
  average: number;
  median: number;
  min: number;
  max: number;
  distribution: {
    noHOA: number;
    under100: number;
    range100to200: number;
    range200to300: number;
    range300to500: number;
    over500: number;
  };
  frequency: {
    monthly: number;
    quarterly: number;
    annually: number;
    unknown: number;
  };
  sampleSize: number;
}

export interface PropertyTaxStats {
  average: number;
  median: number;
  min: number;
  max: number;
  effectiveRate: number;  // Tax / Property Value
  distribution: {
    under5k: number;
    range5kTo10k: number;
    range10kTo15k: number;
    range15kTo20k: number;
    over20k: number;
  };
  sampleSize: number;
}

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate Days on Market statistics
 *
 * @example
 * const listings = await getActiveListings({ city: 'Palm Desert' });
 * const stats = analyzeDaysOnMarket(listings);
 */
export function analyzeDaysOnMarket(
  listings: (ActiveListing | ClosedSale)[]
): DaysOnMarketStats {
  // Calculate DOM from onMarketDate if daysOnMarketCumulative is not available
  const now = new Date();

  const domValues = listings
    .map((l) => {
      // Try daysOnMarketCumulative first
      if (l.daysOnMarketCumulative !== undefined && l.daysOnMarketCumulative !== null && l.daysOnMarketCumulative >= 0) {
        return l.daysOnMarketCumulative;
      }

      // Fallback: calculate from onMarketDate
      if (l.onMarketDate) {
        const marketDate = new Date(l.onMarketDate);
        const daysDiff = Math.floor((now.getTime() - marketDate.getTime()) / (1000 * 60 * 60 * 24));
        // Exclude obviously stale listings (> 1 year)
        if (daysDiff >= 0 && daysDiff <= 365) {
          return daysDiff;
        }
      }

      return null;
    })
    .filter((d): d is number => d !== null)
    .sort((a, b) => a - b);

  if (domValues.length === 0) {
    return {
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      distribution: {
        under30: 0,
        days30to60: 0,
        days60to90: 0,
        days90to180: 0,
        over180: 0,
      },
      trend: 'moderate',
      sampleSize: 0,
    };
  }

  const average = domValues.reduce((sum, val) => sum + val, 0) / domValues.length;
  const median = domValues[Math.floor(domValues.length / 2)];
  const min = domValues[0];
  const max = domValues[domValues.length - 1];

  // Calculate distribution
  const distribution = {
    under30: domValues.filter((d) => d < 30).length,
    days30to60: domValues.filter((d) => d >= 30 && d < 60).length,
    days60to90: domValues.filter((d) => d >= 60 && d < 90).length,
    days90to180: domValues.filter((d) => d >= 90 && d < 180).length,
    over180: domValues.filter((d) => d >= 180).length,
  };

  // Determine trend
  let trend: 'fast-moving' | 'moderate' | 'slow-moving' = 'moderate';
  if (median < 30) {
    trend = 'fast-moving';
  } else if (median > 90) {
    trend = 'slow-moving';
  }

  return {
    average: Math.round(average),
    median,
    min,
    max,
    distribution,
    trend,
    sampleSize: domValues.length,
  };
}

/**
 * Calculate Price Per Square Foot statistics
 *
 * @example
 * const listings = await getActiveListings({ city: 'Indian Wells' });
 * const stats = analyzePricePerSqft(listings);
 */
export function analyzePricePerSqft(
  listings: (ActiveListing | ClosedSale)[]
): PricePerSqftStats {
  // Filter listings with valid price and sqft data
  const validListings = listings.filter((l) => {
    const price = 'listPrice' in l ? l.listPrice : l.closePrice;
    const sqft = l.livingArea;
    return price && price > 0 && sqft && sqft > 0;
  });

  if (validListings.length === 0) {
    return {
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      distribution: {
        under200: 0,
        range200to300: 0,
        range300to400: 0,
        range400to500: 0,
        over500: 0,
      },
      sampleSize: 0,
    };
  }

  const pricePerSqftValues = validListings
    .map((l) => {
      const price = 'listPrice' in l ? l.listPrice : l.closePrice;
      return price / l.livingArea!;
    })
    .sort((a, b) => a - b);

  const average = pricePerSqftValues.reduce((sum, val) => sum + val, 0) / pricePerSqftValues.length;
  const median = pricePerSqftValues[Math.floor(pricePerSqftValues.length / 2)];
  const min = pricePerSqftValues[0];
  const max = pricePerSqftValues[pricePerSqftValues.length - 1];

  // Calculate distribution
  const distribution = {
    under200: pricePerSqftValues.filter((p) => p < 200).length,
    range200to300: pricePerSqftValues.filter((p) => p >= 200 && p < 300).length,
    range300to400: pricePerSqftValues.filter((p) => p >= 300 && p < 400).length,
    range400to500: pricePerSqftValues.filter((p) => p >= 400 && p < 500).length,
    over500: pricePerSqftValues.filter((p) => p >= 500).length,
  };

  return {
    average: Math.round(average),
    median: Math.round(median),
    min: Math.round(min),
    max: Math.round(max),
    distribution,
    sampleSize: validListings.length,
  };
}

/**
 * Calculate HOA Fee statistics
 *
 * @example
 * const listings = await getActiveListings({ subdivision: 'PGA West' });
 * const stats = analyzeHOAFees(listings);
 */
export function analyzeHOAFees(listings: ActiveListing[]): HOAFeeStats {
  // Filter listings with valid HOA data
  const listingsWithHOA = listings.filter(
    (l) => l.associationFee !== undefined && l.associationFee !== null && l.associationFee > 0
  );

  const noHOACount = listings.length - listingsWithHOA.length;

  if (listingsWithHOA.length === 0) {
    return {
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      distribution: {
        noHOA: noHOACount,
        under100: 0,
        range100to200: 0,
        range200to300: 0,
        range300to500: 0,
        over500: 0,
      },
      frequency: {
        monthly: 0,
        quarterly: 0,
        annually: 0,
        unknown: 0,
      },
      sampleSize: listings.length,
    };
  }

  const hoaValues = listingsWithHOA
    .map((l) => l.associationFee!)
    .sort((a, b) => a - b);

  const average = hoaValues.reduce((sum, val) => sum + val, 0) / hoaValues.length;
  const median = hoaValues[Math.floor(hoaValues.length / 2)];
  const min = hoaValues[0];
  const max = hoaValues[hoaValues.length - 1];

  // Calculate distribution
  const distribution = {
    noHOA: noHOACount,
    under100: hoaValues.filter((h) => h < 100).length,
    range100to200: hoaValues.filter((h) => h >= 100 && h < 200).length,
    range200to300: hoaValues.filter((h) => h >= 200 && h < 300).length,
    range300to500: hoaValues.filter((h) => h >= 300 && h < 500).length,
    over500: hoaValues.filter((h) => h >= 500).length,
  };

  // Calculate frequency breakdown
  const frequency = {
    monthly: 0,
    quarterly: 0,
    annually: 0,
    unknown: 0,
  };

  listingsWithHOA.forEach((l) => {
    const freq = l.associationFeeFrequency?.toLowerCase();
    if (freq?.includes('month')) {
      frequency.monthly++;
    } else if (freq?.includes('quarter')) {
      frequency.quarterly++;
    } else if (freq?.includes('year') || freq?.includes('annual')) {
      frequency.annually++;
    } else {
      frequency.unknown++;
    }
  });

  return {
    average: Math.round(average),
    median,
    min,
    max,
    distribution,
    frequency,
    sampleSize: listings.length,
  };
}

/**
 * Calculate Property Tax statistics
 *
 * @example
 * const listings = await getActiveListings({ city: 'La Quinta' });
 * const stats = analyzePropertyTax(listings);
 */
export function analyzePropertyTax(listings: ActiveListing[]): PropertyTaxStats {
  // Filter listings with valid tax data
  const validListings = listings.filter(
    (l) => l.taxAnnualAmount && l.taxAnnualAmount > 0 && l.listPrice && l.listPrice > 0
  );

  if (validListings.length === 0) {
    return {
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      effectiveRate: 0,
      distribution: {
        under5k: 0,
        range5kTo10k: 0,
        range10kTo15k: 0,
        range15kTo20k: 0,
        over20k: 0,
      },
      sampleSize: 0,
    };
  }

  const taxValues = validListings
    .map((l) => l.taxAnnualAmount!)
    .sort((a, b) => a - b);

  const average = taxValues.reduce((sum, val) => sum + val, 0) / taxValues.length;
  const median = taxValues[Math.floor(taxValues.length / 2)];
  const min = taxValues[0];
  const max = taxValues[taxValues.length - 1];

  // Calculate effective tax rate (average)
  const avgTaxRate =
    validListings.reduce((sum, l) => sum + (l.taxAnnualAmount! / l.listPrice!), 0) /
    validListings.length;

  // Calculate distribution
  const distribution = {
    under5k: taxValues.filter((t) => t < 5000).length,
    range5kTo10k: taxValues.filter((t) => t >= 5000 && t < 10000).length,
    range10kTo15k: taxValues.filter((t) => t >= 10000 && t < 15000).length,
    range15kTo20k: taxValues.filter((t) => t >= 15000 && t < 20000).length,
    over20k: taxValues.filter((t) => t >= 20000).length,
  };

  return {
    average: Math.round(average),
    median,
    min,
    max,
    effectiveRate: parseFloat((avgTaxRate * 100).toFixed(3)),  // Convert to percentage
    distribution,
    sampleSize: validListings.length,
  };
}

/**
 * 🔌 PLUG-AND-PLAY PATTERN
 *
 * These calculation functions are pure (no database calls):
 *
 * 1. REUSABLE
 *    - Use with active listings OR closed sales
 *    - Mix and match as needed
 *
 * 2. COMPOSABLE
 *    - Combine multiple calculations in one API endpoint
 *    - Example: Get DOM + Price/sqft + HOA in single call
 *
 * 3. TESTABLE
 *    - Pass mock data for unit tests
 *    - No database mocking required
 *
 * Example: Combined analytics
 * ```typescript
 * const listings = await getActiveListings({ city: 'Palm Desert' });
 * const domStats = analyzeDaysOnMarket(listings);
 * const priceStats = analyzePricePerSqft(listings);
 * const hoaStats = analyzeHOAFees(listings);
 *
 * return { domStats, priceStats, hoaStats };
 * ```
 */
