#!/usr/bin/env node

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function getPalmDesertSubdivisions() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('jpsrealtor');
    // Try multiple field names to find Palm Desert subdivisions
    const subdivisions = await db.collection('subdivisions')
      .find({
        $or: [
          { citySlug: 'palm-desert' },
          { city: 'Palm Desert' },
          { city: 'palm-desert' },
          { normalizedCity: 'palm desert' }
        ]
      })
      .project({ name: 1, slug: 1, city: 1, citySlug: 1, listingCount: 1, _id: 0 })
      .sort({ name: 1 })
      .toArray();

    console.log(`\nFound ${subdivisions.length} subdivisions in Palm Desert:\n`);
    subdivisions.forEach((sub, idx) => {
      console.log(`${idx + 1}. ${sub.name} (slug: ${sub.slug})`);
    });

    console.log(`\nTotal: ${subdivisions.length} subdivisions\n`);

    // Return for programmatic use
    return subdivisions;
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

getPalmDesertSubdivisions();
