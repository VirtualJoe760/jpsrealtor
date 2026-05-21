// Quick test to check what cities exist in unified_closed_listings
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function testClosedListings() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('unified_closed_listings');

    // Get total count
    const totalCount = await collection.countDocuments({});
    console.log(`\n📊 Total closed listings: ${totalCount.toLocaleString()}`);

    // Get sample cities
    console.log('\n📍 Sample cities:');
    const cities = await collection.aggregate([
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]).toArray();

    cities.forEach(c => {
      console.log(`  ${c._id}: ${c.count.toLocaleString()} sales`);
    });

    // Get sample records to see field structure
    console.log('\n📋 Sample record:');
    const sample = await collection.findOne({});
    if (sample) {
      console.log('  Fields:', Object.keys(sample).filter(k => k !== '_id').join(', '));
      console.log('  City:', sample.city);
      console.log('  CloseDate:', sample.closeDate);
      console.log('  ClosePrice:', sample.closePrice);
      console.log('  PropertySubType:', sample.propertySubType);
      console.log('  MLS Source:', sample.mlsSource);
    }

    // Check for Palm Desert specifically
    console.log('\n🏜️ Palm Desert check:');
    const palmDesertCount = await collection.countDocuments({ city: 'Palm Desert' });
    console.log(`  Exact match "Palm Desert": ${palmDesertCount.toLocaleString()}`);

    const palmDesertRegex = await collection.countDocuments({ city: /palm desert/i });
    console.log(`  Case-insensitive match: ${palmDesertRegex.toLocaleString()}`);

    // Check property subtypes
    console.log('\n🏠 Property SubTypes:');
    const subtypes = await collection.aggregate([
      { $group: { _id: '$propertySubType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    subtypes.forEach(s => {
      console.log(`  ${s._id || 'NULL'}: ${s.count.toLocaleString()} sales`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

testClosedListings();
