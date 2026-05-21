# City Listings API - Deep Dive & Filtering Issues

**Date**: December 20, 2025
**Status**: 🔴 Critical Issues Identified
**Priority**: HIGH - Affecting user experience with invalid results

---

## Executive Summary

The cities listings API (`/api/cities/[cityId]/listings/route.ts`) is returning **LAND** listings and properties with **0 beds/0 baths** in home searches. This is caused by incomplete property type filtering compared to other endpoints in the codebase.

### Quick Stats from La Quinta Test
- **Total Listings**: 520
- **Land Listings (Type D)**: 37 properties with 0 beds/0 baths
- **Residential (Type A)**: 483 properties
- **Impact**: 7% of results are invalid for home searches

---

## Property Type System (MLS Standard)

Based on code analysis across multiple API endpoints:

| Code | Type | Description | Should Show in Home Search? |
|------|------|-------------|----------------------------|
| **A** | Residential | Houses, Condos, Townhomes | ✅ YES |
| **B** | Rental Lease | Rental properties | ❌ NO |
| **C** | Multifamily | Apartments, duplexes | ❌ NO (unless explicitly requested) |
| **D** | Land | Vacant lots, land parcels | ❌ NO |

**Source**: `/api/ai/cma/route.ts:73`, `/api/analytics/appreciation/route.ts:105`

---

## Current Implementation Analysis

### ✅ Subdivision Endpoint (Working Better)
**File**: `src/app/api/subdivisions/[slug]/listings/route.ts`

```javascript
const baseQuery: any = {
  standardStatus: "Active",
  propertyType: { $ne: "B" },  // Excludes rentals
  propertySubType: { $nin: ["Co-Ownership", "Timeshare"] },
};
```

**Issues**:
- ⚠️ Only excludes Type B (rentals)
- ⚠️ Still allows Type C (multifamily) and Type D (land)
- ✅ Includes standardStatus filter
- ✅ Excludes Co-Ownership/Timeshare

### ❌ Cities Endpoint (BROKEN)
**File**: `src/app/api/cities/[cityId]/listings/route.ts`

```javascript
const baseQuery: any = {
  city: { $regex: new RegExp(`^${cityName}$`, "i") },
  listPrice: { $exists: true, $ne: null, $gt: 0 },
  propertySubType: { $nin: ["Co-Ownership", "Timeshare"] },
};

// Filter by property type - DEFAULT to excluding rentals (Type B)
if (propertyType === "sale") {
  baseQuery.propertyType = { $ne: "B" };  // Only excludes rentals!
}
```

**Critical Issues**:
1. ❌ **Missing `standardStatus: "Active"` filter** - Could show sold/pending
2. ❌ **Only excludes Type B (rentals)** - Allows Type D (land) and Type C (multifamily)
3. ❌ **Conditional property type filter** - Only applied if `propertyType` param passed
4. ⚠️ **No default to Type A** - Should explicitly require residential

---

## Test Results - Actual Data

### Test Query: La Quinta with Price Filter
```bash
curl "http://localhost:3000/api/cities/la-quinta/listings?limit=100&minPrice=1"
```

### Results Breakdown

**Bed Counts**:
- 0 beds: **14 listings** ❌ (Land parcels)
- 1 bed: 23 listings ✅
- 2 beds: 38 listings ✅
- 3 beds: 21 listings ✅
- 4 beds: 4 listings ✅

**Property Types**:
- Type A (Residential): **87 listings** ✅
- Type D (Land): **13 listings** ❌

**Property SubTypes** (in stats aggregate):
- Single Family Residence: 361 ✅
- Condominium: 121 ✅
- Unknown: 37 ❌
- Townhouse: 1 ✅

### Sample Land Listing (Invalid Result)
```json
{
  "listingId": "219132909",
  "listPrice": 158000,
  "address": "0 Avenida Bermudas, La Quinta, CA 92253",
  "beds": 0,
  "baths": 0,
  "yearBuilt": null,
  "livingArea": null,
  "lotSize": 5227.2,
  "propertyType": "D",  // ❌ LAND
  "propertySubType": null
}
```

---

## Comparison with Other Endpoints

### ✅ CMA Endpoint (Reference Implementation)
**File**: `/api/ai/cma/route.ts:73`

```javascript
const query: any = {
  propertyType: "A",  // Residential only ✅
};
```

### ✅ Appreciation Endpoint (Reference Implementation)
**File**: `/api/analytics/appreciation/route.ts:105`

```javascript
// DEFAULT: Residential only (excludes B=Multi-Family, C=Land, D=Business Opportunity)
filters.propertyType = 'A';
```

