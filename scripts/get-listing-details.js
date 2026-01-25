// scripts/get-listing-details.js
// Get full details of Joseph's listing

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

const listingSchema = new mongoose.Schema({}, { strict: false, collection: 'unified_listings' });
const UnifiedListing = mongoose.models.UnifiedListing || mongoose.model('UnifiedListing', listingSchema);

async function getListingDetails() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const listing = await UnifiedListing.findOne({
      listAgentName: /joseph.*sardella/i
    });

    if (listing) {
      console.log('\n=== LISTING DETAILS ===\n');
      console.log(JSON.stringify(listing, null, 2));
    } else {
      console.log('No listing found');
    }

    await mongoose.disconnect();
    console.log('\n\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

getListingDetails();
