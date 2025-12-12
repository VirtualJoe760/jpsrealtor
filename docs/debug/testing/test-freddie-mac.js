// Test Freddie Mac Primary Mortgage Market Survey API
async function testFreddieMac() {
  try {
    // Their historical data endpoint
    const response = await fetch('https://www.freddiemac.com/pmms/docs/historicalweeklydata.csv');
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const text = await response.text();
      const lines = text.split('\n');
      
      console.log('\nFirst 10 lines of CSV:');
      console.log(lines.slice(0, 10).join('\n'));
      
      console.log('\n\nLast 10 lines (most recent):');
      console.log(lines.slice(-10).join('\n'));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testFreddieMac();
