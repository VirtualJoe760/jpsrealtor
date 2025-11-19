// Chat UX Testing Script
// Tests chat functionality for home searching by type, attributes, location, and subdivision

const BASE_URL = 'http://localhost:3000';

// Test user ID
const TEST_USER_ID = `test_user_${Date.now()}`;
const TEST_SESSION_ID = `test_session_${Date.now()}`;

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(`  ${title}`, 'cyan');
  console.log('='.repeat(80) + '\n');
}

// Test scenarios
const testScenarios = [
  {
    name: 'Search by Location - Palm Desert',
    userMessage: 'Show me homes in Palm Desert',
    expectedParams: { cities: ['Palm Desert'] },
    category: 'location'
  },
  {
    name: 'Search by Attributes - 3 bed, 2 bath with pool',
    userMessage: 'I want a 3 bedroom 2 bathroom home with a pool',
    expectedParams: { minBeds: 3, minBaths: 2, hasPool: true },
    category: 'attributes'
  },
  {
    name: 'Search by Price Range',
    userMessage: 'Show me properties under $800,000',
    expectedParams: { maxPrice: 800000 },
    category: 'attributes'
  },
  {
    name: 'Search by Multiple Cities',
    userMessage: 'Find homes in Palm Springs or Rancho Mirage',
    expectedParams: { cities: ['Palm Springs', 'Rancho Mirage'] },
    category: 'location'
  },
  {
    name: 'Search by Luxury Features',
    userMessage: 'Looking for a 4+ bedroom home with mountain views under $1.5M',
    expectedParams: { minBeds: 4, hasView: true, maxPrice: 1500000 },
    category: 'attributes'
  },
  {
    name: 'Search by Square Footage',
    userMessage: 'Show me homes over 2500 square feet',
    expectedParams: { minSqft: 2500 },
    category: 'attributes'
  },
  {
    name: 'Search by Subdivision - PGA West',
    userMessage: 'Do you have any homes in PGA West?',
    expectedParams: { subdivision: 'PGA West' },
    category: 'subdivision'
  },
  {
    name: 'Search by Property Type - Condo',
    userMessage: 'Show me condos in Indian Wells',
    expectedParams: { cities: ['Indian Wells'], propertyType: 'condo' },
    category: 'type'
  }
];

