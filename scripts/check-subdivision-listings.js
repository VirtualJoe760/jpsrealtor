/**
 * Subdivision Listing Checker
 *
 * This utility checks how many listings exist in a subdivision,
 * broken down by property type (for sale, for rent, multi-family).
 *
 * Usage:
 *   node scripts/check-subdivision-listings.js
 *   OR
 *   node scripts/check-subdivision-listings.js "Palm Desert Country Club"
 */

const readline = require('readline');

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

// Base URL - adjust if running on different environment
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

/**
 * Search for listings in a subdivision with specific filters
 */
async function searchSubdivision(subdivisionName, propertyType = null) {
  const searchParams = {
    subdivisions: [subdivisionName],
    // No limit - get ALL results
  };

  // Add property type filter if specified
  if (propertyType) {
    searchParams.propertyType = propertyType;
  }

  const url = `${BASE_URL}/api/chat/search-listings`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchParams),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      count: data.count || 0,
      listings: data.listings || [],
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      count: 0,
      listings: [],
    };
  }
}

/**
 * Analyze listings by property category using MLS propertyType codes
 *
 * PropertyType codes (from MLS data):
 * - A = Residential (Sale)
 * - B = Residential Lease (Rental)
 * - C = Multi-Family
 */
function analyzeListings(listings) {
  const analysis = {
    forSale: [],
    forRent: [],
    multiFamily: [],
    other: [],
  };

  listings.forEach(listing => {
    // Use propertyType field (standard MLS codes)
    const propType = (listing.propertyType || '').trim().toUpperCase();
    const propSubtype = (listing.propertySubType || '').toLowerCase();

    // PropertyType "B" = Residential Lease (Rental)
    if (propType === 'B') {
      analysis.forRent.push(listing);
    }
    // PropertyType "C" = Multi-Family
    else if (propType === 'C') {
      analysis.multiFamily.push(listing);
    }
    // PropertyType "A" = Residential (Sale) - or fallback check propertySubType
    else if (propType === 'A' || propSubtype.includes('single family') || propSubtype.includes('condo')) {
      analysis.forSale.push(listing);
    }
    // Fallback: check propertySubType for rental keywords
    else if (propSubtype.includes('rental') || propSubtype.includes('lease')) {
      analysis.forRent.push(listing);
    }
    // Fallback: check propertySubType for multi-family keywords
    else if (propSubtype.includes('multi') || propSubtype.includes('apartment') || propSubtype.includes('duplex')) {
      analysis.multiFamily.push(listing);
    }
    // Default to for sale if unclear
    else {
      analysis.forSale.push(listing);
    }
  });

  return analysis;
}

/**
 * Display results with color formatting
 */
function displayResults(subdivisionName, totalCount, analysis) {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.bright}${colors.cyan}Subdivision: ${subdivisionName}${colors.reset}`);
  console.log('='.repeat(60));
  console.log();

  if (totalCount === 0) {
    console.log(`${colors.yellow}⚠️  No listings found in this subdivision${colors.reset}`);
    console.log();
    return;
  }

  console.log(`${colors.bright}📊 Total Listings: ${colors.green}${totalCount}${colors.reset}\n`);

  // For Sale
  console.log(`${colors.bright}${colors.green}🏠 For Sale:${colors.reset} ${analysis.forSale.length}`);
  if (analysis.forSale.length > 0) {
    const priceRange = getPriceRange(analysis.forSale);
    console.log(`   Price Range: ${priceRange}`);
    console.log(`   Avg Price: ${getAveragePrice(analysis.forSale)}`);
  }
  console.log();

  // For Rent
  console.log(`${colors.bright}${colors.blue}🏘️  For Rent:${colors.reset} ${analysis.forRent.length}`);
  if (analysis.forRent.length > 0) {
    const priceRange = getPriceRange(analysis.forRent);
    console.log(`   Price Range: ${priceRange}`);
    console.log(`   Avg Price: ${getAveragePrice(analysis.forRent)}`);
  }
  console.log();

  // Multi-Family
  console.log(`${colors.bright}${colors.magenta}🏢 Multi-Family:${colors.reset} ${analysis.multiFamily.length}`);
  if (analysis.multiFamily.length > 0) {
    const priceRange = getPriceRange(analysis.multiFamily);
    console.log(`   Price Range: ${priceRange}`);
    console.log(`   Avg Price: ${getAveragePrice(analysis.multiFamily)}`);
  }
  console.log();

  // Other/Unknown
  if (analysis.other.length > 0) {
    console.log(`${colors.bright}${colors.yellow}❓ Other:${colors.reset} ${analysis.other.length}`);
    console.log();
  }

  console.log('='.repeat(60));
  console.log();
}

/**
 * Get price range for a set of listings
 */
function getPriceRange(listings) {
  if (listings.length === 0) return 'N/A';

  const prices = listings
    .map(l => l.price || 0)
    .filter(p => p > 0)
    .sort((a, b) => a - b);

  if (prices.length === 0) return 'N/A';

  const min = formatPrice(prices[0]);
  const max = formatPrice(prices[prices.length - 1]);

  return `${min} - ${max}`;
}

/**
 * Get average price for a set of listings
 */
function getAveragePrice(listings) {
  if (listings.length === 0) return 'N/A';

  const prices = listings
    .map(l => l.price || 0)
    .filter(p => p > 0);

  if (prices.length === 0) return 'N/A';

  const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  return formatPrice(Math.round(avg));
}

/**
 * Format price as currency
 */
function formatPrice(price) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Prompt user for input
 */
function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Main function
 */
async function main() {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║      Subdivision Listing Checker Utility              ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  // Get subdivision name from command line or prompt
  let subdivisionName = process.argv[2];

  if (!subdivisionName) {
    subdivisionName = await promptUser(
      `${colors.yellow}Enter subdivision name: ${colors.reset}`
    );
  }

  if (!subdivisionName) {
    console.log(`${colors.red}❌ No subdivision name provided${colors.reset}`);
    process.exit(1);
  }

  console.log(`\n${colors.cyan}🔍 Searching for listings in: ${colors.bright}${subdivisionName}${colors.reset}`);
  console.log(`${colors.cyan}📡 Using API: ${BASE_URL}${colors.reset}\n`);

  // Search for all listings in the subdivision
  const result = await searchSubdivision(subdivisionName);

  if (!result.success) {
    console.log(`${colors.red}❌ Error: ${result.error}${colors.reset}`);
    process.exit(1);
  }

  // Analyze listings by type
  const analysis = analyzeListings(result.listings);

  // Display results
  displayResults(subdivisionName, result.count, analysis);

  // Ask if user wants to check another subdivision
  const again = await promptUser(
    `${colors.yellow}Check another subdivision? (y/n): ${colors.reset}`
  );

  if (again.toLowerCase() === 'y' || again.toLowerCase() === 'yes') {
    console.log('\n');
    await main(); // Recursive call
  } else {
    console.log(`${colors.green}✅ Done!${colors.reset}\n`);
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = { searchSubdivision, analyzeListings };
