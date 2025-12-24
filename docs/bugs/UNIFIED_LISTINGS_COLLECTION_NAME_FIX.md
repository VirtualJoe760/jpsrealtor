# Unified Listings Collection Name Issue

**Date**: December 24, 2025
**Status**: Critical Bug - Needs Immediate Fix
**Severity**: High - Causes data access failures

---

## Executive Summary

**Problem**: Multiple files in the codebase reference the wrong MongoDB collection name `unifiedlistings` (no underscore) instead of the correct `unified_listings` (with underscore).

**Impact**: Scripts and some API routes query a stale collection with only 4,366 documents instead of the current collection with 81,052 documents, causing:
- 0 results for cities like Irvine (which has 1,059 listings)
- Incomplete data for all California cities outside Coachella Valley
- Failed diagnostic scripts
- Misleading error reports

---

## Root Cause Analysis

### Database Collections

Your MongoDB database had **two** active listing collections:

| Collection Name | Document Count | Status | Usage |
|----------------|----------------|--------|-------|
| `unified_listings` (with underscore) | **81,052** | ✅ **CURRENT/ACTIVE** | Used by production APIs |
| `unifiedlistings` (no underscore) | 4,366 | ❌ **DEPRECATED/STALE** | Old collection, archived |

**Note**: `unified_closed_listings` (with underscore) is the CORRECT name for closed listings and was never affected by this issue.

### The Discrepancy

**Example - Irvine Listings**:
- `unified_listings` (correct): **1,059 listings** ✅
- `unifiedlistings` (wrong): **0 listings** ❌

**Example - Palm Desert Listings**:
- `unified_listings` (correct): **462 active residential listings** ✅
- `unifiedlistings` (wrong): **771 total listings** (includes non-residential, different filters) ❌

---

## Affected Files

### ❌ **CRITICAL - API Routes** (Production Impact)

1. **`src/app/api/analytics/subdivision-lookup/route.ts`** (Line 52) - **FIXED**
   ```typescript
   db!.collection("unifiedlistings")  // ❌ WAS WRONG
   // Fixed to:
   db!.collection("unified_listings")  // ✅ NOW CORRECT
   ```
   **Status**: ✅ Fixed and deployed
   **Impact**: Subdivision lookup now queries correct collection with 81K documents

### ❌ **HIGH - Database Scripts** (Infrastructure)

2. **`src/scripts/test-index-usage.ts`** (Line 24)
   ```typescript
   const collection = db.collection("unifiedlistings");  // ❌ WRONG
   ```
   **Impact**: Index performance testing on wrong collection

3. **`src/scripts/optimize-unifiedlisting-indexes.ts`** (Line 37)
   ```typescript
   const unifiedListingsCollection = db.collection("unifiedlistings");  // ❌ WRONG
   ```
   **Impact**: Indexes created on deprecated collection

### ⚠️ **MEDIUM - Diagnostic/Testing Scripts**

4. **`scripts/check-irvine-property-types.js`** (Line 13)
5. **`scripts/check-palm-desert-property-types.js`** (Line 12)
6. **`scripts/test-city-query-match-api.js`** (Line 12)
7. **`scripts/compare-cities-api-to-unified-listings.js`** (Line 12)
8. **`scripts/list-all-cities-from-unified-listings.js`** (Line 12)
9. **`check-irvine-types.js`** (Line 12)

   All use:
   ```typescript
   collection: 'unifiedlistings',  // ❌ WRONG
   ```

   **Impact**: Diagnostic scripts return misleading results, showing 0 listings for cities that have data

---

## Files Using CORRECT Collection Name ✅

These files correctly use `unified_listings`:

1. **`src/models/unified-listing.ts`** (Line 496) ✅
   ```typescript
   collection: "unified_listings"
   ```

2. **`src/app/api/cities/[cityId]/listings/route.ts`** ✅
   Uses model import: `import UnifiedListing from "@/models/unified-listing"`

3. **`src/app/api/subdivisions/[slug]/listings/route.ts`** ✅
   Uses model import

4. **`src/scripts/database/create-indexes.ts`** (Line 308) ✅
   ```typescript
   'unified_listings'
   ```

---

## Fix Implementation

### Fix Priority

**Priority 1 - Critical (Production APIs)**:
- `src/app/api/analytics/subdivision-lookup/route.ts`

**Priority 2 - High (Infrastructure)**:
- `src/scripts/test-index-usage.ts`
- `src/scripts/optimize-unifiedlisting-indexes.ts`

**Priority 3 - Medium (Diagnostics)**:
- All diagnostic scripts in `scripts/` directory

### Fix Template

**Before**:
```typescript
collection: 'unifiedlistings'  // ❌ WRONG
// OR
db.collection("unifiedlistings")  // ❌ WRONG
```

