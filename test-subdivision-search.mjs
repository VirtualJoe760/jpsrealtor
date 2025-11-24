// Quick test script to debug subdivision search
import fetch from 'node-fetch';

const baseUrl = 'http://localhost:3001';
const query = 'palm desert country club';

console.log(`\n🔍 Testing subdivision search for: "${query}"\n`);

// Test 1: Direct API call
console.log('═══ Test 1: Direct API Call ═══');
const apiUrl = `${baseUrl}/api/subdivisions?search=${encodeURIComponent(query)}&limit=10`;
console.log('URL:', apiUrl);

try {
  const response = await fetch(apiUrl);
  const data = await response.json();

  console.log('Status:', response.status);
  console.log('Total Results:', data.subdivisions?.length || 0);

  if (data.subdivisions && data.subdivisions.length > 0) {
    console.log('\nFound Subdivisions:');
    data.subdivisions.forEach((sub, i) => {
      console.log(`  ${i + 1}. ${sub.name} (${sub.city})`);
      console.log(`     Slug: ${sub.slug}`);
      console.log(`     Listings: ${sub.listingCount || 0}`);
    });
  } else {
    console.log('❌ No subdivisions found!');
  }
} catch (error) {
  console.error('❌ Error:', error.message);
}

// Test 2: matchLocation API
console.log('\n\n═══ Test 2: matchLocation API ═══');
try {
  const response = await fetch(`${baseUrl}/api/chat/match-location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });

  const data = await response.json();

  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(data, null, 2));
} catch (error) {
  console.error('❌ Error:', error.message);
}
