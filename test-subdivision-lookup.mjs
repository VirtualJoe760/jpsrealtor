/**
 * Test Subdivision Lookup Integration
 *
 * This test verifies that the AI can:
 * 1. Recognize partial subdivision names (e.g., "the Vintage")
 * 2. Call lookupSubdivision to find the correct name
 * 3. Use the correct name to get appreciation data
 * 4. Compare two subdivisions when one has a partial name
 */

async function testSubdivisionLookup() {
  console.log("🧪 Testing Subdivision Lookup Integration\n");
  console.log("=" .repeat(60));

  // Test 1: Direct API test - Lookup "the Vintage"
  console.log("\n📍 Test 1: Direct API - Lookup 'the Vintage' in Indian Wells");
  console.log("-".repeat(60));

  try {
    const lookupUrl = "http://localhost:3000/api/analytics/subdivision-lookup?query=the%20Vintage&city=Indian%20Wells";
    console.log(`GET ${lookupUrl}`);

    const lookupResponse = await fetch(lookupUrl);
    const lookupData = await lookupResponse.json();

    console.log("\n✅ Lookup Result:");
    console.log(`   Query: "${lookupData.query}"`);
    console.log(`   Best Match: "${lookupData.bestMatch?.subdivisionName}"`);
    console.log(`   Match Score: ${lookupData.bestMatch?.matchScore} (${lookupData.bestMatch?.confidence} confidence)`);
    console.log(`   Active Listings: ${lookupData.bestMatch?.activeListings}`);

    if (lookupData.bestMatch?.subdivisionName) {
      // Test 2: Get appreciation for the found subdivision
      console.log("\n📊 Test 2: Get Appreciation for Found Subdivision");
      console.log("-".repeat(60));

      const appreciationUrl = `http://localhost:3000/api/analytics/appreciation?subdivision=${encodeURIComponent(lookupData.bestMatch.subdivisionName)}&period=5y`;
      console.log(`GET ${appreciationUrl}`);

      const appreciationResponse = await fetch(appreciationUrl);
      const appreciationData = await appreciationResponse.json();

      if (appreciationData.appreciation) {
        console.log("\n✅ Appreciation Data Found:");
        console.log(`   Subdivision: ${lookupData.bestMatch.subdivisionName}`);
        console.log(`   Annual Appreciation: ${appreciationData.appreciation.annual}%`);
        console.log(`   Cumulative (5y): ${appreciationData.appreciation.cumulative}%`);
        console.log(`   Trend: ${appreciationData.appreciation.trend}`);
        console.log(`   Median Price: $${appreciationData.marketData.startMedianPrice.toLocaleString()} → $${appreciationData.marketData.endMedianPrice.toLocaleString()}`);
        console.log(`   Total Sales: ${appreciationData.marketData.totalSales}`);
        console.log(`   Confidence: ${appreciationData.marketData.confidence}`);
      } else {
        console.log("\n❌ No appreciation data found");
      }
    }

    // Test 3: AI Chat Test - Compare with partial name
    console.log("\n\n🤖 Test 3: AI Chat - Compare 'Indian Wells Country Club' vs 'the Vintage'");
    console.log("-".repeat(60));

    const chatUrl = "http://localhost:3000/api/chat/stream";
    const chatPayload = {
      message: "Compare the appreciation between Indian Wells Country Club and the Vintage over the past 5 years",
      userId: "test-subdivision-lookup",
      userTier: "premium"
    };

    console.log(`POST ${chatUrl}`);
    console.log(`Message: "${chatPayload.message}"`);

    const startTime = Date.now();
    const chatResponse = await fetch(chatUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chatPayload)
    });

    const chatData = await chatResponse.json();
    const duration = Date.now() - startTime;

    if (chatData.error) {
      console.log("\n❌ AI Chat Error:");
      console.log(`   ${chatData.error}`);
      if (chatData.details) {
        console.log(`   Details: ${chatData.details}`);
      }
    } else {
      console.log("\n✅ AI Response Received:");
      console.log(`   Duration: ${duration}ms`);
      console.log(`   Response Length: ${chatData.message?.length || 0} characters`);

      // Check if comparison component exists
      if (chatData.components?.comparison) {
        console.log("\n✅ Comparison Component Found:");
        const comp = chatData.components.comparison;
        console.log(`   Location 1: ${comp.location1.name}`);
        console.log(`   - Annual: ${comp.location1.appreciation.annual}%`);
        console.log(`   - Cumulative: ${comp.location1.appreciation.cumulative}%`);
        console.log(`   Location 2: ${comp.location2.name}`);
        console.log(`   - Annual: ${comp.location2.appreciation.annual}%`);
        console.log(`   - Cumulative: ${comp.location2.appreciation.cumulative}%`);
        console.log(`   Winner: ${comp.winner || "Not specified"}`);
      }

      // Show first 300 chars of response
      if (chatData.message) {
        console.log("\n📝 AI Response (first 300 chars):");
        console.log(`   ${chatData.message.substring(0, 300)}...`);
      }
    }

  } catch (error) {
    console.error("\n❌ Test Failed:");
    console.error(`   ${error.message}`);
    console.error(`   ${error.stack}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Test Complete\n");
}

// Run the test
testSubdivisionLookup().catch(console.error);
