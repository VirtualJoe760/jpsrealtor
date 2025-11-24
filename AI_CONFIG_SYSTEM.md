# AI Configuration System

## Overview

The AI Configuration System provides a single source of truth for how the JPSRealtor AI assistant operates. This configuration file ensures consistent, accurate, and optimized responses across all real estate queries.

---

## Files Created

### 1. **src/lib/ai-config.json**
**Purpose**: Master configuration file containing all AI knowledge, API routes, formulas, and operational guidelines.

**Location**: `F:/web-clients/joseph-sardella/jpsrealtor/src/lib/ai-config.json`

**Also available at**: `F:/web-clients/joseph-sardella/jpsrealtor/public/lib/ai-config.json` (for client-side access)

**Size**: ~25KB JSON configuration

---

## Configuration Structure

### 1. **Search Priority Hierarchy**

The AI follows a strict hierarchy when searching for properties:

```
Priority 1: SUBDIVISIONS (highest specificity)
├─ Returns ALL listings in subdivision (no limit)
├─ Example: "Palm Desert Country Club", "Indian Wells Country Club"
└─ Handles disambiguation for duplicate names

Priority 2: CITIES (medium specificity)
├─ Returns ALL listings in city (no limit)
├─ Example: "Palm Desert", "Corona", "Indian Wells"
└─ Good for city-wide market analysis

Priority 3: COUNTIES (lowest specificity)
├─ Limited to 100 results (performance constraint)
├─ Example: "Riverside County", "San Diego County"
└─ Directs users to map view for complete results
```

**Rule**: AI MUST call `matchLocation()` BEFORE `searchListings()` to correctly identify the search type and get exact names.

---

### 2. **API Routes & Function Calls**

The config documents all available function calls:

#### **matchLocation({query: "..."})**
- **Endpoint**: `/api/chat/match-location`
- **Purpose**: Intelligently match user's location query to subdivision/city/county
- **Handles**: Disambiguation when multiple matches exist
- **Returns**: Search-ready parameters for `searchListings()`

#### **searchListings({...})**
- **Endpoint**: `/api/chat/search-listings`
- **Purpose**: Search MLS listings with filters
- **Parameters**: cities, subdivisions, propertyTypes, beds, baths, price, sqft, pool, view, etc.
- **Returns**: Array of matching listings with photos

#### **researchCommunity({...})**
- **Endpoint**: `/api/chat/research-community`
- **Purpose**: Auto-discover and record community facts from MLS data
- **Supports**: HOA fees, year built, price ranges, property types, amenities
- **Returns**: Answer with confidence level + auto-records high-confidence facts

#### **generateCMA({listingKey: "..."})**
- **Endpoint**: `/api/cma/generate`
- **Purpose**: Generate Comparative Market Analysis
- **Returns**: Estimated value, comparables, market statistics, price trends

---

### 3. **CMA Calculations**

The config documents all CMA formulas:

#### **Price Per Square Foot**
```javascript
pricePerSqFt = price / squareFeet
```
Primary metric for property value estimation.

#### **Similarity Score** (0-100)
```javascript
score = 100 - penalties
Penalties:
  - Price difference: max -30 points
  - Sqft difference: max -20 points
  - Bedroom difference: max -15 points
  - Bathroom difference: max -15 points
  - Year built difference: max -10 points
  - Distance: max -10 points
```

#### **Haversine Distance**
```javascript
distance = 2 * R * arcsin(sqrt(sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlon/2)))
R = 3959 miles (Earth's radius)
```
Calculate distance between two coordinates in miles.

#### **Estimated Value**
```javascript
estimatedValue = avgPricePerSqFt * subjectSqFt
valueLow = min(compPricesPerSqFt) * subjectSqFt
valueHigh = max(compPricesPerSqFt) * subjectSqFt
```

---

### 4. **Market Appreciation Calculations**

#### **Annual Appreciation**
```javascript
annualAppreciation = ((currentPrice - priorPrice) / priorPrice) * 100
```

