#!/usr/bin/env node
// Complete chat UI test - verifies API response, listings extraction, and UI component data

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const TEST_USER_ID = 'test-user-ui-verification';
const API_BASE = 'http://localhost:3000';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

async function testChatComplete(query) {
  console.log(`\n${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}Testing Complete Chat Flow${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  console.log(`${colors.bright}User Query:${colors.reset} "${query}"\n`);

  const startTime = Date.now();

  try {
    // 1. Call Chat API
    console.log(`${colors.blue}Step 1: Calling Chat API...${colors.reset}`);
    const response = await fetch(`${API_BASE}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: query }],
        userId: TEST_USER_ID,
        userTier: 'free',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.error || 'Unknown error'}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    console.log(`${colors.green}✓ API Response received in ${responseTime}ms${colors.reset}\n`);

    // 2. Verify Response Structure
    console.log(`${colors.blue}Step 2: Verifying Response Structure...${colors.reset}`);
    const checks = [
      { name: 'Has response text', value: !!data.response },
      { name: 'Has metadata', value: !!data.metadata },
      { name: 'Has function calls', value: data.metadata?.functionCalls?.length > 0 },
    ];

    checks.forEach(check => {
      const icon = check.value ? colors.green + '✓' : colors.red + '✗';
      console.log(`${icon} ${check.name}${colors.reset}`);
    });

    // 3. Analyze Function Calls
    console.log(`\n${colors.blue}Step 3: Analyzing Function Calls...${colors.reset}`);
    if (data.metadata?.functionCalls) {
      console.log(`${colors.bright}Total Iterations:${colors.reset} ${data.metadata.iterations}`);
      console.log(`${colors.bright}Function Calls Made:${colors.reset} ${data.metadata.functionCalls.length}\n`);

      data.metadata.functionCalls.forEach((call, idx) => {
        console.log(`${colors.cyan}Function ${idx + 1}:${colors.reset} ${call.function}`);
        console.log(`  Arguments:`, JSON.stringify(call.arguments, null, 2).split('\n').map((line, i) => i === 0 ? line : '            ' + line).join('\n'));
        console.log(`  Result: ${call.result === 'success' ? colors.green + 'SUCCESS' : colors.red + 'ERROR'}${colors.reset}`);

        if (call.data?.listings) {
          console.log(`  ${colors.bright}Listings Found:${colors.reset} ${call.data.listings.length}`);
        }
        console.log('');
      });
    }

    // 4. Extract Listings (mimicking IntegratedChatWidget.tsx logic)
    console.log(`${colors.blue}Step 4: Extracting Listings (Client-Side Logic)...${colors.reset}`);
    let listings = null;

    if (data.metadata?.functionCalls) {
      const listingCalls = data.metadata.functionCalls.filter(
        call => call.function === 'getSubdivisionListings' || call.function === 'searchListings'
      );

      if (listingCalls.length > 0 && listingCalls[0].data?.listings) {
        listings = listingCalls[0].data.listings;
        console.log(`${colors.green}✓ Extracted ${listings.length} listings from ${listingCalls[0].function}${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠ No listings found in function calls${colors.reset}`);
      }
    } else {
      console.log(`${colors.red}✗ No function calls in metadata${colors.reset}`);
    }

    // 5. Verify UI Component Data
    console.log(`\n${colors.blue}Step 5: Verifying UI Component Data...${colors.reset}`);

    // Check if listings have required fields for map markers
    if (listings && listings.length > 0) {
      const sampleListing = listings[0];
      const requiredFields = [
        { name: 'Coordinates', check: sampleListing.latitude && sampleListing.longitude },
        { name: 'Address', check: sampleListing.address || sampleListing.unparsedAddress },
        { name: 'Price', check: sampleListing.listPrice },
        { name: 'Property Type', check: sampleListing.propertyType || sampleListing.propertySubType },
      ];

      console.log(`${colors.bright}Sample Listing (for Map Marker):${colors.reset}`);
      requiredFields.forEach(field => {
        const icon = field.check ? colors.green + '✓' : colors.red + '✗';
        console.log(`${icon} ${field.name}${colors.reset}`);
      });

      // Show sample data
      console.log(`\n${colors.bright}Sample Listing Data:${colors.reset}`);
      console.log(`  Address: ${sampleListing.address || sampleListing.unparsedAddress}`);
      console.log(`  Price: $${sampleListing.listPrice?.toLocaleString()}`);
      console.log(`  Coordinates: ${sampleListing.latitude}, ${sampleListing.longitude}`);
      console.log(`  Beds/Baths: ${sampleListing.bedroomsTotal || 'N/A'} / ${sampleListing.bathroomsTotalDecimal || sampleListing.bathroomsTotalInteger || 'N/A'}`);
    } else {
      console.log(`${colors.red}✗ No listings available for UI components${colors.reset}`);
    }

    // 6. Message Object Structure (as would be added to chat)
    console.log(`\n${colors.blue}Step 6: Building Message Object (IntegratedChatWidget format)...${colors.reset}`);
    const messageObject = {
      role: 'assistant',
      content: data.response,
      listings: listings,
      timestamp: new Date().toISOString(),
    };

    console.log(`${colors.bright}Message Object:${colors.reset}`);
    console.log(JSON.stringify({
      role: messageObject.role,
      content: messageObject.content.substring(0, 100) + (messageObject.content.length > 100 ? '...' : ''),
      listingsCount: messageObject.listings?.length || 0,
      timestamp: messageObject.timestamp,
    }, null, 2));

    // 7. Final Summary
    console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bright}${colors.green}Test Summary${colors.reset}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

    const summary = [
      { label: 'Response Time', value: `${responseTime}ms`, status: responseTime < 3000 ? 'success' : 'warning' },
      { label: 'AI Response', value: data.response, status: 'info' },
      { label: 'Listings Extracted', value: listings?.length || 0, status: listings ? 'success' : 'error' },
      { label: 'Function Calls', value: data.metadata?.functionCalls?.length || 0, status: 'info' },
      { label: 'Iterations', value: data.metadata?.iterations || 0, status: 'info' },
    ];

    summary.forEach(item => {
      let color = colors.reset;
      if (item.status === 'success') color = colors.green;
      if (item.status === 'error') color = colors.red;
      if (item.status === 'warning') color = colors.yellow;
      if (item.status === 'info') color = colors.blue;

      console.log(`${colors.bright}${item.label}:${colors.reset} ${color}${item.value}${colors.reset}`);
    });

    // 8. UI Component Readiness Check
    console.log(`\n${colors.bright}UI Component Readiness:${colors.reset}`);
    const uiChecks = [
      { component: 'Chat Message', ready: !!data.response, reason: data.response ? 'Response text available' : 'No response text' },
      { component: 'Map Markers', ready: !!listings && listings.length > 0, reason: listings ? `${listings.length} listings with coordinates` : 'No listings extracted' },
      { component: 'Property Panels', ready: !!listings && listings.length > 0, reason: listings ? `${listings.length} listings available` : 'No listings extracted' },
      { component: 'Search Results State', ready: !!listings, reason: listings ? 'setSearchResults() can be called' : 'No listings to pass to state' },
    ];

    uiChecks.forEach(check => {
      const icon = check.ready ? colors.green + '✓' : colors.red + '✗';
      console.log(`${icon} ${check.component}: ${colors.bright}${check.ready ? 'READY' : 'NOT READY'}${colors.reset}`);
      console.log(`   Reason: ${check.reason}`);
    });

    // 9. Expected UI Behavior
    console.log(`\n${colors.bright}Expected UI Behavior:${colors.reset}`);
    if (listings && listings.length > 0) {
      console.log(`${colors.green}✓${colors.reset} Chat message appears: "${data.response}"`);
      console.log(`${colors.green}✓${colors.reset} Map view updates with ${listings.length} property markers`);
      console.log(`${colors.green}✓${colors.reset} Property panels populate with listing cards`);
      console.log(`${colors.green}✓${colors.reset} User can click markers to view property details`);
    } else {
      console.log(`${colors.red}✗${colors.reset} UI components will not populate (no listings extracted)`);
    }

    // Save test results
    const logDir = path.join(process.cwd(), 'local-logs', 'chat-ui-tests');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, `test-${Date.now()}.json`);
    fs.writeFileSync(logFile, JSON.stringify({
      query,
      responseTime,
      response: data.response,
      listingsCount: listings?.length || 0,
      functionCalls: data.metadata?.functionCalls || [],
      iterations: data.metadata?.iterations || 0,
      messageObject,
      uiReadiness: uiChecks,
      timestamp: new Date().toISOString(),
    }, null, 2));

    console.log(`\n${colors.blue}Test results saved to: ${logFile}${colors.reset}`);

    return { success: true, listings, responseTime };

  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}Test Failed:${colors.reset} ${error.message}`);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

// Run the test
const query = process.argv[2] || 'show me homes in palm desert country club';
testChatComplete(query);
