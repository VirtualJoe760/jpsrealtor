# Unified MLS Migration Plan

**Status:** Ready for Implementation
**Date:** December 3, 2025
**Total Files to Migrate:** 13 API routes + 7 frontend components
**Deprecated Files to Remove:** 2 models + 1 API route

---

## Executive Summary

This document outlines the complete migration from dual-collection MLS system (GPS + CRMLS) to the unified_listings collection containing all 8 MLS associations (79,064 listings).

### Current State
- **Database:** 2 separate collections (`gps_listings`, `crmls_listings`)
- **API Routes:** Query both collections in parallel, merge results
- **Limitations:** Only 2 of 8 MLS associations, complex query logic, slower performance

### Future State
- **Database:** 1 unified collection (`unified_listings`) with 78,904 listings
- **API Routes:** Single query to unified collection
- **Benefits:** All 8 MLSs, simpler queries, better performance, geospatial ready for CMA

---

## Deep Dive Analysis

### Phase 1: MLS Listing Dependencies (Completed)

#### A. API Routes That Query MLS Data

**1. `/api/mls-listings/route.ts` (PRIMARY - Most Complex)**
- **Current Behavior:**
  - Queries GPS + CRMLS collections in parallel
  - Merges results, applies sorting/pagination
  - Handles 40+ filter parameters
  - Joins with photos and open houses
- **Complexity:** HIGH
- **Impact:** Used by map, swipe feature, search
- **Migration Strategy:** Replace dual-query with single UnifiedListing query
- **File:** `src/app/api/mls-listings/route.ts` (378 lines)

**2. `/api/cities/[cityId]/listings/route.ts`**
- **Current Behavior:**
  - Fetches GPS + CRMLS by city name
  - Applies price/bed/bath filters
  - Returns with photos
- **Complexity:** MEDIUM
- **Impact:** City detail pages
- **Migration Strategy:** Replace with unified query filtered by city
- **File:** `src/app/api/cities/[cityId]/listings/route.ts` (246 lines)

**3. `/api/subdivisions/[slug]/listings/route.ts`**
- **Current Behavior:**
  - Queries GPS + CRMLS by subdivision name
  - Handles "Non-HOA" special case
  - Pagination support
- **Complexity:** MEDIUM
- **Impact:** Subdivision detail pages
- **Migration Strategy:** Replace with unified query filtered by subdivisionName
- **File:** `src/app/api/subdivisions/[slug]/listings/route.ts` (273 lines)

**4. `/api/cities/[cityId]/stats/route.ts`**
- **Current Behavior:** Calculates price stats from GPS + CRMLS
- **Complexity:** LOW
- **Impact:** City statistics
- **Migration Strategy:** Calculate from unified_listings
- **File:** `src/app/api/cities/[cityId]/stats/route.ts`

**5. `/api/subdivisions/[slug]/stats/route.ts`**
- **Current Behavior:** Calculates subdivision stats from GPS + CRMLS
- **Complexity:** LOW
- **Impact:** Subdivision statistics
- **Migration Strategy:** Calculate from unified_listings
- **File:** `src/app/api/subdivisions/[slug]/stats/route.ts`

**6. `/api/mls-listings/[slugAddress]/route.ts`**
- **Current Behavior:** Gets single listing by slugAddress
- **Complexity:** MEDIUM
- **Impact:** Property detail pages
- **Migration Strategy:** Query unified_listings by slugAddress
- **File:** `src/app/api/mls-listings/[slugAddress]/route.ts`

#### B. AI Tools That Search Listings

**7. `/api/chat/match-location/route.ts` (matchLocation)**
- **Current Behavior:** Searches GPS + CRMLS by subdivision/location
- **Complexity:** MEDIUM
- **Impact:** AI chat location matching
- **Migration Strategy:** Query unified_listings with subdivision filter
- **File:** `src/app/api/chat/match-location/route.ts`

