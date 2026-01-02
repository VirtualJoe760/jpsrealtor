// Build LocationIndex for fast entity recognition in chat
// Replaces slow distinct() queries with indexed lookups
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

/**
 * Generate common abbreviations and aliases for a location name
 */
function getAbbreviations(name) {
  const aliases = [];

  // Country Club → CC
  if (name.includes('Country Club')) {
    const abbrev = name.replace(/Country Club/gi, 'CC').trim();
    aliases.push(abbrev);

    // Also try just initials: "Palm Desert Country Club" → "PDCC"
    const words = name.split(/\s+/);
    if (words.length > 1) {
      const initials = words.map(w => w[0]).join('');
      aliases.push(initials);
    }
  }

  // Rancho → Ranch (common misspelling)
  if (name.includes('Rancho')) {
    aliases.push(name.replace(/Rancho/gi, 'Ranch'));
  }

  // Add more patterns as needed
  // For example: "Saint" → "St", "Mount" → "Mt", etc.

  // Remove duplicates and the original name
  return [...new Set(aliases)].filter(a => a !== name);
}

async function buildLocationIndex() {
  try {
    console.log('Building location index for fast entity recognition...\n');
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Define models
    const UnifiedListing = mongoose.models.UnifiedListing || mongoose.model('UnifiedListing', new mongoose.Schema({}, {
      collection: 'unifiedlistings',
      strict: false
    }));

    const LocationIndex = mongoose.models.LocationIndex || mongoose.model('LocationIndex', new mongoose.Schema({
      name: { type: String, required: true, index: true },
      normalizedName: { type: String, required: true, index: true },
      type: {
        type: String,
        enum: ['city', 'subdivision', 'county', 'region'],
        required: true,
        index: true
      },
      latitude: Number,
      longitude: Number,
      bounds: {
        north: Number,
        south: Number,
        east: Number,
        west: Number
      },
      city: String,
      county: String,
      region: String,
      listingCount: { type: Number, default: 0 },
      activeListingCount: { type: Number, default: 0 },
      slug: { type: String, index: true },
      aliases: [String],
      lastUpdated: { type: Date, default: Date.now }
    }, {
      collection: 'location_index'
    }));

    // Clear existing index
    console.log('Clearing existing location index...');
    const deleteResult = await LocationIndex.deleteMany({});
    console.log(`✅ Cleared ${deleteResult.deletedCount} existing entries\n`);

    // 1. Build city index
    console.log('📍 Indexing cities...');
    const cityAgg = await UnifiedListing.aggregate([
      {
        $match: {
          city: { $exists: true, $ne: null, $nin: ["", "Unknown"] },
          standardStatus: "Active"
        }
      },
      {
        $group: {
          _id: "$city",
          count: { $sum: 1 },
          avgLat: { $avg: "$latitude" },
          avgLng: { $avg: "$longitude" },
          minLat: { $min: "$latitude" },
          maxLat: { $max: "$latitude" },
          minLng: { $min: "$longitude" },
          maxLng: { $max: "$longitude" }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const cityDocs = cityAgg.map(city => ({
      name: city._id,
      normalizedName: city._id.toLowerCase(),
      type: 'city',
      latitude: city.avgLat,
      longitude: city.avgLng,
      bounds: {
        north: city.maxLat,
        south: city.minLat,
        east: city.maxLng,
        west: city.minLng
      },
      listingCount: city.count,
      activeListingCount: city.count,
      slug: city._id.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      aliases: getAbbreviations(city._id),
      lastUpdated: new Date()
    }));

    if (cityDocs.length > 0) {
      await LocationIndex.insertMany(cityDocs);
      console.log(`✅ Indexed ${cityDocs.length} cities`);
      console.log(`   Top cities: ${cityDocs.slice(0, 5).map(c => `${c.name} (${c.listingCount})`).join(', ')}\n`);
    }

    // 2. Build subdivision index
    console.log('🏘️  Indexing subdivisions...');
    const subdivAgg = await UnifiedListing.aggregate([
      {
        $match: {
          subdivisionName: {
            $exists: true,
            $ne: null,
            $nin: ["", "Not Applicable", "N/A", "None", "n/a", "not applicable", "none"]
          },
          standardStatus: "Active"
        }
      },
      {
        $group: {
          _id: "$subdivisionName",
          count: { $sum: 1 },
          avgLat: { $avg: "$latitude" },
          avgLng: { $avg: "$longitude" },
          minLat: { $min: "$latitude" },
          maxLat: { $max: "$latitude" },
          minLng: { $min: "$longitude" },
          maxLng: { $max: "$longitude" },
          city: { $first: "$city" }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const subdivDocs = subdivAgg.map(subdiv => ({
      name: subdiv._id,
      normalizedName: subdiv._id.toLowerCase(),
      type: 'subdivision',
      latitude: subdiv.avgLat,
      longitude: subdiv.avgLng,
      bounds: {
        north: subdiv.maxLat,
        south: subdiv.minLat,
        east: subdiv.maxLng,
        west: subdiv.minLng
      },
      city: subdiv.city,
      listingCount: subdiv.count,
      activeListingCount: subdiv.count,
      slug: subdiv._id.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      aliases: getAbbreviations(subdiv._id),
      lastUpdated: new Date()
    }));

    if (subdivDocs.length > 0) {
      await LocationIndex.insertMany(subdivDocs);
      console.log(`✅ Indexed ${subdivDocs.length} subdivisions`);
      console.log(`   Top subdivisions: ${subdivDocs.slice(0, 5).map(s => `${s.name} (${s.listingCount})`).join(', ')}\n`);
    }

    // Summary
    console.log('='.repeat(80));
    console.log('📊 LOCATION INDEX SUMMARY');
    console.log('='.repeat(80));
    console.log(`Cities:        ${cityDocs.length}`);
    console.log(`Subdivisions:  ${subdivDocs.length}`);
    console.log(`Total:         ${cityDocs.length + subdivDocs.length}`);
    console.log('='.repeat(80));

    // Show examples of aliases created
    const withAliases = [...cityDocs, ...subdivDocs].filter(d => d.aliases.length > 0);
    if (withAliases.length > 0) {
      console.log('\n🏷️  Sample aliases created:');
      withAliases.slice(0, 10).forEach(loc => {
        console.log(`   ${loc.name} → ${loc.aliases.join(', ')}`);
      });
      console.log(`\n   Total locations with aliases: ${withAliases.length}`);
    }

    console.log('\n✅ Location index built successfully!');
    console.log('\n💡 Entity recognition will now use indexed lookups (<50ms) instead of');
    console.log('   slow distinct() queries (10-15 seconds)\n');

    await mongoose.connection.close();
    console.log('✅ Database connection closed\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error building location index:', error);
    process.exit(1);
  }
}

buildLocationIndex();
