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

  // Listing query: Detected address + specific question (not "show")
  if (entityResult.type === "listing" && entityResult.confidence > 0.9) {
    // Check for search/listing intent keywords - these should trigger search_homes or getListingInfo
    const isVisualQuery = message.includes("show") ||
                          message.includes("find") ||
                          message.includes("search") ||
                          message.includes("look at") ||
                          message.includes("see");
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
    // Check for search/listing intent keywords - these should trigger search_homes, not subdivision_query
    const isVisualQuery = message.includes("show") ||
                          message.includes("find") ||
                          message.includes("search") ||
                          message.includes("homes") ||
                          message.includes("properties") ||
                          message.includes("listings") ||
                          message.includes("available") ||
                          message.includes("for sale");
    const isOverviewQuery = message.includes("tell me about") || message.includes("what is");

    // Don't override if strong trend/appreciation keywords present
    const hasTrendKeywords = message.includes("appreciation") ||
                            message.includes("appreciated") ||
                            message.includes("going up") ||
                            message.includes("going down") ||
                            message.includes("market trend") ||
                            message.includes("investment");

    if (!isVisualQuery && !isOverviewQuery && !hasTrendKeywords) {
      return {
        intent: "subdivision_query",
        confidence: entityResult.confidence,
        detectedPatterns: ["subdivision-detected", entityResult.value]
      };
    }
  }

  // STEP 0.5: PRIORITY CHECK - Appreciation Keywords
  // These keywords ALWAYS trigger market_trends intent, regardless of other patterns
  const appreciationKeywords = [
    "appreciation", "appreciated", "appreciating", "appreciate",
    "value over time", "grown in value", "growth rate",
    "roi", "return on investment", "investment return"
  ];

  for (const keyword of appreciationKeywords) {
    if (message.includes(keyword)) {
      return {
        intent: "market_trends",
        confidence: 3.0, // High confidence - this is clearly about appreciation
        detectedPatterns: [`appreciation-keyword: ${keyword}`]
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

    // Market trends (3%) - secondary patterns (primary handled above)
    {
      intent: "market_trends",
      patterns: [
        "going up", "going down", "market trends", "investment",
        "good investment", "market forecast", "price trends",
        "how fast do homes sell", "days on market", "market velocity", "hot market"
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
        // Definitional queries (specific to concepts, not locations)
        "what is an", "what is a", "what are", "how to", "explain", "define",
        "help me understand", "what does", "meaning of",

        // Cost & utility queries (HIGH PRIORITY - specific patterns)
        "utility costs", "utility cost", "energy costs", "energy cost",
        "power costs", "power bills", "electric bills", "electricity costs",
        "best costs", "cheapest", "most affordable", "expenses",
        "water costs", "gas costs", "bills", "utilities",
        "internet costs", "cable costs", "insurance costs",

        // Real estate knowledge
        "what to know about", "tips for", "guide to", "hidden costs",
        "first time", "buyer tips", "seller tips", "homeownership",
        "what's it like to live", "lifestyle",

        // Process & concepts
        "how does", "process for", "steps to", "requirements for",
        "pros and cons", "benefits of", "downsides of"
      ],
      weight: 2.0 // High weight - these are clear article queries (increased from 1.5)
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
    market_trends: "getAppreciation",      // CHANGED: Use simple getAppreciation tool
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
