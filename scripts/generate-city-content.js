#!/usr/bin/env node
/**
 * Generate SEO content for all cities using Wikipedia REST API (free, no auth)
 *
 * Fetches city descriptions from Wikipedia, combines with listing data,
 * and generates real estate-focused content for city pages.
 *
 * Usage:
 *   node scripts/generate-city-content.js --report     # Show what's missing
 *   node scripts/generate-city-content.js --generate   # Generate content and save to DB
 *   node scripts/generate-city-content.js --preview     # Preview generated content
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });
const mongoose = require('mongoose');
const path = require('path');

const WIKI_API = 'https://en.wikipedia.org/api/rest_v1/page/summary';

// Cities that already have content in the constants file
const CITIES_WITH_CONTENT = new Set([
  'palm-springs', 'palm-desert', 'la-quinta', 'indio', 'rancho-mirage',
  'indian-wells', 'cathedral-city', 'desert-hot-springs', 'coachella',
  'thousand-palms', 'bermuda-dunes', 'thermal'
]);

function createSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

async function fetchWikipedia(cityName, stateName = 'California') {
  const slug = `${cityName.replace(/\s+/g, '_')},_${stateName}`;
  try {
    const resp = await fetch(`${WIKI_API}/${encodeURIComponent(slug)}`);
    if (!resp.ok) {
      // Try without state
      const resp2 = await fetch(`${WIKI_API}/${encodeURIComponent(cityName.replace(/\s+/g, '_'))}`);
      if (!resp2.ok) return null;
      const data = await resp2.json();
      return data.extract || null;
    }
    const data = await resp.json();
    return data.extract || null;
  } catch (err) {
    return null;
  }
}

function generateAbout(cityName, countyName, listingCount, wikiExtract) {
  // Build a real estate-focused description using Wikipedia data
  const wikiIntro = wikiExtract
    ? wikiExtract.split('. ').slice(0, 3).join('. ') + '.'
    : `${cityName} is a community in ${countyName}, California.`;

  const realEstateParagraph = listingCount > 100
    ? `The ${cityName} real estate market offers a diverse range of properties, with ${listingCount.toLocaleString()} active listings currently available. Whether you're looking for a single-family home, condominium, or investment property, ${cityName} has options across various price ranges and neighborhoods.`
    : listingCount > 10
    ? `${cityName} offers a growing real estate market with ${listingCount} active listings. From starter homes to established properties, the area provides opportunities for buyers at different price points.`
    : `${cityName} has a select real estate market with available properties for buyers seeking a unique community in ${countyName}.`;

  const ctaParagraph = `For personalized guidance on buying, selling, or investing in ${cityName}, contact Joseph Sardella at (760) 333-3676. As a California real estate expert with eXp Realty, Joseph provides market insights and dedicated service across Southern California and the Coachella Valley.`;

  return `${wikiIntro}\n\n${realEstateParagraph}\n\n${ctaParagraph}`;
}

async function getAllCities() {
  // Fetch from the live API
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const resp = await fetch(`${baseUrl}/api/neighborhoods/directory`);
  const data = await resp.json();

  const cities = [];
  for (const region of data.data) {
    for (const county of region.counties) {
      for (const city of county.cities) {
        cities.push({
          name: city.name,
          slug: city.slug,
          county: county.name,
          listings: city.listings,
          hasContent: CITIES_WITH_CONTENT.has(city.slug),
        });
      }
    }
  }
  return cities;
}

async function main() {
  const mode = process.argv[2] || '--report';

  console.log('Fetching city list...');
  const cities = await getAllCities();

  const withContent = cities.filter(c => c.hasContent);
  const withoutContent = cities.filter(c => !c.hasContent);

  console.log(`\nTotal cities: ${cities.length}`);
  console.log(`With content: ${withContent.length}`);
  console.log(`Need content: ${withoutContent.length}`);

  if (mode === '--report') {
    // Show top 50 cities needing content by listing count
    const sorted = withoutContent.sort((a, b) => b.listings - a.listings);
    console.log('\nTop 50 cities needing content:');
    console.log('─'.repeat(70));
    for (const city of sorted.slice(0, 50)) {
      console.log(`  ${city.listings.toString().padStart(6)} listings  ${city.name.padEnd(25)} (${city.county})`);
    }
    console.log(`\n  ...and ${Math.max(0, sorted.length - 50)} more`);
    return;
  }

  if (mode === '--preview' || mode === '--generate') {
    // Focus on cities with 50+ listings first
    const targets = withoutContent
      .filter(c => c.listings >= 50)
      .sort((a, b) => b.listings - a.listings);

    console.log(`\nProcessing ${targets.length} cities with 50+ listings...`);
    console.log('Fetching Wikipedia data (free API, ~1 req/sec)...\n');

    const results = [];
    let fetched = 0, failed = 0;

    for (const city of targets) {
      process.stdout.write(`[${fetched + failed + 1}/${targets.length}] ${city.name}... `);

      const wiki = await fetchWikipedia(city.name);
      if (wiki) {
        const about = generateAbout(city.name, city.county, city.listings, wiki);
        results.push({ ...city, wiki, about });
        fetched++;
        console.log(`OK (${wiki.length} chars from Wikipedia)`);
      } else {
        // Generate without Wikipedia
        const about = generateAbout(city.name, city.county, city.listings, null);
        results.push({ ...city, wiki: null, about });
        failed++;
        console.log('No Wikipedia entry — generated fallback');
      }

      // Rate limit: 1 request per 100ms
      await new Promise(r => setTimeout(r, 100));
    }

    console.log(`\nFetched: ${fetched}  No Wikipedia: ${failed}`);

    if (mode === '--preview') {
      // Show first 5 results
      console.log('\n═══ PREVIEW (first 5) ═══\n');
      for (const result of results.slice(0, 5)) {
        console.log(`── ${result.name} (${result.county}) — ${result.listings} listings ──`);
        console.log(result.about);
        console.log('');
      }
    }

    if (mode === '--generate') {
      // Save to a JSON file for import
      const outputPath = path.resolve(__dirname, '..', 'docs', 'seo', 'city-content-generated.json');
      const output = {};
      for (const r of results) {
        output[r.slug] = {
          name: r.name,
          county: r.county,
          listings: r.listings,
          heading: `${r.name} Homes for Sale`,
          description: `Browse ${r.listings.toLocaleString()} homes for sale in ${r.name}, CA. View listings with photos, prices, and details. Joseph Sardella, your California real estate expert.`,
          about: r.about,
          wikiExtract: r.wiki,
        };
      }

      const fs = require('fs');
      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
      console.log(`\nSaved ${results.length} city profiles to: docs/seo/city-content-generated.json`);
      console.log('Next step: Import into the City model or constants file.');
    }
  }
}

main().catch(console.error);
