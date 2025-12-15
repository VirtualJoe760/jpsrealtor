// Test exact API flow
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import the actual functions
const { combineFilters } = require('./src/lib/queries/filters/index.ts');

// Define UnifiedListing model exactly as API does
const unifiedSchema = new mongoose.Schema({}, {
  strict: false,
  collection: 'unified_listings'
});
const UnifiedListing = mongoose.model('UnifiedListing2', unifiedSchema);

async function testExactFlow() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Exact filters from API call
    const city = "Palm Desert";
    const filters = {
      listedAfter: "2025-12-07",
      limit: 10,
      sort: "newest"
    };

    console.log('Step 1: Input parameters');
    console.log('city:', city);
    console.log('filters:', JSON.stringify(filters, null, 2));
    console.log();

    // Step 2: Combine filters (exactly as API does)
    const query = combineFilters({ city, ...filters });
    console.log('Step 2: Combined query from combineFilters():');
    console.log(JSON.stringify(query, null, 2));
    console.log();

    // Step 3: Execute query (exactly as API does)
    const fieldSelection = [
      'listingKey',
      'listPrice',
      'address',
      'city',
      'subdivisionName',
      'unparsedAddress',
      'onMarketDate'
    ].join(' ');

    const sortOrder = { onMarketDate: -1 }; // newest

    console.log('Step 3: Executing UnifiedListing.find()...');
    console.log('Field selection:', fieldSelection);
    console.log('Sort:', JSON.stringify(sortOrder));
    console.log('Limit:', filters.limit || 100);
    console.log();

    const listings = await UnifiedListing.find(query)
      .select(fieldSelection)
      .limit(filters.limit || 100)
      .skip(0)
      .sort(sortOrder)
      .lean();

    console.log('Step 4: Results');
    console.log(`Found ${listings.length} listings`);
    console.log();

    if (listings.length > 0) {
      console.log('✅ SUCCESS! Listings returned:');
      listings.forEach((l, i) => {
        console.log(`${i + 1}. ${l.unparsedAddress || l.address}`);
        console.log(`   Price: $${l.listPrice?.toLocaleString()}`);
        console.log(`   On Market: ${l.onMarketDate}`);
      });
    } else {
      console.log('❌ EMPTY RESULT!');
      console.log('This matches the API behavior - listings array is empty.');

      // Debug: Try without select()
      console.log('\n\nDebug: Trying same query WITHOUT .select()...');
      const listingsNoSelect = await UnifiedListing.find(query)
        .limit(filters.limit || 100)
        .sort(sortOrder)
        .lean();

      console.log(`Result: ${listingsNoSelect.length} listings`);

      if (listingsNoSelect.length > 0) {
        console.log('⚠️  .select() might be causing the issue!');
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testExactFlow();
