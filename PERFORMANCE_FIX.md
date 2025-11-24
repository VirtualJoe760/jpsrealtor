# Chat Performance Fix - Subdivision Queries

## Problem

Chat responses for subdivision queries (e.g., "show me homes in Palm Desert Country Club") were taking **way too long** to populate results.

### Root Cause Analysis

Looking at the server logs, the issue was:

1. ✅ AI successfully matched "Palm Desert Country Club" via `matchLocation()` (fast - ~1s)
2. ❌ AI then called `searchListings()` with subdivision filter (SLOW - 30+ seconds)
3. ❌ AI got stuck on iteration 3/5 and appeared to hang

### Why `searchListings()` is Slow for Subdivisions

The `searchListings()` endpoint (`/api/chat/search-listings`):
- Searches across **ALL** MLS listings (both GPS and CRMLS)
- Uses complex regex queries for subdivision name matching
- Has multiple filters and conditions
- No database indexes optimized for subdivision searches

### Why `getSubdivisionListings()` is Fast

The `getSubdivisionListings()` endpoint (`/api/subdivisions/[slug]/listings`):
- Uses direct slug lookup (indexed)
- Only queries listings for that specific subdivision
- Pre-optimized queries
- Returns results in ~300ms vs 30+ seconds

## Solution

### 1. Updated System Prompt

Modified `src/app/api/chat/stream/route.ts` to explicitly instruct the AI:

```typescript
# Critical Rules
1. **ALWAYS call matchLocation() FIRST** when user mentions a location
2. **If matchLocation returns type="subdivision"**: IMMEDIATELY call getSubdivisionListings() with the slug
   - DO NOT use searchListings() for subdivision queries
   - getSubdivisionListings() is faster and more accurate
3. **If matchLocation returns type="city"**: Use searchListings() with city filter
4. **If matchLocation returns type="county"**: Use searchListings() with limit:100
```

### 2. Standardized Slugs

As part of the earlier work, we standardized subdivision slugs to remove city suffixes:
- Old: `palm-desert-country-club-palm-desert`
- New: `palm-desert-country-club`

This makes slug matching cleaner and faster.

## Expected Performance

### Before Fix
```
Query: "Show me homes in Palm Desert Country Club"
├─ matchLocation() ...................... 1s
├─ searchListings(subdivisions:[...]) ... 30s+ (SLOW!)
└─ Response hung/timeout
Total: TIMEOUT
```

### After Fix
```
Query: "Show me homes in Palm Desert Country Club"
├─ matchLocation() ...................... 1s
├─ getSubdivisionListings(slug:...) ..... 0.3s (FAST!)
└─ AI formats response .................. 1s
Total: ~2-3 seconds
```

## Function Selection Logic

| matchLocation Result | Function to Use | Reason |
|---------------------|-----------------|--------|
| `type="subdivision"` | `getSubdivisionListings()` | Direct slug lookup, fastest |
| `type="city"` | `searchListings()` | Need flexible city search |
| `type="county"` | `searchListings(limit:100)` | Large result set, limit required |

## Testing

To test the fix:

```bash
# 1. Restart dev server to pick up changes
npm run dev

# 2. Test chat with subdivision query
# In chat: "Show me homes in Palm Desert Country Club"

# 3. Monitor logs to verify getSubdivisionListings is called:
# Should see: "📞 Calling function: getSubdivisionListings"
# Should NOT see: "📞 Calling function: searchListings"
```

## Files Modified

1. `src/app/api/chat/stream/route.ts` - Updated system prompt with explicit function selection rules
2. `src/scripts/subdivisions/extract-subdivisions.ts` - Simplified slug generation
3. `src/app/api/subdivisions/[slug]/listings/route.ts` - Cleaned up slug matching

## Future Optimizations

If `searchListings()` is still slow for city/county searches:

1. Add database indexes for common query patterns
2. Implement result caching for popular searches
3. Add pagination to prevent large result sets
4. Consider materialized views for common aggregations
