/**
 * Verify No Duplicate listingKeys in unified_listings Collection
 *
 * This script checks for duplicate listingKey values in the unified_listings collection
 * to confirm the data source has no duplicates.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

async function verifyNoDuplicateListingKeys() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collection = db?.collection('unified_listings');

    if (!collection) {
      throw new Error('Could not access unified_listings collection');
    }

    console.log('📊 Checking for duplicate listingKey values...\n');

    // Aggregation to find duplicate listingKeys
    const duplicates = await collection
      .aggregate([
        {
          $group: {
            _id: '$listingKey',
            count: { $sum: 1 },
            ids: { $push: '$_id' }
          }
        },
        {
          $match: {
            count: { $gt: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ])
      .toArray();

    if (duplicates.length === 0) {
      console.log('✅ NO DUPLICATE listingKey VALUES FOUND');
      console.log('   All listingKey values are unique in the database.\n');
    } else {
      console.log(`❌ FOUND ${duplicates.length} DUPLICATE listingKey VALUES:\n`);

      duplicates.forEach((dup, index) => {
        console.log(`${index + 1}. listingKey: "${dup._id}"`);
        console.log(`   Count: ${dup.count}`);
        console.log(`   MongoDB _id values:`);
        dup.ids.forEach((id: any) => {
          console.log(`     - ${id}`);
        });
        console.log('');
      });
    }

    // Also check total count
    const totalCount = await collection.countDocuments();
    const uniqueListingKeyCount = await collection.distinct('listingKey').then(arr => arr.length);

    console.log('📈 Summary:');
    console.log(`   Total documents: ${totalCount.toLocaleString()}`);
    console.log(`   Unique listingKeys: ${uniqueListingKeyCount.toLocaleString()}`);
    console.log(`   Difference: ${(totalCount - uniqueListingKeyCount).toLocaleString()}`);

    if (totalCount === uniqueListingKeyCount) {
      console.log('   ✅ Count matches - all listingKeys are unique');
    } else {
      console.log('   ❌ Count mismatch - duplicates exist');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

verifyNoDuplicateListingKeys();
