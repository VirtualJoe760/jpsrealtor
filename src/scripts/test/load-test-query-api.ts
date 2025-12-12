/**
 * Load Testing Script for Query API
 *
 * Tests query system performance under various load conditions.
 *
 * Usage:
 * ```bash
 * npx ts-node src/scripts/test/load-test-query-api.ts
 * ```
 */

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  cacheHitRate: number;
  errors: Record<string, number>;
}

/**
 * Test scenarios
 */
const TEST_SCENARIOS = [
  {
    name: 'Simple City Query',
    url: '/api/query?city=Orange&includeStats=true',
  },
  {
    name: 'Complex Filter Query',
    url: '/api/query?city=Palm+Desert&minBeds=3&maxPrice=800000&pool=true&includeStats=true',
  },
  {
    name: 'Comparison Query',
    url: '/api/query?city=La+Quinta&compareWith=Palm+Desert&compareIsCity=true&includeStats=true',
  },
  {
    name: 'Closed Listings Query',
    url: '/api/query?city=Orange&includeClosedListings=true&includeClosedStats=true&yearsBack=5',
  },
  {
    name: 'Full Query (All Features)',
    url: '/api/query?city=Palm+Desert&minBeds=3&includeStats=true&includeClosedStats=true&includeAppreciation=true&yearsBack=5',
  },
];

/**
 * Run load test
 */
async function runLoadTest(
  baseUrl: string,
  scenario: (typeof TEST_SCENARIOS)[0],
  concurrentUsers: number,
  requestsPerUser: number
): Promise<LoadTestResult> {
  console.log(`\n🧪 Testing: ${scenario.name}`);
  console.log(`   Concurrent users: ${concurrentUsers}`);
  console.log(`   Requests per user: ${requestsPerUser}`);
  console.log(`   Total requests: ${concurrentUsers * requestsPerUser}`);

  const responseTimes: number[] = [];
  const errors: Record<string, number> = {};
  let successfulRequests = 0;
  let failedRequests = 0;
  let cacheHits = 0;

  const startTime = Date.now();

  // Create promises for all concurrent users
  const userPromises = Array.from({ length: concurrentUsers }, async () => {
    for (let i = 0; i < requestsPerUser; i++) {
      const requestStartTime = Date.now();

      try {
        const response = await fetch(`${baseUrl}${scenario.url}`);
        const responseTime = Date.now() - requestStartTime;
        responseTimes.push(responseTime);

        if (response.ok) {
          successfulRequests++;
          const data = await response.json();
          if (data.meta?.cached) {
            cacheHits++;
          }
        } else {
          failedRequests++;
          const errorType = `HTTP ${response.status}`;
          errors[errorType] = (errors[errorType] || 0) + 1;
        }
      } catch (error: any) {
        failedRequests++;
        const errorType = error.message || 'Unknown error';
        errors[errorType] = (errors[errorType] || 0) + 1;
      }
    }
  });

  // Wait for all users to complete
  await Promise.all(userPromises);

  const totalTime = Date.now() - startTime;
  const totalRequests = concurrentUsers * requestsPerUser;

  // Calculate statistics
  responseTimes.sort((a, b) => a - b);

  const result: LoadTestResult = {
    totalRequests,
    successfulRequests,
    failedRequests,
    avgResponseTime: Math.round(
      responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
    ),
    minResponseTime: responseTimes[0] || 0,
    maxResponseTime: responseTimes[responseTimes.length - 1] || 0,
    p50ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.5)] || 0,
    p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)] || 0,
    p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)] || 0,
    requestsPerSecond: Math.round((totalRequests / totalTime) * 1000),
    cacheHitRate: Math.round((cacheHits / successfulRequests) * 100 * 100) / 100,
    errors,
  };

  return result;
}

/**
 * Print results
 */
function printResults(results: LoadTestResult): void {
  console.log('\n📊 Results:');
  console.log(`   Total Requests: ${results.totalRequests}`);
  console.log(`   ✅ Successful: ${results.successfulRequests}`);
  console.log(`   ❌ Failed: ${results.failedRequests}`);
  console.log(`   Success Rate: ${Math.round((results.successfulRequests / results.totalRequests) * 100)}%`);
  console.log(`\n⏱️  Response Times:`);
  console.log(`   Average: ${results.avgResponseTime}ms`);
  console.log(`   Min: ${results.minResponseTime}ms`);
  console.log(`   Max: ${results.maxResponseTime}ms`);
  console.log(`   P50 (median): ${results.p50ResponseTime}ms`);
  console.log(`   P95: ${results.p95ResponseTime}ms`);
  console.log(`   P99: ${results.p99ResponseTime}ms`);
  console.log(`\n🚀 Performance:`);
  console.log(`   Requests/sec: ${results.requestsPerSecond}`);
  console.log(`   Cache hit rate: ${results.cacheHitRate}%`);

  if (Object.keys(results.errors).length > 0) {
    console.log(`\n⚠️  Errors:`);
    Object.entries(results.errors).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
  }
}

/**
 * Run all tests
 */
async function main() {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

  console.log('🚀 Query API Load Testing');
  console.log(`   Base URL: ${baseUrl}`);
  console.log(`   Scenarios: ${TEST_SCENARIOS.length}`);

  const allResults: Array<{ scenario: string; results: LoadTestResult }> = [];

  // Test configurations
  const testConfigs = [
    { users: 1, requests: 10, name: 'Light Load' },
    { users: 5, requests: 10, name: 'Medium Load' },
    { users: 10, requests: 10, name: 'Heavy Load' },
  ];

  for (const config of testConfigs) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Test Configuration: ${config.name}`);
    console.log(`${'='.repeat(60)}`);

    for (const scenario of TEST_SCENARIOS) {
      const results = await runLoadTest(baseUrl, scenario, config.users, config.requests);
      printResults(results);
      allResults.push({ scenario: scenario.name, results });

      // Wait between scenarios
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Print summary
  console.log(`\n\n${'='.repeat(60)}`);
  console.log(`📈 SUMMARY`);
  console.log(`${'='.repeat(60)}`);

  console.log('\nAverage Response Times by Scenario:');
  const scenarioAverages = TEST_SCENARIOS.map((scenario) => {
    const scenarioResults = allResults.filter((r) => r.scenario === scenario.name);
    const avgTime =
      scenarioResults.reduce((sum, r) => sum + r.results.avgResponseTime, 0) /
      scenarioResults.length;
    return { scenario: scenario.name, avgTime: Math.round(avgTime) };
  });

  scenarioAverages
    .sort((a, b) => a.avgTime - b.avgTime)
    .forEach((item) => {
      console.log(`   ${item.scenario}: ${item.avgTime}ms`);
    });

  console.log('\n✅ Load testing complete!');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { runLoadTest };
export type { LoadTestResult };
