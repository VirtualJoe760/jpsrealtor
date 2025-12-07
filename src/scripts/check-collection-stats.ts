// Check UnifiedListings collection stats
// Usage: npx tsx src/scripts/check-collection-stats.ts

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("❌ MONGODB_URI not found in .env.local");
}

async function checkCollectionStats() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;
    if (!db) throw new Error("❌ Database handle undefined");

    console.log("📊 Collection Statistics\n");
    console.log("=".repeat(60));

    // Check unifiedlistings collection
    const unifiedCollection = db.collection("unifiedlistings");
    const unifiedCount = await unifiedCollection.countDocuments();
    console.log(`\n🗂️  unifiedlistings collection:`);
    console.log(`   Total documents: ${unifiedCount.toLocaleString()}`);

    if (unifiedCount > 0) {
      // Sample document
      const sampleDoc = await unifiedCollection.findOne({});
      console.log(`\n   Sample document fields:`);
      console.log(`   ${JSON.stringify(Object.keys(sampleDoc || {}), null, 2)}`);

      // Count active listings
      const activeCount = await unifiedCollection.countDocuments({ standardStatus: "Active" });
      console.log(`\n   Active listings: ${activeCount.toLocaleString()}`);

      // Count by property type
      const typeACoun = await unifiedCollection.countDocuments({
        standardStatus: "Active",
        propertyType: "A"
      });
      console.log(`   Active propertyType=A: ${typeACoun.toLocaleString()}`);

      // Count in test area (Sacramento)
      const testAreaCount = await unifiedCollection.countDocuments({
        standardStatus: "Active",
        propertyType: "A",
        latitude: { $gte: 38.46, $lte: 38.65 },
        longitude: { $gte: -121.90, $lte: -120.87 }
      });
      console.log(`   In test area (Sacramento): ${testAreaCount.toLocaleString()}`);
    } else {
      console.log("\n   ⚠️  Collection is EMPTY!");
    }

    // Check listings collection (old one)
    console.log(`\n${"=".repeat(60)}\n`);
    const listingsCollection = db.collection("listings");
    const listingsCount = await listingsCollection.countDocuments();
    console.log(`🗂️  listings collection (old):`);
    console.log(`   Total documents: ${listingsCount.toLocaleString()}`);

    if (listingsCount > 0) {
      const activeListingsCount = await listingsCollection.countDocuments({ standardStatus: "Active" });
      console.log(`   Active listings: ${activeListingsCount.toLocaleString()}`);
    }

    console.log(`\n${"=".repeat(60)}`);

    console.log(`\n💡 Diagnosis:`);
    if (unifiedCount === 0) {
      console.log(`   ❌ unifiedlistings collection is EMPTY!`);
      console.log(`   ❌ This explains the 7.5 second queries - API is querying empty collection`);
      console.log(`   📌 Action needed: Migrate data from 'listings' to 'unifiedlistings'`);
    } else if (unifiedCount < listingsCount) {
      console.log(`   ⚠️  unifiedlistings has fewer docs than listings`);
      console.log(`   📌 May need to complete data migration`);
    } else {
      console.log(`   ✅ unifiedlistings collection is populated`);
    }

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

checkCollectionStats()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
