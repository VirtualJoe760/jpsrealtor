// src/lib/chat/intent-classifier.ts
// Intent classification: Map user query to single tool

import { identifyEntityType } from "./utils/entity-recognition";

export type UserIntent =
  | "search_homes"           // 60% - "Show me homes in [location]"
  | "new_listings"           // 15% - "What's new in [location]"
  | "market_overview"        // 10% - "Tell me about [location]"
  | "pricing"                // 5%  - "How much are homes in [location]"
  | "market_trends"          // 3%  - "How have homes appreciated"
  | "compare_locations"      // 3%  - "Compare [location1] and [location2]"
  | "find_neighborhoods"     // 1%  - "What neighborhoods are in [city]"
  | "subdivision_query"      // NEW - "Does PDCC allow short term rentals?"
  | "listing_query"          // NEW - "What's the HOA fee for 82223 Vandenberg?"
  | "search_articles"        // 1%  - Real estate knowledge questions
  | "unknown";               // Fallback

interface IntentResult {
  intent: UserIntent;
  confidence: number;
  detectedPatterns: string[];
}

/**
 * Classify user intent from their message
 * Returns the single most likely intent
 */
export function classifyIntent(userMessage: string): IntentResult {
  const message = userMessage.toLowerCase();

  // STEP 0: Entity Recognition Override
  // If we detect a specific address or subdivision with a data query, prioritize those intents
  const entityResult = identifyEntityType(userMessage);

  // Listing query: Detected address + specific question (not "show me")
  if (entityResult.type === "listing" && entityResult.confidence > 0.9) {
    const isVisualQuery = message.includes("show me") || message.includes("find");
    if (!isVisualQuery) {
      return {
        intent: "listing_query",
        confidence: entityResult.confidence,
        detectedPatterns: ["address-detected", entityResult.value]
      };
    }
  }

  // Subdivision query: Detected subdivision + specific question (not "show me" or "tell me about")
  if (entityResult.type === "subdivision" && entityResult.confidence > 0.9) {
    const isVisualQuery = message.includes("show me") || message.includes("find") || message.includes("search");
    const isOverviewQuery = message.includes("tell me about") || message.includes("what is");

    if (!isVisualQuery && !isOverviewQuery) {
      return {
        intent: "subdivision_query",
        confidence: entityResult.confidence,
        detectedPatterns: ["subdivision-detected", entityResult.value]
      };
    }
  }

  // STEP 1: Pattern Matching
  const patterns: { intent: UserIntent; patterns: string[]; weight: number }[] = [
    // Search homes (60% of queries)
    {
      intent: "search_homes",
      patterns: [
        "show me homes", "show me properties", "find homes", "search homes",
        "find properties", "looking for homes", "homes for sale", "properties in",
        "homes in", "available in", "listings in", "search for homes",
        "i want to see", "let me see", "can you show", "looking in"
      ],
      weight: 2.0 // Higher weight = more likely default
    },

    // New listings (15%)
    {
      intent: "new_listings",
      patterns: [
        "what's new", "new listings", "latest homes", "recent listings",
        "just listed", "recently listed", "fresh listings", "this week",
        "what came on the market", "newest homes", "what just hit"
      ],
      weight: 1.5
    },

    // Market overview (10%)
    {
      intent: "market_overview",
      patterns: [
        "tell me about", "what's it like", "describe", "overview of",
        "what is", "information about", "what should i know", "give me info",
        "market in", "area like", "community like", "neighborhood like"
      ],
      weight: 1.2
    },

    // Pricing (5%)
    {
      intent: "pricing",
      patterns: [
        "how much", "what do homes cost", "price range", "average price",
        "median price", "typical price", "how expensive", "afford",
        "what do homes go for", "price per", "cost in"
      ],
      weight: 1.0
    },

    // Market trends (3%)
    {
      intent: "market_trends",
      patterns: [
        "appreciated", "appreciation", "going up", "going down",
        "market trends", "investment", "good investment", "market forecast",
        "price trends", "how fast do homes sell", "days on market",
        "market velocity", "hot market"
      ],
      weight: 1.0
    },

    // Compare locations (3%)
    {
      intent: "compare_locations",
      patterns: [
        "compare", " vs ", " versus ", "difference between",
        "which is better", "or ", "better value"
      ],
      weight: 1.0
    },

    // Find neighborhoods (1%)
    {
      intent: "find_neighborhoods",
      patterns: [
        "what neighborhoods", "what subdivisions", "what communities",
        "where should i look", "best neighborhoods", "areas in",
        "communities in", "subdivisions in"
      ],
      weight: 1.0
    },

    // Subdivision query (specific subdivision data questions)
    {
      intent: "subdivision_query",
      patterns: [
        "does", "is", "are", "can i", "can you", "allowed",
        "allow", "permit", "hoa fee", "hoa cost", "amenities",
        "restrictions", "rules", "rental", "rent"
      ],
      weight: 1.2 // Higher weight for specific data queries
    },

    // Listing query (specific address/property questions)
    // This will be enhanced by entity recognition (checking for address patterns)
    {
      intent: "listing_query",
      patterns: [
        "what's the", "what is the", "how much is", "property at",
        "home at", "house at", "listing at"
      ],
      weight: 1.0
    },

    // Search articles (1%)
    {
      intent: "search_articles",
      patterns: [
        "what is", "what are", "how to", "explain", "define",
        "tell me about", "help me understand", "what does", "meaning of"
      ],
      weight: 0.8 // Lower weight to avoid false positives
    }
  ];

  let bestMatch: IntentResult = {
    intent: "unknown",
    confidence: 0,
    detectedPatterns: []
  };

  // Check each intent's patterns
  for (const { intent, patterns: intentPatterns, weight } of patterns) {
    const matches: string[] = [];
    let score = 0;

    for (const pattern of intentPatterns) {
      if (message.includes(pattern)) {
        matches.push(pattern);
        score += weight;
      }
    }

    // If we found matches and score is higher than current best
    if (matches.length > 0 && score > bestMatch.confidence) {
      bestMatch = {
        intent,
        confidence: score,
        detectedPatterns: matches
      };
    }
  }

  // If no matches, default to search_homes (most common)
  if (bestMatch.intent === "unknown") {
    bestMatch = {
      intent: "search_homes",
      confidence: 0.5,
      detectedPatterns: ["default"]
    };
  }

  return bestMatch;
}

