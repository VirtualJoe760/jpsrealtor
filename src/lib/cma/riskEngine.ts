// src/lib/cma/riskEngine.ts
// Market Risk Analysis Engine

export interface RiskInputs {
  volatilityIndex: number | null;
  domTrend?: number; // Days on market trend (slope)
  inventoryTrend?: number; // Active listings trend
  priceTrendMomentum?: number; // Recent price acceleration/deceleration
  affordabilityScore?: number; // Mortgage payment vs income proxy (0-100)
  cashflowStrength?: number; // Cash-on-cash return or cap rate
  valuationAccuracy?: number; // How close subject price is to CMA estimate (0-100)
  comparableCount?: number; // Number of comps used
}

export interface RiskResult {
  score: number; // 0-100
  label: 'Low' | 'Moderate' | 'High';
  factors: Record<string, number>;
  interpretation: string;
  recommendations: string[];
}

/**
 * Calculate comprehensive market risk index
 * @param inputs - Risk calculation inputs
 * @returns Risk result with score, label, and breakdown
 */
export function calculateMarketRiskIndex(inputs: RiskInputs): RiskResult {
  console.log('[RiskEngine] Calculating market risk', inputs);

  const factors: Record<string, number> = {};
  let totalScore = 0;
  let totalWeight = 0;

  // 1. Volatility Risk (20% weight)
  if (inputs.volatilityIndex !== null && inputs.volatilityIndex !== undefined) {
    const volatilityRisk = Math.min(100, inputs.volatilityIndex * 100);
    factors['Volatility'] = volatilityRisk;
    totalScore += volatilityRisk * 0.20;
    totalWeight += 0.20;
  }

  // 2. Days on Market Trend (15% weight)
  // Positive DOM trend = increasing = risk
  if (inputs.domTrend !== undefined && inputs.domTrend !== null) {
    const domRisk = inputs.domTrend > 0
      ? Math.min(100, Math.abs(inputs.domTrend) * 5) // Rising DOM = risk
      : Math.max(0, 50 - Math.abs(inputs.domTrend) * 2); // Falling DOM = lower risk
    factors['Days on Market Trend'] = domRisk;
    totalScore += domRisk * 0.15;
    totalWeight += 0.15;
  }

  // 3. Inventory Trend (10% weight)
  // Rising inventory = risk
  if (inputs.inventoryTrend !== undefined && inputs.inventoryTrend !== null) {
    const inventoryRisk = inputs.inventoryTrend > 0
      ? Math.min(100, Math.abs(inputs.inventoryTrend) * 3)
      : Math.max(0, 40 - Math.abs(inputs.inventoryTrend));
    factors['Inventory Trend'] = inventoryRisk;
    totalScore += inventoryRisk * 0.10;
    totalWeight += 0.10;
  }

  // 4. Price Momentum Risk (15% weight)
  // Negative momentum = slowing = risk
  if (inputs.priceTrendMomentum !== undefined && inputs.priceTrendMomentum !== null) {
    const momentumRisk = inputs.priceTrendMomentum < 0
      ? Math.min(100, Math.abs(inputs.priceTrendMomentum) * 10)
      : Math.max(0, 30 - inputs.priceTrendMomentum * 2);
    factors['Price Momentum'] = momentumRisk;
    totalScore += momentumRisk * 0.15;
    totalWeight += 0.15;
  }

  // 5. Affordability Risk (10% weight)
  // Lower affordability = higher risk
  if (inputs.affordabilityScore !== undefined && inputs.affordabilityScore !== null) {
    const affordabilityRisk = 100 - inputs.affordabilityScore;
    factors['Affordability'] = affordabilityRisk;
    totalScore += affordabilityRisk * 0.10;
    totalWeight += 0.10;
  }

  // 6. Cashflow Strength (10% weight)
  // Negative cashflow = risk
  if (inputs.cashflowStrength !== undefined && inputs.cashflowStrength !== null) {
    const cashflowRisk = inputs.cashflowStrength < 0
      ? Math.min(100, 70 + Math.abs(inputs.cashflowStrength) * 10)
      : Math.max(0, 50 - inputs.cashflowStrength * 5);
    factors['Cashflow Strength'] = cashflowRisk;
    totalScore += cashflowRisk * 0.10;
    totalWeight += 0.10;
  }

  // 7. Valuation Accuracy (15% weight)
  // Large gap between subject and CMA = risk
  if (inputs.valuationAccuracy !== undefined && inputs.valuationAccuracy !== null) {
    const valuationRisk = 100 - inputs.valuationAccuracy;
    factors['Valuation Accuracy'] = valuationRisk;
    totalScore += valuationRisk * 0.15;
    totalWeight += 0.15;
  }

  // 8. Comparable Quality (5% weight)
  // Fewer comps = higher risk
  if (inputs.comparableCount !== undefined && inputs.comparableCount !== null) {
    const compRisk = inputs.comparableCount >= 5
      ? 10
      : inputs.comparableCount >= 3
        ? 30
        : 60;
    factors['Comparable Quality'] = compRisk;
    totalScore += compRisk * 0.05;
    totalWeight += 0.05;
  }

  // Normalize score
  const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 50;
  const finalScore = Math.round(Math.min(100, Math.max(0, normalizedScore)));

  // Determine label
  let label: 'Low' | 'Moderate' | 'High';
  if (finalScore < 30) {
    label = 'Low';
  } else if (finalScore < 60) {
    label = 'Moderate';
  } else {
    label = 'High';
  }

  // Generate interpretation
  const interpretation = generateInterpretation(finalScore, label, factors);
  const recommendations = generateRecommendations(finalScore, label, factors);

  console.log('[RiskEngine] Risk calculation complete', {
    score: finalScore,
    label,
    factorCount: Object.keys(factors).length,
  });

  return {
    score: finalScore,
    label,
    factors,
    interpretation,
    recommendations,
  };
}

