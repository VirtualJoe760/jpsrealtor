// Test if Photos collection has data
const mongoose = require('mongoose');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jpsrealtor';

const PhotoSchema = new mongoose.Schema({
  listingId: String,
  photoId: String,
  primary: Boolean,
  uri1280: String,
  uri1024: String,
  uri800: String,
  uri640: String,
  uriThumb: String
});

async function testPhotos() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    const Photo = mongoose.models.Photo || mongoose.model('Photo', PhotoSchema);

    // Count total photos
    const totalPhotos = await Photo.countDocuments();
    console.log(`\nTotal photos in database: ${totalPhotos}`);

    if (totalPhotos === 0) {
      console.log('\n❌ Photos collection is EMPTY!');
      console.log('This is why all listings show the same placeholder image.\n');
      return;
    }

    // Get sample photos
    const samplePhotos = await Photo.find().limit(5);
    console.log('\nSample photos:');
    samplePhotos.forEach((photo, i) => {
      console.log(`\n${i + 1}. Listing ID: ${photo.listingId}`);
      console.log(`   Primary: ${photo.primary}`);
      console.log(`   URL: ${photo.uri1280 || photo.uri1024 || photo.uri800 || 'none'}`);
    });

    // Test with a specific listing
    const testListingId = '20250729070314620355000000';
    const photosForListing = await Photo.find({ listingId: testListingId, primary: true });
    console.log(`\n\nPhotos for listing ${testListingId}: ${photosForListing.length}`);
    if (photosForListing.length > 0) {
      console.log('Photo URL:', photosForListing[0].uri1280 || photosForListing[0].uri800);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testPhotos();
