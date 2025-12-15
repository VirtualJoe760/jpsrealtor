// Check onMarketDate field in database
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const unifiedSchema = new mongoose.Schema({}, {
  strict: false,
  collection: 'unified_listings'
});
const UnifiedListing = mongoose.model('UnifiedListingDateCheck', unifiedSchema);

async function checkDates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('Checking Palm Desert listings...\n');

    // Count total Palm Desert listings
    const total = await UnifiedListing.countDocuments({
      city: /^Palm Desert$/i,
      listPrice: { $exists: true, $ne: null, $gt: 0 },
      propertyType: { $ne: 'B' }
    });
    console.log(`Total Palm Desert active listings: ${total}`);

    // Count with onMarketDate field
    const withDate = await UnifiedListing.countDocuments({
      city: /^Palm Desert$/i,
      listPrice: { $exists: true, $ne: null, $gt: 0 },
      propertyType: { $ne: 'B' },
      onMarketDate: { $exists: true, $ne: null }
    });
    console.log(`Listings with onMarketDate field: ${withDate}`);

    // Count missing onMarketDate
    const missingDate = await UnifiedListing.countDocuments({
      city: /^Palm Desert$/i,
      listPrice: { $exists: true, $ne: null, $gt: 0 },
      propertyType: { $ne: 'B' },
      $or: [
        { onMarketDate: { $exists: false } },
        { onMarketDate: null },
        { onMarketDate: '' }
      ]
    });
    console.log(`Listings MISSING onMarketDate: ${missingDate}\n`);

    // Check for listings from this week
    const thisWeek = await UnifiedListing.countDocuments({
      city: /^Palm Desert$/i,
      listPrice: { $exists: true, $ne: null, $gt: 0 },
      propertyType: { $ne: 'B' },
      onMarketDate: { $gte: "2025-12-07T00:00:00Z" }
    });
    console.log(`Listings with onMarketDate >= 2025-12-07: ${thisWeek}`);

    // Sample some recent listings to see date formats
    console.log('\nSample recent listings (sorted by onMarketDate):');
    const recent = await UnifiedListing.find({
      city: /^Palm Desert$/i,
      listPrice: { $exists: true, $ne: null, $gt: 0 },
      propertyType: { $ne: 'B' },
      onMarketDate: { $exists: true, $ne: null }
    })
    .sort({ onMarketDate: -1 })
    .limit(10)
    .lean();

    recent.forEach((l, i) => {
      console.log(`${i + 1}. ${l.unparsedAddress || l.address}`);
      console.log(`   onMarketDate: ${l.onMarketDate} (type: ${typeof l.onMarketDate})`);
      console.log(`   listPrice: $${l.listPrice?.toLocaleString()}`);
    });

    // Check for alternative date fields
    console.log('\n\nChecking for alternative date fields...');
    const sampleListing = await UnifiedListing.findOne({
      city: /^Palm Desert$/i,
      listPrice: { $exists: true, $ne: null, $gt: 0 },
      propertyType: { $ne: 'B' }
    }).lean();

    if (sampleListing) {
      console.log('Sample listing fields containing "date" or "Date":');
      Object.keys(sampleListing).filter(key =>
        key.toLowerCase().includes('date')
      ).forEach(key => {
        console.log(`  ${key}: ${sampleListing[key]}`);
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkDates();
