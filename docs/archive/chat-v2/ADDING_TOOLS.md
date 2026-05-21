# Adding Tools to Chat V2

This guide shows you how to add new tools to Chat V2. It's incredibly simple compared to v1!

## Overview

In Chat V2, adding a new tool requires only **3 steps**:
1. Add tool definition to `tools.ts`
2. Add executor function to `tool-executors.ts`
3. Add case to switch statement

**No intent classifier updates needed!** The AI automatically learns about new tools.

## Step-by-Step Guide

### Example: Adding a CMA Generator Tool

Let's add a `generateCMA` tool that creates Comparative Market Analysis reports.

#### Step 1: Add Tool Definition

**File**: `src/lib/chat-v2/tools.ts`

Add a new object to the `ALL_TOOLS` array:

```typescript
export const ALL_TOOLS: ChatCompletionTool[] = [
  // ... existing tools ...

  // NEW TOOL: Generate CMA
  {
    type: "function",
    function: {
      name: "generateCMA",
      description: "Generate a Comparative Market Analysis (CMA) report for a property or area. Use this when users ask for property valuations, market comparisons, or want to know what their home is worth.",
      parameters: {
        type: "object",
        properties: {
          address: {
            type: "string",
            description: "Full property address (e.g., '123 Main St, Temecula, CA 92592')"
          },
          propertyType: {
            type: "string",
            enum: ["house", "condo", "townhouse"],
            description: "Type of property"
          },
          beds: {
            type: "number",
            description: "Number of bedrooms"
          },
          baths: {
            type: "number",
            description: "Number of bathrooms"
          },
          sqft: {
            type: "number",
            description: "Square footage"
          },
          radius: {
            type: "number",
            description: "Search radius in miles for comparable properties (default: 0.5)"
          }
        },
        required: ["address", "propertyType", "beds", "baths"]
      }
    }
  }
];
```

**Key points**:
- `name`: Function name (camelCase)
- `description`: **Very important!** This tells the AI when to use the tool
- `parameters`: JSON Schema defining the function signature
- `required`: Array of required parameter names

#### Step 2: Add Executor Function

**File**: `src/lib/chat-v2/tool-executors.ts`

Add a new executor function:

```typescript
// =========================================================================
// TOOL 4: Generate CMA
// =========================================================================

async function executeGenerateCMA(args: {
  address: string;
  propertyType: string;
  beds: number;
  baths: number;
  sqft?: number;
  radius?: number;
}): Promise<{ success: boolean; data: any }> {
  const { address, propertyType, beds, baths, sqft, radius = 0.5 } = args;

  // Component-first: Return parameters for frontend
  return {
    success: true,
    data: {
      component: "cma_report",
      propertyData: {
        address,
        propertyType,
        beds,
        baths,
        sqft,
        radius
      },
      location: {
        name: address,
        type: "address",
        normalized: address
      }
    }
  };
}
```

**Key points**:
- Function name: `execute[ToolName]` (camelCase with "execute" prefix)
- Return type: `Promise<{ success: boolean; data: any }>`
- Return **parameters**, not actual data (component-first architecture)

#### Step 3: Add Switch Case

**File**: `src/lib/chat-v2/tool-executors.ts`

Add a case to the `executeTool` switch statement:

```typescript
export async function executeTool(
  toolName: string,
  args: any,
  userId?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    let result;

    switch (toolName) {
      case "searchHomes":
        result = await executeSearchHomes(args);
        break;

      case "getAppreciation":
        result = await executeGetAppreciation(args);
        break;

      case "searchArticles":
        result = await executeSearchArticles(args);
        break;

      // NEW TOOL
      case "generateCMA":
        result = await executeGenerateCMA(args);
        break;

      default:
        return {
          success: false,
          error: `Unknown tool: ${toolName}`
        };
    }

    // ... rest of function ...
  }
}
```

#### Step 4: Update System Prompt (Optional)

**File**: `src/lib/chat-v2/system-prompt.ts`

Add documentation for the new tool:

```typescript
export const SYSTEM_PROMPT = `You are a helpful real estate AI assistant...

