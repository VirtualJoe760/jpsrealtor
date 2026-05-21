// Quick test to check if listings have coordinates
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://doadmin:5gpl0VF9843U61Nv@jpsrealtor-mongodb-911080c1.mongo.ondigitalocean.com/admin?retryWrites=true&w=majority';

async function checkCoordinates() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('crmls_listings');

    // Find Indian Palms listings
    const listings = await collection.find({
      subdivisionName: /Indian Palms/i,
      standardStatus: 'Active'
    }).limit(5).toArray();

    console.log(`\n📍 Found ${listings.length} Indian Palms listings:\n`);

    listings.forEach((listing, i) => {
      console.log(`${i + 1}. ${listing.unparsedAddress || 'No address'}`);
      console.log(`   Latitude: ${listing.latitude || 'MISSING'}`);
      console.log(`   Longitude: ${listing.longitude || 'MISSING'}`);
      console.log(`   Subdivision: ${listing.subdivisionName || 'N/A'}\n`);
    });

    await mongoose.connection.close();
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkCoordinates();
