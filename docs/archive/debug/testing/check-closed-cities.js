// Quick check of what cities exist in unified_closed_listings
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkCities() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('unified_closed_listings');

    console.log('\n🔍 Checking unified_closed_listings...\n');

    // Total count
    const total = await collection.countDocuments({});
    console.log(`Total documents: ${total.toLocaleString()}\n`);

    // Top 10 cities by sales count
    console.log('📍 Top 10 Cities by Sales:');
    const cities = await collection.aggregate([
      { $match: { city: { $exists: true, $ne: null, $ne: '' } } },
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    cities.forEach(c => console.log(`  ${c._id}: ${c.count.toLocaleString()} sales`));

    // Check for "Palm Desert" variations
    console.log('\n🏜️  Palm Desert variations:');
    const palmDesert = await collection.aggregate([
      { $match: { city: /palm.*desert/i } },
      { $group: { _id: '$city', count: { $sum: 1 } } }
    ]).toArray();

    if (palmDesert.length === 0) {
      console.log('  ❌ No matches found for "Palm Desert"');
    } else {
      palmDesert.forEach(c => console.log(`  ${c._id}: ${c.count.toLocaleString()} sales`));
    }

    // Sample one record to see structure
    console.log('\n📋 Sample Record:');
    const sample = await collection.findOne({});
    if (sample) {
      console.log(`  City: "${sample.city}"`);
      console.log(`  SubdivisionName: "${sample.subdivisionName}"`);
      console.log(`  CloseDate: ${sample.closeDate}`);
      console.log(`  ClosePrice: $${sample.closePrice?.toLocaleString()}`);
      console.log(`  PropertySubType: "${sample.propertySubType}"`);
      console.log(`  MLS Source: ${sample.mlsSource}`);
    }

  } finally {
    await client.close();
  }
}

checkCities().catch(console.error);
