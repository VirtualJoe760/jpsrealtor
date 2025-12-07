// Check indexes on the CORRECT unified_listings collection (with underscore)
// Usage: npx tsx src/scripts/check-unified-listings-indexes.ts

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("❌ MONGODB_URI not found in .env.local");
}

async function checkIndexes() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;
    if (!db) throw new Error("❌ Database handle undefined");

    // Check BOTH collection names
    const collections = ['unified_listings', 'unifiedlistings'];

    for (const collectionName of collections) {
      console.log(`\n${"=".repeat(70)}`);
      console.log(`📊 Collection: ${collectionName}`);
      console.log("=".repeat(70));

      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        const activeCount = await collection.countDocuments({ standardStatus: "Active" });

        console.log(`\n📈 Document Counts:`);
        console.log(`   Total: ${count.toLocaleString()}`);
        console.log(`   Active: ${activeCount.toLocaleString()}`);

        console.log(`\n📋 Indexes:`);
        const indexes = await collection.indexes();
        indexes.forEach((index) => {
          console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
        });

        // Check if our critical index exists
        const hasCriticalIndex = indexes.some(idx => idx.name === 'idx_map_query_optimized');
        if (hasCriticalIndex) {
          console.log(`\n   ✅ Critical index 'idx_map_query_optimized' EXISTS`);
        } else {
          console.log(`\n   ❌ Critical index 'idx_map_query_optimized' MISSING`);
        }

      } catch (error: any) {
        console.log(`\n   ⚠️  Collection not found or error: ${error.message}`);
      }
    }

    console.log(`\n${"=".repeat(70)}`);
    console.log(`\n💡 Diagnosis:`);
    console.log(`   The API should be using: unified_listings (with underscore)`);
    console.log(`   We created indexes on: unifiedlistings (no underscore)`);
    console.log(`   Need to create indexes on the CORRECT collection!`);

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

checkIndexes()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