## AVAILABLE TOOLS
- **searchHomes**: Find and browse properties with filters
- **getAppreciation**: Market trends, appreciation rates, and investment data
- **searchArticles**: Educational real estate content and guides
- **generateCMA**: Generate Comparative Market Analysis reports for property valuations

## RESPONSE FORMAT - VERY IMPORTANT!

...

**For CMA Reports (generateCMA):**
- Start your response with: [CMA_REPORT]
- Example: "[CMA_REPORT] I've generated a Comparative Market Analysis for 123 Main St..."

...`;
```

#### Step 5: Create Frontend Component

**File**: `src/app/components/chat/CMAReport.tsx`

Create a component to display the tool results:

```typescript
"use client";

import { useEffect, useState } from "react";

interface CMAReportProps {
  propertyData: {
    address: string;
    propertyType: string;
    beds: number;
    baths: number;
    sqft?: number;
    radius?: number;
  };
}

export default function CMAReport({ propertyData }: CMAReportProps) {
  const [cmaData, setCmaData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCMA() {
      try {
        // Fetch actual CMA data from your API
        const response = await fetch("/api/cma/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(propertyData)
        });

        const data = await response.json();
        setCmaData(data);
      } catch (error) {
        console.error("Failed to fetch CMA:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCMA();
  }, [propertyData]);

  if (loading) return <div>Generating CMA report...</div>;
  if (!cmaData) return <div>Failed to generate CMA</div>;

  return (
    <div className="cma-report">
      <h3>Comparative Market Analysis</h3>
      <p>Property: {propertyData.address}</p>
      {/* Render your CMA data here */}
    </div>
  );
}
```

#### Step 6: Update ChatWidget

**File**: `src/app/components/chat/ChatWidget.tsx`

Add handling for the new component marker:

```typescript
// In your message rendering logic:
if (message.content.includes("[CMA_REPORT]")) {
  const cleanContent = message.content.replace("[CMA_REPORT]", "").trim();

  return (
    <div>
      <p>{cleanContent}</p>
      {message.toolResult?.component === "cma_report" && (
        <CMAReport propertyData={message.toolResult.propertyData} />
      )}
    </div>
  );
}
```

### That's it! 🎉

Your new tool is now available. The AI will automatically use it when appropriate.

## Testing Your New Tool

### 1. Health Check
```bash
curl http://localhost:3000/api/chat-v2
```

Should show your new tool in the list:
```json
{
  "tools": ["searchHomes", "getAppreciation", "searchArticles", "generateCMA"]
}
```

### 2. Test with Sample Query
```bash
curl -X POST http://localhost:3000/api/chat-v2 \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "role": "user",
      "content": "What is my 3 bedroom house at 123 Main St, Temecula worth?"
    }],
    "userId": "test-user"
  }'
```

### 3. Check Console Logs
```
[Chat V2] Processing request: ...
[Tool Executor] Executing: generateCMA { address: '123 Main St...', ... }
[Analytics] Updated ... (if analytics enabled)
```

## Best Practices

### 1. Write Clear Tool Descriptions
The AI uses the `description` field to decide when to use your tool. Be specific!

**Bad**:
```typescript
description: "Generates a CMA"
```

**Good**:
```typescript
description: "Generate a Comparative Market Analysis (CMA) report for a property or area. Use this when users ask for property valuations, market comparisons, or want to know what their home is worth."
```

### 2. Use Component-First Architecture
Tools should return **parameters**, not data. Let frontend components fetch the actual data.

**Bad**:
```typescript
// Don't fetch data in the tool
const listings = await fetchListings(city, filters);
return { success: true, data: { listings } };
```

**Good**:
```typescript
// Return parameters for the component
return {
  success: true,
  data: {
    component: "listing_carousel",
    searchParams: { city, filters }
  }
};
```

### 3. Track Analytics
If your tool involves user searches or preferences, track it:

```typescript
// The executeTool function automatically tracks tools that return location data
return {
  success: true,
  data: {
    component: "your_component",
    location: {
      name: "User-friendly name",
      type: "city" | "subdivision" | "county" | "zip",
      normalized: "Normalized name for tracking"
    },
    // ... other data
  }
};
```

