# City Listings Bed/Bath Display Fix

**Date**: December 30, 2024
**Status**: Fixed
**Priority**: High
**Impact**: All city listings were showing "0 bd 0 ba"

---

## Problem Summary

City listings in the chat interface were displaying "0 bd 0 ba" for all properties, even though the database contained the correct bed/bath counts. This affected the search experience and made it appear that no properties matched user criteria.

Additionally, city queries were extremely slow (20+ seconds) making the search experience poor.

---

## Root Causes

### Issue 1: Field Name Mismatch (API Response vs Frontend)

**The Problem:**
- City API correctly fetched `bedsTotal` and `bathsTotal` from database
- City API mapped them to simplified response field names: `beds` and `baths`
- ChatResultsContainer was only checking for `listing.bedsTotal` and `listing.bathsTotal`
- Since the city API returns `beds`/`baths` instead, the frontend couldn't find the values

**Example:**
```typescript
// API returns:
{
  beds: 3,
  baths: 5
}

// Frontend was checking:
beds: listing.bedsTotal || 0  // ❌ undefined, defaults to 0
baths: listing.bathsTotal || 0  // ❌ undefined, defaults to 0
```

### Issue 2: Query Performance (20s → 200ms)

**The Problem:**
- City API was using case-insensitive regex for city matching: `{ $regex: new RegExp(cityName, "i") }`
- This prevented MongoDB from using indexes
- Queries took 20+ seconds

**Root Cause:**
City names in the database are stored in Title Case (e.g., "Indian Wells"), so exact matching works fine and allows index usage.

### Issue 3: React Hydration Mismatch

**The Problem:**
- `MapStateContext.tsx` initialized `isMapVisible` differently on server vs client
- Server: always `false`
- Client: read from `sessionStorage` (could be `true`)
- This caused HTML mismatch errors

---

## Solutions Implemented

### Fix 1: ChatResultsContainer Field Mapping

**File**: `src/app/components/chat/ChatResultsContainer.tsx`

**Changes**:
```typescript
// BEFORE:
beds: listing.bedsTotal || 0,
baths: listing.bathsTotal || listing.bathroomsTotalDecimal || listing.bathroomsTotalInteger || 0,

// AFTER (check both field name formats):
beds: listing.beds || listing.bedsTotal || 0,
baths: listing.baths || listing.bathsTotal || listing.bathroomsTotalDecimal || listing.bathroomsTotalInteger || 0,

// Also updated additional fields:
bedsTotal: listing.beds || listing.bedsTotal,
bathsTotal: listing.baths || listing.bathsTotal,
```

**Why This Works:**
- Checks for simplified names first (`beds`, `baths`) - used by city API
- Falls back to database field names (`bedsTotal`, `bathsTotal`) - used by other APIs
- Makes ChatResultsContainer compatible with all API response formats

**Commits**:
- `2053b481` - Fix: ChatResultsContainer field mapping for city API responses

### Fix 2: Query Performance Optimization

**File**: `src/app/api/cities/[cityId]/listings/route.ts`

**Changes**:
```typescript
// BEFORE (slow - no index usage):
city: { $regex: new RegExp(`^${cityName}$`, "i") }

// AFTER (fast - uses index):
city: cityName  // Exact match - uses compound index
```

**Performance Improvement:**
- Before: 20+ seconds (compile: 2.3s, render: 17.7s)
- After: 200ms (90% faster)

**Why This Works:**
- City names are stored in Title Case in the database
- Exact match allows MongoDB to use the compound index: `{ city: 1, standardStatus: 1, propertyType: 1, bedsTotal: 1 }`
- No need for case-insensitive matching

**Note**: City names are already normalized to Title Case during data ingestion.

### Fix 3: Hydration Mismatch

**File**: `src/app/contexts/MapStateContext.tsx`

**Changes**:
```typescript
// BEFORE (inconsistent initialization):
const [isMapVisible, setIsMapVisible] = useState(() => {
  if (typeof window === 'undefined') return false;  // Server: false
  return sessionStorage.getItem('mapVisible') === 'true';  // Client: could be true
});

// AFTER (consistent initialization):
const [isMapVisible, setIsMapVisible] = useState(false);  // Always false initially

// Read from sessionStorage AFTER mount (client-only)
React.useEffect(() => {
  try {
    const stored = sessionStorage.getItem('mapVisible');
    if (stored === 'true') {
      setIsMapVisible(true);
    }
  } catch {
    // Ignore sessionStorage errors
  }
}, []);
```

**Why This Works:**
- Server and client now render identical initial HTML (both start with `false`)
- sessionStorage is only read after mount in `useEffect`, which is client-only
- Prevents hydration mismatch errors

**Commits**:
- `89552fbf` - Fix: MapStateContext hydration mismatch

---

## Additional Cleanup

### Deprecated Field Names Removed

