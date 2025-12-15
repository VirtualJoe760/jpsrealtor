// Simple test: Does "2025-12-07T00:00:00Z" work for filtering?
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const unifiedSchema = new mongoose.Schema({}, {
  strict: false,
  collection: 'unified_listings'
});
const UnifiedListing = mongoose.model('UnifiedListingSimpleTest', unifiedSchema);

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Base query (what combineFilters creates)
    const baseQuery = {
      city: /^Palm Desert$/i,
      listPrice: { $exists: true, $ne: null, $gt: 0 },
      propertyType: { $ne: 'B' }
    };

    console.log('Test 1: Query WITHOUT date filter');
    const results1 = await UnifiedListing.find(baseQuery)
      .sort({ onMarketDate: -1 })
      .limit(5)
      .lean();
    console.log(`Found ${results1.length} listings`);
    if (results1.length > 0) {
      console.log('Most recent:');
      console.log(`  ${results1[0].unparsedAddress}`);
      console.log(`  onMarketDate: ${results1[0].onMarketDate}`);
      console.log(`  Type: ${typeof results1[0].onMarketDate}`);
    }

    console.log('\nTest 2: Query WITH date filter (string with timestamp)');
    const queryWithDate = {
      ...baseQuery,
      onMarketDate: { $gte: "2025-12-07T00:00:00Z" }
    };
    const results2 = await UnifiedListing.find(queryWithDate)
      .sort({ onMarketDate: -1 })
      .limit(5)
      .lean();
    console.log(`Found ${results2.length} listings`);
    if (results2.length > 0) {
      results2.forEach((l, i) => {
        console.log(`${i + 1}. ${l.unparsedAddress} - ${l.onMarketDate}`);
      });
    }

    console.log('\nTest 3: Query with .select() (what the API does)');
    const fieldSelection = [
      'listingKey',
      'listPrice',
      'address',
      'city',
      'subdivisionName',
      'unparsedAddress',
      'onMarketDate'
    ].join(' ');

    const results3 = await UnifiedListing.find(queryWithDate)
      .select(fieldSelection)
      .sort({ onMarketDate: -1 })
      .limit(5)
      .lean();
    console.log(`Found ${results3.length} listings`);
    if (results3.length > 0) {
      results3.forEach((l, i) => {
        console.log(`${i + 1}. ${l.unparsedAddress} - ${l.onMarketDate}`);
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
