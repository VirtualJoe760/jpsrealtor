// Test unified_listings collection specifically
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const unifiedSchema = new mongoose.Schema({}, { strict: false, collection: 'unified_listings' });
const UnifiedListing = mongoose.model('UnifiedListing', unifiedSchema);

async function testUnified() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const query = {
      listPrice: { $exists: true, $ne: null, $gt: 0 },
      propertyType: { $ne: 'B' },
      city: { $regex: /^Palm Desert$/i },
      onMarketDate: { $gte: "2025-12-07" }
    };

    console.log('Testing UNIFIED_LISTINGS collection:');
    console.log(JSON.stringify(query, null, 2));
    console.log();

    const results = await UnifiedListing.find(query)
      .limit(10)
      .sort({ onMarketDate: -1 })
      .select('unparsedAddress listPrice onMarketDate city standardStatus')
      .lean();

    console.log(`Found ${results.length} listings in unified_listings`);

    if (results.length > 0) {
      console.log('\n✅ Listings found!');
      results.forEach((l, i) => {
        console.log(`${i + 1}. ${l.unparsedAddress}`);
        console.log(`   Price: $${l.listPrice?.toLocaleString()}`);
        console.log(`   On Market: ${l.onMarketDate}`);
        console.log(`   Status: ${l.standardStatus}`);
      });
    } else {
      console.log('\n❌ NO listings in unified_listings collection!');

      // Check total
      const total = await UnifiedListing.countDocuments({
        city: { $regex: /^Palm Desert$/i }
      });

      console.log(`\nTotal Palm Desert in unified_listings: ${total}`);

      if (total === 0) {
        console.log('\n⚠️  unified_listings collection appears to be empty or not synced!');
        console.log('This explains why the API returns no results.');
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testUnified();
