# New Listing Filtering Capabilities

**Date:** December 15, 2025
**Purpose:** Document newly added fields for advanced listing filtering

---

## Overview

Added comprehensive timestamp and change tracking fields to support advanced filtering capabilities like "new listings", "price reductions", "recently updated", etc.

---

## New Fields Added

### Timestamp Fields

| Field | Type | Indexed | Purpose | Example Use Case |
|-------|------|---------|---------|------------------|
| `onMarketDate` | Date | ✅ Yes | Date listing went on market | "Show listings from last 7 days" |
| `listingContractDate` | Date | No | Contract date | Legal/compliance queries |
| `listingUpdateTimestamp` | Date | No | Last update timestamp | "Recently updated listings" |
| `priceChangeTimestamp` | Date | ✅ Yes | Last price change | "Recent price reductions" |
| `majorChangeTimestamp` | Date | No | Last major change | Tracking significant updates |
| `photosChangeTimestamp` | Date | No | Photos last updated | Photo freshness tracking |
| `extensionTimestamp` | Date | No | Contract extension | Extended listing tracking |

### Change Tracking Fields

| Field | Type | Purpose | Example Values |
|-------|------|---------|----------------|
| `majorChangeType` | String | Type of last major change | "Price Reduced", "Back on Market", "New Listing" |
| `listingTerms` | String | Payment terms accepted | "Cash, 1031 Exchange, Conventional" |
| `originalListPrice` | Number | Original listing price | Compare to current for % reduction |
| `associationYN` | Boolean | Has HOA/association | Filter by HOA presence |

---

## Database Indexes

The following fields have indexes for optimal query performance:

- `onMarketDate` - For "new listings" queries
- `priceChangeTimestamp` - For "price reduced" queries
- `modificationTimestamp` - Already existed, for general updates

---

## Example Use Cases

### 1. New Listings (Last 7 Days)

**User Query:** "Show me new listings in Palm Desert from the last week"

**Filter:**
```typescript
{
  city: "Palm Desert",
  onMarketDate: {
    $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  }
}
```

**AI Tool Call:**
```json
{
  "tool": "queryDatabase",
  "parameters": {
    "city": "Palm Desert",
    "listedAfter": "2025-12-08",
    "sort": "newest"
  }
}
```

---

### 2. Recent Price Reductions

**User Query:** "Find homes in La Quinta with recent price drops"

**Filter:**
```typescript
{
  city: "La Quinta",
  priceChangeTimestamp: {
    $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  },
  majorChangeType: "Price Reduced"
}
```

**AI Tool Call:**
```json
{
  "tool": "queryDatabase",
  "parameters": {
    "city": "La Quinta",
    "priceChangedAfter": "2025-11-15",
    "majorChangeType": "Price Reduced"
  }
}
```

---

### 3. No HOA Listings

**User Query:** "Show me homes without HOA fees in Indian Wells"

**Filter:**
```typescript
{
  city: "Indian Wells",
  $or: [
    { associationYN: false },
    { associationFee: 0 },
    { associationFee: { $exists: false } }
  ]
}
```

**AI Tool Call:**
```json
{
  "tool": "queryDatabase",
  "parameters": {
    "city": "Indian Wells",
    "noHOA": true
  }
}
```

---

### 4. Recently Back on Market

**User Query:** "Find listings that came back on market this month"

**Filter:**
```typescript
{
  majorChangeType: "Back on Market",
  majorChangeTimestamp: {
    $gte: new Date('2025-12-01')
  }
}
```

---

### 5. Cash-Only Deals

**User Query:** "Show cash-only properties in Rancho Mirage"

**Filter:**
```typescript
{
  city: "Rancho Mirage",
  listingTerms: { $regex: /cash/i }
}
```

---

## Updated Files

### 1. Model Definition
**File:** `src/models/unified-listing.ts`

**Interface Updates (lines 203-218):**
```typescript
// Timestamps
modificationTimestamp?: Date;
listingContractDate?: Date;
statusChangeTimestamp?: Date;
onMarketDate?: Date;
originalOnMarketTimestamp?: Date;
daysOnMarket?: number;
listingUpdateTimestamp?: Date;
priceChangeTimestamp?: Date;
photosChangeTimestamp?: Date;
majorChangeTimestamp?: Date;
extensionTimestamp?: Date;

// Listing changes tracking
majorChangeType?: string;
listingTerms?: string;
```

**Schema Updates (lines 385-400):**
- Added indexes to `onMarketDate` and `priceChangeTimestamp`
- Added all new timestamp fields
- Added change tracking fields

---

### 2. Query Aggregator
**File:** `src/lib/queries/aggregators/active-listings.ts`

**Interface Updates (lines 42-49):**
```typescript
onMarketDate?: Date;
listingContractDate?: Date;
listingUpdateTimestamp?: Date;
priceChangeTimestamp?: Date;
majorChangeTimestamp?: Date;
majorChangeType?: string;
originalListPrice?: number;
listingTerms?: string;
```

**Field Selection Updates (lines 246-255):**
- Added all new timestamp fields to query selection
- Added change tracking fields
- Added `associationYN` for HOA filtering

---

## Future Filter Enhancements

### Planned Features

1. **"listedAfter" Parameter**
   - **Purpose:** Filter listings by on-market date
   - **Implementation:** Add to `CombinedFilters` interface
   - **Example:** `{ listedAfter: "2025-12-01" }`

2. **"priceChangedAfter" Parameter**
   - **Purpose:** Filter by price change date
   - **Implementation:** Add to `CombinedFilters` interface
   - **Example:** `{ priceChangedAfter: "2025-11-01" }`

