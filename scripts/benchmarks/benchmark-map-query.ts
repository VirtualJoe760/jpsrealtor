// scripts/benchmarks/benchmark-map-query.ts
// Performance benchmarking for map query endpoint

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { MongoClient } from 'mongodb';
import {
  buildMapQuery,
  validateBoundingBox,
  type MapFilters
} from '../../src/app/utils/mls/filterListingsServerSide';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI not found in environment variables');
}

// Test scenarios
const TEST_SCENARIOS = [
  {
    name: 'Palm Desert - No Filters',
    bounds: { west: -116.5, south: 33.7, east: -116.3, north: 33.9 },
    filters: {}
  },
  {
    name: 'Palm Desert - Price Filter',
    bounds: { west: -116.5, south: 33.7, east: -116.3, north: 33.9 },
    filters: { minPrice: 500000, maxPrice: 1000000 }
  },
  {
    name: 'Palm Desert - Multi-Filter',
    bounds: { west: -116.5, south: 33.7, east: -116.3, north: 33.9 },
    filters: {
      minPrice: 500000,
      maxPrice: 1500000,
      beds: 3,
      baths: 2,
      poolYn: true
    }
  },
  {
    name: 'Large Area - Los Angeles County',
    bounds: { west: -118.7, south: 33.7, east: -118.0, north: 34.3 },
    filters: {}
  },
  {
    name: 'Small Area - Single Subdivision',
    bounds: { west: -116.39, south: 33.76, east: -116.37, north: 33.78 },
    filters: {}
  },
  {
    name: 'GPS Only - Price Filter',
    bounds: { west: -116.5, south: 33.7, east: -116.3, north: 33.9 },
    filters: { mlsSource: 'GPS', minPrice: 500000 }
  },
  {
    name: 'CRMLS Only - Luxury Homes',
    bounds: { west: -116.5, south: 33.7, east: -116.3, north: 33.9 },
    filters: { mlsSource: 'CRMLS', minPrice: 2000000, beds: 4, poolYn: true }
  }
];

interface BenchmarkResult {
  scenario: string;
  gpsCount: number;
  crmlsCount: number;
  totalCount: number;
  gpsTime: number;
  crmlsTime: number;
  totalTime: number;
  validBbox: boolean;
}

/**
 * Run a single benchmark scenario
 */
async function runBenchmark(
  db: any,
  scenario: {
    name: string;
    bounds: { west: number; south: number; east: number; north: number };
    filters: MapFilters;
  }
): Promise<BenchmarkResult> {
  console.log(`\n📊 Running: ${scenario.name}`);

  const validBbox = validateBoundingBox(scenario.bounds);
  console.log(`   Bounding box valid: ${validBbox ? '✅' : '❌'}`);

  const query = buildMapQuery(scenario.filters, scenario.bounds);
  console.log(`   Filter count: ${Object.keys(scenario.filters).length}`);

  // Benchmark GPS collection
  const gpsStart = Date.now();
  const gpsListings = await db
    .collection('listings')
    .find(query)
    .limit(1000)
    .toArray();
  const gpsTime = Date.now() - gpsStart;

  // Benchmark CRMLS collection
  const crmlsStart = Date.now();
  const crmlsListings = await db
    .collection('crmls_listings')
    .find(query)
    .limit(1000)
    .toArray();
  const crmlsTime = Date.now() - crmlsStart;

  const totalTime = gpsTime + crmlsTime;
  const totalCount = gpsListings.length + crmlsListings.length;

  console.log(`   GPS: ${gpsListings.length} listings in ${gpsTime}ms`);
  console.log(`   CRMLS: ${crmlsListings.length} listings in ${crmlsTime}ms`);
  console.log(`   Total: ${totalCount} listings in ${totalTime}ms`);

  return {
    scenario: scenario.name,
    gpsCount: gpsListings.length,
    crmlsCount: crmlsListings.length,
    totalCount,
    gpsTime,
    crmlsTime,
    totalTime,
    validBbox
  };
}

/**
 * Format results table
 */
