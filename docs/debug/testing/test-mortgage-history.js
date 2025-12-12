require('dotenv').config({ path: '.env.local' });

async function testHistoricalRates() {
  const apiKey = process.env.API_NINJA_KEY;

  // Test if we can get historical data by not specifying state
  const response = await fetch('https://api.api-ninjas.com/v1/mortgagerate', {
    headers: { 'X-Api-Key': apiKey },
  });

  const data = await response.json();
  console.log('Response (all data):');
  console.log(JSON.stringify(data, null, 2));
  console.log('\nNumber of records:', Array.isArray(data) ? data.length : 'Not an array');
}

testHistoricalRates();
