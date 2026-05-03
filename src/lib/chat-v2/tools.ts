// src/lib/chat-v2/tools.ts
// Clean tool registry - Industry standard pattern
// Adding a new tool: Just add a new object to the array!

import type { ChatCompletionTool } from "groq-sdk/resources/chat/completions";

/**
 * All available tools for the chat AI
 * The AI receives ALL tools and decides which to use
 *
 * To add a new tool:
 * 1. Add tool definition here
 * 2. Add executor in tool-executors.ts
 * 3. That's it!
 */
export const ALL_TOOLS: ChatCompletionTool[] = [
  // =========================================================================
  // TOOL 1: Search Homes - Property browsing and search
  // =========================================================================
  {
    type: "function",
    function: {
      name: "searchHomes",
      description: "Search for homes and properties. Use for any property search, browsing, new listings, or pricing questions. Supports comprehensive filtering.",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "City, subdivision, ZIP code, or neighborhood (e.g., 'Palm Desert', 'PDCC', 'Indian Wells')"
          },

          // Price filters
          minPrice: {
            type: "number",
            description: "Minimum price in dollars"
          },
          maxPrice: {
            type: "number",
            description: "Maximum price in dollars"
          },

          // Bedroom/Bathroom filters (exact match)
          beds: {
            type: "number",
            description: "Exact number of bedrooms (e.g., 3 means exactly 3 beds)"
          },
          baths: {
            type: "number",
            description: "Exact number of bathrooms (e.g., 2 means exactly 2 baths)"
          },

          // Size filters
          minSqft: {
            type: "number",
            description: "Minimum living area in square feet"
          },
          maxSqft: {
            type: "number",
            description: "Maximum living area in square feet"
          },
          minLotSize: {
            type: "number",
            description: "Minimum lot size in square feet"
          },
          maxLotSize: {
            type: "number",
            description: "Maximum lot size in square feet"
          },

          // Year filters
          minYear: {
            type: "number",
            description: "Minimum year built"
          },
          maxYear: {
            type: "number",
            description: "Maximum year built"
          },

          // Amenities (boolean filters)
          pool: {
            type: "boolean",
            description: "Must have a pool"
          },
          spa: {
            type: "boolean",
            description: "Must have a spa/hot tub"
          },
          view: {
            type: "boolean",
            description: "Must have a view"
          },
          fireplace: {
            type: "boolean",
            description: "Must have a fireplace"
          },
          gatedCommunity: {
            type: "boolean",
            description: "Must be in a gated community"
          },
          seniorCommunity: {
            type: "boolean",
            description: "Must be a senior/55+ community"
          },

          // Garage/Parking
          garageSpaces: {
            type: "number",
            description: "Minimum garage spaces"
          },

          // Stories
          stories: {
            type: "number",
            description: "Number of stories (1 for single-story)"
          },

          // Property type
          propertyType: {
            type: "string",
            enum: ["house", "condo", "townhouse"],
            description: "Type of property"
          },

          // Geographic filters (cities only)
          eastOf: {
            type: "string",
            description: "Show listings east of this street (e.g., 'Washington Street')"
          },
          westOf: {
            type: "string",
            description: "Show listings west of this street (e.g., 'Adams Street')"
          },
          northOf: {
            type: "string",
            description: "Show listings north of this street"
          },
          southOf: {
            type: "string",
            description: "Show listings south of this street"
          },

          // Enhanced HOA filters
          hasHOA: {
            type: "boolean",
            description: "Filter by HOA presence. true = has HOA, false = no HOA"
          },
          maxHOA: {
            type: "number",
            description: "Maximum monthly HOA fee in dollars (e.g., 300 for 'under $300/month')"
          },
          minHOA: {
            type: "number",
            description: "Minimum monthly HOA fee in dollars"
          },

          // Sorting options
          sort: {
            type: "string",
            enum: ["price-low", "price-high", "sqft-low", "sqft-high", "newest", "oldest", "property-type"],
            description: "How to sort results. Use 'price-low' for cheapest first, 'price-high' for most expensive, 'sqft-low' for best value per sqft, 'newest' for just listed, 'oldest' for price drops/motivated sellers, 'property-type' to group by type (condos, houses, etc.)"
          }
        },
        required: ["location"]
      }
    }
  },

  // =========================================================================
  // TOOL 2: Get Appreciation - Market trends and investment data
  // =========================================================================
  {
    type: "function",
    function: {
      name: "getAppreciation",
      description: "Get market appreciation data, trends, ROI, and value over time for a location. Use for appreciation, investment, and market trend queries.",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "Location name - city, subdivision, or county (e.g., 'Palm Desert', 'PGA West', 'Riverside County')"
          },
          period: {
            type: "string",
            enum: ["1y", "3y", "5y", "10y"],
            description: "Time period for appreciation data. Default: 5y"
          }
        },
        required: ["location"]
      }
    }
  },

  // =========================================================================
  // TOOL 3: Search Articles - Educational content and guides
  // =========================================================================
  {
    type: "function",
    function: {
      name: "searchArticles",
      description: "Search educational real estate content, guides, and how-to articles. Use for questions about: real estate concepts (buying, selling, investing), lifestyle topics (energy costs, utilities, climate, HOA rules), neighborhood insights (schools, amenities, community features), and general real estate knowledge. Call this for ANY question that isn't specifically about searching for properties or market appreciation data.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query or topic (e.g., 'first time buyer', 'closing costs', 'energy costs in desert', 'HOA rules', 'property taxes')"
          }
        },
        required: ["query"]
      }
    }
  },

  // =========================================================================
  // TOOL 4: Get Listing Details - Single property lookup
  // =========================================================================
  {
    type: "function",
    function: {
      name: "getListingDetails",
      description: "Get detailed information about a specific property listing by address, slug, or listing key. Use when a user asks about a particular property (e.g., 'tell me about 77095 Desi Drive' or 'what can you tell me about 123 Main St'). Do NOT use searchHomes for this — searchHomes is for area/neighborhood searches, this is for a single specific property.",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "The property address, partial address, slug address, or listing key to look up (e.g., '77095 Desi Drive', '77095-desi-dr-indian-wells', or a listing key)"
          }
        },
        required: ["address"]
      }
    }
  },

  // =========================================================================
  // TOOL 5: Generate CMA - Comparative Market Analysis
  // =========================================================================
  {
    type: "function",
    function: {
      name: "generateCMA",
      description: "Generate a Comparative Market Analysis (CMA) for a specific property. Shows comparable active and sold listings, price analysis, and market statistics. Use when a user asks for a CMA, market analysis, or property valuation (e.g., 'generate a CMA for 77095 Desi Drive' or 'what is this home worth?').",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "The property address, partial address, or listing key to generate a CMA for"
          }
        },
        required: ["address"]
      }
    }
  },

  // =========================================================================
  // TOOL 6: Search Listings - Multi-listing scoped search (street / area / etc.)
  // =========================================================================
  {
    type: "function",
    function: {
      name: "searchListings",
      description: "Return a list of active listings matching a scope and filters. Use this when the user wants to see MULTIPLE listings in a specific area — especially queries scoped to a street ('homes on Hovley Lane'), county, or zip code that searchHomes can't handle. Also valid for subdivision/city queries when you specifically want the listing rows rather than just neighborhood stats. Returns the listing rows directly, not just an identifier.",
      parameters: {
        type: "object",
        properties: {
          scope: {
            type: "string",
            enum: ["street", "subdivision", "city", "county", "zip"],
            description: "Geographic scope. 'street' for street-name queries (requires cityName), 'subdivision'/'city'/'county' for those layers, 'zip' for postal-code targeting."
          },
          scopeValue: {
            type: "string",
            description: "The value for the scope. For street: the street name (e.g., 'Hovley Lane'). For subdivision: the subdivision name (e.g., 'PGA West'). For city: the city name. For county: the county name. For zip: the 5-digit zip code."
          },
          cityName: {
            type: "string",
            description: "Required when scope='street'. The city the street is in (e.g., 'Palm Desert'). Optional for scope='subdivision' to disambiguate streets that share names across cities."
          },
          // Filters (mirror searchHomes)
          minPrice: { type: "number", description: "Minimum price in dollars" },
          maxPrice: { type: "number", description: "Maximum price in dollars" },
          beds: { type: "number", description: "Exact number of bedrooms" },
          baths: { type: "number", description: "Exact number of bathrooms" },
          minSqft: { type: "number", description: "Minimum living area in sqft" },
          maxSqft: { type: "number", description: "Maximum living area in sqft" },
          minLotSize: { type: "number", description: "Minimum lot size in sqft" },
          maxLotSize: { type: "number", description: "Maximum lot size in sqft" },
          minYear: { type: "number", description: "Minimum year built" },
          maxYear: { type: "number", description: "Maximum year built" },
          pool: { type: "boolean", description: "Must have a pool" },
          spa: { type: "boolean", description: "Must have a spa/hot tub" },
          view: { type: "boolean", description: "Must have a view" },
          fireplace: { type: "boolean", description: "Must have a fireplace" },
          gatedCommunity: { type: "boolean", description: "Must be in a gated community" },
          seniorCommunity: { type: "boolean", description: "Must be a senior/55+ community" },
          garageSpaces: { type: "number", description: "Minimum garage spaces" },
          stories: { type: "number", description: "Number of stories" },
          propertyType: {
            type: "string",
            enum: ["A", "B", "C", "D"],
            description: "MLS property type code. A=residential sale (default), B=rental, C=multifamily, D=land. Use 'B' for rental queries."
          },
          hasHOA: { type: "boolean", description: "Filter by HOA presence" },
          minHOA: { type: "number", description: "Minimum monthly HOA fee" },
          maxHOA: { type: "number", description: "Maximum monthly HOA fee" },
          // Pagination + sort
          limit: {
            type: "number",
            description: "Maximum rows to return. Default 50, max 200."
          },
          offset: {
            type: "number",
            description: "Number of rows to skip (for pagination). Default 0."
          },
          sort: {
            type: "string",
            enum: ["price-low", "price-high", "newest", "oldest", "sqft-low", "sqft-high"],
            description: "Sort order. Defaults to 'newest'."
          }
        },
        required: ["scope", "scopeValue"]
      }
    }
  },

  // =========================================================================
  // TOOL 7: Get Area Stats - Aggregate stats only (no listing rows)
  // =========================================================================
  {
    type: "function",
    function: {
      name: "getAreaStats",
      description: "Return aggregate market statistics for a scope (count, avg/median price, $/sqft, sqft, HOA, propertySubType breakdown, amenity rates). Use this for AGGREGATE questions like 'average price on Hovley Lane', 'average rental income in Indio' (set propertyType='B'), 'median $/sqft in Palm Desert', 'how many gated homes in PGA West'. Does NOT return individual listings — pair with searchListings if the user also wants to see the rows.",
      parameters: {
        type: "object",
        properties: {
          scope: {
            type: "string",
            enum: ["street", "subdivision", "city", "county", "zip"],
            description: "Geographic scope. Same semantics as searchListings."
          },
          scopeValue: {
            type: "string",
            description: "The value for the scope (street name, subdivision name, city name, county name, or zip)."
          },
          cityName: {
            type: "string",
            description: "Required when scope='street'. The city the street is in."
          },
          // Filters (same set as searchListings)
          minPrice: { type: "number" },
          maxPrice: { type: "number" },
          beds: { type: "number" },
          baths: { type: "number" },
          minSqft: { type: "number" },
          maxSqft: { type: "number" },
          minLotSize: { type: "number" },
          maxLotSize: { type: "number" },
          minYear: { type: "number" },
          maxYear: { type: "number" },
          pool: { type: "boolean" },
          spa: { type: "boolean" },
          view: { type: "boolean" },
          fireplace: { type: "boolean" },
          gatedCommunity: { type: "boolean" },
          seniorCommunity: { type: "boolean" },
          garageSpaces: { type: "number" },
          stories: { type: "number" },
          propertyType: {
            type: "string",
            enum: ["A", "B", "C", "D"],
            description: "MLS property type code. A=residential sale (default), B=rental — use B for rental income questions. C=multifamily, D=land."
          },
          hasHOA: { type: "boolean" },
          minHOA: { type: "number" },
          maxHOA: { type: "number" }
        },
        required: ["scope", "scopeValue"]
      }
    }
  },

  // =========================================================================
  // TOOL 8: Ask Clarification - Interactive question before acting
  // =========================================================================
  {
    type: "function",
    function: {
      name: "askClarification",
      description: "Ask the user a clarifying question before performing an action. Use when the user's request is ambiguous and you need more information to give the best result. This is FAST (instant) — always prefer asking over guessing wrong. Examples: 'Did you mean Palm Springs or Palm Desert?', 'Are you looking to buy or sell?', 'Which price range?'. Supports multiple choice options that render as clickable buttons.",
      parameters: {
        type: "object",
        properties: {
          question: {
            type: "string",
            description: "The clarifying question to ask the user"
          },
          options: {
            type: "array",
            items: { type: "string" },
            description: "Optional array of answer choices to show as clickable buttons (e.g., ['Palm Springs', 'Palm Desert', 'Both']). Omit for open-ended questions."
          },
          context: {
            type: "string",
            description: "Brief context about why you're asking (e.g., 'Multiple cities match your query')"
          }
        },
        required: ["question"]
      }
    }
  },
];

/**
 * Get tool by name (for executor lookup)
 */
export function getToolByName(name: string): ChatCompletionTool | null {
  return ALL_TOOLS.find(tool => tool.function.name === name) || null;
}
