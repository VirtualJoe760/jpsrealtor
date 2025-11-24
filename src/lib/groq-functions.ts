// src/lib/groq-functions.ts
// Groq function calling definitions for real estate AI assistant

import { GroqFunctionDefinition } from "./groq";

/**
 * All available functions the AI can call
 * These are sent to Groq as "tools" in the API request
 */
export const GROQ_FUNCTIONS: GroqFunctionDefinition[] = [
  {
    type: "function",
    function: {
      name: "matchLocation",
      description: "ALWAYS call this FIRST when user mentions a location. Intelligently identifies if a location is a subdivision, city, or county and handles disambiguation. Returns ready-to-use search parameters.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The location query from the user (e.g., 'palm desert country club', 'sun city', 'corona')"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "searchListings",
      description: "Search MLS listings with filters. Use AFTER matchLocation() to get the correct search parameters. Priority: subdivision search (most specific) > city search > county search (limit 100 results).",
      parameters: {
        type: "object",
        properties: {
          cities: {
            type: "array",
            items: { type: "string" },
            description: "Array of city names to search in"
          },
          subdivisions: {
            type: "array",
            items: { type: "string" },
            description: "Array of exact subdivision names (from matchLocation response)"
          },
          propertyTypes: {
            type: "array",
            items: { type: "string" },
            description: "Property types: 'Single Family Residence', 'Condominium', 'Townhouse', etc."
          },
          minBeds: {
            type: "number",
            description: "Minimum bedrooms"
          },
          maxBeds: {
            type: "number",
            description: "Maximum bedrooms"
          },
          minBaths: {
            type: "number",
            description: "Minimum bathrooms"
          },
          maxBaths: {
            type: "number",
            description: "Maximum bathrooms"
          },
          minPrice: {
            type: "number",
            description: "Minimum price in dollars"
          },
          maxPrice: {
            type: "number",
            description: "Maximum price in dollars"
          },
          minSqft: {
            type: "number",
            description: "Minimum square footage"
          },
          maxSqft: {
            type: "number",
            description: "Maximum square footage"
          },
          hasPool: {
            type: "boolean",
            description: "Filter for properties with pool"
          },
          hasView: {
            type: "boolean",
            description: "Filter for properties with view"
          },
          hasSpa: {
            type: "boolean",
            description: "Filter for properties with spa"
          },
          minGarages: {
            type: "number",
            description: "Minimum garage spaces"
          },
          limit: {
            type: "number",
            description: "Max results (use 100 for county searches, omit for subdivision/city)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getSubdivisionListings",
      description: "Get all listings in a specific subdivision by slug. Use when you have a subdivision slug from matchLocation.",
      parameters: {
        type: "object",
        properties: {
          slug: {
            type: "string",
            description: "Subdivision slug (URL-safe name) from matchLocation"
          },
          minPrice: {
            type: "number",
            description: "Minimum listing price"
          },
          maxPrice: {
            type: "number",
            description: "Maximum listing price"
          },
          beds: {
            type: "number",
            description: "Minimum bedrooms"
          },
          baths: {
            type: "number",
            description: "Minimum bathrooms"
          },
          page: {
            type: "number",
            description: "Page number (default: 1)"
          },
          limit: {
            type: "number",
            description: "Results per page (default: 20)"
          }
        },
        required: ["slug"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getCitySubdivisions",
      description: "Get all subdivisions/communities within a city. Use when user asks about communities or neighborhoods in a city.",
      parameters: {
        type: "object",
        properties: {
          cityId: {
            type: "string",
            description: "City slug (e.g., 'palm-desert', 'indian-wells')"
          }
        },
        required: ["cityId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getCityListings",
      description: "Get all listings in a specific city.",
      parameters: {
        type: "object",
        properties: {
          cityId: {
            type: "string",
            description: "City slug"
          },
          limit: {
            type: "number",
            description: "Results limit"
          },
          minPrice: {
            type: "number",
            description: "Minimum price"
          },
          maxPrice: {
            type: "number",
            description: "Maximum price"
          },
          beds: {
            type: "number",
            description: "Minimum bedrooms"
          },
          baths: {
            type: "number",
            description: "Minimum bathrooms"
          }
        },
        required: ["cityId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getCityStats",
      description: "Get market statistics for a city (median price, avg price, total listings, avg days on market, price per sqft).",
      parameters: {
        type: "object",
        properties: {
          cityId: {
            type: "string",
            description: "City slug"
          }
        },
        required: ["cityId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getSubdivisionStats",
      description: "Get market statistics for a subdivision including HOA ranges.",
      parameters: {
        type: "object",
        properties: {
          slug: {
            type: "string",
            description: "Subdivision slug"
          }
        },
        required: ["slug"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getCityHOA",
      description: "Get HOA fee statistics for a city (avg, min, max, count of properties with HOA).",
      parameters: {
        type: "object",
        properties: {
          cityId: {
            type: "string",
            description: "City slug"
          }
        },
        required: ["cityId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "researchCommunity",
      description: "Auto-discover and answer questions about a community using current MLS data. Supports questions about HOA fees, year built, price ranges, property types, sqft, amenities.",
      parameters: {
        type: "object",
        properties: {
          question: {
            type: "string",
            description: "User's specific question about the community"
          },
          subdivisionName: {
            type: "string",
            description: "Exact subdivision name"
          },
          city: {
            type: "string",
            description: "City name for context"
          }
        },
        required: ["question", "subdivisionName", "city"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generateCMA",
      description: "Generate a Comparative Market Analysis for a specific property. Analyzes comparable properties and provides estimated value range.",
      parameters: {
        type: "object",
        properties: {
          listingKey: {
            type: "string",
            description: "MLS listing key/ID"
          },
          radius: {
            type: "number",
            description: "Search radius in miles (default: 2)"
          },
          timeframe: {
            type: "number",
            description: "Months of data to analyze (default: 6)"
          },
          minBeds: {
            type: "number",
            description: "Minimum bedrooms for comps"
          },
          maxBeds: {
            type: "number",
            description: "Maximum bedrooms for comps"
          },
          minSqft: {
            type: "number",
            description: "Minimum sqft for comps"
          },
          maxSqft: {
            type: "number",
            description: "Maximum sqft for comps"
          },
          requirePool: {
            type: "boolean",
            description: "Require pool in comparables"
          },
          maxComps: {
            type: "number",
            description: "Maximum number of comparables (default: 10)"
          }
        },
        required: ["listingKey"]
      }
    }
  }
];

/**
 * Map function names to API endpoints and HTTP methods
 */
export const FUNCTION_ENDPOINT_MAP: Record<string, { endpoint: string; method: string; type?: 'GET' | 'POST' }> = {
  matchLocation: { endpoint: "/api/chat/match-location", method: "POST", type: "POST" },
  searchListings: { endpoint: "/api/chat/search-listings", method: "POST", type: "POST" },
  getSubdivisionListings: { endpoint: "/api/subdivisions/:slug/listings", method: "GET", type: "GET" },
  getCitySubdivisions: { endpoint: "/api/cities/:cityId/subdivisions", method: "GET", type: "GET" },
  getCityListings: { endpoint: "/api/cities/:cityId/listings", method: "GET", type: "GET" },
  getCityStats: { endpoint: "/api/cities/:cityId/stats", method: "GET", type: "GET" },
  getSubdivisionStats: { endpoint: "/api/subdivisions/:slug/stats", method: "GET", type: "GET" },
  getCityHOA: { endpoint: "/api/cities/:cityId/hoa", method: "GET", type: "GET" },
  researchCommunity: { endpoint: "/api/chat/research-community", method: "POST", type: "POST" },
  generateCMA: { endpoint: "/api/cma/generate", method: "POST", type: "POST" }
};
