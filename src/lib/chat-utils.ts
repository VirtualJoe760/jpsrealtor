// src/lib/chat-utils.ts
// Utility functions for chat: prompts, goal extraction, context building

/**
 * User data interface for personalization
 */
export interface UserData {
  name?: string;
  profileDescription?: string;
  realEstateGoals?: string;
  homeownerStatus?: "own" | "rent" | "other";
  topCities?: Array<{ name: string; count: number }>;
  topSubdivisions?: Array<{ name: string; count: number }>;
  favoriteCount?: number;
  chatGoals?: {
    minBudget?: number;
    maxBudget?: number;
    minBeds?: number;
    preferredCities?: string[];
    mustHave?: string[];
    timeline?: string;
  };
}

/**
 * Build the system prompt based on context
 */
export function buildSystemPrompt(
  context: "homepage" | "listing" | "dashboard" | "general",
  listingData?: any,
  userLocation?: { city?: string; region?: string } | null,
  userData?: UserData | null
): string {
  // Build location-specific greeting
  let locationContext = "";
  if (userLocation?.city && userLocation?.region === "California") {
    const city = userLocation.city;
    if (["Palm Springs", "Palm Desert", "Indian Wells", "Rancho Mirage", "La Quinta", "Cathedral City", "Indio", "Coachella", "Desert Hot Springs"].some(c => city.includes(c))) {
      locationContext = `The user is currently in ${city}, right in the Coachella Valley! Welcome them as a local.`;
    } else if (["Los Angeles", "San Diego", "Riverside", "San Bernardino", "Orange County", "Temecula", "Murrieta"].some(c => city.includes(c))) {
      locationContext = `The user is in ${city}. While you specialize in Coachella Valley, acknowledge their location and explain you can help them explore desert real estate.`;
    } else {
      locationContext = `The user is in ${city}, California. Welcome them and explain your focus on Southern California, especially the Coachella Valley.`;
    }
  }

  // Build personalization context
  let personalizationContext = "";
  if (userData) {
    const parts: string[] = [];

    // Add user name for personalization
    if (userData.name) {
      parts.push(`You're helping ${userData.name} find their perfect home.`);
    }

    // Add real estate goals if available
    if (userData.realEstateGoals) {
      parts.push(`Their stated real estate goals: "${userData.realEstateGoals}"`);
    }

    // Add homeowner status context
    if (userData.homeownerStatus) {
      const statusContext = userData.homeownerStatus === "rent"
        ? "They currently rent, so they may be a first-time buyer or looking to transition to homeownership."
        : userData.homeownerStatus === "own"
        ? "They currently own a home, so they may be upgrading, downsizing, or investing."
        : "";
      if (statusContext) parts.push(statusContext);
    }

    // Add favorite cities/subdivisions if they've shown interest
    if (userData.topCities && userData.topCities.length > 0) {
      const cityNames = userData.topCities.slice(0, 3).map(c => c.name).join(", ");
      parts.push(`They've shown interest in: ${cityNames}.`);
    }

    if (userData.topSubdivisions && userData.topSubdivisions.length > 0) {
      const subdivisionNames = userData.topSubdivisions.slice(0, 2).map(s => s.name).join(", ");
      parts.push(`Favorite subdivisions: ${subdivisionNames}.`);
    }

    // Add favorite count for context
    if (userData.favoriteCount && userData.favoriteCount > 0) {
      parts.push(`They've favorited ${userData.favoriteCount} properties so far.`);
    }

    // Add chat goals if available
    if (userData.chatGoals) {
      const goalParts: string[] = [];
      if (userData.chatGoals.minBudget || userData.chatGoals.maxBudget) {
        const budgetStr = userData.chatGoals.maxBudget
          ? `up to $${(userData.chatGoals.maxBudget / 1000000).toFixed(1)}M`
          : `around $${(userData.chatGoals.minBudget! / 1000000).toFixed(1)}M`;
        goalParts.push(`Budget: ${budgetStr}`);
      }
      if (userData.chatGoals.minBeds) {
        goalParts.push(`${userData.chatGoals.minBeds}+ bedrooms`);
      }
      if (userData.chatGoals.preferredCities && userData.chatGoals.preferredCities.length > 0) {
        goalParts.push(`Cities: ${userData.chatGoals.preferredCities.join(", ")}`);
      }
      if (userData.chatGoals.mustHave && userData.chatGoals.mustHave.length > 0) {
        goalParts.push(`Must-haves: ${userData.chatGoals.mustHave.join(", ")}`);
      }
      if (userData.chatGoals.timeline) {
        goalParts.push(`Timeline: ${userData.chatGoals.timeline}`);
      }

      if (goalParts.length > 0) {
        parts.push(`From previous conversations - ${goalParts.join(" | ")}`);
      }
    }

    if (parts.length > 0) {
      personalizationContext = `\n\nABOUT THIS USER:\n${parts.join("\n")}`;
    }
  }

  const basePrompt = `You are Joe's AI assistant for JPSRealtor.com, helping find homes in Southern California.
${locationContext}${personalizationContext}

Primary Expertise: Coachella Valley (Palm Springs, Palm Desert, Indian Wells, Rancho Mirage, La Quinta, Cathedral City)
Secondary Coverage: San Diego County, Orange County, Riverside County, and all of Southern California

IMPORTANT - NEVER DISMISS OTHER AREAS:
- If user asks about San Diego, LA, OC, etc. → Engage! Offer to help them explore
- Compare areas if they're deciding: "Want me to compare San Diego and Coachella Valley for family-friendliness?"
- Show expertise in both areas, don't push them to Coachella Valley
- We serve ALL of Southern California, not just the desert

CONVERSATION STRATEGY:
- Have a CONVERSATION first, search later
- When asked about neighborhoods/communities/areas, ANSWER THE QUESTION (don't search yet!)
- Build context about their needs (family, budget, lifestyle) before showing properties
- Only use searchListings() when they're READY to see actual homes

When to TALK (don't search):
- "What are family-friendly communities?" → Recommend areas, ask follow-up questions
- "Tell me about Indian Wells" → Describe the community, discuss benefits
- "What's the best area for golf?" → Suggest neighborhoods, learn their preferences
- "I have kids" → Ask about ages, schools, discuss family areas

When to SEARCH (use searchListings):
- "Show me homes in Indian Wells" → Search!
- "I want 3 bedrooms under $600k" → Search!
- User confirms "yes" after you've discussed and they're ready
- They ask to see properties after conversation

Style: Friendly, helpful guide. Ask follow-up questions to understand their life, not just their budget.

After searchListings():
- Keep response SHORT (1 sentence)
- DON'T describe listings (carousel shows them!)
- Example: "Found 10 family-friendly homes in Indian Wells." NOT "I found 4 homes... Note: 3/3 means..."`;

  if (context === "homepage") {
    const userName = userData?.name ? ` ${userData.name}` : "";
    const greetingExamples = userData?.name
      ? `"Hey ${userData.name}! What can I help you find today?"` + ', "Hi there! Ready to explore some properties?"'
      : '"Hey! What brings you here today?", "Hi there! Looking for a home in the desert?", "Hey! What can I help you find?"';

    return `${basePrompt}

CURRENT CONTEXT: First conversation${userName ? ` with ${userData?.name || ""}` : ""}
- If they greet you (hi/hello/hey), respond casually and warmly
- Examples: ${greetingExamples}
- Get to their needs quickly - ask about beds, budget, location, or features
- If you know their preferences from before, reference them naturally
- If they tell you what they want, IMMEDIATELY use searchListings to show actual properties`;
  }

  if (context === "listing" && listingData) {
    const { address, listPrice, bedsTotal, bathroomsTotalInteger, livingArea, city, publicRemarks } =
      listingData;

    return `${basePrompt}

CURRENT CONTEXT: Viewing a specific property listing
Property Details:
- Address: ${address || "N/A"}
- Price: $${listPrice?.toLocaleString() || "N/A"}
- Beds/Baths: ${bedsTotal || 0} bd / ${bathroomsTotalInteger || 0} ba
- Size: ${livingArea?.toLocaleString() || "N/A"} sqft
- City: ${city || "N/A"}
${publicRemarks ? `- Description: ${publicRemarks.slice(0, 200)}...` : ""}

Your goal: Answer questions about THIS specific property and help them decide if it matches their goals.`;
  }

  if (context === "dashboard") {
    return `${basePrompt}

CURRENT CONTEXT: User Dashboard
Your goal: Help them review their favorites, refine their search criteria, and prepare for next steps.
Remind them you can help schedule viewings or answer questions about saved properties.`;
  }

  return basePrompt;
}

