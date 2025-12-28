// Verify what collections actually exist in the database
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function verifyCollections() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get list of all collections
    const collections = await mongoose.connection.db.listCollections().toArray();

    console.log('='.repeat(80));
    console.log('ALL COLLECTIONS IN DATABASE');
    console.log('='.repeat(80));
    console.log('');

    // Filter for listing-related collections
    const listingCollections = collections.filter(c =>
      c.name.toLowerCase().includes('listing') ||
      c.name.toLowerCase().includes('unified')
    );

    console.log('LISTING-RELATED COLLECTIONS:');
    for (const col of listingCollections) {
      const count = await mongoose.connection.db.collection(col.name).countDocuments({});
      console.log(`  ${col.name.padEnd(40)} ${count.toLocaleString().padStart(10)} documents`);
    }

    // Test both possible unified collection names
    console.log('\n' + '='.repeat(80));
    console.log('TESTING UNIFIED COLLECTION VARIATIONS');
    console.log('='.repeat(80));
    console.log('');

    const collectionsToTest = [
      'unified_listings',
      'unifiedlistings',
      'UnifiedListings',
      'unified-listings'
    ];

    for (const collName of collectionsToTest) {
      try {
        const exists = collections.find(c => c.name === collName);
        if (exists) {
          const count = await mongoose.connection.db.collection(collName).countDocuments({});
          console.log(`✅ "${collName}" EXISTS - ${count.toLocaleString()} documents`);

          // Sample a document to see the structure
          const sample = await mongoose.connection.db.collection(collName).findOne({});
          if (sample) {
            console.log(`   Sample fields: ${Object.keys(sample).slice(0, 10).join(', ')}...`);
            console.log(`   City field: "${sample.city || sample.City || 'NOT FOUND'}"`);
            console.log(`   PropertyType: "${sample.propertyType || sample.PropertyType || 'NOT FOUND'}"`);
          }
          console.log('');
        } else {
          console.log(`❌ "${collName}" DOES NOT EXIST`);
        }
      } catch (error) {
        console.log(`❌ Error checking "${collName}": ${error.message}`);
      }
    }

    // Now specifically check for Irvine in the correct collection
    console.log('='.repeat(80));
    console.log('CHECKING FOR IRVINE IN UNIFIED_LISTINGS');
    console.log('='.repeat(80));
    console.log('');

    const unifiedListingsExists = collections.find(c => c.name === 'unified_listings');
    if (unifiedListingsExists) {
      const irvineCount = await mongoose.connection.db.collection('unified_listings').countDocuments({
        city: { $regex: /irvine/i }
      });
      console.log(`Irvine listings (case-insensitive city match): ${irvineCount}`);

      if (irvineCount > 0) {
        // Sample one
        const sample = await mongoose.connection.db.collection('unified_listings').findOne({
          city: { $regex: /irvine/i }
        });
        console.log(`Sample city value: "${sample.city}"`);
        console.log(`Sample propertyType: "${sample.propertyType}"`);
        console.log(`Sample standardStatus: "${sample.standardStatus}"`);
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Script completed successfully');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyCollections();
