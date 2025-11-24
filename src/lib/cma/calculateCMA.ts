// src/lib/cma/calculateCMA.ts
// CMA Engine Core - Comparable selection and valuation logic
// Phase 3: Statistical Analysis & Investment Intelligence

import dbConnect from '@/lib/mongodb';
import Listing from '@/models/listings';
import type { CMAFilters, CMAComp, CMASummary } from './cmaTypes';

/**
 * Load comparable properties from MongoDB based on filters
 *
 * @param filters - CMA search criteria (beds, baths, sqft, radius, etc.)
 * @returns Promise<CMAComp[]> - Array of comparable properties
 */
export async function loadComps(filters: CMAFilters): Promise<CMAComp[]> {
  try {
    await dbConnect();

    console.log('📊 Loading comps from MongoDB with filters:', filters);

    // Build MongoDB query
    const query: any = {
      standardStatus: { $in: ['Closed', 'Active'] }, // Include both sold and active listings
    };

    // Beds filter: ±1 bed
    if (filters.beds !== undefined) {
      query.bedsTotal = {
        $gte: Math.max(0, filters.beds - 1),
        $lte: filters.beds + 1,
      };
    }

    // Baths filter: ±1 bath
    if (filters.baths !== undefined) {
      query.$or = [
        {
          bathroomsTotalDecimal: {
            $gte: Math.max(0, filters.baths - 1),
            $lte: filters.baths + 1,
          },
        },
        {
          bathroomsTotalInteger: {
            $gte: Math.max(0, filters.baths - 1),
            $lte: filters.baths + 1,
          },
        },
      ];
    }

    // Sqft filter: ±20%
    if (filters.sqft !== undefined) {
      const minSqft = Math.floor(filters.sqft * 0.8);
      const maxSqft = Math.ceil(filters.sqft * 1.2);
      query.livingArea = { $gte: minSqft, $lte: maxSqft };
    }

    // Subdivision filter (preferred) or fallback to city
    // Note: This would need to be enhanced with actual subdivision/city from subject property
    // For now, we'll load comps without location restriction and filter later

    // Ensure we have valid price and sqft data
    query.listPrice = { $gt: 0 };
    query.livingArea = { $gt: 0 };

    // Execute query
    const maxComps = filters.maxComps || 20;
    const listings = await Listing.find(query)
      .sort({ closeDate: -1 }) // Most recent first
      .limit(maxComps * 2) // Fetch extra to allow for filtering
      .lean()
      .exec();

    console.log(`📊 Found ${listings.length} potential comps from database`);

    // Transform to CMAComp format
    const comps: CMAComp[] = listings
      .map((listing: any) => {
        const price = listing.closePrice || listing.listPrice || 0;
        const sqft = listing.livingArea || 0;

        if (price === 0 || sqft === 0) return null;

        return {
          listingKey: listing.listingKey || listing._id.toString(),
          price,
          sqft,
          beds: listing.bedsTotal || 0,
          baths: listing.bathroomsTotalDecimal || listing.bathroomsTotalInteger || 0,
          yearBuilt: listing.yearBuilt,
          lat: listing.latitude || 0,
          lng: listing.longitude || 0,
          listPrice: listing.listPrice || 0,
          closePrice: listing.closePrice,
          listPriceSqft: listing.listPrice && sqft > 0 ? listing.listPrice / sqft : undefined,
          closePriceSqft: listing.closePrice && sqft > 0 ? listing.closePrice / sqft : undefined,
          dom: listing.daysOnMarket,
          subdivision: listing.subdivisionName,
          unparsedAddress: listing.unparsedAddress,
        };
      })
      .filter((comp): comp is CMAComp => comp !== null);

    console.log(`📊 Transformed ${comps.length} valid comps`);

    return comps;
  } catch (error) {
    console.error('❌ Error loading comps:', error);
    return [];
  }
}

/**
 * Select best comparable properties using similarity scoring and outlier removal
 *
 * @param comps - Array of all potential comps
 * @param targetBeds - Target beds (optional, for scoring)
 * @param targetBaths - Target baths (optional, for scoring)
 * @param targetSqft - Target sqft (optional, for scoring)
 * @returns CMAComp[] - Filtered array of best matches
 */
