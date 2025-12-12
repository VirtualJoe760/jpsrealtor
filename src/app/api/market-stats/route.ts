import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Listing from '@/models/listings';
import { CRMLSListing } from '@/models/crmls-listings';
import { GPSClosedListing } from '@/models/gps-closed-listings';
import { CRMLSClosedListing } from '@/models/crmls-closed-listings';

interface MortgageRateData {
  week: string;
  frm_30?: number;
  frm_15?: number;
  frm_5_1?: number;
}

interface MarketStats {
  mortgageRates: {
    current: {
      thirtyYear: number | null;
      fifteenYear: number | null;
      fiveOneArm: number | null;
    };
    historical: {
      date: string;
      thirtyYear: number;
      fifteenYear: number;
    }[];
  };
  economicIndicators: {
    inflation: number | null;
    unemployment: number | null;
    homePriceIndex: number | null;
    gdpGrowth: number | null;
    housingStarts: number | null;
    treasuryRate: number | null;
  };
}

/**
 * GET /api/market-stats
 *
 * ⚠️ DEPRECATED: Use /api/stats/market instead
 *
 * This endpoint is maintained for backward compatibility but will be removed in a future version.
 * New code should use the /api/stats/market endpoint.
 *
 * Migration: Replace /api/market-stats with /api/stats/market
 * See: /api/stats/MIGRATION.md for full migration guide
 *
 * Fetches live market data:
 * - Current mortgage rates from API Ninjas (CA specific)
 * - Historical mortgage rates from FRED API (past 12 months)
 */
