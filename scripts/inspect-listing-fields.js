// scripts/inspect-listing-fields.js
// Inspect actual field names in unified_listings collection
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function inspectListingFields() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collection = db.collection('unified_listings');

    // Get a sample listing with 4 bedrooms to match your search
    console.log('🔍 Looking for a 4-bedroom listing...\n');

    const sample = await collection.findOne({
      city: { $regex: /palm desert/i },
      standardStatus: 'Active',
      propertyType: 'A'
    });

    if (!sample) {
      console.log('❌ No Palm Desert listings found');
      await mongoose.connection.close();
      return;
    }

    console.log('📋 Sample Listing Fields:\n');
    console.log('='.repeat(80));

    // Check all possible bed/bath field names
    const fieldsToCheck = {
      'BEDROOM FIELDS': [
        'beds',
        'bedsTotal',
        'bedroomsTotal',
        'bedrooms',
        'bedroomsTotalInteger'
      ],
      'BATHROOM FIELDS': [
        'baths',
        'bathsTotal',
        'bathroomsTotalInteger',
        'bathroomsTotalDecimal',
        'bathroomsFull',
        'bathroomsHalf',
        'bathrooms'
      ],
      'SQUARE FOOTAGE FIELDS': [
        'sqft',
        'livingArea',
        'squareFeet',
        'buildingAreaTotal'
      ]
    };

    for (const [category, fields] of Object.entries(fieldsToCheck)) {
      console.log(`\n${category}:`);
      console.log('-'.repeat(80));

      for (const field of fields) {
        const value = sample[field];
        if (value !== undefined && value !== null) {
          console.log(`  ✅ ${field}: ${value}`);
        } else {
          console.log(`  ❌ ${field}: NOT FOUND`);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📝 Sample listing address:', sample.unparsedAddress || sample.address);
    console.log('💰 Price:', sample.listPrice);
    console.log('🏙️  City:', sample.city);
    console.log('\n' + '='.repeat(80));

    // Now let's check multiple listings to see consistency
    console.log('\n🔍 Checking 10 Palm Desert listings for field consistency...\n');

    const multipleSamples = await collection.find({
      city: { $regex: /palm desert/i },
      standardStatus: 'Active',
      propertyType: 'A'
    }).limit(10).toArray();

    const fieldUsage = {};

    multipleSamples.forEach((listing, index) => {
      const allFields = [...fieldsToCheck['BEDROOM FIELDS'], ...fieldsToCheck['BATHROOM FIELDS'], ...fieldsToCheck['SQUARE FOOTAGE FIELDS']];
      allFields.forEach(field => {
        if (listing[field] !== undefined && listing[field] !== null) {
          fieldUsage[field] = (fieldUsage[field] || 0) + 1;
        }
      });
    });

    console.log('📊 Field usage across 10 listings:\n');
    Object.entries(fieldUsage)
      .sort((a, b) => b[1] - a[1])
      .forEach(([field, count]) => {
        const percentage = (count / multipleSamples.length * 100).toFixed(0);
        console.log(`  ${field}: ${count}/10 (${percentage}%)`);
      });

    console.log('\n✅ Inspection complete!\n');

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

inspectListingFields();
