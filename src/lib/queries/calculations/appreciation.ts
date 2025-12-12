/**
 * Appreciation Calculations
 *
 * Calculate property appreciation trends from closed sales data.
 * Integrates with the analytics appreciation module.
 */

import type { ClosedListing } from '../aggregators/closed-listings';

export interface AppreciationResult {
  period: string; // '1y', '3y', '5y'
  annualRate: number; // Annual appreciation rate (%)
  cumulativeRate: number; // Total appreciation (%)
  trend: 'increasing' | 'decreasing' | 'stable';
  byYear: Array<{
    year: number;
    avgPrice: number;
    medianPrice: number;
    salesCount: number;
    yearOverYearChange?: number;
  }>;
  confidence: 'low' | 'medium' | 'high';
  sampleSize: number;
}

/**
 * Calculate appreciation from closed sales data
 */
export function calculateAppreciation(
  closedSales: ClosedListing[],
  period: '1y' | '3y' | '5y' | '10y' = '5y'
): AppreciationResult {
  if (closedSales.length === 0) {
    return {
      period,
      annualRate: 0,
      cumulativeRate: 0,
      trend: 'stable',
      byYear: [],
      confidence: 'low',
      sampleSize: 0,
    };
  }

  // Group sales by year
  const salesByYear = groupByYear(closedSales);
  const years = Object.keys(salesByYear)
    .map(Number)
    .sort((a, b) => a - b);

  if (years.length < 2) {
    return {
      period,
      annualRate: 0,
      cumulativeRate: 0,
      trend: 'stable',
      byYear: [],
      confidence: 'low',
      sampleSize: closedSales.length,
    };
  }

  // Calculate stats by year
  const byYear = years.map((year, index) => {
    const yearSales = salesByYear[year];
    const avgPrice = average(yearSales.map((s) => s.closePrice));
    const medianPrice = median(yearSales.map((s) => s.closePrice));

    let yearOverYearChange: number | undefined;
    if (index > 0) {
      const prevYear = years[index - 1];
      const prevAvgPrice = average(salesByYear[prevYear].map((s) => s.closePrice));
      yearOverYearChange = ((avgPrice - prevAvgPrice) / prevAvgPrice) * 100;
    }

    return {
      year,
      avgPrice: Math.round(avgPrice),
      medianPrice: Math.round(medianPrice),
      salesCount: yearSales.length,
      yearOverYearChange: yearOverYearChange ? Math.round(yearOverYearChange * 10) / 10 : undefined,
    };
  });

  // Calculate overall appreciation
  const firstYear = byYear[0];
  const lastYear = byYear[byYear.length - 1];
  const yearsElapsed = lastYear.year - firstYear.year;

  if (yearsElapsed === 0) {
    return {
      period,
      annualRate: 0,
      cumulativeRate: 0,
      trend: 'stable',
      byYear,
      confidence: 'low',
      sampleSize: closedSales.length,
    };
  }

  // CAGR (Compound Annual Growth Rate)
  const cumulativeRate = ((lastYear.avgPrice - firstYear.avgPrice) / firstYear.avgPrice) * 100;
  const annualRate = (Math.pow(lastYear.avgPrice / firstYear.avgPrice, 1 / yearsElapsed) - 1) * 100;

  // Determine trend
  const recentYears = byYear.slice(-3); // Last 3 years
  const positiveYears = recentYears.filter((y) => (y.yearOverYearChange || 0) > 0).length;
  const trend: 'increasing' | 'decreasing' | 'stable' =
    positiveYears >= 2 ? 'increasing' : positiveYears === 0 ? 'decreasing' : 'stable';

  // Confidence based on sample size
  const avgSalesPerYear = closedSales.length / yearsElapsed;
  const confidence: 'low' | 'medium' | 'high' =
    avgSalesPerYear > 50 ? 'high' : avgSalesPerYear > 20 ? 'medium' : 'low';

  return {
    period,
    annualRate: Math.round(annualRate * 10) / 10,
    cumulativeRate: Math.round(cumulativeRate * 10) / 10,
    trend,
    byYear,
    confidence,
    sampleSize: closedSales.length,
  };
}

/**
 * Calculate price trends (moving averages)
 */
export function calculatePriceTrends(
  closedSales: ClosedListing[],
  windowMonths: number = 3
): Array<{
  month: string; // 'YYYY-MM'
  avgPrice: number;
  medianPrice: number;
  salesCount: number;
  movingAvg?: number;
}> {
  // Group by month
  const salesByMonth: Record<string, ClosedListing[]> = {};

  closedSales.forEach((sale) => {
    const date = new Date(sale.closeDate);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!salesByMonth[month]) {
      salesByMonth[month] = [];
    }
    salesByMonth[month].push(sale);
  });

  // Calculate stats by month
  const months = Object.keys(salesByMonth).sort();
  const trends = months.map((month) => {
    const monthSales = salesByMonth[month];
    const avgPrice = average(monthSales.map((s) => s.closePrice));
    const medianPrice = median(monthSales.map((s) => s.closePrice));

    return {
      month,
      avgPrice: Math.round(avgPrice),
      medianPrice: Math.round(medianPrice),
      salesCount: monthSales.length,
      movingAvg: undefined as number | undefined,
    };
  });

  // Add moving average
  trends.forEach((trend, index) => {
    if (index >= windowMonths - 1) {
      const window = trends.slice(index - windowMonths + 1, index + 1);
      trend.movingAvg = Math.round(average(window.map((t) => t.avgPrice)));
    }
  });

  return trends;
}

/**
 * Group sales by year
 */
function groupByYear(sales: ClosedListing[]): Record<number, ClosedListing[]> {
  const grouped: Record<number, ClosedListing[]> = {};

  sales.forEach((sale) => {
    const year = new Date(sale.closeDate).getFullYear();
    if (!grouped[year]) {
      grouped[year] = [];
    }
    grouped[year].push(sale);
  });

  return grouped;
}

/**
 * Calculate average
 */
function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

/**
 * Calculate median
 */
function median(numbers: number[]): number {
  if (numbers.length === 0) return 0;

  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}
