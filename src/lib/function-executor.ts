// src/lib/function-executor.ts
// Execute AI function calls by calling actual API endpoints

import { FUNCTION_ENDPOINT_MAP } from "./groq-functions";

interface FunctionCall {
  name: string;
  arguments: string; // JSON string
}

interface FunctionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Execute a function call from the AI by calling the appropriate API endpoint
 */
export async function executeFunctionCall(
  functionCall: FunctionCall
): Promise<FunctionResult> {
  try {
    const { name, arguments: argsString } = functionCall;
    const args = JSON.parse(argsString);

    // Coerce string numbers to actual numbers for listing/search functions
    // This fixes Llama 4 Scout sometimes passing numeric parameters as strings or empty strings
    if (name === 'searchListings' || name === 'getSubdivisionListings') {
      const numericFields = ['minPrice', 'maxPrice', 'minBeds', 'maxBeds', 'minBaths', 'maxBaths', 'minSqft', 'maxSqft', 'limit', 'page'];
      numericFields.forEach(field => {
        if (args[field] !== undefined && args[field] !== null) {
          // Remove empty strings - model sometimes passes "" instead of omitting the parameter
          if (args[field] === '') {
            delete args[field];
            return;
          }

          const parsed = typeof args[field] === 'string' ? parseFloat(args[field]) : args[field];
          if (!isNaN(parsed)) {
            args[field] = parsed;
          } else {
            // If parsing fails, remove the parameter
            delete args[field];
          }
        }
      });

      // Coerce boolean string values to actual booleans, remove empty strings
      const booleanFields = ['hasPool', 'hasSpa', 'hasView', 'hasGarage', 'hasFireplace'];
      booleanFields.forEach(field => {
        if (args[field] !== undefined && args[field] !== null && typeof args[field] === 'string') {
          // Remove empty strings
          if (args[field] === '') {
            delete args[field];
            return;
          }

          const lowerValue = args[field].toLowerCase();
          if (lowerValue === 'true' || lowerValue === 'false') {
            args[field] = lowerValue === 'true';
          } else {
            // If not a valid boolean string, remove the parameter
            delete args[field];
          }
        }
      });

      // Clean up empty arrays
      const arrayFields = ['propertyTypes', 'subdivisions', 'cities'];
      arrayFields.forEach(field => {
        if (Array.isArray(args[field]) && args[field].length === 0) {
          delete args[field];
        }
      });
    }

    const endpointConfig = FUNCTION_ENDPOINT_MAP[name];
    if (!endpointConfig) {
      return {
        success: false,
        error: `Unknown function: ${name}`,
      };
    }

    let { endpoint, method } = endpointConfig;

    // Replace URL parameters for GET requests
    if (method === "GET") {
      // Replace :slug with actual slug
      if (args.slug) {
        endpoint = endpoint.replace(":slug", args.slug);
        delete args.slug;
      }
      // Replace :cityId with actual cityId
      if (args.cityId) {
        endpoint = endpoint.replace(":cityId", args.cityId);
        delete args.cityId;
      }

      // Convert remaining args to query string
      const queryParams = new URLSearchParams();
      Object.entries(args).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });

      const queryString = queryParams.toString();
      if (queryString) {
        endpoint = `${endpoint}?${queryString}`;
      }
    }

    // Build full URL
    const baseURL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const url = `${baseURL}${endpoint}`;

    console.log(`🔧 Executing function: ${name}`, { url, method, args });

    // Make API request
    const response = await fetch(url, {
      method,
      headers: method === "POST" ? { "Content-Type": "application/json" } : {},
      body: method === "POST" ? JSON.stringify(args) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `API error: ${response.status} - ${errorText}`,
      };
    }

    const data = await response.json();

    console.log(`✅ Function ${name} executed successfully`);

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error(`❌ Function execution error:`, error);
    return {
      success: false,
      error: error.message || "Unknown error executing function",
    };
  }
}

/**
 * Execute multiple function calls in sequence
 */
export async function executeFunctionCalls(
  functionCalls: FunctionCall[]
): Promise<FunctionResult[]> {
  const results: FunctionResult[] = [];

  for (const call of functionCalls) {
    const result = await executeFunctionCall(call);
    results.push(result);

    // Stop execution if a function fails
    if (!result.success) {
      console.error(`Function ${call.name} failed, stopping execution chain`);
      break;
    }
  }

  return results;
}

/**
 * Format function results for AI consumption
 */
export function formatFunctionResultsForAI(
  functionName: string,
  result: FunctionResult
): string {
  if (!result.success) {
    return `Error executing ${functionName}: ${result.error}`;
  }

  // Format based on function type
  switch (functionName) {
    case "matchLocation":
      return `Location matched: ${JSON.stringify(result.data, null, 2)}`;

    case "searchListings":
    case "getSubdivisionListings":
      const listings = result.data?.listings || [];
      // Only return count and essential summary to reduce token usage
      const summary = listings.slice(0, 5).map((l: any) => ({
        address: l.address || l.unparsedAddress,
        price: l.listPrice,
        beds: l.bedroomsTotal || l.bedsTotal,
        baths: l.bathroomsTotalDecimal || l.bathroomsTotalInteger,
        sqft: l.livingArea
      }));
      return `Found ${listings.length} listing(s). Sample: ${JSON.stringify(summary)}`;

    case "getCityStats":
    case "getSubdivisionStats":
      return `Market statistics: ${JSON.stringify(result.data, null, 2)}`;

    case "getCitySubdivisions":
      const subdivisions = result.data?.subdivisions || [];
      return `Found ${subdivisions.length} subdivisions: ${JSON.stringify(
        subdivisions,
        null,
        2
      )}`;

    case "researchCommunity":
      return `Research result: ${result.data?.answer || JSON.stringify(result.data)}`;

    case "generateCMA":
      return `CMA generated: ${JSON.stringify(result.data, null, 2)}`;

    default:
      return JSON.stringify(result.data, null, 2);
  }
}
