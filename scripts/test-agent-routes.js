// scripts/test-agent-routes.js
// Test script for agent application API routes

const BASE_URL = 'http://localhost:3000';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testRoute(name, url, method = 'GET', body = null, expectedStatus = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    const statusMatch = expectedStatus ? response.status === expectedStatus : true;
    const statusColor = statusMatch ? colors.green : colors.red;

    log(`\n━━━ ${name} ━━━`, colors.blue);
    log(`URL: ${url}`);
    log(`Method: ${method}`);
    log(`Status: ${response.status}`, statusColor);
    log(`Response: ${JSON.stringify(data, null, 2)}`);

    if (expectedStatus && !statusMatch) {
      log(`❌ Expected status ${expectedStatus}, got ${response.status}`, colors.red);
      return false;
    }

    log(`✅ Test passed`, colors.green);
    return true;
  } catch (error) {
    log(`\n━━━ ${name} ━━━`, colors.blue);
    log(`❌ Error: ${error.message}`, colors.red);
    return false;
  }
}

async function runTests() {
  log('\n🚀 Starting Agent Application API Tests\n', colors.blue);
  log('═'.repeat(60), colors.blue);

  let passed = 0;
  let failed = 0;

  // Test 1: POST /api/agent/apply - Should return 401 without auth
  if (await testRoute(
    'Agent Apply - No Auth',
    `${BASE_URL}/api/agent/apply`,
    'POST',
    {
      licenseNumber: 'CA12345',
      licenseState: 'CA',
      mlsId: 'MLS123',
      mlsAssociation: 'California Association',
      brokerageName: 'Test Brokerage',
      brokerageAddress: '123 Main St',
      yearsExperience: 5,
      whyJoin: 'I want to join your team',
    },
    401
  )) {
    passed++;
  } else {
    failed++;
  }

  // Test 2: POST /api/agent/verify-identity - Should return 401 without auth
  if (await testRoute(
    'Verify Identity - No Auth',
    `${BASE_URL}/api/agent/verify-identity`,
    'POST',
    {},
    401
  )) {
    passed++;
  } else {
    failed++;
  }

  // Test 3: GET /api/admin/applications - Should return 401 without auth
  if (await testRoute(
    'List Applications - No Auth',
    `${BASE_URL}/api/admin/applications`,
    'GET',
    null,
    401
  )) {
    passed++;
  } else {
    failed++;
  }

  // Test 4: GET /api/admin/applications/[id] - Should return 401 without auth
  if (await testRoute(
    'Get Application - No Auth',
    `${BASE_URL}/api/admin/applications/507f1f77bcf86cd799439011`,
    'GET',
    null,
    401
  )) {
    passed++;
  } else {
    failed++;
  }

  // Test 5: PUT /api/admin/applications/[id]/review-phase1 - Should return 401 without auth
  if (await testRoute(
    'Review Phase 1 - No Auth',
    `${BASE_URL}/api/admin/applications/507f1f77bcf86cd799439011/review-phase1`,
    'PUT',
    { approved: true, reviewNotes: 'Test' },
    401
  )) {
    passed++;
  } else {
    failed++;
  }

  // Test 6: PUT /api/admin/applications/[id]/review-final - Should return 401 without auth
  if (await testRoute(
    'Review Final - No Auth',
    `${BASE_URL}/api/admin/applications/507f1f77bcf86cd799439011/review-final`,
    'PUT',
    { approved: true, teamId: '507f1f77bcf86cd799439011' },
    401
  )) {
    passed++;
  } else {
    failed++;
  }

  // Summary
  log('\n═'.repeat(60), colors.blue);
  log('\n📊 Test Summary', colors.blue);
  log(`✅ Passed: ${passed}`, colors.green);
  log(`❌ Failed: ${failed}`, failed > 0 ? colors.red : colors.green);
  log(`📝 Total: ${passed + failed}`, colors.blue);

  if (failed === 0) {
    log('\n🎉 All tests passed! Routes are properly configured.', colors.green);
  } else {
    log('\n⚠️  Some tests failed. Check the output above.', colors.yellow);
  }

  log('\n═'.repeat(60), colors.blue);
  log('\n✨ Next Steps:', colors.blue);
  log('1. Create frontend forms to test with actual authentication');
  log('2. Set up Stripe webhook endpoint');
  log('3. Create admin dashboard for reviewing applications');
  log('4. Build agent application form UI\n');
}

// Run tests
runTests().catch(console.error);
