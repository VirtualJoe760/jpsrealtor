// Test script to verify chat listing fix
// Run with: node scripts/test-chat-fix.mjs

async function testChatListings() {
  console.log('🧪 Testing Chat Listings Fix...\n');

  try {
    const response = await fetch('http://localhost:3000/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are a real estate assistant.',
          },
          {
            role: 'user',
            content: 'show me homes for sale in palm desert country club',
          },
        ],
        userId: 'test-user-fix',
        userTier: 'free',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    console.log('📊 Response Structure:');
    console.log('├─ success:', data.success);
    console.log('├─ response:', data.response?.substring(0, 50) + '...');
    console.log('├─ listings:', data.listings ? `Array(${data.listings.length})` : 'undefined');
    console.log('├─ metadata.functionCalls:', data.metadata?.functionCalls?.length || 0);
    console.log('└─ metadata.iterations:', data.metadata?.iterations);
    console.log('');

    if (data.listings && data.listings.length > 0) {
      console.log('✅ SUCCESS: Found', data.listings.length, 'listings in response');
      console.log('');
      console.log('📋 Sample Listing:');
      const sample = data.listings[0];
      console.log('├─ id:', sample.id);
      console.log('├─ price:', sample.price);
      console.log('├─ beds:', sample.beds);
      console.log('├─ baths:', sample.baths);
      console.log('├─ sqft:', sample.sqft);
      console.log('├─ address:', sample.address);
      console.log('├─ city:', sample.city);
      console.log('└─ subdivision:', sample.subdivision);
    } else if (data.metadata?.functionCalls) {
      console.log('⚠️  No listings in top-level response');
      console.log('🔍 Checking function call metadata...');

      const listingCalls = data.metadata.functionCalls.filter(
        (call) => call.function === 'getSubdivisionListings' || call.function === 'searchListings'
      );

      if (listingCalls.length > 0) {
        console.log('✅ Found listing function calls:', listingCalls.length);
        listingCalls.forEach((call, i) => {
          console.log(`\nFunction Call ${i + 1}:`);
          console.log('├─ function:', call.function);
          console.log('├─ result:', call.result);
          console.log('└─ has listings:', !!call.data?.listings);
          if (call.data?.listings) {
            console.log('   └─ count:', call.data.listings.length);
          }
        });
      } else {
        console.log('❌ No listing function calls found');
      }
    } else {
      console.log('❌ No listings found anywhere in response');
    }

    console.log('\n🔍 Full Metadata:');
    console.log(JSON.stringify(data.metadata, null, 2));

  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    process.exit(1);
  }
}

// Run test
testChatListings();
