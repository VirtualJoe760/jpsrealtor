// src/lib/ai-functions.ts
// AI function calling utilities

import { Listing } from "@/app/components/chat/ListingCarousel";

/**
 * Parse AI response for function calls
 * The AI can request searches or community research by outputting JSON in a specific format
 */
export function detectFunctionCall(text: string): {
  type: "search" | "research" | "matchLocation" | null;
  params: any;
  cleanedText: string;
} | null {
  // CRITICAL: Remove conversation echoes first (AI hallucinating conversation history)
  // Remove patterns like "User: ...", "You: ...", "Assistant: ..."
  let preprocessedText = text.replace(/^(User|You|Assistant):\s*.+$/gm, '').trim();

  // Pattern 1: matchLocation({...}) - AI matching location to county/city/subdivision
  const matchLocationPattern = /matchLocation\s*\(\s*(\{[\s\S]*?\})\s*\)/i;
  const matchLocationMatch = preprocessedText.match(matchLocationPattern);

  if (matchLocationMatch && matchLocationMatch[1]) {
    try {
      let jsonString = matchLocationMatch[1];
      jsonString = jsonString.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
      const params = JSON.parse(jsonString);

      let cleanedText = preprocessedText.replace(/matchLocation\s*\(\s*\{[\s\S]*?\}\s*\)/gi, '').trim();
      cleanedText = (cleanedText.split(/\n\s*response\s*=/i)[0] ?? cleanedText).trim();

      return {
        type: "matchLocation",
        params,
        cleanedText,
      };
    } catch (e) {
      console.error("Failed to parse matchLocation params:", e);
    }
  }

  // Pattern 2: researchCommunity({...}) - AI researching community facts
  const researchPattern = /researchCommunity\s*\(\s*(\{[\s\S]*?\})\s*\)/i;
  const researchMatch = preprocessedText.match(researchPattern);

  if (researchMatch && researchMatch[1]) {
    try {
      let jsonString = researchMatch[1];
      jsonString = jsonString.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
      const params = JSON.parse(jsonString);

      let cleanedText = preprocessedText.replace(/researchCommunity\s*\(\s*\{[\s\S]*?\}\s*\)/gi, '').trim();
      cleanedText = (cleanedText.split(/\n\s*response\s*=/i)[0] ?? cleanedText).trim();

      return {
        type: "research",
        params,
        cleanedText,
      };
    } catch (e) {
      console.error("Failed to parse research params:", e);
    }
  }

  // Pattern 3: searchListings({...}) - Find FIRST occurrence only
  const searchPattern = /searchListings\s*\(\s*(\{[\s\S]*?\})\s*\)/i;
  const match = preprocessedText.match(searchPattern);

  if (match && match[1]) {
    try {
      let jsonString = match[1];

      // Fix common JSON formatting issues from AI
      // Replace unquoted keys with quoted keys (e.g., cities: -> "cities":)
      jsonString = jsonString.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');

      // Try to parse the cleaned JSON
      const params = JSON.parse(jsonString);

      // Remove ALL function calls (not just the first one - AI might generate multiple)
      let cleanedText = preprocessedText.replace(/searchListings\s*\(\s*\{[\s\S]*?\}\s*\)/gi, '').trim();

      // CRITICAL CLEANUP: Remove hallucinated content after function call
      // Remove everything after "response=" blocks (AI hallucinating multiple responses)
      cleanedText = (cleanedText.split(/\n\s*response\s*=/i)[0] ?? cleanedText).trim();

      // Remove response_carousel_N, response_panel_N and similar hallucinated references
      cleanedText = cleanedText.replace(/\s*response_(carousel|panel|card|listing)_\d+\s*/gi, ' ').trim();

      // Remove system prompt leakage - cut off at common instruction markers
      const instructionMarkers = [
        'Function call:',
        'For searching in',
        'For market trends',
        'Remember to:',
        'Supported property types',
        'When suggesting',
        'If unsure about',
        'Example response',
        'If the user only',
        'When a user requests',
        'FUNCTION CALLING:',
        'Available parameters:',
        'CRITICAL:',
        'Your expertise:',
        'What you can do:',
        'IMPORTANT SEARCH RULES:',
        'PROPERTY TYPE FILTERING:',
        'Your communication style:'
      ];

      for (const marker of instructionMarkers) {
        const markerIndex = cleanedText.indexOf(marker);
        if (markerIndex !== -1) {
          cleanedText = cleanedText.substring(0, markerIndex).trim();
          break;
        }
      }

      // Remove broken image links like [](https://...)
      cleanedText = cleanedText.replace(/\[\]\([^)]+\)/g, '').trim();

      // Remove [/instruction] tags and similar patterns
      cleanedText = cleanedText.replace(/\[\/?\w+\]/g, '').trim();

      // Remove standalone URLs that aren't part of markdown links
      cleanedText = cleanedText.replace(/^https?:\/\/[^\s]+$/gm, '').trim();

      // Remove extra blank lines
      cleanedText = cleanedText.replace(/\n\s*\n\s*\n/g, '\n\n').trim();

      return {
        type: "search",
        params,
        cleanedText,
      };
    } catch (e) {
      console.error("Failed to parse search params:", e);
    }
  }

  // Pattern 4: Look for natural language indicators
  const searchKeywords = [
    "let me search",
    "i'll search",
    "searching for",
    "looking for homes",
    "finding properties",
  ];

  if (searchKeywords.some((kw) => text.toLowerCase().includes(kw))) {
    // Try to extract search parameters from the text
    const params = extractSearchParamsFromText(text);
    if (Object.keys(params).length > 0) {
      return {
        type: "search",
        params,
        cleanedText: text,
      };
    }
  }

  return null;
}

