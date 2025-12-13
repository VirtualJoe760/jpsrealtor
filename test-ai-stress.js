// Stress test for AI chat with complex subdivision comparisons
const fs = require('fs');
const path = require('path');

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const stressTests = [
  {
    name: "Multi-Subdivision Comparison",
    query: "Compare PGA West, Trilogy, and La Quinta Resort in terms of price, amenities, and lifestyle. Show me listings from each.",
    expectedTools: ["search_properties", "compare_subdivisions", "get_subdivision_stats"],
    expectedComponents: ["carousel", "comparison"]
  },
  {
    name: "Complex Market Analysis",
    query: "What are the best subdivisions in La Quinta for families? Compare schools, parks, and prices. Show me 5 listings from each top subdivision.",
    expectedTools: ["search_properties", "get_subdivision_stats", "search_schools"],
    expectedComponents: ["carousel", "comparison"]
  },
  {
    name: "Multi-City Comparison",
    query: "Compare real estate in Palm Desert, Indian Wells, and La Quinta. What's the price difference? Show me luxury listings from each city.",
    expectedTools: ["search_properties", "get_city_stats", "compare_cities"],
    expectedComponents: ["carousel", "comparison", "appreciation"]
  },
  {
    name: "Investment Analysis",
    query: "Which subdivisions in the Coachella Valley have the best appreciation rates? Compare the top 3 and show me investment properties.",
    expectedTools: ["search_properties", "get_appreciation_data", "compare_subdivisions"],
    expectedComponents: ["carousel", "appreciation", "comparison"]
  },
  {
    name: "Very Long Query with Multiple Requests",
    query: "I'm looking to invest in La Quinta. First, show me the overall market stats. Then compare PGA West with Trilogy in terms of HOA fees, amenities, price ranges, and appreciation. After that, show me 10 listings under $1M in PGA West, and 10 listings in Trilogy between $500k-$800k. Also, what are the best schools in each area?",
    expectedTools: ["search_properties", "get_market_stats", "compare_subdivisions", "get_subdivision_stats", "search_schools"],
    expectedComponents: ["carousel", "comparison", "appreciation"]
  },
  {
    name: "Rapid-Fire Questions",
    query: "What's the average price in PGA West? How about Trilogy? La Quinta Resort? Madison Club? The Hideaway? Show me one listing from each.",
    expectedTools: ["search_properties", "get_subdivision_stats"],
    expectedComponents: ["carousel"]
  }
];

async function runTest(test, index) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST ${index + 1}/${stressTests.length}: ${test.name}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Query: ${test.query}`);
  console.log(`Expected Tools: ${test.expectedTools.join(', ')}`);
  console.log(`Expected Components: ${test.expectedComponents.join(', ')}`);
  console.log(`\nSending request...`);

  const startTime = Date.now();

  try {
    const response = await fetch(`${API_BASE}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: test.query }
        ],
        userId: 'stress-test-user'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    let fullResponse = '';
    let components = null;

    if (data.success && data.response) {
      fullResponse = data.response;
      components = data.components;
    } else if (data.error) {
      throw new Error(`API Error: ${data.error}`);
    }

    const duration = Date.now() - startTime;

    // Analyze response
    console.log(`\n✅ Test completed in ${duration}ms`);
    console.log(`\nResponse length: ${fullResponse.length} characters`);

    // Check for components
    if (components) {
      console.log(`\nComponents received:`);
      if (components.carousel) {
        console.log(`  - Carousel: ${components.carousel.listings?.length || 0} listings`);
      }
      if (components.comparison) {
        console.log(`  - Comparison data: YES`);
      }
      if (components.appreciation) {
        console.log(`  - Appreciation data: YES`);
      }
      if (components.mapView) {
        console.log(`  - Map view: YES (zoom: ${components.mapView.zoom})`);
      }
      if (components.articles) {
        console.log(`  - Articles: ${components.articles.length || 0} results`);
      }
    } else {
      console.log(`\n⚠️  No components detected`);
    }

    // Check for errors or issues
    const issues = [];

    if (fullResponse.includes('error') || fullResponse.includes('Error')) {
      issues.push('Response contains error messages');
    }

    if (fullResponse.length < 100) {
      issues.push('Response suspiciously short');
    }

    if (fullResponse.includes('undefined') || fullResponse.includes('null')) {
      issues.push('Response contains undefined/null values');
    }

    if (!components && test.expectedComponents.length > 0) {
      issues.push('Expected components not found');
    }

    if (issues.length > 0) {
      console.log(`\n⚠️  Issues detected:`);
      issues.forEach(issue => console.log(`  - ${issue}`));
    }

    // Save detailed results
    const logDir = path.join(__dirname, 'local-logs', 'chat-records');
    const logFile = path.join(logDir, `stress-test-${Date.now()}.json`);

    fs.writeFileSync(logFile, JSON.stringify({
      test: test.name,
      query: test.query,
      duration,
      responseLength: fullResponse.length,
      response: fullResponse,
      components,
      issues,
      timestamp: new Date().toISOString()
    }, null, 2));

    console.log(`\nLog saved to: ${logFile}`);

    // Brief preview of response
    console.log(`\nResponse preview (first 500 chars):`);
    console.log(fullResponse.substring(0, 500) + '...');

    return {
      success: true,
      issues: issues.length,
      duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`\n❌ Test FAILED after ${duration}ms`);
    console.log(`Error: ${error.message}`);
    console.log(error.stack);

    return {
      success: false,
      error: error.message,
      duration
    };
  }
}

async function main() {
  console.log(`Starting AI Stress Tests - ${new Date().toISOString()}`);
  console.log(`API Base: ${API_BASE}`);
  console.log(`Total tests: ${stressTests.length}`);

  const results = [];

  for (let i = 0; i < stressTests.length; i++) {
    const result = await runTest(stressTests[i], i);
    results.push(result);

    // Wait 2 seconds between tests to avoid overwhelming the server
    if (i < stressTests.length - 1) {
      console.log(`\nWaiting 2s before next test...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST SUMMARY`);
  console.log(`${'='.repeat(80)}`);

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalIssues = results.reduce((sum, r) => sum + (r.issues || 0), 0);
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  console.log(`Total tests: ${stressTests.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total issues detected: ${totalIssues}`);
  console.log(`Average duration: ${Math.round(avgDuration)}ms`);

  if (failed > 0) {
    console.log(`\n❌ ${failed} test(s) failed - review logs for details`);
    process.exit(1);
  } else if (totalIssues > 0) {
    console.log(`\n⚠️  All tests passed but ${totalIssues} issue(s) detected`);
  } else {
    console.log(`\n✅ All tests passed with no issues!`);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
