#!/usr/bin/env node

/**
 * Neighborhoods Link Sample Tester
 * Tests a sample of links from each category to quickly identify issues
 */

const http = require('http');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

async function testUrl(url, type, name) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.on('data', () => {}); // Consume data
      res.on('end', () => {
        const success = res.statusCode === 200;
        const icon = success ? '✓' : '✗';
        const color = success ? colors.green : colors.red;
        console.log(`${color}${icon}${colors.reset} ${colors.gray}[${res.statusCode}]${colors.reset} ${type}: ${name}`);
        resolve({ success, url, statusCode: res.statusCode });
      });
    });

    req.on('error', (err) => {
      console.log(`${colors.red}✗${colors.reset} ${colors.gray}[ERR]${colors.reset} ${type}: ${name} - ${err.message}`);
      resolve({ success: false, url, error: err.message });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      console.log(`${colors.yellow}⚠${colors.reset} ${colors.gray}[TMO]${colors.reset} ${type}: ${name} - Timeout`);
      resolve({ success: false, url, timeout: true });
    });
  });
}

async function fetchDirectory() {
  return new Promise((resolve, reject) => {
    const req = http.get(`${BASE_URL}/api/neighborhoods/directory`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.data);
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
  });
}

async function main() {
  console.log(`${colors.blue}╔════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║   Neighborhoods Sample Link Tester            ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════════╝${colors.reset}\n`);

  console.log(`${colors.gray}Fetching directory...${colors.reset}\n`);
  const directory = await fetchDirectory();

  const tests = [];

  // Test regions
  console.log(`${colors.blue}Testing Regions:${colors.reset}`);
  for (const region of directory) {
    tests.push(await testUrl(
      `${BASE_URL}/neighborhoods/${region.slug}`,
      'Region',
      region.name
    ));
  }

  // Test sample counties
  console.log(`\n${colors.blue}Testing Counties (sample):${colors.reset}`);
  const sampleCounties = [
    ...directory[0]?.counties.slice(0, 2) || [],
    ...directory.find(r => r.name === 'Coachella Valley')?.counties || [],
    ...directory.find(r => r.name === 'Joshua Tree Area')?.counties || []
  ];
  for (const county of sampleCounties) {
    tests.push(await testUrl(
      `${BASE_URL}/neighborhoods/${county.slug}`,
      'County',
      county.name
    ));
  }

  // Test sample cities
  console.log(`\n${colors.blue}Testing Cities (sample):${colors.reset}`);
  const coalchellaValley = directory.find(r => r.name === 'Coachella Valley');
  const joshuaTree = directory.find(r => r.name === 'Joshua Tree Area');
  const socal = directory.find(r => r.name === 'Southern California');

  const sampleCities = [
    ...(coalchellaValley?.counties[0]?.cities.slice(0, 3) || []),
    ...(joshuaTree?.counties[0]?.cities.slice(0, 2) || []),
    ...(socal?.counties[0]?.cities.slice(0, 3) || [])
  ];

  for (const city of sampleCities) {
    tests.push(await testUrl(
      `${BASE_URL}/neighborhoods/${city.slug}`,
      'City',
      city.name
    ));
  }

  // Test sample subdivisions
  console.log(`\n${colors.blue}Testing Subdivisions (sample):${colors.reset}`);
  const citiesWithSubdivisions = [];
  for (const region of directory.slice(0, 2)) {
    for (const county of region.counties.slice(0, 2)) {
      for (const city of county.cities.slice(0, 3)) {
        if (city.subdivisions && city.subdivisions.length > 0) {
          citiesWithSubdivisions.push({ city, subdivisions: city.subdivisions });
        }
      }
    }
  }

  for (const { city, subdivisions } of citiesWithSubdivisions.slice(0, 5)) {
    for (const subdivision of subdivisions.slice(0, 2)) {
      tests.push(await testUrl(
        `${BASE_URL}/neighborhoods/${city.slug}/${subdivision.slug}`,
        'Subdivision',
        `${subdivision.name}, ${city.name}`
      ));
    }
  }

  // Summary
  const passed = tests.filter(t => t.success).length;
  const failed = tests.filter(t => !t.success).length;
  const successRate = ((passed / tests.length) * 100).toFixed(2);

  console.log(`\n${colors.blue}╔════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║   Summary                                      ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════════╝${colors.reset}\n`);
  console.log(`Total Tested:  ${tests.length}`);
  console.log(`${colors.green}Passed:${colors.reset}        ${passed}`);
  console.log(`${colors.red}Failed:${colors.reset}        ${failed}`);
  console.log(`Success Rate:  ${successRate}%\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(colors.red + 'Fatal error:' + colors.reset, err);
  process.exit(1);
});
