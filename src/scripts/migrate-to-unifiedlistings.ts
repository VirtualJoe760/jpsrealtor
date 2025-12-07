// Migrate data from 'listings' collection to 'unifiedlistings' collection
// Usage: npx tsx src/scripts/migrate-to-unifiedlistings.ts

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("❌ MONGODB_URI not found in .env.local");
}

async function migrateToUnifiedListings() {
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

    if (unifiedCount > 0) {
      console.log("⚠️  Target collection (unifiedlistings) already has data.");
      console.log("   This script will ADD documents, not replace them.");
      console.log("   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n");
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    console.log("🚀 Starting migration...\n");

    const BATCH_SIZE = 500;
    let totalMigrated = 0;
    let batch = 1;

    // Stream documents in batches
    const cursor = listingsCollection.find({});

    let documents: any[] = [];

    for await (const doc of cursor) {
      documents.push(doc);

      if (documents.length >= BATCH_SIZE) {
        // Insert batch
        await unifiedCollection.insertMany(documents, { ordered: false });
        totalMigrated += documents.length;

        console.log(`   ✅ Batch ${batch}: Migrated ${documents.length} documents (Total: ${totalMigrated}/${listingsCount})`);

        documents = [];
        batch++;
      }
    }

    // Insert remaining documents
    if (documents.length > 0) {
      await unifiedCollection.insertMany(documents, { ordered: false });
      totalMigrated += documents.length;
      console.log(`   ✅ Batch ${batch}: Migrated ${documents.length} documents (Total: ${totalMigrated}/${listingsCount})`);
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Migrated ${totalMigrated.toLocaleString()} documents from 'listings' to 'unifiedlistings'`);

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
    console.log(`   1. Indexes are already created (ran earlier script)`);
    console.log(`   2. Test the map at http://localhost:3000/map`);
    console.log(`   3. Zoom to level 9-10 and check performance`);
    console.log(`   4. Expected: <200ms API response times`);

  } catch (error: any) {
    if (error.code === 11000) {
      console.error("\n❌ Duplicate key error - some documents already exist in unifiedlistings");
      console.error("   This is normal if re-running migration");
    } else {
      console.error("\n❌ Migration error:", error);
      throw error;
    }
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

migrateToUnifiedListings()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