**8. `/api/chat/search-city/route.ts` (searchCity)**
- **Current Behavior:** Searches GPS + CRMLS by city
- **Complexity:** MEDIUM
- **Impact:** AI chat city searches
- **Migration Strategy:** Query unified_listings with city filter
- **File:** `src/app/api/chat/search-city/route.ts`

#### C. Frontend Components

**9. `src/lib/api.ts` (getListingsWithCoords)**
- **Current Behavior:** Fetches from `/api/mls-listings`
- **Complexity:** LOW
- **Impact:** Map system
- **Migration Strategy:** No changes needed (uses API route)
- **File:** `src/lib/api.ts` (44 lines)

**10. Map Components**
- `src/app/utils/map/useListings.ts`
- `src/app/utils/map/useSwipeQueue.ts`
- `src/app/components/mls/MLSProvider.tsx`
- `src/app/components/mls/map/MapPageClient.tsx`
- **Impact:** All use `/api/mls-listings` endpoint
- **Migration Strategy:** No changes (consume API)

**11. Property Detail Pages**
- `src/app/mls-listings/[slugAddress]/page.tsx`
- `src/app/mls-listings/[slugAddress]/map/page.tsx`
- **Impact:** Individual listing display
- **Migration Strategy:** No changes (consume API)

#### D. Models to Deprecate

**12. `src/models/listings.ts` (GPS Model)**
- **Collection:** `gps_listings`
- **Status:** DEPRECATED after migration
- **Keep Until:** Testing complete

**13. `src/models/crmls-listings.ts` (CRMLS Model)**
- **Collection:** `crmls_listings`
- **Status:** DEPRECATED after migration
- **Keep Until:** Testing complete

---

## Implementation Plan

### Phase 2: Migration Strategy

#### Step 1: Update Main Listings API (CRITICAL PATH)
**File:** `src/app/api/mls-listings/route.ts`

**Changes:**
1. Replace `import { Listing } from "@/models/listings"` with `import UnifiedListing from "@/models/unified-listing"`
2. Remove `import { CRMLSListing }`
3. Remove parallel GPS/CRMLS queries (lines 300-340)
4. Replace with single `UnifiedListing.find()` query
5. Remove merge logic (lines 340-348)
6. Update totalCount calculation
7. Keep all 40+ filter parameters (compatible with unified schema)

**Benefits:**
- Simpler code (~100 lines removed)
- Faster queries (single DB call)
- Access to all 8 MLSs
- Geospatial index support

#### Step 2: Update City Listings API
**File:** `src/app/api/cities/[cityId]/listings/route.ts`

**Changes:**
1. Import UnifiedListing instead of Listing + CRMLSListing
2. Remove parallel queries (lines 100-131)
3. Single query: `UnifiedListing.find({ city: cityName, ...filters })`
4. Remove mlsSource assignment (already in documents)
5. Simplify photo lookup (same logic)

**Benefits:**
- Cleaner code (~50 lines removed)
- Consistent data structure
- Support for all MLS sources

#### Step 3: Update Subdivision Listings API
**File:** `src/app/api/subdivisions/[slug]/listings/route.ts`

**Changes:**
1. Import UnifiedListing
2. Remove GPS/CRMLS conditional logic (lines 85-157)
3. Single query with subdivision filter
4. Remove mlsSources check (query all)

**Benefits:**
- Simplified subdivision matching
- Support for all 8 MLSs
- Cleaner code

#### Step 4: Update Stats APIs
**Files:**
- `src/app/api/cities/[cityId]/stats/route.ts`
- `src/app/api/subdivisions/[slug]/stats/route.ts`

**Changes:**
1. Import UnifiedListing
2. Remove parallel aggregations
3. Single aggregation pipeline

**Benefits:**
- Accurate stats across all MLSs
- Simpler aggregation logic

#### Step 5: Update Single Listing API
**File:** `src/app/api/mls-listings/[slugAddress]/route.ts`