/**
 * Extract search parameters from natural language
 */
function extractSearchParamsFromText(text: string): any {
  const params: any = {};
  const lowerText = text.toLowerCase();

  // Extract beds
  const bedsMatch = text.match(/(\d+)\s*(?:\+|or more)?\s*bed(?:room)?s?/i);
  if (bedsMatch && bedsMatch[1]) {
    params.minBeds = parseInt(bedsMatch[1], 10);
  }

  // Extract baths
  const bathsMatch = text.match(/(\d+(?:\.\d+)?)\s*bath(?:room)?s?/i);
  if (bathsMatch && bathsMatch[1]) {
    params.minBaths = parseFloat(bathsMatch[1]);
  }

  // Extract price
  const priceMatch = text.match(/(?:under|below|max|up to)\s*\$?([\d,]+)k?/i);
  if (priceMatch && priceMatch[1]) {
    const priceStr = priceMatch[1].replace(/,/g, "");
    let price = parseFloat(priceStr);
    if (lowerText.includes("k") || price < 10000) {
      price *= 1000;
    }
    params.maxPrice = price;
  }

  // Extract cities
  const cities = [
    "Palm Springs",
    "Palm Desert",
    "Indian Wells",
    "Rancho Mirage",
    "La Quinta",
    "Cathedral City",
    "Indio",
    "Coachella",
    "Desert Hot Springs",
    "Temecula",
    "Murrieta",
  ];

  const foundCities = cities.filter((city) => lowerText.includes(city.toLowerCase()));
  if (foundCities.length > 0) {
    params.cities = foundCities;
  }

  // Extract pool requirement
  if (lowerText.includes("pool")) {
    params.hasPool = true;
  }

  // Extract view requirement
  if (lowerText.includes("mountain view") || lowerText.includes("view")) {
    params.hasView = true;
  }

  return params;
}

/**
 * Execute MLS search
 */
export async function executeMLSSearch(params: any): Promise<{
  success: boolean;
  listings: Listing[];
  count: number;
}> {
  try {
    const response = await fetch("/api/chat/search-listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: data.success,
      listings: data.listings || [],
      count: data.count || 0,
    };
  } catch (error) {
    console.error("MLS search error:", error);
    return {
      success: false,
      listings: [],
      count: 0,
    };
  }
}

/**
 * Format search results for AI context
 */
export function formatSearchResultsForAI(listings: Listing[]): string {
  if (listings.length === 0) {
    return "No listings found matching those criteria.";
  }

  return `Found ${listings.length} properties:\n\n${listings
    .slice(0, 5)
    .map(
      (l, i) =>
        `${i + 1}. $${l.price.toLocaleString()} - ${l.beds}bed/${l.baths}bath, ${l.sqft.toLocaleString()}sqft in ${l.city}${
          l.subdivision ? ` (${l.subdivision})` : ""
        }`
    )
    .join("\n")}${listings.length > 5 ? `\n\n...and ${listings.length - 5} more.` : ""}`;
}
