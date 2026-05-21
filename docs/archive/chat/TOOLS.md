# Tool Development Guide

How to create and maintain chat tools.

---

## Overview

### Component-First Principle
**Tools return parameters, components fetch data.**

```typescript
// ✅ CORRECT: Return parameters
return {
  success: true,
  searchParams: { city: "Palm Desert", filters: { maxPrice: 500000 } }
};

// ❌ WRONG: Don't return data
return {
  success: true,
  listings: await fetchListingsFromDB()  // DON'T DO THIS
};
```

---

## Tool Structure

### 1. Tool Definition (`tools-user-first.ts`)
```typescript
export const ALL_TOOLS: GroqTool[] = [
  {
    type: "function",
    function: {
      name: "toolName",
      description: "Clear description of what this tool does",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "City, subdivision, or ZIP code"
          },
          maxPrice: {
            type: "number",
            description: "Maximum price in dollars"
          },
          optional: {
            type: "boolean",
            description: "Optional parameter"
          }
        },
        required: ["location"]  // Only required params
      }
    }
  }
];
```

### 2. Tool Executor (`tool-executor.ts`)
```typescript
async function executeToolName(args: any): Promise<any> {
  console.log('[toolName] Starting with args:', JSON.stringify(args, null, 2));

  // Validate required parameters
  if (!args.location) {
    return {
      success: false,
      error: "location is required"
    };
  }

  // Build search parameters (NOT data!)
  const searchParams = {
    city: extractCity(args.location),
    filters: {
      maxPrice: args.maxPrice,
      minBeds: args.beds
    }
  };

  // Return parameters for frontend
  return {
    success: true,
    searchParams: searchParams,
    locationContext: {
      city: searchParams.city,
      filters: Object.fromEntries(
        Object.entries(searchParams.filters)
          .filter(([_, v]) => v !== undefined && v !== null)
      )
    }
  };
}
```

### 3. Executor Router (`tool-executor.ts`)
```typescript
// In executeToolCall()
if (functionName === "toolName") {
  result = await executeToolName(functionArgs, userId);
}
```

---

## Current Tools

### 1. searchHomes
**File**: `src/lib/chat/tools/executors/search-homes.ts`

**Purpose**: Property search with filters

**Parameters**:
```typescript
{
  location: string,      // Required
  beds?: number,         // Minimum bedrooms
  baths?: number,        // Minimum bathrooms
  maxPrice?: number,     // Maximum price
  minPrice?: number,     // Minimum price
  pool?: boolean,        // Must have pool
  propertyType?: "house" | "condo" | "townhouse"
}
```

**Returns**:
```typescript
{
  success: true,
  message: "I'll show you homes matching your search criteria.",
  searchParams: {
    city: "Palm Desert",
    subdivision: "Palm Desert Country Club",
    zip: undefined,
    filters: {
      propertySubType: "Single Family",
      minBeds: 3,
      maxPrice: 600000,
      pool: true,
      limit: 10,
      sort: "newest"
    }
  },
  locationContext: { /* for AI response */ }
}
```

### 2. getSubdivisionInfo
**Purpose**: Get subdivision data (HOA, amenities, rentals)

**Parameters**:
```typescript
{
  subdivisionName: string,  // Required
  field?: "shortTermRentals" | "hoa" | "amenities" | "all"
}
```

**Returns**:
```typescript
{
  success: true,
  subdivision: "Palm Desert Country Club",
  city: "Palm Desert",
  county: "Riverside County",
  shortTermRentals: {
    allowed: false,
    details: "HOA prohibits short-term rentals under 30 days",
    confidence: "high",
    source: "subdivision-data"
  },
  hoa: {
    monthlyMin: 250,
    monthlyMax: 450,
    includes: ["Golf", "Tennis", "Pools", "Security"]
  },
  amenities: {
    golfCourses: 2,
    golfCoursesNames: ["Desert Willow", "Mountain View"],
    tennisCourts: true,
    pools: true,
    securityType: "Gated"
  }
}
```

### 3. getListingInfo
**Purpose**: Get specific property details

**Parameters**:
```typescript
{
  address: string,  // Required
  field?: "shortTermRentals" | "hoa" | "details" | "all"
}
```

### 4. getAppreciation
**Purpose**: Historical appreciation data

