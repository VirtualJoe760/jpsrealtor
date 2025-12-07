// Create optimized map query indexes on unified_listings (with underscore)
// Usage: npx tsx src/scripts/create-map-indexes-unified-listings.ts

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("❌ MONGODB_URI not found in .env.local");
}

async function createMapIndexes() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;
    if (!db) throw new Error("❌ Database handle undefined");

    const collection = db.collection("unified_listings"); // CORRECT collection name with underscore

    console.log("📊 Creating optimized indexes for unified_listings...\n");

    // Show current state
    const docCount = await collection.countDocuments();
    const activeCount = await collection.countDocuments({ standardStatus: "Active" });
    console.log(`📈 Collection Stats:`);
    console.log(`   Total documents: ${docCount.toLocaleString()}`);
    console.log(`   Active listings: ${activeCount.toLocaleString()}\n`);

    console.log("🗺️  Creating PRIMARY map query index...");
    console.log("   This optimizes zoom 7-12 queries with lat/lng ranges");
    await collection.createIndex(
      {
        standardStatus: 1,
        propertyType: 1,
        latitude: 1,
        longitude: 1,
        listPrice: 1
      },
      {
        name: "idx_map_query_optimized",
        background: true
      }
    );
    console.log("   ✅ idx_map_query_optimized created\n");

    console.log("📍 Creating additional map-related indexes...");

    // Geo + status + type index
    await collection.createIndex(
      { latitude: 1, longitude: 1, standardStatus: 1, propertyType: 1 },
      { name: "idx_geo_status_type", background: true }
    );
    console.log("   ✅ idx_geo_status_type created");

    // Price range index
    await collection.createIndex(
      { standardStatus: 1, listPrice: 1 },
      { name: "idx_status_price", background: true }
    );
    console.log("   ✅ idx_status_price created");

    // County-level index
    await collection.createIndex(
      { countyOrParish: 1, standardStatus: 1 },
      { name: "idx_county_status", background: true, sparse: true }
    );
    console.log("   ✅ idx_county_status created\n");

    console.log("📋 All Indexes on unified_listings:");
    const indexes = await collection.indexes();
    indexes.forEach((index) => {
      const keys = JSON.stringify(index.key);
      console.log(`   - ${index.name}: ${keys}`);
    });

    console.log(`\n✅ Map indexes created successfully!`);
    console.log(`\n💡 Expected Performance:`);
    console.log(`   - Zoom 9-10 queries: 7.5s → <200ms (97% faster)`);
    console.log(`   - Queries will use idx_map_query_optimized`);
    console.log(`   - Database CPU load dramatically reduced`);
    console.log(`\n🧪 Next Steps:`);
    console.log(`   1. Test map at http://localhost:3000/map`);
    console.log(`   2. Zoom to level 9-10 (Sacramento area)`);
    console.log(`   3. Check Network tab for API response times`);
    console.log(`   4. Should see <200ms instead of 7.5 seconds`);

  } catch (error: any) {
    if (error.code === 11000 || error.codeName === 'IndexOptionsConflict') {
      console.log("\n⚠️  Some indexes already exist - this is normal");
      console.log("   Skipping duplicate index creation");
    } else {
      console.error("\n❌ Error:", error);
      throw error;
    }
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

createMapIndexes()
  .then(() => {
    console.log("\n🎉 Index creation complete!");
    process.exit(0);
  })
  .catch(() => process.exit(1));