**Changes:**
1. Import UnifiedListing
2. Remove GPS/CRMLS fallback logic
3. Single query by slugAddress

**Benefits:**
- Single lookup
- Works across all MLSs

#### Step 6: Update AI Tools
**Files:**
- `src/app/api/chat/match-location/route.ts`
- `src/app/api/chat/search-city/route.ts`

**Changes:**
1. Import UnifiedListing
2. Remove dual-collection queries
3. Use unified query with appropriate filters

**Benefits:**
- AI can search across all 8 MLSs
- More accurate location matching
- Simpler tool logic

#### Step 7: Frontend - No Changes Required
**Reason:** Frontend consumes API routes, which will return same structure

**Files that remain unchanged:**
- `src/lib/api.ts`
- `src/app/utils/map/*.ts`
- `src/app/components/mls/**`
- `src/app/mls-listings/**`

---

## Testing Plan

### Phase 3: Comprehensive Testing

#### Test 1: Main Listings API
```bash
# Test basic query
curl "http://localhost:3000/api/mls-listings?limit=10"

# Test with filters
curl "http://localhost:3000/api/mls-listings?city=Palm+Springs&minPrice=500000&beds=3"

# Test radius search
curl "http://localhost:3000/api/mls-listings?lat=33.8303&lng=-116.5453&radius=5"

# Test exclude keys (swipe)
curl "http://localhost:3000/api/mls-listings?excludeKeys=key1,key2"
```

#### Test 2: City Listings
```bash
curl "http://localhost:3000/api/cities/palm-springs/listings?limit=20"
curl "http://localhost:3000/api/cities/la-quinta/listings?propertyType=sale&minBeds=2"
```

#### Test 3: Subdivision Listings
```bash
curl "http://localhost:3000/api/subdivisions/pga-west/listings"
curl "http://localhost:3000/api/subdivisions/palm-desert-country-club/listings"
```

#### Test 4: Stats APIs
```bash
curl "http://localhost:3000/api/cities/palm-desert/stats"
curl "http://localhost:3000/api/subdivisions/indian-wells-country-club/stats"
```

#### Test 5: AI Tools
```bash
# Test in AI chat interface
- "Show me homes in Palm Springs"
- "Find properties in PGA West"
- "What's available in Indian Wells?"
```

#### Test 6: Frontend Components
1. Navigate to map page - verify listings load
2. Use swipe feature - verify exclude works
3. Click on property - verify detail page loads
4. Test city page - verify listings appear
5. Test subdivision page - verify listings appear

---

## Cleanup Plan

### Phase 4: Deprecate Old Code (After Testing Complete)

#### Files to Remove

**1. Old Model Files**
```
src/models/listings.ts          # GPS MLS model (DELETE)
src/models/crmls-listings.ts    # CRMLS model (DELETE)
```

**2. Old Collections (MongoDB - Manual)**
```
gps_listings      # Can be dropped after backup
crmls_listings    # Can be dropped after backup
```

**Note:** Keep old collections for 30 days as backup before deletion

#### Code to Remove from Remaining Files

**From `src/app/api/mls-listings/route.ts`:**
- Remove import statements for old models
- Remove parallel query logic
- Remove merge/sort logic

**Estimated LOC Reduction:** ~150 lines removed from this file alone

#### Files That Can Remain As-Is
- Frontend components (no changes needed)
- Photo/OpenHouse models (still used)
- Helper utilities

---

## Rollback Plan

### Emergency Rollback Procedure

If critical issues discovered after migration:

**Step 1: Revert API Routes**
```bash
git revert <migration-commit-hash>
```

**Step 2: Verify Old Collections Still Exist**
- Check MongoDB for `gps_listings` and `crmls_listings`
- Ensure data integrity

**Step 3: Redeploy**
```bash
npm run build
# Deploy to production
```

**Step 4: Monitor**
- Check error logs
- Verify listings load correctly
- Test map/swipe features

**Time to Rollback:** ~5 minutes

---

## Migration Checklist

