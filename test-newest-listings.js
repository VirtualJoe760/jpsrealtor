// Test script to check newest listings in Palm Desert
// Verifies cronjob is working and shows most recent listing dates

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Define the Listing schema (simplified)
const listingSchema = new mongoose.Schema({}, { strict: false, collection: 'listings' });
const Listing = mongoose.model('Listing', listingSchema);

async function checkNewestListings() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find newest listings in Palm Desert
    console.log('📊 Checking newest listings in Palm Desert...\n');

    const palmDesertListings = await Listing.find({
      city: { $regex: /palm desert/i },
      standardStatus: 'Active'
    })
    .sort({ modificationTimestamp: -1 })
    .limit(10)
    .select('unparsedAddress city listPrice modificationTimestamp onMarketDate listingContractDate createdAt updatedAt')
    .lean();

    if (palmDesertListings.length === 0) {
      console.log('❌ No active listings found in Palm Desert');
      await mongoose.disconnect();
      return;
    }

    console.log(`Found ${palmDesertListings.length} active listings in Palm Desert\n`);
    console.log('='.repeat(100));
    console.log('NEWEST LISTINGS (sorted by modification date):');
    console.log('='.repeat(100));

    palmDesertListings.forEach((listing, index) => {
      console.log(`\n${index + 1}. ${listing.unparsedAddress || 'No address'}`);
      console.log(`   Price: $${(listing.listPrice || 0).toLocaleString()}`);
      console.log(`   City: ${listing.city}`);

      // Show all relevant timestamps
      if (listing.modificationTimestamp) {
        const modDate = new Date(listing.modificationTimestamp);
        const daysAgo = Math.floor((Date.now() - modDate.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`   📅 Modified: ${modDate.toLocaleDateString()} ${modDate.toLocaleTimeString()} (${daysAgo} days ago)`);
      }

      if (listing.onMarketDate) {
        const onMarketDate = new Date(listing.onMarketDate);
        const daysAgo = Math.floor((Date.now() - onMarketDate.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`   🏪 On Market: ${onMarketDate.toLocaleDateString()} (${daysAgo} days ago)`);
      }

      if (listing.listingContractDate) {
        const contractDate = new Date(listing.listingContractDate);
        const daysAgo = Math.floor((Date.now() - contractDate.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`   📝 Contract: ${contractDate.toLocaleDateString()} (${daysAgo} days ago)`);
      }

      if (listing.createdAt) {
        const createdDate = new Date(listing.createdAt);
        const daysAgo = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`   💾 Created in DB: ${createdDate.toLocaleDateString()} ${createdDate.toLocaleTimeString()} (${daysAgo} days ago)`);
      }

      if (listing.updatedAt) {
        const updatedDate = new Date(listing.updatedAt);
        const daysAgo = Math.floor((Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`   🔄 Updated in DB: ${updatedDate.toLocaleDateString()} ${updatedDate.toLocaleTimeString()} (${daysAgo} days ago)`);
      }
    });

    console.log('\n' + '='.repeat(100));

    // Check listings added in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    console.log(`\n📊 Checking listings added/modified in last 7 days (since ${sevenDaysAgo.toLocaleDateString()})...\n`);

    const recentListings = await Listing.find({
      city: { $regex: /palm desert/i },
      standardStatus: 'Active',
      $or: [
        { modificationTimestamp: { $gte: sevenDaysAgo } },
        { createdAt: { $gte: sevenDaysAgo } },
        { updatedAt: { $gte: sevenDaysAgo } }
      ]
    })
    .sort({ modificationTimestamp: -1 })
    .select('unparsedAddress modificationTimestamp createdAt updatedAt')
    .lean();

    console.log(`✅ Found ${recentListings.length} listings modified/added in the last 7 days`);

    if (recentListings.length > 0) {
      console.log('\nRecent listings:');
      recentListings.forEach((listing, index) => {
        console.log(`  ${index + 1}. ${listing.unparsedAddress}`);
        if (listing.modificationTimestamp) {
          console.log(`     Modified: ${new Date(listing.modificationTimestamp).toLocaleString()}`);
        }
      });
    }

    // Check total counts
    console.log('\n' + '='.repeat(100));
    console.log('DATABASE STATISTICS:');
    console.log('='.repeat(100));

    const totalActive = await Listing.countDocuments({ standardStatus: 'Active' });
    const totalPalmDesert = await Listing.countDocuments({
      city: { $regex: /palm desert/i },
      standardStatus: 'Active'
    });

    console.log(`Total Active Listings (all cities): ${totalActive.toLocaleString()}`);
    console.log(`Total Active Palm Desert Listings: ${totalPalmDesert.toLocaleString()}`);

    // Check when database was last updated
    const newestGlobal = await Listing.findOne({})
      .sort({ updatedAt: -1 })
      .select('updatedAt city')
      .lean();

    if (newestGlobal?.updatedAt) {
      const lastUpdate = new Date(newestGlobal.updatedAt);
      const hoursAgo = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60));
      console.log(`\n⏰ Last database update: ${lastUpdate.toLocaleString()} (${hoursAgo} hours ago)`);
      console.log(`   City: ${newestGlobal.city}`);

      if (hoursAgo > 24) {
        console.log('\n⚠️  WARNING: Database hasn\'t been updated in over 24 hours!');
        console.log('   Cronjob may not be running properly.');
      } else {
        console.log('\n✅ Database is being updated regularly (within 24 hours)');
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ Test complete - disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the test
checkNewestListings();
