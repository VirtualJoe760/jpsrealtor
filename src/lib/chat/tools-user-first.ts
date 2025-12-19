// src/lib/chat/tools-user-first.ts
// User-first tool definitions - 8 tools based on real user queries

import type { GroqTool } from "@/lib/groq";

/**
 * Get a single tool by name
 * Used for intent-based tool selection (load only what's needed)
 */
export function getToolByName(toolName: string): GroqTool | null {
  const tool = ALL_TOOLS.find(t => t.function.name === toolName);
  return tool || null;
}

/**
 * All 8 user-first tools
 * These are NOT loaded together - intent classifier picks ONE per query
 */
export const ALL_TOOLS: GroqTool[] = [
  // Tool 1: searchHomes (60% of queries)
  {
    type: "function",
    function: {
      name: "searchHomes",
      description: "Search for homes in a location with optional filters",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "City, subdivision, or ZIP code"
          },
          beds: {
            type: "number",
            description: "Minimum bedrooms"
          },
          baths: {
            type: "number",
            description: "Minimum bathrooms"
          },
          maxPrice: {
            type: "number",
            description: "Maximum price in dollars"
          },
          minPrice: {
            type: "number",
            description: "Minimum price in dollars"
          },
          pool: {
            type: "boolean",
            description: "Must have pool"
          },
          propertyType: {
            type: "string",
            enum: ["house", "condo", "townhouse"],
            description: "Property type"
          }
        },
        required: ["location"]
      }
    }
  },

  // Tool 2: searchNewListings (15% of queries)
  {
    type: "function",
    function: {
      name: "searchNewListings",
      description: "Find recently listed homes (last 7-30 days)",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "City or subdivision"
          },
          timeframe: {
            type: "string",
            enum: ["today", "week", "2weeks", "month"],
            description: "How recent (default: week)"
          },
          maxPrice: {
            type: "number",
            description: "Maximum price"
          },
          beds: {
            type: "number",
            description: "Minimum bedrooms"
          }
        },
        required: ["location"]
      }
    }
  },

  // Tool 3: getMarketOverview (10% of queries)
  {
    type: "function",
    function: {
      name: "getMarketOverview",
      description: "Get market overview and community description for an area",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "City or subdivision name"
          }
        },
        required: ["location"]
      }
    }
  },

  // Tool 4: getPricing (5% of queries)
  {
    type: "function",
    function: {
      name: "getPricing",
      description: "Get typical home prices and price ranges for an area",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "City or subdivision"
          },
          propertyType: {
            type: "string",
            enum: ["house", "condo", "townhouse"],
            description: "Filter by property type"
          },
          beds: {
            type: "number",
            description: "Filter by bedrooms"
          }
        },
        required: ["location"]
      }
    }
  },

  // Tool 5: getMarketTrends (3% of queries)
  {
    type: "function",
    function: {
      name: "getMarketTrends",
      description: "Get appreciation rates, market velocity, and trend analysis",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "City or subdivision"
          },
          metric: {
            type: "string",
            enum: ["appreciation", "velocity", "all"],
            description: "Which metric (default: all)"
          },
          period: {
            type: "string",
            enum: ["1y", "3y", "5y", "10y"],
            description: "Time period (default: 5y)"
          }
        },
        required: ["location"]
      }
    }
  },

  // Tool 6: compareLocations (3% of queries)
  {
    type: "function",
    function: {
      name: "compareLocations",
      description: "Compare two locations side-by-side on price, trends, and value",
      parameters: {
        type: "object",
        properties: {
          location1: {
            type: "string",
            description: "First location"
          },
          location2: {
            type: "string",
            description: "Second location"
          },
          metric: {
            type: "string",
            enum: ["price", "appreciation", "velocity", "all"],
            description: "What to compare (default: all)"
          }
        },
        required: ["location1", "location2"]
      }
    }
  },

  // Tool 7: findNeighborhoods (1% of queries)
  {
    type: "function",
    function: {
      name: "findNeighborhoods",
      description: "Find neighborhoods and subdivisions with links to browse",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "City name"
          },
          criteria: {
            type: "string",
            enum: ["golf", "55+", "family", "luxury", "affordable"],
            description: "Filter by criteria"
          }
        },
        required: ["city"]
      }
    }
  },

  // Tool 8: getSubdivisionInfo (subdivision-level data queries)
  {
    type: "function",
    function: {
      name: "getSubdivisionInfo",
      description: "Get information about a specific subdivision or community (HOA fees, amenities, rental restrictions, etc.)",
      parameters: {
        type: "object",
        properties: {
          subdivisionName: {
            type: "string",
            description: "Subdivision or community name (e.g., 'PDCC', 'PGA West', 'Trilogy')"
          },
          field: {
            type: "string",
            enum: ["shortTermRentals", "hoa", "amenities", "all"],
            description: "Specific field to query (default: all)"
          }
        },
        required: ["subdivisionName"]
      }
    }
  },

  // Tool 9: getListingInfo (listing-level data queries)
  {
    type: "function",
    function: {
      name: "getListingInfo",
      description: "Get information about a specific property by address (HOA fees, short-term rentals, property details)",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "Property address (e.g., '82223 Vandenberg', '123 Main St')"
          },
          field: {
            type: "string",
            enum: ["shortTermRentals", "hoa", "details", "all"],
            description: "Specific field to query (default: all)"
          }
        },
        required: ["address"]
      }
    }
  },

  // Tool 10: searchArticles (1% of queries)
  {
    type: "function",
    function: {
      name: "searchArticles",
      description: "Search real estate guides and educational content",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query or topic"
          }
        },
        required: ["query"]
      }
    }
  }
];
