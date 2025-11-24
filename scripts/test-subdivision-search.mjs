#!/usr/bin/env node
/**
 * Subdivision Search & Confirmation Script
 *
 * This script helps test and verify subdivision searches with fuzzy matching.
 * It will show you recommendations even if you don't type the name 100% correctly.
 *
 * Usage:
 *   node scripts/test-subdivision-search.mjs "palm desert country club"
 *   node scripts/test-subdivision-search.mjs "big horn"
 *   node scripts/test-subdivision-search.mjs "ironwood"
 */

import fetch from 'node-fetch';
import readline from 'readline';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  gray: '\x1b[90m'
};

/**
 * Calculate string similarity score (Levenshtein-based)
 */
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  // Exact match
  if (s1 === s2) return 1.0;

  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.8 + (0.2 * (Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length)));
  }

  // Calculate Levenshtein distance
  const matrix = [];
  const len1 = s1.length;
  const len2 = s2.length;

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (s1.charAt(i - 1) === s2.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - (distance / maxLen);
}

/**
 * Search subdivisions with the API
 */
async function searchSubdivisions(query) {
  const url = `${BASE_URL}/api/subdivisions?search=${encodeURIComponent(query)}&limit=50`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    return data.subdivisions || [];
  } catch (error) {
    console.error(`${colors.red}❌ Error fetching subdivisions:${colors.reset}`, error.message);
    return [];
  }
}

/**
 * Test matchLocation API
 */
async function testMatchLocation(query) {
  const url = `${BASE_URL}/api/chat/match-location`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`${colors.red}❌ Error testing matchLocation:${colors.reset}`, error.message);
    return null;
  }
}

/**
 * Score and rank results
 */
function scoreResults(query, subdivisions) {
  const queryLower = query.toLowerCase();

  // Remove common words for better matching
  const cleanQuery = queryLower
    .replace(/\b(country club|golf club|estates|community|the)\b/g, '')
    .trim();

  const scored = subdivisions.map(sub => {
    const subName = sub.name.toLowerCase();
    const cleanSubName = subName
      .replace(/\b(country club|golf club|estates|community|the)\b/g, '')
      .trim();

    // Calculate multiple scores
    const exactScore = subName === queryLower ? 1.0 : 0;
    const cleanExactScore = cleanSubName === cleanQuery ? 0.95 : 0;
    const containsScore = subName.includes(queryLower) ? 0.7 : 0;
    const similarityScore = calculateSimilarity(cleanQuery, cleanSubName);

    // Take the best score
    const confidence = Math.max(
      exactScore,
      cleanExactScore,
      containsScore,
      similarityScore * 0.9
    );

    return {
      ...sub,
      confidence,
      matchType: exactScore > 0 ? 'exact' :
                 cleanExactScore > 0 ? 'clean exact' :
                 containsScore > 0 ? 'contains' :
                 'fuzzy'
    };
  });

  // Sort by confidence
  scored.sort((a, b) => b.confidence - a.confidence);

  return scored;
}

/**
 * Display results in a nice format
 */
function displayResults(query, results) {
  console.log(`\n${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bright}Search Results for: "${query}"${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  if (results.length === 0) {
    console.log(`${colors.red}❌ No subdivisions found${colors.reset}\n`);
    return;
  }

  console.log(`${colors.green}✅ Found ${results.length} subdivision(s)${colors.reset}\n`);

  results.forEach((sub, index) => {
    const confidenceColor =
      sub.confidence >= 0.9 ? colors.green :
      sub.confidence >= 0.7 ? colors.yellow :
      colors.gray;

    const confidenceBar = '█'.repeat(Math.round(sub.confidence * 20));

    console.log(`${colors.bright}${index + 1}. ${sub.name}${colors.reset}`);
    console.log(`   ${colors.gray}City:${colors.reset} ${sub.city || 'N/A'}`);
    console.log(`   ${colors.gray}Slug:${colors.reset} ${sub.slug}`);
    console.log(`   ${colors.gray}Listings:${colors.reset} ${sub.listingCount || 0}`);
    console.log(`   ${colors.gray}Confidence:${colors.reset} ${confidenceColor}${(sub.confidence * 100).toFixed(1)}%${colors.reset} ${confidenceBar}`);
    console.log(`   ${colors.gray}Match Type:${colors.reset} ${sub.matchType}`);
    console.log();
  });
}

/**
 * Interactive mode
 */
async function interactiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log(`\n${colors.bright}${colors.blue}🏘️  Subdivision Search Tool${colors.reset}`);
  console.log(`${colors.gray}Type a subdivision name (or 'quit' to exit)${colors.reset}\n`);

  const askQuestion = () => {
    rl.question(`${colors.cyan}Search:${colors.reset} `, async (query) => {
      if (query.toLowerCase() === 'quit' || query.toLowerCase() === 'exit') {
        console.log(`\n${colors.gray}Goodbye!${colors.reset}\n`);
        rl.close();
        return;
      }

      if (!query.trim()) {
        askQuestion();
        return;
      }

      // Search subdivisions
      const subdivisions = await searchSubdivisions(query);
      const scoredResults = scoreResults(query, subdivisions);

      // Display top 10 results
      displayResults(query, scoredResults.slice(0, 10));

      // Also test matchLocation API
      console.log(`${colors.cyan}Testing matchLocation API...${colors.reset}`);
      const matchResult = await testMatchLocation(query);

      if (matchResult && matchResult.success) {
        console.log(`${colors.green}✅ matchLocation found:${colors.reset} ${matchResult.match.type} - ${matchResult.match.name}`);
        console.log(`   ${colors.gray}Confidence:${colors.reset} ${(matchResult.match.confidence * 100).toFixed(1)}%\n`);
      } else if (matchResult && matchResult.needsDisambiguation) {
        console.log(`${colors.yellow}🤔 Multiple matches found - disambiguation needed${colors.reset}\n`);
      } else {
        console.log(`${colors.red}❌ matchLocation found nothing${colors.reset}\n`);
      }

      askQuestion();
    });
  };

  askQuestion();
}

/**
 * Main function
 */
async function main() {
  const query = process.argv[2];

  if (!query) {
    // No query provided - enter interactive mode
    await interactiveMode();
    return;
  }

  // Single search mode
  console.log(`${colors.bright}${colors.blue}🏘️  Subdivision Search Tool${colors.reset}\n`);

  const subdivisions = await searchSubdivisions(query);
  const scoredResults = scoreResults(query, subdivisions);

  displayResults(query, scoredResults.slice(0, 10));

  // Also test matchLocation API
  console.log(`${colors.cyan}Testing matchLocation API...${colors.reset}`);
  const matchResult = await testMatchLocation(query);

  if (matchResult && matchResult.success) {
    console.log(`${colors.green}✅ matchLocation found:${colors.reset} ${matchResult.match.type} - ${matchResult.match.name}`);
    console.log(`   ${colors.gray}Confidence:${colors.reset} ${(matchResult.match.confidence * 100).toFixed(1)}%`);

    if (matchResult.searchParams) {
      console.log(`   ${colors.gray}Search Params:${colors.reset}`, matchResult.searchParams);
    }
  } else if (matchResult && matchResult.needsDisambiguation) {
    console.log(`${colors.yellow}🤔 Multiple matches found - disambiguation needed:${colors.reset}`);
    matchResult.options.forEach((opt, i) => {
      console.log(`   ${i + 1}. ${opt.displayName}`);
    });
  } else {
    console.log(`${colors.red}❌ matchLocation found nothing${colors.reset}`);
  }

  console.log();
}

// Run the script
main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
