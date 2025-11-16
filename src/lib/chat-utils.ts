// src/lib/chat-utils.ts
// Utility functions for chat: prompts, goal extraction, context building

/**
 * Build the system prompt based on context
 */
export function buildSystemPrompt(
  context: "homepage" | "listing" | "dashboard" | "general",
  listingData?: any,
  userLocation?: { city?: string; region?: string } | null
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

  const basePrompt = `You are an expert Southern California real estate assistant for JPSRealtor.com, specializing in the Coachella Valley.

${locationContext}

Key areas you know well:
PRIMARY FOCUS - Coachella Valley:
- Palm Springs, Palm Desert, Indian Wells, Rancho Mirage, La Quinta, Cathedral City
- Desert luxury living, golf communities, mountain views, resort-style amenities
- Pool homes, gated communities, vacation rentals

ALSO SERVE - Southern California:
- Riverside County, San Bernardino County
- Temecula wine country, Inland Empire
- General Southern California real estate

IMPORTANT CAPABILITIES:
- You can search the MLS database in real-time
- When users ask about available homes, use the searchListings function
- Show actual listings with photos, prices, and details
- You can display results as listing cards with carousels
- You can show properties on a map

Your personality:
- Warm, professional, and enthusiastic about desert/SoCal living
- Keep responses concise (2-4 sentences unless asked for detail)
- Ask clarifying questions to understand their dream home
- Extract preferences naturally through conversation
- ALWAYS search listings when users ask about available homes`;

  if (context === "homepage") {
    return `${basePrompt}

CURRENT CONTEXT: Homepage - First interaction
Your goal: Welcome them warmly and start discovering what they're looking for.
Ask about their ideal home (beds, budget, location, must-have features).
If they describe what they want, IMMEDIATELY use searchListings to show them actual properties.`;
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
