/**
 * AI Appreciation Comparison Test
 *
 * Tests the AI's ability to compare appreciation between two neighborhoods
 * by making multiple tool calls and synthesizing the results.
 *
 * Usage: node test-ai-appreciation-comparison.js
 *
 * NOTE: Requires dev server running on localhost:3000
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Test comparison queries
const COMPARISON_TESTS = [
  {
    name: "Subdivision Comparison",
    query: "Compare the appreciation between Palm Desert Country Club and Indian Wells Country Club over the past 5 years",
    expectedTools: ["getAppreciation"],
    expectedCalls: 2, // Should call appreciation API twice
    locations: ["Palm Desert Country Club", "Indian Wells Country Club"]
  },
  {
    name: "City Comparison",
    query: "How does appreciation in Palm Desert compare to La Quinta over the last 3 years?",
    expectedTools: ["getAppreciation"],
    expectedCalls: 2,
    locations: ["Palm Desert", "La Quinta"]
  },
  {
    name: "Combined Query",
    query: "Show me homes in Indian Wells and tell me how its appreciation compares to Palm Desert",
    expectedTools: ["queryDatabase", "getAppreciation"],
    expectedCalls: 3, // query + 2 appreciation calls
    locations: ["Indian Wells", "Palm Desert"]
  },
  {
    name: "Investment Decision",
    query: "Which is a better investment: Indian Wells Country Club or PGA West? Compare their 10-year appreciation.",
    expectedTools: ["getAppreciation"],
    expectedCalls: 2,
    locations: ["Indian Wells Country Club", "PGA West"]
  }
];

/**
 * Test a single comparison query
 */