// Test MLS Search API
async function testMLSSearch(params, testName) {
  try {
    log(`\nTesting: ${testName}`, 'blue');
    log(`  Params: ${JSON.stringify(params, null, 2)}`, 'yellow');

    const response = await fetch(`${BASE_URL}/api/chat/search-listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    const data = await response.json();

    if (data.success) {
      log(`  ✓ Search successful! Found ${data.count} listings`, 'green');

      // Check data quality
      if (data.listings && data.listings.length > 0) {
        const firstListing = data.listings[0];

        // Check for required fields
        const requiredFields = ['ListPrice', 'UnparsedAddress', 'City', 'BedsTotal', 'BathroomsTotalInteger'];
        const missingFields = requiredFields.filter(field => !firstListing[field]);

        if (missingFields.length > 0) {
          log(`  ⚠ Warning: Missing fields in listing: ${missingFields.join(', ')}`, 'yellow');
        }

        // Check for photos
        if (firstListing.photos && firstListing.photos.length > 0) {
          log(`  ✓ Photos available: ${firstListing.photos.length} photos`, 'green');
        } else {
          log(`  ⚠ Warning: No photos found`, 'yellow');
        }

        // Sample listing info
        log(`  Sample Listing:`, 'cyan');
        log(`    Address: ${firstListing.UnparsedAddress}`, 'reset');
        log(`    Price: $${firstListing.ListPrice?.toLocaleString()}`, 'reset');
        log(`    Beds: ${firstListing.BedsTotal}, Baths: ${firstListing.BathroomsTotalInteger}`, 'reset');
        log(`    Sqft: ${firstListing.LivingArea?.toLocaleString()}`, 'reset');
      }

      return { success: true, count: data.count, data };
    } else {
      log(`  ✗ Search failed: ${data.error}`, 'red');
      return { success: false, error: data.error };
    }
  } catch (error) {
    log(`  ✗ Error: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

// Test chat logging
async function testChatLogging(role, content, metadata = {}) {
  try {
    const response = await fetch(`${BASE_URL}/api/chat/log-local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role,
        content,
        userId: TEST_USER_ID,
        metadata: {
          ...metadata,
          testRun: true,
          timestamp: new Date().toISOString()
        }
      })
    });

    const data = await response.json();

    if (data.success) {
      log(`  ✓ Message logged (count: ${data.messageCount})`, 'green');
      return true;
    } else {
      log(`  ✗ Logging failed: ${data.error}`, 'red');
      return false;
    }
  } catch (error) {
    log(`  ✗ Logging error: ${error.message}`, 'red');
    return false;
  }
}

// Run all tests
async function runAllTests() {
  logSection('CHAT UX TESTING - HOME SEARCH FUNCTIONALITY');

  log('Test User ID: ' + TEST_USER_ID, 'cyan');
  log('Test Session ID: ' + TEST_SESSION_ID, 'cyan');

  const results = {
    total: testScenarios.length,
    passed: 0,
    failed: 0,
    byCategory: {
      location: { total: 0, passed: 0 },
      attributes: { total: 0, passed: 0 },
      subdivision: { total: 0, passed: 0 },
      type: { total: 0, passed: 0 }
    },
    issues: []
  };

  for (const scenario of testScenarios) {
    logSection(scenario.name);

    // Log user message
    await testChatLogging('user', scenario.userMessage, {
      testScenario: scenario.name,
      category: scenario.category
    });

    // Test the search
    const result = await testMLSSearch(scenario.expectedParams, scenario.name);

    // Update results
    results.byCategory[scenario.category].total++;

    if (result.success) {
      results.passed++;
      results.byCategory[scenario.category].passed++;

      // Log assistant response
      await testChatLogging('assistant',
        `Found ${result.count} properties matching your criteria.`,
        {
          testScenario: scenario.name,
          category: scenario.category,
          resultsCount: result.count
        }
      );

      // Check for quality issues
      if (result.count === 0) {
        results.issues.push({
          scenario: scenario.name,
          issue: 'No listings returned',
          severity: 'medium'
        });
      }
    } else {
      results.failed++;
      results.issues.push({
        scenario: scenario.name,
        issue: result.error,
        severity: 'high'
      });

      await testChatLogging('system',
        `Test failed: ${result.error}`,
        {
          testScenario: scenario.name,
          category: scenario.category,
          error: result.error
        }
      );
    }

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary Report
  logSection('TEST RESULTS SUMMARY');

  log(`Total Tests: ${results.total}`, 'cyan');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');

  console.log('\nResults by Category:');
  for (const [category, stats] of Object.entries(results.byCategory)) {
    const passRate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : 0;
    log(`  ${category}: ${stats.passed}/${stats.total} (${passRate}%)`,
      stats.passed === stats.total ? 'green' : 'yellow');
  }

  if (results.issues.length > 0) {
    logSection('ISSUES FOUND');
    results.issues.forEach((issue, index) => {
      const color = issue.severity === 'high' ? 'red' : 'yellow';
      log(`${index + 1}. [${issue.severity.toUpperCase()}] ${issue.scenario}`, color);
      log(`   ${issue.issue}`, 'reset');
    });
  }

  logSection('UX RECOMMENDATIONS');

  // Generate UX recommendations based on results
  const recommendations = [];

  if (results.failed > 0) {
    recommendations.push('• Fix failed search scenarios to ensure all search types work correctly');
  }

  if (results.issues.some(i => i.issue.includes('No listings'))) {
    recommendations.push('• Review search parameters - some queries return no results');
    recommendations.push('• Consider adding "no results" handling with suggestions');
  }

  recommendations.push('• Verify all listing photos are loading correctly');
  recommendations.push('• Test carousel navigation and ensure smooth scrolling');
  recommendations.push('• Confirm all listing details (price, beds, baths) display properly');
  recommendations.push('• Test map integration with listing pins');
  recommendations.push('• Verify buttons are clickable and navigate to correct pages');

  recommendations.forEach(rec => log(rec, 'cyan'));

  log('\n✅ Testing complete! Check local-logs/chat-records/ for detailed logs.', 'green');
}

// Run the tests
runAllTests().catch(console.error);
