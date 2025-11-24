#!/usr/bin/env node
/**
 * Fix Subdivision Slugs - Remove City Name Suffix
 *
 * This script updates all subdivision slugs to remove the city name suffix.
 * Example: "palm-desert-country-club-palm-desert" → "palm-desert-country-club"
 *
 * Usage:
 *   node scripts/fix-subdivision-slugs.mjs [--dry-run]
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

// Define Subdivision schema (minimal for this script)
const subdivisionSchema = new mongoose.Schema({
  name: String,
  slug: String,
  city: String,
  normalizedName: String,
}, { collection: 'subdivisions' });

const Subdivision = mongoose.model('Subdivision', subdivisionSchema);

/**
 * Convert text to kebab-case slug
 */
function toKebabCase(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Main function
 */
async function fixSubdivisionSlugs(dryRun = false) {
  try {
    console.log('\n🔧 Subdivision Slug Fixer\n');
    console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE UPDATE'}\n`);

    // Connect to database
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all subdivisions
    const subdivisions = await Subdivision.find({}).lean();
    console.log(`📊 Found ${subdivisions.length} subdivisions\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const updates = [];

    for (const subdivision of subdivisions) {
      try {
        const oldSlug = subdivision.slug;
        const citySlug = toKebabCase(subdivision.city);

        // Check if slug ends with city name
        const endsWithCity = oldSlug.endsWith(`-${citySlug}`);

        if (!endsWithCity) {
          console.log(`⏭️  SKIP: "${subdivision.name}" - slug doesn't end with city`);
          console.log(`   Current: ${oldSlug}`);
          console.log(`   City: ${subdivision.city} (${citySlug})\n`);
          skippedCount++;
          continue;
        }

        // Generate new slug by removing city suffix
        const newSlug = oldSlug.replace(new RegExp(`-${citySlug}$`), '');

        // Check if another subdivision already has this slug
        const conflict = await Subdivision.findOne({
          slug: newSlug,
          _id: { $ne: subdivision._id }
        }).lean();

        if (conflict) {
          console.log(`⚠️  CONFLICT: "${subdivision.name}" in ${subdivision.city}`);
          console.log(`   Desired slug "${newSlug}" already used by "${conflict.name}" in ${conflict.city}`);
          console.log(`   Keeping original: ${oldSlug}\n`);
          skippedCount++;
          continue;
        }

        updates.push({
          _id: subdivision._id,
          name: subdivision.name,
          city: subdivision.city,
          oldSlug,
          newSlug
        });

        console.log(`✏️  UPDATE: "${subdivision.name}" in ${subdivision.city}`);
        console.log(`   Old: ${oldSlug}`);
        console.log(`   New: ${newSlug}\n`);

        if (!dryRun) {
          await Subdivision.updateOne(
            { _id: subdivision._id },
            { $set: { slug: newSlug } }
          );
          updatedCount++;
        }

      } catch (error) {
        console.error(`❌ ERROR processing "${subdivision.name}":`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total subdivisions: ${subdivisions.length}`);
    console.log(`Updated: ${dryRun ? `${updates.length} (DRY RUN)` : updatedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('='.repeat(60) + '\n');

    if (dryRun && updates.length > 0) {
      console.log('💡 Run without --dry-run to apply these changes\n');
    } else if (!dryRun && updatedCount > 0) {
      console.log('✅ Database updated successfully!\n');
    }

    // Close connection
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Run the script
fixSubdivisionSlugs(dryRun)
  .then(() => {
    console.log('✨ Done!\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