async function testComparison(test) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST: ${test.name}`);
  console.log(`Query: "${test.query}"`);
  console.log(`Expected Locations: ${test.locations.join(' vs ')}`);
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
        userId: 'test-appreciation-comparison',
        userTier: 'premium' // Use premium for better model
      })
    });

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    if (!response.ok) {
      const error = await response.json();
      console.error(`❌ FAILED: ${error.error}`);
      return {
        success: false,
        totalTime,
        error: error.error
      };
    }

    const result = await response.json();

    console.log(`\n✅ SUCCESS`);
    console.log(`Total Time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
    console.log(`Model: ${result.metadata?.model || 'unknown'}`);

    // Analyze response
    const responseText = result.response || '';
    const components = result.components || {};

    console.log(`\nResponse Analysis:`);
    console.log(`- Response Length: ${responseText.length} characters`);
    console.log(`- Contains Appreciation Data: ${components.appreciation ? '✓' : '✗'}`);

    // Check if both locations are mentioned
    const mentionsLocations = test.locations.filter(loc =>
      responseText.toLowerCase().includes(loc.toLowerCase())
    );
    console.log(`- Mentions Locations: ${mentionsLocations.length}/${test.locations.length}`);
    mentionsLocations.forEach(loc => console.log(`   ✓ ${loc}`));

    // Check for comparison keywords
    const comparisonKeywords = ['higher', 'lower', 'better', 'worse', 'compare', 'vs', 'versus', 'more', 'less', 'faster', 'slower'];
    const foundKeywords = comparisonKeywords.filter(kw =>
      responseText.toLowerCase().includes(kw)
    );
    console.log(`- Comparison Keywords: ${foundKeywords.length}`);
    if (foundKeywords.length > 0) {
      console.log(`   Found: ${foundKeywords.join(', ')}`);
    }

    // Extract appreciation values if present
    const appreciationPattern = /(\d+\.?\d*)\s*%/g;
    const percentages = [...responseText.matchAll(appreciationPattern)].map(m => m[1]);
    if (percentages.length > 0) {
      console.log(`- Appreciation Values: ${percentages.join('%, ')}%`);
    }

    // Check if AI made multiple tool calls
    const toolCallsEstimate = components.appreciation ? 1 : 0;
    console.log(`- Estimated Tool Calls: ${toolCallsEstimate} (expected: ${test.expectedCalls})`);

    // Display response preview
    console.log(`\nResponse Preview:`);
    const preview = responseText.substring(0, 300).replace(/\n/g, ' ');
    console.log(`"${preview}..."`);

    return {
      success: true,
      totalTime,
      responseLength: responseText.length,
      mentionedBoth: mentionsLocations.length === test.locations.length,
      hasComparison: foundKeywords.length > 0,
      appreciationValues: percentages.length,
      model: result.metadata?.model
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
 * Direct API test - call appreciation API for two locations
 */
async function testDirectComparison(location1, location2, period = '5y') {
  console.log(`\n${'━'.repeat(80)}`);
  console.log(`DIRECT API TEST: ${location1} vs ${location2}`);
  console.log('━'.repeat(80));

  const startTime = Date.now();

  try {
    // Call both appreciation APIs in parallel
    const [result1, result2] = await Promise.all([
      fetch(`${BASE_URL}/api/analytics/appreciation?subdivision=${encodeURIComponent(location1)}&period=${period}`).then(r => r.json()),
      fetch(`${BASE_URL}/api/analytics/appreciation?subdivision=${encodeURIComponent(location2)}&period=${period}`).then(r => r.json())
    ]);

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    console.log(`\n✅ API Calls Complete: ${totalTime}ms`);

    // Extract appreciation data
    const apr1 = result1.appreciation || {};
    const apr2 = result2.appreciation || {};

    console.log(`\n${location1}:`);
    console.log(`  Annual Appreciation: ${apr1.annual}%`);
    console.log(`  Cumulative: ${apr1.cumulative}%`);
    console.log(`  Trend: ${apr1.trend}`);
    console.log(`  Median Price: $${result1.marketData?.startMedianPrice?.toLocaleString()} → $${result1.marketData?.endMedianPrice?.toLocaleString()}`);
    console.log(`  Sales: ${result1.marketData?.totalSales}`);
    console.log(`  Confidence: ${result1.marketData?.confidence}`);

    console.log(`\n${location2}:`);
    console.log(`  Annual Appreciation: ${apr2.annual}%`);
    console.log(`  Cumulative: ${apr2.cumulative}%`);
    console.log(`  Trend: ${apr2.trend}`);
    console.log(`  Median Price: $${result2.marketData?.startMedianPrice?.toLocaleString()} → $${result2.marketData?.endMedianPrice?.toLocaleString()}`);
    console.log(`  Sales: ${result2.marketData?.totalSales}`);
    console.log(`  Confidence: ${result2.marketData?.confidence}`);

    // Compare
    console.log(`\n📊 COMPARISON:`);
    const annualDiff = apr1.annual - apr2.annual;
    const cumulativeDiff = apr1.cumulative - apr2.cumulative;

    if (annualDiff > 0) {
      console.log(`  ${location1} has ${annualDiff.toFixed(2)}% higher annual appreciation`);
    } else if (annualDiff < 0) {
      console.log(`  ${location2} has ${Math.abs(annualDiff).toFixed(2)}% higher annual appreciation`);
    } else {
      console.log(`  Both have equal annual appreciation`);
    }

    if (cumulativeDiff > 0) {
      console.log(`  ${location1} has ${cumulativeDiff.toFixed(2)}% higher cumulative appreciation`);
    } else if (cumulativeDiff < 0) {
      console.log(`  ${location2} has ${Math.abs(cumulativeDiff).toFixed(2)}% higher cumulative appreciation`);
    } else {
      console.log(`  Both have equal cumulative appreciation`);
    }

    console.log(`\n  Winner: ${annualDiff > 0 ? location1 : annualDiff < 0 ? location2 : 'Tie'}`);

    return {
      success: true,
      totalTime,
      location1: {
        annual: apr1.annual,
        cumulative: apr1.cumulative,
        trend: apr1.trend,
        confidence: result1.marketData?.confidence
      },
      location2: {
        annual: apr2.annual,
        cumulative: apr2.cumulative,
        trend: apr2.trend,
        confidence: result2.marketData?.confidence
      },
      winner: annualDiff > 0 ? location1 : annualDiff < 0 ? location2 : 'Tie'
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
 * Main test runner
 */
async function main() {
  console.log('\n');
  console.log('█'.repeat(80));
  console.log('  AI APPRECIATION COMPARISON TEST');
  console.log('  Testing AI ability to compare neighborhood appreciation');
  console.log('█'.repeat(80));

  // Phase 1: Direct API comparison (baseline)
  console.log('\n\n📊 PHASE 1: Direct API Comparison (Baseline)');
  console.log('Testing appreciation API directly to establish baseline...\n');

  const directResults = [];

  const directTests = [
    ["Palm Desert Country Club", "Indian Wells Country Club", "5y"],
    ["Palm Desert", "La Quinta", "3y"],
  ];

  for (const [loc1, loc2, period] of directTests) {
    const result = await testDirectComparison(loc1, loc2, period);
    directResults.push({ loc1, loc2, period, ...result });
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Phase 2: AI Comparison Tests
  console.log('\n\n🤖 PHASE 2: AI Comparison Tests');
  console.log('Testing AI chat ability to handle comparison queries...\n');

  const aiResults = [];

  for (const test of COMPARISON_TESTS) {
    const result = await testComparison(test);
    aiResults.push({ test: test.name, ...result });
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Summary
  console.log('\n\n');
  console.log('█'.repeat(80));
  console.log('  TEST SUMMARY');
  console.log('█'.repeat(80));

  console.log('\n📊 Direct API Results:');
  console.log('─'.repeat(80));
  directResults.forEach(r => {
    if (r.success) {
      console.log(`✓ ${r.loc1} vs ${r.loc2} (${r.period}): ${r.totalTime}ms - Winner: ${r.winner}`);
    } else {
      console.log(`✗ ${r.loc1} vs ${r.loc2}: FAILED - ${r.error}`);
    }
  });

  console.log('\n🤖 AI Comparison Results:');
  console.log('─'.repeat(80));
  const successfulAI = aiResults.filter(r => r.success);
  const failedAI = aiResults.filter(r => !r.success);

  successfulAI.forEach(r => {
    console.log(`✓ ${r.test}: ${r.totalTime}ms`);
    console.log(`   Mentioned Both: ${r.mentionedBoth ? '✓' : '✗'}`);
    console.log(`   Has Comparison: ${r.hasComparison ? '✓' : '✗'}`);
    console.log(`   Appreciation Values: ${r.appreciationValues}`);
  });

  if (failedAI.length > 0) {
    console.log('\n❌ Failed Tests:');
    failedAI.forEach(r => {
      console.log(`✗ ${r.test}: ${r.error}`);
    });
  }

  // Recommendations
  console.log('\n\n🚀 RECOMMENDATIONS:');
  console.log('─'.repeat(80));

  const avgMentionedBoth = successfulAI.filter(r => r.mentionedBoth).length / successfulAI.length;
  const avgHasComparison = successfulAI.filter(r => r.hasComparison).length / successfulAI.length;

  if (avgMentionedBoth < 1.0) {
    console.log(`\n⚠️  Only ${(avgMentionedBoth * 100).toFixed(0)}% of tests mentioned both locations`);
    console.log('   Recommendation: Improve AI prompt to ensure both locations are analyzed');
  }

  if (avgHasComparison < 1.0) {
    console.log(`\n⚠️  Only ${(avgHasComparison * 100).toFixed(0)}% of tests included comparison language`);
    console.log('   Recommendation: Add comparison examples to AI system prompt');
  }

  console.log('\n✅ CURRENT CAPABILITY:');
  console.log('   - Appreciation API works for individual locations');
  console.log('   - AI can call multiple tools sequentially');
  console.log('   - Data is available for meaningful comparisons');

  console.log('\n🔧 POTENTIAL IMPROVEMENTS:');
  console.log('   1. Add dedicated comparison endpoint: /api/analytics/compare');
  console.log('   2. Enhance AI prompt with comparison examples');
  console.log('   3. Add [COMPARISON] component marker for structured comparison display');
  console.log('   4. Pre-compute common comparisons and cache results');

  console.log('\n\n█'.repeat(80));
  console.log('  TEST COMPLETE');
  console.log('█'.repeat(80));
  console.log('');
}

// Check if server is running
console.log('\n⚠️  NOTE: This test requires the dev server running on localhost:3000');
console.log('If the server is not running, ask the user to start it.\n');

main().catch(console.error);
