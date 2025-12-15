// src/lib/chat/tools.ts
// Chat tool definitions for Groq AI function calling

import type { GroqTool } from "@/lib/groq";

/**
 * All available tools for the chat AI to use
 */
export const CHAT_TOOLS: GroqTool[] = [
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

CRITICAL TIME FILTERING:
When user asks for "new listings", "latest listings", "recent homes", or "what's new":
→ ALWAYS add listedAfter parameter
→ Default timeframe: 7 days ago from current date
→ Custom timeframes: "this week" = 7 days, "this month" = 30 days

IMPORTANT: The system prompt provides current dates. Use those dynamic dates in your filter.
- Current date is provided as variables in the system prompt
- Use the "7 Days Ago" or "30 Days Ago" dates from the system context
- Format as ISO date string: "YYYY-MM-DD"

Examples (use actual dates from system prompt):
- "New listings in Palm Desert" → { city: "Palm Desert", listedAfter: "2025-12-07", includeStats: true, sort: "newest" }
- "Show me all listings in Orange" → { city: "Orange", includeStats: true } (no time filter - all listings)
- "Latest homes in Indian Wells" → { city: "Indian Wells", listedAfter: "2025-12-07", includeStats: true, sort: "newest" }
- "Listings from past month in La Quinta" → { city: "La Quinta", listedAfter: "2025-11-14", includeStats: true, sort: "newest" }
- "3+ bed homes under $800k" → { minBeds: 3, maxPrice: 800000, includeStats: true }

Always use includeStats: true for market data, and sort: "newest" when using listedAfter.
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
          listedAfter: { type: "string", description: "Listed after date in ISO format (YYYY-MM-DD). Use the '7 Days Ago' or '30 Days Ago' dates provided in system prompt for 'new listings' queries. Example: '2025-12-07'" },

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
  },
  {
    type: "function",
    function: {
      name: "getMarketStats",
      description: `Get comprehensive market statistics for a location including:
- Days on Market (average, median, distribution, trend)
- Price Per Square Foot (average, median, min/max, distribution)
- HOA Fees (average, median, distribution by range, frequency breakdown)
- Property Tax (average, median, effective rate, distribution)

Use this when users ask about:
- Market conditions/statistics (e.g., "how's the market?", "market stats")
- Days on market (e.g., "how fast do homes sell?")
- Price per square foot (e.g., "what's the average price per sqft?")
- HOA fees (e.g., "what are HOA fees like?", "average HOA costs")
- Property taxes (e.g., "how much are property taxes?")
- General market health indicators

Returns comprehensive statistics with sample sizes and distributions.`,
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "City name (e.g., 'Palm Desert', 'Indian Wells', 'La Quinta')"
          },
          subdivision: {
            type: "string",
            description: "Subdivision/neighborhood name (e.g., 'PGA West', 'Indian Wells Country Club')"
          },
          county: {
            type: "string",
            description: "County name (e.g., 'Riverside', 'Los Angeles')"
          },
          propertySubType: {
            type: "string",
            enum: ["Single Family Residence", "Condominium", "Townhouse", "Mobile/Manufactured"],
            description: "Property subtype filter. Defaults to 'Single Family Residence' for residential queries to avoid mixing condos/townhouses."
          },
          stats: {
            type: "string",
            description: "Specific stats to return (comma-separated: 'dom,price_sqft,hoa,tax' or 'all'). Default: 'all'"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getRegionalStats",
      description: `Get comprehensive stats for the entire Coachella Valley region broken down by city. Use this when:
- User asks about "Coachella Valley", "the Valley", or "the desert" broadly
- User wants to see listings across all cities
- User asks "show me new listings in the Coachella Valley"

Returns:
- Regional summary (total listings, avg/median price, price range)
- City-by-city breakdown with counts and stats
- Sorted by city with most listings first

Much faster than calling queryDatabase for each city individually.`,
      parameters: {
        type: "object",
        properties: {
          daysNew: {
            type: "number",
            description: "Filter for 'new' listings within last N days (e.g., 7 for last week, 30 for last month). Omit for all active listings."
          },
          propertyType: {
            type: "string",
            enum: ["sale", "rental"],
            description: "Property type filter. Default: 'sale'"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "lookupSubdivision",
      description: `Find the correct subdivision name from a partial or fuzzy search. Use this when:
- User provides a partial subdivision name (e.g., "Vintage" instead of "Vintage Country Club")
- You're unsure of the exact subdivision name
- The subdivision query returns no results and you want to find similar names
- User says "The [Name]" and you need to find if it's "[Name] Country Club" or similar

Returns the best matching subdivision name with confidence score.`,
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The partial or fuzzy subdivision name (e.g., 'Vintage', 'The Vintage', 'Indian Wells CC')"
          },
          city: {
            type: ["string", "null"],
            description: "Optional city name to narrow the search (e.g., 'Indian Wells'). Omit or use null if city is unknown."
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getNeighborhoodPageLink",
      description: `Get a direct link to a city, county, or subdivision page where users can browse all neighborhoods and subdivisions. Use this as a fallback when:
- You can't find a specific subdivision the user mentioned
- The user asks to "browse neighborhoods" or "see all subdivisions"
- A search returns no results and you want to give them a page to explore
- User asks about a vague location (e.g., "what's available in that area?")
- User wants to see all available neighborhoods in a city

This provides a helpful alternative by directing users to a page where they can explore all available communities and subdivisions themselves.

Returns the URL and description of the page.`,
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "City name (e.g., 'Palm Desert', 'Indian Wells', 'La Quinta'). Provide this if the user mentioned a specific city."
          },
          subdivision: {
            type: "string",
            description: "Subdivision/neighborhood name if known (e.g., 'PGA West', 'Indian Wells Country Club')"
          },
          county: {
            type: "string",
            description: "County name (e.g., 'Riverside', 'Los Angeles', 'Orange'). Provide this if no city is specified."
          }
        },
        required: []
      }
    }
  }
];
