# Listing Results - Sorting Options Implementation

**Date**: December 20, 2025
**Status**: 🟡 In Progress
**Priority**: HIGH - Improves user experience and data organization

---

## Overview

Adding flexible sorting options to listing results so users can view properties organized by:
- **Price** (high to low, low to high)
- **Price per sqft** (efficiency sorting)
- **Property type** (condos grouped, SFRs grouped, etc.)
- **Date listed** (newest first)

---

## Current Sorting Behavior

### Cities Endpoint
```javascript
const sortBy = !hasFilters
  ? { onMarketDate: -1 }  // Newest first for general queries
  : { listPrice: 1 };      // Price ascending for filtered queries
```

**Issues**:
- No user control over sorting
- Always low-to-high price for filtered queries
- Can't group by property type

### Subdivisions Endpoint
```javascript
.sort({ listPrice: -1 })  // Always high-to-low
```

**Issues**:
- Hardcoded to high-to-low
- No other sorting options
- Can't see cheapest properties first

---

## Proposed Sorting Options

### URL Parameter
```
?sort={option}
```

### Available Options

| Option | Sort By | Use Case |
|--------|---------|----------|
| `price-low` | listPrice ascending | "Show me cheapest first" |
| `price-high` | listPrice descending | "Show me luxury homes first" |
| `sqft-low` | (listPrice/livingArea) ascending | "Best value per sqft" |
| `sqft-high` | (listPrice/livingArea) descending | "Premium price per sqft" |
| `newest` | onMarketDate descending | "Just listed properties" |
| `oldest` | onMarketDate ascending | "Price drops / motivated sellers" |
| `property-type` | propertySubType, listPrice | "Group condos together, SFRs together" |

### Default Behavior (Backwards Compatible)

**If no `?sort` parameter provided**:
- **Cities (no filters)**: `newest` (onMarketDate descending)
- **Cities (with filters)**: `price-low` (listPrice ascending)
- **Subdivisions**: `price-high` (listPrice descending)

---

## Implementation Plan

### Phase 1: Backend Sorting Logic

#### Cities Endpoint Changes
```typescript
// Get sort parameter
const sortParam = searchParams.get("sort") || "auto";

// Build sort object
let sortBy: any;

if (sortParam === "auto") {
  // Keep existing behavior for backwards compatibility
  sortBy = !hasFilters
    ? { onMarketDate: -1 }
    : { listPrice: 1 };
} else {
  switch (sortParam) {
    case "price-low":
      sortBy = { listPrice: 1 };
      break;
    case "price-high":
      sortBy = { listPrice: -1 };
      break;
    case "sqft-low":
      // MongoDB can't sort by calculated field, need aggregation
      sortBy = { pricePerSqft: 1 };
      break;
    case "sqft-high":
      sortBy = { pricePerSqft: -1 };
      break;
    case "newest":
      sortBy = { onMarketDate: -1 };
      break;
    case "oldest":
      sortBy = { onMarketDate: 1 };
      break;
    case "property-type":
      sortBy = { propertySubType: 1, listPrice: 1 };
      break;
    default:
      sortBy = { listPrice: 1 };
  }
}
```

#### Handling Price Per Sqft Sorting

**Problem**: `listPrice / livingArea` is a calculated field, not in database

**Solution 1** (Simple - Pre-calculate in response):
```typescript
// Add pricePerSqft to each listing before returning
const listingsWithPricePerSqft = listings.map(listing => ({
  ...listing,
  pricePerSqft: listing.listPrice / (listing.livingArea || 1)
}));

// Sort in JavaScript
if (sortParam === "sqft-low") {
  listingsWithPricePerSqft.sort((a, b) => a.pricePerSqft - b.pricePerSqft);
} else if (sortParam === "sqft-high") {
  listingsWithPricePerSqft.sort((a, b) => b.pricePerSqft - a.pricePerSqft);
}
```

**Solution 2** (Better - Use MongoDB aggregation):
```typescript
if (sortParam === "sqft-low" || sortParam === "sqft-high") {
  // Use aggregation pipeline instead of .find()
  const listings = await UnifiedListing.aggregate([
    { $match: baseQuery },
    {
      $addFields: {
        pricePerSqft: {
          $cond: [
            { $gt: ["$livingArea", 0] },
            { $divide: ["$listPrice", "$livingArea"] },
            999999  // Put properties with no sqft at the end
          ]
        }
      }
    },
    { $sort: { pricePerSqft: sortParam === "sqft-low" ? 1 : -1 } },
    { $limit: limit }
  ]);
}
```