### ✅ California Stats Endpoint (Reference Implementation)
**File**: `/api/california-stats/route.ts:36`

```javascript
{
  $match: {
    standardStatus: "Active",
    propertyType: "A"  // Residential sale only ✅
  }
}
```

---

## Root Cause Analysis

### Why This Happened

1. **Inconsistent Filtering Strategy**
   - Some endpoints use `propertyType: "A"` (explicit residential)
   - Others use `propertyType: { $ne: "B" }` (exclude rentals only)
   - No standardized base query across the codebase

2. **Missing `standardStatus` Filter**
   - Subdivisions has it ✅
   - Cities missing it ❌
   - Could show sold/expired/withdrawn listings

3. **Conditional vs. Default Filtering**
   - Cities only filters if `propertyType` param provided
   - Should **always** default to residential (Type A)

4. **Incomplete Migration**
   - Co-Ownership filter was added recently (Dec 20)
   - But core property type filtering wasn't reviewed

---

## Impact on User Experience

### Current Issues Users See

1. **Land Listings in Home Searches**
   ```
   User: "show me homes in la quinta"
   AI: Shows 37 land parcels with 0 beds/0 baths ❌
   ```

2. **Confusing Stats**
   ```
   Stats show:
   - Average Price: $1,977,575 (inflated by land values)
   - "Unknown" property types in breakdown
   ```

3. **Wasted API Bandwidth**
   - Fetching and processing invalid results
   - Larger payloads, slower responses

4. **Poor Data Quality**
   - Frontend components expect beds/baths
   - Land listings have null/0 values
   - Could cause UI rendering issues

---

## Action Plan

### Phase 1: Fix Cities Endpoint (CRITICAL) 🔴

**Objective**: Match subdivisions endpoint + add proper residential filtering

**Changes Required**:

1. **Add `standardStatus` filter** to baseQuery
   ```javascript
   const baseQuery: any = {
     city: { $regex: new RegExp(`^${cityName}$`, "i") },
     standardStatus: "Active",  // NEW ✅
     propertyType: "A",  // NEW: Explicit residential only ✅
     propertySubType: { $nin: ["Co-Ownership", "Timeshare"] },
     listPrice: { $exists: true, $ne: null, $gt: 0 },
   };
   ```

2. **Remove conditional propertyType logic**
   ```javascript
   // DELETE THESE LINES:
   if (propertyType === "sale") {
     baseQuery.propertyType = { $ne: "B" };
   } else if (propertyType === "rental") {
     baseQuery.propertyType = "B";
   }
   // Property type is now fixed to "A" (residential)
   ```

3. **Update `propertyType` parameter handling**
   - Remove from URL params (or make it no-op)
   - Always filter to Type A residential
   - Document in API comments

**Files to Modify**:
- `src/app/api/cities/[cityId]/listings/route.ts`

**Estimated Time**: 15 minutes

---

### Phase 2: Fix Subdivisions Endpoint (MEDIUM) 🟡

**Objective**: Upgrade from `$ne: "B"` to explicit `"A"`

**Changes Required**:

```javascript
const baseQuery: any = {
  standardStatus: "Active",
  propertyType: "A",  // CHANGED: Explicit residential ✅
  propertySubType: { $nin: ["Co-Ownership", "Timeshare"] },
};
```

**Files to Modify**:
- `src/app/api/subdivisions/[slug]/listings/route.ts`

**Estimated Time**: 10 minutes

---

### Phase 3: Standardize Base Query Across Codebase (LOW) 🟢

**Objective**: Create reusable filter function for consistency

**Proposal**: Create shared filter utility

```typescript
// src/lib/filters/listing-filters.ts
export function getResidentialSaleBaseQuery() {
  return {
    standardStatus: "Active",
    propertyType: "A",  // Residential only
    propertySubType: { $nin: ["Co-Ownership", "Timeshare"] },
  };
}
```

**Usage**:
```typescript
import { getResidentialSaleBaseQuery } from "@/lib/filters/listing-filters";

const baseQuery = {
  ...getResidentialSaleBaseQuery(),
  city: cityName,
  listPrice: { $exists: true, $ne: null, $gt: 0 },
};
```

**Files to Update**:
- `src/app/api/cities/[cityId]/listings/route.ts`
- `src/app/api/subdivisions/[slug]/listings/route.ts`
- Any other listing query endpoints

**Estimated Time**: 1 hour

---

### Phase 4: Add Tests (MEDIUM) 🟡

