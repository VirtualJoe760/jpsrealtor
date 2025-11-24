import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function checkCRMLS() {
  try {
    await client.connect();
    const db = client.db();
    
    // Check CRMLS collection
    const crmlsCorona = await db.collection('crmls_listings').countDocuments({
      standardStatus: 'Active',
      city: /corona/i,
      latitude: { $exists: true },
      longitude: { $exists: true }
    });
    
    const totalCRMLS = await db.collection('crmls_listings').countDocuments({
      standardStatus: 'Active',
      latitude: { $exists: true },
      longitude: { $exists: true }
    });
    
    console.log('📊 Total CRMLS Active Listings:', totalCRMLS);
    console.log('📍 CRMLS Corona Listings:', crmlsCorona);
    
    // Get a sample Corona listing to see the data
    const sample = await db.collection('crmls_listings').findOne({
      standardStatus: 'Active',
      city: /corona/i
    });
    
    if (sample) {
      console.log('\n📄 Sample Corona listing:');
      console.log('City:', sample.city);
      console.log('Address:', sample.unparsedAddress);
      console.log('Price:', sample.listPrice);
    }
    
  } finally {
    await client.close();
  }
}

checkCRMLS().catch(console.error);
