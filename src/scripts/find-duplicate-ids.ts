// Find duplicate _id values in unified_listings collection
// Usage: npx tsx src/scripts/find-duplicate-ids.ts

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("❌ MONGODB_URI not found in .env.local");
}

async function findDuplicates() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;
    if (!db) throw new Error("❌ Database handle undefined");

    const collection = db.collection("unified_listings");

    console.log("🔍 Searching for duplicate _id values...\n");

    // Aggregate to find duplicates
    const duplicates = await collection.aggregate([
      {
        $group: {
          _id: "$_id",
          count: { $sum: 1 },
          docs: { $push: { listingId: "$listingId", slug: "$slug", city: "$city" } }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 20
      }
    ]).toArray();

    if (duplicates.length === 0) {
      console.log("✅ No duplicate _id values found in unified_listings collection!");
      console.log("   The duplicate key error must be coming from somewhere else.");
    } else {
      console.log(`❌ Found ${duplicates.length} duplicate _id values:\n`);
      duplicates.forEach((dup, idx) => {
        console.log(`${idx + 1}. _id: ${dup._id}`);
        console.log(`   Count: ${dup.count} copies`);
        console.log(`   Listings:`, dup.docs);
        console.log("");
      });
    }

    // Also check for duplicate listingKey values
    console.log("\n🔍 Searching for duplicate listingKey values...\n");

    const dupKeys = await collection.aggregate([
      {
        $group: {
          _id: "$listingKey",
          count: { $sum: 1 },
          ids: { $push: "$_id" }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]).toArray();

    if (dupKeys.length === 0) {
      console.log("✅ No duplicate listingKey values found!");
    } else {
      console.log(`❌ Found ${dupKeys.length} duplicate listingKey values:\n`);
      dupKeys.forEach((dup, idx) => {
        console.log(`${idx + 1}. listingKey: ${dup._id}`);
        console.log(`   Count: ${dup.count} copies`);
        console.log(`   _ids:`, dup.ids);
        console.log("");
      });
    }

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

findDuplicates()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