**Objective**: Prevent regression

**Test Cases**:

1. **No Land Listings**
   ```javascript
   test('cities endpoint excludes land listings', async () => {
     const response = await fetch('/api/cities/la-quinta/listings?limit=100');
     const { listings } = await response.json();

     const landListings = listings.filter(l => l.propertyType === 'D');
     expect(landListings).toHaveLength(0);
   });
   ```

2. **All Listings Have Beds/Baths**
   ```javascript
   test('all listings have bed and bath counts', async () => {
     const response = await fetch('/api/cities/la-quinta/listings?limit=100');
     const { listings } = await response.json();

     listings.forEach(listing => {
       expect(listing.beds).toBeGreaterThan(0);
       expect(listing.baths).toBeGreaterThan(0);
     });
   });
   ```

3. **Only Active Listings**
   ```javascript
   test('only returns active listings', async () => {
     const response = await fetch('/api/cities/la-quinta/listings?limit=100');
     const { listings } = await response.json();

     // Query database directly to verify
     const listingKeys = listings.map(l => l.listingKey);
     const dbListings = await UnifiedListing.find({
       listingKey: { $in: listingKeys }
     });

     dbListings.forEach(listing => {
       expect(listing.standardStatus).toBe('Active');
     });
   });
   ```

**Estimated Time**: 2 hours

---

## Expected Results After Fixes

### Before (Current State)
```bash
curl "/api/cities/la-quinta/listings?limit=100&minPrice=1"

Results:
- Total: 520 listings
- Type A (Residential): 483 (93%)
- Type D (Land): 37 (7%) ❌
- 0 beds/0 baths: 14 listings ❌
```

### After (Expected State)
```bash
curl "/api/cities/la-quinta/listings?limit=100&minPrice=1"

Results:
- Total: 483 listings
- Type A (Residential): 483 (100%) ✅
- Type D (Land): 0 (0%) ✅
- 0 beds/0 baths: 0 listings ✅
- All listings have valid bed/bath counts ✅
```

---

## Additional Considerations

### Database Indexes
Ensure proper indexing for the new query:

```javascript
// Compound index for city queries
{
  city: 1,
  standardStatus: 1,
  propertyType: 1,
  propertySubType: 1,
  listPrice: 1
}
```

**Check if this exists in**: `src/scripts/database/create-indexes.ts`

### Frontend Impact
**Components to Test**:
- `src/app/components/chat/ListingCarousel.tsx`
- `src/app/components/chat/ListingListView.tsx`
- `src/app/components/mls/ListingClient.tsx`

**Expected Behavior**:
- No more "0 beds, 0 baths" listings
- All listings should have valid property data
- Stats should be more accurate (no land price inflation)

### Chat AI System Prompt
Update system prompt to clarify filtering:

```typescript
// src/lib/chat-v2/system-prompt.ts
"When searching for homes, you will only receive RESIDENTIAL properties
(Type A: houses, condos, townhomes). Land parcels, rentals, and commercial
properties are automatically filtered out."
```

---

## Success Metrics

### Immediate Verification (After Phase 1)
- [ ] No propertyType "D" in any city query results
- [ ] No listings with 0 beds AND 0 baths
- [ ] All listings have `standardStatus: "Active"`
- [ ] Property type stats don't show "Unknown"

### Long-term Monitoring
- [ ] User feedback: No complaints about land listings
- [ ] Analytics: Average price per sqft more accurate
- [ ] Performance: Query time unchanged (proper indexes)

---

## Timeline

| Phase | Description | Time | Priority |
|-------|-------------|------|----------|
| 1 | Fix Cities Endpoint | 15 min | 🔴 CRITICAL |
| 2 | Fix Subdivisions Endpoint | 10 min | 🟡 MEDIUM |
| 3 | Standardize Base Query | 1 hour | 🟢 LOW |
| 4 | Add Tests | 2 hours | 🟡 MEDIUM |

**Total Estimated Time**: 3 hours 25 minutes

**Recommended Approach**: Execute Phase 1 immediately, test thoroughly, then proceed with Phase 2.

---

## Appendix: Related Issues

### Previously Fixed (Dec 20, 2025)
- ✅ Co-Ownership properties filtering
- ✅ Bath field mapping (`bathroomsTotalDecimal`)
- ✅ Chat streaming 400 errors

### Still Outstanding
- 🔴 Land listings (this document)
- 🟡 Explicit propertyType "A" requirement
- 🟡 Missing standardStatus filter

---

**Document Status**: Complete
**Next Steps**: Implement Phase 1 fixes immediately
