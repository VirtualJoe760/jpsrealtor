#!/usr/bin/env node

// Test Palm Desert subdivisions with chat widget and map view integration

const TOP_SUBDIVISIONS = [
  { name: "Sun City", slug: "sun-city", listings: 50 },
  { name: "Non-HOA Palm Desert", slug: "non-hoa-palm-desert", listings: 36 },
  { name: "Desert Falls Country Club", slug: "desert-falls-country-club", listings: 28 },
  { name: "Palm Desert Greens", slug: "palm-desert-greens", listings: 27 },
  { name: "Ironwood Country Club", slug: "ironwood-country-club", listings: 27 },
  { name: "Palm Valley Country Club", slug: "palm-valley-country-club", listings: 23 },
  { name: "Palm Desert Country Club", slug: "palm-desert-country-club", listings: 22 },
  { name: "Palm Desert Resort Country Club", slug: "palm-desert-resort-country-club", listings: 20 },
  { name: "Monterey Country Club", slug: "monterey-country-club", listings: 18 },
  { name: "The Lakes Country Club", slug: "the-lakes-country-club", listings: 16 }
];

console.log("🏘️  PALM DESERT SUBDIVISIONS TEST - COMPREHENSIVE");
console.log("=".repeat(80));
console.log(`Testing ${TOP_SUBDIVISIONS.length} subdivisions with highest listing counts\n`);

const results = [];
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

for (let i = 0; i < TOP_SUBDIVISIONS.length; i++) {
  const sub = TOP_SUBDIVISIONS[i];

  console.log(`\n📍 Test ${i + 1}/${TOP_SUBDIVISIONS.length}: ${sub.name}`);
  console.log(`   Expected listings: ${sub.listings}`);
  console.log(`   Slug: ${sub.slug}`);
  console.log("-".repeat(80));

  const startTime = Date.now();
  totalTests++;

  try {
    const response = await fetch("http://localhost:3000/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: `show me homes in ${sub.name} palm desert` }],
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
      matchesExpectedCount: data.listings?.length === sub.listings || false,
    };

    const allChecksPassed = Object.values(checks).every(v => v === true);

    if (allChecksPassed) {
      passedTests++;
    } else {
      failedTests++;
    }

    // Display results
    console.log(`\n${allChecksPassed ? "✅" : "⚠️"} Status: ${allChecksPassed ? "PASS" : "PARTIAL PASS"}`);
    console.log(`⏱️  Response Time: ${testTime}ms`);
    console.log(`📊 Listings Returned: ${data.listings?.length || 0}/${sub.listings}`);
    console.log(`📞 Functions Called: ${data.metadata?.functionCalls?.map(fc => fc.function).join(" → ") || "none"}`);
    console.log(`🗺️  Map Ready: ${checks.listingsHaveCoordinates ? "YES" : "NO"}`);
    console.log(`💬 Response Preview: ${data.response?.substring(0, 100)}...`);

    // Detailed checks
    console.log(`\n   Validation Checks:`);
    console.log(`   ${checks.hasResponse ? "✓" : "✗"} Has response text`);
    console.log(`   ${checks.hasListings ? "✓" : "✗"} Has listings array`);
    console.log(`   ${checks.hasMetadata ? "✓" : "✗"} Has metadata`);
    console.log(`   ${checks.hasFunctionCalls ? "✓" : "✗"} Has function calls`);
    console.log(`   ${checks.listingsHaveCoordinates ? "✓" : "✗"} Listings have coordinates (for map)`);
    console.log(`   ${checks.matchesExpectedCount ? "✓" : "✗"} Listing count matches expected`);

    // Store result
    results.push({
      subdivision: sub.name,
      slug: sub.slug,
      expected: sub.listings,
      actual: data.listings?.length || 0,
      responseTime: testTime,
      functionCalls: data.metadata?.functionCalls?.map(fc => fc.function) || [],
      mapReady: checks.listingsHaveCoordinates,
      passed: allChecksPassed,
      checks
    });

  } catch (error) {
    failedTests++;
    console.log(`\n❌ Status: FAILED`);
    console.log(`   Error: ${error.message}`);

    results.push({
      subdivision: sub.name,
      slug: sub.slug,
      expected: sub.listings,
      error: error.message,
      passed: false
    });
  }

  // Small delay between requests
  await new Promise(resolve => setTimeout(resolve, 500));
}

// Final Summary
console.log("\n" + "=".repeat(80));
console.log("📊 FINAL TEST SUMMARY");
console.log("=".repeat(80));

console.log(`\n✅ Passed: ${passedTests}/${totalTests}`);
console.log(`⚠️  Failed/Partial: ${failedTests}/${totalTests}`);

// Performance stats
const successfulResults = results.filter(r => r.responseTime);
if (successfulResults.length > 0) {
  const avgTime = successfulResults.reduce((sum, r) => sum + r.responseTime, 0) / successfulResults.length;
  const minTime = Math.min(...successfulResults.map(r => r.responseTime));
  const maxTime = Math.max(...successfulResults.map(r => r.responseTime));

  console.log(`\n⏱️  PERFORMANCE`);
  console.log(`   Average: ${Math.round(avgTime)}ms`);
  console.log(`   Min: ${minTime}ms`);
  console.log(`   Max: ${maxTime}ms`);
}

// Listing accuracy
const listingResults = results.filter(r => r.actual !== undefined);
if (listingResults.length > 0) {
  const exactMatches = listingResults.filter(r => r.actual === r.expected).length;
  const accuracyRate = (exactMatches / listingResults.length * 100).toFixed(1);

  console.log(`\n📊 LISTING ACCURACY`);
  console.log(`   Exact matches: ${exactMatches}/${listingResults.length} (${accuracyRate}%)`);
}

// Map readiness
const mapReadyCount = results.filter(r => r.mapReady).length;
console.log(`\n🗺️  MAP INTEGRATION`);
console.log(`   Map-ready: ${mapReadyCount}/${totalTests} subdivisions`);

// Detailed results table
console.log(`\n📋 DETAILED RESULTS`);
console.log("-".repeat(80));
console.log("Subdivision".padEnd(40) + "Expected".padEnd(12) + "Actual".padEnd(12) + "Time".padEnd(10) + "Status");
console.log("-".repeat(80));

results.forEach(r => {
  const name = r.subdivision.substring(0, 38).padEnd(40);
  const expected = (r.expected?.toString() || "N/A").padEnd(12);
  const actual = (r.actual?.toString() || "ERROR").padEnd(12);
  const time = (r.responseTime ? `${r.responseTime}ms` : "N/A").padEnd(10);
  const status = r.passed ? "✅ PASS" : (r.error ? "❌ FAIL" : "⚠️  PARTIAL");

  console.log(`${name}${expected}${actual}${time}${status}`);
});

// Function calling analysis
console.log(`\n🔧 FUNCTION CALLING PATTERNS`);
console.log("-".repeat(80));
const functionPatterns = {};
results.forEach(r => {
  if (r.functionCalls && r.functionCalls.length > 0) {
    const pattern = r.functionCalls.join(" → ");
    functionPatterns[pattern] = (functionPatterns[pattern] || 0) + 1;
  }
});

Object.entries(functionPatterns).forEach(([pattern, count]) => {
  console.log(`${count}x: ${pattern}`);
});

console.log("\n" + "=".repeat(80));
console.log(passedTests === totalTests ? "✅ ALL TESTS PASSED" : `⚠️  ${failedTests} TESTS NEED ATTENTION`);
console.log("=".repeat(80) + "\n");

// Exit code
process.exit(failedTests > 0 ? 1 : 0);
