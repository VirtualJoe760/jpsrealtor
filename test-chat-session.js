// test-chat-session.js
// Comprehensive chat testing script to identify errors in multi-turn conversations

const BASE_URL = 'http://localhost:3000';

// Test scenarios with different tool combinations
const TEST_SCENARIOS = [
  {
    name: "Article Search Test",
    messages: [
      "What are energy costs like in Coachella Valley?",
      "How much does it cost to own a pool?",
      "Tell me about hidden costs of homeownership"
    ]
  },
  {
    name: "Property Search Test",
    messages: [
      "Show me homes in Palm Desert",
      "What about Indian Wells?",
      "Are there any in La Quinta under 500k?"
    ]
  },
  {
    name: "Analytics Test",
    messages: [
      "What's the appreciation in Indian Wells over 5 years?",
      "Compare Palm Desert to Indian Wells",
      "How has the market changed in La Quinta?"
    ]
  },
  {
    name: "Mixed Tool Test",
    messages: [
      "What are energy costs like?",  // Articles
      "Show me homes in Palm Desert",  // Property search
      "What's the appreciation there?", // Analytics
      "Tell me about HOA fees", // Articles
      "Any homes in Indian Wells?" // Property search
    ]
  },
  {
    name: "Complex Query Test",
    messages: [
      "I'm looking for a 3 bedroom home in Indian Wells Country Club",
      "What's been the price appreciation there?",
      "Show me similar homes in The Reserve",
      "Compare appreciation between those two neighborhoods",
      "What should I know about buying in a golf community?"
    ]
  }
];

async function sendChatMessage(messages, userId = 'test-user') {
  const response = await fetch(`${BASE_URL}/api/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      userId,
      userTier: 'premium'
    })
  });

  return await response.json();
}

async function runTestScenario(scenario, verbose = true) {
  console.log('\n' + '='.repeat(80));
  console.log(`🧪 Testing: ${scenario.name}`);
  console.log('='.repeat(80));

  const conversationHistory = [];
  let failedAt = null;
  let errorDetails = null;

  for (let i = 0; i < scenario.messages.length; i++) {
    const userMessage = scenario.messages[i];
    console.log(`\n📝 Turn ${i + 1}/${scenario.messages.length}: "${userMessage}"`);

    // Add user message to history
    conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    try {
      const startTime = Date.now();
      const result = await sendChatMessage(conversationHistory);
      const duration = Date.now() - startTime;

      if (result.success && result.response) {
        // Add assistant response to history
        conversationHistory.push({
          role: 'assistant',
          content: result.response
        });

        console.log(`✅ Success (${duration}ms)`);

        if (verbose) {
          // Show what tools were used
          if (result.components) {
            const components = [];
            if (result.components.carousel) components.push('Carousel');
            if (result.components.mapView) components.push('MapView');
            if (result.components.articles) components.push('Articles');
            if (result.components.appreciation) components.push('Appreciation');
            if (result.components.comparison) components.push('Comparison');
            if (result.components.sources) components.push(`Sources(${result.components.sources.length})`);

            if (components.length > 0) {
              console.log(`   📊 Components: ${components.join(', ')}`);
            }
          }

          // Show response preview
          const preview = result.response.substring(0, 100).replace(/\n/g, ' ');
          console.log(`   💬 Response: ${preview}${result.response.length > 100 ? '...' : ''}`);
        }
      } else {
        failedAt = i + 1;
        errorDetails = result.error || result.details || 'Unknown error';
        console.log(`❌ Failed: ${errorDetails}`);
        break;
      }
    } catch (error) {
      failedAt = i + 1;
      errorDetails = error.message;
      console.log(`❌ Exception: ${error.message}`);
      break;
    }

    // Small delay between messages
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n' + '-'.repeat(80));
  if (failedAt === null) {
    console.log(`✅ SUCCESS: All ${scenario.messages.length} messages processed successfully`);
  } else {
    console.log(`❌ FAILED at turn ${failedAt}/${scenario.messages.length}`);
    console.log(`   Error: ${errorDetails}`);
    console.log(`   Conversation history length: ${conversationHistory.length}`);
  }
  console.log('-'.repeat(80));

  return {
    scenarioName: scenario.name,
    success: failedAt === null,
    failedAt,
    errorDetails,
    totalMessages: scenario.messages.length,
    processedMessages: failedAt ? failedAt - 1 : scenario.messages.length
  };
}

async function runAllTests() {
  console.log('\n🚀 Starting Chat Session Tests...\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Total Scenarios: ${TEST_SCENARIOS.length}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const results = [];

  for (const scenario of TEST_SCENARIOS) {
    const result = await runTestScenario(scenario, true);
    results.push(result);

    // Delay between scenarios
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Final Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 FINAL TEST RESULTS');
  console.log('='.repeat(80));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);

  if (failed > 0) {
    console.log('\n⚠️  Failed Scenarios:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.scenarioName}: Failed at turn ${r.failedAt}/${r.totalMessages}`);
      console.log(`     Error: ${r.errorDetails}`);
    });
  }

  console.log('\n' + '='.repeat(80));

  // Exit code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
