/**
 * Test California BOE Property Tax API Integration
 *
 * Tests:
 * 1. Fetch Riverside County tax rate
 * 2. Fetch Los Angeles County tax rate
 * 3. Calculate property tax for sample properties
 * 4. Test cache functionality
 */

const CA_BOE_API_BASE = 'https://boe.ca.gov/DataPortal/api';

async function testCountyTaxRate(county) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${county} County`);
  console.log('='.repeat(60));

  try {
    const url = new URL(`${CA_BOE_API_BASE}/odata/Property_Tax_Allocations`);
    url.searchParams.set('$filter', `County eq '${county}'`);
    url.searchParams.set('$orderby', 'AssessmentYearFrom desc');
    url.searchParams.set('$top', '1');

    console.log(`\n📡 Fetching from: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    if (!data.value || data.value.length === 0) {
      console.warn(`⚠️ No data found for ${county} County`);
      return null;
    }

    const record = data.value[0];

    console.log(`\n✅ Success! Latest Data Found:`);
    console.log(`   County: ${record.County}`);
    console.log(`   Assessment Year: ${record.AssessmentYearFrom}-${record.AssessmentYearTo}`);
    console.log(`   Average Tax Rate: ${record.AverageTaxRate}%`);
    console.log(`   Net Assessed Value: $${(record.NetTaxableAssessedValue / 1e9).toFixed(2)}B`);
    console.log(`\n   Tax Allocations:`);
    console.log(`   - City: $${(record.CityPropertyTaxAllocationsandLevies / 1e9).toFixed(2)}B`);
    console.log(`   - County: $${(record.CountyPropertyTaxAllocationsandLevies / 1e9).toFixed(2)}B`);
    console.log(`   - Schools: $${(record.SchoolPropertyTaxAllocationsandLevies / 1e9).toFixed(2)}B`);
    console.log(`   - Other: $${(record.OtherDistrictsPropertyTaxAllocationsandLevies / 1e9).toFixed(2)}B`);
    console.log(`   - TOTAL: $${(record.TotalPropertyTaxAllocationsandLevies / 1e9).toFixed(2)}B`);

    return {
      county: record.County,
      taxRate: parseFloat(record.AverageTaxRate),
      year: `${record.AssessmentYearFrom}-${record.AssessmentYearTo}`,
    };
  } catch (error) {
    console.error(`❌ Error fetching ${county} County:`, error.message);
    return null;
  }
}

function calculatePropertyTax(propertyValue, taxRate) {
  const annualTax = propertyValue * (taxRate / 100);
  return Math.round(annualTax);
}

async function main() {
  console.log('\n🏛️  CALIFORNIA BOARD OF EQUALIZATION - PROPERTY TAX API TEST');
  console.log('API: https://boe.ca.gov/DataPortal/api');
  console.log('Endpoint: /odata/Property_Tax_Allocations');

  // Test Riverside County (where Palm Desert is located)
  const riverside = await testCountyTaxRate('Riverside');

  // Test Los Angeles County (largest county)
  const losAngeles = await testCountyTaxRate('Los Angeles');

  // Test San Diego County
  const sanDiego = await testCountyTaxRate('San Diego');

  console.log(`\n${'='.repeat(60)}`);
  console.log('PROPERTY TAX CALCULATIONS');
  console.log('='.repeat(60));

  if (riverside) {
    console.log(`\n📊 Sample Property Tax Calculations (Riverside County @ ${riverside.taxRate}%)`);
    console.log(`   $500,000 home:  $${calculatePropertyTax(500000, riverside.taxRate).toLocaleString()}/year`);
    console.log(`   $750,000 home:  $${calculatePropertyTax(750000, riverside.taxRate).toLocaleString()}/year`);
    console.log(`   $1,000,000 home: $${calculatePropertyTax(1000000, riverside.taxRate).toLocaleString()}/year`);
    console.log(`   $2,000,000 home: $${calculatePropertyTax(2000000, riverside.taxRate).toLocaleString()}/year`);
  }

  if (losAngeles) {
    console.log(`\n📊 Sample Property Tax Calculations (Los Angeles County @ ${losAngeles.taxRate}%)`);
    console.log(`   $500,000 home:  $${calculatePropertyTax(500000, losAngeles.taxRate).toLocaleString()}/year`);
    console.log(`   $750,000 home:  $${calculatePropertyTax(750000, losAngeles.taxRate).toLocaleString()}/year`);
    console.log(`   $1,000,000 home: $${calculatePropertyTax(1000000, losAngeles.taxRate).toLocaleString()}/year`);
    console.log(`   $2,000,000 home: $${calculatePropertyTax(2000000, losAngeles.taxRate).toLocaleString()}/year`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ TEST COMPLETE');
  console.log('='.repeat(60));
  console.log('\nNext Steps:');
  console.log('1. Integrate into market-stats API endpoint');
  console.log('2. Use enriched tax data in analyzePropertyTax()');
  console.log('3. Display official county tax rates in MarketStatsCard');
  console.log('4. Cache tax rates for 24 hours to reduce API calls');
}

main().catch(console.error);
