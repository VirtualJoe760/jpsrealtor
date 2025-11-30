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
      name: "matchLocation",
      description: "Resolve a SPECIFIC location query (subdivision/neighborhood/community name) to geographic data. Use this when user asks about a SPECIFIC subdivision like 'Palm Desert Country Club', 'Indian Wells Country Club', etc. Do NOT use for general city queries like 'Palm Desert' or 'La Quinta' - use searchCity instead.",
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
      description: "Search ALL properties in an entire city. Use this when user asks for homes in just a city name like 'Palm Desert', 'La Quinta', 'Indian Wells', etc. WITHOUT specifying a subdivision. This returns ALL active listings citywide.",
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
            if (functionName === "matchLocation") {
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

              // Calculate summary stats from ALL listings
              const prices = allListings.map((l: any) => l.listPrice || 0).filter((p: number) => p > 0);
              const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
              const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
              const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length) : 0;

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

      // CRITICAL: NO TOOLS on final call - AI must respond with text, not call tools again
      completion = await createChatCompletion({
        messages: messagesWithTools,
        model,
        temperature: 0.3,
        maxTokens: 4000, // Increased to accommodate full listing JSON response
        stream: false,
        // Intentionally omit tools and tool_choice - AI should present results, not call more tools
      });

      console.log("[AI RESPONSE] Completion:", JSON.stringify(completion.choices[0], null, 2).substring(0, 500));
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

1. **CALL matchLocation or searchCity** - The system automatically fetches listings
   - For SPECIFIC subdivisions: matchLocation({"query": "palm desert country club"})
   - For ENTIRE cities: searchCity({"city": "Palm Desert"})
   - The backend automatically fetches all listings from the working endpoint
   - You will receive a summary object with property statistics

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
   - ONLY call matchLocation (for subdivisions) or searchCity (for cities)
   - Backend automatically fetches all listings - no additional tool calls needed
   - Use data from result.summary object
   - Present the sampleListings array with full formatting in component markers

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
function parseComponentData(responseText: string): { carousel?: any; mapView?: any; articles?: any } {
  const components: { carousel?: any; mapView?: any; articles?: any } = {};

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
