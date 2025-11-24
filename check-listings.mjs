import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function checkListings() {
  try {
    await client.connect();
    const db = client.db();
    
    // Count total active listings
    const totalActive = await db.collection('listings').countDocuments({ 
      standardStatus: 'Active',
      latitude: { $exists: true },
      longitude: { $exists: true }
    });
    
    // Count Corona listings
    const coronaListings = await db.collection('listings').countDocuments({
      standardStatus: 'Active',
      city: /corona/i,
      latitude: { $exists: true },
      longitude: { $exists: true }
    });
    
    console.log('📊 Total Active Listings with coordinates:', totalActive);
    console.log('📍 Corona Active Listings:', coronaListings);
    
  } finally {
    await client.close();
  }
}

checkListings().catch(console.error);