/**
 * Build conversation history for context
 */
export function buildConversationHistory(
  messages: Array<{ role: string; content: string }>,
  maxMessages: number = 10
): Array<{ role: string; content: string }> {
  // Keep only the most recent messages to avoid token limits
  return messages.slice(-maxMessages);
}

/**
 * Extract real estate goals from conversation using pattern matching and NLP
 * This is a simple version - you could enhance with more sophisticated NLP
 */
export function extractGoalsFromText(text: string): Partial<{
  minBudget: number;
  maxBudget: number;
  minBeds: number;
  minBaths: number;
  preferredCities: string[];
  mustHave: string[];
  timeline: string;
}> {
  const goals: any = {};
  const lowerText = text.toLowerCase();

  // Extract budget
  const budgetPatterns = [
    /(?:budget|price|spend|afford).*?\$?([\d,]+)k?\s*(?:to|-)\s*\$?([\d,]+)k?/i,
    /\$?([\d,]+)k?\s*(?:to|-)\s*\$?([\d,]+)k?\s*(?:budget|price|range)/i,
    /under\s*\$?([\d,]+)k?/i,
    /around\s*\$?([\d,]+)k?/i,
  ];

  for (const pattern of budgetPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      if (match[2]) {
        // Range found
        goals.minBudget = parseNumber(match[1]);
        goals.maxBudget = parseNumber(match[2]);
      } else if (lowerText.includes("under")) {
        goals.maxBudget = parseNumber(match[1]);
      } else {
        goals.maxBudget = parseNumber(match[1]) * 1.1; // Add 10% buffer
        goals.minBudget = parseNumber(match[1]) * 0.9;
      }
      break;
    }
  }

  // Extract beds
  const bedPatterns = [
    /(\d+)\s*(?:\+|or more)?\s*bed(?:room)?s?/i,
    /(\d+)\s*br/i,
  ];
  for (const pattern of bedPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      goals.minBeds = parseInt(match[1], 10);
      break;
    }
  }

  // Extract baths
  const bathPatterns = [
    /(\d+(?:\.\d+)?)\s*bath(?:room)?s?/i,
    /(\d+(?:\.\d+)?)\s*ba/i,
  ];
  for (const pattern of bathPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      goals.minBaths = parseFloat(match[1]);
      break;
    }
  }

  // Extract cities (Coachella Valley)
  const cities = [
    "palm springs",
    "palm desert",
    "indian wells",
    "rancho mirage",
    "la quinta",
    "cathedral city",
    "desert hot springs",
    "indio",
    "coachella",
    "thousand palms",
  ];

  const foundCities = cities.filter((city) => lowerText.includes(city));
  if (foundCities.length > 0) {
    goals.preferredCities = foundCities.map((city) =>
      city
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    );
  }

  // Extract must-have features
  const features = [
    "pool",
    "spa",
    "mountain view",
    "golf course",
    "gated",
    "upgraded kitchen",
    "solar",
    "casita",
    "guest house",
    "rv parking",
    "attached garage",
    "fireplace",
    "waterfront",
  ];

  const foundFeatures = features.filter((feature) => lowerText.includes(feature));
  if (foundFeatures.length > 0) {
    goals.mustHave = foundFeatures.map((f) =>
      f
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    );
  }

  // Extract timeline
  if (lowerText.includes("asap") || lowerText.includes("ready now") || lowerText.includes("immediately")) {
    goals.timeline = "Ready now";
  } else if (lowerText.includes("3-6 months") || lowerText.includes("few months")) {
    goals.timeline = "3-6 months";
  } else if (lowerText.includes("year") || lowerText.includes("12 months")) {
    goals.timeline = "6-12 months";
  } else if (lowerText.includes("browsing") || lowerText.includes("exploring") || lowerText.includes("just looking")) {
    goals.timeline = "Just browsing";
  }

  return goals;
}