**Files Updated**:
- `src/app/api/search/route.ts`
- `src/app/api/mls-listings/route.ts`
- `src/app/api/subdivisions/[slug]/listings/route.ts`
- `src/app/api/subdivisions/[slug]/photos/route.ts`
- `src/app/api/map-clusters/route.ts`
- `src/app/api/cities/[cityId]/listings/route.ts`

**Changes**:
Removed references to non-existent fields:
- `bedroomsTotal` → Use `bedsTotal`
- `bathroomsFull` → Use `bathsTotal` or `bathroomsTotalInteger`

---

## Field Naming Conventions

### Database Fields (RESO Standard)
- `bedsTotal` - Total number of bedrooms
- `bathsTotal` - Total number of bathrooms (all types combined)
- `bathroomsTotalInteger` - Integer count of bathrooms
- `bathroomsTotalDecimal` - Decimal count (e.g., 3.5 for 3 full + 1 half)
- `livingArea` - Square footage

### API Response Fields

**City API** (`/api/cities/[cityId]/listings`):
- `beds` - Mapped from `bedsTotal`
- `baths` - Mapped from `bathsTotal`
- `livingArea` - Direct from database

**Other APIs** (MLS, Subdivisions, Search):
- `bedsTotal` - Direct from database
- `bathsTotal` - Direct from database
- `livingArea` - Direct from database

**Frontend Mapping** (ChatResultsContainer):
- Checks both formats for compatibility
- Primary display fields: `beds`, `baths`, `sqft`
- Additional fields preserved: `bedsTotal`, `bathsTotal`, `livingArea`

---

## Testing

### Manual Testing Performed
1. Search: "3 beds in Indian Wells"
   - ✅ Query completed in ~200ms
   - ✅ Listings display correct bed/bath counts
   - ✅ No hydration errors

2. Search: "4 beds in Palm Desert"
   - ✅ Fast response
   - ✅ Correct bed/bath counts displayed

3. Map interactions
   - ✅ No hydration mismatch errors
   - ✅ Map state persists correctly

### Debug Logging Added

Added comprehensive logging to `src/app/api/cities/[cityId]/listings/route.ts`:
```typescript
// Log database query results
console.log('[City API] First listing fields:', {
  listingId: results[0].listingId,
  bedsTotal: results[0].bedsTotal,
  bathsTotal: results[0].bathsTotal,
  bathroomsTotalDecimal: results[0].bathroomsTotalDecimal,
  bathroomsTotalInteger: results[0].bathroomsTotalInteger,
  livingArea: results[0].livingArea
});

// Log mapped response
console.log('[City API] First mapped listing:', {
  listingId: mapped.listingId,
  beds: mapped.beds,
  baths: mapped.baths,
  livingArea: mapped.livingArea,
  source_bedsTotal: listing.bedsTotal,
  source_bathsTotal: listing.bathsTotal
});
```

---

## Commits

1. `de9454dd` - Fix: City listings showing 0 bd 0 ba - incorrect field selection
2. `d301945c` - Fix: City listings response mapping for beds/baths
3. `97c676f6` - Debug: Add comprehensive logging for city listings bed/bath data
4. `2053b481` - Fix: ChatResultsContainer field mapping for city API responses
5. Earlier: MapStateContext hydration fix
6. Earlier: Query performance optimization (regex → exact match)

---

## Related Documentation

- [Unified MLS Architecture](../listings/UNIFIED_MLS_ARCHITECTURE.md) - Database schema and field definitions
- [Query Performance Optimization](../architecture/QUERY_PERFORMANCE_OPTIMIZATION.md) - Index usage and query optimization
- [Chat Architecture](../chat/ARCHITECTURE.md) - Chat system overview

---

## Lessons Learned

1. **Field Name Consistency**: Different APIs may return the same data with different field names. Frontend components should check multiple field name formats for robustness.

2. **MongoDB Index Usage**: Case-insensitive regex queries prevent index usage. Use exact matching when possible, especially for normalized data like city names.

3. **React Hydration**: State initialization must be identical on server and client. Use `useEffect` for client-only operations like reading from `sessionStorage`.

4. **Debug Logging**: Comprehensive logging at each transformation step is crucial for identifying where data is lost in complex pipelines.

5. **API Response Formats**: Document which APIs return which field names to prevent confusion. Consider standardizing response formats across all APIs.

---

## Future Improvements

1. **API Response Standardization**: Consider standardizing field names across all APIs to use the same format (either simplified like `beds`/`baths` or database names like `bedsTotal`/`bathsTotal`)

2. **TypeScript Types**: Add strict TypeScript interfaces for API responses to catch field name mismatches at compile time

3. **Remove Debug Logging**: Clean up debug console.log statements once the fix is confirmed stable in production

4. **Performance Monitoring**: Add performance monitoring to track query times and alert if queries exceed thresholds
