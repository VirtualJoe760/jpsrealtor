// src/lib/cma/cashflowEngine.ts
// Investment property cashflow analysis
// Phase 3: Statistical Analysis & Investment Intelligence

import type { CashflowResult } from './cmaTypes';

/**
 * Input parameters for cashflow calculation
 */
export interface CashflowInputs {
  purchasePrice: number;
  downPaymentPercent: number;
  interestRate: number;
  loanTermYears: number;
  hoa?: number;
  taxes?: number;
  insurance?: number;
  maintenancePercent?: number; // % of purchase price annually
  rentEstimate?: number;
}

/**
 * Calculate investment property cashflow analysis
 *
 * @param inputs - Loan and property expense parameters
 * @returns CashflowResult - Monthly expenses, NOI, cap rate, cash-on-cash return
 */
export function calculateCashflow(inputs: CashflowInputs): CashflowResult {
  console.log('💰 Calculating cashflow analysis');
  console.log(`💰 Purchase Price: $${inputs.purchasePrice.toLocaleString()}`);
  console.log(`💰 Down Payment: ${inputs.downPaymentPercent}%`);
  console.log(`💰 Interest Rate: ${inputs.interestRate}%`);

  const {
    purchasePrice,
    downPaymentPercent,
    interestRate,
    loanTermYears,
    hoa = 0,
    rentEstimate,
  } = inputs;

  // Calculate loan amount
  const downPayment = purchasePrice * (downPaymentPercent / 100);
  const loanAmount = purchasePrice - downPayment;

  // Calculate monthly mortgage payment (P&I)
  const mortgage = calculateMortgagePayment(loanAmount, interestRate, loanTermYears);

  // Estimate monthly property taxes (use provided or default to 1.1%)
  const taxes = inputs.taxes !== undefined
    ? inputs.taxes
    : estimatePropertyTaxes(purchasePrice, 1.1);

  // Estimate monthly insurance (use provided or default to 0.35%)
  const insurance = inputs.insurance !== undefined
    ? inputs.insurance
    : estimateInsurance(purchasePrice, 0.35);

  // Estimate monthly maintenance (use provided or default to 1%)
  const maintenancePercent = inputs.maintenancePercent || 1.0;
  const maintenance = estimateMaintenance(purchasePrice, maintenancePercent);

  console.log(`💰 Monthly Expenses:`);
  console.log(`   Mortgage (P&I): $${mortgage.toFixed(2)}`);
  console.log(`   Taxes: $${taxes.toFixed(2)}`);
  console.log(`   Insurance: $${insurance.toFixed(2)}`);
  console.log(`   Maintenance: $${maintenance.toFixed(2)}`);
  console.log(`   HOA: $${hoa.toFixed(2)}`);

  // Calculate NOI (Net Operating Income)
  // NOI = Rent - Operating Expenses (taxes, insurance, maintenance, HOA)
  // Note: Mortgage is NOT included in NOI calculation
  let noi: number | null = null;
  let capRate: number | null = null;
  let cocReturn: number | null = null;

  if (rentEstimate && rentEstimate > 0) {
    const monthlyOperatingExpenses = taxes + insurance + maintenance + hoa;
    noi = rentEstimate - monthlyOperatingExpenses;

    // Calculate Cap Rate: (Annual NOI / Purchase Price) * 100
    const annualNOI = noi * 12;
    capRate = (annualNOI / purchasePrice) * 100;
    capRate = Math.round(capRate * 100) / 100; // Round to 2 decimals

    // Calculate Cash-on-Cash Return: (Annual Cash Flow / Total Cash Invested) * 100
    const annualCashFlow = (rentEstimate - monthlyOperatingExpenses - mortgage) * 12;
    const totalCashInvested = downPayment; // Simplified - could include closing costs
    cocReturn = (annualCashFlow / totalCashInvested) * 100;
    cocReturn = Math.round(cocReturn * 100) / 100; // Round to 2 decimals

    console.log(`💰 Investment Metrics:`);
    console.log(`   Rent Estimate: $${rentEstimate.toFixed(2)}/month`);
    console.log(`   NOI: $${noi.toFixed(2)}/month ($${annualNOI.toFixed(2)}/year)`);
    console.log(`   Cap Rate: ${capRate.toFixed(2)}%`);
    console.log(`   Cash-on-Cash Return: ${cocReturn.toFixed(2)}%`);
  } else {
    console.log(`💰 No rent estimate provided - skipping NOI, Cap Rate, and CoC calculations`);
  }

  return {
    mortgage: Math.round(mortgage * 100) / 100,
    taxes: Math.round(taxes * 100) / 100,
    hoa: Math.round(hoa * 100) / 100,
    insurance: Math.round(insurance * 100) / 100,
    maintenance: Math.round(maintenance * 100) / 100,
    rentEstimate: rentEstimate || null,
    noi: noi !== null ? Math.round(noi * 100) / 100 : null,
    capRate,
    cocReturn,
  };
}

