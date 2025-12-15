// Test with limit like the debug logs showed (found 3 without filter)
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const unifiedSchema = new mongoose.Schema({}, {
  strict: false,
  collection: 'unified_listings'
});
const UnifiedListing = mongoose.model('UnifiedListingLimitTest', unifiedSchema);

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const baseQuery = {
      listPrice: { $exists: true, $ne: null, $gt: 0 },
      propertyType: { $ne: 'B' },
      city: /^Palm Desert$/i
    };

    console.log('Test 1: Base query with limit(3) - mimics debug log');
    const test1 = await UnifiedListing.find(baseQuery)
      .limit(3)
      .lean();
    console.log(`Found ${test1.length} listings`);
    if (test1.length > 0) {
      test1.forEach(l => {
        console.log(`  ${l.unparsedAddress} - ${l.onMarketDate}`);
      });
    }

    console.log('\nTest 2: Same query but limit(10)');
    const test2 = await UnifiedListing.find(baseQuery)
      .limit(10)
      .lean();
    console.log(`Found ${test2.length} listings\n`);

    console.log('Test 3: With date filter and limit(10)');
    const queryWithDate = {
      ...baseQuery,
      onMarketDate: { $gte: "2025-12-07T00:00:00Z" }
    };
    const test3 = await UnifiedListing.find(queryWithDate)
      .limit(10)
      .sort({ onMarketDate: -1 })
      .lean();
    console.log(`Found ${test3.length} listings`);
    if (test3.length > 0) {
      console.log('\n✅ These listings match the filter:');
      test3.forEach((l, i) => {
        console.log(`${i + 1}. ${l.unparsedAddress}`);
        console.log(`   On Market: ${l.onMarketDate}`);
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

test();
