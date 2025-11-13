// src/scripts/subdivisions/assign-photos.ts
// Better photo assignment with flexible matching

import { config } from "dotenv";
import * as path from "path";
import * as fs from "fs";
import mongoose from "mongoose";
import { Listing } from "../../models/listings";
import { CRMLSListing } from "../../models/crmls-listings";

// Load environment variables
const envPath = path.join(__dirname, "../../../.env.local");
config({ path: envPath });

interface EnrichedSubdivision {
  name: string;
  city: string;
  photo?: string;
  mlsSources: string[];
  [key: string]: any;
}

// Main photo assignment function
async function assignPhotos() {
  console.log("📸 Starting photo assignment with flexible matching...\n");

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
    console.error("❌ Enriched subdivisions file not found:", enrichedFilePath);
    process.exit(1);
  }

  const subdivisions: EnrichedSubdivision[] = JSON.parse(fs.readFileSync(enrichedFilePath, "utf-8"));
  console.log(`✅ Loaded ${subdivisions.length} subdivisions\n`);

  // Count subdivisions missing photos
  const missingPhotos = subdivisions.filter(s => !s.photo);
  console.log(`🔍 Found ${missingPhotos.length} subdivisions missing photos\n`);

  let photosAssigned = 0;

  for (let i = 0; i < missingPhotos.length; i++) {
    const sub = missingPhotos[i];
    if (!sub) continue;

    const progress = `[${i + 1}/${missingPhotos.length}]`;

    console.log(`${progress} 📸 Searching for photo: ${sub.name} (${sub.city})...`);

    try {
      let listing = null;

      // Strategy 1: Exact match on subdivisionName and city
      if (sub.mlsSources.includes("GPS")) {
        listing = await Listing.findOne({
          subdivisionName: sub.name,
          city: sub.city,
          standardStatus: "Active",
          primaryPhotoUrl: { $exists: true, $nin: [null, ""] },
        })
          .sort({ listPrice: -1 })
          .lean();
      }

      if (!listing && sub.mlsSources.includes("CRMLS")) {
        listing = await CRMLSListing.findOne({
          subdivisionName: sub.name,
          city: sub.city,
          standardStatus: "Active",
          primaryPhotoUrl: { $exists: true, $nin: [null, ""] },
        })
          .sort({ listPrice: -1 })
          .lean();
      }

      // Strategy 2: Case-insensitive regex match
      if (!listing && sub.mlsSources.includes("GPS")) {
        listing = await Listing.findOne({
          subdivisionName: { $regex: new RegExp(`^${escapeRegex(sub.name)}$`, "i") },
          city: { $regex: new RegExp(`^${escapeRegex(sub.city)}$`, "i") },
          standardStatus: "Active",
          primaryPhotoUrl: { $exists: true, $nin: [null, ""] },
        })
          .sort({ listPrice: -1 })
          .lean();
      }

      if (!listing && sub.mlsSources.includes("CRMLS")) {
        listing = await CRMLSListing.findOne({
          subdivisionName: { $regex: new RegExp(`^${escapeRegex(sub.name)}$`, "i") },
          city: { $regex: new RegExp(`^${escapeRegex(sub.city)}$`, "i") },
          standardStatus: "Active",
          primaryPhotoUrl: { $exists: true, $nin: [null, ""] },
        })
          .sort({ listPrice: -1 })
          .lean();
      }

      // Strategy 3: For Non-HOA subdivisions, just search by city
      if (!listing && sub.name.startsWith("Non-HOA ")) {
        const cityName = sub.name.replace("Non-HOA ", "");

        if (sub.mlsSources.includes("GPS")) {
          listing = await Listing.findOne({
            city: { $regex: new RegExp(`^${escapeRegex(cityName)}$`, "i") },
            standardStatus: "Active",
            primaryPhotoUrl: { $exists: true, $nin: [null, ""] },
            $or: [
              { subdivisionName: { $exists: false } },
              { subdivisionName: null },
              { subdivisionName: "" },
              { subdivisionName: { $regex: /^(not applicable|n\/?a|none)$/i } },
            ],
          })
            .sort({ listPrice: -1 })
            .lean();
        }

        if (!listing && sub.mlsSources.includes("CRMLS")) {
          listing = await CRMLSListing.findOne({
            city: { $regex: new RegExp(`^${escapeRegex(cityName)}$`, "i") },
            standardStatus: "Active",
            primaryPhotoUrl: { $exists: true, $nin: [null, ""] },
            $or: [
              { subdivisionName: { $exists: false } },
              { subdivisionName: null },
              { subdivisionName: "" },
              { subdivisionName: { $regex: /^(not applicable|n\/?a|none)$/i } },
            ],
          })
            .sort({ listPrice: -1 })
            .lean();
        }
      }

      if (listing && listing.primaryPhotoUrl) {
        sub.photo = listing.primaryPhotoUrl;
        photosAssigned++;
        console.log(`   ✅ Assigned photo (${listing.listPrice ? `$${(listing.listPrice / 1000).toFixed(0)}k` : "N/A"})`);
      } else {
        console.log(`   ⚠️  No listing with photo found`);
      }
    } catch (error) {
      console.error(`   ❌ Error:`, error instanceof Error ? error.message : "Unknown error");
    }
  }

  console.log(`\n📊 Photo Assignment Results:`);
  console.log(`   Total Subdivisions: ${subdivisions.length}`);
  console.log(`   Had Photos: ${subdivisions.length - missingPhotos.length}`);
  console.log(`   📸 Photos Newly Assigned: ${photosAssigned}`);
  console.log(`   ✅ Now Have Photos: ${subdivisions.filter(s => s.photo).length}`);
  console.log(`   ⚠️  Still Missing Photos: ${subdivisions.filter(s => !s.photo).length}\n`);

  // Write updated data
  const outputPath = path.join(__dirname, "../../../local-logs/enriched-subdivisions.json");
  fs.writeFileSync(outputPath, JSON.stringify(subdivisions, null, 2));
  console.log(`✅ Updated data written to: ${outputPath}\n`);

  // Disconnect from MongoDB
  await mongoose.disconnect();
  console.log("✅ Photo assignment complete!\n");
}

// Helper: Escape special regex characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Run photo assignment
assignPhotos().catch((error) => {
  console.error("❌ Error during photo assignment:", error);
  process.exit(1);
});
