/**
 * AI Chat Performance Test
 *
 * Tests the AI chat system with various query types to measure:
 * - Response time (total and per-tool)
 * - Tool usage patterns
 * - Query optimization opportunities
 * - Cache effectiveness
 *
 * Usage: node test-ai-performance.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Test queries covering different AI capabilities
const TEST_QUERIES = [
  {
    name: "City Search with Stats",
    query: "Show me homes in Palm Desert",
    expectedTools: ["queryDatabase"],
    description: "Basic city search with market stats"
  },
  {
    name: "Filtered City Search",
    query: "Find 3+ bedroom homes in Orange under $800,000",
    expectedTools: ["queryDatabase"],
    description: "City search with property filters"
  },
  {
    name: "Subdivision Search",
    query: "Show me homes in Palm Desert Country Club",
    expectedTools: ["queryDatabase"],
    description: "Subdivision search with stats"
  },
  {
    name: "Amenity Search",
    query: "Find homes with pool and spa in La Quinta",
    expectedTools: ["queryDatabase"],
    description: "City search with amenity filters"
  },
  {
    name: "Market Comparison",
    query: "Compare home prices in La Quinta vs Palm Desert",
    expectedTools: ["queryDatabase"],
    description: "City comparison with stats"
  },
  {
    name: "Appreciation Query",
    query: "How have home prices appreciated in Indian Wells over the past 5 years?",
    expectedTools: ["getAppreciation"],
    description: "Market appreciation analysis"
  },
  {
    name: "Combined Query",
    query: "Show me homes in Palm Desert and tell me about the market appreciation",
    expectedTools: ["queryDatabase", "getAppreciation"],
    description: "Multiple tool calls in single query"
  },
  {
    name: "Article Search",
    query: "What are energy costs like in the Coachella Valley?",
    expectedTools: ["searchArticles"],
    description: "Information query from articles"
  },
  {
    name: "New Listings",
    query: "Show me new listings from the past week in Indian Wells",
    expectedTools: ["queryDatabase"],
    description: "Time-filtered search"
  },
  {
    name: "Price Per Sqft",
    query: "Find homes in Orange under $400 per square foot",
    expectedTools: ["queryDatabase"],
    description: "Price per sqft filtering"
  }
];

/**
 * Run a single test query
 */
async function testQuery(test, iteration = 1) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST: ${test.name} (Iteration ${iteration})`);
  console.log(`Query: "${test.query}"`);
  console.log(`Expected Tools: ${test.expectedTools.join(', ')}`);
  console.log('='.repeat(80));

  const startTime = Date.now();

  try {
    const response = await fetch(`${BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: test.query
          }
        ],
        userId: 'test-user-performance',
        userTier: 'free'
      })
    });

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    if (!response.ok) {
      const error = await response.json();
      console.error(`❌ FAILED: ${error.error}`);
      console.error(`Details: ${error.details}`);
      return {
        success: false,
        totalTime,
        error: error.error
      };
    }

    const result = await response.json();

    console.log(`\n✅ SUCCESS`);
    console.log(`Total Time: ${totalTime}ms`);
    console.log(`Processing Time (from metadata): ${result.metadata?.processingTime}ms`);
    console.log(`Model: ${result.metadata?.model || 'unknown'}`);

    // Analyze components
    const components = result.components || {};
    console.log(`\nComponents Returned:`);
    console.log(`- Carousel: ${components.carousel ? '✓' : '✗'} ${components.carousel ? `(${components.carousel.listings?.length || 0} listings)` : ''}`);
    console.log(`- Map View: ${components.mapView ? '✓' : '✗'} ${components.mapView ? `(${components.mapView.listings?.length || 0} markers)` : ''}`);
    console.log(`- Appreciation: ${components.appreciation ? '✓' : '✗'} ${components.appreciation ? `(${components.appreciation.appreciation?.annual}% annual)` : ''}`);
    console.log(`- Articles: ${components.articles ? '✓' : '✗'} ${components.articles ? `(${components.articles.length || 0} articles)` : ''}`);

    // Extract response length
    console.log(`\nResponse Length: ${result.response?.length || 0} characters`);
    console.log(`Response Preview: ${result.response?.substring(0, 150)}...`);

    return {
      success: true,
      totalTime,
      processingTime: result.metadata?.processingTime,
      model: result.metadata?.model,
      components,
      responseLength: result.response?.length || 0
    };

  } catch (error) {
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    console.error(`\n❌ EXCEPTION: ${error.message}`);
    return {
      success: false,
      totalTime,
      error: error.message
    };
  }
}

/**
 * Test cache effectiveness by running same query twice
 */
async function testCacheEffectiveness(test) {
  console.log(`\n\n${'█'.repeat(80)}`);
  console.log(`CACHE TEST: ${test.name}`);
  console.log('█'.repeat(80));

  // First request (cache MISS expected)
  const result1 = await testQuery(test, 1);

  // Wait 1 second
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Second request (cache HIT expected)
  const result2 = await testQuery(test, 2);

  if (result1.success && result2.success) {
    const improvement = ((result1.totalTime - result2.totalTime) / result1.totalTime * 100).toFixed(1);
    const speedup = (result1.totalTime / result2.totalTime).toFixed(2);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`CACHE ANALYSIS`);
    console.log('='.repeat(80));
    console.log(`First Request:  ${result1.totalTime}ms (cache MISS expected)`);
    console.log(`Second Request: ${result2.totalTime}ms (cache HIT expected)`);
    console.log(`Improvement:    ${improvement}% faster`);
    console.log(`Speedup:        ${speedup}x`);
    console.log('='.repeat(80));

    return {
      firstTime: result1.totalTime,
      secondTime: result2.totalTime,
      improvement: parseFloat(improvement),
      speedup: parseFloat(speedup)
    };
  }

  return null;
}