export function selectBestComps(
  comps: CMAComp[],
  targetBeds?: number,
  targetBaths?: number,
  targetSqft?: number
): CMAComp[] {
  if (comps.length === 0) return [];

  console.log(`📊 Selecting best comps from ${comps.length} candidates`);

  // Calculate median price per sqft for outlier detection
  const pricesPerSqft = comps.map(c => c.price / c.sqft).sort((a, b) => a - b);
  const medianPricePerSqft = pricesPerSqft[Math.floor(pricesPerSqft.length / 2)] || 0;

  // Remove outliers: ±35% price/sqft deviation
  const filtered = comps.filter(comp => {
    const pricePerSqft = comp.price / comp.sqft;
    const deviation = Math.abs(pricePerSqft - medianPricePerSqft) / medianPricePerSqft;

    if (deviation > 0.35) {
      console.log(`   Removing outlier: ${comp.unparsedAddress} (${(deviation * 100).toFixed(1)}% deviation)`);
      return false;
    }

    // Remove extreme DOM outliers (over 365 days)
    if (comp.dom && comp.dom > 365) {
      console.log(`   Removing stale listing: ${comp.unparsedAddress} (${comp.dom} DOM)`);
      return false;
    }

    return true;
  });

  console.log(`📊 After outlier removal: ${filtered.length} comps remain`);

  // Score each comp based on similarity
  const scored = filtered.map(comp => {
    let score = 100;

    // Deduct points for bed/bath mismatch
    if (targetBeds !== undefined) {
      score -= Math.abs(comp.beds - targetBeds) * 5;
    }
    if (targetBaths !== undefined) {
      score -= Math.abs(comp.baths - targetBaths) * 5;
    }

    // Deduct points for sqft mismatch (per 100 sqft difference)
    if (targetSqft !== undefined) {
      score -= Math.abs(comp.sqft - targetSqft) / 100;
    }

    // Bonus for closed sales (more reliable than active listings)
    if (comp.closePrice) {
      score += 10;
    }

    // Deduct points for older sales (0.5 points per 30 days DOM)
    if (comp.dom) {
      score -= (comp.dom / 30) * 0.5;
    }

    return { comp, score };
  });

  // Sort by score (highest first) and take top 10
  const bestComps = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(item => item.comp);

  console.log(`📊 Selected ${bestComps.length} best comps`);

  return bestComps;
}

/**
 * Calculate CMA summary statistics from comparable properties
 *
 * @param comps - Array of comparable properties
 * @param targetSqft - Target property square footage (for adjustments)
 * @returns CMASummary - Valuation summary with estimated value and ranges
 */
export function calculateCMASummary(comps: CMAComp[], targetSqft?: number): CMASummary {
  if (comps.length === 0) {
    console.log('📊 No comps available for summary calculation');
    return {
      estimatedValue: null,
      lowRange: null,
      highRange: null,
      confidenceScore: null,
      methodology: [],
    };
  }

  console.log(`📊 Calculating CMA summary from ${comps.length} comps`);

  const methodology: string[] = [];

  // Extract prices and calculate statistics
  const prices = comps.map(c => c.price).sort((a, b) => a - b);
  const pricesPerSqft = comps.map(c => c.price / c.sqft).sort((a, b) => a - b);

  // Calculate median price
  const medianPrice = prices[Math.floor(prices.length / 2)] || 0;
  methodology.push('median');

  // Calculate median price per sqft
  const medianPricePerSqft = pricesPerSqft[Math.floor(pricesPerSqft.length / 2)] || 0;
  methodology.push('price-per-sqft');

  // Calculate weighted average (weight by recency - favor recent sales)
  let weightedSum = 0;
  let totalWeight = 0;
  comps.forEach((comp, index) => {
    const weight = comps.length - index; // More recent = higher weight
    weightedSum += comp.price * weight;
    totalWeight += weight;
  });
  const weightedAverage = totalWeight > 0 ? weightedSum / totalWeight : medianPrice;
  methodology.push('weighted-average');

  // Adjust for sqft difference if target sqft provided
  let estimatedValue = weightedAverage;
  if (targetSqft && medianPricePerSqft > 0) {
    // Use median price per sqft to estimate value for target sqft
    const sqftBasedValue = medianPricePerSqft * targetSqft;

    // Blend weighted average with sqft-based estimate
    estimatedValue = (weightedAverage * 0.6) + (sqftBasedValue * 0.4);
    methodology.push('sqft-adjusted');

    console.log(`   Sqft adjustment: ${targetSqft} sqft @ $${medianPricePerSqft.toFixed(2)}/sqft`);
  }

  console.log(`   Estimated value: $${estimatedValue.toLocaleString()}`);

  // Calculate price ranges
  const summaryWithValue = {
    estimatedValue: Math.round(estimatedValue),
    lowRange: null,
    highRange: null,
    confidenceScore: null,
    methodology,
  };

  const summaryWithRanges = calculatePriceRanges(summaryWithValue, comps);
  const confidenceScore = calculateConfidenceScore(summaryWithRanges, comps);

  return {
    ...summaryWithRanges,
    confidenceScore,
  };
}

