/**
 * Appreciation Analysis Calculations
 *
 * Calculate property value appreciation over time based on historical sales data.
 * Supports YoY, multi-year averages, and trend analysis.
 *
 * Compatible with:
 * - UnifiedClosedListing (preferred - unified collection)
 * - GPSClosedListing (legacy)
 * - CRMLSClosedListing (legacy)
 */

import type { ClosedSale } from '../aggregators/closed-sales';

export interface AppreciationResult {
  period: string;
  appreciation: {
    annual: number;           // Annual appreciation rate (%)
    cumulative: number;       // Total appreciation over period (%)
    trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    byYear?: Array<{
      year: number;
      rate: number;
      medianPrice: number;
      salesCount: number;
    }>;
  };
  marketData: {
    startMedianPrice: number;
    endMedianPrice: number;
    totalSales: number;
    confidence: 'high' | 'medium' | 'low';
  };
}

/**
 * Calculate appreciation rate between two periods
 *
 * @param startPrice - Starting median price
 * @param endPrice - Ending median price
 * @param years - Number of years between periods
 * @returns Annual appreciation rate as percentage
 */
export function calculateAppreciationRate(
  startPrice: number,
  endPrice: number,
  years: number
): number {
  if (startPrice <= 0 || years <= 0) return 0;

  // Simple appreciation: ((endPrice - startPrice) / startPrice) * 100
  const totalAppreciation = ((endPrice - startPrice) / startPrice) * 100;

  // Annualize if multi-year
  const annualAppreciation = totalAppreciation / years;

  return Number(annualAppreciation.toFixed(2));
}

/**
 * Calculate Compound Annual Growth Rate (CAGR)
 * More accurate for multi-year periods
 *
 * CAGR = (Ending Value / Beginning Value)^(1/years) - 1
 */
export function calculateCAGR(
  startPrice: number,
  endPrice: number,
  years: number
): number {
  if (startPrice <= 0 || years <= 0) return 0;

  const cagr = (Math.pow(endPrice / startPrice, 1 / years) - 1) * 100;
  return Number(cagr.toFixed(2));
}

/**
 * Analyze appreciation from historical sales data
 *
 * @param sales - Array of closed sales
 * @param period - Time period ('1y', '3y', '5y', '10y')
 * @returns Appreciation analysis results
 */
export function analyzeAppreciation(
  sales: ClosedSale[],
  period: '1y' | '3y' | '5y' | '10y' = '5y'
): AppreciationResult {
  // Parse period to years
  const years = parseInt(period);

  // Filter sales within time period
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - years);

  const relevantSales = sales.filter(sale => {
    const saleDate = new Date(sale.closeDate);
    return saleDate >= cutoffDate;
  });

  if (relevantSales.length < 3) {
    return {
      period,
      appreciation: {
        annual: 0,
        cumulative: 0,
        trend: 'stable'
      },
      marketData: {
        startMedianPrice: 0,
        endMedianPrice: 0,
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

  // Calculate median price per year
  const yearlyData = Array.from(salesByYear.entries())
    .map(([year, yearSales]) => {
      const prices = yearSales.map(s => s.closePrice).sort((a, b) => a - b);
      const mid = Math.floor(prices.length / 2);
      const median = prices.length % 2 === 0
        ? (prices[mid - 1] + prices[mid]) / 2
        : prices[mid];

      return {
        year,
        medianPrice: median,
        salesCount: yearSales.length
      };
    })
    .sort((a, b) => a.year - b.year);

  // Calculate year-over-year rates
  const yearlyRates = yearlyData.slice(1).map((data, idx) => {
    const prevData = yearlyData[idx];
    const rate = calculateAppreciationRate(
      prevData.medianPrice,
      data.medianPrice,
      1
    );

    return {
      year: data.year,
      rate,
      medianPrice: data.medianPrice,
      salesCount: data.salesCount
    };
  });

  // Overall appreciation
  const startPrice = yearlyData[0].medianPrice;
  const endPrice = yearlyData[yearlyData.length - 1].medianPrice;
  const actualYears = yearlyData[yearlyData.length - 1].year - yearlyData[0].year;

  const annualAppreciation = actualYears > 0
    ? calculateCAGR(startPrice, endPrice, actualYears)
    : 0;

  const cumulativeAppreciation = ((endPrice - startPrice) / startPrice) * 100;

  // Determine trend
  const recentRates = yearlyRates.slice(-3).map(y => y.rate);
  const avgRecentRate = recentRates.reduce((sum, r) => sum + r, 0) / recentRates.length;
  const stdDev = Math.sqrt(
    recentRates.reduce((sum, r) => sum + Math.pow(r - avgRecentRate, 2), 0) / recentRates.length
  );

  let trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  if (stdDev > 5) {
    trend = 'volatile';
  } else if (avgRecentRate > 3) {
    trend = 'increasing';
  } else if (avgRecentRate < -1) {
    trend = 'decreasing';
  } else {
    trend = 'stable';
  }

  // Confidence level based on sample size
  const confidence: 'high' | 'medium' | 'low' =
    relevantSales.length >= 20 ? 'high' :
      relevantSales.length >= 10 ? 'medium' :
        'low';

  return {
    period,
    appreciation: {
      annual: annualAppreciation,
      cumulative: Number(cumulativeAppreciation.toFixed(2)),
      trend,
      byYear: yearlyRates
    },
    marketData: {
      startMedianPrice: Math.round(startPrice),
      endMedianPrice: Math.round(endPrice),
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
