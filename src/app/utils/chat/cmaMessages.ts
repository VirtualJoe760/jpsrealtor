// src/app/utils/chat/cmaMessages.ts
// Utilities for generating CMA-related chat messages

import type { CMASummary, AppreciationResult, CashflowResult } from "@/lib/cma/cmaTypes";

/**
 * Generate introductory message for CMA results
 */
export function generateCMAIntroMessage(subjectAddress?: string): string {
  if (subjectAddress) {
    return `Here is a comprehensive Comparative Market Analysis (CMA) for **${subjectAddress}**. This includes market valuation, comparable property analysis, historical appreciation trends, and investment cashflow projections.`;
  }
  return `Here is a comprehensive Comparative Market Analysis (CMA). This analysis includes market valuation, comparable properties, appreciation trends, and investment metrics based on current market data.`;
}

/**
 * Generate value assessment message (overpriced/underpriced/fair)
 */
export function generateValueAssessmentMessage(
  estimatedValue: number,
  listPrice: number
): string {
  const difference = listPrice - estimatedValue;
  const percentDiff = (difference / estimatedValue) * 100;

  if (Math.abs(percentDiff) < 3) {
    return `Based on comparable sales, this property appears to be **fairly priced** at $${listPrice.toLocaleString()}, aligning closely with the estimated market value of $${estimatedValue.toLocaleString()}.`;
  } else if (percentDiff > 0) {
    return `Based on comparable sales, this property appears to be **${Math.abs(percentDiff).toFixed(1)}% above** estimated market value. The list price of $${listPrice.toLocaleString()} is approximately $${Math.abs(difference).toLocaleString()} higher than the CMA-estimated value of $${estimatedValue.toLocaleString()}.`;
  } else {
    return `Based on comparable sales, this property appears to be **${Math.abs(percentDiff).toFixed(1)}% below** estimated market value. The list price of $${listPrice.toLocaleString()} represents potential value, as the CMA estimates market value at $${estimatedValue.toLocaleString()}.`;
  }
}

/**
 * Generate appreciation summary message
 */
export function generateAppreciationMessage(appreciation: AppreciationResult): string {
  const messages: string[] = [];

  if (appreciation.cagr5 !== null) {
    const trend = appreciation.cagr5 >= 5 ? 'strong' : appreciation.cagr5 >= 2 ? 'moderate' : 'modest';
    messages.push(
      `This market has shown **${trend} appreciation** with a 5-year CAGR of **${appreciation.cagr5.toFixed(2)}%**.`
    );
  }

  if (appreciation.volatilityIndex !== null) {
    const stability = appreciation.volatilityIndex < 0.3 ? 'stable' : appreciation.volatilityIndex < 0.6 ? 'moderately volatile' : 'highly volatile';
    messages.push(
      `Market volatility is **${stability}** (${(appreciation.volatilityIndex * 100).toFixed(0)}% volatility index).`
    );
  }

  const recentYears = Object.entries(appreciation.yoy)
    .sort(([a], [b]) => parseInt(b) - parseInt(a))
    .slice(0, 3);

  if (recentYears.length > 0) {
    const avgRecent = recentYears.reduce((sum, [, rate]) => sum + rate, 0) / recentYears.length;
    const recentTrend = avgRecent >= 5 ? 'accelerating' : avgRecent >= 0 ? 'positive' : 'declining';
    messages.push(
      `Recent trends show **${recentTrend}** appreciation averaging ${avgRecent.toFixed(1)}% annually over the past ${recentYears.length} years.`
    );
  }

  return messages.join(' ');
}

/**
 * Generate cashflow summary message
 */
export function generateCashflowMessage(cashflow: CashflowResult): string {
  const messages: string[] = [];

  if (cashflow.noi !== null && cashflow.rentEstimate !== null) {
    const isPositive = cashflow.noi > 0;
    messages.push(
      `Monthly **Net Operating Income (NOI)** is estimated at **$${Math.abs(cashflow.noi).toFixed(2)}** ${
        isPositive ? '(positive cashflow)' : '(negative cashflow before financing)'
      } with estimated rent of $${cashflow.rentEstimate.toFixed(2)}.`
    );
  }

  if (cashflow.capRate !== null) {
    const capRateQuality = cashflow.capRate >= 8 ? 'strong' : cashflow.capRate >= 5 ? 'moderate' : 'low';
    messages.push(
      `**Cap Rate** of **${cashflow.capRate.toFixed(2)}%** indicates ${capRateQuality} return potential for this investment.`
    );
  }

  if (cashflow.cocReturn !== null) {
    const isGoodReturn = cashflow.cocReturn >= 8;
    messages.push(
      `**Cash-on-Cash Return** of **${cashflow.cocReturn.toFixed(2)}%** ${
        isGoodReturn
          ? 'exceeds typical investment thresholds'
          : 'may require careful consideration of investment goals'
      }.`
    );
  }

  return messages.length > 0
    ? `Here is the investment performance breakdown:\n\n${messages.join('\n\n')}`
    : 'Cashflow analysis has been generated based on market assumptions and estimated operating expenses.';
}

/**
 * Generate confidence explanation message
 */
export function generateConfidenceMessage(confidenceScore: number): string {
  const percentage = Math.round(confidenceScore * 100);

  if (percentage >= 80) {
    return `This valuation has **high confidence** (${percentage}%) based on strong comparable data, tight price clustering, and recent sales activity.`;
  } else if (percentage >= 60) {
    return `This valuation has **moderate confidence** (${percentage}%) based on available comparable data and market conditions.`;
  } else {
    return `This valuation has **limited confidence** (${percentage}%) due to fewer comparable sales, higher market volatility, or data constraints. Additional market research may be beneficial.`;
  }
}

/**
 * Generate methodology explanation
 */
export function generateMethodologyMessage(methodology: string[]): string {
  const methods = methodology.map(m => {
    switch (m) {
      case 'median':
        return '**Median pricing** (most reliable center point)';
      case 'price-per-sqft':
        return '**Price per square foot** adjustment';
      case 'weighted-average':
        return '**Weighted average** (recent sales prioritized)';
      case 'sqft-adjusted':
        return '**Square footage** normalization';
      default:
        return m;
    }
  });

  return `Valuation methodology: ${methods.join(', ')}.`;
}

/**
 * Generate complete CMA summary message
 */
export function generateCMASummaryMessage(
  cmaSummary: CMASummary,
  subjectAddress?: string,
  listPrice?: number
): string {
  const messages: string[] = [];

  // Intro
  messages.push(generateCMAIntroMessage(subjectAddress));

  // Estimated value
  if (cmaSummary.estimatedValue) {
    messages.push(
      `\n\n**Estimated Market Value:** $${cmaSummary.estimatedValue.toLocaleString()}`
    );

    // Value range
    if (cmaSummary.lowRange && cmaSummary.highRange) {
      messages.push(
        `**Value Range:** $${cmaSummary.lowRange.toLocaleString()} - $${cmaSummary.highRange.toLocaleString()}`
      );
    }

    // Value assessment vs list price
    if (listPrice && listPrice > 0) {
      messages.push(`\n${generateValueAssessmentMessage(cmaSummary.estimatedValue, listPrice)}`);
    }
  }

  // Confidence
  if (cmaSummary.confidenceScore !== null) {
    messages.push(`\n${generateConfidenceMessage(cmaSummary.confidenceScore)}`);
  }

  // Methodology
  if (cmaSummary.methodology && cmaSummary.methodology.length > 0) {
    messages.push(`\n${generateMethodologyMessage(cmaSummary.methodology)}`);
  }

  return messages.join('');
}
