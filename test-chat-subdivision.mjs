#!/usr/bin/env node
/**
 * Test script to directly call the chat API and check subdivision search
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testChat() {
  console.log('\n🤖 Testing Chat API for Subdivision Search...\n');

  const messages = [
    {
      role: 'user',
      content: 'can you show me homes in palm desert country club'
    }
  ];

  try {
    console.log('📤 Sending request to /api/chat/stream...');
    const response = await fetch(`${BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages,
        userId: 'test-user-123'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log('\n✅ Response received!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 METADATA:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Model: ${data.metadata?.model}`);
    console.log(`Processing Time: ${data.metadata?.processingTime}ms`);
    console.log(`Iterations: ${data.metadata?.iterations}`);
    console.log(`Function Calls: ${data.metadata?.functionCalls?.length || 0}`);

    if (data.metadata?.functionCalls && data.metadata.functionCalls.length > 0) {
      console.log('\n📞 FUNCTION CALLS:');
      data.metadata.functionCalls.forEach((call, i) => {
        console.log(`\n  ${i + 1}. ${call.function}`);
        console.log(`     Arguments:`, JSON.stringify(call.arguments, null, 2).split('\n').join('\n     '));
        console.log(`     Result: ${call.result}`);
        if (call.data) {
          const preview = JSON.stringify(call.data).substring(0, 200);
          console.log(`     Data Preview: ${preview}...`);
        }
      });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💬 AI RESPONSE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(data.response);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check for success indicators
    const hasMatchLocation = data.metadata?.functionCalls?.some(c => c.function === 'matchLocation');
    const hasGetListings = data.metadata?.functionCalls?.some(c => c.function === 'getSubdivisionListings');
    const hasSlug = data.metadata?.functionCalls?.some(c =>
      c.function === 'getSubdivisionListings' && c.arguments?.slug
    );

    console.log('🔍 SUCCESS INDICATORS:');
    console.log(`  ✓ matchLocation called: ${hasMatchLocation ? '✅ YES' : '❌ NO'}`);
    console.log(`  ✓ getSubdivisionListings called: ${hasGetListings ? '✅ YES' : '❌ NO'}`);
    console.log(`  ✓ Slug parameter provided: ${hasSlug ? '✅ YES' : '❌ NO'}`);

    if (hasSlug) {
      const listingsCall = data.metadata.functionCalls.find(c => c.function === 'getSubdivisionListings');
      console.log(`  ℹ️  Slug used: "${listingsCall.arguments.slug}"\n`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testChat();
