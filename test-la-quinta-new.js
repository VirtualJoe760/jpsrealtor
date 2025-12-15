// Check for new listings in La Quinta specifically
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const listingSchema = new mongoose.Schema({}, { strict: false, collection: 'listings' });
const Listing = mongoose.model('Listing', listingSchema);

async function checkLaQuinta() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    console.log('🔍 Checking La Quinta listings listed after:', sevenDaysAgo.toISOString().split('T')[0]);
    console.log();

    const newListings = await Listing.find({
      city: { $regex: /^la quinta$/i },
      standardStatus: 'Active',
      onMarketDate: { $gte: sevenDaysAgo }
    })
    .sort({ onMarketDate: -1 })
    .limit(10)
    .select('unparsedAddress listPrice onMarketDate city')
    .lean();

    console.log(`Found ${newListings.length} new listings in La Quinta (past 7 days)`);

    if (newListings.length > 0) {
      console.log('\nListings:');
      newListings.forEach((l, i) => {
        console.log(`${i + 1}. ${l.unparsedAddress}`);
        console.log(`   Price: $${l.listPrice?.toLocaleString()}`);
        console.log(`   On Market: ${new Date(l.onMarketDate).toLocaleDateString()}`);
      });
    } else {
      console.log('\n✅ Confirmed: No new listings in La Quinta in the past 7 days');
      console.log('The AI response was CORRECT!');
    }

    // Check all active La Quinta listings
    const totalActive = await Listing.countDocuments({
      city: { $regex: /^la quinta$/i },
      standardStatus: 'Active'
    });

    console.log(`\nTotal active La Quinta listings: ${totalActive}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkLaQuinta();