export async function GET() {
  try {
    console.warn('[market-stats] ⚠️ DEPRECATED ENDPOINT: Use /api/stats/market instead');

    // Fetch all data in parallel
    const [currentRates, historicalRates, economicData] = await Promise.all([
      fetchMortgageRates(),
      fetchHistoricalRates(),
      fetchEconomicIndicators(),
    ]);

    console.log('[market-stats] Current mortgage rates:', currentRates);
    console.log('[market-stats] Historical data points:', historicalRates.length);
    console.log('[market-stats] Economic indicators:', economicData);

    const stats: MarketStats = {
      mortgageRates: {
        current: {
          thirtyYear: currentRates.frm_30 ?? null,
          fifteenYear: currentRates.frm_15 ?? null,
          fiveOneArm: currentRates.frm_5_1 ?? null,
        },
        historical: historicalRates,
      },
      economicIndicators: economicData,
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Market stats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch market stats',
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch historical mortgage rates from FRED API (past 12 months)
 * Gets both 30-year and 15-year rates
 */
async function fetchHistoricalRates(): Promise<{ date: string; thirtyYear: number; fifteenYear: number }[]> {
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

    const [response30, response15] = await Promise.all([
      fetch(
        `https://api.stlouisfed.org/fred/series/observations?series_id=MORTGAGE30US&api_key=${process.env.FRED_API_KEY}&file_type=json&observation_start=${oneYearAgoStr}&sort_order=asc`
      ),
      fetch(
        `https://api.stlouisfed.org/fred/series/observations?series_id=MORTGAGE15US&api_key=${process.env.FRED_API_KEY}&file_type=json&observation_start=${oneYearAgoStr}&sort_order=asc`
      ),
    ]);

    if (!response30.ok || !response15.ok) {
      throw new Error('FRED API returned error');
    }

    const [data30, data15] = await Promise.all([
      response30.json(),
      response15.json(),
    ]);

    // Create a map of 15-year rates by date
    const fifteenYearMap = new Map();
    if (data15.observations && Array.isArray(data15.observations)) {
      data15.observations.forEach((obs: any) => {
        if (obs.value !== '.') {
          fifteenYearMap.set(obs.date, parseFloat(obs.value));
        }
      });
    }

    // Combine both datasets
    if (data30.observations && Array.isArray(data30.observations)) {
      return data30.observations
        .filter((obs: any) => obs.value !== '.')
        .map((obs: any) => ({
          date: obs.date,
          thirtyYear: parseFloat(obs.value),
          fifteenYear: fifteenYearMap.get(obs.date) || 0,
        }))
        .filter((item) => item.fifteenYear > 0); // Only include dates where we have both rates
    }

    return [];
  } catch (error) {
    console.error('FRED API error:', error);
    return [];
  }
}

/**
 * Fetch economic indicators from FRED API
 */
async function fetchEconomicIndicators(): Promise<{
  inflation: number | null;
  unemployment: number | null;
  homePriceIndex: number | null;
  gdpGrowth: number | null;
  housingStarts: number | null;
  treasuryRate: number | null;
}> {
  try {
    const [inflationRes, unemploymentRes, hpiRes, gdpRes, housingStartsRes, treasuryRes] = await Promise.all([
      // CPI (Inflation) - CPIAUCSL
      fetch(
        `https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCSL&api_key=${process.env.FRED_API_KEY}&file_type=json&limit=1&sort_order=desc`
      ),
      // Unemployment Rate - UNRATE
      fetch(
        `https://api.stlouisfed.org/fred/series/observations?series_id=UNRATE&api_key=${process.env.FRED_API_KEY}&file_type=json&limit=1&sort_order=desc`
      ),
      // S&P CoreLogic Case-Shiller Home Price Index - CSUSHPISA
      fetch(
        `https://api.stlouisfed.org/fred/series/observations?series_id=CSUSHPISA&api_key=${process.env.FRED_API_KEY}&file_type=json&limit=1&sort_order=desc`
      ),
      // Real GDP Growth (Quarterly, Annualized) - A191RL1Q225SBEA
      fetch(
        `https://api.stlouisfed.org/fred/series/observations?series_id=A191RL1Q225SBEA&api_key=${process.env.FRED_API_KEY}&file_type=json&limit=1&sort_order=desc`
      ),
      // Housing Starts (Thousands of Units, Seasonally Adjusted Annual Rate) - HOUST
      fetch(
        `https://api.stlouisfed.org/fred/series/observations?series_id=HOUST&api_key=${process.env.FRED_API_KEY}&file_type=json&limit=1&sort_order=desc`
      ),
      // 10-Year Treasury Constant Maturity Rate - DGS10
      fetch(
        `https://api.stlouisfed.org/fred/series/observations?series_id=DGS10&api_key=${process.env.FRED_API_KEY}&file_type=json&limit=1&sort_order=desc`
      ),
    ]);

    const [inflationData, unemploymentData, hpiData, gdpData, housingStartsData, treasuryData] = await Promise.all([
      inflationRes.json(),
      unemploymentRes.json(),
      hpiRes.json(),
      gdpRes.json(),
      housingStartsRes.json(),
      treasuryRes.json(),
    ]);

    return {
      inflation:
        inflationData.observations?.[0]?.value !== '.'
          ? parseFloat(inflationData.observations[0].value)
          : null,
      unemployment:
        unemploymentData.observations?.[0]?.value !== '.'
          ? parseFloat(unemploymentData.observations[0].value)
          : null,
      homePriceIndex:
        hpiData.observations?.[0]?.value !== '.'
          ? parseFloat(hpiData.observations[0].value)
          : null,
      gdpGrowth:
        gdpData.observations?.[0]?.value !== '.'
          ? parseFloat(gdpData.observations[0].value)
          : null,
      housingStarts:
        housingStartsData.observations?.[0]?.value !== '.'
          ? parseFloat(housingStartsData.observations[0].value)
          : null,
      treasuryRate:
        treasuryData.observations?.[0]?.value !== '.'
          ? parseFloat(treasuryData.observations[0].value)
          : null,
    };
  } catch (error) {
    console.error('Economic indicators error:', error);
    return {
      inflation: null,
      unemployment: null,
      homePriceIndex: null,
      gdpGrowth: null,
      housingStarts: null,
      treasuryRate: null,
    };
  }
}

/**
 * Fetch current mortgage rates from API Ninjas
 */
async function fetchMortgageRates(): Promise<MortgageRateData> {
  try {
    const response = await fetch('https://api.api-ninjas.com/v1/mortgagerate?state=CA', {
      headers: {
        'X-Api-Key': process.env.API_NINJA_KEY || '',
      },
    });

    if (!response.ok) {
      throw new Error(`API Ninjas returned ${response.status}`);
    }

    const result = await response.json();
    console.log('Raw API response:', JSON.stringify(result));

    // API returns an array with nested data object
    // Structure: [{ week: "current", data: { frm_30: "6.23", frm_15: "5.51", week: "2025-11-26" }}]
    if (Array.isArray(result) && result.length > 0) {
      const firstEntry = result[0];
      const rateData = firstEntry.data || firstEntry;

      // Convert string rates to numbers
      return {
        week: rateData.week || firstEntry.week || 'current',
        frm_30: typeof rateData.frm_30 === 'string' ? parseFloat(rateData.frm_30) : rateData.frm_30,
        frm_15: typeof rateData.frm_15 === 'string' ? parseFloat(rateData.frm_15) : rateData.frm_15,
        frm_5_1: typeof rateData.frm_5_1 === 'string' ? parseFloat(rateData.frm_5_1) : rateData.frm_5_1,
      };
    }

    // Fallback: if it's an object with data property
    if (result.data) {
      return {
        week: result.data.week || 'current',
        frm_30: typeof result.data.frm_30 === 'string' ? parseFloat(result.data.frm_30) : result.data.frm_30,
        frm_15: typeof result.data.frm_15 === 'string' ? parseFloat(result.data.frm_15) : result.data.frm_15,
        frm_5_1: typeof result.data.frm_5_1 === 'string' ? parseFloat(result.data.frm_5_1) : result.data.frm_5_1,
      };
    }

    return {
      week: new Date().toISOString().split('T')[0],
      frm_30: null,
      frm_15: null,
      frm_5_1: null,
    } as any;
  } catch (error) {
    console.error('Mortgage rate fetch error:', error);
    // Return null values on error
    return {
      week: new Date().toISOString().split('T')[0],
      frm_30: null,
      frm_15: null,
      frm_5_1: null,
    } as any;
  }
}