function printResultsTable(results: BenchmarkResult[]) {
  console.log('\n\n╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                        BENCHMARK RESULTS SUMMARY                          ║');
  console.log('╠═══════════════════════════════════════════════════════════════════════════╣');

  results.forEach((result, index) => {
    console.log(`║ ${(index + 1).toString().padStart(2)}. ${result.scenario.padEnd(68)}║`);
    console.log(`║     GPS: ${result.gpsCount.toString().padStart(4)} listings in ${result.gpsTime.toString().padStart(4)}ms${' '.repeat(44)}║`);
    console.log(`║     CRMLS: ${result.crmlsCount.toString().padStart(4)} listings in ${result.crmlsTime.toString().padStart(4)}ms${' '.repeat(42)}║`);
    console.log(`║     TOTAL: ${result.totalCount.toString().padStart(4)} listings in ${result.totalTime.toString().padStart(4)}ms${' '.repeat(42)}║`);

    if (index < results.length - 1) {
      console.log('║───────────────────────────────────────────────────────────────────────────║');
    }
  });

  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');
}

/**
 * Calculate and print statistics
 */
function printStatistics(results: BenchmarkResult[]) {
  const totalQueries = results.length;
  const avgGpsTime = results.reduce((sum, r) => sum + r.gpsTime, 0) / totalQueries;
  const avgCrmlsTime = results.reduce((sum, r) => sum + r.crmlsTime, 0) / totalQueries;
  const avgTotalTime = results.reduce((sum, r) => sum + r.totalTime, 0) / totalQueries;
  const avgTotalCount = results.reduce((sum, r) => sum + r.totalCount, 0) / totalQueries;

  const maxTime = Math.max(...results.map(r => r.totalTime));
  const minTime = Math.min(...results.map(r => r.totalTime));
  const slowestScenario = results.find(r => r.totalTime === maxTime)!;
  const fastestScenario = results.find(r => r.totalTime === minTime)!;

  console.log('📈 PERFORMANCE STATISTICS:\n');
  console.log(`   Average Response Times:`);
  console.log(`      GPS Collection:   ${avgGpsTime.toFixed(2)}ms`);
  console.log(`      CRMLS Collection: ${avgCrmlsTime.toFixed(2)}ms`);
  console.log(`      Combined Total:   ${avgTotalTime.toFixed(2)}ms\n`);

  console.log(`   Average Listings per Query: ${avgTotalCount.toFixed(0)}\n`);

  console.log(`   Fastest Query: ${fastestScenario.scenario} (${minTime}ms)`);
  console.log(`   Slowest Query: ${slowestScenario.scenario} (${maxTime}ms)\n`);

  // Performance assessment
  const isGoodPerformance = avgTotalTime < 100;
  const isAcceptable = avgTotalTime < 500;

  if (isGoodPerformance) {
    console.log('   ✅ EXCELLENT: Average query time < 100ms');
  } else if (isAcceptable) {
    console.log('   ⚠️  ACCEPTABLE: Average query time < 500ms');
  } else {
    console.log('   ❌ POOR: Average query time > 500ms - Consider index optimization');
  }
}

/**
 * Main benchmark execution
 */
async function main() {
  console.log('🚀 Map Query Benchmark Tool\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`📡 Connecting to MongoDB...`);
  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();

    // Check indexes exist
    console.log('🔍 Checking indexes...');
    const listingsIndexes = await db.collection('listings').indexes();
    const crmlsIndexes = await db.collection('crmls_listings').indexes();

    console.log(`   listings: ${listingsIndexes.length} indexes`);
    console.log(`   crmls_listings: ${crmlsIndexes.length} indexes`);

    const hasGeoIndex = listingsIndexes.some(idx => idx.name === 'geo_active_price');
    if (!hasGeoIndex) {
      console.log('\n   ⚠️  WARNING: geo_active_price index not found!');
      console.log('   Run: node scripts/mongodb/create-indexes.js\n');
    } else {
      console.log('   ✅ Required indexes present\n');
    }

    // Run all benchmarks
    const results: BenchmarkResult[] = [];

    for (const scenario of TEST_SCENARIOS) {
      const result = await runBenchmark(db, scenario);
      results.push(result);
    }

    // Print results
    printResultsTable(results);
    printStatistics(results);

    console.log('\n✨ Benchmark complete!\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('📡 MongoDB connection closed\n');
  }
}

// Run the benchmark
main().catch(console.error);
