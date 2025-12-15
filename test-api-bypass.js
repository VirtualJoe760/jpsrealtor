// Test by directly calling getActiveListingsByCity
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const unifiedSchema = new mongoose.Schema({}, {
  strict: false,
  collection: 'unified_listings'
});
const UnifiedListing = mongoose.model('UnifiedListingAPIBypass', unifiedSchema);

// Manually build the query exactly as combineFilters should
function buildTestQuery(city, listedAfter) {
  return {
    // Base query
    listPrice: { $exists: true, $ne: null, $gt: 0 },
    propertyType: { $ne: 'B' },

    // Location
    city: new RegExp(`^${city}$`, 'i'),

    // Time filter with timestamp
    onMarketDate: { $gte: `${listedAfter}T00:00:00Z` }
  };
}

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const city = "Palm Desert";
    const listedAfter = "2025-12-07";

    const query = buildTestQuery(city, listedAfter);

    console.log('Query built:');
    console.log(JSON.stringify(query, null, 2));
    console.log('');

    // Exact field selection from API
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

    const listings = await UnifiedListing.find(query)
      .select(fieldSelection)
      .limit(10)
      .skip(0)
      .sort({ onMarketDate: -1 })
      .lean();

    console.log(`Found ${listings.length} listings\n`);

    if (listings.length > 0) {
      console.log('✅ Direct query works! Listings:');
      listings.forEach((l, i) => {
        console.log(`${i + 1}. ${l.unparsedAddress}`);
        console.log(`   Price: $${l.listPrice?.toLocaleString()}`);
        console.log(`   On Market: ${l.onMarketDate}`);
      });

      console.log('\n🔴 CONCLUSION: Query is correct, but API returns 0');
      console.log('   → Something in the API pipeline is breaking the query');
      console.log('   → Check server console for [combineFilters] logs');
    } else {
      console.log('❌ Even direct query returns 0');
      console.log('   → Database issue or data mismatch');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

test();
