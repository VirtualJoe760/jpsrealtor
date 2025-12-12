// Test to verify rentals are excluded by default
async function testRentalFilter() {
  console.log('\n=== TESTING RENTAL FILTER ===\n');

  // Test 1: Basic search (should exclude rentals)
  console.log('Test 1: Basic search for Palm Desert properties...');
  const response1 = await fetch('http://localhost:3000/api/chat/search-listings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cities: ['Palm Desert'],
      minBeds: 2,
      limit: 10
    })
  });

  const data1 = await response1.json();
  console.log(`✅ Found ${data1.count} listings`);

  // Check if any are rentals
  const rentals = data1.listings.filter(l => {
    const type = l.type?.toLowerCase() || '';
    const price = l.price || 0;
    return type.includes('rental') || type.includes('lease') || price < 50000;
  });

  if (rentals.length > 0) {
    console.log(`❌ FAIL: Found ${rentals.length} rentals in results:`);
    rentals.forEach(r => {
      console.log(`   - ${r.address}: $${r.price} (${r.type})`);
    });
  } else {
    console.log('✅ PASS: No rentals found - filter working correctly!');
  }

  // Show price range
  const prices = data1.listings.map(l => l.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  console.log(`   Price range: $${minPrice.toLocaleString()} - $${maxPrice.toLocaleString()}`);

  // Test 2: Search with pool (this was causing issues before)
  console.log('\nTest 2: Search with pool feature...');
  const response2 = await fetch('http://localhost:3000/api/chat/search-listings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cities: ['Palm Desert'],
      hasPool: true,
      limit: 10
    })
  });

  const data2 = await response2.json();
  console.log(`✅ Found ${data2.count} listings with pools`);

  const rentalsWithPool = data2.listings.filter(l => {
    const type = l.type?.toLowerCase() || '';
    const price = l.price || 0;
    return type.includes('rental') || type.includes('lease') || price < 50000;
  });

  if (rentalsWithPool.length > 0) {
    console.log(`❌ FAIL: Found ${rentalsWithPool.length} rentals in pool results`);
  } else {
    console.log('✅ PASS: Pool filter working - no rentals found!');
  }

  // Show property types
  const types = [...new Set(data2.listings.map(l => l.type))];
  console.log(`   Property types found: ${types.join(', ')}`);

  console.log('\n=== TEST COMPLETE ===\n');
}

testRentalFilter().catch(console.error);
