// Safe migration from 'listings' to 'unifiedlistings' with duplicate handling
// Usage: npx tsx src/scripts/migrate-to-unifiedlistings-safe.ts

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("❌ MONGODB_URI not found in .env.local");
}

async function safeMigrateToUnifiedListings() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;
    if (!db) throw new Error("❌ Database handle undefined");

    const listingsCollection = db.collection("listings");
    const unifiedCollection = db.collection("unifiedlistings");

    // Check current state
    const listingsCount = await listingsCollection.countDocuments();
    const unifiedCount = await unifiedCollection.countDocuments();

    console.log("📊 Current State:");
    console.log(`   listings collection: ${listingsCount.toLocaleString()} documents`);
    console.log(`   unifiedlistings collection: ${unifiedCount.toLocaleString()} documents\n`);

    if (listingsCount === 0) {
      console.log("❌ Source collection (listings) is empty! Nothing to migrate.");
      return;
    }

    console.log("🚀 Starting safe migration (skipping duplicates)...\n");

    const BATCH_SIZE = 100;
    let totalMigrated = 0;
    let totalSkipped = 0;
    let batch = 1;

    // Stream documents
    const cursor = listingsCollection.find({});

    let documents: any[] = [];

    for await (const doc of cursor) {
      documents.push(doc);

      if (documents.length >= BATCH_SIZE) {
        // Insert batch one by one to handle duplicates
        let batchMigrated = 0;
        let batchSkipped = 0;

        for (const document of documents) {
          try {
            await unifiedCollection.insertOne(document);
            batchMigrated++;
          } catch (error: any) {
            if (error.code === 11000) {
              // Duplicate key - skip
              batchSkipped++;
            } else {
              throw error;
            }
          }
        }

        totalMigrated += batchMigrated;
        totalSkipped += batchSkipped;

        console.log(`   ✅ Batch ${batch}: +${batchMigrated} migrated, ${batchSkipped} skipped (Total: ${totalMigrated} migrated, ${totalSkipped} skipped)`);

        documents = [];
        batch++;
      }
    }

    // Insert remaining documents
    if (documents.length > 0) {
      let batchMigrated = 0;
      let batchSkipped = 0;

      for (const document of documents) {
        try {
          await unifiedCollection.insertOne(document);
          batchMigrated++;
        } catch (error: any) {
          if (error.code === 11000) {
            batchSkipped++;
          } else {
            throw error;
          }
        }
      }

      totalMigrated += batchMigrated;
      totalSkipped += batchSkipped;
      console.log(`   ✅ Batch ${batch}: +${batchMigrated} migrated, ${batchSkipped} skipped (Total: ${totalMigrated} migrated, ${totalSkipped} skipped)`);
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Migrated: ${totalMigrated.toLocaleString()} documents`);
    console.log(`   Skipped (duplicates): ${totalSkipped.toLocaleString()} documents`);
    console.log(`   Total processed: ${(totalMigrated + totalSkipped).toLocaleString()} / ${listingsCount.toLocaleString()}`);

    // Verify
    const finalCount = await unifiedCollection.countDocuments();
    console.log(`\n📊 Final count in unifiedlistings: ${finalCount.toLocaleString()}`);

    // Check active listings
    const activeCount = await unifiedCollection.countDocuments({ standardStatus: "Active" });
    console.log(`   Active listings: ${activeCount.toLocaleString()}`);

    // Check type A (sale)
    const typeACount = await unifiedCollection.countDocuments({
      standardStatus: "Active",
      propertyType: "A"
    });
    console.log(`   Active sale listings (propertyType=A): ${typeACount.toLocaleString()}`);

    console.log(`\n💡 Next Steps:`);
    console.log(`   1. Indexes are already created ✅`);
    console.log(`   2. Data migration complete ✅`);
    console.log(`   3. Test the map at http://localhost:3000/map`);
    console.log(`   4. Expected: <200ms API response times with index usage`);

  } catch (error) {
    console.error("\n❌ Migration error:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

safeMigrateToUnifiedListings()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
