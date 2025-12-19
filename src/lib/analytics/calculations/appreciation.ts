/**
 * Appreciation Analysis Calculations
 *
 * Calculate property value appreciation over time based on historical sales data.
 * Uses AVERAGE prices (not median) for year-over-year comparisons.
 *
 * Market Terminology:
 * - Bullish: Positive appreciation trend (prices rising)
 * - Bearish: Negative appreciation trend (prices falling)
 * - Neutral: Stable market (minimal change)
 * - Mixed: High volatility (inconsistent patterns)
 *
 * Compatible with:
 * - UnifiedClosedListing (preferred - unified collection)
 * - GPSClosedListing (legacy)
 * - CRMLSClosedListing (legacy)
 */

import type { ClosedSale } from '../aggregators/closed-sales';

export interface YearlyMarketData {
  year: number;

  // Average metrics (primary)
  avgListPrice: number;
  avgSalePrice: number;
  avgPricePerSqFt: number;

  // Statistical reference
  minPrice: number;
  maxPrice: number;
  medianPrice: number;

  // Appreciation from previous year
  appreciationRate: number;  // % change from prior year

  // Sample data
  salesCount: number;
}

export interface AppreciationResult {
  period: string;
  appreciation: {
    annual: number;           // Annualized appreciation rate (%)
    cumulative: number;       // Total appreciation over period (%)
    twoYear: number;          // 2-year appreciation (%)
    fiveYear: number;         // 5-year appreciation (%)
    trend: 'bullish' | 'bearish' | 'neutral' | 'mixed';
    byYear: YearlyMarketData[];
  };
  marketData: {
    startAvgPrice: number;
    endAvgPrice: number;
    startPricePerSqFt: number;
    endPricePerSqFt: number;
    totalSales: number;
    confidence: 'high' | 'medium' | 'low';
  };
}

/**
 * Calculate average from array of numbers
 */
function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, val) => acc + val, 0);
  return sum / numbers.length;
}

/**
 * Calculate median from array of numbers
 */
function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Remove outliers using IQR method
 * Helps prevent crazy appreciation rates from bad data
 */
function removeOutliers(numbers: number[]): number[] {
  if (numbers.length < 4) return numbers; // Need at least 4 points for IQR

  const sorted = [...numbers].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);

  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  const lowerBound = q1 - (1.5 * iqr);
  const upperBound = q3 + (1.5 * iqr);

  return numbers.filter(n => n >= lowerBound && n <= upperBound);
}

/**
 * Calculate appreciation rate between two values
 */
export function calculateAppreciationRate(
  startValue: number,
  endValue: number
): number {
  if (startValue <= 0) return 0;
  return ((endValue - startValue) / startValue) * 100;
}

/**
 * Calculate Compound Annual Growth Rate (CAGR)
 */