**Parameters**:
```typescript
{
  location: string,  // City, subdivision, or county
  period?: "1y" | "3y" | "5y" | "10y"
}
```

**Returns**:
```typescript
{
  success: true,
  component: "appreciation",
  location: "PGA West",
  locationType: "subdivision",  // From entity recognition
  period: "5y"
}
```

**Component**: `AppreciationContainer` fetches closed sales data and renders chart

---

## Adding a New Tool

### Step-by-Step Example: "getNearbySchools"

#### 1. Define Tool
**File**: `src/lib/chat/tools-user-first.ts`

```typescript
export const ALL_TOOLS: GroqTool[] = [
  // ... existing tools
  {
    type: "function",
    function: {
      name: "getNearbySchools",
      description: "Find schools near a location with ratings and distances",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "Address, city, or ZIP code"
          },
          radius: {
            type: "number",
            description: "Search radius in miles (default: 5)"
          },
          level: {
            type: "string",
            enum: ["elementary", "middle", "high", "all"],
            description: "School level filter (default: all)"
          }
        },
        required: ["location"]
      }
    }
  }
];
```

#### 2. Create Executor
**File**: `src/lib/chat/tool-executor.ts`

```typescript
async function executeGetNearbySchools(args: any): Promise<any> {
  console.log('[getNearbySchools] Starting with args:', JSON.stringify(args, null, 2));

  const { location, radius = 5, level = 'all' } = args;

  if (!location) {
    return {
      success: false,
      error: "location is required"
    };
  }

  // Return parameters for frontend
  return {
    success: true,
    component: "schools",
    searchParams: {
      location: location,
      radius: radius,
      level: level
    }
  };
}
```

#### 3. Add to Router
**File**: `src/lib/chat/tool-executor.ts`

```typescript
// In executeToolCall()
if (functionName === "getNearbySchools") {
  result = await executeGetNearbySchools(functionArgs);
}
```

#### 4. Add to Cache List (Optional)
```typescript
const cacheableTools = [
  'searchHomes',
  'getSubdivisionInfo',
  'getNearbySchools',  // Add here
  // ... more tools
];
```

#### 5. Add Intent Pattern
**File**: `src/lib/chat/intent-classifier.ts`

```typescript
// In classifyIntent()
if (message.includes("schools") || message.includes("education")) {
  return {
    intent: "find_schools",
    confidence: 4.0,
    detectedPatterns: ["schools-keyword"]
  };
}

// In getToolForIntent()
case "find_schools":
  return "getNearbySchools";
```

#### 6. Create Frontend Component (Optional)
```typescript
// src/app/components/chat/SchoolsContainer.tsx
export function SchoolsContainer({ searchParams }: Props) {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSchools() {
      const response = await fetch('/api/schools/nearby', {
        method: 'POST',
        body: JSON.stringify(searchParams)
      });

      const data = await response.json();
      setSchools(data.schools);
      setLoading(false);
    }

    fetchSchools();
  }, [searchParams]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="schools-container">
      {schools.map(school => (
        <SchoolCard key={school.id} school={school} />
      ))}
    </div>
  );
}
```

#### 7. Add Component Marker
**In AI response parsing**:

Update `ChatResultsContainer.tsx`:
```typescript
if (msg.content.includes('[SCHOOLS]')) {
  const params = extractSchoolsParams(msg);
  return <SchoolsContainer searchParams={params} />;
}
```

---

## Best Practices

### ✅ DO
1. **Return Parameters, Not Data**
   ```typescript
   return { searchParams: { city, filters } };
   ```

2. **Validate Required Parameters**
   ```typescript
   if (!args.location) {
     return { success: false, error: "location is required" };
   }
   ```

3. **Log Execution**
   ```typescript
   console.log('[toolName] Starting with args:', args);
   await logChatMessage("system", "toolName executed", userId, { args });
   ```

4. **Filter Null/Undefined Values**
   ```typescript
   filters: Object.fromEntries(
     Object.entries(filters).filter(([_, v]) => v !== undefined && v !== null)
   )
   ```

5. **Use Entity Recognition**
   ```typescript
   const entityResult = identifyEntityType(args.location);
   // → { type: "subdivision", value: "PGA West" }
   ```

