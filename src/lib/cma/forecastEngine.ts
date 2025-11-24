// src/lib/cma/forecastEngine.ts
// Forecast Engine for Predictive Property Valuation

import type { AppreciationResult } from './cmaTypes';

export interface ForecastPoint {
  year: number;
  projectedValue: number;
  appreciationRate: number;
}

export interface ForecastResult {
  currentValue: number;
  forecast1Year: ForecastPoint;
  forecast3Year: ForecastPoint;
  forecast5Year: ForecastPoint;
  forecast10Year: ForecastPoint;
  forecastCurve: ForecastPoint[];
  methodology: {
    cagr5: number | null;
    yoyAverage: number | null;
    volatilityDampening: number;
    effectiveRate: number;
  };
}

/**
 * Calculate forecast curve using blended appreciation methodology
 * @param appreciationHistory - Historical appreciation data
 * @param currentValue - Current property value
 * @param years - Number of years to forecast (default 10)
 */
export function calculateForecastCurve(
  appreciationHistory: AppreciationResult,
  currentValue: number,
  years: number = 10
): ForecastResult {
  console.log('[ForecastEngine] Calculating forecast curve', {
    currentValue,
    years,
    cagr5: appreciationHistory.cagr5,
    volatilityIndex: appreciationHistory.volatilityIndex,
  });

  // Extract key metrics
  const cagr5 = appreciationHistory.cagr5 || 0;
  const volatilityIndex = appreciationHistory.volatilityIndex || 0;

  // Calculate YOY momentum (recent years weighted heavier)
  const historyYears = appreciationHistory.historyYears || [];
  let yoyWeightedSum = 0;
  let weightSum = 0;

  if (historyYears.length > 0) {
    historyYears.forEach((yearData, index) => {
      // More recent years get higher weight
      const weight = index + 1; // Linear weight: 1, 2, 3, 4, 5
      const yoyRate = yearData.yoyGrowth || 0;
      yoyWeightedSum += yoyRate * weight;
      weightSum += weight;
    });
  }

  const yoyMomentum = weightSum > 0 ? yoyWeightedSum / weightSum : cagr5;

  // Calculate YOY simple average
  const yoySum = historyYears.reduce((sum, year) => sum + (year.yoyGrowth || 0), 0);
  const yoyAverage = historyYears.length > 0 ? yoySum / historyYears.length : cagr5;

  // Volatility dampening: high volatility reduces confidence in forecast
  // effectiveRate = (CAGR * 0.6 + YOYMomentum * 0.4) * (1 - volatilityIndex)
  const blendedRate = (cagr5 * 0.6 + yoyMomentum * 0.4);
  const volatilityDampening = Math.max(0, Math.min(1, volatilityIndex)); // Clamp 0-1
  const effectiveRate = blendedRate * (1 - volatilityDampening * 0.3); // Max 30% dampening

  console.log('[ForecastEngine] Calculated rates', {
    cagr5,
    yoyAverage,
    yoyMomentum,
    blendedRate,
    volatilityDampening,
    effectiveRate,
  });

  // Generate forecast curve
  const forecastCurve: ForecastPoint[] = [];
  let projectedValue = currentValue;

  for (let year = 1; year <= years; year++) {
    // Apply effective rate
    projectedValue = projectedValue * (1 + effectiveRate / 100);

    forecastCurve.push({
      year,
      projectedValue: Math.round(projectedValue),
      appreciationRate: effectiveRate,
    });
  }

  // Extract specific milestones
  const forecast1Year = forecastCurve[0] || { year: 1, projectedValue: currentValue, appreciationRate: 0 };
  const forecast3Year = forecastCurve[2] || forecast1Year;
  const forecast5Year = forecastCurve[4] || forecast3Year;
  const forecast10Year = forecastCurve[9] || forecast5Year;

  const result: ForecastResult = {
    currentValue,
    forecast1Year,
    forecast3Year,
    forecast5Year,
    forecast10Year,
    forecastCurve,
    methodology: {
      cagr5,
      yoyAverage,
      volatilityDampening,
      effectiveRate,
    },
  };

  console.log('[ForecastEngine] Forecast complete', {
    currentValue,
    forecast1Year: forecast1Year.projectedValue,
    forecast5Year: forecast5Year.projectedValue,
    forecast10Year: forecast10Year.projectedValue,
  });

  return result;
}

/**
 * Generate textual interpretation of forecast
 */
export function interpretForecast(forecast: ForecastResult): string {
  const { effectiveRate } = forecast.methodology;
  const { forecast5Year, currentValue } = forecast;

  const totalAppreciation = ((forecast5Year.projectedValue - currentValue) / currentValue) * 100;

  let interpretation = '';

  if (effectiveRate > 5) {
    interpretation = `This market is **accelerating** with a strong ${effectiveRate.toFixed(1)}% annual growth rate. `;
  } else if (effectiveRate > 3) {
    interpretation = `This market is showing **healthy growth** at ${effectiveRate.toFixed(1)}% annually. `;
  } else if (effectiveRate > 1) {
    interpretation = `This market is experiencing **modest appreciation** at ${effectiveRate.toFixed(1)}% per year. `;
  } else if (effectiveRate > 0) {
    interpretation = `This market is **slowing down** with minimal ${effectiveRate.toFixed(1)}% annual growth. `;
  } else {
    interpretation = `This market appears **flat or declining** with ${effectiveRate.toFixed(1)}% growth rate. `;
  }

  interpretation += `Over 5 years, the property value is projected to increase by ${totalAppreciation.toFixed(1)}%, `;
  interpretation += `reaching approximately $${forecast5Year.projectedValue.toLocaleString()}.`;

  return interpretation;
}

/**
 * Calculate market momentum indicator
 */
export function calculateMarketMomentum(appreciationHistory: AppreciationResult): {
  momentum: number;
  label: 'Accelerating' | 'Stable' | 'Slowing' | 'Declining';
  description: string;
} {
  const historyYears = appreciationHistory.historyYears || [];

  if (historyYears.length < 2) {
    return {
      momentum: 0,
      label: 'Stable',
      description: 'Insufficient data for momentum analysis',
    };
  }

  // Compare recent year vs older average
  const recentYear = historyYears[historyYears.length - 1];
  const olderYears = historyYears.slice(0, -1);
  const olderAverage = olderYears.reduce((sum, year) => sum + (year.yoyGrowth || 0), 0) / olderYears.length;

  const recentRate = recentYear.yoyGrowth || 0;
  const momentum = recentRate - olderAverage;

  let label: 'Accelerating' | 'Stable' | 'Slowing' | 'Declining';
  let description: string;

  if (momentum > 2) {
    label = 'Accelerating';
    description = `Market is gaining momentum with ${Math.abs(momentum).toFixed(1)}% increase over historical average`;
  } else if (momentum > -2) {
    label = 'Stable';
    description = 'Market growth is steady and consistent';
  } else if (momentum > -5) {
    label = 'Slowing';
    description = `Market is cooling down with ${Math.abs(momentum).toFixed(1)}% decrease from historical average`;
  } else {
    label = 'Declining';
    description = `Market is significantly slowing with ${Math.abs(momentum).toFixed(1)}% decline`;
  }

  return { momentum, label, description };
}
