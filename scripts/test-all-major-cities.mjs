#!/usr/bin/env node

// Comprehensive test of all major Southern California cities and their subdivisions
// Tests chat API with map integration for each city

const MAJOR_CITIES = [
  {
    city: "Palm Desert",
    subdivisions: [
      { name: "Sun City", slug: "sun-city", expectedListings: 50 },
      { name: "Palm Desert Country Club", slug: "palm-desert-country-club", expectedListings: 22 },
      { name: "Palm Desert Resort Country Club", slug: "palm-desert-resort-country-club", expectedListings: 20 }
    ]
  },
  {
    city: "Palm Springs",
    subdivisions: [
      { name: "Indian Canyons", slug: "indian-canyons", expectedListings: 30 },
      { name: "Las Palmas", slug: "las-palmas", expectedListings: 25 },
      { name: "Movie Colony", slug: "movie-colony", expectedListings: 20 }
    ]
  },
  {
    city: "La Quinta",
    subdivisions: [
      { name: "PGA West", slug: "pga-west", expectedListings: 40 },
      { name: "The Citrus", slug: "the-citrus", expectedListings: 30 },
      { name: "La Quinta Resort", slug: "la-quinta-resort", expectedListings: 25 }
    ]
  },
  {
    city: "Indian Wells",
    subdivisions: [
      { name: "Indian Wells Country Club", slug: "indian-wells-country-club", expectedListings: 35 },
      { name: "Toscana Country Club", slug: "toscana-country-club", expectedListings: 30 },
      { name: "Vintage Club", slug: "vintage-club", expectedListings: 25 }
    ]
  },
  {
    city: "Rancho Mirage",
    subdivisions: [
      { name: "Thunderbird Heights", slug: "thunderbird-heights", expectedListings: 30 },
      { name: "The Springs Country Club", slug: "the-springs-country-club", expectedListings: 25 },
      { name: "Mission Hills Country Club", slug: "mission-hills-country-club", expectedListings: 20 }
    ]
  }
];

console.log("🏙️  COMPREHENSIVE MULTI-CITY SUBDIVISION TEST");
console.log("═".repeat(80));
console.log(`Testing ${MAJOR_CITIES.length} cities with ${MAJOR_CITIES.reduce((sum, c) => sum + c.subdivisions.length, 0)} subdivisions total\n`);

const allResults = [];
let totalTests = 0;
let passedTests = 0;
let partialTests = 0;
let failedTests = 0;
let mapReadyCount = 0;

