// scripts/find-obsidian-listings.js
// Find listings associated with Obsidian Group team members

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

const listingSchema = new mongoose.Schema({}, { strict: false, collection: 'unified_listings' });
const UnifiedListing = mongoose.models.UnifiedListing || mongoose.model('UnifiedListing', listingSchema);

async function findObsidianListings() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Search patterns for Obsidian Group
    const searchPatterns = [
      /obsidian/i,
      /joseph.*sardella/i,
    ];

    console.log('\n=== Searching for Obsidian Group listings ===\n');

    // Search in different fields
    const fields = ['listOfficeName', 'listAgentName', 'listAgentFirstName', 'listAgentLastName', 'listAgentMarketingName'];

    for (const field of fields) {
      console.log(`\n--- Searching in ${field} ---`);

      for (const pattern of searchPatterns) {
        const query = { [field]: pattern };
        const count = await UnifiedListing.countDocuments(query);

        if (count > 0) {
          console.log(`✓ Found ${count} listings matching ${pattern} in ${field}`);

          // Get sample listing
          const sample = await UnifiedListing.findOne(query, {
            listingKey: 1,
            address: 1,
            city: 1,
            listPrice: 1,
            listOfficeName: 1,
            listAgentName: 1,
            listAgentFirstName: 1,
            listAgentLastName: 1,
            listAgentMarketingName: 1,
            primaryPhotoUrl: 1,
            media: { $slice: 1 }
          });

          console.log('Sample listing:');
          console.log(JSON.stringify(sample, null, 2));
        }
      }
    }

    // Also check for any listings with photos
    console.log('\n--- Checking listings with photos ---');
    const listingsWithPhotos = await UnifiedListing.find({
      $or: [
        { listOfficeName: /obsidian/i },
        { listAgentName: /joseph.*sardella/i }
      ],
      primaryPhotoUrl: { $exists: true, $ne: null }
    }, {
      listingKey: 1,
      address: 1,
      city: 1,
      listPrice: 1,
      primaryPhotoUrl: 1,
      media: { $slice: 3 }
    }).limit(5);

    console.log(`\nFound ${listingsWithPhotos.length} Obsidian listings with photos:`);
    listingsWithPhotos.forEach((listing, i) => {
      console.log(`\n${i + 1}. ${listing.address}, ${listing.city}`);
      console.log(`   Price: $${listing.listPrice?.toLocaleString()}`);
      console.log(`   Primary Photo: ${listing.primaryPhotoUrl}`);
      if (listing.media && listing.media.length > 0) {
        console.log(`   Additional photos: ${listing.media.length} available`);
        listing.media.forEach((photo, j) => {
          console.log(`     - ${photo.Uri1600 || photo.Uri1280 || photo.Uri1024 || photo.MediaURL}`);
        });
      }
    });

    await mongoose.disconnect();
    console.log('\n\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findObsidianListings();