---

### Phase 2: Update Both Endpoints

#### Files to Modify
1. `src/app/api/cities/[cityId]/listings/route.ts`
2. `src/app/api/subdivisions/[slug]/listings/route.ts`

#### Shared Sorting Function (Optional)
```typescript
// src/lib/filters/listing-sorts.ts
export function buildSortQuery(
  sortParam: string | null,
  hasFilters: boolean = false,
  defaultSort: "newest" | "price-high" | "price-low" = "price-low"
): any {
  if (!sortParam || sortParam === "auto") {
    // Use provided default or smart default
    if (!hasFilters) return { onMarketDate: -1 };
    return defaultSort === "price-high"
      ? { listPrice: -1 }
      : { listPrice: 1 };
  }

  const sortMap: Record<string, any> = {
    "price-low": { listPrice: 1 },
    "price-high": { listPrice: -1 },
    "newest": { onMarketDate: -1 },
    "oldest": { onMarketDate: 1 },
    "property-type": { propertySubType: 1, listPrice: 1 },
  };

  return sortMap[sortParam] || { listPrice: 1 };
}

export function needsAggregation(sortParam: string | null): boolean {
  return sortParam === "sqft-low" || sortParam === "sqft-high";
}
```

---

### Phase 3: Frontend Integration

#### Chat AI Tool Updates
```typescript
// src/lib/chat-v2/tools.ts
{
  type: "function",
  function: {
    name: "searchHomes",
    description: "Search for homes with comprehensive filtering and sorting",
    parameters: {
      type: "object",
      properties: {
        location: { ... },
        // ... existing filters ...
        sort: {
          type: "string",
          description: "How to sort results",
          enum: [
            "price-low",
            "price-high",
            "sqft-low",
            "sqft-high",
            "newest",
            "oldest",
            "property-type"
          ]
        }
      }
    }
  }
}
```

#### System Prompt Updates
```typescript
// src/lib/chat-v2/system-prompt.ts
"When users request sorting (e.g., 'show cheapest first', 'best value per sqft'),
use the sort parameter:
- 'cheapest' or 'lowest price' → sort: 'price-low'
- 'most expensive' or 'luxury' → sort: 'price-high'
- 'best value' or 'best deal' → sort: 'sqft-low'
- 'just listed' or 'newest' → sort: 'newest'
- 'group by type' → sort: 'property-type'

Default: price-low for most queries"
```

#### Frontend Components
```tsx
// Add sort dropdown to ListingCarousel, ListingListView
<select
  value={sortOption}
  onChange={(e) => setSortOption(e.target.value)}
>
  <option value="price-low">Price: Low to High</option>
  <option value="price-high">Price: High to Low</option>
  <option value="sqft-low">Best Value ($/sqft)</option>
  <option value="sqft-high">Premium ($/sqft)</option>
  <option value="newest">Newest Listed</option>
  <option value="property-type">Group by Type</option>
</select>
```

---

## Example User Queries

### Natural Language → Sort Parameter

| User Query | Sort Parameter |
|------------|---------------|
| "Show me the cheapest homes in La Quinta" | `price-low` |
| "What are the most expensive properties?" | `price-high` |
| "Find me the best value homes" | `sqft-low` |
| "Show me luxury listings" | `price-high` |
| "What just hit the market?" | `newest` |
| "Show all condos together, then single family homes" | `property-type` |
| "Which homes are priced to sell? (long time on market)" | `oldest` |

---

## Response Format Changes

### Add Sort Info to Response
```json
{
  "listings": [...],
  "stats": {...},
  "sorting": {
    "appliedSort": "price-low",
    "availableOptions": [
      { "value": "price-low", "label": "Price: Low to High" },
      { "value": "price-high", "label": "Price: High to Low" },
      { "value": "sqft-low", "label": "Best Value ($/sqft)" },
      { "value": "sqft-high", "label": "Premium ($/sqft)" },
      { "value": "newest", "label": "Newest Listed" },
      { "value": "oldest", "label": "Longest on Market" },
      { "value": "property-type", "label": "Group by Property Type" }
    ]
  }
}
```

---

## Testing Strategy

