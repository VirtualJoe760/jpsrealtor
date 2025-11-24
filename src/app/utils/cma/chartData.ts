// src/utils/cma/chartData.ts
// Prepare CMA data for chart components

import type {
  ComparableProperty,
  SubjectProperty,
  PriceTrendData,
  CMAChartData,
} from "@/types/cma";

/**
 * Prepare price comparison chart data
 */
export function preparePriceComparisonData(
  subject: SubjectProperty,
  comparables: ComparableProperty[]
): CMAChartData["priceComparison"] {
  const properties = [subject, ...comparables.slice(0, 9)]; // Include subject + top 9 comps

  const labels = properties.map((p, index) => {
    if (index === 0) return "Subject Property";
    return `Comp ${index}`;
  });

  const values = properties.map((p) => p.soldPrice || p.listPrice);

  const colors = properties.map((p, index) => {
    if (index === 0) return "#3B82F6"; // Blue for subject
    if (p.standardStatus === "Closed") return "#10B981"; // Green for sold
    return "#F59E0B"; // Orange for active
  });

  return { labels, values, colors };
}

/**
 * Prepare price trends chart data
 */
export function preparePriceTrendsData(
  trends: PriceTrendData[]
): CMAChartData["priceTrends"] {
  const dates = trends.map((t) => t.date);
  const avgPrices = trends.map((t) => t.averagePrice);
  const medianPrices = trends.map((t) => t.medianPrice);

  return { dates, avgPrices, medianPrices };
}

/**
 * Prepare price per sqft comparison chart data
 */
export function preparePricePerSqFtData(
  subject: SubjectProperty,
  comparables: ComparableProperty[]
): CMAChartData["pricePerSqFt"] {
  const properties = [subject, ...comparables.slice(0, 9)]
    .filter((p) => p.pricePerSqFt && p.pricePerSqFt > 0);

  const labels = properties.map((p, index) => {
    if (index === 0) return "Subject";
    return `Comp ${index}`;
  });

  const values = properties.map((p) => p.pricePerSqFt || 0);

  return { labels, values };
}

/**
 * Prepare days on market chart data
 */
export function prepareDaysOnMarketData(
  subject: SubjectProperty,
  comparables: ComparableProperty[]
): CMAChartData["daysOnMarket"] {
  const properties = [subject, ...comparables.slice(0, 9)]
    .filter((p) => p.daysOnMarket && p.daysOnMarket > 0);

  const labels = properties.map((p, index) => {
    if (index === 0) return "Subject";
    return `Comp ${index}`;
  });

  const values = properties.map((p) => p.daysOnMarket!);

  return { labels, values };
}

/**
 * Prepare all chart data at once
 */
export function prepareAllCMAChartData(
  subject: SubjectProperty,
  comparables: ComparableProperty[],
  trends: PriceTrendData[] = []
): CMAChartData {
  return {
    priceComparison: preparePriceComparisonData(subject, comparables),
    priceTrends: preparePriceTrendsData(trends),
    pricePerSqFt: preparePricePerSqFtData(subject, comparables),
    daysOnMarket: prepareDaysOnMarketData(subject, comparables),
  };
}

/**
 * Format currency for charts
 */
export function formatChartCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value}`;
}

/**
 * Format date for charts
 */
export function formatChartDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
