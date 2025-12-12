/**
 * Backfill Missing GPS Coordinates
 *
 * Finds listings with missing latitude/longitude and geocodes them.
 *
 * Usage:
 * ```bash
 * npx ts-node src/scripts/geocoding/backfill-coordinates.ts
 * ```
 */

import mongoose from 'mongoose';
import UnifiedListing from '@/models/unified-listing';
import { geocodeAddress, hasValidCoordinates } from '@/lib/geocoding/geocode-service';

interface BackfillStats {
  total: number;
  missing: number;
  geocoded: number;
  failed: number;
  skipped: number;
}

/**
 * Main backfill function
 */
async function backfillCoordinates(options: {
  dryRun?: boolean;
  limit?: number;
  city?: string;
}) {
  const { dryRun = false, limit, city } = options;

  console.log('🗺️  GPS Coordinates Backfill');
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Limit: ${limit || 'All'}`);
  if (city) console.log(`   City filter: ${city}`);
  console.log('');

  // Connect to MongoDB
  if (!mongoose.connection.readyState) {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/real-estate');
    console.log('✅ Connected to MongoDB');
  }

  const stats: BackfillStats = {
    total: 0,
    missing: 0,
    geocoded: 0,
    failed: 0,
    skipped: 0,
  };

  // Find listings with missing coordinates
  const query: any = {
    $or: [
      { latitude: { $exists: false } },
      { latitude: null },
      { longitude: { $exists: false } },
      { longitude: null },
    ],
  };

  if (city) {
    query.city = new RegExp(`^${city}$`, 'i');
  }

  const missingCoords = await UnifiedListing.find(query)
    .select('listingId address city stateOrProvince postalCode latitude longitude')
    .limit(limit || 0)
    .lean();

  stats.total = await UnifiedListing.countDocuments(query);
  stats.missing = missingCoords.length;

  console.log(`📊 Found ${stats.missing} listings with missing coordinates (of ${stats.total} total)\n`);

  if (stats.missing === 0) {
    console.log('✅ No listings need geocoding!');
    return stats;
  }

  // Process each listing
  for (let i = 0; i < missingCoords.length; i++) {
    const listing = missingCoords[i];
    const progress = `[${i + 1}/${stats.missing}]`;

    console.log(`${progress} Processing: ${listing.address || 'No address'}`);

    // Skip if no address
    if (!listing.address) {
      console.log(`   ⚠️  Skipped: No address`);
      stats.skipped++;
      continue;
    }

    try {
      // Geocode the address
      const result = await geocodeAddress(
        listing.address,
        listing.city,
        listing.stateOrProvince,
        listing.postalCode
      );

      if (result) {
        console.log(
          `   ✅ Geocoded: ${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)} (${result.source}, ${result.confidence} confidence)`
        );

        if (!dryRun) {
          // Update the listing
          await UnifiedListing.updateOne(
            { _id: listing._id },
            {
              $set: {
                latitude: result.latitude,
                longitude: result.longitude,
                coordinates: {
                  type: 'Point',
                  coordinates: [result.longitude, result.latitude], // GeoJSON: [lng, lat]
                },
              },
            }
          );
        }

        stats.geocoded++;
      } else {
        console.log(`   ❌ Failed: Could not geocode`);
        stats.failed++;
      }
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      stats.failed++;
    }

    // Rate limiting: wait 1 second between requests
    if (i < missingCoords.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Backfill Complete!');
  console.log('='.repeat(60));
  console.log(`Total listings checked: ${stats.missing}`);
  console.log(`✅ Successfully geocoded: ${stats.geocoded}`);
  console.log(`❌ Failed: ${stats.failed}`);
  console.log(`⚠️  Skipped: ${stats.skipped}`);
  console.log(`Success rate: ${Math.round((stats.geocoded / stats.missing) * 100)}%`);
  console.log('');

  if (dryRun) {
    console.log('💡 This was a dry run. Run without --dry-run to apply changes.');
  }

  return stats;
}

/**
 * Run from command line
 */
async function main() {
  const args = process.argv.slice(2);

  const options = {
    dryRun: args.includes('--dry-run'),
    limit: args.includes('--limit')
      ? parseInt(args[args.indexOf('--limit') + 1])
      : undefined,
    city: args.includes('--city') ? args[args.indexOf('--city') + 1] : undefined,
  };

  try {
    await backfillCoordinates(options);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { backfillCoordinates };
export type { BackfillStats };
