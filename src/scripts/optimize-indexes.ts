// src/scripts/optimize-indexes.ts
// Run this script to add optimized compound indexes for listing queries
// Usage: npx tsx src/scripts/optimize-indexes.ts

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define MONGODB_URI in your .env.local file');
}

async function optimizeIndexes() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // ================================================
    // LISTINGS COLLECTION INDEXES
    // ================================================

    console.log('\n📊 Optimizing Listings collection indexes...');

    const listingsCollection = db.collection('listings');

    // Index 1: Geographic + Status + Property Type (most common map query)
    console.log('  Creating geo + status + propertyType index...');
    await listingsCollection.createIndex(
      {
        latitude: 1,
        longitude: 1,
        standardStatus: 1,
        propertyType: 1,
      },
      { name: 'idx_geo_status_type' }
    );

    // Index 2: Price range queries
    console.log('  Creating price + status index...');
    await listingsCollection.createIndex(
      {
        standardStatus: 1,
        listPrice: 1,
      },
      { name: 'idx_status_price' }
    );

    // Index 3: Beds/Baths filtering
    console.log('  Creating beds/baths index...');
    await listingsCollection.createIndex(
      {
        standardStatus: 1,
        bedroomsTotal: 1,
        bathroomsFull: 1,
      },
      { name: 'idx_status_beds_baths' }
    );

    // Index 4: Geographic bounding box queries (2dsphere for better geo performance)
    console.log('  Creating 2dsphere geo index...');
    await listingsCollection.createIndex(
      {
        location: '2dsphere'
      },
      {
        name: 'idx_geo_2dsphere',
        sparse: true // Only index documents that have this field
      }
    );

    // Index 5: Property features (pool, spa, HOA)
    console.log('  Creating features index...');
    await listingsCollection.createIndex(
      {
        standardStatus: 1,
        poolYn: 1,
        spaYn: 1,
        associationFee: 1,
      },
      { name: 'idx_status_features' }
    );

    // Index 6: Slug for direct lookups
    console.log('  Creating slug index...');
    await listingsCollection.createIndex(
      {
        slug: 1,
      },
      { name: 'idx_slug', unique: true }
    );

    // Index 7: slugAddress for direct lookups
    console.log('  Creating slugAddress index...');
    await listingsCollection.createIndex(
      {
        slugAddress: 1,
      },
      { name: 'idx_slugAddress', unique: true, sparse: true }
    );

    // Index 8: City-based searches
    console.log('  Creating city + status index...');
    await listingsCollection.createIndex(
      {
        city: 1,
        standardStatus: 1,
        listPrice: 1,
      },
      { name: 'idx_city_status_price' }
    );

    // Index 9: Subdivision searches
    console.log('  Creating subdivision index...');
    await listingsCollection.createIndex(
      {
        subdivisionName: 1,
        standardStatus: 1,
      },
      { name: 'idx_subdivision_status', sparse: true }
    );

    // ================================================
    // PHOTOS COLLECTION INDEXES
    // ================================================

    console.log('\n📸 Optimizing Photos collection indexes...');
    const photosCollection = db.collection('photos');

    // Index for primary photo lookup
    console.log('  Creating listingId + primary index...');
    await photosCollection.createIndex(
      {
        listingId: 1,
        primary: -1,
        Order: 1,
      },
      { name: 'idx_listing_primary_order' }
    );

    // ================================================
    // OPEN HOUSES COLLECTION INDEXES
    // ================================================

    console.log('\n🏠 Optimizing OpenHouses collection indexes...');
    const openHousesCollection = db.collection('openhouses');

    // Index for open house lookups by listing
    console.log('  Creating listingId + date index...');
    await openHousesCollection.createIndex(
      {
        listingId: 1,
        date: 1,
      },
      { name: 'idx_listing_date' }
    );

    // ================================================
    // ANALYZE INDEXES
    // ================================================

    console.log('\n📋 Current indexes on Listings collection:');
    const indexes = await listingsCollection.indexes();
    indexes.forEach((index) => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\n✅ All indexes created successfully!');
    console.log('\n💡 Performance Tips:');
    console.log('  - Queries filtering by lat/lng + standardStatus will use idx_geo_status_type');
    console.log('  - Price range queries will use idx_status_price');
    console.log('  - Photo lookups now optimized with compound index');
    console.log('  - Consider using explain() to verify query plans');

  } catch (error) {
    console.error('❌ Error optimizing indexes:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the optimization
optimizeIndexes()
  .then(() => {
    console.log('\n🎉 Index optimization complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to optimize indexes:', error);
    process.exit(1);
  });