### Manual API Tests
```bash
# Price low to high
curl "/api/cities/la-quinta/listings?limit=10&sort=price-low"

# Price high to low
curl "/api/cities/la-quinta/listings?limit=10&sort=price-high"

# Best value per sqft
curl "/api/cities/la-quinta/listings?limit=10&sort=sqft-low"

# Newest listings
curl "/api/cities/la-quinta/listings?limit=10&sort=newest"

# Group by property type
curl "/api/cities/la-quinta/listings?limit=20&sort=property-type"
```

### Verification
- [ ] First listing should be cheapest (price-low)
- [ ] First listing should be most expensive (price-high)
- [ ] First listing should have lowest $/sqft (sqft-low)
- [ ] First listing should have most recent onMarketDate (newest)
- [ ] Listings grouped by propertySubType (property-type)

### Chat Integration Tests
```bash
curl POST /api/chat-v2 -d '{
  "messages": [{
    "role": "user",
    "content": "show me the cheapest homes in la quinta"
  }]
}'
# Should include sort: "price-low" in searchParams
```

---

## Performance Considerations

### Sorting with Aggregation (sqft sorting)
- More CPU intensive than simple sorting
- May need to adjust limit/pagination strategy
- Consider adding computed field to database if used frequently

### Indexing
Ensure indexes exist for common sort fields:
```javascript
// In create-indexes.ts
{
  city: 1,
  standardStatus: 1,
  propertyType: 1,
  listPrice: 1,  // For price sorting
  onMarketDate: -1,  // For date sorting
  propertySubType: 1  // For type grouping
}
```

---

## Migration Plan

### Phase 1: Backend Only (15-20 min)
1. Add sort parameter handling to cities endpoint
2. Add sort parameter handling to subdivisions endpoint
3. Test all sort options via curl

### Phase 2: Chat Integration (20-30 min)
1. Update searchHomes tool definition
2. Update system prompt with sort guidance
3. Test chat with sorting queries

### Phase 3: Frontend UI (30-45 min)
1. Add sort dropdown to ListingCarousel
2. Add sort dropdown to ListingListView
3. Wire up to API calls
4. Test user interaction

### Phase 4: Documentation (15 min)
1. Update API documentation
2. Add sort examples to README
3. Document available options

**Total Estimated Time**: 1.5 - 2 hours

---

## Success Metrics

### Immediate
- [ ] All 7 sort options work correctly
- [ ] Backwards compatible (no ?sort still works)
- [ ] Chat AI understands sort requests
- [ ] Results properly ordered for each option

### Long-term
- [ ] User feedback: Sorting improves experience
- [ ] Analytics: Sort usage patterns
- [ ] Performance: No degradation with sorting

---

## Future Enhancements

### Phase 2 Features
- **Multi-level sorting**: "Sort by property type, then price low-to-high"
- **Custom sorting**: Save user preferences
- **Smart sorting**: AI suggests best sort based on query
- **Sort by distance**: From a specific location

### Additional Sort Options
- `beds-high`: Most bedrooms first
- `sqft-high`: Largest homes first
- `lot-size-high`: Biggest lots first
- `year-new`: Newest construction first
- `hoa-low`: Lowest HOA fees first

---

## Implementation Notes

### Handling Missing Data
```typescript
// Properties without livingArea
if (sortParam.includes("sqft")) {
  // Put at end of results or filter out?
  // Decision: Put at end with 999999 placeholder
}

// Properties without onMarketDate
if (sortParam.includes("newest") || sortParam === "oldest") {
  // Use modificationTimestamp as fallback
}
```

### Property Type Sorting Details
When `sort=property-type`:
```
Results order:
1. All Condominiums (sorted by price low-to-high)
2. All Single Family Residences (sorted by price low-to-high)
3. All Townhouses (sorted by price low-to-high)
```

This groups similar properties together for easy comparison.

---

## Related Documents
- [CITY_LISTINGS_FILTERING_DEEP_DIVE.md](./CITY_LISTINGS_FILTERING_DEEP_DIVE.md)
- [COMPREHENSIVE_FILTERING_SYSTEM.md](./COMPREHENSIVE_FILTERING_SYSTEM.md)
- [README.md](./README.md)

---

**Status**: Ready to implement Phase 1
**Next Steps**: Implement sorting in cities endpoint, test, then subdivisions