### Pre-Migration
- [ ] Verify unified_listings has 78,904+ documents
- [ ] Verify all 7 indexes created
- [ ] Backup existing gps_listings collection
- [ ] Backup existing crmls_listings collection
- [ ] Document current API response times (baseline)

### Migration
- [ ] Migrate /api/mls-listings route
- [ ] Migrate /api/cities/[cityId]/listings route
- [ ] Migrate /api/subdivisions/[slug]/listings route
- [ ] Migrate /api/cities/[cityId]/stats route
- [ ] Migrate /api/subdivisions/[slug]/stats route
- [ ] Migrate /api/mls-listings/[slugAddress] route
- [ ] Migrate AI tools (matchLocation, searchCity)

### Testing
- [ ] Test main listings API (10+ test cases)
- [ ] Test city listings (5+ cities)
- [ ] Test subdivision listings (5+ subdivisions)
- [ ] Test stats endpoints
- [ ] Test AI chat functionality
- [ ] Test map functionality
- [ ] Test swipe feature
- [ ] Test property detail pages
- [ ] Compare API response times (should be faster)
- [ ] Verify data accuracy (spot check 50 listings)

### Post-Migration
- [ ] Monitor error logs for 24 hours
- [ ] Check performance metrics
- [ ] Verify all 8 MLSs represented in results
- [ ] User acceptance testing
- [ ] Mark old models as deprecated (comments)
- [ ] Schedule old collection cleanup (30 days)

### Cleanup (After 30 Days)
- [ ] Delete src/models/listings.ts
- [ ] Delete src/models/crmls-listings.ts
- [ ] Drop gps_listings MongoDB collection
- [ ] Drop crmls_listings MongoDB collection
- [ ] Update documentation
- [ ] Archive migration plan

---

## Success Metrics

### Performance Targets
- **Query Speed:** 30-50% faster (single query vs parallel)
- **Code Complexity:** ~200 LOC removed
- **MLS Coverage:** 8/8 associations (vs 2/8)
- **Geospatial Ready:** 95.5% of listings have coordinates

### Quality Metrics
- **Zero Regression Bugs:** No existing features broken
- **Data Accuracy:** 100% match with source data
- **Error Rate:** <0.1% API errors
- **Uptime:** 99.9% during migration window

---

## Risk Assessment

### High Risk
- **Main listings API:** Used by map, search, swipe
  - **Mitigation:** Thorough testing, gradual rollout
  - **Rollback:** 5 minutes

### Medium Risk
- **AI tools:** Chat functionality
  - **Mitigation:** Test with real queries
  - **Rollback:** Easy (isolated endpoints)

### Low Risk
- **Frontend components:** No changes required
  - **Mitigation:** N/A (consuming APIs only)

---

## Timeline Estimate

| Phase | Tasks | Duration |
|-------|-------|----------|
| **Migration** | Update 7 API routes | 2-3 hours |
| **Testing** | Comprehensive test suite | 1-2 hours |
| **Monitoring** | Watch for issues | 24 hours |
| **Cleanup** | Remove deprecated code | 30 minutes |
| **Total** | End-to-end | ~1 day active + 30 days monitoring |

---

## Next Steps

1. **Get User Approval** on this migration plan
2. **Begin Phase 2:** Start with `/api/mls-listings` route (highest impact)
3. **Iterate:** Migrate one route at a time, test thoroughly
4. **Deploy:** Gradual rollout with monitoring
5. **Cleanup:** Remove deprecated code after stable period

---

## Appendix: API Response Format Comparison

### Before (Dual Collection)
```json
{
  "listings": [...],
  "totalCount": {
    "gps": 5140,
    "crmls": 48390,
    "total": 53530
  }
}
```

### After (Unified)
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 78904,
    "limit": 20,
    "skip": 0,
    "hasMore": true
  }
}
```

**Note:** Frontend adapters may be needed if response format changes significantly.

---

**End of Migration Plan**
