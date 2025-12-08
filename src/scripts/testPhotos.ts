/**
 * Test Photo Fetching from All 8 MLSs
 *
 * This script tests the /api/listings/[listingKey]/photos endpoint
 * to ensure photos are correctly fetched from Spark API for all MLS sources.
 *
 * MLS IDs Reference (from docs/listings/UNIFIED_MLS_ARCHITECTURE.md):
 * - CRMLS:             20200218121507636729000000
 * - CLAW:              20200630203341057545000000
 * - SOUTHLAND:         20200630203518576361000000
 * - GPS:               20190211172710340762000000
 * - HIGH_DESERT:       20200630204544040064000000
 * - BRIDGE:            20200630204733042221000000
 * - CONEJO_SIMI:       20160622112753445171000000
 * - ITECH:             20200630203206752718000000
 *
 * Prerequisites:
 * - MONGODB_URI in .env.local
 * - SPARK_API_KEY in .env.local
 *
 * Run: npx tsx src/scripts/testPhotos.ts
 *
 * Expected Output:
 * - Finds 8 MLS sources in database
 * - Gets 1 sample Active listing from each MLS
 * - Tests photo fetch from Spark API for each listing
 * - Reports success/failure with photo counts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

interface Listing {
  listingKey: string;
  mlsId: string;
  mlsSource: string;
  listPrice?: number;
  city?: string;
  standardStatus?: string;
}

interface PhotoTestResult {
  mlsSource: string;
  mlsId: string;
  listingKey: string;
  city?: string;
  listPrice?: number;
  photoCount: number;
  success: boolean;
  error?: string;
  sparkUrl?: string;
  samplePhotoUrls?: string[];
}

async function getMlsSamples(): Promise<Listing[]> {
  await mongoose.connect(process.env.MONGODB_URI!);

  const db = mongoose.connection.db;
  const collection = db.collection('unified_listings');

  // Get distinct MLS sources
  const mlsSources = await collection.distinct('mlsSource');
  console.log(`\n📊 Found ${mlsSources.length} MLS sources:\n`);
  mlsSources.forEach((mls, i) => console.log(`  ${i + 1}. ${mls}`));

  // Get one sample Active listing from each MLS
  console.log('\n🔍 Fetching sample listings from each MLS...\n');
  const samples: Listing[] = [];

  for (const mls of mlsSources) {
    const sample = await collection.findOne(
      {
        mlsSource: mls,
        standardStatus: 'Active' // Prefer active listings
      },
      {
        projection: {
          listingKey: 1,
          mlsId: 1,
          mlsSource: 1,
          listPrice: 1,
          city: 1,
          standardStatus: 1,
          _id: 0
        }
      }
    );

    if (sample) {
      samples.push(sample as unknown as Listing);
      console.log(`✅ ${mls.padEnd(25)} | ${sample.city || 'N/A'} | $${sample.listPrice?.toLocaleString() || 'N/A'}`);
    } else {
      console.log(`❌ ${mls.padEnd(25)} | No listings found`);
    }
  }

  return samples;
}

async function testPhotoFetch(listing: Listing): Promise<PhotoTestResult> {
  const { listingKey, mlsId, mlsSource, city, listPrice } = listing;

  const result: PhotoTestResult = {
    mlsSource,
    mlsId,
    listingKey,
    city,
    listPrice,
    photoCount: 0,
    success: false,
  };

  try {
    const sparkApiKey = process.env.SPARK_API_KEY;

    if (!sparkApiKey) {
      throw new Error('SPARK_API_KEY not configured');
    }

    // Construct Spark API URL with mlsId
    const sparkUrl = `https://sparkapi.com/${mlsId}/listings/${listingKey}/photos`;
    result.sparkUrl = sparkUrl;

    console.log(`\n🌐 Fetching from: ${sparkUrl}`);

    const response = await fetch(sparkUrl, {
      headers: {
        "Authorization": `Bearer ${sparkApiKey}`,
        "X-SparkApi-User-Agent": "jpsrealtor.com",
        "Accept": "application/json"
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const results = data?.D?.Results || [];

    result.photoCount = results.length;
    result.success = true;

    // Get sample photo URLs
    if (results.length > 0) {
      result.samplePhotoUrls = results.slice(0, 3).map((photo: any) =>
        photo.Uri1024 || photo.Uri800 || photo.Uri640 || 'No URL'
      );
    }

    console.log(`✅ Success! Found ${results.length} photos`);

  } catch (error: any) {
    result.error = error.message;
    result.success = false;
    console.log(`❌ Failed: ${error.message}`);
  }

  return result;
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║           PHOTO FETCH TEST - ALL 8 MLS SOURCES               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  try {
    // Step 1: Get sample listings
    const samples = await getMlsSamples();
    await mongoose.disconnect();

    if (samples.length === 0) {
      console.log('\n❌ No sample listings found. Exiting.');
      process.exit(1);
    }

    console.log(`\n📋 Testing ${samples.length} listings...\n`);
    console.log('═'.repeat(70));

    // Step 2: Test photo fetching for each
    const results: PhotoTestResult[] = [];

    for (const listing of samples) {
      console.log(`\n📸 Testing: ${listing.mlsSource}`);
      console.log(`   Listing: ${listing.listingKey}`);
      console.log(`   MLS ID:  ${listing.mlsId}`);

      const result = await testPhotoFetch(listing);
      results.push(result);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Step 3: Print summary
    console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                        TEST SUMMARY                           ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ Successful: ${successful.length}/${results.length}`);
    console.log(`❌ Failed:     ${failed.length}/${results.length}\n`);

    if (successful.length > 0) {
      console.log('─'.repeat(70));
      console.log('✅ SUCCESSFUL FETCHES:\n');
      successful.forEach(r => {
        console.log(`  ${r.mlsSource.padEnd(25)} | ${r.photoCount.toString().padStart(3)} photos | ${r.city || 'N/A'}`);
        if (r.samplePhotoUrls && r.samplePhotoUrls.length > 0) {
          console.log(`     Sample: ${r.samplePhotoUrls[0].substring(0, 60)}...`);
        }
      });
    }

    if (failed.length > 0) {
      console.log('\n' + '─'.repeat(70));
      console.log('❌ FAILED FETCHES:\n');
      failed.forEach(r => {
        console.log(`  ${r.mlsSource.padEnd(25)} | Error: ${r.error}`);
        console.log(`     URL: ${r.sparkUrl}`);
      });
    }

    // Step 4: Detailed results
    console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                     DETAILED RESULTS                          ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    results.forEach((r, i) => {
      console.log(`${i + 1}. ${r.mlsSource}`);
      console.log(`   Status:      ${r.success ? '✅ Success' : '❌ Failed'}`);
      console.log(`   MLS ID:      ${r.mlsId}`);
      console.log(`   Listing Key: ${r.listingKey}`);
      console.log(`   Photos:      ${r.photoCount}`);
      if (r.city) console.log(`   City:        ${r.city}`);
      if (r.listPrice) console.log(`   Price:       $${r.listPrice.toLocaleString()}`);
      if (r.error) console.log(`   Error:       ${r.error}`);
      if (r.sparkUrl) console.log(`   Spark URL:   ${r.sparkUrl}`);
      console.log('');
    });

    // Final verdict
    console.log('═'.repeat(70));
    if (failed.length === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Photo fetching works for all MLSs.\n');
      process.exit(0);
    } else {
      console.log(`\n⚠️  ${failed.length} MLS(s) failed. Please review errors above.\n`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test script error:', error);
    process.exit(1);
  }
}

// Run the tests
main();
