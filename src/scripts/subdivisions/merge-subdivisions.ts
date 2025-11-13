// src/scripts/subdivisions/merge-subdivisions.ts
// Merge MLS subdivision data with existing manually-created JSON files

import { config } from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load environment variables
const envPath = path.join(__dirname, "../../../.env.local");
config({ path: envPath });

// Interfaces
interface ManualSubdivision {
  id?: number;
  name: string;
  description?: string;
  photo?: string;
  price_range?: string;
  features?: string[];
  location?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  keywords?: string[];
  slug: string;
}

interface MLSSubdivision {
  name: string;
  slug: string;
  normalizedName: string;
  city: string;
  county: string;
  region: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  listingCount: number;
  priceRange: {
    min: number;
    max: number;
  };
  avgPrice: number;
  medianPrice?: number;
  propertyTypes?: {
    residential?: number;
    lease?: number;
    multiFamily?: number;
  };
  seniorCommunity?: boolean;
  communityFeatures?: string;
  mlsSources: string[];
  hasManualData: boolean;
  lastUpdated: string;
}

interface MergedSubdivision {
  name: string;
  slug: string;
  normalizedName: string;
  city: string;
  county: string;
  region: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  listingCount: number;
  priceRange: {
    min: number;
    max: number;
  };
  avgPrice: number;
  medianPrice?: number;
  propertyTypes?: {
    residential?: number;
    lease?: number;
    multiFamily?: number;
  };
  seniorCommunity?: boolean;
  communityFeatures?: string;
  mlsSources: string[];
  hasManualData: boolean;
  lastUpdated: string;
  // Manual data fields
  description?: string;
  photo?: string;
  features?: string[];
  keywords?: string[];
  manualDataSource?: string;
}

// Helper: Normalize name for matching
function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "");
}

// Helper: Get city from location string
function getCityFromLocation(location: string): string {
  // Examples: "La Quinta, CA", "Central Palm Springs"
  const match = location.match(/([^,]+)/);
  if (match && match[1]) {
    const city = match[1].trim();
    // Handle "Central Palm Springs" -> "Palm Springs"
    if (city.includes("Palm Springs")) return "Palm Springs";
    if (city.includes("La Quinta")) return "La Quinta";
    return city;
  }
  return location;
}

