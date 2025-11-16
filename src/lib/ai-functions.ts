// src/lib/ai-functions.ts
// AI function calling utilities

import { Listing } from "@/app/components/chat/ListingCarousel";

/**
 * Parse AI response for function calls
 * The AI can request searches by outputting JSON in a specific format
 */
export function detectFunctionCall(text: string): {
  type: "search" | null;
  params: any;
  cleanedText: string;
} | null {
  // Pattern 1: searchListings({...})
  const searchPattern = /searchListings\s*\(\s*(\{[\s\S]*?\})\s*\)/i;
  const match = text.match(searchPattern);

  if (match && match[1]) {
    try {
      const params = JSON.parse(match[1]);
      const cleanedText = text.replace(match[0], "").trim();
      return {
        type: "search",
        params,
        cleanedText,
      };
    } catch (e) {
      console.error("Failed to parse search params:", e);
    }
  }

  // Pattern 2: Look for natural language indicators
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
