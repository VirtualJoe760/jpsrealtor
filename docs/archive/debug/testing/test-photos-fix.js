/**
 * Test Photos API Fix - Multi-MLS Photo Fetching
 *
 * Tests the /api/listings/[listingKey]/photos endpoint
 * to verify it correctly fetches photos using mlsId + Media expansion
 *
 * Run: node test-photos-fix.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const API_BASE = 'http://localhost:3000';

// MLS ID Reference (from docs)
const MLS_NAMES = {
  '20190211172710340762000000': 'GPS',
  '20200218121507636729000000': 'CRMLS',
  '20200630203341057545000000': 'CLAW',
  '20200630203518576361000000': 'SOUTHLAND',
  '20200630204544040064000000': 'HIGH_DESERT',
  '20200630204733042221000000': 'BRIDGE',
  '20160622112753445171000000': 'CONEJO_SIMI_MOORPARK',
  '20200630203206752718000000': 'ITECH',
};

async function testPhotoFetching() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         PHOTO FETCH TEST - Multi-MLS Verification           ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Connect to MongoDB
    console.log('>>> Connecting to MongoDB...\n');
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;

    // Get sample listing from each MLS
    console.log('>>> Fetching sample listings from each MLS...\n');

    const mlsIds = Object.keys(MLS_NAMES);
    const results = [];

    for (const mlsId of mlsIds) {
      const mlsName = MLS_NAMES[mlsId];

      // Get one Active listing from this MLS
      const listing = await db.collection('unified_listings').findOne({
        mlsId: mlsId,
        standardStatus: 'Active'
      });

      if (!listing) {
        console.log(`❌ ${mlsName.padEnd(25)} | No Active listings found`);
        continue;
      }

      console.log(`✅ ${mlsName.padEnd(25)} | Testing ${listing.listingKey}`);

      // Test photo fetch
      const photoUrl = `${API_BASE}/api/listings/${listing.listingKey}/photos`;

      try {
        const response = await fetch(photoUrl);
        const data = await response.json();

        results.push({
          mls: mlsName,
          mlsId: mlsId,
          listingKey: listing.listingKey,
          city: listing.city || 'N/A',
          success: response.ok,
          photoCount: data.count || 0,
          error: response.ok ? null : data.error
        });

        if (response.ok && data.count > 0) {
          console.log(`   ✓ Photos: ${data.count} | First URI: ${data.photos[0]?.uri1024?.substring(0, 60) || 'N/A'}...`);
        } else if (response.ok) {
          console.log(`   ⚠ Photos: 0 (no media available)`);
        } else {
          console.log(`   ✗ Error: ${data.error}`);
        }

      } catch (error) {
        console.log(`   ✗ Fetch failed: ${error.message}`);
        results.push({
          mls: mlsName,
          mlsId: mlsId,
          listingKey: listing.listingKey,
          city: listing.city || 'N/A',
          success: false,
          photoCount: 0,
          error: error.message
        });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Print summary
    console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                        TEST SUMMARY                           ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const withPhotos = results.filter(r => r.success && r.photoCount > 0);

    console.log(`✅ Successful API calls:  ${successful.length}/${results.length}`);
    console.log(`📸 Listings with photos:  ${withPhotos.length}/${results.length}`);
    console.log(`❌ Failed API calls:      ${failed.length}/${results.length}\n`);

    if (withPhotos.length > 0) {
      console.log('─'.repeat(70));
      console.log('✅ SUCCESSFUL PHOTO FETCHES:\n');
      withPhotos.forEach(r => {
        console.log(`  ${r.mls.padEnd(25)} | ${r.photoCount.toString().padStart(3)} photos | ${r.city}`);
      });
    }

    if (failed.length > 0) {
      console.log('\n' + '─'.repeat(70));
      console.log('❌ FAILED FETCHES:\n');
      failed.forEach(r => {
        console.log(`  ${r.mls.padEnd(25)} | Error: ${r.error}`);
      });
    }

    // Final verdict
    console.log('\n' + '═'.repeat(70));
    if (failed.length === 0 && withPhotos.length >= results.length * 0.8) {
      console.log('\n🎉 TEST PASSED! Photo fetching works correctly across all MLSs.\n');
      process.exit(0);
    } else if (failed.length === 0) {
      console.log('\n⚠️  TEST PARTIAL: API works but some listings have no photos.\n');
      process.exit(0);
    } else {
      console.log(`\n⚠️  TEST FAILED: ${failed.length} MLS(s) failed.\n`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test script error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run tests
testPhotoFetching();
