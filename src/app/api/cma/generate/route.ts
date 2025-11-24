// src/app/api/cma/generate/route.ts
// CMA Generation API Endpoint
// Phase 3: Statistical Analysis & Investment Intelligence

import { NextRequest, NextResponse } from 'next/server';
import type { CMAFilters, CMAReport } from '@/lib/cma/cmaTypes';
import { loadComps, calculateCMASummary, selectBestComps } from '@/lib/cma/calculateCMA';
import { calculateAppreciation } from '@/lib/cma/appreciationEngine';
import { calculateCashflow, type CashflowInputs } from '@/lib/cma/cashflowEngine';

/**
 * POST /api/cma/generate
 *
 * Generate a Comparative Market Analysis report
 *
 * Request Body:
 * {
 *   filters: CMAFilters,
 *   cashflowInputs?: CashflowInputs
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   report?: CMAReport,
 *   error?: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filters, cashflowInputs } = body;

    // Validate filters
    if (!filters || typeof filters !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid filters provided' },
        { status: 400 }
      );
    }

    console.log('📊 CMA Generation Request:');
    console.log('   Filters:', filters);
    console.log('   Cashflow Inputs:', cashflowInputs ? 'Provided' : 'Not provided');

    // Step 1: Load comparable properties from MongoDB
    const allComps = await loadComps(filters as CMAFilters);
    console.log(`   Loaded ${allComps.length} potential comps`);

    if (allComps.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No comparable properties found matching the specified criteria',
      }, { status: 404 });
    }

    // Step 2: Select best comps using similarity scoring and outlier removal
    const bestComps = selectBestComps(
      allComps,
      filters.beds,
      filters.baths,
      filters.sqft
    );
    console.log(`   Selected ${bestComps.length} best comps`);

    if (bestComps.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid comps remained after outlier removal',
      }, { status: 404 });
    }

    // Step 3: Calculate CMA summary (valuation with price ranges and confidence)
    const summary = calculateCMASummary(bestComps, filters.sqft);
    console.log('   Calculated valuation summary');

    // Step 4: Calculate appreciation metrics and forecast
    const appreciation = calculateAppreciation(
      bestComps,
      filters.subjectSubdivision
    );
    console.log('   Calculated appreciation metrics');

    // Step 5: Calculate cashflow analysis (if inputs provided)
    let cashflow = {
      mortgage: null,
      taxes: null,
      hoa: null,
      insurance: null,
      maintenance: null,
      rentEstimate: null,
      noi: null,
      capRate: null,
      cocReturn: null,
    };

    if (cashflowInputs) {
      // Validate cashflow inputs
      if (!cashflowInputs.purchasePrice || !cashflowInputs.downPaymentPercent ||
          !cashflowInputs.interestRate || !cashflowInputs.loanTermYears) {
        return NextResponse.json({
          success: false,
          error: 'Missing required cashflow inputs (purchasePrice, downPaymentPercent, interestRate, loanTermYears)',
        }, { status: 400 });
      }

      cashflow = calculateCashflow(cashflowInputs as CashflowInputs);
      console.log('   Calculated cashflow analysis');
    }

    // Build complete CMA report
    const report: CMAReport = {
      summary,
      comps: bestComps,
      appreciation,
      cashflow,
      generatedAt: new Date().toISOString(),
    };

    console.log('✅ CMA report generated successfully');

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('❌ CMA generation error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate CMA report',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cma/generate
 *
 * Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/cma/generate',
    method: 'POST',
    description: 'Generate a Comparative Market Analysis (CMA) report',
    requiredFields: {
      filters: {
        subjectPropertyId: 'string (optional)',
        subjectSubdivision: 'string (optional)',
        beds: 'number (optional)',
        baths: 'number (optional)',
        sqft: 'number (optional)',
        radiusMiles: 'number (optional, default: 5)',
        maxComps: 'number (optional, default: 10)',
      },
    },
    optionalFields: {
      cashflowInputs: {
        purchasePrice: 'number (required)',
        downPaymentPercent: 'number (required)',
        interestRate: 'number (required)',
        loanTermYears: 'number (required)',
        hoa: 'number (optional)',
        taxes: 'number (optional)',
        insurance: 'number (optional)',
        maintenancePercent: 'number (optional)',
        rentEstimate: 'number (optional)',
      },
    },
    response: {
      success: 'boolean',
      report: {
        summary: 'CMASummary',
        comps: 'CMAComp[]',
        appreciation: 'AppreciationResult',
        cashflow: 'CashflowResult',
        generatedAt: 'string (ISO 8601)',
      },
    },
    example: {
      filters: {
        beds: 3,
        baths: 2,
        sqft: 2000,
        radiusMiles: 5,
        maxComps: 10,
      },
      cashflowInputs: {
        purchasePrice: 500000,
        downPaymentPercent: 20,
        interestRate: 6.5,
        loanTermYears: 30,
        rentEstimate: 2500,
      },
    },
  });
}
