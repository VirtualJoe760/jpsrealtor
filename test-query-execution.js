// Test the exact query that should be running
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const listingSchema = new mongoose.Schema({}, { strict: false, collection: 'listings' });
const Listing = mongoose.model('Listing', listingSchema);

async function testQuery() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Exact query from combineFilters output
    const query = {
      listPrice: { $exists: true, $ne: null, $gt: 0 },
      propertyType: { $ne: 'B' },
      city: { $regex: /^Palm Desert$/i },
      onMarketDate: { $gte: "2025-12-07" }
    };

    console.log('Testing query:', JSON.stringify(query, null, 2));
    console.log();

    const results = await Listing.find(query)
      .limit(10)
      .sort({ onMarketDate: -1 })
      .select('unparsedAddress listPrice onMarketDate city')
      .lean();

    console.log(`Found ${results.length} listings`);

    if (results.length > 0) {
      console.log('\n✅ Query WORKS! Found listings:');
      results.forEach((l, i) => {
        console.log(`${i + 1}. ${l.unparsedAddress}`);
        console.log(`   Price: $${l.listPrice?.toLocaleString()}`);
        console.log(`   On Market: ${l.onMarketDate}`);
      });
    } else {
      console.log('\n❌ Query returned 0 results');

      // Debug: Check without date filter
      console.log('\nTrying without date filter...');
      const queryNoDate = {
        listPrice: { $exists: true, $ne: null, $gt: 0 },
        propertyType: { $ne: 'B' },
        city: { $regex: /^Palm Desert$/i }
      };

      const resultsNoDate = await Listing.countDocuments(queryNoDate);
      console.log(`Total Palm Desert listings: ${resultsNoDate}`);

      // Check if onMarketDate field exists
      const withDateField = await Listing.countDocuments({
        ...queryNoDate,
        onMarketDate: { $exists: true }
      });
      console.log(`Listings with onMarketDate field: ${withDateField}`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testQuery();