/**
 * Calculate monthly mortgage payment (Principal + Interest)
 *
 * Formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
 * Where:
 * - M = Monthly payment
 * - P = Principal (loan amount)
 * - r = Monthly interest rate (annual rate / 12)
 * - n = Number of payments (years * 12)
 *
 * @param principal - Loan amount
 * @param annualRate - Annual interest rate (as percentage, e.g., 6.5)
 * @param years - Loan term in years
 * @returns number - Monthly payment
 */
export function calculateMortgagePayment(
  principal: number,
  annualRate: number,
  years: number
): number {
  if (principal <= 0 || years <= 0) return 0;

  // Handle 0% interest rate edge case
  if (annualRate === 0) {
    return principal / (years * 12);
  }

  // Convert annual rate to monthly decimal
  const monthlyRate = (annualRate / 100) / 12;
  const numberOfPayments = years * 12;

  // Apply mortgage formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments);
  const denominator = Math.pow(1 + monthlyRate, numberOfPayments) - 1;
  const monthlyPayment = principal * (numerator / denominator);

  return monthlyPayment;
}

/**
 * Estimate monthly property taxes
 *
 * @param purchasePrice - Property purchase price
 * @param taxRate - Annual property tax rate (as percentage, default: 1.1%)
 * @returns number - Monthly property tax
 */
export function estimatePropertyTaxes(
  purchasePrice: number,
  taxRate: number = 1.1
): number {
  if (purchasePrice <= 0) return 0;

  // Calculate annual taxes and divide by 12
  const annualTaxes = purchasePrice * (taxRate / 100);
  return annualTaxes / 12;
}

/**
 * Estimate monthly insurance
 *
 * @param purchasePrice - Property purchase price
 * @param insuranceRate - Annual insurance rate (as percentage, default: 0.35%)
 * @returns number - Monthly insurance cost
 */
export function estimateInsurance(
  purchasePrice: number,
  insuranceRate: number = 0.35
): number {
  if (purchasePrice <= 0) return 0;

  // Calculate annual insurance and divide by 12
  const annualInsurance = purchasePrice * (insuranceRate / 100);
  return annualInsurance / 12;
}

/**
 * Estimate monthly maintenance
 *
 * @param purchasePrice - Property purchase price
 * @param maintenanceRate - Annual maintenance rate (as percentage, default: 1%)
 * @returns number - Monthly maintenance estimate
 */
export function estimateMaintenance(
  purchasePrice: number,
  maintenanceRate: number = 1.0
): number {
  if (purchasePrice <= 0) return 0;

  // Calculate annual maintenance and divide by 12
  const annualMaintenance = purchasePrice * (maintenanceRate / 100);
  return annualMaintenance / 12;
}

/**
 * Calculate DSCR (Debt Service Coverage Ratio)
 *
 * DSCR = NOI / Annual Debt Service
 * Good DSCR >= 1.25 (lenders typically require 1.20-1.25 minimum)
 *
 * @param annualNOI - Annual Net Operating Income
 * @param annualMortgagePayment - Annual mortgage payment (P&I only)
 * @returns number - DSCR ratio
 */
export function calculateDSCR(
  annualNOI: number,
  annualMortgagePayment: number
): number {
  if (annualMortgagePayment <= 0) return 0;

  const dscr = annualNOI / annualMortgagePayment;
  return Math.round(dscr * 100) / 100; // Round to 2 decimals
}

/**
 * Check if property passes the 1% rule
 *
 * 1% Rule: Monthly rent should be >= 1% of purchase price
 * This is a quick screening tool for cashflow potential
 *
 * @param monthlyRent - Monthly rental income
 * @param purchasePrice - Property purchase price
 * @returns boolean - True if passes 1% rule
 */
export function passesOnePercentRule(
  monthlyRent: number,
  purchasePrice: number
): boolean {
  if (purchasePrice <= 0) return false;

  const onePercent = purchasePrice * 0.01;
  return monthlyRent >= onePercent;
}