#### **Compound Annual Growth Rate (CAGR)**
```javascript
CAGR = (((endValue / beginValue) ^ (1 / years)) - 1) * 100
```

#### **Months of Inventory**
```javascript
monthsOfInventory = activeListings / averageMonthlySales

Interpretation:
  < 3 months = Seller's market (high demand)
  3-6 months = Balanced market
  > 6 months = Buyer's market (high supply)
```

#### **Absorption Rate**
```javascript
absorptionRate = (soldListings / activeListings) * 100
```

---

### 5. **Investment Calculations**

All standard real estate investment formulas are documented:

- **Cap Rate**: (Annual NOI ÷ Property Value) × 100
- **Cash-on-Cash Return**: (Annual Cash Flow ÷ Cash Invested) × 100
- **1% Rule**: Monthly Rent ≥ (Purchase Price × 0.01)
- **Gross Rent Multiplier**: Property Price ÷ Annual Gross Rent
- **Debt Service Coverage Ratio**: NOI ÷ Annual Debt Service

---

## Debug Commands

Two special commands have been added to the AI chat for debugging:

### **\*\*config-log**
Prints the entire AI configuration file in JSON format.

**Usage**: Type `**config-log` in the chat

**Output**: Full JSON configuration (pretty-printed)

---

### **\*\*config-route**
Lists all API routes the AI knows about with their purposes.

**Usage**: Type `**config-route` in the chat

**Output**:
```
**AI API Routes:**

**matchLocation({query: "..."})**
  → Endpoint: `/api/chat/match-location`
  → Method: POST
  → Purpose: Match user's location query to subdivision, city, or county

**searchListings({...})**
  → Endpoint: `/api/chat/search-listings`
  → Method: POST
  → Purpose: Search MLS listings with filters

...
```

---

## Integration Points

### 1. **Client-Side (IntegratedChatWidget.tsx)**
- Handles `**config-log` and `**config-route` commands
- Fetches config from `/lib/ai-config.json`
- Displays formatted output in chat

### 2. **Server-Side (API Route: /api/chat/stream)**
- Imports `ai-config.json` into system prompt
- Injects search priority hierarchy
- Provides API route documentation
- Includes all formulas and calculations

**File**: `src/app/api/chat/stream/route.ts`

**Import**:
```typescript
import aiConfig from "@/lib/ai-config.json";
```

**Usage**:
```typescript
const systemPrompt = `
  ## CRITICAL: Search Priority Hierarchy
  ${JSON.stringify(aiConfig.searchPriority, null, 2)}

  ## Available API Routes
  ${JSON.stringify(aiConfig.apiRoutes.routes, null, 2)}

  ## CMA Formulas
  ${JSON.stringify(aiConfig.cmaCalculations.formulas, null, 2)}
  ...
`;
```

---

## Benefits

### 1. **Single Source of Truth**
- All AI knowledge in one file
- No conflicting instructions across different prompts
- Easy to update and maintain

### 2. **Consistency**
- AI always follows the same search priority
- Same formulas used everywhere
- Predictable behavior

### 3. **Transparency**
- Users can inspect config with `**config-log`
- Debug issues by checking what AI knows
- Validate API routes with `**config-route`

### 4. **Maintainability**
- Add new API routes in one place
- Update formulas without touching code
- Version controlled with git

### 5. **Performance**
- AI knows to use most specific search type first
- Avoids unnecessary API calls
- Optimal search hierarchy

---

## Maintenance

### Updating the Configuration

1. **Edit the master file**:
   ```bash
   F:/web-clients/joseph-sardella/jpsrealtor/src/lib/ai-config.json
   ```

2. **Copy to public folder** (for client-side access):
   ```bash
   cp src/lib/ai-config.json public/lib/ai-config.json
   ```

3. **Update version number** in the config:
   ```json
   {
     "version": "1.0.1",
     "lastUpdated": "2025-01-23"
   }
   ```

