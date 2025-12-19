// src/lib/chat/intent-classifier.ts
// Intent classification: Map user query to single tool

import { identifyEntityType } from "./utils/entity-recognition";
import Groq from "groq-sdk";

export type UserIntent =
  | "search_homes"           // Browse properties - "Show me homes in [location]"
  | "market_trends"          // Appreciation/investment data - "How has [location] appreciated?"
  | "search_articles"        // Educational content - "How to buy a home"
  | "general"                // General conversation (help, get started, greetings)
  | "unknown";               // Fallback

interface IntentResult {
  intent: UserIntent;
  confidence: number;
  detectedPatterns: string[];
}

// =========================================================================
// AI-BASED INTENT CLASSIFICATION
// =========================================================================

const INTENT_CLASSIFICATION_PROMPT = `You are an intent classifier for a real estate chatbot. Analyze the user's query and determine their PRIMARY intent.

AVAILABLE INTENTS:

1. search_homes
   - User wants to BROWSE or SEE property listings
   - Covers: viewing homes, new listings, property search, price info, general browsing
   - Examples:
     * "Show me homes in Palm Desert"
     * "Find properties under $500k"
     * "What's new in La Quinta"
     * "How much are homes in PDCC"
     * "Tell me about properties in Indian Wells"
     * "Recently listed homes"
   - This is the MOST COMMON intent (use when unsure)

2. market_trends
   - User wants APPRECIATION, INVESTMENT DATA, or MARKET TRENDS over time
   - Examples:
     * "How has Palm Desert appreciated?"
     * "Investment returns in PGA West"
     * "Show me appreciation trends"
     * "Value over time in La Quinta"
     * "Market growth in Riverside County"
   - IMPORTANT: "appreciation" keyword ALWAYS means market_trends

3. search_articles
   - User asks EDUCATIONAL/HOW-TO questions (not about specific locations/listings)
   - Examples:
     * "What is a short sale?"
     * "How to buy a home"
     * "First time buyer tips"
     * "What are closing costs?"
     * "Explain HOA fees"

4. general
   - Greetings, help requests, getting started
   - Examples:
     * "Hello", "Hi", "Hey"
     * "Help me get started"
     * "What can you do?"
     * "How does this work?"

CRITICAL RULES:
- Respond with ONLY the intent name
- "show me appreciation" → market_trends (NOT search_homes)
- "show me homes" → search_homes
- When unsure → default to search_homes (most common)
- Do NOT add explanations

Respond with ONLY the intent name.`;

/**
 * Classify user intent using AI (Groq LLM)
 * Fast, semantic understanding of user's request
 * Returns null if AI classification fails (fallback to keyword system)
 */
async function classifyIntentWithAI(userMessage: string): Promise<IntentResult | null> {
  try {
    const startTime = Date.now();

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: INTENT_CLASSIFICATION_PROMPT
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      model: "llama-3.1-8b-instant", // Fast, cheap model for classification
      temperature: 0.1, // Low temp for consistency
      max_tokens: 20, // Only need intent name
    });

    const responseTime = Date.now() - startTime;
    const intentString = response.choices[0].message.content?.trim();

    // Validate intent is one of our known intents
    const validIntents: UserIntent[] = [
      "search_homes",
      "market_trends",
      "search_articles",
      "general"
    ];

    if (!intentString || !validIntents.includes(intentString as UserIntent)) {
      console.warn(`[AI Intent] Invalid intent returned: "${intentString}"`);
      return null;
    }

    console.log(`[AI Intent] Classified as: ${intentString} (${responseTime}ms)`);

    return {
      intent: intentString as UserIntent,
      confidence: 0.95, // High confidence for AI classification
      detectedPatterns: ["ai-classified"]
    };

  } catch (error: any) {
    // Log different error types for debugging
    if (error.name === 'AbortError') {
      console.error("[AI Intent] Classification timeout");
    } else if (error.status === 429) {
      console.error("[AI Intent] Rate limit exceeded");
    } else {
      console.error("[AI Intent] Classification failed:", error.message);
    }
    return null; // Always return null on error → fallback to keywords
  }
}

// =========================================================================
// KEYWORD-BASED INTENT CLASSIFICATION (Fallback)
// =========================================================================

/**
 * Classify user intent from their message using keyword patterns
 * This is the fallback when AI classification fails or times out
 * Returns the single most likely intent
 */
