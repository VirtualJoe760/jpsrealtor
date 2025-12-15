// Test how many "new" listings exist in Palm Desert
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const unifiedSchema = new mongoose.Schema({}, {
  strict: false,
  collection: 'unified_listings'
});
const UnifiedListing = mongoose.model('UnifiedListingNewCount', unifiedSchema);

async function countNewListings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const city = "Palm Desert";
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    console.log('='.repeat(80));
    console.log(`PALM DESERT NEW LISTINGS COUNT`);
    console.log('='.repeat(80));
    console.log(`\nDate Range: ${sevenDaysAgoStr} to today (${new Date().toISOString().split('T')[0]})`);
    console.log('Base filters: Active listings (listPrice exists, propertyType != B)\n');

    const baseQuery = {
      city: /^Palm Desert$/i,
      listPrice: { $exists: true, $ne: null, $gt: 0 },
      propertyType: { $ne: 'B' }
    };

    // Total active listings
    const total = await UnifiedListing.countDocuments(baseQuery);
    console.log(`Total active listings: ${total}`);

    // Count by onMarketDate (original listing date - never changes)
    const byOnMarketDate = await UnifiedListing.countDocuments({
      ...baseQuery,
      onMarketDate: { $gte: `${sevenDaysAgoStr}T00:00:00Z` }
    });
    console.log(`\n1. By onMarketDate >= ${sevenDaysAgoStr}:`);
    console.log(`   ${byOnMarketDate} listings (brand new listings only)`);

    // Count by modificationTimestamp (last updated - includes price changes, back on market, etc.)
    const byModTimestamp = await UnifiedListing.countDocuments({
      ...baseQuery,
      modificationTimestamp: { $gte: `${sevenDaysAgoStr}T00:00:00Z` }
    });
    console.log(`\n2. By modificationTimestamp >= ${sevenDaysAgoStr}:`);
    console.log(`   ${byModTimestamp} listings (new OR updated listings)`);

    // Count by statusChangeTimestamp
    const byStatusChange = await UnifiedListing.countDocuments({
      ...baseQuery,
      statusChangeTimestamp: { $gte: `${sevenDaysAgoStr}T00:00:00Z` }
    });
    console.log(`\n3. By statusChangeTimestamp >= ${sevenDaysAgoStr}:`);
    console.log(`   ${byStatusChange} listings (status changed to active)`);

    // Sample some listings by modificationTimestamp
    console.log('\n' + '='.repeat(80));
    console.log('SAMPLE: Most recently modified listings');
    console.log('='.repeat(80));

    const samples = await UnifiedListing.find({
      ...baseQuery,
      modificationTimestamp: { $gte: `${sevenDaysAgoStr}T00:00:00Z` }
    })
    .sort({ modificationTimestamp: -1 })
    .limit(10)
    .lean();

    samples.forEach((l, i) => {
      console.log(`\n${i + 1}. ${l.unparsedAddress || l.address}`);
      console.log(`   Price: $${l.listPrice?.toLocaleString()}`);
      console.log(`   onMarketDate: ${l.onMarketDate}`);
      console.log(`   modificationTimestamp: ${l.modificationTimestamp}`);
      console.log(`   statusChangeTimestamp: ${l.statusChangeTimestamp}`);

      // Show if it's truly new vs just updated
      const isNew = l.onMarketDate >= `${sevenDaysAgoStr}T00:00:00Z`;
      console.log(`   -> ${isNew ? '🆕 BRAND NEW' : '🔄 UPDATED (not new)'}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('RECOMMENDATION');
    console.log('='.repeat(80));
    console.log(`
For "new listings this week" in chat, you should probably use:
- modificationTimestamp: ${byModTimestamp} listings (includes price drops, back on market)
- onMarketDate: ${byOnMarketDate} listings (truly new only)

FlexMLS's "new this week" (69 listings) likely means modificationTimestamp.
Your current code uses onMarketDate, which is why you only see ${byOnMarketDate} instead of ${byModTimestamp}.
`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

countNewListings();
