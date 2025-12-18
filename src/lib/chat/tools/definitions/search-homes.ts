// src/lib/chat/tools/definitions/search-homes.ts
// User-first tool: "Show me homes in [location]"

import type { GroqTool } from "@/lib/groq";

/**
 * searchHomes - Primary property search tool (60% of user queries)
 *
 * User Questions:
 * - "Show me homes in Palm Desert"
 * - "3 bedroom homes under $800k with a pool in Temecula"
 * - "Condos for sale in La Quinta"
 */
export const searchHomesTool: GroqTool = {
  type: "function",
  function: {
    name: "searchHomes",
    description: "Search for homes in a location with optional filters",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "City, subdivision, or ZIP code (e.g., 'Palm Desert', 'PGA West', '92260')"
        },
        beds: {
          type: "number",
          description: "Number of bedrooms (interpreted as minimum). Example: 3 means 3+ bedrooms"
        },
        baths: {
          type: "number",
          description: "Number of bathrooms (interpreted as minimum). Example: 2.5 means 2.5+ baths"
        },
        priceRange: {
          type: "object",
          properties: {
            min: {
              type: "number",
              description: "Minimum price in dollars"
            },
            max: {
              type: "number",
              description: "Maximum price in dollars"
            }
          },
          description: "Price range. 'under $500k' = {max: 500000}, '$400-600k' = {min: 400000, max: 600000}"
        },
        propertyType: {
          type: "string",
          enum: ["house", "condo", "townhouse"],
          description: "Type of property. Use user-friendly names"
        },
        pool: {
          type: "boolean",
          description: "Must have a pool"
        },
        view: {
          type: "boolean",
          description: "Must have a view (mountain, golf, etc.)"
        },
        golf: {
          type: "boolean",
          description: "On or near golf course"
        },
        gated: {
          type: "boolean",
          description: "Must be in gated community"
        },
        minSqft: {
          type: "number",
          description: "Minimum square footage. Example: '2000+ sqft' = 2000"
        }
      },
      required: ["location"]
    }
  }
};
