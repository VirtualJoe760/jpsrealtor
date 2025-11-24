#!/usr/bin/env node

// Get cities via API endpoint

const baseURL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function getCities() {
  try {
    const response = await fetch(`${baseURL}/api/cities`);
    const data = await response.json();
    
    console.log(`Found ${data.cities?.length || 0} cities\n`);
    
    if (data.cities && data.cities.length > 0) {
      // Show first 10
      data.cities.slice(0, 10).forEach((city, idx) => {
        console.log(`${idx + 1}. ${city.name} (slug: ${city.slug})`);
      });
      
      if (data.cities.length > 10) {
        console.log(`... and ${data.cities.length - 10} more cities`);
      }
    }
    
    return data.cities;
  } catch (error) {
    console.error('Error fetching cities:', error.message);
  }
}

getCities();
