/**
 * Property Tax Rate Service
 *
 * Fetches current property tax rates from California Board of Equalization API
 * Source: https://boe.ca.gov/DataPortal/api
 *
 * @module lib/services/property-tax-rates
 */

const CA_BOE_API_BASE = 'https://boe.ca.gov/DataPortal/api';

export interface PropertyTaxRateData {
  county: string;
  assessmentYear: string;
  averageTaxRate: number; // Percentage (e.g., 1.173 for 1.173%)
  netAssessedValue: number;
  cityAllocation: number;
  countyAllocation: number;
  schoolAllocation: number;
  otherAllocation: number;
  totalAllocation: number;
}

/**
 * In-memory cache for tax rates
 * Tax rates don't change frequently, so we cache for 24 hours
 */
const taxRateCache = new Map<string, { data: PropertyTaxRateData; timestamp: number }>();
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch property tax rate for a specific California county
 *
 * @param county - County name (e.g., "Riverside", "Los Angeles")
 * @returns Property tax rate data for most recent assessment year
 *
 * @example
 * ```typescript
 * const taxRate = await getCountyTaxRate('Riverside');
 * console.log(taxRate.averageTaxRate); // 1.173
 * ```
 */
export async function getCountyTaxRate(county: string): Promise<PropertyTaxRateData | null> {
  const cacheKey = county.toLowerCase();

  // Check cache first
  const cached = taxRateCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.data;
  }

  try {
    // Fetch from California BOE API
    const url = new URL(`${CA_BOE_API_BASE}/odata/Property_Tax_Allocations`);
    url.searchParams.set('$filter', `County eq '${county}'`);
    url.searchParams.set('$orderby', 'AssessmentYearFrom desc');
    url.searchParams.set('$top', '1'); // Get most recent year only

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`CA BOE API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    if (!data.value || data.value.length === 0) {
      console.warn(`No tax rate data found for county: ${county}`);
      return null;
    }

    const record = data.value[0];

    const taxRateData: PropertyTaxRateData = {
      county: record.County,
      assessmentYear: `${record.AssessmentYearFrom}-${record.AssessmentYearTo}`,
      averageTaxRate: parseFloat(record.AverageTaxRate),
      netAssessedValue: parseFloat(record.NetTaxableAssessedValue),
      cityAllocation: parseFloat(record.CityPropertyTaxAllocationsandLevies || 0),
      countyAllocation: parseFloat(record.CountyPropertyTaxAllocationsandLevies || 0),
      schoolAllocation: parseFloat(record.SchoolPropertyTaxAllocationsandLevies || 0),
      otherAllocation: parseFloat(record.OtherDistrictsPropertyTaxAllocationsandLevies || 0),
      totalAllocation: parseFloat(record.TotalPropertyTaxAllocationsandLevies || 0),
    };

    // Cache the result
    taxRateCache.set(cacheKey, {
      data: taxRateData,
      timestamp: Date.now(),
    });

    return taxRateData;
  } catch (error) {
    console.error(`Error fetching tax rate for ${county}:`, error);
    return null;
  }
}

/**
 * Calculate estimated annual property tax based on county rate
 *
 * @param propertyValue - Assessed property value (typically list price or close price)
 * @param county - County name
 * @returns Estimated annual property tax amount
 *
 * @example
 * ```typescript
 * const estimatedTax = await calculatePropertyTax(750000, 'Riverside');
 * console.log(estimatedTax); // ~8,797 (750000 * 0.01173)
 * ```
 */
export async function calculatePropertyTax(
  propertyValue: number,
  county: string
): Promise<number | null> {
  const taxRateData = await getCountyTaxRate(county);

  if (!taxRateData) {
    return null;
  }

  // Calculate: propertyValue * (taxRate / 100)
  const annualTax = propertyValue * (taxRateData.averageTaxRate / 100);

  return Math.round(annualTax);
}

/**
 * County tax rate fallbacks for California counties
 * Used when API is unavailable
 *
 * Base rate: 1% (Prop 13) + local bonds/Mello-Roos
 * Typical range: 1.1% - 1.3%
 */
export const COUNTY_TAX_RATE_FALLBACKS: Record<string, number> = {
  'Riverside': 1.173,
  'San Diego': 1.115,
  'Los Angeles': 1.181,
  'Orange': 1.095,
  'San Bernardino': 1.150,
  'Ventura': 1.099,
  'Santa Barbara': 1.089,
  'Imperial': 1.120,
  'San Luis Obispo': 1.075,
  'Kern': 1.125,
  // Add more counties as needed
};

/**
 * Get tax rate with fallback
 *
 * @param county - County name
 * @returns Tax rate percentage (e.g., 1.173)
 */
export async function getTaxRateWithFallback(county: string): Promise<number> {
  const taxRateData = await getCountyTaxRate(county);

  if (taxRateData) {
    return taxRateData.averageTaxRate;
  }

  // Use fallback if available
  const fallback = COUNTY_TAX_RATE_FALLBACKS[county];
  if (fallback) {
    return fallback;
  }

  // Default to base California rate + average bonds (1.15%)
  return 1.15;
}

/**
 * Batch fetch tax rates for multiple counties
 *
 * @param counties - Array of county names
 * @returns Map of county -> tax rate data
 */
export async function getMultipleCountyTaxRates(
  counties: string[]
): Promise<Map<string, PropertyTaxRateData | null>> {
  const results = new Map<string, PropertyTaxRateData | null>();

  // Fetch all counties in parallel
  const promises = counties.map(async (county) => {
    const data = await getCountyTaxRate(county);
    results.set(county, data);
  });

  await Promise.all(promises);

  return results;
}

/**
 * Clear the tax rate cache
 * Useful for testing or forcing refresh
 */
export function clearTaxRateCache(): void {
  taxRateCache.clear();
}