/**
 * Calculate price ranges from CMA summary and comps
 *
 * @param summary - CMA summary object
 * @param comps - Array of comps used
 * @returns CMASummary - Summary with calculated price ranges
 */
export function calculatePriceRanges(summary: CMASummary, comps: CMAComp[]): CMASummary {
  if (!summary.estimatedValue || comps.length === 0) {
    return summary;
  }

  console.log('📊 Calculating price ranges');

  // Calculate standard deviation of prices
  const prices = comps.map(c => c.price);
  const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);

  // Calculate coefficient of variation (CV) to measure spread
  const cv = stdDev / mean;

  // Determine range percentage based on market volatility
  let rangePercent = 0.08; // Default 8%

  if (cv < 0.15) {
    // Tight market: use 6-7% range
    rangePercent = 0.06;
    console.log('   Tight market detected (low volatility)');
  } else if (cv > 0.25) {
    // Volatile market: use 10% range
    rangePercent = 0.10;
    console.log('   Volatile market detected (high variability)');
  }

  const lowRange = Math.round(summary.estimatedValue * (1 - rangePercent));
  const highRange = Math.round(summary.estimatedValue * (1 + rangePercent));

  console.log(`   Price range: $${lowRange.toLocaleString()} - $${highRange.toLocaleString()}`);

  return {
    ...summary,
    lowRange,
    highRange,
  };
}

/**
 * Calculate confidence score for CMA valuation
 *
 * @param summary - CMA summary object
 * @param comps - Array of comps used
 * @returns number - Confidence score (0-100)
 */
export function calculateConfidenceScore(summary: CMASummary, comps: CMAComp[]): number {
  if (!summary.estimatedValue || comps.length === 0) {
    return 0;
  }

  console.log('📊 Calculating confidence score');

  let confidence = 50; // Start at 50%

  // Factor 1: Number of comps (more = higher confidence)
  // +5 points per comp, max +30
  const compBonus = Math.min(comps.length * 5, 30);
  confidence += compBonus;
  console.log(`   Comp count bonus: +${compBonus} (${comps.length} comps)`);

  // Factor 2: Comp similarity (tighter price range = higher confidence)
  const prices = comps.map(c => c.price);
  const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean;

  if (cv < 0.10) {
    confidence += 15;
    console.log('   Similarity bonus: +15 (very tight)');
  } else if (cv < 0.20) {
    confidence += 10;
    console.log('   Similarity bonus: +10 (tight)');
  } else if (cv > 0.30) {
    confidence -= 10;
    console.log('   Similarity penalty: -10 (high variance)');
  }

  // Factor 3: Data freshness (recent sales = higher confidence)
  const closedComps = comps.filter(c => c.closePrice && c.dom);
  if (closedComps.length > 0) {
    const avgDOM = closedComps.reduce((sum, c) => sum + (c.dom || 0), 0) / closedComps.length;

    if (avgDOM < 60) {
      confidence += 10;
      console.log('   Freshness bonus: +10 (recent sales)');
    } else if (avgDOM > 180) {
      confidence -= 5;
      console.log('   Freshness penalty: -5 (older sales)');
    }
  }

  // Factor 4: Subdivision match rate
  const subdivisions = comps.map(c => c.subdivision).filter(Boolean);
  if (subdivisions.length > 0) {
    const mostCommonSubdivision = subdivisions.sort((a, b) =>
      subdivisions.filter(v => v === a).length - subdivisions.filter(v => v === b).length
    ).pop();

    const matchRate = subdivisions.filter(s => s === mostCommonSubdivision).length / comps.length;

    if (matchRate > 0.7) {
      confidence += 5;
      console.log('   Subdivision bonus: +5 (high match rate)');
    }
  }

  // Cap confidence at 0-100
  confidence = Math.max(0, Math.min(100, confidence));

  console.log(`   Final confidence: ${confidence}%`);

  return confidence / 100; // Return as 0-1 scale
}
