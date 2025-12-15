/**
 * Enhanced Property Tax Analysis with CA BOE API Integration
 *
 * Enriches property tax data by:
 * 1. Using actual MLS tax data when available
 * 2. Estimating tax using CA BOE county rates when missing
 * 3. Providing accurate effective tax rates by county
 *
 * @module lib/analytics/calculations/property-tax-enhanced
 */

import type { ActiveListing } from '@/lib/analytics/aggregators/active-listings';
import type { ClosedSale } from '@/lib/analytics/aggregators/closed-sales';
import { getCountyTaxRate, getTaxRateWithFallback } from '@/lib/services/property-tax-rates';

export interface EnhancedPropertyTaxStats {
  average: number;
  median: number;
  min: number;
  max: number;
  effectiveRate: number; // Official county tax rate from CA BOE
  countyTaxRate: number; // Same as effectiveRate for clarity
  distribution: {
    under5k: number;
    range5kTo10k: number;
    range10kTo15k: number;
    range15kTo20k: number;
    over20k: number;
  };
  sampleSize: number;
  actualDataCount: number; // Properties with real tax data
  estimatedDataCount: number; // Properties with estimated tax
  assessmentYear?: string; // e.g., "2024-2025"
}

/**
 * Analyze property tax with enrichment from CA BOE API
 *
 * Automatically fills in missing tax data using official county tax rates
 *
 * @param listings - Active listings or closed sales
 * @param county - County name for tax rate lookup (optional, will use from listings if not provided)
 * @returns Enhanced property tax statistics
 *
 * @example
 * ```typescript
 * const listings = await getActiveListings({ city: 'Palm Desert' });
 * const stats = await analyzePropertyTaxEnhanced(listings, 'Riverside');
 * console.log(stats.effectiveRate); // 1.173 (from CA BOE)
 * console.log(stats.actualDataCount); // 150 properties with real data
 * console.log(stats.estimatedDataCount); // 408 properties with estimated data
 * ```
 */
export async function analyzePropertyTaxEnhanced(
  listings: (ActiveListing | ClosedSale)[],
  county?: string
): Promise<EnhancedPropertyTaxStats> {
  if (listings.length === 0) {
    return {
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      effectiveRate: 0,
      countyTaxRate: 0,
      distribution: {
        under5k: 0,
        range5kTo10k: 0,
        range10kTo15k: 0,
        range15kTo20k: 0,
        over20k: 0,
      },
      sampleSize: 0,
      actualDataCount: 0,
      estimatedDataCount: 0,
    };
  }

  // Determine county from listings if not provided
  const targetCounty = county || listings.find((l) => l.countyOrParish)?.countyOrParish || 'Riverside';

  // Fetch official county tax rate from CA BOE API
  const taxRateData = await getCountyTaxRate(targetCounty);
  const countyTaxRate = taxRateData
    ? taxRateData.averageTaxRate
    : await getTaxRateWithFallback(targetCounty);

  // Separate listings with actual tax data vs those needing estimation
  let actualDataCount = 0;
  let estimatedDataCount = 0;

  const enrichedTaxValues = listings
    .map((l) => {
      const propertyValue = 'listPrice' in l ? l.listPrice : l.closePrice;

      if (!propertyValue || propertyValue <= 0) {
        return null; // Skip invalid prices
      }

      // Use actual tax data if available and valid
      if (l.taxAnnualAmount && l.taxAnnualAmount > 0) {
        actualDataCount++;
        return l.taxAnnualAmount;
      }

      // Estimate using county tax rate
      estimatedDataCount++;
      const estimatedTax = propertyValue * (countyTaxRate / 100);
      return Math.round(estimatedTax);
    })
    .filter((tax): tax is number => tax !== null)
    .sort((a, b) => a - b);

  if (enrichedTaxValues.length === 0) {
    return {
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      effectiveRate: countyTaxRate,
      countyTaxRate,
      distribution: {
        under5k: 0,
        range5kTo10k: 0,
        range10kTo15k: 0,
        range15kTo20k: 0,
        over20k: 0,
      },
      sampleSize: 0,
      actualDataCount,
      estimatedDataCount,
      assessmentYear: taxRateData?.assessmentYear,
    };
  }

  const average =
    enrichedTaxValues.reduce((sum, val) => sum + val, 0) / enrichedTaxValues.length;
  const median = enrichedTaxValues[Math.floor(enrichedTaxValues.length / 2)];
  const min = enrichedTaxValues[0];
  const max = enrichedTaxValues[enrichedTaxValues.length - 1];

  // Calculate distribution
  const distribution = {
    under5k: enrichedTaxValues.filter((t) => t < 5000).length,
    range5kTo10k: enrichedTaxValues.filter((t) => t >= 5000 && t < 10000).length,
    range10kTo15k: enrichedTaxValues.filter((t) => t >= 10000 && t < 15000).length,
    range15kTo20k: enrichedTaxValues.filter((t) => t >= 15000 && t < 20000).length,
    over20k: enrichedTaxValues.filter((t) => t >= 20000).length,
  };

  return {
    average: Math.round(average),
    median,
    min,
    max,
    effectiveRate: countyTaxRate,
    countyTaxRate,
    distribution,
    sampleSize: enrichedTaxValues.length,
    actualDataCount,
    estimatedDataCount,
    assessmentYear: taxRateData?.assessmentYear,
  };
}

/**
 * Calculate property tax for a single property
 *
 * @param propertyValue - List price or close price
 * @param county - County name
 * @returns Estimated annual property tax
 *
 * @example
 * ```typescript
 * const tax = await calculateSinglePropertyTax(750000, 'Riverside');
 * console.log(tax); // ~8,797
 * ```
 */
export async function calculateSinglePropertyTax(
  propertyValue: number,
  county: string
): Promise<number> {
  const taxRate = await getTaxRateWithFallback(county);
  return Math.round(propertyValue * (taxRate / 100));
}
