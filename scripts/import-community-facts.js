// scripts/import-community-facts.js
// Import community facts data into subdivisions collection

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

// Define subdivision schema (same as model)
const SubdivisionSchema = new mongoose.Schema({
  name: String,
  slug: String,
  normalizedName: String,
  city: String,
  county: String,
  region: String,
  coordinates: {
    latitude: Number,
    longitude: Number,
  },
  listingCount: Number,
  priceRange: {
    min: Number,
    max: Number,
  },
  avgPrice: Number,
  medianPrice: Number,
  propertyTypes: {
    residential: Number,
    lease: Number,
    multiFamily: Number,
  },
  description: String,
  photo: String,
  features: [String],
  keywords: [String],
  communityFeatures: String,
  seniorCommunity: Boolean,
  communityFacts: {
    alternateNames: [String],
    communityType: String,
    hoaMonthlyMin: Number,
    hoaMonthlyMax: Number,
    hoaIncludes: String,
    initiationFee: Number,
    monthlyDues: Number,
    transferFee: Number,
    melloRoos: Boolean,
    melloRoosAmount: Number,
    lidAssessment: Boolean,
    lidAmount: Number,
    foodMinimum: Number,
    waitingList: String,
    waitingListNotes: String,
    allowsSecondaryMembers: Boolean,
    shortTermRentalsAllowed: String,
    shortTermRentalDetails: String,
    minimumLeaseLength: String,
    golfCourses: Number,
    golfCoursesNames: String,
    pickleballCourts: Number,
    pickleballReservationSystem: String,
    tennisCourts: Number,
    pools: Number,
    restaurantNames: String,
    viewsAvailable: [String],
    bestViewCorridors: String,
    airportNoise: String,
    airportNoiseDetails: String,
    prevailingWindDirection: String,
    floodZone: Boolean,
    floodHistory: String,
    golfCartAccessToRetail: Boolean,
    golfCartPathDetails: String,
    securityType: String,
    averageMemberAge: Number,
    socialCalendar: String,
    socialCalendarNotes: String,
    golfProgramQuality: String,
    resaleVelocity: String,
    avgDaysOnMarket: Number,
    avgPricePerSqFt: Number,
    appreciationNotes: String,
    hiddenGem: Boolean,
    overrated: Boolean,
    yearBuiltRange: String,
    avgRoofAge: Number,
    avgHVACAge: Number,
    casitaCommon: Boolean,
    pros: String,
    cons: String,
    bestFor: String,
    dataSource: String,
    lastVerified: Date,
    needsUpdate: Boolean,
  },
  mlsSources: [String],
  hasManualData: Boolean,
  lastUpdated: Date,
}, {
  timestamps: true,
  collection: 'subdivisions',
});

async function importCommunityFacts() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Subdivision = mongoose.model('Subdivision', SubdivisionSchema);

    // Load community facts data
    const dataPath = path.join(__dirname, 'community-facts-data.json');
    const communityData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    console.log(`📦 Found ${communityData.length} communities to import\n`);

    let updated = 0;
    let created = 0;
    let skipped = 0;

    for (const item of communityData) {
      try {
        const { name, city, facts } = item;

        // Convert date strings to Date objects
        if (facts.lastVerified) {
          facts.lastVerified = new Date(facts.lastVerified);
        }

        // Find subdivision by name and city
        const existing = await Subdivision.findOne({
          name: new RegExp(`^${name}$`, 'i'),
          city: new RegExp(`^${city}$`, 'i'),
        });

        if (existing) {
          // Update existing subdivision with community facts
          await Subdivision.updateOne(
            { _id: existing._id },
            {
              $set: {
                communityFacts: facts,
                hasManualData: true,
                lastUpdated: new Date(),
              },
            }
          );

          console.log(`✅ Updated: ${name} (${city})`);
          updated++;
        } else {
          // Create new subdivision entry
          // Generate slug and normalized name
          const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const normalizedName = name.toLowerCase();

          // Determine county and region based on city
          let county = 'Riverside';
          let region = 'Coachella Valley';

          const newSubdivision = new Subdivision({
            name,
            slug,
            normalizedName,
            city,
            county,
            region,
            listingCount: 0,
            priceRange: { min: 0, max: 0 },
            avgPrice: 0,
            mlsSources: ['manual'],
            hasManualData: true,
            communityFacts: facts,
            lastUpdated: new Date(),
          });

          await newSubdivision.save();

          console.log(`🆕 Created: ${name} (${city})`);
          created++;
        }
      } catch (error) {
        console.error(`❌ Error processing ${item.name}:`, error.message);
        skipped++;
      }
    }

    console.log(`\n📊 Import Summary:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   🆕 Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📦 Total:   ${communityData.length}\n`);

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Run the import
importCommunityFacts();
