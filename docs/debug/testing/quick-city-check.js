// Quick check - just sample some records
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function quickCheck() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('unified_closed_listings');

    console.log('\n🔍 Quick Sample Check:\n');

    // Get 20 random samples
    const samples = await collection.find({}).limit(20).toArray();

    const cities = new Set();
    samples.forEach(s => {
      if (s.city) cities.add(s.city);
    });

    console.log('Cities in sample:');
    Array.from(cities).forEach(c => console.log(`  - ${c}`));

    // Direct Palm Desert check
    console.log('\n🏜️  Checking for Palm Desert...');
    const pdCount = await collection.countDocuments({ city: 'Palm Desert' });
    console.log(`  Exact match "Palm Desert": ${pdCount.toLocaleString()} records`);

    const pdCaseInsensitive = await collection.countDocuments({ city: /^Palm Desert$/i });
    console.log(`  Case-insensitive match: ${pdCaseInsensitive.toLocaleString()} records`);

    // Sample Palm Desert record if exists
    const pdSample = await collection.findOne({ city: /palm desert/i });
    if (pdSample) {
      console.log(`\n  Sample record:`);
      console.log(`    City: "${pdSample.city}"`);
      console.log(`    PropertySubType: "${pdSample.propertySubType}"`);
      console.log(`    CloseDate: ${pdSample.closeDate}`);
      console.log(`    ClosePrice: $${pdSample.closePrice?.toLocaleString()}`);
    } else {
      console.log(`\n  ❌ No Palm Desert records found`);
    }

  } finally {
    await client.close();
  }
}

quickCheck().catch(console.error);