/**
 * Parse number from string (handles "1.5M", "750k", "500000", etc.)
 */
function parseNumber(str: string): number {
  const cleaned = str.replace(/,/g, "");
  if (cleaned.toLowerCase().includes("m")) {
    return parseFloat(cleaned) * 1_000_000;
  } else if (cleaned.toLowerCase().includes("k")) {
    return parseFloat(cleaned) * 1_000;
  }
  return parseFloat(cleaned);
}

/**
 * Generate a friendly welcome message based on context
 */
export function getWelcomeMessage(
  context: "homepage" | "listing" | "dashboard",
  userLocation?: { city?: string; region?: string } | null
): string {
  if (context === "homepage") {
    let locationGreeting = "";
    if (userLocation?.city && userLocation?.region === "California") {
      const city = userLocation.city;
      if (["Palm Springs", "Palm Desert", "Indian Wells", "Rancho Mirage", "La Quinta", "Cathedral City"].some(c => city.includes(c))) {
        locationGreeting = `Welcome, ${city} local! `;
      } else if (["Los Angeles", "San Diego", "Riverside", "Temecula", "Murrieta"].some(c => city.includes(c))) {
        locationGreeting = `Hi from ${city}! `;
      }
    }
    return `${locationGreeting}I'm your AI real estate assistant specializing in the Coachella Valley and Southern California. I can search our MLS database in real-time to find your perfect home! What are you looking for?`;
  }
  if (context === "listing") {
    return "Hi! I can answer any questions about this property and search for similar homes. What would you like to know?";
  }
  if (context === "dashboard") {
    return "Welcome back! I can search for new listings that match your preferences or help refine your criteria. What can I help you with?";
  }
  return "Hi! How can I help you today?";
}

/**
 * Generate session ID for grouping related messages
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
