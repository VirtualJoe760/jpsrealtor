// src/scripts/testListingModel.ts
import dbConnect from "@/lib/mongoose";
import UnifiedListing from "@/models/unified-listing";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

async function testListingModel() {
  await dbConnect();

  const sample = await UnifiedListing.findOne({}, null, { lean: true });
  if (!sample) {
    console.error("❌ No listings found in the database.");
    return;
  }

  // ✅ Define output path
  const outputDir = resolve(__dirname, "../../local-logs");
  const outputPath = resolve(outputDir, "model.json");

  // ✅ Ensure directory exists
  mkdirSync(outputDir, { recursive: true });

  // ✅ Write to model.json
  writeFileSync(outputPath, JSON.stringify(sample, null, 2), "utf-8");
  console.log(`📄 Sample listing written to ${outputPath}`);

  // Optional: Check for required fields
  const requiredFields = [
    "listingId",
    "slug",
    "slugAddress",
    "address",
    "propertyTypeLabel",
    "listPrice",
    "latitude",
    "longitude",
  ];

  const missing = requiredFields.filter((key) => !(key in sample));
  if (missing.length > 0) {
    console.warn("⚠️ Missing fields:", missing);
  } else {
    console.log("🎯 All required fields are present.");
  }
}

testListingModel().catch((err) => {
  console.error("❌ Error testing listing model:", err);
});