### 4. Handle Errors Gracefully
```typescript
async function executeYourTool(args: any) {
  try {
    // Validate args
    if (!args.requiredField) {
      return {
        success: false,
        error: "Missing required field: requiredField"
      };
    }

    // Your logic here...

    return { success: true, data: { ... } };
  } catch (error: any) {
    console.error("[Your Tool] Error:", error);
    return {
      success: false,
      error: error.message || "Tool execution failed"
    };
  }
}
```

### 5. Use TypeScript Types
Define clear interfaces for your tool arguments:

```typescript
interface GenerateCMAArgs {
  address: string;
  propertyType: "house" | "condo" | "townhouse";
  beds: number;
  baths: number;
  sqft?: number;
  radius?: number;
}

async function executeGenerateCMA(args: GenerateCMAArgs): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  // Implementation
}
```

## Common Patterns

### Pattern 1: Location-Based Tools
Use `identifyEntityType` for location parsing:

```typescript
import { identifyEntityType } from "../chat/utils/entity-recognition";

async function executeYourLocationTool(args: { location: string }) {
  const entityResult = identifyEntityType(args.location);

  // entityResult.type: "city" | "subdivision" | "county" | "zip"
  // entityResult.value: Normalized name

  return {
    success: true,
    data: {
      component: "your_component",
      location: {
        name: args.location,
        type: entityResult.type,
        normalized: entityResult.value
      }
    }
  };
}
```

### Pattern 2: Multi-Step Tools
For complex tools that need multiple steps:

```typescript
async function executeComplexTool(args: any) {
  // Step 1: Validate
  if (!args.required) {
    return { success: false, error: "Missing required field" };
  }

  // Step 2: Parse/normalize
  const normalized = normalizeInput(args.input);

  // Step 3: Build parameters
  const params = buildParams(normalized);

  // Step 4: Return for component
  return {
    success: true,
    data: {
      component: "complex_component",
      params
    }
  };
}
```

### Pattern 3: Tools with External APIs
```typescript
async function executeAPITool(args: any) {
  try {
    // Don't call external APIs here - return params for component
    // The component will call the API with proper caching/error handling

    return {
      success: true,
      data: {
        component: "api_component",
        apiParams: {
          endpoint: "/api/your-endpoint",
          query: args.query
        }
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

## Troubleshooting

### AI Not Using Your Tool?
1. **Check description**: Is it clear when to use the tool?
2. **Check parameters**: Are required fields marked correctly?
3. **Check system prompt**: Is the tool documented?
4. **Test directly**: Call the tool manually to verify it works

### Tool Execution Fails?
1. **Check switch case**: Did you add the case to `executeTool`?
2. **Check function name**: Must match exactly (case-sensitive)
3. **Check return type**: Must return `{ success, data }` or `{ success, error }`
4. **Check console logs**: Look for errors in `[Tool Executor]` logs

### Component Not Rendering?
1. **Check component marker**: Did you add it to system prompt?
2. **Check ChatWidget**: Is there handling for your marker?
3. **Check tool result**: Is `component` field set correctly?
4. **Check imports**: Is your component imported in ChatWidget?

## Examples

See these existing tools for reference:
- **searchHomes** (`src/lib/chat-v2/tool-executors.ts:72`) - Location-based search with filters
- **getAppreciation** (`src/lib/chat-v2/tool-executors.ts:131`) - Simple location + period tool
- **searchArticles** (`src/lib/chat-v2/tool-executors.ts:158`) - Simple query-based tool

## Need Help?

1. Review existing tool implementations in `tool-executors.ts`
2. Check console logs with `[Chat V2]` and `[Tool Executor]` tags
3. Test with curl to isolate frontend vs backend issues
4. Contact the development team

## Summary

Adding a tool to Chat V2:
1. ✅ Add definition to `tools.ts` (~20 lines)
2. ✅ Add executor to `tool-executors.ts` (~30 lines)
3. ✅ Add switch case (~3 lines)
4. ✅ Update system prompt (~5 lines)
5. ✅ Create frontend component (varies)
6. ✅ Update ChatWidget rendering (varies)

**Total backend code**: ~60 lines per tool

Compare to v1: ~200+ lines per tool with intent classifier updates! 🎉