// Main merge function
async function mergeSubdivisions() {
  console.log("🔄 Starting subdivision merge process...\n");

  // 1. Read MLS extracted data
  const mlsFilePath = path.join(__dirname, "../../../local-logs/extracted-subdivisions.json");
  console.log("📖 Reading MLS extracted data from:", mlsFilePath);

  if (!fs.existsSync(mlsFilePath)) {
    console.error("❌ MLS extracted data file not found:", mlsFilePath);
    process.exit(1);
  }

  const mlsData: MLSSubdivision[] = JSON.parse(fs.readFileSync(mlsFilePath, "utf-8"));
  console.log(`✅ Loaded ${mlsData.length} MLS subdivisions\n`);

  // 2. Read all manual JSON files
  const constantsDir = path.join(__dirname, "../../app/constants/subdivisions");
  console.log("📖 Reading manual JSON files from:", constantsDir);

  if (!fs.existsSync(constantsDir)) {
    console.error("❌ Constants directory not found:", constantsDir);
    process.exit(1);
  }

  const jsonFiles = fs.readdirSync(constantsDir).filter(f => f.endsWith(".json"));
  console.log(`📁 Found ${jsonFiles.length} JSON files:`, jsonFiles.join(", "), "\n");

  // Build map of manual data: key = normalizedName-normalizedCity
  const manualDataMap = new Map<string, ManualSubdivision & { sourceFile: string }>();

  for (const file of jsonFiles) {
    const filePath = path.join(constantsDir, file);
    const data: ManualSubdivision[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    for (const sub of data) {
      const city = sub.location ? getCityFromLocation(sub.location) : "";
      const key = `${normalizeName(sub.name)}-${normalizeName(city)}`;
      manualDataMap.set(key, { ...sub, sourceFile: file });
    }
  }

  console.log(`✅ Loaded ${manualDataMap.size} manual subdivisions from JSON files\n`);

  // 3. Merge data
  console.log("🔀 Merging MLS data with manual data...\n");

  const mergedSubdivisions: MergedSubdivision[] = [];
  const manualOnlySubdivisions: (ManualSubdivision & { sourceFile: string })[] = [];
  let matchCount = 0;
  let mlsOnlyCount = 0;

  // Process each MLS subdivision
  for (const mlsSub of mlsData) {
    const key = `${mlsSub.normalizedName}-${normalizeName(mlsSub.city)}`;
    const manualData = manualDataMap.get(key);

    if (manualData) {
      // Match found - merge data
      matchCount++;
      console.log(`✅ Match: "${mlsSub.name}" in ${mlsSub.city} (from ${manualData.sourceFile})`);

      mergedSubdivisions.push({
        ...mlsSub,
        hasManualData: true,
        description: manualData.description,
        photo: manualData.photo,
        features: manualData.features,
        keywords: manualData.keywords,
        manualDataSource: manualData.sourceFile,
        // Use manual coordinates if MLS doesn't have them
        coordinates: mlsSub.coordinates || manualData.coordinates,
      });

      // Remove from manual map (so we can find manual-only later)
      manualDataMap.delete(key);
    } else {
      // MLS only
      mlsOnlyCount++;
      mergedSubdivisions.push({
        ...mlsSub,
        hasManualData: false,
      });
    }
  }

  // Remaining items in manualDataMap are manual-only (not found in MLS)
  for (const [key, manualData] of manualDataMap.entries()) {
    manualOnlySubdivisions.push(manualData);
  }

  console.log(`\n📊 Merge Statistics:`);
  console.log(`   Total MLS Subdivisions: ${mlsData.length}`);
  console.log(`   Total Manual Subdivisions: ${manualDataMap.size + matchCount}`);
  console.log(`   ✅ Matched (MLS + Manual): ${matchCount}`);
  console.log(`   📍 MLS Only: ${mlsOnlyCount}`);
  console.log(`   📝 Manual Only: ${manualOnlySubdivisions.length}`);
  console.log(`   🎯 Total Merged: ${mergedSubdivisions.length}\n`);

  // 4. Sort merged subdivisions by listing count (descending)
  mergedSubdivisions.sort((a, b) => b.listingCount - a.listingCount);

  // 5. Write merged data
  const outputPath = path.join(__dirname, "../../../local-logs/merged-subdivisions.json");
  fs.writeFileSync(outputPath, JSON.stringify(mergedSubdivisions, null, 2));
  console.log(`✅ Merged data written to: ${outputPath}`);
  console.log(`   File size: ${(fs.statSync(outputPath).size / 1024).toFixed(0)} KB\n`);

  // 6. Write manual-only subdivisions (for review)
  if (manualOnlySubdivisions.length > 0) {
    const manualOnlyPath = path.join(__dirname, "../../../local-logs/manual-only-subdivisions.json");
    fs.writeFileSync(manualOnlyPath, JSON.stringify(manualOnlySubdivisions, null, 2));
    console.log(`⚠️  Manual-only subdivisions (not found in MLS) written to: ${manualOnlyPath}`);
    console.log(`   These may be inactive or have different names in the MLS database.\n`);

    console.log(`📋 Manual-only subdivisions by source file:`);
    const byFile = manualOnlySubdivisions.reduce((acc, sub) => {
      const sourceFile = sub.sourceFile || 'unknown';
      if (!acc[sourceFile]) acc[sourceFile] = [];
      acc[sourceFile].push(sub.name);
      return acc;
    }, {} as Record<string, string[]>);

    for (const [file, names] of Object.entries(byFile)) {
      console.log(`   ${file}: ${names.join(", ")}`);
    }
  }

  // 7. Generate summary report
  console.log(`\n📈 Top 20 Subdivisions by Listing Count:`);
  mergedSubdivisions.slice(0, 20).forEach((sub, i) => {
    const manualFlag = sub.hasManualData ? "📝" : "  ";
    const priceStr = `$${(sub.avgPrice / 1000).toFixed(0)}k`;
    console.log(`   ${i + 1}. ${manualFlag} ${sub.name} (${sub.city}) - ${sub.listingCount} listings @ ${priceStr} avg`);
  });

  console.log(`\n✅ Merge complete! Next steps:`);
  console.log(`   1. Review merged-subdivisions.json`);
  console.log(`   2. Review manual-only-subdivisions.json (if any)`);
  console.log(`   3. Create descriptions for subdivisions with hasManualData: false`);
  console.log(`   4. Upload to MongoDB subdivisions collection\n`);
}

// Run the merge
mergeSubdivisions().catch((error) => {
  console.error("❌ Error during merge:", error);
  process.exit(1);
});
