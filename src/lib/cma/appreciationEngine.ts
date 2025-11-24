// src/lib/cma/appreciationEngine.ts
// Historical appreciation analysis and forecasting
// Phase 3: Statistical Analysis & Investment Intelligence

import type { CMAComp, AppreciationResult } from './cmaTypes';

/**
 * Calculate historical appreciation metrics for a market
 *
 * @param comps - Array of comparable properties with historical data
 * @param subjectSubdivision - Optional subdivision name for localized analysis
 * @returns AppreciationResult - 5-year CAGR, YoY trends, volatility index
 */
export function calculateAppreciation(
  comps: CMAComp[],
  subjectSubdivision?: string
): AppreciationResult {
  console.log('📈 Calculating appreciation for', subjectSubdivision || 'general market');
  console.log(`📈 Analyzing ${comps.length} comps for appreciation trends`);

  // Filter comps to subdivision if specified
  const relevantComps = subjectSubdivision
    ? comps.filter(c => c.subdivision === subjectSubdivision)
    : comps;

  if (relevantComps.length === 0) {
    console.log('📈 No relevant comps found for appreciation analysis');
    return {
      cagr5: null,
      yoy: {},
      volatilityIndex: null,
    };
  }

  // Group comps by year (using closeDate)
  const compsByYear: { [year: string]: CMAComp[] } = {};
  const currentYear = new Date().getFullYear();

  relevantComps.forEach(comp => {
    // For closed sales, use closeDate; for active listings, use current year
    let year: number;
    if (comp.closePrice && comp.dom) {
      // Estimate close year based on DOM
      const daysAgo = comp.dom || 0;
      const closeDate = new Date();
      closeDate.setDate(closeDate.getDate() - daysAgo);
      year = closeDate.getFullYear();
    } else {
      year = currentYear;
    }

    const yearStr = year.toString();
    if (!compsByYear[yearStr]) {
      compsByYear[yearStr] = [];
    }
    compsByYear[yearStr].push(comp);
  });

  console.log('📈 Comps grouped by year:', Object.keys(compsByYear).length, 'years');

  // Calculate median price per year
  const mediansByYear: { [year: string]: number } = {};
  Object.keys(compsByYear).forEach(year => {
    const yearComps = compsByYear[year];
    const prices = yearComps.map(c => c.price).sort((a, b) => a - b);
    mediansByYear[year] = prices[Math.floor(prices.length / 2)] || 0;
  });

  // Calculate year-over-year appreciation rates
  const years = Object.keys(mediansByYear).map(Number).sort((a, b) => a - b);
  const yoy: { [year: string]: number } = {};

  for (let i = 1; i < years.length; i++) {
    const currentYear = years[i];
    const prevYear = years[i - 1];
    const currentPrice = mediansByYear[currentYear];
    const prevPrice = mediansByYear[prevYear];

    if (prevPrice > 0 && currentPrice > 0) {
      const appreciation = ((currentPrice - prevPrice) / prevPrice) * 100;
      yoy[currentYear.toString()] = Math.round(appreciation * 100) / 100; // Round to 2 decimals
      console.log(`   ${prevYear} → ${currentYear}: ${appreciation.toFixed(2)}%`);
    }
  }

  // Calculate 5-year CAGR if we have sufficient data
  let cagr5: number | null = null;
  if (years.length >= 2) {
    const firstYear = years[0];
    const lastYear = years[years.length - 1];
    const yearSpan = lastYear - firstYear;

    if (yearSpan >= 1) {
      const initialValue = mediansByYear[firstYear];
      const finalValue = mediansByYear[lastYear];

      if (initialValue > 0 && finalValue > 0) {
        // CAGR formula: (EndValue / StartValue)^(1/Years) - 1
        cagr5 = (Math.pow(finalValue / initialValue, 1 / yearSpan) - 1) * 100;
        cagr5 = Math.round(cagr5 * 100) / 100; // Round to 2 decimals
        console.log(`📈 ${yearSpan}-year CAGR: ${cagr5.toFixed(2)}%`);
      }
    }
  }

  // Calculate volatility index (standard deviation of annual returns)
  let volatilityIndex: number | null = null;
  const yoyValues = Object.values(yoy);

  if (yoyValues.length >= 2) {
    const mean = yoyValues.reduce((sum, val) => sum + val, 0) / yoyValues.length;
    const variance = yoyValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / yoyValues.length;
    const stdDev = Math.sqrt(variance);

    // Normalize to 0-1 scale (assuming typical real estate volatility of 0-20%)
    volatilityIndex = Math.min(stdDev / 20, 1);
    volatilityIndex = Math.round(volatilityIndex * 100) / 100; // Round to 2 decimals
    console.log(`📈 Volatility index: ${volatilityIndex.toFixed(2)} (std dev: ${stdDev.toFixed(2)}%)`);
  }

  return {
    cagr5,
    yoy,
    volatilityIndex,
  };
}

