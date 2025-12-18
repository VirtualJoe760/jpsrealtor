// src/lib/chat/tools-minimal.ts
// MINIMAL TOOL SET FOR TESTING GPT-OSS 120B
// Start with just queryDatabase to verify tool calling works

import type { GroqTool } from "@/lib/groq";

/**
 * Minimal tool set for debugging GPT-OSS 120B
 * Just ONE tool to start: queryDatabase
 */
export const CHAT_TOOLS: GroqTool[] = [
  {
    type: "function",
    function: {
      name: "queryDatabase",
      description: "Query our MLS database for properties. Supports location, property, price, amenity, and time filters.",
      parameters: {
        type: "object",
        properties: {
          // LOCATION (choose one)
          city: {
            type: "string",
            description: "City name (e.g., 'Palm Desert', 'Orange')"
          },
          subdivision: {
            type: "string",
            description: "Subdivision/neighborhood name (e.g., 'Palm Desert Country Club')"
          },

          // PROPERTY FILTERS
          minBeds: {
            type: "number",
            description: "Minimum bedrooms"
          },
          maxPrice: {
            type: "number",
            description: "Maximum price"
          },

          // AMENITIES
          pool: {
            type: "boolean",
            description: "Has pool"
          },

          // INCLUDE OPTIONS
          includeStats: {
            type: "boolean",
            description: "Include market statistics (always use true)"
          },

          // SORT
          sort: {
            type: "string",
            enum: ["price-asc", "price-desc", "newest", "oldest"],
            description: "Sort order"
          }
        },
        required: []
      }
    }
  }
];
