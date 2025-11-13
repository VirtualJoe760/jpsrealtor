// src/scripts/subdivisions/comprehensive-enrich.ts
// Comprehensive enrichment with manual data priority, photos from Spark API, enhanced descriptions

import { config } from "dotenv";
import * as path from "path";
import * as fs from "fs";
import mongoose from "mongoose";
import { Listing } from "../../models/listings";
import { CRMLSListing } from "../../models/crmls-listings";
import { fetchListingPhotos } from "../../app/utils/spark/photos";

const envPath = path.join(__dirname, "../../../.env.local");
config({ path: envPath });

interface ManualSubdivision {
  name: string;
  description?: string;
  photo?: string;
  features?: string[];
  keywords?: string[];
  slug: string;
  location?: string;
}

interface MergedSubdivision {
  name: string;
  city: string;
  region: string;
  county: string;
  listingCount: number;
  avgPrice: number;
  mlsSources: string[];
  propertyTypes?: any;
  seniorCommunity?: boolean;
  communityFeatures?: string;
  description?: string;
  photo?: string;
  features?: string[];
  keywords?: string[];
  hasManualData: boolean;
  [key: string]: any;
}

// Helper functions
function formatPrice(price: number): string {
  if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
  return `$${(price / 1000).toFixed(0)}k`;
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "");
}

function getCityFromLocation(location: string): string {
  const match = location.match(/([^,]+)/);
  if (match && match[1]) {
    const city = match[1].trim();
    if (city.includes("Palm Springs")) return "Palm Springs";
    if (city.includes("La Quinta")) return "La Quinta";
    return city;
  }
  return location;
}

async function generateEnhancedDescription(
  sub: MergedSubdivision,
  hoaData: { avgFee?: number; hasDualHOA: boolean; amenities: Set<string> }
): Promise<string> {
  const isNonHOA = sub.name.startsWith("Non-HOA ");
  const priceStr = formatPrice(sub.avgPrice);
  const listingCountStr = sub.listingCount === 1 ? "listing" : "listings";

  if (isNonHOA) {
    return `${sub.name} encompasses the diverse properties in ${sub.city}, ${sub.region}, that are not part of a homeowners association. With ${sub.listingCount} active ${listingCountStr} averaging ${priceStr}, this area offers flexibility and independence for homeowners seeking properties without HOA restrictions or fees. These homes provide a range of architectural styles and lot sizes, perfect for those who value autonomy in their property decisions and outdoor living spaces.`;
  }

  // Build amenity list
  const amenities: string[] = [];

  if (sub.seniorCommunity) {
    amenities.push("a 55+ active adult community");
  }

  // From community features
  if (sub.communityFeatures) {
    const features = sub.communityFeatures.toLowerCase();
    if (features.includes("golf")) amenities.push("championship golf courses");
    if (features.includes("pool")) amenities.push("resort-style pools");
    if (features.includes("tennis")) amenities.push("tennis courts");
    if (features.includes("pickle")) amenities.push("pickleball courts");
    if (features.includes("fitness") || features.includes("gym")) amenities.push("state-of-the-art fitness center");
    if (features.includes("clubhouse")) amenities.push("elegant clubhouse");
    if (features.includes("spa")) amenities.push("spa facilities");
    if (features.includes("dog park")) amenities.push("dog park");
    if (features.includes("lake")) amenities.push("scenic lake");
    if (features.includes("hiking") || features.includes("trails")) amenities.push("walking and hiking trails");
  }

  // From HOA amenity data
  for (const amenity of hoaData.amenities) {
    const lower = amenity.toLowerCase();
    if (!amenities.some(a => a.includes(lower))) {
      amenities.push(lower);
    }
  }

  const amenityStr = amenities.length > 0
    ? ` This exclusive community features ${amenities.slice(0, 5).join(", ")}, providing residents with an exceptional lifestyle.`
    : "";

  const propertyTypeStr = getPropertyTypeDescription(sub.propertyTypes);

  // HOA info
  const hoaStr = hoaData.avgFee
    ? ` The community has ${hoaData.hasDualHOA ? "dual HOA associations with" : "an HOA with"} average monthly fees of approximately $${Math.round(hoaData.avgFee)}, covering maintenance and amenities.`
    : "";

  return `${sub.name} is ${propertyTypeStr} in ${sub.city}, ${sub.region}, offering residents an exceptional living experience in one of Southern California's most desirable locations.${amenityStr} With ${sub.listingCount} active ${listingCountStr} averaging ${priceStr}, this community provides a perfect blend of comfort, convenience, and quality lifestyle.${hoaStr}`;
}

