#!/usr/bin/env node

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function exploreSubdivisions() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('jpsrealtor');

    // Get a sample subdivision to see structure
    const sample = await db.collection('subdivisions').findOne({});

    console.log('Sample subdivision document:');
    console.log(JSON.stringify(sample, null, 2));

    // Count total subdivisions
    const total = await db.collection('subdivisions').countDocuments();
    console.log(`\nTotal subdivisions: ${total}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

exploreSubdivisions();