export function calculateCAGR(
  startValue: number,
  endValue: number,
  years: number
): number {
  if (startValue <= 0 || years <= 0) return 0;
  const cagr = (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
  return Number(cagr.toFixed(2));
}

/**
 * Analyze appreciation from historical sales data
 *
 * Uses AVERAGE prices for all calculations (not median)
 * Provides comprehensive metrics: list price, sale price, price/sqft
 * Calculates both 2-year and 5-year appreciation
 *
 * @param sales - Array of closed sales from unified_closed_listings
 * @param period - Time period ('1y', '3y', '5y', '10y')
 * @returns Detailed appreciation analysis
 */
export function analyzeAppreciation(
  sales: ClosedSale[],
  period: '1y' | '3y' | '5y' | '10y' = '5y'
): AppreciationResult {
  const years = parseInt(period);

  // Determine the date range for COMPLETE years only
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11

  // Only include current year if we're past June (at least 6 months of data)
  const includeCurrentYear = currentMonth >= 6; // July or later

  // Calculate the end year and start year for complete data
  const endYear = includeCurrentYear ? currentYear : currentYear - 1;
  const startYear = endYear - years + 1;

  // Create date boundaries for filtering
  const startDate = new Date(startYear, 0, 1); // Jan 1 of start year
  const endDate = new Date(endYear, 11, 31, 23, 59, 59); // Dec 31 of end year

  // Filter sales data - API already filters by property type, so just validate data quality
  const relevantSales = sales.filter(sale => {
    const saleDate = new Date(sale.closeDate);

    // Must be within our complete year range
    if (saleDate < startDate || saleDate > endDate) return false;

    // Must have valid price data
    if (!sale.closePrice || sale.closePrice <= 0) return false;

    // Exclude low-value transactions (rental assignments, transfers, etc.)
    // Reasonable minimum for actual property sales is $50k
    if (sale.closePrice < 50000) return false;

    // Exclude obvious data errors (Land = C, Business = D)
    if (sale.propertyType && ['C', 'D'].includes(sale.propertyType)) {
      return false;
    }

    // Exclude Type B (Multi-Family) unless explicitly requested via API filter
    // This prevents rental market data from contaminating residential sales
    if (sale.propertyType === 'B') {
      return false;
    }

    return true;
  });

  // Minimum sample size check
  if (relevantSales.length < 3) {
    return {
      period,
      appreciation: {
        annual: 0,
        cumulative: 0,
        twoYear: 0,
        fiveYear: 0,
        trend: 'neutral',
        byYear: []
      },
      marketData: {
        startAvgPrice: 0,
        endAvgPrice: 0,
        startPricePerSqFt: 0,
        endPricePerSqFt: 0,
        totalSales: relevantSales.length,
        confidence: 'low'
      }
    };
  }

  // Sort by date
  const sortedSales = [...relevantSales].sort((a, b) =>
    new Date(a.closeDate).getTime() - new Date(b.closeDate).getTime()
  );

  // Group by year
  const salesByYear: Map<number, ClosedSale[]> = new Map();
  sortedSales.forEach(sale => {
    const year = new Date(sale.closeDate).getFullYear();
    if (!salesByYear.has(year)) {
      salesByYear.set(year, []);
    }
    salesByYear.get(year)!.push(sale);
  });

  // Calculate comprehensive yearly statistics
  const yearlyData: YearlyMarketData[] = Array.from(salesByYear.entries())
    .map(([year, yearSales]) => {
      // Extract prices and filter out invalid data
      const salePrices = yearSales
        .map(s => s.closePrice)
        .filter(p => p > 0);

      const listPrices = yearSales
        .map(s => s.listPrice)
        .filter(p => p > 0);

      const pricesPerSqFt = yearSales
        .map(s => s.closePrice && s.livingArea ? s.closePrice / s.livingArea : 0)
        .filter(p => p > 0 && p < 10000); // Cap at $10k/sqft to filter outliers

      // Remove outliers for more accurate averages
      const cleanSalePrices = removeOutliers(salePrices);
      const cleanListPrices = removeOutliers(listPrices);
      const cleanPricesPerSqFt = removeOutliers(pricesPerSqFt);

      return {
        year,
        avgListPrice: Math.round(calculateAverage(cleanListPrices)),
        avgSalePrice: Math.round(calculateAverage(cleanSalePrices)),
        avgPricePerSqFt: Math.round(calculateAverage(cleanPricesPerSqFt)),
        minPrice: Math.round(Math.min(...salePrices)),
        maxPrice: Math.round(Math.max(...salePrices)),
        medianPrice: Math.round(calculateMedian(salePrices)),
        appreciationRate: 0, // Will be calculated next
        salesCount: yearSales.length
      };
    })
    .sort((a, b) => a.year - b.year);

  // Calculate year-over-year appreciation rates
  for (let i = 1; i < yearlyData.length; i++) {
    const prevYear = yearlyData[i - 1];
    const currYear = yearlyData[i];

    currYear.appreciationRate = calculateAppreciationRate(
      prevYear.avgSalePrice,
      currYear.avgSalePrice
    );
  }

  // Overall appreciation metrics
  const startYearData = yearlyData[0];
  const endYearData = yearlyData[yearlyData.length - 1];
  const actualYears = endYearData.year - startYearData.year;

  const annualAppreciation = actualYears > 0
    ? calculateCAGR(startYearData.avgSalePrice, endYearData.avgSalePrice, actualYears)
    : 0;

  const cumulativeAppreciation = calculateAppreciationRate(
    startYearData.avgSalePrice,
    endYearData.avgSalePrice
  );

  // Calculate 2-year appreciation
  let twoYearAppreciation = 0;
  if (yearlyData.length >= 2) {
    const twoYearsAgo = yearlyData[yearlyData.length - 2];
    twoYearAppreciation = calculateAppreciationRate(
      twoYearsAgo.avgSalePrice,
      endYearData.avgSalePrice
    );
  }

  // Calculate 5-year appreciation
  let fiveYearAppreciation = 0;
  if (yearlyData.length >= 5) {
    const fiveYearsAgo = yearlyData[0];
    fiveYearAppreciation = calculateAppreciationRate(
      fiveYearsAgo.avgSalePrice,
      endYearData.avgSalePrice
    );
  } else if (yearlyData.length > 1) {
    // Use available data if less than 5 years
    fiveYearAppreciation = cumulativeAppreciation;
  }

  // Determine market trend using Bullish/Bearish terminology
  const recentRates = yearlyData.slice(-3).map(y => y.appreciationRate).filter(r => r !== 0);
  const avgRecentRate = calculateAverage(recentRates);

  // Calculate standard deviation for volatility check
  const variance = recentRates.reduce((sum, r) =>
    sum + Math.pow(r - avgRecentRate, 2), 0) / recentRates.length;
  const stdDev = Math.sqrt(variance);

  let trend: 'bullish' | 'bearish' | 'neutral' | 'mixed';

  // Mixed market: High volatility (wild swings)
  if (stdDev > 10) {
    trend = 'mixed';
  }
  // Bullish market: Prices trending up
  else if (avgRecentRate > 3) {
    trend = 'bullish';
  }
  // Bearish market: Prices trending down
  else if (avgRecentRate < -2) {
    trend = 'bearish';
  }
  // Neutral market: Stable/flat
  else {
    trend = 'neutral';
  }

  // Confidence level based on sample size
  const confidence: 'high' | 'medium' | 'low' =
    relevantSales.length >= 30 ? 'high' :
      relevantSales.length >= 15 ? 'medium' :
        'low';

  return {
    period,
    appreciation: {
      annual: Number(annualAppreciation.toFixed(2)),
      cumulative: Number(cumulativeAppreciation.toFixed(2)),
      twoYear: Number(twoYearAppreciation.toFixed(2)),
      fiveYear: Number(fiveYearAppreciation.toFixed(2)),
      trend,
      byYear: yearlyData
    },
    marketData: {
      startAvgPrice: startYearData.avgSalePrice,
      endAvgPrice: endYearData.avgSalePrice,
      startPricePerSqFt: startYearData.avgPricePerSqFt,
      endPricePerSqFt: endYearData.avgPricePerSqFt,
      totalSales: relevantSales.length,
      confidence
    }
  };
}

/**
 * Compare appreciation between multiple locations
 *
 * @param locationSales - Map of location name to sales data
 * @param period - Time period to analyze
 * @returns Comparison results with rankings
 */
export function compareAppreciation(
  locationSales: Map<string, ClosedSale[]>,
  period: '1y' | '3y' | '5y' | '10y' = '5y'
): Array<{
  location: string;
  appreciation: AppreciationResult;
  rank: number;
}> {
  const results = Array.from(locationSales.entries()).map(([location, sales]) => ({
    location,
    appreciation: analyzeAppreciation(sales, period)
  }));

  // Sort by annual appreciation (descending)
  results.sort((a, b) =>
    b.appreciation.appreciation.annual - a.appreciation.appreciation.annual
  );

  // Add rankings
  return results.map((result, index) => ({
    ...result,
    rank: index + 1
  }));
}
