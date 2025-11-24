#!/usr/bin/env node
/**
 * Test Chat with Subdivision Query
 *
 * This script tests the chat API with a subdivision query to verify
 * that the function calling system works correctly with simplified slugs.
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'http://localhost:3000';
const LOG_DIR = path.join(__dirname, '../local-logs/chat-records');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

async function testChatQuery(query) {
  console.log(`\n🧪 Testing chat query: "${query}"\n`);

  const requestBody = {
    messages: [
      { role: 'user', content: query }
    ],
    userId: 'test-user-' + Date.now(),
    userTier: 'free'
  };

  console.log('📤 Sending request to /api/chat/stream...');

  const startTime = Date.now();

  try {
    const response = await fetch(`${API_BASE}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }

    const data = await response.json();

    // Log the full response
    const logFile = path.join(LOG_DIR, `chat-test-${Date.now()}.json`);
    fs.writeFileSync(logFile, JSON.stringify(data, null, 2));
    console.log(`📝 Full response logged to: ${logFile}\n`);

    // Display summary
    console.log('=' .repeat(80));
    console.log('📊 RESPONSE SUMMARY');
    console.log('='.repeat(80));
    console.log(`Response Time: ${responseTime}ms`);
    console.log(`Model: ${data.metadata?.model || 'unknown'}`);
    console.log(`Iterations: ${data.metadata?.iterations || 0}`);
    console.log(`Function Calls: ${data.metadata?.functionCalls?.length || 0}\n`);

    if (data.metadata?.functionCalls && data.metadata.functionCalls.length > 0) {
      console.log('🔧 Function Calls Made:');
      data.metadata.functionCalls.forEach((call, i) => {
        console.log(`\n${i + 1}. ${call.function}`);
        console.log(`   Arguments:`, JSON.stringify(call.arguments, null, 2).split('\n').join('\n   '));
        console.log(`   Result: ${call.result}`);
        if (call.data) {
          console.log(`   Data Preview:`, JSON.stringify(call.data, null, 2).substring(0, 200) + '...');
        }
      });
      console.log();
    }

    console.log('💬 AI Response:');
    console.log('-'.repeat(80));
    console.log(data.response || 'No response');
    console.log('-'.repeat(80) + '\n');

    // Analyze if subdivision listings were returned
    if (data.metadata?.functionCalls) {
      const subdivisionListingCalls = data.metadata.functionCalls.filter(
        call => call.function === 'getSubdivisionListings'
      );

      if (subdivisionListingCalls.length > 0) {
        console.log('✅ SUCCESS: getSubdivisionListings was called');
        subdivisionListingCalls.forEach(call => {
          console.log(`   Slug used: "${call.arguments.slug}"`);
          if (call.data && call.data.listings) {
            console.log(`   Listings returned: ${call.data.listings.length}`);
          }
        });
      } else {
        console.log('⚠️  WARNING: getSubdivisionListings was NOT called');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Test queries
const testQueries = [
  'Show me homes for sale in Palm Desert Country Club',
  'What listings are available in Palm Desert Country Club?',
  'Find properties in PDCC Palm Desert'
];

console.log('🚀 Chat Subdivision Query Test');
console.log('='.repeat(80));

// Run first test query
testChatQuery(testQueries[0]).then(() => {
  console.log('\n✨ Test complete!\n');
  console.log('💡 To test other queries, run:');
  testQueries.forEach((q, i) => {
    if (i > 0) {
      console.log(`   node scripts/test-chat-subdivision.mjs "${q}"`);
    }
  });
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
