// src/scripts/subdivisions/upload-to-mongodb.ts
// Upload enriched subdivisions to MongoDB

import { config } from "dotenv";
import * as path from "path";
import * as fs from "fs";
import mongoose from "mongoose";
import Subdivision from "../../models/subdivisions";

// Load environment variables
const envPath = path.join(__dirname, "../../../.env.local");
config({ path: envPath });

async function uploadToMongoDB() {
  console.log("📤 Starting MongoDB upload...\n");

  // Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("❌ MONGODB_URI not defined in environment");
    process.exit(1);
  }

  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB\n");

  // Read enriched subdivisions
  const enrichedFilePath = path.join(__dirname, "../../../local-logs/enriched-subdivisions.json");
  console.log("📖 Reading enriched subdivisions from:", enrichedFilePath);

  if (!fs.existsSync(enrichedFilePath)) {
    console.error("❌ Enriched subdivisions file not found");
    process.exit(1);
  }

  const subdivisions = JSON.parse(fs.readFileSync(enrichedFilePath, "utf-8"));
  console.log(`✅ Loaded ${subdivisions.length} subdivisions\n`);

  console.log("🗑️  Clearing existing subdivisions collection...");
  await Subdivision.deleteMany({});
  console.log("✅ Collection cleared\n");

  console.log("📤 Uploading subdivisions to MongoDB...");

  // Upload in batches for better performance
  const batchSize = 100;
  let uploaded = 0;
  let errors = 0;

  for (let i = 0; i < subdivisions.length; i += batchSize) {
    const batch = subdivisions.slice(i, i + batchSize);

    try {
      await Subdivision.insertMany(batch, { ordered: false });
      uploaded += batch.length;
      console.log(`   Uploaded ${uploaded}/${subdivisions.length} subdivisions...`);
    } catch (error: any) {
      // Handle duplicate key errors
      if (error.code === 11000) {
        const successCount = error.insertedDocs?.length || 0;
        uploaded += successCount;
        errors += batch.length - successCount;
        console.warn(`   ⚠️  Batch ${i / batchSize + 1}: ${successCount} inserted, ${batch.length - successCount} duplicates skipped`);
      } else {
        console.error(`   ❌ Batch ${i / batchSize + 1} error:`, error.message);
        errors += batch.length;
      }
    }
  }

  console.log(`\n📊 Upload Complete:`);
  console.log(`   ✅ Successfully uploaded: ${uploaded}`);
  if (errors > 0) {
    console.log(`   ⚠️  Errors/Duplicates: ${errors}`);
  }
  console.log(`   📦 Total in collection: ${await Subdivision.countDocuments()}\n`);

  // Verify upload
  console.log("🔍 Verifying data...");
  const sampleSubdivisions = await Subdivision.find()
    .sort({ listingCount: -1 })
    .limit(10)
    .select("name city region listingCount avgPrice hasManualData")
    .lean();

  console.log("\n📋 Top 10 Subdivisions by Listing Count:");
  sampleSubdivisions.forEach((sub, i) => {
    const manualFlag = sub.hasManualData ? "📝" : "  ";
    console.log(`   ${i + 1}. ${manualFlag} ${sub.name} (${sub.city}) - ${sub.listingCount} listings @ $${(sub.avgPrice / 1000).toFixed(0)}k`);
  });

  // Check indexes
  console.log("\n🔍 Checking indexes...");
  const indexes = await Subdivision.collection.indexes();
  console.log(`   ✅ ${indexes.length} indexes created`);
  indexes.forEach((index: any) => {
    console.log(`      - ${Object.keys(index.key).join(", ")}`);
  });

  // Disconnect
  await mongoose.disconnect();
  console.log("\n✅ Upload complete! Disconnected from MongoDB\n");
}

// Run upload
uploadToMongoDB().catch((error) => {
  console.error("❌ Error during upload:", error);
  process.exit(1);
});
