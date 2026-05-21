// Test if photos are now unique after fix
async function testPhotos() {
  const response = await fetch('http://localhost:3000/api/chat/search-listings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cities: ['Palm Desert'], minBeds: 2, limit: 5 })
  });

  const data = await response.json();

  console.log('\n=== PHOTO TEST RESULTS ===\n');
  data.listings.forEach((l, i) => {
    console.log(`${i + 1}. ${l.address}`);
    console.log(`   Photo: ${l.image.substring(0, 70)}...`);
    console.log('');
  });

  const uniqueUrls = new Set(data.listings.map(l => l.image));
  console.log(`Total listings: ${data.listings.length}`);
  console.log(`Unique photo URLs: ${uniqueUrls.size}`);

  if (uniqueUrls.size === data.listings.length) {
    console.log('\n✅ SUCCESS - All listings have DIFFERENT photos!');
    console.log('The carousel will now show unique photos for each property.\n');
  } else {
    console.log('\n❌ PROBLEM - Some photos are still duplicates');
    console.log('Checking which ones are placeholders...\n');

    const placeholders = data.listings.filter(l => l.image.includes('unsplash'));
    console.log(`Placeholder images: ${placeholders.length} of ${data.listings.length}`);
  }
}

testPhotos().catch(console.error);
