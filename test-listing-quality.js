// Listing Data Quality Test
// Validates that listings return correct data including photos, prices, and details

const BASE_URL = 'http://localhost:3000';

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(`  ${title}`, 'cyan');
  console.log('='.repeat(80) + '\n');
}

async function testListingDataQuality() {
  logSection('LISTING DATA QUALITY VALIDATION');

  const searchParams = {
    cities: ['Palm Desert'],
    minBeds: 3,
    limit: 10
  };

  log('Search Parameters:', 'blue');
  console.log(JSON.stringify(searchParams, null, 2));

  try {
    const response = await fetch(`${BASE_URL}/api/chat/search-listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchParams)
    });

    const data = await response.json();

    if (!data.success) {
      log(`✗ Search failed: ${data.error}`, 'red');
      return;
    }

    log(`\n✓ Found ${data.count} listings`, 'green');

    const issues = {
      critical: [],
      warning: [],
      info: []
    };

    // Analyze each listing
    data.listings.forEach((listing, index) => {
      log(`\n--- Listing ${index + 1} ---`, 'magenta');

      // Check required fields
      const requiredFields = {
        id: listing.id,
        price: listing.price,
        beds: listing.beds,
        baths: listing.baths,
        city: listing.city,
        address: listing.address
      };

      Object.entries(requiredFields).forEach(([field, value]) => {
        if (value === undefined || value === null) {
          log(`  ✗ Missing ${field}`, 'red');
          issues.critical.push(`Listing ${index + 1}: Missing ${field}`);
        } else {
          log(`  ✓ ${field}: ${value}`, 'green');
        }
      });

      // Check photo
      if (listing.image) {
        if (listing.image.includes('unsplash')) {
          log(`  ⚠ Using placeholder image`, 'yellow');
          issues.warning.push(`Listing ${index + 1}: Using placeholder image`);
        } else {
          log(`  ✓ Photo: ${listing.image.substring(0, 50)}...`, 'green');
        }
      } else {
        log(`  ✗ No image`, 'red');
        issues.critical.push(`Listing ${index + 1}: No image`);
      }

      // Check optional but recommended fields
      if (listing.sqft) {
        log(`  ✓ Square footage: ${listing.sqft.toLocaleString()} sqft`, 'green');
      } else {
        log(`  ⚠ Missing square footage`, 'yellow');
        issues.warning.push(`Listing ${index + 1}: Missing square footage`);
      }

      if (listing.subdivision) {
        log(`  ✓ Subdivision: ${listing.subdivision}`, 'green');
      } else {
        log(`  ⚠ No subdivision data`, 'yellow');
        issues.info.push(`Listing ${index + 1}: No subdivision data`);
      }

      if (listing.type) {
        log(`  ✓ Property type: ${listing.type}`, 'green');
      } else {
        log(`  ⚠ No property type`, 'yellow');
        issues.info.push(`Listing ${index + 1}: No property type`);
      }

      // Check URL
      if (listing.url) {
        log(`  ✓ URL: ${listing.url}`, 'green');
      } else {
        log(`  ✗ Missing URL`, 'red');
        issues.critical.push(`Listing ${index + 1}: Missing URL`);
      }

      // Price validation
      if (listing.price) {
        if (listing.price < 50000) {
          log(`  ⚠ Suspiciously low price: $${listing.price.toLocaleString()}`, 'yellow');
          issues.warning.push(`Listing ${index + 1}: Suspiciously low price`);
        } else if (listing.price > 50000000) {
          log(`  ⚠ Extremely high price: $${listing.price.toLocaleString()}`, 'yellow');
          issues.warning.push(`Listing ${index + 1}: Extremely high price`);
        }
      }

      // Beds/baths validation
      if (listing.beds && listing.beds < searchParams.minBeds) {
        log(`  ✗ Beds (${listing.beds}) less than minimum (${searchParams.minBeds})`, 'red');
        issues.critical.push(`Listing ${index + 1}: Beds less than search criteria`);
      }
    });

    // Summary
    logSection('DATA QUALITY SUMMARY');

    log(`Total listings analyzed: ${data.count}`, 'cyan');

    if (issues.critical.length > 0) {
      log(`\n❌ CRITICAL ISSUES (${issues.critical.length}):`, 'red');
      issues.critical.forEach(issue => log(`  • ${issue}`, 'red'));
    } else {
      log(`\n✅ No critical issues found`, 'green');
    }

    if (issues.warning.length > 0) {
      log(`\n⚠ WARNINGS (${issues.warning.length}):`, 'yellow');
      issues.warning.forEach(issue => log(`  • ${issue}`, 'yellow'));
    } else {
      log(`\n✅ No warnings`, 'green');
    }

    if (issues.info.length > 0) {
      log(`\nℹ INFO (${issues.info.length}):`, 'blue');
      issues.info.forEach(issue => log(`  • ${issue}`, 'blue'));
    }

    // UX Assessment
    logSection('UX ASSESSMENT');

    const criticalPass = issues.critical.length === 0;
    const warningPass = issues.warning.length < data.count * 0.2; // Less than 20% warnings
    const photoPass = issues.warning.filter(i => i.includes('placeholder')).length < data.count * 0.3;

    log('Key Metrics:', 'cyan');
    log(`  Required Data Completeness: ${criticalPass ? '✓ PASS' : '✗ FAIL'}`, criticalPass ? 'green' : 'red');
    log(`  Data Quality: ${warningPass ? '✓ PASS' : '⚠ REVIEW'}`, warningPass ? 'green' : 'yellow');
    log(`  Photo Availability: ${photoPass ? '✓ PASS' : '⚠ REVIEW'}`, photoPass ? 'green' : 'yellow');

    log('\nUser Experience Impact:', 'cyan');
    if (criticalPass && warningPass && photoPass) {
      log('  ✓ EXCELLENT - Listings display with complete, quality data', 'green');
      log('  ✓ Users can make informed decisions', 'green');
      log('  ✓ Visual appeal maintained with real property photos', 'green');
    } else if (criticalPass) {
      log('  ⚠ GOOD - Core data present but some enhancements needed', 'yellow');
      if (!photoPass) {
        log('  ⚠ Consider improving photo coverage', 'yellow');
      }
      if (!warningPass) {
        log('  ⚠ Some optional fields missing', 'yellow');
      }
    } else {
      log('  ✗ POOR - Critical data missing affects user experience', 'red');
      log('  ✗ Users may not trust listings with incomplete data', 'red');
    }

    // Recommendations
    logSection('RECOMMENDATIONS');

    const recommendations = [];

    if (issues.critical.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        text: 'Fix missing required fields (price, address, beds, baths)',
        color: 'red'
      });
    }

    const placeholderCount = issues.warning.filter(i => i.includes('placeholder')).length;
    if (placeholderCount > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        text: `${placeholderCount} listings using placeholder images - sync photo database`,
        color: 'yellow'
      });
    }

    const missingSubdivision = issues.info.filter(i => i.includes('subdivision')).length;
    if (missingSubdivision > data.count * 0.5) {
      recommendations.push({
        priority: 'LOW',
        text: 'Over 50% listings missing subdivision - enrich data for better filtering',
        color: 'blue'
      });
    }

    recommendations.push({
      priority: 'UX',
      text: 'Ensure carousel displays all photos smoothly',
      color: 'cyan'
    });

    recommendations.push({
      priority: 'UX',
      text: 'Verify "View Details" buttons link to correct listing pages',
      color: 'cyan'
    });

    recommendations.push({
      priority: 'UX',
      text: 'Test map markers show correct listing when clicked',
      color: 'cyan'
    });

    if (recommendations.length > 0) {
      recommendations.forEach(rec => {
        log(`  [${rec.priority}] ${rec.text}`, rec.color);
      });
    } else {
      log('  ✓ No immediate recommendations - system performing well', 'green');
    }

  } catch (error) {
    log(`\n✗ Test failed: ${error.message}`, 'red');
    console.error(error);
  }
}

// Run the test
testListingDataQuality().catch(console.error);
