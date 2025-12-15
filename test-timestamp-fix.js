// Test if timestamp is being appended correctly
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const unifiedSchema = new mongoose.Schema({}, {
  strict: false,
  collection: 'unified_listings'
});
const UnifiedListing = mongoose.model('UnifiedListingTimestampTest', unifiedSchema);

async function testTimestampFix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const city = "Palm Desert";

    // Test 1: Without timestamp (what we were doing before)
    const queryWithoutTimestamp = {
      city: /^Palm Desert$/i,
      listPrice: { $exists: true, $ne: null, $gt: 0 },
      propertyType: { $ne: 'B' },
      onMarketDate: { $gte: "2025-12-07" }
    };

    console.log('Test 1: Query WITHOUT timestamp');
    console.log(JSON.stringify(queryWithoutTimestamp, null, 2));
    const results1 = await UnifiedListing.find(queryWithoutTimestamp).limit(5).lean();
    console.log(`Results: ${results1.length} listings\n`);

    // Test 2: With timestamp (the fix)
    const queryWithTimestamp = {
      city: /^Palm Desert$/i,
      listPrice: { $exists: true, $ne: null, $gt: 0 },
      propertyType: { $ne: 'B' },
      onMarketDate: { $gte: "2025-12-07T00:00:00Z" }
    };

    console.log('Test 2: Query WITH timestamp');
    console.log(JSON.stringify(queryWithTimestamp, null, 2));
    const results2 = await UnifiedListing.find(queryWithTimestamp).limit(5).lean();
    console.log(`Results: ${results2.length} listings\n`);

    if (results2.length > 0) {
      console.log('✅ Timestamp fix WORKS! Sample listings:');
      results2.forEach((l, i) => {
        console.log(`${i + 1}. ${l.unparsedAddress}`);
        console.log(`   Price: $${l.listPrice?.toLocaleString()}`);
        console.log(`   On Market: ${l.onMarketDate}`);
      });
    } else {
      console.log('❌ Still not working. Need to investigate further.');

      // Check what dates we have
      const recentListings = await UnifiedListing.find({
        city: /^Palm Desert$/i,
        listPrice: { $exists: true, $ne: null, $gt: 0 },
        propertyType: { $ne: 'B' }
      })
      .sort({ onMarketDate: -1 })
      .limit(5)
      .lean();

      console.log('\nMost recent listings in Palm Desert:');
      recentListings.forEach((l, i) => {
        console.log(`${i + 1}. ${l.onMarketDate} - ${l.unparsedAddress}`);
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testTimestampFix();