/**
 * Generate textual interpretation of risk score
 */
function generateInterpretation(score: number, label: string, factors: Record<string, number>): string {
  const topFactors = Object.entries(factors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  let interpretation = '';

  if (label === 'Low') {
    interpretation = `This market presents **low investment risk** (${score}/100). `;
    interpretation += 'The property shows strong fundamentals with stable appreciation, ';
    interpretation += 'healthy market activity, and reliable valuation data.';
  } else if (label === 'Moderate') {
    interpretation = `This market carries **moderate risk** (${score}/100). `;
    interpretation += 'While there are some concerns, the market remains relatively stable. ';
    if (topFactors.length > 0) {
      interpretation += `Key risk factors include: ${topFactors.join(', ')}.`;
    }
  } else {
    interpretation = `This market presents **high risk** (${score}/100). `;
    interpretation += 'Several indicators suggest caution is warranted. ';
    if (topFactors.length > 0) {
      interpretation += `Primary concerns: ${topFactors.join(', ')}.`;
    }
  }

  return interpretation;
}

/**
 * Generate actionable recommendations based on risk profile
 */
function generateRecommendations(score: number, label: string, factors: Record<string, number>): string[] {
  const recommendations: string[] = [];

  // Volatility recommendations
  if (factors['Volatility'] && factors['Volatility'] > 50) {
    recommendations.push('Consider longer holding period to ride out market volatility');
    recommendations.push('Ensure adequate cash reserves for market downturns');
  }

  // DOM recommendations
  if (factors['Days on Market Trend'] && factors['Days on Market Trend'] > 60) {
    recommendations.push('Monitor days on market closely - rising DOM may signal cooling demand');
    recommendations.push('Price competitively if listing in this market');
  }

  // Inventory recommendations
  if (factors['Inventory Trend'] && factors['Inventory Trend'] > 60) {
    recommendations.push('Rising inventory suggests shifting to buyer\'s market');
    recommendations.push('Consider waiting for more favorable conditions if selling');
  }

  // Price momentum recommendations
  if (factors['Price Momentum'] && factors['Price Momentum'] > 60) {
    recommendations.push('Slowing price appreciation - adjust growth expectations');
    recommendations.push('Focus on properties with strong fundamentals independent of market timing');
  }

  // Cashflow recommendations
  if (factors['Cashflow Strength'] && factors['Cashflow Strength'] > 60) {
    recommendations.push('Negative cashflow detected - ensure long-term appreciation justifies holding costs');
    recommendations.push('Consider larger down payment to improve monthly economics');
  }

  // Valuation recommendations
  if (factors['Valuation Accuracy'] && factors['Valuation Accuracy'] > 60) {
    recommendations.push('Large gap between asking price and CMA value - negotiate accordingly');
    recommendations.push('Order professional appraisal to confirm valuation');
  }

  // Comparable quality recommendations
  if (factors['Comparable Quality'] && factors['Comparable Quality'] > 50) {
    recommendations.push('Limited comparable data - treat valuation estimates with caution');
    recommendations.push('Expand search radius or timeframe to find more comparables');
  }

  // General recommendations based on label
  if (label === 'High' && recommendations.length === 0) {
    recommendations.push('Conduct thorough due diligence before proceeding');
    recommendations.push('Consult with local real estate professionals');
    recommendations.push('Consider alternative properties with lower risk profiles');
  }

  if (label === 'Low' && recommendations.length === 0) {
    recommendations.push('Market conditions appear favorable for this investment');
    recommendations.push('Verify property-specific factors before finalizing decision');
  }

  return recommendations;
}

/**
 * Calculate risk trend over time
 */
export function calculateRiskTrend(
  currentRisk: RiskResult,
  previousRisk: RiskResult | null
): {
  trend: 'Improving' | 'Stable' | 'Worsening';
  change: number;
  description: string;
} {
  if (!previousRisk) {
    return {
      trend: 'Stable',
      change: 0,
      description: 'No historical risk data available for comparison',
    };
  }

  const change = currentRisk.score - previousRisk.score;

  let trend: 'Improving' | 'Stable' | 'Worsening';
  let description: string;

  if (change < -5) {
    trend = 'Improving';
    description = `Risk has decreased by ${Math.abs(change)} points, indicating improving market conditions`;
  } else if (change > 5) {
    trend = 'Worsening';
    description = `Risk has increased by ${change} points, suggesting deteriorating market conditions`;
  } else {
    trend = 'Stable';
    description = 'Risk level remains relatively stable compared to previous analysis';
  }

  return { trend, change, description };
}
