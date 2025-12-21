#!/usr/bin/env ts-node
/**
 * Analytics Test Script - CLI Tool
 *
 * Test appreciation analytics by city, subdivision, or county
 * Works directly with MongoDB (no API server needed)
 *
 * Usage:
 *   npx ts-node src/scripts/test/test-analytics.ts --city "Palm Desert"
 *   npx ts-node src/scripts/test/test-analytics.ts --subdivision "Indian Wells Country Club"
 *   npx ts-node src/scripts/test/test-analytics.ts --county "Riverside"
 */

import connectToDatabase from '@/lib/mongodb';
import { analyzeAppreciation } from '@/lib/analytics/calculations/appreciation';

// ============================================================================
// TYPES
// ============================================================================

interface TestOptions {
  city?: string;
  subdivision?: string;
  county?: string;
  period?: '1y' | '3y' | '5y' | '10y';
  verbose?: boolean;
}

// ============================================================================
// MAIN TEST FUNCTION
// ============================================================================

async function testAppreciation(options: TestOptions) {
  const period = options.period || '5y';
  const verbose = options.verbose || false;

  console.log('\n' + '='.repeat(80));
  console.log('ANALYTICS TEST - Appreciation Analysis');
  console.log('='.repeat(80));

  // Build query
  const query: any = {};
  let locationType = '';
  let locationValue = '';

  if (options.city) {
    query.city = options.city;
    locationType = 'City';
    locationValue = options.city;
  } else if (options.subdivision) {
    query.subdivisionName = options.subdivision;
    locationType = 'Subdivision';
    locationValue = options.subdivision;
  } else if (options.county) {
    query.countyOrParish = options.county;
    locationType = 'County';
    locationValue = options.county;
  } else {
    console.error('L Error: Must specify --city, --subdivision, or --county');
    process.exit(1);
  }

  // Add time filter
  const yearsMap = { '1y': 1, '3y': 3, '5y': 5, '10y': 10 };
  const yearsBack = yearsMap[period];
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - yearsBack);
  query.closeDate = { $gte: cutoffDate };

  console.log(`\n=� Location: ${locationValue} (${locationType})`);
  console.log(`=� Period: Past ${yearsBack} years (since ${cutoffDate.toISOString().split('T')[0]})`);
  console.log(`\n� Querying MongoDB...`);

  try {
    // Connect to database
    const db = await connectToDatabase();
    const collection = db.collection('unified_closed_listings');

    // Fetch closed sales
    const sales = await collection.find(query).toArray();

    if (sales.length === 0) {
      console.log(`\nL No closed sales found for ${locationValue}`);
      console.log(`\n=� Suggestions:`);
      console.log(`   - Check spelling`);
      console.log(`   - Try different time period (--period 10y)`);
      console.log(`   - Data might not be seeded yet (run seed.py)`);
      process.exit(0);
    }

    console.log(` Found ${sales.length.toLocaleString()} closed sales\n`);

    // Show MLS sources
    const mlsSources = [...new Set(sales.map((s: any) => s.mlsSource).filter(Boolean))];
    console.log(`=� MLS Sources: ${mlsSources.join(', ')}`);

    // Calculate appreciation
    console.log(`\n>� Calculating appreciation...\n`);

    const result = analyzeAppreciation(
      sales.map((s: any) => ({
        closePrice: s.closePrice,
        closeDate: s.closeDate,
        address: s.unparsedAddress || s.address,
        bedroomsTotal: s.bedroomsTotal,
        bathroomsTotalDecimal: s.bathroomsTotalDecimal,
        livingArea: s.livingArea,
        propertyType: s.propertyType,
        mlsSource: s.mlsSource
      })),
      period
    );

    // Display results
    console.log('='.repeat(80));
    console.log('APPRECIATION RESULTS');
    console.log('='.repeat(80));

    console.log(`\n=� Appreciation:`);
    console.log(`   Annual Rate:     ${result.appreciation.annual}%`);
    console.log(`   Cumulative:      ${result.appreciation.cumulative}%`);
    console.log(`   Trend:           ${result.appreciation.trend.toUpperCase()}`);

    console.log(`\n📈 Market Data:`);
    console.log(`   Start Price:     $${result.marketData.startAvgPrice.toLocaleString()}`);
    console.log(`   End Price:       $${result.marketData.endAvgPrice.toLocaleString()}`);
    console.log(`   Price Change:    $${(result.marketData.endAvgPrice - result.marketData.startAvgPrice).toLocaleString()}`);
    console.log(`   Total Sales:     ${result.marketData.totalSales.toLocaleString()}`);
    console.log(`   Confidence:      ${result.marketData.confidence.toUpperCase()}`);

    // Year-by-year breakdown (if verbose)
    if (verbose && result.appreciation.byYear) {
      console.log(`\n=� Year-by-Year Breakdown:`);
      console.log(`   ${'Year'.padEnd(8)} ${'Rate'.padEnd(10)} ${'Median Price'.padEnd(15)} ${'Sales'}`);
      console.log(`   ${'-'.repeat(50)}`);

      result.appreciation.byYear.forEach((year: any) => {
        console.log(
          `   ${year.year.toString().padEnd(8)} ` +
          `${(year.rate + '%').padEnd(10)} ` +
          `$${year.medianPrice.toLocaleString().padEnd(14)} ` +
          `${year.salesCount}`
        );
      });
    }

    console.log(`\n${'='.repeat(80)}\n`);

    // Success message
    console.log(` Test completed successfully!\n`);

    // Sample data (if verbose)
    if (verbose && sales.length > 0) {
      console.log(`=� Sample Sale:`);
      const sample = sales[0];
      console.log(`   Address:      ${sample.unparsedAddress || sample.address}`);
      console.log(`   Close Price:  $${sample.closePrice?.toLocaleString()}`);
      console.log(`   Close Date:   ${sample.closeDate}`);
      console.log(`   Beds/Baths:   ${sample.bedroomsTotal}/${sample.bathroomsTotalDecimal}`);
      console.log(`   Sqft:         ${sample.livingArea?.toLocaleString()}`);
      console.log(`   MLS Source:   ${sample.mlsSource}\n`);
    }

    process.exit(0);

  } catch (error: any) {
    console.error(`\nL Error: ${error.message}\n`);
    if (verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

function parseArgs(): TestOptions {
  const args = process.argv.slice(2);
  const options: TestOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--city') {
      options.city = args[++i];
    } else if (arg === '--subdivision') {
      options.subdivision = args[++i];
    } else if (arg === '--county') {
      options.county = args[++i];
    } else if (arg === '--period') {
      const periodValue = args[++i] as '1y' | '3y' | '5y' | '10y';
      if (!['1y', '3y', '5y', '10y'].includes(periodValue)) {
        console.error(`L Invalid period: ${periodValue}. Use 1y, 3y, 5y, or 10y`);
        process.exit(1);
      }
      options.period = periodValue;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Analytics Test Script - CLI Tool

Usage:
  npx ts-node src/scripts/test/test-analytics.ts [options]

Options:
  --city <name>           Test by city (e.g., "Palm Desert")
  --subdivision <name>    Test by subdivision (e.g., "Indian Wells Country Club")
  --county <name>         Test by county (e.g., "Riverside")
  --period <period>       Time period: 1y, 3y, 5y, 10y (default: 5y)
  --verbose, -v           Show detailed output
  --help, -h              Show this help message

Examples:
  npx ts-node src/scripts/test/test-analytics.ts --city "Palm Desert"
  npx ts-node src/scripts/test/test-analytics.ts --city "Palm Desert" --period 3y
  npx ts-node src/scripts/test/test-analytics.ts --subdivision "Indian Wells Country Club" --verbose
  npx ts-node src/scripts/test/test-analytics.ts --county "Riverside" --period 10y

Requirements:
  - MongoDB must be running
  - unified_closed_listings collection must be seeded
  - .env.local must have MONGODB_URI set
`);
}

// ============================================================================
// RUN
// ============================================================================

const options = parseArgs();
testAppreciation(options);
