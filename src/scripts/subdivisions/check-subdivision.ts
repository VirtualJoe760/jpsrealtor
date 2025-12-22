// Quick script to check a subdivision's data
import { config } from "dotenv";
import * as path from "path";
import mongoose from "mongoose";
import UnifiedListing from "../../models/unified-listing";
import { CRMLSListing } from "../../models/crmls-listings";

const envPath = path.join(__dirname, "../../../.env.local");
config({ path: envPath });

async function checkSubdivision() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("❌ MONGODB_URI not defined");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  // Check Sun City Shadow Hills
  const subdivisionName = "Sun City Shadow Hills";
  const city = "Indio";

  console.log(`\n🔍 Checking "${subdivisionName}" in ${city}...\n`);

  // GPS listings
  const gpsListings = await UnifiedListing.find({
    subdivisionName: { $regex: new RegExp(`^${subdivisionName}$`, "i") },
    city,
    standardStatus: "Active",
  })
    .limit(5)
    .select({
      subdivisionName: 1,
      address: 1,
      listPrice: 1,
      associationFee: 1,
      associationFee2: 1,
      associationName: 1,
      associationName2: 1,
      communityFeatures: 1,
      primaryPhotoUrl: 1,
    })
    .lean();

  console.log(`📊 GPS Listings: ${gpsListings.length}`);
  if (gpsListings.length > 0) {
    console.log("\nSample GPS Listing:");
    console.log(JSON.stringify(gpsListings[0], null, 2));
  }

  // CRMLS listings
  const crmlsListings = await CRMLSListing.find({
    subdivisionName: { $regex: new RegExp(`^${subdivisionName}$`, "i") },
    city,
    standardStatus: "Active",
  })
    .limit(5)
    .select({
      subdivisionName: 1,
      address: 1,
      listPrice: 1,
      associationFee: 1,
      communityFeatures: 1,
      primaryPhotoUrl: 1,
    })
    .lean();

  console.log(`\n📊 CRMLS Listings: ${crmlsListings.length}`);
  if (crmlsListings.length > 0) {
    console.log("\nSample CRMLS Listing:");
    console.log(JSON.stringify(crmlsListings[0], null, 2));
  }

  // Check for listings with photos - GPS
  const gpsWithPhotos = await UnifiedListing.find({
    subdivisionName: { $regex: new RegExp(`^${subdivisionName}$`, "i") },
    city,
    standardStatus: "Active",
    primaryPhotoUrl: { $exists: true, $nin: [null, ""] },
  })
    .sort({ listPrice: -1 })
    .limit(3)
    .select({ address: 1, listPrice: 1, primaryPhotoUrl: 1 })
    .lean();

  console.log(`\n📸 GPS Listings with photos: ${gpsWithPhotos.length}`);
  if (gpsWithPhotos.length > 0) {
    gpsWithPhotos.forEach((l, i) => {
      console.log(`   ${i + 1}. ${l.address} - $${l.listPrice?.toLocaleString()}`);
      console.log(`       Photo: ${l.primaryPhotoUrl}`);
    });
  }

  // Check for listings with photos - CRMLS
  const crmlsWithPhotos = await CRMLSListing.find({
    subdivisionName: { $regex: new RegExp(`^${subdivisionName}$`, "i") },
    city,
    standardStatus: "Active",
    primaryPhotoUrl: { $exists: true, $nin: [null, ""] },
  })
    .sort({ listPrice: -1 })
    .limit(3)
    .select({ address: 1, listPrice: 1, primaryPhotoUrl: 1 })
    .lean();

  console.log(`\n📸 CRMLS Listings with photos: ${crmlsWithPhotos.length}`);
  if (crmlsWithPhotos.length > 0) {
    crmlsWithPhotos.forEach((l, i) => {
      console.log(`   ${i + 1}. ${l.address} - $${l.listPrice?.toLocaleString()}`);
      console.log(`       Photo: ${l.primaryPhotoUrl}`);
    });
  }

  await mongoose.disconnect();
}

checkSubdivision().catch(console.error);
