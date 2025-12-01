// Test script for API Ninja mortgage rates
require('dotenv').config({ path: '.env.local' });

async function testMortgageAPI() {
  const apiKey = process.env.API_NINJA_KEY;

  console.log('API Key exists:', !!apiKey);
  console.log('API Key length:', apiKey?.length || 0);

  try {
    const response = await fetch('https://api.api-ninjas.com/v1/mortgagerate?state=CA', {
      headers: {
        'X-Api-Key': apiKey || '',
      },
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    const data = await response.json();
    console.log('Raw response:', JSON.stringify(data, null, 2));

    // Try to access nested data
    const rateData = data.data || data;
    console.log('\nRate data:', rateData);
    console.log('30-year rate:', rateData.frm_30);
    console.log('Type of frm_30:', typeof rateData.frm_30);

  } catch (error) {
    console.error('Error:', error);
  }
}

testMortgageAPI();
