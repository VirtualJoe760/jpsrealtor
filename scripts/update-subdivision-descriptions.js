#!/usr/bin/env node
/**
 * update-subdivision-descriptions.js
 *
 * Phase 5: Applies approved descriptions to MongoDB and local JSON files.
 *
 * Usage:
 *   node scripts/update-subdivision-descriptions.js --dry-run
 *   node scripts/update-subdivision-descriptions.js --apply
 *   node scripts/update-subdivision-descriptions.js --apply --city "Indian Wells"
 *
 * Input:  local-logs/rewritten-descriptions.json
 * Updates: MongoDB subdivisions collection + src/app/constants/subdivisions/*.json
 */

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const applyMode = args.includes("--apply");
const cityFilter = args.includes("--city") ? args[args.indexOf("--city") + 1] : null;

if (!applyMode && !dryRun) {
  console.log("Usage:");
  console.log("  --dry-run    Preview changes without applying");
  console.log("  --apply      Apply changes to MongoDB and JSON files");
  console.log("  --city NAME  Filter to a specific city");
  process.exit(0);
}

/**
 * Load rewritten descriptions
 */
function loadRewrittenDescriptions() {
  const filePath = path.join(__dirname, "../local-logs/rewritten-descriptions.json");
  if (!fs.existsSync(filePath)) {
    console.error("❌ No rewritten descriptions found at:", filePath);
    console.log("   Run Phase 3 first: node scripts/rewrite-descriptions.js --auto");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

/**
 * Update local JSON files
 */
function updateJsonFiles(entries) {
  const dir = path.join(__dirname, "../src/app/constants/subdivisions");
  const files = fs.readdirSync(dir).filter(
    (f) => f.endsWith(".json") && !f.startsWith("og-")
  );

  let updated = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    let fileModified = false;

    for (const sub of data) {
      const match = entries.find((e) => e.slug === sub.slug && e.newDescription);
      if (match) {
        sub.description = match.newDescription;
        fileModified = true;
        updated++;
      }
    }

    if (fileModified) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
      console.log(`   📝 Updated ${file}`);
    }
  }

  return updated;
}

/**
 * Update MongoDB records
 */
async function updateMongoDB(entries) {
  if (!MONGODB_URI) {
    console.error("❌ Missing MONGODB_URI in .env.local");
    return 0;
  }

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const collection = db.collection("subdivisions");

  let updated = 0;
  let notFound = 0;

  for (const entry of entries) {
    if (!entry.newDescription) continue;

    const result = await collection.updateOne(
      { slug: entry.slug },
      {
        $set: {
          description: entry.newDescription,
          hasManualData: true,
          "communityFacts.dataSource": entry.officialUrl || "google-places",
          "communityFacts.lastVerified": new Date(),
          "communityFacts.needsUpdate": false,
          lastUpdated: new Date(),
        },
      }
    );

    if (result.matchedCount > 0) {
      updated++;
    } else {
      notFound++;
      console.log(`   ⚠️  Not in MongoDB: ${entry.name} (${entry.slug})`);
    }
  }

  await mongoose.disconnect();
  return { updated, notFound };
}

/**
 * Main execution
 */
async function main() {
  console.log("📤 Subdivision Description Updater");
  console.log("====================================\n");

  let entries = loadRewrittenDescriptions();
  const withNew = entries.filter((e) => e.newDescription);

  console.log(`📋 Loaded ${entries.length} entries, ${withNew.length} have new descriptions\n`);

  if (cityFilter) {
    entries = entries.filter((e) => e.city?.toLowerCase() === cityFilter.toLowerCase());
    console.log(`🔍 Filtered to ${entries.length} in ${cityFilter}\n`);
  }

  const toUpdate = entries.filter((e) => e.newDescription);

  if (toUpdate.length === 0) {
    console.log("❌ No entries with new descriptions to apply.");
    process.exit(0);
  }

  if (dryRun) {
    console.log(`🏃 DRY RUN — would update ${toUpdate.length} descriptions:\n`);
    for (const entry of toUpdate) {
      console.log(`  ${entry.city} / ${entry.name}`);
      console.log(`    OLD: ${(entry.currentDescription || "none").substring(0, 80)}...`);
      console.log(`    NEW: ${entry.newDescription.substring(0, 80)}...`);
      console.log();
    }
    return;
  }

  // Apply mode
  console.log(`🔄 Applying ${toUpdate.length} description updates...\n`);

  // Update JSON files
  console.log("📁 Updating local JSON files...");
  const jsonUpdated = updateJsonFiles(toUpdate);
  console.log(`   ✅ ${jsonUpdated} JSON entries updated\n`);

  // Update MongoDB
  console.log("🗄️  Updating MongoDB...");
  const mongoResult = await updateMongoDB(toUpdate);
  console.log(`   ✅ ${mongoResult.updated} MongoDB records updated`);
  if (mongoResult.notFound > 0) {
    console.log(`   ⚠️  ${mongoResult.notFound} not found in MongoDB`);
  }

  console.log("\n====================================");
  console.log("✅ Done! Description update complete.");
  console.log(`   JSON files: ${jsonUpdated} updated`);
  console.log(`   MongoDB: ${mongoResult.updated} updated`);
}

main().catch(console.error);