/**
 * Forecast future appreciation based on historical trends
 *
 * @param historicalData - Historical appreciation results
 * @param yearsAhead - Number of years to forecast (default 5)
 * @returns number | null - Predicted annual appreciation rate (%)
 */
export function forecastAppreciation(
  historicalData: AppreciationResult,
  yearsAhead: number = 5
): number | null {
  console.log(`📈 Forecasting appreciation for ${yearsAhead} years ahead`);

  // Need CAGR to make a forecast
  if (!historicalData.cagr5) {
    console.log('📈 No CAGR available for forecasting');
    return null;
  }

  const cagr = historicalData.cagr5;
  const yoyValues = Object.values(historicalData.yoy);

  // Calculate recent momentum (last 1-2 years)
  let recentMomentum = cagr;
  if (yoyValues.length > 0) {
    // Weight recent years more heavily
    const recentYears = yoyValues.slice(-2); // Last 2 years
    recentMomentum = recentYears.reduce((sum, val) => sum + val, 0) / recentYears.length;
    console.log(`   Recent momentum (last ${recentYears.length} years): ${recentMomentum.toFixed(2)}%`);
  }

  // Blend CAGR (60%) with recent momentum (40%)
  let forecast = (cagr * 0.6) + (recentMomentum * 0.4);

  // Apply volatility dampening for longer forecasts
  const volatility = historicalData.volatilityIndex || 0;
  if (yearsAhead > 3 && volatility > 0.5) {
    // High volatility = reduce forecast confidence
    const dampeningFactor = 1 - ((yearsAhead - 3) * 0.1 * volatility);
    forecast *= Math.max(0.7, dampeningFactor); // Don't dampen more than 30%
    console.log(`   Applied volatility dampening: ${(dampeningFactor * 100).toFixed(1)}%`);
  }

  // Cap forecasts at reasonable bounds (-5% to +15%)
  forecast = Math.max(-5, Math.min(15, forecast));
  forecast = Math.round(forecast * 100) / 100; // Round to 2 decimals

  console.log(`📈 Forecast: ${forecast.toFixed(2)}% annual appreciation`);

  return forecast;
}

/**
 * Project future property value based on appreciation forecast
 *
 * @param currentValue - Current property value
 * @param appreciationRate - Annual appreciation rate (%)
 * @param years - Number of years to project
 * @returns number - Projected future value
 */
export function projectFutureValue(
  currentValue: number,
  appreciationRate: number,
  years: number
): number {
  if (currentValue <= 0 || years <= 0) return currentValue;

  // Compound appreciation: FV = PV * (1 + r)^n
  const futureValue = currentValue * Math.pow(1 + (appreciationRate / 100), years);

  console.log(`📈 Projection: $${currentValue.toLocaleString()} → $${futureValue.toLocaleString()} (${years} years @ ${appreciationRate}%)`);

  return Math.round(futureValue);
}

/**
 * Calculate total appreciation over a period
 *
 * @param initialValue - Initial property value
 * @param finalValue - Final property value
 * @returns number - Total appreciation percentage
 */
export function calculateTotalAppreciation(
  initialValue: number,
  finalValue: number
): number {
  if (initialValue <= 0) return 0;

  const totalAppreciation = ((finalValue - initialValue) / initialValue) * 100;
  return Math.round(totalAppreciation * 100) / 100; // Round to 2 decimals
}