3. **"majorChangeType" Parameter**
   - **Purpose:** Filter by change type
   - **Implementation:** Add to `CombinedFilters` interface
   - **Example:** `{ majorChangeType: "Price Reduced" }`

4. **"noHOA" Boolean Parameter**
   - **Purpose:** Exclude properties with HOA
   - **Implementation:** Add to `CombinedFilters` interface
   - **Example:** `{ noHOA: true }`

5. **"acceptsCash" Boolean Parameter**
   - **Purpose:** Filter for cash-accepting listings
   - **Implementation:** Regex search on `listingTerms`
   - **Example:** `{ acceptsCash: true }`

6. **"accepts1031" Boolean Parameter**
   - **Purpose:** Filter for 1031 exchange acceptance
   - **Implementation:** Regex search on `listingTerms`
   - **Example:** `{ accepts1031: true }`

---

## Implementation Steps for Filter Parameters

### 1. Update CombinedFilters Interface

**File:** `src/lib/queries/filters.ts`

```typescript
export interface CombinedFilters {
  // Existing filters...

  // New date filters
  listedAfter?: string | Date;
  listedBefore?: string | Date;
  priceChangedAfter?: string | Date;
  updatedAfter?: string | Date;

  // Change tracking
  majorChangeType?: string;

  // HOA/Association
  noHOA?: boolean;
  maxHOA?: number;

  // Payment terms
  acceptsCash?: boolean;
  accepts1031?: boolean;
}
```

### 2. Update combineFilters Function

**File:** `src/lib/queries/filters.ts`

```typescript
export function combineFilters(filters: CombinedFilters): any {
  const query: any = {};

  // Existing filters...

  // Date filters
  if (filters.listedAfter) {
    query.onMarketDate = { $gte: new Date(filters.listedAfter) };
  }

  if (filters.priceChangedAfter) {
    query.priceChangeTimestamp = { $gte: new Date(filters.priceChangedAfter) };
  }

  // Change type
  if (filters.majorChangeType) {
    query.majorChangeType = filters.majorChangeType;
  }

  // HOA filters
  if (filters.noHOA) {
    query.$or = [
      { associationYN: false },
      { associationFee: 0 },
      { associationFee: { $exists: false } }
    ];
  }

  if (filters.maxHOA !== undefined) {
    query.associationFee = { $lte: filters.maxHOA };
  }

  // Payment term filters
  if (filters.acceptsCash) {
    query.listingTerms = { $regex: /cash/i };
  }

  if (filters.accepts1031) {
    query.listingTerms = { $regex: /1031/i };
  }

  return query;
}
```

### 3. Update AI Tool Definitions

**File:** `src/lib/chat/chat-tools.ts`

Add new parameters to `queryDatabase` tool:

```typescript
{
  name: "queryDatabase",
  parameters: {
    // Existing parameters...

    listedAfter: {
      type: "string",
      description: "Filter listings added after this date (YYYY-MM-DD or 'today', '7days', '30days')"
    },
    priceChangedAfter: {
      type: "string",
      description: "Filter listings with price changes after this date"
    },
    majorChangeType: {
      type: "string",
      description: "Filter by change type: 'Price Reduced', 'Back on Market', etc."
    },
    noHOA: {
      type: "boolean",
      description: "True to exclude properties with HOA fees"
    },
    maxHOA: {
      type: "number",
      description: "Maximum acceptable HOA fee per month"
    },
    acceptsCash: {
      type: "boolean",
      description: "True to show only cash-accepting properties"
    },
    accepts1031: {
      type: "boolean",
      description: "True to show only 1031 exchange-accepting properties"
    }
  }
}
```

### 4. Update System Prompt Examples

**File:** `src/lib/chat/system-prompt.ts`

Add examples:

```
User: "Show me new listings in Palm Desert from the last week"
✅ CORRECT:
queryDatabase({
  "city": "Palm Desert",
  "listedAfter": "7days",
  "sort": "newest"
})

User: "Find homes with recent price drops under $600k"
✅ CORRECT:
queryDatabase({
  "maxPrice": 600000,
  "priceChangedAfter": "30days",
  "majorChangeType": "Price Reduced"
})

User: "Show me cash-only deals without HOA in Indian Wells"
✅ CORRECT:
queryDatabase({
  "city": "Indian Wells",
  "acceptsCash": true,
  "noHOA": true
})
```

---

## Benefits

### For Users
- ✅ Find new listings quickly
- ✅ Spot price reductions and opportunities
- ✅ Filter by payment preferences
- ✅ Avoid HOA fees if desired
- ✅ More precise search results

### For System
- ✅ Indexed fields for fast queries
- ✅ Extensible architecture
- ✅ Supports complex filters
- ✅ Backward compatible (all fields optional)

---

## Testing Queries

After implementation, test with these queries:

```bash
# New listings last 7 days
GET /api/query?city=Palm+Desert&listedAfter=2025-12-08

# Price reductions last 30 days
GET /api/query?city=La+Quinta&priceChangedAfter=2025-11-15&majorChangeType=Price+Reduced

# No HOA properties
GET /api/query?city=Indian+Wells&noHOA=true

# Cash deals under $500k
GET /api/query?maxPrice=500000&acceptsCash=true

# Back on market
GET /api/query?majorChangeType=Back+on+Market
```

---

## Migration Notes

**No migration required!** All new fields are optional and will populate as listings are updated from MLS feeds.

Existing listings without these fields will:
- Return `undefined` for new timestamp fields
- Work with existing filters
- Gradually populate as MLS data refreshes

---

**Status:** ✅ Model and query aggregator updated, filter implementation pending
**Next Step:** Implement filter parameters in `combineFilters()` function