function classifyIntentWithKeywords(userMessage: string): IntentResult {
  const message = userMessage.toLowerCase();

  // STEP 1: PRIORITY CHECK - Appreciation Keywords
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

  // STEP 2: Pattern Matching - Simplified to 4 Intents
  const patterns: { intent: UserIntent; patterns: string[]; weight: number }[] = [
    // 1. search_homes - Browse properties (most common)
    {
      intent: "search_homes",
      patterns: [
        // Direct search patterns
        "show me homes", "show me properties", "find homes", "search homes",
        "find properties", "looking for homes", "homes for sale", "properties in",
        "homes in", "available in", "listings in", "search for homes",
        "i want to see", "let me see", "can you show", "looking in",

        // New listings
        "what's new", "new listings", "latest homes", "recent listings",
        "just listed", "recently listed", "fresh listings", "this week",
        "what came on the market", "newest homes", "what just hit",

        // Location info (tell me about, overview)
        "tell me about", "what's it like", "describe", "overview of",
        "information about", "what should i know", "give me info",

        // Pricing questions (price implies browsing homes)
        "how much", "what do homes cost", "price range", "average price",
        "median price", "typical price", "how expensive", "afford",
        "what do homes go for", "price per", "cost in"
      ],
      weight: 2.0 // Highest weight - most common intent
    },

    // 2. market_trends - Appreciation and investment data
    {
      intent: "market_trends",
      patterns: [
        "going up", "going down", "market trends", "investment",
        "good investment", "market forecast", "price trends",
        "how fast do homes sell", "days on market", "market velocity", "hot market"
      ],
      weight: 1.5
    },

    // 3. search_articles - Educational content
    {
      intent: "search_articles",
      patterns: [
        // Definitional queries
        "what is an", "what is a", "what are", "how to", "explain", "define",
        "help me understand", "what does", "meaning of",

        // Cost & utility queries
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
      weight: 2.0 // High weight for clear educational queries
    },

    // 4. general - Help, greetings, getting started
    {
      intent: "general",
      patterns: [
        "hello", "hi", "hey", "good morning", "good afternoon", "good evening",
        "help", "help me", "get started", "getting started", "start",
        "what can you do", "how does this work", "how do i use",
        "show me around", "guide me", "what are your features"
      ],
      weight: 1.0
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

// =========================================================================
// HYBRID CLASSIFICATION (AI First, Keyword Fallback)
// =========================================================================

/**
 * Classify user intent using AI first, then keyword fallback
 * This is the main classification function used by the system
 */
export async function classifyIntent(userMessage: string): Promise<IntentResult> {
  // STEP 1: Try AI classification first
  const aiResult = await classifyIntentWithAI(userMessage);

  if (aiResult) {
    console.log("[Intent Classifier] Using AI classification");
    return aiResult;
  }

  // STEP 2: Fallback to keyword system
  console.log("[Intent Classifier] AI failed, falling back to keyword system");
  return classifyIntentWithKeywords(userMessage);
}

// =========================================================================
// TOOL MAPPING
// =========================================================================

/**
 * Get tool name for the classified intent
 * Simplified to 3 core tools
 */
export function getToolForIntent(intent: UserIntent): string | null {
  const intentToTool: Record<UserIntent, string | null> = {
    search_homes: "searchHomes",           // Property search and browsing
    market_trends: "getAppreciation",      // Appreciation and investment data
    search_articles: "searchArticles",     // Educational content
    general: null,                         // Conversational (no tool needed)
    unknown: null                          // Fallback
  };

  return intentToTool[intent];
}

/**
 * Main function: Classify intent and return the single tool to use
 * Now uses AI-first hybrid classification system
 */
export async function selectToolForQuery(userMessage: string): Promise<{
  toolName: string | null;
  intent: UserIntent;
  confidence: number;
  classificationMethod: "ai" | "keyword";
}> {
  const result = await classifyIntent(userMessage); // Now async
  const toolName = getToolForIntent(result.intent);
  const classificationMethod = result.detectedPatterns.includes("ai-classified") ? "ai" : "keyword";

  console.log(`[Intent Classifier] Query: "${userMessage}"`);
  console.log(`[Intent Classifier] Intent: ${result.intent} (${result.confidence.toFixed(2)} confidence)`);
  console.log(`[Intent Classifier] Method: ${classificationMethod}`);
  console.log(`[Intent Classifier] Matched patterns:`, result.detectedPatterns);
  console.log(`[Intent Classifier] Selected tool: ${toolName || "none"}`);

  return {
    toolName,
    intent: result.intent,
    confidence: result.confidence,
    classificationMethod
  };
}
