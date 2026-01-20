const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  console.log('=== Checking Database for 53545 Avenida Ramirez ===\n');
  console.log('Connected to:', process.env.MONGODB_URI.substring(0, 50) + '...\n');

  const listings = await db.collection('unified_listings').find({
    unparsedAddress: { $regex: /53545.*Avenida.*Ramirez/i }
  }).toArray();

  console.log('Total listings found:', listings.length);
  console.log('');

  listings.forEach((listing, i) => {
    console.log(`Listing ${i + 1}:`);
    console.log('  MLS # (listingId):', listing.listingId);
    console.log('  ListingKey:', listing.listingKey);
    console.log('  Status:', listing.standardStatus);
    console.log('  On Market Date:', listing.onMarketDate);
    console.log('  Slug:', listing.slugAddress);
    console.log('');
  });

  if (listings.length === 0) {
    console.log('❌ NO LISTINGS FOUND!');
  } else if (listings.length === 1) {
    const listing = listings[0];
    if (listing.listingId === '219140735') {
      console.log('✅ CORRECT - Database has NEW listing (219140735)');
    } else if (listing.listingId === '219131946') {
      console.log('❌ WRONG - Database still has OLD listing (219131946)');
      console.log('VPS Claude may have updated the VPS database, but your Windows dev machine');
      console.log('is connecting to a DIFFERENT database (local or different server)');
    }
  } else {
    console.log('⚠️ Multiple listings found - both old and new exist');
  }

  await mongoose.disconnect();
}

verify().catch(console.error);
