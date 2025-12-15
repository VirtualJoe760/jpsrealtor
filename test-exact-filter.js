// Test exact filter that AI should be using
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const listingSchema = new mongoose.Schema({}, { strict: false, collection: 'listings' });
const Listing = mongoose.model('Listing', listingSchema);

async function testExactFilter() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Exact date the AI should be using (7 days ago)
    const listedAfter = new Date('2025-12-07');

    console.log('Testing EXACT filter that AI uses:');
    console.log('City: Palm Desert');
    console.log('listedAfter:', listedAfter.toISOString());
    console.log('Query: { city: /^palm desert$/i, standardStatus: "Active", onMarketDate: { $gte: listedAfter } }');
    console.log();

    const results = await Listing.find({
      city: { $regex: /^palm desert$/i },
      standardStatus: 'Active',
      onMarketDate: { $gte: listedAfter }
    })
    .sort({ onMarketDate: -1 })
    .limit(10)
    .select('unparsedAddress listPrice onMarketDate')
    .lean();

    console.log(`Results: ${results.length} listings found`);

    if (results.length > 0) {
      console.log('\n✅ SUCCESS: Filter is working! Found listings:');
      results.forEach((l, i) => {
        console.log(`${i + 1}. ${l.unparsedAddress}`);
        console.log(`   Price: $${l.listPrice?.toLocaleString()}`);
        console.log(`   On Market: ${new Date(l.onMarketDate).toISOString()}`);
      });
    } else {
      console.log('\n❌ PROBLEM: No listings found with this filter');
      console.log('This means either:');
      console.log('1. The onMarketDate field is not being set correctly');
      console.log('2. The filter is not matching correctly');
      console.log('3. There really are no new listings');
    }

    // Double check with different date formats
    console.log('\n\n--- Testing with Date object vs ISO string ---');

    const resultsISO = await Listing.find({
      city: { $regex: /^palm desert$/i },
      standardStatus: 'Active',
      onMarketDate: { $gte: '2025-12-07' }
    }).countDocuments();

    console.log(`Using ISO string "2025-12-07": ${resultsISO} results`);

    const resultsDate = await Listing.find({
      city: { $regex: /^palm desert$/i },
      standardStatus: 'Active',
      onMarketDate: { $gte: new Date('2025-12-07') }
    }).countDocuments();

    console.log(`Using Date object new Date("2025-12-07"): ${resultsDate} results`);

    // Check onMarketDate field type
    console.log('\n\n--- Checking onMarketDate field ---');
    const sample = await Listing.findOne({
      city: { $regex: /^palm desert$/i },
      standardStatus: 'Active',
      onMarketDate: { $exists: true }
    })
    .select('onMarketDate')
    .lean();

    if (sample) {
      console.log('Sample onMarketDate value:', sample.onMarketDate);
      console.log('Type:', typeof sample.onMarketDate);
      console.log('Is Date?', sample.onMarketDate instanceof Date);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testExactFilter();
