#!/usr/bin/env node

// Get all cities and their top 3 subdivisions by listing count

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

async function getAllCitiesSubdivisions() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const db = client.db('jpsrealtor');

    // Get all unique cities from subdivisions collection
    const uniqueCities = await db.collection('subdivisions')
      .aggregate([
        {
          $group: {
            _id: { city: '$city', citySlug: '$citySlug' },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        {
          $project: {
            _id: 0,
            city: '$_id.city',
            citySlug: '$_id.citySlug',
            subdivisionCount: '$count'
          }
        }
      ])
      .toArray();

    console.log(`Found ${uniqueCities.length} cities with subdivisions\n`);

    const testData = [];

    for (const cityInfo of uniqueCities) {
      const cityName = cityInfo.city;
      const citySlug = cityInfo.citySlug;

      console.log(`\n📍 ${cityName} (${cityInfo.subdivisionCount} subdivisions)`);
      console.log('─'.repeat(80));

      // Get top 3 subdivisions by listing count for this city
      const subdivisions = await db.collection('subdivisions')
        .find({
          $or: [
            { citySlug: citySlug },
            { city: cityName },
            { normalizedCity: cityName?.toLowerCase() }
          ]
        })
        .project({
          name: 1,
          slug: 1,
          listingCount: 1,
          city: 1,
          _id: 0
        })
        .sort({ listingCount: -1 })
        .limit(3)
        .toArray();

      if (subdivisions.length > 0) {
        console.log(`Top ${subdivisions.length} subdivisions:`);
        subdivisions.forEach((sub, idx) => {
          console.log(`  ${idx + 1}. ${sub.name} - ${sub.listingCount || 0} listings (slug: ${sub.slug})`);
        });

        testData.push({
          city: cityName,
          citySlug: citySlug,
          totalSubdivisions: cityInfo.subdivisionCount,
          subdivisions: subdivisions.map(s => ({
            name: s.name,
            slug: s.slug,
            listings: s.listingCount || 0
          }))
        });
      } else {
        console.log(`  ⚠️  No subdivisions found`);
      }
    }

    // Save to JSON file for test suite
    const outputPath = 'scripts/test-data/cities-subdivisions.json';
    fs.mkdirSync('scripts/test-data', { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(testData, null, 2));

    console.log(`\n${'═'.repeat(80)}`);
    console.log(`✅ Data saved to: ${outputPath}`);
    console.log(`📊 Total cities: ${testData.length}`);
    console.log(`📊 Total subdivisions to test: ${testData.reduce((sum, c) => sum + c.subdivisions.length, 0)}`);
    console.log('═'.repeat(80));

    return testData;
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

getAllCitiesSubdivisions();