function getPropertyTypeDescription(propertyTypes?: any): string {
  if (!propertyTypes) return "a residential community";
  const total = (propertyTypes.residential || 0) + (propertyTypes.lease || 0) + (propertyTypes.multiFamily || 0);
  const resPct = ((propertyTypes.residential || 0) / total) * 100;
  const leasePct = ((propertyTypes.lease || 0) / total) * 100;
  const multiFamPct = ((propertyTypes.multiFamily || 0) / total) * 100;

  if (resPct > 80) return "a premier residential community";
  if (leasePct > 60) return "a rental community";
  if (multiFamPct > 50) return "a multi-family community";
  return "a mixed-use community";
}

async function getHOAData(sub: MergedSubdivision) {
  const hoaData = {
    avgFee: undefined as number | undefined,
    hasDualHOA: false,
    amenities: new Set<string>(),
  };

  try {
    if (sub.mlsSources.includes("GPS")) {
      const gpsListings = await Listing.find({
        subdivisionName: sub.name,
        city: sub.city,
        standardStatus: "Active",
      })
        .select({ associationFee: 1, associationFee2: 1, communityFeatures: 1 })
        .limit(20)
        .lean();

      let totalFees = 0;
      let feeCount = 0;

      for (const listing of gpsListings) {
        if (listing.associationFee && Number(listing.associationFee) > 0) {
          totalFees += Number(listing.associationFee);
          feeCount++;
        }
        if (listing.communityFeatures) {
          const features = listing.communityFeatures.split(",").map((f: string) => f.trim());
          features.forEach((f: string) => hoaData.amenities.add(f));
        }
      }

      if (feeCount > 0) {
        hoaData.avgFee = totalFees / feeCount;
      }
    }

    if (sub.mlsSources.includes("CRMLS")) {
      const crmlsListings = await CRMLSListing.find({
        subdivisionName: sub.name,
        city: sub.city,
        standardStatus: "Active",
      })
        .select({ associationFee: 1, communityFeatures: 1 })
        .limit(20)
        .lean();

      let totalFees = 0;
      let feeCount = 0;

      for (const listing of crmlsListings) {
        if (listing.associationFee && Number(listing.associationFee) > 0) {
          totalFees += Number(listing.associationFee);
          feeCount++;
        }
        if (listing.communityFeatures) {
          const features = listing.communityFeatures.split(",").map((f: string) => f.trim());
          features.forEach((f: string) => hoaData.amenities.add(f));
        }
      }

      if (feeCount > 0) {
        if (hoaData.avgFee) {
          hoaData.avgFee = (hoaData.avgFee + totalFees / feeCount) / 2;
        } else {
          hoaData.avgFee = totalFees / feeCount;
        }
      }
    }
  } catch (error) {
    console.error("Error fetching HOA data:", error);
  }

  return hoaData;
}

async function fetchPhotoFromSparkAPI(sub: MergedSubdivision): Promise<string | null> {
  try {
    // Find a listing to get photos from
    let listing: any = null;

    if (sub.mlsSources.includes("GPS")) {
      listing = await Listing.findOne({
        subdivisionName: sub.name,
        city: sub.city,
        standardStatus: "Active",
      })
        .sort({ listPrice: -1 })
        .select({ slug: 1 })
        .lean();
    }

    if (!listing && sub.mlsSources.includes("CRMLS")) {
      listing = await CRMLSListing.findOne({
        subdivisionName: sub.name,
        city: sub.city,
        standardStatus: "Active",
      })
        .sort({ listPrice: -1 })
        .select({ slug: 1, listingId: 1 })
        .lean();
    }

    if (!listing) return null;

    // Fetch photos from Spark API
    const photos = await fetchListingPhotos(listing.slug || listing.listingId);

    if (Array.isArray(photos) && photos.length > 0) {
      const photo = photos[0];
      return photo.Uri1600 || photo.Uri1280 || photo.Uri1024 || photo.Uri800 || photo.Uri640 || null;
    }
  } catch (error) {
    // Silent fail - photo fetching is optional
  }

  return null;
}

