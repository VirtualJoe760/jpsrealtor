// List all MongoDB collections and their document counts
// Usage: npx tsx src/scripts/list-all-collections.ts

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("❌ MONGODB_URI not found in .env.local");
}

async function listCollections() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;
    if (!db) throw new Error("❌ Database handle undefined");

    console.log("📊 All Collections in Database:\n");
    console.log("=".repeat(70));

    const collections = await db.listCollections().toArray();

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = db.collection(collectionName);
      const count = await collection.countDocuments();

      console.log(`\n📁 ${collectionName}`);
      console.log(`   Documents: ${count.toLocaleString()}`);

      // If it's a listings-related collection, show more details
      if (collectionName.toLowerCase().includes('listing')) {
        const activeCount = await collection.countDocuments({ standardStatus: "Active" });
        console.log(`   Active: ${activeCount.toLocaleString()}`);
      }
    }

    console.log(`\n${"=".repeat(70)}`);
    console.log(`\nTotal collections: ${collections.length}`);

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

listCollections()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
