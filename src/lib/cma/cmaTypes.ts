// src/lib/cma/cmaTypes.ts
// Type definitions for CMA (Comparative Market Analysis) Engine
// Phase 3: Statistical Analysis & Investment Intelligence

/**
 * Input filters for CMA comp selection
 */
export interface CMAFilters {
  subjectPropertyId?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  radiusMiles?: number;
  maxComps?: number;
}

/**
 * Comparable property data structure
 */
export interface CMAComp {
  listingKey: string;
  price: number;
  sqft: number;
  beds: number;
  baths: number;
  yearBuilt?: number;
  lat: number;
  lng: number;
  listPrice: number;
  closePrice?: number;
  listPriceSqft?: number;
  closePriceSqft?: number;
  pricePerSqft?: number;
  dom?: number;
  subdivision?: string;
  unparsedAddress?: string;
  address?: string;
  listDate?: string;
  soldDate?: string;
  closeDate?: string;
}

/**
 * CMA valuation summary with statistical confidence
 */
export interface CMASummary {
  estimatedValue: number | null;
  lowRange: number | null;
  highRange: number | null;
  confidenceScore: number | null;
  methodology: string[];
  avgPrice?: number;
  avgSqft?: number;
  avgPricePerSqft?: number;
}

/**
 * Historical appreciation analysis results
 */
export interface AppreciationResult {
  cagr5: number | null;
  cagr3?: number | null;
  cagr1?: number | null;
  yoy: Record<string, number>;
  volatilityIndex: number | null;
  projected5Year?: number | null;
  historyYears?: number;
}

export type AppreciationForecast = AppreciationResult;

/**
 * Cashflow analysis for investment properties
 */
export interface CashflowResult {
  mortgage: number | null;
  taxes: number | null;
  hoa: number | null;
  insurance: number | null;
  maintenance: number | null;
  rentEstimate: number | null;
  noi: number | null;
  capRate: number | null;
  cocReturn: number | null;
}

export type CashflowAnalysis = CashflowResult;

/**
 * Complete CMA report structure
 */
export interface CMAReport {
  summary: CMASummary;
  comps: CMAComp[];
  comparables?: CMAComp[];
  appreciation: AppreciationResult;
  cashflow: CashflowResult;
  generatedAt: string;
}