async function comprehensiveEnrich() {
  console.log("🎨 Comprehensive Enrichment Starting...\n");

  await mongoose.connect(process.env.MONGODB_URI!);
  console.log("✅ Connected to MongoDB\n");

  // Read merged subdivisions
  const mergedFilePath = path.join(__dirname, "../../../local-logs/merged-subdivisions.json");
  const subdivisions: MergedSubdivision[] = JSON.parse(fs.readFileSync(mergedFilePath, "utf-8"));
  console.log(`✅ Loaded ${subdivisions.length} subdivisions\n`);

  // Read manual JSON files
  const constantsDir = path.join(__dirname, "../../app/constants/subdivisions");
  const jsonFiles = fs.readdirSync(constantsDir).filter(f => f.endsWith(".json"));
  const manualDataMap = new Map<string, ManualSubdivision & { sourceFile: string }>();

  for (const file of jsonFiles) {
    const data: ManualSubdivision[] = JSON.parse(fs.readFileSync(path.join(constantsDir, file), "utf-8"));
    for (const sub of data) {
      const city = sub.location ? getCityFromLocation(sub.location) : "";
      const key = `${normalizeName(sub.name)}-${normalizeName(city)}`;
      manualDataMap.set(key, { ...sub, sourceFile: file });
    }
  }

  console.log(`✅ Loaded ${manualDataMap.size} manual subdivisions\n`);
  console.log("🔄 Enriching subdivisions...\n");

  let photoCount = 0;
  let descriptionCount = 0;

  for (let i = 0; i < subdivisions.length; i++) {
    const sub = subdivisions[i];
    if (!sub) continue;

    const progress = `[${i + 1}/${subdivisions.length}]`;

    // Check for manual data
    const key = `${sub.normalizedName}-${normalizeName(sub.city)}`;
    const manualData = manualDataMap.get(key);

    if (manualData) {
      console.log(`${progress} 📝 ${sub.name} (${sub.city}) - Using manual data`);

      // Prioritize manual description
      if (manualData.description && !sub.description) {
        sub.description = manualData.description;
        sub.hasManualData = true;
      }

      // Prioritize manual photo (but skip example.com URLs)
      if (manualData.photo && !manualData.photo.includes("example.com")) {
        sub.photo = manualData.photo;
        photoCount++;
      }

      // Prioritize manual features
      if (manualData.features && manualData.features.length > 0) {
        sub.features = manualData.features;
      }

      // Prioritize manual keywords
      if (manualData.keywords && manualData.keywords.length > 0) {
        sub.keywords = manualData.keywords;
      }
    }

    // Fetch HOA and amenity data
    const hoaData = await getHOAData(sub);

    // Generate enhanced description if needed
    if (!sub.description) {
      sub.description = await generateEnhancedDescription(sub, hoaData);
      descriptionCount++;
    }

    // Try to fetch photo from Spark API if still missing
    if (!sub.photo && i < 100) { // Limit to first 100 to avoid rate limits
      const photo = await fetchPhotoFromSparkAPI(sub);
      if (photo) {
        sub.photo = photo;
        photoCount++;
        console.log(`${progress} 📸 ${sub.name} - Fetched photo from Spark API`);
      }
    }

    // Generate features if needed
    if (!sub.features || sub.features.length === 0) {
      sub.features = generateFeatures(sub, hoaData);
    }

    // Generate keywords if needed
    if (!sub.keywords || sub.keywords.length === 0) {
      sub.keywords = [
        `${sub.name} homes for sale`,
        `Living in ${sub.name} ${sub.city}`,
        `${sub.name} real estate`,
        `${sub.city} neighborhoods`,
        `${sub.region} communities`,
      ];
    }

    sub.lastUpdated = new Date().toISOString();
  }

  console.log(`\n📊 Enrichment Complete:`);
  console.log(`   Total: ${subdivisions.length}`);
  console.log(`   📝 Descriptions: ${descriptionCount} generated`);
  console.log(`   📸 Photos: ${photoCount} added`);
  console.log(`   ✅ Complete: ${subdivisions.filter(s => s.description && s.photo).length}\n`);

  const outputPath = path.join(__dirname, "../../../local-logs/enriched-subdivisions.json");
  fs.writeFileSync(outputPath, JSON.stringify(subdivisions, null, 2));
  console.log(`✅ Written to: ${outputPath}\n`);

  await mongoose.disconnect();
}

function generateFeatures(sub: MergedSubdivision, hoaData: any): string[] {
  const features: string[] = [];
  if (sub.seniorCommunity) features.push("55+ community");
  if (sub.communityFeatures) {
    const cf = sub.communityFeatures.toLowerCase();
    if (cf.includes("golf")) features.push("Golf course");
    if (cf.includes("pool")) features.push("Community pools");
    if (cf.includes("tennis")) features.push("Tennis courts");
    if (cf.includes("pickle")) features.push("Pickleball courts");
    if (cf.includes("fitness")) features.push("Fitness center");
  }
  if (hoaData.avgFee) features.push(`HOA: $${Math.round(hoaData.avgFee)}/mo`);
  if (sub.avgPrice > 1000000) features.push("Luxury homes");
  return features.slice(0, 5);
}

comprehensiveEnrich().catch(console.error);
