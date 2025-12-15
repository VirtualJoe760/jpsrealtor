// Check what timestamp fields could identify "new this week"
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const unifiedSchema = new mongoose.Schema({}, {
  strict: false,
  collection: 'unified_listings'
});
const UnifiedListing = mongoose.model('UnifiedListingTimestampCheck', unifiedSchema);

async function checkTimestamps() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('Checking alternative timestamp fields for "new this week"...\n');

    // Check ModificationTimestamp
    const modRecent = await UnifiedListing.countDocuments({
      city: /^Palm Desert$/i,
      listPrice: { $exists: true, $ne: null, $gt: 0 },
      propertyType: { $ne: 'B' },
      modificationTimestamp: { $gte: "2025-12-07T00:00:00Z" }
    });
    console.log(`Listings with modificationTimestamp >= 2025-12-07: ${modRecent}`);

    // Check StatusChangeTimestamp
    const statusRecent = await UnifiedListing.countDocuments({
      city: /^Palm Desert$/i,
      listPrice: { $exists: true, $ne: null, $gt: 0 },
      propertyType: { $ne: 'B' },
      statusChangeTimestamp: { $gte: "2025-12-07T00:00:00Z" }
    });
    console.log(`Listings with statusChangeTimestamp >= 2025-12-07: ${statusRecent}`);

    // Check listingUpdateTimestamp
    const updateRecent = await UnifiedListing.countDocuments({
      city: /^Palm Desert$/i,
      listPrice: { $exists: true, $ne: null, $gt: 0 },
      propertyType: { $ne: 'B' },
      listingUpdateTimestamp: { $gte: "2025-12-07T00:00:00Z" }
    });
    console.log(`Listings with listingUpdateTimestamp >= 2025-12-07: ${updateRecent}`);

    // Sample listings sorted by modificationTimestamp
    console.log('\n\nTop 10 listings by modificationTimestamp (most recent first):');
    const byMod = await UnifiedListing.find({
      city: /^Palm Desert$/i,
      listPrice: { $exists: true, $ne: null, $gt: 0 },
      propertyType: { $ne: 'B' },
      modificationTimestamp: { $exists: true }
    })
    .sort({ modificationTimestamp: -1 })
    .limit(10)
    .lean();

    byMod.forEach((l, i) => {
      console.log(`${i + 1}. ${l.unparsedAddress || l.address}`);
      console.log(`   modificationTimestamp: ${l.modificationTimestamp}`);
      console.log(`   onMarketDate: ${l.onMarketDate}`);
      console.log(`   statusChangeTimestamp: ${l.statusChangeTimestamp}`);
      console.log(`   Price: $${l.listPrice?.toLocaleString()}\n`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkTimestamps();
