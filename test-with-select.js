// Test with .select() to see if field selection is the issue
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const unifiedSchema = new mongoose.Schema({}, {
  strict: false,
  collection: 'unified_listings'
});
const UnifiedListing = mongoose.model('UnifiedListingSelectTest', unifiedSchema);

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const query = {
      listPrice: { $exists: true, $ne: null, $gt: 0 },
      propertyType: { $ne: 'B' },
      city: /^Palm Desert$/i,
      onMarketDate: { $gte: "2025-12-07T00:00:00Z" }
    };

    // Exact field selection from getFieldSelection()
    const fieldSelection = [
      'listingKey',
      'listPrice',
      'address',
      'city',
      'subdivisionName',
      'bedroomsTotal',
      'bedsTotal',
      'bathroomsTotalDecimal',
      'bathroomsTotalInteger',
      'livingArea',
      'lotSizeSqft',
      'yearBuilt',
      'daysOnMarket',
      'onMarketDate',
      'primaryPhotoUrl',
      'latitude',
      'longitude',
      'mlsSource',
      'propertyType',
      'propertySubType',
      'poolYn',
      'spaYn',
      'viewYn',
      'garageSpaces',
      'associationFee',
      'unparsedAddress',
      'postalCode',
      'slug',
    ].join(' ');

    console.log('Test 1: Without .select()');
    const results1 = await UnifiedListing.find(query)
      .limit(10)
      .skip(0)
      .sort({ onMarketDate: -1 })
      .lean();
    console.log(`Results: ${results1.length} listings\n`);

    console.log('Test 2: With .select() (exact field list from API)');
    const results2 = await UnifiedListing.find(query)
      .select(fieldSelection)
      .limit(10)
      .skip(0)
      .sort({ onMarketDate: -1 })
      .lean();
    console.log(`Results: ${results2.length} listings\n`);

    if (results2.length > 0) {
      console.log('✅ .select() works fine:');
      results2.slice(0, 3).forEach((l, i) => {
        console.log(`${i + 1}. ${l.unparsedAddress}`);
        console.log(`   On Market: ${l.onMarketDate}`);
      });
    } else {
      console.log('❌ .select() breaks the query somehow');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

test();
