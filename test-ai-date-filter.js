// Test script to verify AI properly uses listedAfter filter for "new listings" queries
// This checks if the AI includes the correct date filter when users ask for new listings

const fetch = require('node-fetch');

async function testAIDateFilter() {
  console.log('🧪 Testing AI date filtering for "new listings" queries...\n');

  const testQueries = [
    "show me new listings in Palm Desert",
    "what are the latest homes in La Quinta",
    "show me recent properties in Indian Wells"
  ];

  for (const query of testQueries) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📝 Query: "${query}"`);
    console.log('='.repeat(80));

    try {
      const response = await fetch('http://localhost:3000/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test-date-filter',
          userTier: 'premium',
          messages: [{ role: 'user', content: query }]
        })
      });

      const text = await response.text();

      // Look for tool call with listedAfter parameter
      const toolCallMatch = text.match(/"name":"queryDatabase"[^}]*"arguments":"([^"]+)"/);

      if (toolCallMatch) {
        const argsStr = toolCallMatch[1].replace(/\\"/g, '"');
        console.log('\n✅ AI made queryDatabase call:');

        try {
          const args = JSON.parse(argsStr);
          console.log(JSON.stringify(args, null, 2));

          if (args.listedAfter) {
            console.log(`\n✅ SUCCESS: listedAfter filter included with date: ${args.listedAfter}`);

            // Verify it's a recent date (within last 30 days)
            const filterDate = new Date(args.listedAfter);
            const daysDiff = Math.floor((Date.now() - filterDate.getTime()) / (1000 * 60 * 60 * 24));

            if (daysDiff >= 0 && daysDiff <= 30) {
              console.log(`✅ Date is ${daysDiff} days ago (valid range)`);
            } else {
              console.log(`⚠️  WARNING: Date is ${daysDiff} days ago (outside expected range)`);
            }
          } else {
            console.log('\n❌ FAIL: No listedAfter filter found in arguments');
          }
        } catch (e) {
          console.log('❌ Could not parse arguments:', argsStr);
        }
      } else {
        console.log('\n❌ FAIL: No queryDatabase tool call found in response');
      }

    } catch (error) {
      console.error('❌ Error:', error.message);
    }

    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n' + '='.repeat(80));
  console.log('🏁 Test complete!');
  console.log('='.repeat(80));
}

// Run the test
testAIDateFilter();
