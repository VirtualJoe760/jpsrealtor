// src/lib/chat/tools-user-first.ts
// Simplified to 3 core tools: Browse Homes, Market Trends, Educational Content

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
 * 3 Core Tools - Simple and Focused
 * Intent classifier picks ONE per query
 */
export const ALL_TOOLS: GroqTool[] = [
  // Tool 1: searchHomes - Browse Properties
  {
    type: "function",
    function: {
      name: "searchHomes",
      description: "Search for homes and properties in any location with filters",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "City, subdivision, ZIP code, or neighborhood"
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

  // Tool 2: getAppreciation - Market Trends & Investment Data
  {
    type: "function",
    function: {
      name: "getAppreciation",
      description: "Get market trends, appreciation rates, and investment data for any location",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "Location name - city, subdivision, or county (e.g., 'Palm Desert', 'PDCC', 'Riverside County')"
          },
          period: {
            type: "string",
            enum: ["1y", "3y", "5y", "10y"],
            description: "Time period for appreciation data (default: 5y)"
          }
        },
        required: ["location"]
      }
    }
  },

  // Tool 3: searchArticles - Educational Content & Guides
  {
    type: "function",
    function: {
      name: "searchArticles",
      description: "Search real estate guides, educational content, and how-to articles",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query or topic (e.g., 'first time buyer', 'closing costs', 'HOA')"
          }
        },
        required: ["query"]
      }
    }
  }
];