/**
 * Main test runner
 */
async function main() {
  console.log('\n');
  console.log('█'.repeat(80));
  console.log('  AI CHAT PERFORMANCE TEST');
  console.log('  Testing response times, tool usage, and cache effectiveness');
  console.log('█'.repeat(80));

  const results = [];
  const cacheResults = [];

  // Test 1: Individual query performance
  console.log('\n\n📊 PHASE 1: Individual Query Performance');
  console.log('Testing each query type once to measure baseline performance...\n');

  for (const test of TEST_QUERIES) {
    const result = await testQuery(test, 1);
    results.push({ test: test.name, ...result });

    // Wait 500ms between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Test 2: Cache effectiveness (test 3 queries twice each)
  console.log('\n\n💾 PHASE 2: Cache Effectiveness');
  console.log('Testing cache performance by running same queries twice...\n');

  const cacheTests = TEST_QUERIES.slice(0, 3); // Test first 3 queries
  for (const test of cacheTests) {
    const cacheResult = await testCacheEffectiveness(test);
    if (cacheResult) {
      cacheResults.push({ test: test.name, ...cacheResult });
    }

    // Wait 2 seconds between cache tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary
  console.log('\n\n');
  console.log('█'.repeat(80));
  console.log('  PERFORMANCE SUMMARY');
  console.log('█'.repeat(80));

  console.log('\n📊 Query Performance (All Tests):');
  console.log('─'.repeat(80));
  console.log(`${'Test Name'.padEnd(40)} ${'Time'.padStart(10)} ${'Status'.padStart(10)}`);
  console.log('─'.repeat(80));

  const successfulResults = results.filter(r => r.success);
  const failedResults = results.filter(r => !r.success);

  successfulResults.forEach(r => {
    console.log(`${r.test.padEnd(40)} ${(r.totalTime + 'ms').padStart(10)} ${'✓'.padStart(10)}`);
  });

  if (failedResults.length > 0) {
    console.log('\n❌ Failed Tests:');
    failedResults.forEach(r => {
      console.log(`${r.test.padEnd(40)} ${(r.totalTime + 'ms').padStart(10)} ${'✗'.padStart(10)}`);
      console.log(`   Error: ${r.error}`);
    });
  }

  console.log('─'.repeat(80));

  if (successfulResults.length > 0) {
    const avgTime = successfulResults.reduce((sum, r) => sum + r.totalTime, 0) / successfulResults.length;
    const minTime = Math.min(...successfulResults.map(r => r.totalTime));
    const maxTime = Math.max(...successfulResults.map(r => r.totalTime));

    console.log(`Average Time: ${avgTime.toFixed(0)}ms`);
    console.log(`Fastest:      ${minTime}ms`);
    console.log(`Slowest:      ${maxTime}ms`);
    console.log(`Success Rate: ${successfulResults.length}/${results.length} (${(successfulResults.length/results.length*100).toFixed(1)}%)`);
  }

  console.log('\n💾 Cache Performance:');
  console.log('─'.repeat(80));
  console.log(`${'Test Name'.padEnd(40)} ${'Speedup'.padStart(10)} ${'Improvement'.padStart(15)}`);
  console.log('─'.repeat(80));

  cacheResults.forEach(r => {
    console.log(`${r.test.padEnd(40)} ${(r.speedup + 'x').padStart(10)} ${(r.improvement + '%').padStart(15)}`);
  });

  if (cacheResults.length > 0) {
    const avgSpeedup = cacheResults.reduce((sum, r) => sum + r.speedup, 0) / cacheResults.length;
    const avgImprovement = cacheResults.reduce((sum, r) => sum + r.improvement, 0) / cacheResults.length;
    console.log('─'.repeat(80));
    console.log(`Average Speedup:      ${avgSpeedup.toFixed(2)}x`);
    console.log(`Average Improvement:  ${avgImprovement.toFixed(1)}%`);
  }

  // Performance recommendations
  console.log('\n\n🚀 PERFORMANCE RECOMMENDATIONS:');
  console.log('─'.repeat(80));

  const slowQueries = successfulResults.filter(r => r.totalTime > 5000);
  if (slowQueries.length > 0) {
    console.log('\n⚠️  SLOW QUERIES (>5s):');
    slowQueries.forEach(r => {
      console.log(`  - ${r.test}: ${r.totalTime}ms`);
    });
    console.log('\n  Recommendations:');
    console.log('  1. Check if database indexes are being used');
    console.log('  2. Consider caching these expensive queries');
    console.log('  3. Review tool execution time in logs');
  }

  console.log('\n✅ OPTIMIZATION OPPORTUNITIES:');
  console.log('  1. Enable caching for all queryDatabase calls (currently implemented)');
  console.log('  2. Monitor cache hit rates in production');
  console.log('  3. Consider parallel tool execution for combined queries');
  console.log('  4. Optimize database queries with proper indexes (already done!)');
  console.log('  5. Stream AI responses for better perceived performance');

  console.log('\n\n█'.repeat(80));
  console.log('  TEST COMPLETE');
  console.log('█'.repeat(80));
  console.log('');
}

// Run tests
main().catch(console.error);
