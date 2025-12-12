// src/app/api/chat/stream/route.ts
// Groq-powered AI chat for real estate assistance with investment analysis

import { NextRequest, NextResponse } from "next/server";
import { logChatMessage } from "@/lib/chat-logger";
import { createChatCompletion, GROQ_MODELS } from "@/lib/groq";
import type { GroqChatMessage, GroqTool } from "@/lib/groq";
import endpointsConfig from "@/app/api/ai/console/endpoints.json";
import formulasConfig from "@/app/api/ai/console/formulas.json";

// Define tools for the AI to use
// NOTE: searchListings has been REMOVED - auto-search handles all listing fetching
const CHAT_TOOLS: GroqTool[] = [
  {
    type: "function",
    function: {
      name: "searchArticles",
      description: "Search our real estate blog articles and guides for information. Use this FIRST when user asks questions about real estate topics, market insights, tips, or general information (e.g., 'energy costs', 'hidden costs', 'buying tips', 'HOA fees', etc.). This provides authoritative content we've written with citations and sources.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query based on user's question (e.g., 'energy costs coachella valley', 'hidden costs homeownership', 'first time buyer tips')"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "queryDatabase",
      description: `Query our MLS database with flexible filters. Use this for ANY property search query. Supports:
- Location filters (city, subdivision, ZIP, county)
- Property filters (beds, baths, sqft, year, type)
- Price filters (min/max price, price per sqft)
- Amenity filters (pool, spa, view, garage, HOA)
- Time filters (new listings, days on market, open houses)
- Market statistics and comparisons

Examples:
- "3+ bed homes in Orange under $800k" → { city: "Orange", minBeds: 3, maxPrice: 800000 }
- "New listings this week in Palm Desert" → { city: "Palm Desert", listedAfter: "2025-12-03" }
- "Homes with pool and spa in Indian Wells Country Club" → { subdivision: "Indian Wells Country Club", pool: true, spa: true }
- "Compare home prices in La Quinta vs Palm Desert" → { city: "La Quinta", compareWith: "Palm Desert" }

This replaces searchCity and works with all locations.`,
      parameters: {
        type: "object",
        properties: {
          // LOCATION (choose one)
          city: { type: "string", description: "City name (e.g., 'Orange', 'Palm Desert')" },
          subdivision: { type: "string", description: "Subdivision/neighborhood name" },
          zip: { type: "string", description: "ZIP code (e.g., '92260')" },
          county: { type: "string", description: "County name (e.g., 'Riverside')" },

          // PROPERTY FILTERS
          propertySubType: {
            type: "string",
            enum: ["Single Family", "Condominium", "Townhouse", "Mobile/Manufactured"],
            description: "Property subtype"
          },
          minBeds: { type: "number", description: "Minimum bedrooms" },
          maxBeds: { type: "number", description: "Maximum bedrooms" },
          minBaths: { type: "number", description: "Minimum bathrooms" },
          maxBaths: { type: "number", description: "Maximum bathrooms" },
          minSqft: { type: "number", description: "Minimum square footage" },
          maxSqft: { type: "number", description: "Maximum square footage" },
          minYear: { type: "number", description: "Minimum year built" },
          maxYear: { type: "number", description: "Maximum year built" },

          // PRICE FILTERS
          minPrice: { type: "number", description: "Minimum price" },
          maxPrice: { type: "number", description: "Maximum price" },

          // AMENITY FILTERS
          pool: { type: "boolean", description: "Has pool" },
          spa: { type: "boolean", description: "Has spa" },
          view: { type: "boolean", description: "Has view" },
          gated: { type: "boolean", description: "Gated community" },
          minGarages: { type: "number", description: "Minimum garage spaces" },

          // TIME FILTERS
          maxDaysOnMarket: { type: "number", description: "Maximum days on market" },
          listedAfter: { type: "string", description: "Listed after date (ISO format: '2025-12-01')" },

          // INCLUDE OPTIONS
          includeStats: { type: "boolean", description: "Include market statistics", default: true },
          includeDOMStats: { type: "boolean", description: "Include days on market analysis" },
          compareWith: { type: "string", description: "Compare with another city/subdivision" },

          // PAGINATION
          limit: { type: "number", description: "Max results (default 100)" },
          sort: {
            type: "string",
            enum: ["price-asc", "price-desc", "newest", "oldest", "sqft-asc", "sqft-desc"],
            description: "Sort order"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "matchLocation",
      description: "[DEPRECATED - Use queryDatabase instead] Resolve a SPECIFIC location query (subdivision/neighborhood/community name) to geographic data. Use this when user asks about a SPECIFIC subdivision like 'Palm Desert Country Club', 'Indian Wells Country Club', etc. Do NOT use for general city queries like 'Palm Desert' or 'La Quinta' - use searchCity instead.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The specific subdivision/community name (e.g., 'Palm Desert Country Club', 'PGA West', 'Indian Wells Country Club')"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "searchCity",
      description: "[DEPRECATED - Use queryDatabase instead] Search ALL properties in an entire city. Use this when user asks for homes in just a city name like 'Palm Desert', 'La Quinta', 'Indian Wells', etc. WITHOUT specifying a subdivision. This returns ALL active listings citywide.",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "City name (e.g., 'Palm Desert', 'La Quinta', 'Indian Wells')"
          }
        },
        required: ["city"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getAppreciation",
      description: `Get property appreciation analytics for a location over time. Use this when users ask about:
- Market appreciation/growth/trends (e.g., "how much have homes appreciated?")
- Property value changes (e.g., "are prices going up or down?")
- Investment potential (e.g., "is this a good market?")
- Market statistics (e.g., "what's the market trend?")
- Historical price data (e.g., "how have prices changed?")

Provides annual appreciation rate, cumulative appreciation, trend analysis, and market confidence metrics.`,
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "City name (e.g., 'Palm Desert', 'Indian Wells', 'La Quinta')"
          },
          subdivision: {
            type: "string",
            description: "Subdivision/neighborhood name (e.g., 'Indian Wells Country Club', 'PGA West')"
          },
          county: {
            type: "string",
            description: "County name (e.g., 'Riverside', 'Los Angeles')"
          },
          period: {
            type: "string",
            enum: ["1y", "3y", "5y", "10y"],
            description: "Time period for analysis: '1y' (1 year), '3y' (3 years), '5y' (5 years, default), '10y' (10 years)"
          },
          propertySubType: {
            type: "string",
            enum: ["Single Family", "Condominium", "Townhouse", "Mobile/Manufactured"],
            description: "Property subtype filter. Defaults to 'Single Family' for residential queries to avoid mixing condos/townhouses. Use 'Condominium' or 'Townhouse' only if user explicitly asks about condos or townhomes."
          }
        },
        required: []
      }
    }
  }
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, userId, userTier = "free" } = body;

    if (!messages || !Array.isArray(messages) || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: messages (array) and userId" },
        { status: 400 }
      );
    }

    // Check if Groq API key is configured
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "your_groq_api_key_here") {
      console.error("⚠️  GROQ_API_KEY is not configured!");
      return NextResponse.json(
        {
          error: "AI service not configured. Please add GROQ_API_KEY to your environment variables.",
          details: "Get your API key from https://console.groq.com/"
        },
        { status: 500 }
      );
    }

    const startTime = Date.now();

    // Determine which model to use based on tier
    const model = userTier === "premium" ? GROQ_MODELS.PREMIUM : GROQ_MODELS.FREE;

    // Log API request
    await logChatMessage("system", `Groq chat request (${model})`, userId, {
      messageCount: messages.length,
      userTier,
      timestamp: new Date().toISOString(),
    });

    // Inject AI Console system prompt with endpoint docs and formulas
    const systemPrompt = buildEnhancedSystemPrompt();

    // Convert messages to Groq format, adding system prompt if not already present
    const groqMessages: GroqChatMessage[] = [];

    // Add system prompt if first message isn't already a system message
    if (messages.length === 0 || messages[0].role !== "system") {
      groqMessages.push({
        role: "system",
        content: systemPrompt
      });
    }

    // Add user messages
    groqMessages.push(...messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    })));

    // Get AI response from Groq with tool support
    // AI can choose between matchLocation (subdivisions) and searchCity (city-wide)
    let completion = await createChatCompletion({
      messages: groqMessages,
      model,
      temperature: 0.3,
      maxTokens: 500,
      stream: false,
      tools: CHAT_TOOLS,
      tool_choice: "auto", // Let AI decide between matchLocation and searchCity
    });

    // Check if AI wants to use tools
    const assistantMessage: any = 'choices' in completion ? completion.choices[0]?.message : null;

    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log("[TOOL CALLS] AI requested:", assistantMessage.tool_calls.map((tc: any) => tc.function.name));
      console.log("[TOOL CALLS] Full details:", JSON.stringify(assistantMessage.tool_calls, null, 2));

      // Execute all tool calls
      const toolResults = await Promise.all(
        assistantMessage.tool_calls.map(async (toolCall: any) => {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);

          console.log(`[EXECUTING] ${functionName} with args:`, JSON.stringify(functionArgs, null, 2));

          let result: any;

          try {
            if (functionName === "queryDatabase") {
              // Use the new modular query system
              const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/query`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  city: functionArgs.city,
                  subdivision: functionArgs.subdivision,
                  zip: functionArgs.zip,
                  county: functionArgs.county,
                  filters: {
                    propertySubType: functionArgs.propertySubType,
                    minBeds: functionArgs.minBeds,
                    maxBeds: functionArgs.maxBeds,
                    minBaths: functionArgs.minBaths,
                    maxBaths: functionArgs.maxBaths,
                    minSqft: functionArgs.minSqft,
                    maxSqft: functionArgs.maxSqft,
                    minYear: functionArgs.minYear,
                    maxYear: functionArgs.maxYear,
                    minPrice: functionArgs.minPrice,
                    maxPrice: functionArgs.maxPrice,
                    pool: functionArgs.pool,
                    spa: functionArgs.spa,
                    view: functionArgs.view,
                    gated: functionArgs.gated,
                    minGarages: functionArgs.minGarages,
                    maxDaysOnMarket: functionArgs.maxDaysOnMarket,
                    listedAfter: functionArgs.listedAfter ? new Date(functionArgs.listedAfter) : undefined,
                    limit: functionArgs.limit || 100,
                    sort: functionArgs.sort
                  },
                  includeStats: functionArgs.includeStats !== false, // Default to true
                  includeDOMStats: functionArgs.includeDOMStats,
                  includeComparison: functionArgs.compareWith ? {
                    compareWith: functionArgs.compareWith,
                    isCity: true // Assume city comparison by default
                  } : undefined
                })
              });

              const queryResult = await response.json();

              // Format response for AI
              if (queryResult.success) {
                const allListings = queryResult.listings || [];
                const stats = queryResult.stats || {};
                const domStats = queryResult.domStats || {};
                const comparison = queryResult.comparison;

                // Calculate center coordinates
                const validCoords = allListings.filter((l: any) => l.latitude && l.longitude);
                const centerLat = validCoords.length > 0
                  ? validCoords.reduce((sum: number, l: any) => sum + l.latitude, 0) / validCoords.length
                  : null;
                const centerLng = validCoords.length > 0
                  ? validCoords.reduce((sum: number, l: any) => sum + l.longitude, 0) / validCoords.length
                  : null;

                result = {
                  success: true,
                  summary: {
                    count: queryResult.meta.totalListings,
                    priceRange: { min: stats.minPrice || 0, max: stats.maxPrice || 0 },
                    avgPrice: stats.avgPrice || 0,
                    medianPrice: stats.medianPrice || 0,
                    avgPricePerSqft: stats.avgPricePerSqft,
                    avgDaysOnMarket: stats.avgDaysOnMarket,
                    center: centerLat && centerLng ? { lat: centerLat, lng: centerLng } : null,
                    // DOM stats if requested
                    marketVelocity: domStats.marketVelocity,
                    freshListings: domStats.freshListings,
                    staleListings: domStats.staleListings,
                    domInsights: domStats.insights,
                    // Comparison if requested
                    comparison: comparison ? {
                      winner: comparison.winner,
                      insights: comparison.insights,
                      differences: comparison.differences
                    } : undefined,
                    // Sample listings for AI (top 10)
                    sampleListings: allListings.slice(0, 10).map((l: any) => ({
                      id: l.listingKey,
                      price: l.listPrice,
                      beds: l.bedroomsTotal || l.bedsTotal,
                      baths: l.bathroomsTotalDecimal,
                      sqft: l.livingArea,
                      address: l.address || l.unparsedAddress,
                      city: l.city,
                      subdivision: l.subdivisionName,
                      image: l.primaryPhotoUrl || "",
                      url: `/mls-listings/${l.slug || l.listingKey}`,
                      latitude: l.latitude,
                      longitude: l.longitude
                    }))
                  },
                  meta: queryResult.meta
                };
              } else {
                result = { error: queryResult.error || "Query failed" };
              }
            } else if (functionName === "matchLocation") {
              const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/chat/match-location`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(functionArgs)
              });
              result = await response.json();
            } else if (functionName === "searchArticles") {
              const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/articles/search`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(functionArgs)
              });
              result = await response.json();
            } else if (functionName === "searchCity") {
              const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/chat/search-city`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(functionArgs)
              });
              result = await response.json();
            } else if (functionName === "getAppreciation") {
              // Build query params for appreciation API
              const params = new URLSearchParams();
              if (functionArgs.city) params.append("city", functionArgs.city);
              if (functionArgs.subdivision) params.append("subdivision", functionArgs.subdivision);
              if (functionArgs.county) params.append("county", functionArgs.county);
              if (functionArgs.period) params.append("period", functionArgs.period);
              if (functionArgs.propertySubType) params.append("propertySubType", functionArgs.propertySubType);

              const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/analytics/appreciation?${params.toString()}`);
              result = await response.json();
            } else {
              result = { error: `Unknown function: ${functionName}` };
            }
          } catch (error: any) {
            console.error(`Error executing ${functionName}:`, error);
            result = { error: error.message };
          }

          console.log(`[RESULT] ${functionName}:`, JSON.stringify(result).substring(0, 200));

          // AUTOMATIC SEARCH: If matchLocation succeeded, call the WORKING subdivision endpoint
          // This bypasses the broken search-listings endpoint entirely
          if (functionName === "matchLocation" && result.success && result.match?.type === "subdivision") {
            console.log("[AUTO-SEARCH] Subdivision match found, using working /api/subdivisions endpoint");

            try {
              // Generate slug from subdivision name
              const subdivisionName = result.match.name;
              const slug = subdivisionName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

              console.log("[AUTO-SEARCH] Fetching from /api/subdivisions/" + slug + "/listings");

              // Call the WORKING endpoint that returns 31+ listings
              const listingsResponse = await fetch(
                `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/subdivisions/${slug}/listings?limit=100`,
                { method: "GET" }
              );
              const listingsData = await listingsResponse.json();

              const allListings = listingsData.listings || [];
              const totalCount = listingsData.pagination?.total || allListings.length;

              console.log("[AUTO-SEARCH] Found", totalCount, "listings from working endpoint");

              // ANALYTICS PATTERN: Use accurate stats from API, not calculated from sample
              const apiStats = listingsData.stats || {};
              const minPrice = apiStats.priceRange?.min || 0;
              const maxPrice = apiStats.priceRange?.max || 0;
              const avgPrice = apiStats.avgPrice || 0;
              const medianPrice = apiStats.medianPrice || 0;

              // Calculate center coordinates for map
              const validCoords = allListings.filter((l: any) => l.latitude && l.longitude);
              const centerLat = validCoords.length > 0
                ? validCoords.reduce((sum: number, l: any) => sum + parseFloat(l.latitude), 0) / validCoords.length
                : 33.72;
              const centerLng = validCoords.length > 0
                ? validCoords.reduce((sum: number, l: any) => sum + parseFloat(l.longitude), 0) / validCoords.length
                : -116.37;

              // Return summary + 10 sample listings for AI (formatted for components)
              result.summary = {
                count: totalCount,
                priceRange: { min: minPrice, max: maxPrice },
                avgPrice: avgPrice,
                medianPrice: medianPrice,
                center: { lat: centerLat, lng: centerLng },
                sampleListings: allListings.slice(0, 10).map((l: any) => ({
                  id: l.listingId || l.listingKey,
                  price: l.listPrice,
                  beds: l.bedroomsTotal || l.bedsTotal,
                  baths: l.bathroomsTotalDecimal,
                  sqft: l.livingArea,
                  address: l.address || l.unparsedAddress,
                  city: l.city,
                  subdivision: subdivisionName,
                  image: l.primaryPhotoUrl || "",
                  url: `/mls-listings/${l.slugAddress || l.listingId}`,
                  latitude: parseFloat(l.latitude) || null,
                  longitude: parseFloat(l.longitude) || null
                }))
              };

              console.log("[AUTO-SEARCH] Summary:", JSON.stringify(result.summary, null, 2));
            } catch (error: any) {
              console.error("[AUTO-SEARCH] Failed:", error);
            }
          }

          return {
            role: "tool" as const,
            tool_call_id: toolCall.id,
            name: functionName,
            content: JSON.stringify(result)
          };
        })
      );

      // Send tool results back to AI for final response
      const messagesWithTools: GroqChatMessage[] = [
        ...groqMessages,
        assistantMessage,
        ...toolResults
      ];

      console.log("[TOOL RESULTS] Sending results back to AI for final response");
      console.log("[TOOL RESULTS] Message count:", messagesWithTools.length);

      // Try to get AI response without tools first
      try {
        completion = await createChatCompletion({
          messages: messagesWithTools,
          model,
          temperature: 0.3,
          maxTokens: 4000,
          stream: false,
          tool_choice: "none" // Prevent tool calls on final response
        });
        console.log("[AI RESPONSE] Completion:", JSON.stringify(completion.choices[0], null, 2).substring(0, 500));
      } catch (toolError: any) {
        // If model tries to call tools despite tool_choice: "none", retry without the restriction
        console.log("[AI RESPONSE] Model tried to call tools, retrying without tool_choice restriction");
        completion = await createChatCompletion({
          messages: messagesWithTools,
          model,
          temperature: 0.3,
          maxTokens: 4000,
          stream: false
          // Let model call tools if it insists, we'll handle it in next iteration
        });
        console.log("[AI RESPONSE] Retry completion:", JSON.stringify(completion.choices[0], null, 2).substring(0, 500));
      }
    }

    // Extract final response
    const responseText = 'choices' in completion ? (completion.choices[0]?.message?.content || "") : "";

    if (!responseText) {
      console.error("[AI RESPONSE] WARNING: Empty response from AI");
      console.error("[AI RESPONSE] Full completion:", JSON.stringify(completion, null, 2).substring(0, 1000));
    }

    // Log response
    await logChatMessage("assistant", responseText, userId, {
      model,
      processingTime: Date.now() - startTime,
    });

    // Parse component data from response for structured rendering
    const componentData = parseComponentData(responseText);

    // Clean response text (remove JSON blocks, keep conversational text)
    const cleanedResponse = cleanResponseText(responseText);

    return NextResponse.json({
      success: true,
      response: cleanedResponse,
      components: componentData, // Structured data for ListingCarousel and ChatMapView
      metadata: {
        model,
        processingTime: Date.now() - startTime,
        tier: userTier,
      },
    });
  } catch (error: any) {
    console.error("Groq API chat error:", error);

    return NextResponse.json(
      { error: "Failed to process chat request", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Build comprehensive system prompt with API documentation and formulas
 */
function buildEnhancedSystemPrompt(): string {
  const currentDate = new Date().toISOString().split('T')[0];

  return `You are an expert real estate AI assistant for JPSRealtor.com with advanced investment analysis capabilities.

# Your Role
You help users find properties, analyze investments, generate CMAs (Comparative Market Analyses), and provide data-driven real estate insights for Southern California markets.

# CRITICAL: Tool Usage Workflow

**PRIORITY 1: Search Articles First for Information Questions**

When a user asks a QUESTION about real estate topics (not property searches):
- "What are energy costs like?"
- "Tell me about hidden costs of homeownership"
- "What should I know about HOAs?"
- "Tips for first-time buyers"

1. **CALL searchArticles FIRST** - Check our authoritative content
   - Use searchArticles({"query": "user question keywords"})
   - We have comprehensive guides on:
     * Energy costs (SCE vs IID rates in Coachella Valley)
     * Hidden costs of homeownership
     * Buying/selling tips and guides
     * Market insights and trends
     * HOA and community information
     * Local market analysis

2. **ARTICLE RESPONSE FORMAT** - Use this when articles are found:

   [ARTICLE_RESULTS]
   {
     "results": [array of article objects from API],
     "query": "user's original question"
   }
   [/ARTICLE_RESULTS]

   Based on our article "[Article Title]", here's what you need to know...

   [Provide answer using article content, cite the source]

   **Source:** [Article Title] - Read more: /articles/[slug]

3. **If no articles found** - Provide general answer and suggest we can write about it

4. **For property searches** - Skip to matchLocation/searchCity below

---

When a user asks to "show me homes in [location]":

1. **ALWAYS CALL queryDatabase FIRST** - Modern flexible query system (REQUIRED)
   - For ANY property search, ALWAYS use queryDatabase first
   - Supports 30+ filters: city, subdivision, ZIP, beds, baths, price, amenities, stats, appreciation
   - Examples:
     * "homes in Orange" → queryDatabase({"city": "Orange", "includeStats": true})
     * "3+ bed homes in Orange under $800k" → queryDatabase({"city": "Orange", "minBeds": 3, "maxPrice": 800000, "includeStats": true})
     * "Homes with pool and spa in Palm Desert" → queryDatabase({"city": "Palm Desert", "pool": true, "spa": true, "includeStats": true})
     * "New listings this week" → queryDatabase({"city": "Orange", "listedAfter": "2025-12-03", "includeStats": true})
     * "Compare La Quinta vs Palm Desert" → queryDatabase({"city": "La Quinta", "compareWith": "Palm Desert", "includeStats": true})
     * "Subdivision search" → queryDatabase({"subdivision": "Indian Wells Country Club", "includeStats": true})
   - The backend automatically fetches listings and calculates statistics
   - ALWAYS set "includeStats": true to get market data
   - You will receive a summary object with property statistics and market insights

   **DEPRECATED TOOLS (DO NOT USE):**
   - matchLocation - DEPRECATED, use queryDatabase with subdivision parameter
   - searchCity - DEPRECATED, use queryDatabase with city parameter
   - These legacy tools are being phased out and should NOT be used

2. **AUTOMATIC LISTING FETCH** - No additional tool calls needed
   - The tool result will include a summary object with:
     * count: Total number of listings found
     * priceRange: { min, max } prices
     * avgPrice: Average listing price
     * center: { lat, lng } coordinates for map
     * sampleListings: Array of 10 sample properties with full details
   - Use this data to build your response

3. **RESPONSE FORMAT** - CRITICAL: Use component markers to trigger rich UI:

   When showing properties, you MUST use this EXACT format:

   I found [count] properties in [location name]!

   [LISTING_CAROUSEL]
   {
     "title": "[count] homes in [location]",
     "listings": [array of 8-10 sample listings from sampleListings]
   }
   [/LISTING_CAROUSEL]

   [MAP_VIEW]
   {
     "listings": [same sample listings with latitude/longitude],
     "center": {"lat": [centerLat], "lng": [centerLng]},
     "zoom": 13
   }
   [/MAP_VIEW]

   Here are the top listings with photos, prices, and exact locations on the map.

   Price range: $[min] - $[max]
   Average: $[avgPrice]

   IMPORTANT: The [LISTING_CAROUSEL] and [MAP_VIEW] markers trigger interactive UI components.
   Always include them when showing property results. Use the sampleListings data exactly as provided.

4. **CRITICAL RULES**:
   - **ALWAYS use queryDatabase for ALL property searches** - This is REQUIRED, not optional
   - **NEVER use matchLocation or searchCity** - These are deprecated and being removed
   - **ALWAYS set includeStats: true** - This provides essential market data
   - Backend automatically fetches all listings - no additional tool calls needed
   - Use data from result.summary object
   - Present the sampleListings array with full formatting in component markers
   - If queryDatabase fails with an error, report the error to the user and ask them to try again

---

**APPRECIATION ANALYTICS**

When users ask about market appreciation, growth, trends, or historical price data:

1. **CALL getAppreciation** - Get property appreciation analytics
   - For cities: getAppreciation({"city": "Palm Desert", "period": "5y"})
   - For subdivisions: getAppreciation({"subdivision": "Indian Wells Country Club", "period": "3y"})
   - For counties: getAppreciation({"county": "Riverside", "period": "10y"})
   - Periods: "1y", "3y", "5y", "10y" (default: "5y")

2. **RESPONSE FORMAT** - Use this EXACT format when showing appreciation data:

   The [location] market has shown [trend] growth over the past [X] years.

   [APPRECIATION]
   {
     "location": {
       "city": "Palm Desert",
       "subdivision": null,
       "county": null
     },
     "period": "5y",
     "appreciation": {
       "annual": 6.5,
       "cumulative": 37.2,
       "trend": "increasing"
     },
     "marketData": {
       "startMedianPrice": 450000,
       "endMedianPrice": 617000,
       "totalSales": 523,
       "confidence": "high"
     },
     "metadata": {
       "mlsSources": ["GPS", "CRMLS"]
     }
   }
   [/APPRECIATION]

   This represents strong market growth with [X]% annual appreciation and [Y]% cumulative appreciation.

   IMPORTANT: The [APPRECIATION] marker triggers an interactive analytics card with charts and detailed metrics.
   Always include it when presenting appreciation data.

---

# Core Capabilities

## 1. Available API Endpoints
${JSON.stringify(endpointsConfig.endpoints, null, 2)}

## 2. Investment Analysis Formulas
You have access to these industry-standard real estate investment formulas:

**Cap Rate (Capitalization Rate)**
- Formula: (Annual NOI ÷ Property Value) × 100
- Good Range: 4-10% (higher is better)
- Use: Compare income-producing properties

**Cash-on-Cash Return**
- Formula: (Annual Pre-Tax Cash Flow ÷ Total Cash Invested) × 100
- Good Range: 8-12%
- Use: Evaluate cash flow relative to cash invested

**1% Rule (Quick Screening)**
- Formula: Monthly Rent ≥ (Purchase Price × 0.01)
- Use: Quickly filter investment-worthy properties

**Gross Rent Multiplier (GRM)**
- Formula: Property Price ÷ Annual Gross Rent
- Good Range: 4-7 (lower is better)
- Use: Compare properties regardless of expenses

**Debt Service Coverage Ratio (DSCR)**
- Formula: NOI ÷ Annual Debt Service
- Good Range: ≥1.25 (lenders often require this)
- Use: Assess ability to cover mortgage from income

**Monthly Cash Flow**
- Formula: Monthly Rent - Total Monthly Expenses
- Good Range: Positive! $200-500+ per door is strong
- Use: Determine monthly profitability

## 3. CMA Generation
When users ask for a CMA or market analysis:
1. Suggest using the /api/ai/cma endpoint
2. Explain you'll analyze comparable properties
3. Calculate price per sqft, DOM, price trends
4. Provide estimated value range
5. Include market context (buyer's vs seller's market)

## 4. Response Guidelines

**For Property Searches:**
- Always use /api/chat/match-location FIRST to resolve locations
- Present key details: price, beds/baths, sqft, $/sqft
- Highlight value propositions and unique features
- Provide market context (DOM, trends)

**For Investment Analysis:**
- State all assumptions clearly (interest rate, down payment, etc.)
- Calculate multiple metrics (Cap Rate, CoC, Cash Flow, DSCR)
- Explain metrics in plain English
- Rate each metric (excellent/good/poor)
- Provide clear recommendation with risk assessment
- Always remind: "Consult financial/legal advisors"

**For CMAs:**
- Identify comparable properties (similar size, age, location)
- Calculate median/average $/sqft
- Analyze DOM and price reductions
- Provide estimated value range
- Explain market conditions clearly

## 5. Best Practices
- Round percentages to 2 decimals (7.25%)
- Format prices with commas ($450,000)
- Explain technical terms simply
- Provide context (e.g., "7% cap rate is excellent")
- Be transparent about assumptions and limitations
- Never guarantee future performance
- Handle missing data gracefully

## 6. Property Data Reference
- Property Types: A=Residential Sale, B=Lease, C=Multi-Family
- MLS Status: Active, Pending, Sold, Expired
- Price per sqft is key comparison metric
- DOM (Days on Market) indicates competitiveness

## 7. Market Context
Current date: ${currentDate}

Market indicators:
- DOM < 30 days = seller's market
- DOM 30-60 days = balanced market
- DOM > 60 days = buyer's market

Investment benchmarks:
- Cap Rate 7%+ = excellent
- Cash-on-Cash 8%+ = good
- DSCR 1.25+ = safe
- 1% Rule = minimum screening

## 8. Example Interactions

User: "Find me investment properties in Corona under $500k"
You:
1. Use /api/chat/match-location with "Corona"
2. Use /api/mls-listings with bounds + maxPrice=500000
3. Present top properties with $/sqft analysis
4. Suggest running investment analysis on promising ones

User: "Analyze 123 Main St as an investment"
You:
1. Get property details from /api/mls-listings/[slug]
2. Suggest generating CMA with /api/ai/cma
3. Calculate Cap Rate, CoC Return, Cash Flow, DSCR
4. Explain each metric and provide recommendation
5. Note assumptions and risks

User: "What's the market like in Palm Desert?"
You:
1. Get city stats from /api/cities/[cityId]/stats
2. Get active listings for trend analysis
3. Calculate avg $/sqft, DOM, inventory levels
4. Provide market assessment (buyer's vs seller's)

## 9. Important Reminders
- Always verify location with match-location API first
- Explain your calculations step-by-step
- Real estate is location-specific - context matters
- Investment results are never guaranteed
- Encourage professional consultation for major decisions
- Be helpful, accurate, and transparent

Now assist the user with their real estate needs using these tools and knowledge!`;
}

/**
 * Parse component markers from AI response and extract structured data
 */
function parseComponentData(responseText: string): { carousel?: any; mapView?: any; articles?: any; appreciation?: any } {
  const components: { carousel?: any; mapView?: any; articles?: any; appreciation?: any } = {};

  // Parse [LISTING_CAROUSEL]...[/LISTING_CAROUSEL]
  const carouselMatch = responseText.match(/\[LISTING_CAROUSEL\]\s*([\s\S]*?)\s*\[\/LISTING_CAROUSEL\]/);
  if (carouselMatch) {
    try {
      const jsonStr = carouselMatch[1].trim();
      components.carousel = JSON.parse(jsonStr);
      console.log("[PARSE] Found carousel with", components.carousel?.listings?.length || 0, "listings");
    } catch (e) {
      console.error("[PARSE] Failed to parse carousel JSON:", e);
    }
  }

  // Parse [MAP_VIEW]...[/MAP_VIEW]
  const mapMatch = responseText.match(/\[MAP_VIEW\]\s*([\s\S]*?)\s*\[\/MAP_VIEW\]/);
  if (mapMatch) {
    try {
      const jsonStr = mapMatch[1].trim();
      components.mapView = JSON.parse(jsonStr);
      console.log("[PARSE] Found map view with", components.mapView?.listings?.length || 0, "listings");
    } catch (e) {
      console.error("[PARSE] Failed to parse map view JSON:", e);
    }
  }

  // Parse [APPRECIATION]...[/APPRECIATION]
  const appreciationMatch = responseText.match(/\[APPRECIATION\]\s*([\s\S]*?)\s*\[\/APPRECIATION\]/);
  if (appreciationMatch) {
    try {
      const jsonStr = appreciationMatch[1].trim();
      components.appreciation = JSON.parse(jsonStr);
      console.log("[PARSE] Found appreciation data for", components.appreciation?.location?.city || components.appreciation?.location?.subdivision || components.appreciation?.location?.county || "location");
    } catch (e) {
      console.error("[PARSE] Failed to parse appreciation JSON:", e);
    }
  }

  return components;
}

/**
 * Remove component markers and JSON blocks, keeping only conversational text
 */
function cleanResponseText(responseText: string): string {
  let cleaned = responseText;

  // Remove [LISTING_CAROUSEL]...[/LISTING_CAROUSEL] blocks
  cleaned = cleaned.replace(/\[LISTING_CAROUSEL\]\s*[\s\S]*?\s*\[\/LISTING_CAROUSEL\]/g, '');

  // Remove [MAP_VIEW]...[/MAP_VIEW] blocks
  cleaned = cleaned.replace(/\[MAP_VIEW\]\s*[\s\S]*?\s*\[\/MAP_VIEW\]/g, '');

  // Remove [APPRECIATION]...[/APPRECIATION] blocks
  cleaned = cleaned.replace(/\[APPRECIATION\]\s*[\s\S]*?\s*\[\/APPRECIATION\]/g, '');

  // Clean up extra whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

// Example integration with OpenAI (commented out - uncomment and configure when ready):
/*
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { messages, userId, temperature = 0.6, maxTokens = 1000 } = await req.json();

    const stream = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: messages,
      temperature: temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    // Create streaming response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || '';
          controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
*/
