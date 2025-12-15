#!/usr/bin/env node

/**
 * Neighborhoods Link Tester
 *
 * Tests all links in the neighborhoods directory to find broken routes.
 * Fetches the full directory structure and validates:
 * - County pages
 * - City pages
 * - Subdivision pages
 *
 * Usage: node test-neighborhoods-links.js [--verbose] [--port=3000]
 */

const http = require('http');

// Configuration
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const portArg = args.find(arg => arg.startsWith('--port='));
const PORT = portArg ? parseInt(portArg.split('=')[1]) : 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

// Results tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: []
};

/**
 * Make HTTP GET request
 */
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Test a single URL
 */
async function testUrl(url, type, name) {
  results.total++;

  try {
    const response = await makeRequest(url);

    if (response.statusCode === 200) {
      results.passed++;
      if (verbose) {
        console.log(`${colors.green}✓${colors.reset} ${colors.gray}${type}:${colors.reset} ${name} ${colors.gray}(${url})${colors.reset}`);
      } else {
        process.stdout.write(colors.green + '.' + colors.reset);
      }
      return { success: true, url, type, name, statusCode: 200 };
    } else if (response.statusCode === 404) {
      results.failed++;
      console.log(`\n${colors.red}✗ 404${colors.reset} ${colors.gray}${type}:${colors.reset} ${name} ${colors.red}${url}${colors.reset}`);
      results.errors.push({ url, type, name, statusCode: 404, error: 'Not Found' });
      return { success: false, url, type, name, statusCode: 404 };
    } else {
      results.warnings++;
      console.log(`\n${colors.yellow}⚠ ${response.statusCode}${colors.reset} ${colors.gray}${type}:${colors.reset} ${name} ${colors.yellow}${url}${colors.reset}`);
      return { success: false, url, type, name, statusCode: response.statusCode };
    }
  } catch (error) {
    results.failed++;
    console.log(`\n${colors.red}✗ ERROR${colors.reset} ${colors.gray}${type}:${colors.reset} ${name} ${colors.red}${url}${colors.reset}`);
    console.log(`  ${colors.gray}${error.message}${colors.reset}`);
    results.errors.push({ url, type, name, error: error.message });
    return { success: false, url, type, name, error: error.message };
  }
}

/**
 * Fetch neighborhoods directory data
 */
async function fetchDirectory() {
  console.log(`${colors.blue}Fetching neighborhoods directory...${colors.reset}`);

  try {
    const response = await makeRequest(`${BASE_URL}/api/neighborhoods/directory`);

    if (response.statusCode !== 200) {
      throw new Error(`API returned ${response.statusCode}`);
    }

    const data = JSON.parse(response.body);

    if (!data.success) {
      throw new Error(data.error || 'API returned success: false');
    }

    return data.data;
  } catch (error) {
    console.error(`${colors.red}Failed to fetch directory:${colors.reset}`, error.message);
    process.exit(1);
  }
}

/**
 * Test all links in the directory
 */
async function testAllLinks() {
  console.log(`${colors.blue}╔════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║   Neighborhoods Link Tester                    ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════════╝${colors.reset}\n`);

  const directory = await fetchDirectory();

  console.log(`${colors.gray}Found ${directory.length} regions${colors.reset}\n`);

  const testQueue = [];

  // Build test queue
  for (const region of directory) {
    if (verbose) {
      console.log(`\n${colors.blue}Region: ${region.name}${colors.reset}`);
    }

    for (const county of region.counties) {
      // Test county page
      testQueue.push({
        url: `${BASE_URL}/neighborhoods/${county.slug}`,
        type: 'County',
        name: `${county.name} (${county.listings} listings)`,
        region: region.name
      });

      for (const city of county.cities) {
        // Test city page
        testQueue.push({
          url: `${BASE_URL}/neighborhoods/${city.slug}`,
          type: 'City',
          name: `${city.name}, ${county.name} (${city.listings} listings)`,
          region: region.name
        });

        // Test subdivision pages
        for (const subdivision of city.subdivisions || []) {
          testQueue.push({
            url: `${BASE_URL}/neighborhoods/${city.slug}/${subdivision.slug}`,
            type: 'Subdivision',
            name: `${subdivision.name}, ${city.name} (${subdivision.listings} listings)`,
            region: region.name
          });
        }
      }
    }
  }

  console.log(`${colors.gray}Testing ${testQueue.length} URLs...${colors.reset}\n`);

  if (!verbose) {
    console.log(`${colors.gray}(Use --verbose for detailed output)${colors.reset}\n`);
  }

  // Test all URLs (with concurrency limit)
  const concurrency = 10;
  const batches = [];

  for (let i = 0; i < testQueue.length; i += concurrency) {
    batches.push(testQueue.slice(i, i + concurrency));
  }

  for (const batch of batches) {
    await Promise.all(
      batch.map(test => testUrl(test.url, test.type, test.name))
    );
  }

  // Print summary
  console.log(`\n\n${colors.blue}╔════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║   Test Results                                 ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════════╝${colors.reset}\n`);

  console.log(`Total URLs tested:     ${results.total}`);
  console.log(`${colors.green}✓ Passed:${colors.reset}              ${results.passed}`);
  console.log(`${colors.red}✗ Failed:${colors.reset}              ${results.failed}`);
  console.log(`${colors.yellow}⚠ Warnings:${colors.reset}            ${results.warnings}`);

  const successRate = ((results.passed / results.total) * 100).toFixed(2);
  console.log(`\nSuccess Rate:          ${successRate}%`);

  // Show failed URLs grouped by type
  if (results.errors.length > 0) {
    console.log(`\n${colors.red}Failed URLs:${colors.reset}\n`);

    const grouped = results.errors.reduce((acc, err) => {
      const key = err.type || 'Unknown';
      if (!acc[key]) acc[key] = [];
      acc[key].push(err);
      return acc;
    }, {});

    for (const [type, errors] of Object.entries(grouped)) {
      console.log(`${colors.yellow}${type}s (${errors.length}):${colors.reset}`);
      errors.forEach(err => {
        console.log(`  ${colors.gray}•${colors.reset} ${err.name}`);
        console.log(`    ${colors.red}${err.url}${colors.reset}`);
        if (err.error) {
          console.log(`    ${colors.gray}Error: ${err.error}${colors.reset}`);
        }
      });
      console.log('');
    }
  }

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the tests
testAllLinks().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
