// Check if listings have different photos
const fetch = require('node-fetch');

async function checkPhotos() {
  const response = await fetch('http://localhost:3000/api/chat/search-listings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cities: ['Palm Desert'], limit: 5 })
  });

  const data = await response.json();

  console.log('\n=== Photo URL Analysis ===\n');
  data.listings.forEach((listing, i) => {
    console.log(`${i + 1}. ${listing.address}`);
    console.log(`   ID: ${listing.id}`);
    console.log(`   Photo: ${listing.image}`);
    console.log('');
  });

  // Check uniqueness
  const uniqueUrls = new Set(data.listings.map(l => l.image));
  console.log(`\nTotal listings: ${data.listings.length}`);
  console.log(`Unique photo URLs: ${uniqueUrls.size}`);

  if (uniqueUrls.size === 1) {
    console.log('\n❌ PROBLEM: All listings have the SAME photo URL!');
    console.log('This means primaryPhotoUrl is empty in the database.\n');
  } else {
    console.log('\n✅ GOOD: Listings have different photos\n');
  }
}

checkPhotos().catch(console.error);
