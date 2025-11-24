#!/usr/bin/env node

// Comprehensive chat testing based on real user queries

const TEST_QUERIES = [
  {
    query: "show me homes in palm desert country club",
    expectedFunctions: ["matchLocation", "getSubdivisionListings"],
    description: "Subdivision search"
  },
  {
    query: "what are prices like in palm springs",
    expectedFunctions: ["matchLocation", "getCityStats"],
    description: "City statistics"
  },
  {
    query: "show me 3 bedroom homes under 500k in palm desert",
    expectedFunctions: ["matchLocation", "searchListings"],
    description: "Filtered listing search"
  },
  {
    query: "what communities are in la quinta",
    expectedFunctions: ["matchLocation", "getCitySubdivisions"],
    description: "City subdivisions list"
  },
  {
    query: "tell me about hoa fees in indian wells",
    expectedFunctions: ["matchLocation", "getCityHOA"],
    description: "HOA information"
  }
];

console.log("🧪 COMPREHENSIVE CHAT TESTING - LLAMA 4 SCOUT");
console.log("=".repeat(70));
console.log(`Testing ${TEST_QUERIES.length} different query types\n`);

const results = [];
let totalTime = 0;
let totalIterations = 0;
let totalFunctionCalls = 0;

for (let i = 0; i < TEST_QUERIES.length; i++) {
  const test = TEST_QUERIES[i];

  console.log(`\n📝 Test ${i + 1}/${TEST_QUERIES.length}: ${test.description}`);
  console.log(`Query: "${test.query}"`);
  console.log("-".repeat(70));

  const startTime = Date.now();

  try {
    const response = await fetch("http://localhost:3000/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: test.query }],
        userId: "comprehensive-test",
        userTier: "free",
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const testTime = Date.now() - startTime;

    // Extract function names
    const functionsCalled = data.metadata.functionCalls.map(fc => fc.function);
    const functionsMatch = test.expectedFunctions.every(fn =>
      functionsCalled.includes(fn)
    );

    // Store results
    results.push({
      test: test.description,
      query: test.query,
      time: data.metadata.processingTime,
      totalTime: testTime,
      iterations: data.metadata.iterations,
      functionCalls: functionsCalled,
      expectedFunctions: test.expectedFunctions,
      functionsMatch,
      success: true
    });

    totalTime += data.metadata.processingTime;
    totalIterations += data.metadata.iterations;
    totalFunctionCalls += data.metadata.functionCalls.length;

    // Display results
    console.log(`✅ Status: SUCCESS`);
    console.log(`⏱️  API Time: ${data.metadata.processingTime}ms`);
    console.log(`🌐 Total Time: ${testTime}ms`);
    console.log(`🔄 Iterations: ${data.metadata.iterations}`);
    console.log(`📞 Functions Called: ${functionsCalled.join(" → ")}`);
    console.log(`✓  Expected: ${test.expectedFunctions.join(", ")}`);
    console.log(`${functionsMatch ? "✅" : "⚠️"} Functions Match: ${functionsMatch}`);
    console.log(`💬 Response Preview: ${data.response.substring(0, 100)}...`);

  } catch (error) {
    console.log(`❌ Status: FAILED`);
    console.log(`Error: ${error.message}`);

    results.push({
      test: test.description,
      query: test.query,
      error: error.message,
      success: false
    });
  }
}

// Summary Report
console.log("\n" + "=".repeat(70));
console.log("📊 TEST SUMMARY - LLAMA 4 SCOUT");
console.log("=".repeat(70));

const successCount = results.filter(r => r.success).length;
const failCount = results.length - successCount;
const avgTime = totalTime / successCount;
const avgIterations = totalIterations / successCount;
const avgFunctionCalls = totalFunctionCalls / successCount;

console.log(`\n✅ Passed: ${successCount}/${TEST_QUERIES.length}`);
console.log(`❌ Failed: ${failCount}/${TEST_QUERIES.length}`);
console.log(`\n⏱️  Average API Time: ${Math.round(avgTime)}ms`);
console.log(`🔄 Average Iterations: ${avgIterations.toFixed(1)}`);
console.log(`📞 Average Function Calls: ${avgFunctionCalls.toFixed(1)}`);

// Performance Breakdown
console.log("\n📈 PERFORMANCE BREAKDOWN");
console.log("-".repeat(70));
results.forEach((result, i) => {
  if (result.success) {
    console.log(`${i + 1}. ${result.test.padEnd(30)} ${result.time}ms (${result.iterations} iter, ${result.functionCalls.length} funcs)`);
  } else {
    console.log(`${i + 1}. ${result.test.padEnd(30)} FAILED: ${result.error}`);
  }
});

// Function Calling Accuracy
console.log("\n🎯 FUNCTION CALLING ACCURACY");
console.log("-".repeat(70));
const accurateCount = results.filter(r => r.success && r.functionsMatch).length;
const accuracyRate = (accurateCount / successCount * 100).toFixed(1);
console.log(`Correct function calls: ${accurateCount}/${successCount} (${accuracyRate}%)`);

// Speed Comparison
console.log("\n⚡ SPEED COMPARISON");
console.log("-".repeat(70));
console.log(`Llama 4 Scout:     ${Math.round(avgTime)}ms`);
console.log(`Previous (8B):     ~8700ms`);
console.log(`Improvement:       ${((8700 - avgTime) / 8700 * 100).toFixed(1)}% faster`);
console.log(`Time Saved:        ${8700 - Math.round(avgTime)}ms per query`);

console.log("\n" + "=".repeat(70));
console.log("✅ TESTING COMPLETE");
console.log("=".repeat(70) + "\n");