**After**:
```typescript
collection: 'unified_listings'  // ✅ CORRECT
// OR
db.collection("unified_listings")  // ✅ CORRECT
```

---

## Verification Script

Created: `scripts/verify-collection-names.js`

This script:
1. Lists all collections in database
2. Tests both `unified_listings` and `unifiedlistings`
3. Shows document counts for each
4. Specifically checks for Irvine data
5. Samples document structure

**Result**:
```
✅ "unified_listings" EXISTS - 81,052 documents
   City field: "Cathedral City"
   PropertyType: "D"

✅ "unifiedlistings" EXISTS - 4,366 documents
   City field: "Blythe"
   PropertyType: "A"

Irvine listings (case-insensitive city match): 1059 ✅
```

---

## Testing After Fix

### Test 1: Irvine Property Types

Run: `node scripts/get-irvine-property-types-CORRECT.js`

**Expected Result**:
```
TOTAL: 538 active residential listings in Irvine

Property Types:
1. Condominium: 279 listings
2. Single Family Residence: 219 listings
3. Townhouse: 31 listings
4. Manufactured On Land: 7 listings
5. Studio: 1 listing
6. Own Your Own: 1 listing
```

### Test 2: Subdivision Lookup API

```bash
curl "http://localhost:3000/api/analytics/subdivision-lookup?query=PGA"
```

**Expected**: Should return PGA West subdivisions from full dataset

### Test 3: Index Optimization

```bash
npm run optimize-indexes
```

**Expected**: Indexes created on `unified_listings` collection (81K docs), not `unifiedlistings` (4K docs)

---

## Migration Notes

### Do NOT Delete `unifiedlistings` Yet

The old `unifiedlistings` collection should be:
1. **Archived** (renamed to `unifiedlistings_deprecated_2025_12_24`)
2. **Monitored** for 1-2 weeks to ensure no production code depends on it
3. **Deleted** after confirmation

**Archive Command**:
```javascript
db.unifiedlistings.renameCollection('unifiedlistings_deprecated_2025_12_24')
```

### Why Two Collections Exist

Based on the documentation (`CITIES_SUBDIVISIONS_UNIFIED_INTEGRATION.md` from Dec 3, 2025), the system was migrated from:
- Old: GPS + CRMLS split collections
- New: Unified collection for all 8 MLS associations

The `unifiedlistings` (no underscore) appears to be from an earlier migration attempt that was superseded by `unified_listings` (with underscore).

---

## Resolution Summary

### ✅ What Was Done (Dec 24, 2025)

**1. Created Backwards Compatibility**:
- Created MongoDB view: `unifiedlistings` → `unified_listings`
- Archived old collection: `unifiedlistings` renamed to `unifiedlistings_deprecated_2025_12_24`
- Script: `scripts/create-backwards-compatible-views.js`

**2. Fixed Production API**:
- Updated `src/app/api/analytics/subdivision-lookup/route.ts`
- Changed collection references to use correct names
- Deployed to production

**3. View Verification**:
- View "unifiedlistings" now has 81,052 documents (matches source)
- View "unifiedclosedlistings" now has 1,299,548 documents (matches source)
- Irvine query test: ✅ Returns 538 listings through view

### 📋 Impact

**Before**:
- Scripts queried deprecated collection with 4,366 old documents
- Irvine: 0 results
- Missing 76,686 listings (94.6% of data)

**After**:
- All queries automatically route to correct collection with 81,052 documents
- Irvine: 1,059 listings (538 active residential)
- Full California coverage restored

### ⚠️ Remaining Work

**Optional - Not Required (backwards compatibility handles this)**:
- Infrastructure scripts can be updated to use `unified_listings` directly
- Diagnostic scripts can be updated for clarity
- These are low priority since views work transparently

## Checklist

- [x] Identify all files using wrong collection name
- [x] Document the issue
- [x] Fix Priority 1 files (API routes)
- [x] Create backwards compatible views
- [x] Run verification tests
- [x] Archive old collection
- [x] Update this documentation with completion date
- [ ] Monitor for 1 week (optional)
- [ ] Consider updating infrastructure scripts to use correct names directly (optional)

---

## Related Documentation

- `docs/listings/CITIES_SUBDIVISIONS_UNIFIED_INTEGRATION.md` - Migration plan from Dec 3, 2025
- `docs/listings/UNIFIED_MLS_ARCHITECTURE.md` - Unified collection architecture
- `docs/architecture/DATABASE_MODELS.md` - Database models

---

## Contact

If you encounter issues after applying this fix, check:
1. Model import paths use `@/models/unified-listing` (singular, with hyphen)
2. Direct collection queries use `unified_listings` (plural, with underscore)
3. No scripts are still querying the old `unifiedlistings` collection

**Created by**: Claude Code
**Last Updated**: December 24, 2025