4. **Test with debug commands**:
   - Type `**config-log` in chat to verify changes
   - Type `**config-route` to check API routes

---

### Adding a New API Route

Example: Adding a new market trends endpoint

1. **Add to `apiRoutes.routes` array**:
   ```json
   {
     "function": "getMarketTrends({city: '...'})",
     "endpoint": "/api/market/trends",
     "method": "POST",
     "purpose": "Get historical price trends for a city",
     "parameters": {
       "city": "string - city name",
       "timeframe": "number - months of history"
     },
     "returns": {
       "success": "boolean",
       "trends": "array - price data by month"
     },
     "examples": [
       "getMarketTrends({city: 'Palm Desert', timeframe: 12})"
     ]
   }
   ```

2. **Update search priority if needed**

3. **Copy to public folder**

4. **Restart dev server** to load new config

---

### Adding New Formulas

Example: Adding a new investment metric

1. **Add to `investmentCalculations.formulas`**:
   ```json
   "breakEvenRatio": {
     "formula": "(operatingExpenses + debtService) / grossOperatingIncome",
     "description": "Percentage of income needed to cover expenses",
     "goodRange": "Below 85%"
   }
   ```

2. **Document usage**:
   ```json
   "usage": "AI can calculate this when user asks about operating margin"
   ```

---

## Error Handling

The config documents how to handle common errors:

### **No Location Match**
```json
"response": "I couldn't find that location. Could you clarify? Did you mean [similar location]?",
"action": "Offer suggestions based on partial matches"
```

### **No Listings Found**
```json
"response": "No listings match those exact criteria. Would you like me to adjust the filters?",
"suggestions": [
  "Expand price range",
  "Reduce bedroom requirement",
  "Search nearby cities"
]
```

### **Disambiguation Needed**
```json
"response": "I found [N] communities with that name. Which one?",
"format": "Numbered list with city context"
```

---

## Response Guidelines

The config includes guidelines for AI responses:

### **Conversation First**
- Have a conversation before searching
- Build context about user needs
- Only search when user is ready

### **After Search**
- Keep response to 1 sentence
- Don't describe what's in the carousel
- Example: "Found 10 family-friendly homes in Indian Wells."

### **Unknown Data**
- **NEVER** make up numbers
- Respond honestly: "I don't have current data on [detail]"
- Offer alternatives: "Would you like me to search for homes instead?"

---

## Technical Details

### **File Format**
- JSON with extensive comments in descriptions
- Schema-validated structure
- Pretty-printed for readability

### **Size**
- ~25KB uncompressed
- ~5KB gzipped
- Negligible performance impact

### **Loading**
- Server-side: Imported at build time (zero runtime cost)
- Client-side: Fetched on-demand (only for debug commands)

### **Caching**
- Server: Bundled with Next.js build
- Client: Browser caches with standard HTTP headers

---

## Future Enhancements

### Planned Features

1. **Config Validation**
   - JSON schema validation
   - TypeScript types generation
   - Build-time checks

2. **Dynamic Updates**
   - Hot-reload config changes
   - A/B testing different configurations
   - Per-user customization

3. **Analytics**
   - Track which routes are used most
   - Monitor function call success rates
   - Identify missing documentation

4. **Versioning**
   - Semantic versioning (1.0.0)
   - Changelog tracking
   - Rollback capability

---

## Summary

The AI Configuration System provides:

✅ **Single source of truth** for AI behavior
✅ **Search priority hierarchy** (subdivision → city → county)
✅ **Complete API route documentation**
✅ **All CMA and investment formulas**
✅ **Market appreciation calculations**
✅ **Error handling guidelines**
✅ **Response formatting rules**
✅ **Debug commands** (`**config-log`, `**config-route`)
✅ **Server-side integration** (system prompt injection)
✅ **Client-side access** (debug commands)

This ensures the AI consistently provides accurate, helpful, and optimized responses for all real estate queries.
