// Check what propertySubType values exist
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkSubtypes() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('unified_closed_listings');

    console.log('\n🏠 Property SubTypes in unified_closed_listings:\n');

    // Aggregate by propertySubType
    const subtypes = await collection.aggregate([
      { $group: { _id: '$propertySubType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]).toArray();

    subtypes.forEach(st => {
      const label = st._id || '(null/missing)';
      console.log(`  ${label}: ${st.count.toLocaleString()} sales`);
    });

    // Check Palm Desert specifically
    console.log('\n🏜️  Palm Desert property subtypes:');
    const pdSubtypes = await collection.aggregate([
      { $match: { city: 'Palm Desert' } },
      { $group: { _id: '$propertySubType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    pdSubtypes.forEach(st => {
      const label = st._id || '(null/missing)';
      console.log(`  ${label}: ${st.count.toLocaleString()} sales`);
    });

  } finally {
    await client.close();
  }
}

checkSubtypes().catch(console.error);
