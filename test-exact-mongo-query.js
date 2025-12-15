// Test the EXACT query structure from the logs
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const unifiedSchema = new mongoose.Schema({}, {
  strict: false,
  collection: 'unified_listings'
});
const UnifiedListing = mongoose.model('UnifiedListingExactQuery', unifiedSchema);

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Exact query from logs
    const query = {
      listPrice: { $exists: true, $ne: null, $gt: 0 },
      propertyType: { $ne: 'B' },
      city: /^Palm Desert$/i,  // This is what buildLocationQuery creates
      onMarketDate: { $gte: "2025-12-07T00:00:00Z" }
    };

    console.log('Testing EXACT query structure from logs:');
    console.log(JSON.stringify(query, null, 2));
    console.log('\nNote: RegExp shows as {} when serialized, but it works correctly\n');

    const results = await UnifiedListing.find(query)
      .select('listingKey listPrice address city unparsedAddress onMarketDate')
      .limit(10)
      .sort({ onMarketDate: -1 })
      .lean();

    console.log(`Results: ${results.length} listings\n`);

    if (results.length > 0) {
      console.log('✅ SUCCESS! The query structure works:');
      results.forEach((l, i) => {
        console.log(`${i + 1}. ${l.unparsedAddress || l.address}`);
        console.log(`   Price: $${l.listPrice?.toLocaleString()}`);
        console.log(`   On Market: ${l.onMarketDate}`);
      });
    } else {
      console.log('❌ 0 results - something else is wrong');

      // Debug: Check what the city field actually looks like
      console.log('\nChecking database city field values...');
      const sampleListings = await UnifiedListing.find({
        listPrice: { $exists: true, $ne: null, $gt: 0 },
        propertyType: { $ne: 'B' },
        onMarketDate: { $gte: "2025-12-07T00:00:00Z" }
      })
      .limit(10)
      .lean();

      console.log(`\nFound ${sampleListings.length} listings with date filter (no city filter)`);
      if (sampleListings.length > 0) {
        console.log('Sample cities:');
        sampleListings.forEach(l => {
          console.log(`  "${l.city}" (type: ${typeof l.city})`);
        });
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

test();
