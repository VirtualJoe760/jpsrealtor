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
      description: "Search educational real estate content, guides, and how-to articles. Use for questions about real estate concepts, processes, or general knowledge.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query or topic (e.g., 'first time buyer', 'closing costs', 'short sale')"
          }
        },
        required: ["query"]
      }
    }
  }

  // =========================================================================
  // FUTURE TOOLS - Easy to add!
  // =========================================================================
  // Just add new tool objects here:
  //
  // {
  //   type: "function",
  //   function: {
  //     name: "generateCMA",
  //     description: "Generate Comparative Market Analysis report for a property",
  //     parameters: { ... }
  //   }
  // },
  //
  // {
  //   type: "function",
  //   function: {
  //     name: "analyzeInvestment",
  //     description: "Analyze investment potential with cash flow projections",
  //     parameters: { ... }
  //   }
  // }
];

/**
 * Get tool by name (for executor lookup)
 */
export function getToolByName(name: string): ChatCompletionTool | null {
  return ALL_TOOLS.find(tool => tool.function.name === name) || null;
}