/**
 * Get tool name for the classified intent
 */
export function getToolForIntent(intent: UserIntent): string | null {
  const intentToTool: Record<UserIntent, string | null> = {
    search_homes: "searchHomes",
    new_listings: "searchNewListings",
    market_overview: "getMarketOverview",
    pricing: "getPricing",
    market_trends: "getMarketTrends",
    compare_locations: "compareLocations",
    find_neighborhoods: "findNeighborhoods",
    subdivision_query: "getSubdivisionInfo",
    listing_query: "getListingInfo",
    search_articles: "searchArticles",
    unknown: null
  };

  return intentToTool[intent];
}

/**
 * Main function: Classify intent and return the single tool to use
 */
export function selectToolForQuery(userMessage: string): {
  toolName: string | null;
  intent: UserIntent;
  confidence: number;
} {
  const result = classifyIntent(userMessage);
  const toolName = getToolForIntent(result.intent);

  console.log(`[Intent Classifier] Query: "${userMessage}"`);
  console.log(`[Intent Classifier] Intent: ${result.intent} (${result.confidence.toFixed(2)} confidence)`);
  console.log(`[Intent Classifier] Matched patterns:`, result.detectedPatterns);
  console.log(`[Intent Classifier] Selected tool: ${toolName || "none"}`);

  return {
    toolName,
    intent: result.intent,
    confidence: result.confidence
  };
}