### ❌ DON'T
1. **Don't Fetch Data in Tool Executors**
   ```typescript
   // ❌ WRONG
   const listings = await fetchFromMongoDB();
   return { listings };
   ```

2. **Don't Make Backend API Calls**
   ```typescript
   // ❌ WRONG
   const response = await fetch('/api/query', { ... });
   ```

3. **Don't Return Large Payloads**
   ```typescript
   // ❌ WRONG - bloats AI context
   return { listings: [...100 full listing objects...] };
   ```

4. **Don't Chain Multiple Tools**
   ```typescript
   // ❌ WRONG
   const result1 = await executeToolA();
   const result2 = await executeToolB(result1);
   ```

5. **Don't Assume Parameters**
   ```typescript
   // ❌ WRONG
   const beds = args.beds || 3;  // Don't default without user input

   // ✅ CORRECT
   const beds = args.beds;  // Let frontend/AI decide
   ```

---

## Tool Response Formats

### Search Parameters Response
```typescript
{
  success: true,
  message: "Optional AI-friendly message",
  searchParams: {
    city: "Palm Desert",
    subdivision: "PGA West",
    filters: {
      maxPrice: 800000,
      minBeds: 3,
      pool: true
    }
  },
  locationContext: {
    // Context for AI to format response
  }
}
```

### Component Parameters Response
```typescript
{
  success: true,
  component: "appreciation",  // Component to render
  location: "Palm Desert",
  locationType: "city",       // From entity recognition
  period: "5y"
}
```

### Data Response (Rare - Only for Quick Queries)
```typescript
{
  success: true,
  hoa: {
    monthlyMin: 250,
    monthlyMax: 450,
    includes: ["Golf", "Tennis"]
  },
  amenities: {
    golfCourses: 2,
    pools: true
  }
}
```

### Error Response
```typescript
{
  success: false,
  error: "Clear error message for debugging"
}
```

---

## Testing Tools

### Manual Testing
```bash
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Show me homes in Palm Desert"}
    ],
    "userId": "test-user",
    "userTier": "premium"
  }' | grep -A 10 "searchHomes"
```

### Check Logs
```
[searchHomes] Starting with args: { location: "Palm Desert" }
[searchHomes] Query payload: { city: "Palm Desert", filters: {...} }
[searchHomes] Returning search parameters for component-first architecture
```

### Verify Tool Execution
1. Check intent classification logs
2. Verify tool selection
3. Confirm parameter extraction
4. Test frontend component rendering
5. Verify data fetching from component

---

## Common Patterns

### Pattern 1: Location Extraction
```typescript
function extractCity(location: string): string | undefined {
  if (/^\d{5}$/.test(location)) return undefined;  // ZIP code
  if (location.includes('Country Club')) return undefined;  // Subdivision
  return location;  // City
}
```

### Pattern 2: Filter Building
```typescript
const filters = {
  propertySubType: mapPropertyType(args.propertyType),
  minBeds: args.beds,
  minBaths: args.baths,
  minPrice: args.priceRange?.min,
  maxPrice: args.priceRange?.max,
  pool: args.pool,
  view: args.view,
  gated: args.gated,
  limit: 10,
  sort: "newest"
};

// Filter out undefined/null values
const cleanFilters = Object.fromEntries(
  Object.entries(filters).filter(([_, v]) => v !== undefined && v !== null)
);
```

### Pattern 3: Entity Recognition Integration
```typescript
const entityResult = identifyEntityType(args.location);

if (entityResult.type === 'subdivision') {
  return {
    success: true,
    searchParams: {
      subdivision: entityResult.value,
      filters: args.filters
    }
  };
} else if (entityResult.type === 'city') {
  return {
    success: true,
    searchParams: {
      city: entityResult.value,
      filters: args.filters
    }
  };
}
```

---

## Troubleshooting

### Tool Not Executing
1. Check tool definition exists in `tools-user-first.ts`
2. Verify executor routing in `tool-executor.ts`
3. Check intent classification (is tool being selected?)
4. Review logs for errors

### Wrong Parameters
1. Check parameter extraction in tool executor
2. Verify Groq argument sanitization
3. Review tool definition parameter types
4. Test with manual curl request

### Component Not Rendering
1. Verify component marker in AI response
2. Check `ChatResultsContainer.tsx` parsing logic
3. Ensure component receives correct props
4. Review browser console for errors

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for more details.