for (const cityData of MAJOR_CITIES) {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🏙️  ${cityData.city.toUpperCase()}`);
  console.log('═'.repeat(80));

  const cityResults = [];

  for (let i = 0; i < cityData.subdivisions.length; i++) {
    const sub = cityData.subdivisions[i];

    console.log(`\n📍 Test ${i + 1}/${cityData.subdivisions.length}: ${sub.name}`);
    console.log(`   Expected listings: ${sub.expectedListings}`);
    console.log(`   Slug: ${sub.slug}`);
    console.log("-".repeat(80));

    const startTime = Date.now();
    totalTests++;

    try {
      const response = await fetch("http://localhost:3000/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `show me homes in ${sub.name} ${cityData.city}` }],
          userId: `test-${sub.slug}`,
          userTier: "free",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const testTime = Date.now() - startTime;

      // Validation checks
      const checks = {
        hasResponse: !!data.response,
        hasListings: Array.isArray(data.listings) && data.listings.length > 0,
        hasMetadata: !!data.metadata,
        hasFunctionCalls: Array.isArray(data.metadata?.functionCalls) && data.metadata.functionCalls.length > 0,
        listingsHaveCoordinates: data.listings?.every(l => (l.Latitude && l.Longitude) || (l.latitude && l.longitude)) || false,
        matchesExpectedCount: data.listings?.length === sub.expectedListings || false,
      };

      const allChecksPassed = Object.values(checks).every(v => v === true);
      const mapReady = checks.hasListings && checks.listingsHaveCoordinates;

      if (allChecksPassed) {
        passedTests++;
      } else if (checks.hasResponse && checks.hasListings) {
        partialTests++;
      } else {
        failedTests++;
      }

      if (mapReady) mapReadyCount++;

      // Display results
      console.log(`\n${allChecksPassed ? "✅" : (checks.hasResponse ? "⚠️" : "❌")} Status: ${allChecksPassed ? "PASS" : (checks.hasResponse ? "PARTIAL PASS" : "FAIL")}`);
      console.log(`⏱️  Response Time: ${testTime}ms`);
      console.log(`📊 Listings Returned: ${data.listings?.length || 0}/${sub.expectedListings}`);
      console.log(`📞 Functions Called: ${data.metadata?.functionCalls?.map(fc => fc.function).join(" → ") || "none"}`);
      console.log(`🗺️  Map Ready: ${mapReady ? "YES" : "NO"}`);
      console.log(`💬 Response Preview: ${data.response?.substring(0, 80)}...`);

      // Detailed checks
      console.log(`\n   Validation Checks:`);
      console.log(`   ${checks.hasResponse ? "✓" : "✗"} Has response text`);
      console.log(`   ${checks.hasListings ? "✓" : "✗"} Has listings array`);
      console.log(`   ${checks.hasMetadata ? "✓" : "✗"} Has metadata`);
      console.log(`   ${checks.hasFunctionCalls ? "✓" : "✗"} Has function calls`);
      console.log(`   ${checks.listingsHaveCoordinates ? "✓" : "✗"} Listings have coordinates (for map)`);
      console.log(`   ${checks.matchesExpectedCount ? "✓" : "✗"} Listing count matches expected`);

      // Store result
      cityResults.push({
        subdivision: sub.name,
        slug: sub.slug,
        expected: sub.expectedListings,
        actual: data.listings?.length || 0,
        responseTime: testTime,
        functionCalls: data.metadata?.functionCalls?.map(fc => fc.function) || [],
        mapReady,
        passed: allChecksPassed,
        checks
      });

    } catch (error) {
      failedTests++;
      console.log(`\n❌ Status: FAILED`);
      console.log(`   Error: ${error.message}`);

      cityResults.push({
        subdivision: sub.name,
        slug: sub.slug,
        expected: sub.expectedListings,
        error: error.message,
        passed: false
      });
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  allResults.push({
    city: cityData.city,
    results: cityResults
  });
}

// Final Summary
console.log(`\n${"═".repeat(80)}`);
console.log("📊 FINAL MULTI-CITY TEST SUMMARY");
console.log("═".repeat(80));

console.log(`\n✅ Fully Passed: ${passedTests}/${totalTests} (${(passedTests/totalTests*100).toFixed(1)}%)`);
console.log(`⚠️  Partially Passed: ${partialTests}/${totalTests} (${(partialTests/totalTests*100).toFixed(1)}%)`);
console.log(`❌ Failed: ${failedTests}/${totalTests} (${(failedTests/totalTests*100).toFixed(1)}%)`);
console.log(`🗺️  Map-Ready: ${mapReadyCount}/${totalTests} (${(mapReadyCount/totalTests*100).toFixed(1)}%)`);

// Performance stats
const successfulResults = allResults.flatMap(c => c.results).filter(r => r.responseTime);
if (successfulResults.length > 0) {
  const avgTime = successfulResults.reduce((sum, r) => sum + r.responseTime, 0) / successfulResults.length;
  const minTime = Math.min(...successfulResults.map(r => r.responseTime));
  const maxTime = Math.max(...successfulResults.map(r => r.responseTime));

  console.log(`\n⏱️  PERFORMANCE`);
  console.log(`   Average: ${Math.round(avgTime)}ms`);
  console.log(`   Min: ${minTime}ms`);
  console.log(`   Max: ${maxTime}ms`);
}

// City-by-city breakdown
console.log(`\n📍 CITY-BY-CITY BREAKDOWN`);
console.log("-".repeat(80));
for (const cityData of allResults) {
  const passed = cityData.results.filter(r => r.passed).length;
  const mapReady = cityData.results.filter(r => r.mapReady).length;
  const total = cityData.results.length;

  console.log(`${cityData.city.padEnd(20)} | Passed: ${passed}/${total} | Map-Ready: ${mapReady}/${total}`);
}

// Issue patterns analysis
console.log(`\n🔍 ISSUE PATTERNS DETECTED`);
console.log("-".repeat(80));

const issuePatterns = {
  noCoordinates: 0,
  wrongFunction: 0,
  typeErrors: 0,
  noListings: 0
};

allResults.flatMap(c => c.results).forEach(r => {
  if (r.checks) {
    if (r.checks.hasListings && !r.checks.listingsHaveCoordinates) {
      issuePatterns.noCoordinates++;
    }
    if (!r.checks.hasListings) {
      issuePatterns.noListings++;
    }
  }
  if (r.error && r.error.includes('validation failed')) {
    issuePatterns.typeErrors++;
  }
});

console.log(`⚠️  Listings without coordinates: ${issuePatterns.noCoordinates}`);
console.log(`⚠️  No listings returned: ${issuePatterns.noListings}`);
console.log(`⚠️  Type validation errors: ${issuePatterns.typeErrors}`);

console.log(`\n${"═".repeat(80)}`);
console.log(passedTests === totalTests ? "✅ ALL TESTS PASSED" : `⚠️  ${failedTests + partialTests} TESTS NEED ATTENTION`);
console.log("═".repeat(80) + "\n");

// Save detailed results to JSON
import fs from 'fs';
fs.mkdirSync('scripts/test-results', { recursive: true });
fs.writeFileSync(
  'scripts/test-results/multi-city-test-results.json',
  JSON.stringify({
    summary: { totalTests, passedTests, partialTests, failedTests, mapReadyCount },
    results: allResults,
    issuePatterns
  }, null, 2)
);
console.log(`📄 Detailed results saved to: scripts/test-results/multi-city-test-results.json\n`);

// Exit code
process.exit(failedTests > (totalTests * 0.2) ? 1 : 0); // Allow up to 20% failures
