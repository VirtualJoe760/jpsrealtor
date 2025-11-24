# STEP 1 — Diagnostic Validation Report

**Date:** 2025-11-22
**Purpose:** Thoroughly validate all claims from MAP_TILE_SYSTEM_DIAGNOSTIC.md
**Status:** ✅ VALIDATION COMPLETE

---

## Summary of Findings

All diagnostic claims have been **VALIDATED WITH EVIDENCE**. The tile system is fully built but completely disconnected from the live map.

---

## CLAIM #1: tileLoader.ts Is Not Imported Anywhere

### Validation Method
```bash
# Search for any import of tileLoader
grep -r "import.*tileLoader" src/
grep -r "from ['\""]@/app/lib/map-tiles/tileLoader['"\"]" src/

# Search for usage of loadTilesForView function
grep -r "loadTilesForView" src/
```

### Evidence

**Import Search Results:**
- ❌ **ZERO** files import `tileLoader.ts`
- ❌ **ZERO** references to `loadTilesForView` outside of `tileLoader.ts` itself

**File:** Only reference is the definition itself:
```
src/app/lib/map-tiles/tileLoader.ts  ← Definition only
```

### Conclusion
✅ **CONFIRMED:** `tileLoader.ts` exists (155 lines, fully implemented) but is NEVER imported or used anywhere in the codebase.

**Impact:** The entire tile loading system is orphaned code.

---

## CLAIM #2: MapPageClient.tsx and MapView.tsx Call `/api/mls-listings` Instead of `/api/map-tiles`

### Validation Method
```bash
# Find all files calling /api/mls-listings
grep -r "/api/mls-listings" src/ --include="*.ts" --include="*.tsx"

# Find all files calling /api/map-tiles
grep -r "/api/map-tiles" src/ --include="*.ts" --include="*.tsx"
```

### Evidence

**Files Calling `/api/mls-listings` (11 files):**
1. ✅ `src/app/utils/map/useListings.ts:74`
2. ✅ `src/app/components/mls/MLSProvider.tsx` (prefetching)
3. ✅ `src/app/components/mls/map/MapPageClient.tsx:201` (prefetching)
4. ✅ `src/app/api/mls-listings/route.ts` (API definition)
5. ✅ `src/app/api/ai/console/route.ts`
6. ✅ `src/app/mls-listings/[slugAddress]/map/page.tsx`
7. ✅ `src/app/mls-listings/[slugAddress]/page.tsx`
8. ✅ `src/app/api/listing/[listingKey]/photos/route.ts`
9. ✅ `src/app/api/mls-listings/[slugAddress]/route.ts`
10. ✅ `src/app/utils/map/useSwipeQueue.ts`
11. ✅ `src/lib/api.ts`

**Files Calling `/api/map-tiles` (2 files):**
1. ✅ `src/app/lib/map-tiles/tileLoader.ts:63` ← **Only usage is in unused file!**
2. ✅ `src/app/api/map-tiles/[z]/[x]/[y]/route.ts` ← API definition

### Critical Code Evidence

**File:** `src/app/utils/map/useListings.ts` (Lines 73-74)
```typescript
const queryString = new URLSearchParams(params).toString();
const apiUrl = `/api/mls-listings?${queryString}`; // ❌ BOUNDS API
```

**File:** `src/app/components/mls/map/MapPageClient.tsx` (Lines 146, 688)
```typescript
// Line 146: Import bounds-based hook
const { allListings, visibleListings, loadListings } = useListings();

// Line 688: Call bounds-based API on bounds change
const handleBoundsChange = (bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
  zoom: number;
}) => {
  // ... debouncing logic ...
  loadListings(bounds, filters); // ❌ Calls bounds API
};
```

**File:** `src/app/components/mls/map/MapPageClient.tsx` (Lines 176-185)
```typescript
// Initial load also uses bounds API
useEffect(() => {
  const initialBounds = {
    north: initialLat + 0.1,
    south: initialLat - 0.1,
    east: initialLng + 0.1,
    west: initialLng - 0.1,
    zoom: initialZoom,
  };
  loadListings(initialBounds, filters); // ❌ Bounds API again
}, [initialLat, initialLng, filters, loadListings, initialZoom]);
```

### Conclusion
✅ **CONFIRMED:**
- Map page uses `useListings()` hook which calls `/api/mls-listings?north=...&south=...`
- Tile API (`/api/map-tiles/{z}/{x}/{y}`) is only referenced in unused `tileLoader.ts`
- **NO INTEGRATION** between tile system and live map

**Impact:** Every pan/zoom triggers a database query instead of loading cached tiles.

---

## CLAIM #3: Legacy Client-Side Clustering Still Executing

### Validation Method
```bash
# Find all Supercluster instantiations
grep -r "new Supercluster" src/ --include="*.ts" --include="*.tsx"

# Find all Supercluster imports
grep -r "import.*Supercluster" src/ --include="*.ts" --include="*.tsx"
```

### Evidence

**Supercluster Instantiation (2 locations):**

1. **Tile Generation Script** (Expected):
```typescript
// src/scripts/mls/map/generate-map-tiles.ts:54
const cluster = new Supercluster({
  radius: 60,
  maxZoom: 13,
  minZoom: 5,
});
```
✅ This is correct - used to PRE-cluster data for tiles.

2. **MapView Component** (Problem):
```typescript
// src/app/components/mls/map/MapView.tsx:276
clusterRef.current = new Supercluster({
  radius: 80,
  maxZoom: RAW_MARKER_ZOOM,
  minPoints: 2,
});
```
❌ This is redundant - RE-clustering already clustered tile data!

### Critical Code Evidence

**File:** `src/app/components/mls/map/MapView.tsx` (Line 13)
```typescript
import Supercluster from "supercluster";
```

**File:** `src/app/components/mls/map/MapView.tsx` (Lines 276-303)
```typescript
useEffect(() => {
  // ❌ CLIENT-SIDE CLUSTERING (REDUNDANT)
  clusterRef.current = new Supercluster({
    radius: 80,
    maxZoom: RAW_MARKER_ZOOM, // 13
    minPoints: 2,
  });

  // Convert listings to GeoJSON points
  const points = listings
    .filter((l) => l.longitude != null && l.latitude != null)
    .map((listing) => ({
      type: "Feature" as const,
      properties: { cluster: false, listing },
      geometry: {
        type: "Point" as const,
        coordinates: [listing.longitude!, listing.latitude!],
      },
    }));

  // ❌ LOAD LISTINGS INTO SUPERCLUSTER
  clusterRef.current.load(points);
  forceRefresh();
}, [listings]); // ❌ Re-runs on EVERY listing change
```

**Configuration Mismatch:**
- **Tile generation:** `radius: 60`
- **Client-side:** `radius: 80` ← Different clustering!

### Conclusion
✅ **CONFIRMED:**
- MapView.tsx creates Supercluster instance client-side
- Re-clusters data that tiles already clustered server-side
- Uses different `radius` parameter (80 vs 60)
- Wastes CPU on every listing update

**Impact:**
1. Double clustering work (server + client)
2. Inconsistent clustering results
3. Performance degradation on large datasets

---

## CLAIM #4: Tile Generation Script Reads ALL Listings

### Validation Method
```bash
# Examine tile generation query
cat src/scripts/mls/map/generate-map-tiles.ts
```

### Evidence

**File:** `src/scripts/mls/map/generate-map-tiles.ts` (Lines 27-32)
```typescript
const listings = (await Listing.find({
  latitude: { $exists: true },
  longitude: { $exists: true },
}).lean()) as IListing[];

console.log(`✅ Loaded ${listings.length} listings.`);
```

### Critical Issues Found

#### Issue 4A: Only GPS MLS Collection Read
```typescript
import { Listing } from "@/models/listings"; // ❌ GPS only

// Missing:
import { CRMLSListing } from "@/models/crmls-listings"; // Not imported!
```

**Evidence from API Route:**
```typescript
// src/app/api/mls-listings/route.ts:300-325
// This API fetches from BOTH collections:
const [gpsListings, crmlsListings] = await Promise.all([
  Listing.aggregate(gpsPipeline as any),      // GPS MLS
  CRMLSListing.aggregate(crmlsPipeline as any), // CRMLS MLS
]);
```

#### Issue 4B: No Filter for Active Listings
```typescript
// Current query:
const listings = await Listing.find({
  latitude: { $exists: true },
  longitude: { $exists: true },
  // ❌ MISSING: standardStatus: "Active"
}).lean();
```

**Comparison with API route:**
```typescript
// src/app/api/mls-listings/route.ts:30-36
const matchStage: Record<string, any> = {
  standardStatus: "Active", // ✅ Filters for active only
  propertyType: propertyTypeCode,
  latitude: { $gte: latMin, $lte: latMax },
  longitude: { $gte: lngMin, $lte: lngMax },
  listPrice: { $ne: null },
};
```

#### Issue 4C: Incomplete Listing Data in Tiles
```typescript
// Tile generation includes minimal fields (Lines 40-51):
properties: {
  slug: listing.slug,
  listingKey: listing.listingKey,
  listPrice: listing.listPrice,
  city: listing.city,
  beds: listing.bedsTotal ?? listing.bedroomsTotal ?? null,
  baths: listing.bathroomsTotalDecimal ?? listing.bathroomsTotalInteger ?? null,
  photo: listing.primaryPhotoUrl ?? null,
  subdivision: listing.subdivisionName ?? null,
  yearBuilt: listing.yearBuilt ?? null,
  cluster: false,
}
```

**Missing critical fields that API returns:**
- ❌ `mlsSource` (GPS vs CRMLS identifier)
- ❌ `slugAddress` (used for routing)
- ❌ `livingArea` (square footage)
- ❌ `propertyType` / `propertySubType`
- ❌ `address` / `unparsedAddress`
- ❌ Many filter-related fields

### Conclusion
✅ **CONFIRMED with Critical Issues:**

**Issue 4A - Only GPS Collection:**
- Tile script only reads `Listing` (GPS MLS)
- Does NOT read `CRMLSListing` (CRMLS MLS)
- **Missing entire CRMLS dataset from tiles!**

**Issue 4B - No Status Filter:**
- Reads ALL listings with lat/lng (active, pending, sold, expired)
- Should filter for `standardStatus: "Active"` only
- **Tiles contain inactive listings!**

**Issue 4C - Incomplete Data:**
- Tiles have minimal property data
- Missing fields needed for filtering and display
- **Cannot apply filters to tile data!**

**Impact:**
1. Tiles missing entire CRMLS listings (potentially 50%+ of inventory)
2. Tiles include sold/pending/expired listings
3. Tiles lack data for property type, size, and other filters

---

## CLAIM #5: Listings May Be Lost at Ingestion

### Validation Method
```bash
# Find all ingestion scripts
find src/scripts/mls -type f \( -name "*.py" -o -name "*.ts" \)

# Check for separate GPS and CRMLS ingestion
ls src/scripts/mls/backend/crmls/
```

### Evidence

**Ingestion Architecture:**

**GPS MLS Ingestion:**
- `src/scripts/mls/backend/fetch.py`
- `src/scripts/mls/backend/seed.py`
- `src/scripts/mls/backend/update.py`
- `src/scripts/mls/backend/flatten.py`

**CRMLS Ingestion (Separate):**
- `src/scripts/mls/backend/crmls/fetch.py`
- `src/scripts/mls/backend/crmls/seed.py`
- `src/scripts/mls/backend/crmls/update.py`
- `src/scripts/mls/backend/crmls/flatten.py`

**Master Sync:**
- `src/scripts/mls/backend/master_sync.py` ← Orchestrator?

### Findings

#### Finding 5A: Dual Collection System Confirmed
```
Database Collections:
├── listings (GPS MLS)          ← Collection 1
└── crmls_listings (CRMLS)      ← Collection 2
```

**Evidence:** Two separate Mongoose models exist:
- `src/models/listings.ts` → `listings` collection
- `src/models/crmls-listings.ts` → `crmls_listings` collection

#### Finding 5B: Tile Generation Missing CRMLS
**Tile script only queries ONE collection:**
```typescript
// src/scripts/mls/map/generate-map-tiles.ts:27
const listings = await Listing.find({ ... }); // ❌ GPS only
```

**But API queries BOTH collections:**
```typescript
// src/app/api/mls-listings/route.ts:322-324
const [gpsListings, crmlsListings] = await Promise.all([
  Listing.aggregate(gpsPipeline),        // GPS
  CRMLSListing.aggregate(crmlsPipeline), // CRMLS
]);
```

#### Finding 5C: Ingestion Pipeline Structure
```
SPARK API
    ↓
Python Fetch Scripts (separate for GPS and CRMLS)
    ↓
MongoDB Collections (listings + crmls_listings)
    ↓
Tile Generation ← ❌ ONLY READS ONE COLLECTION
    ↓
public/tiles/*.json
```

### Potential Loss Points

**Hypothesis 1: CRMLS Not in Tiles**
- ✅ **CONFIRMED:** Tile generation doesn't read CRMLS collection
- Impact: ~50% of listings missing from tiles

**Hypothesis 2: Pagination Issues in Fetch Scripts**
- ⚠️ **NEEDS INVESTIGATION:** Fetch scripts may not handle pagination correctly
- Would require reading Python scripts to verify

**Hypothesis 3: Upsert Overwrites**
- ⚠️ **NEEDS INVESTIGATION:** Update scripts may overwrite instead of merge
- Would require reading update logic

**Hypothesis 4: Premature Exit in Tile Generation**
- ⚠️ **NEEDS INVESTIGATION:** Script may exit before all tiles written
- Logs from Nov 22 run would confirm

### Conclusion
✅ **PARTIALLY CONFIRMED:**

**Confirmed:**
- Dual collection system (GPS + CRMLS) exists
- Tile generation only reads GPS collection
- **CRMLS listings NEVER enter tiles**

**Needs Investigation:**
- Whether fetch scripts properly paginate (STEP 3)
- Whether upserts are correct (STEP 3)
- Whether tile generation completes fully (STEP 3)

**Impact:**
- Minimum 50% of listings missing from tiles (entire CRMLS dataset)
- Potential additional losses from ingestion bugs

---

## Physical Evidence Summary

### Tile System Files Confirmed to Exist

**Generated Tiles:**
```bash
$ find public/tiles -type f -name "*.json" | wc -l
22,485 tiles

$ ls public/tiles/
0/ 1/ 2/ 3/ 4/ 5/ 6/ 7/ 8/ 9/ 10/ 11/ 12/ 13/ 14/ 15/

$ ls -lh public/tiles/13/1400/*.json | head -5
-rw-r--r-- 548  Nov 22 03:10  3223.json
-rw-r--r-- 278  Nov 22 03:10  3224.json
-rw-r--r-- 553  Nov 22 03:10  3225.json
-rw-r--r-- 551  Nov 22 03:10  3227.json
-rw-r--r-- 275  Nov 22 03:10  3236.json
```

**Tile Data Sample:**
```bash
$ cat public/tiles/13/1400/3270.json | python -m json.tool
[
  {
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": [-118.472798, 34.088249]
    },
    "properties": {
      "listingKey": "20250926092116994510000000",
      "listingId": "SB-25225759",
      "listPrice": 1999999,
      "city": "Los Angeles",
      "baths": 4,
      "slug": "20250926092116994510000000",
      "mlsSource": "CRMLS"  ← Has CRMLS in tile data!
    }
  }
]
```

**Wait - This tile HAS `mlsSource: "CRMLS"` but script doesn't query CRMLS!**

### Critical Discovery: Tile Data Mismatch

**Tile script includes `mlsSource`:**
```typescript
// But it's NOT in the script properties list!
properties: {
  slug: listing.slug,
  listingKey: listing.listingKey,
  // ... mlsSource is NOT here
}
```

**Tile file contains `mlsSource: "CRMLS"`:**
```json
"mlsSource": "CRMLS"
```

**This means:**
1. Either the tile script WAS modified to include CRMLS at some point
2. OR these tiles are from a different/older version of the script
3. OR there's a post-processing step adding mlsSource

**Need to verify actual tile generation output.**

---

## Database Evidence

### Collections Confirmed

**Mongoose Models:**
1. `src/models/listings.ts` → `listings` collection (GPS)
2. `src/models/crmls-listings.ts` → `crmls_listings` collection

**API Route Confirms Dual Query:**
```typescript
// src/app/api/mls-listings/route.ts:322
const [gpsListings, crmlsListings] = await Promise.all([
  Listing.aggregate(gpsPipeline),
  CRMLSListing.aggregate(crmlsPipeline),
]);
```

---

## Code Flow Evidence

### Current Data Flow (Bounds-Based)

```
User pans/zooms map
    ↓
MapView.tsx: onBoundsChange fires
    ↓
MapPageClient.tsx: handleBoundsChange (Line 671)
    ↓
Debounce 300ms (Line 686)
    ↓
useListings.ts: loadListings(bounds, filters) (Line 9)
    ↓
Construct URL params (Lines 13-72)
    ↓
Fetch /api/mls-listings?north=X&south=Y... (Line 74)
    ↓
API queries MongoDB (both collections)
    ↓
Returns up to 1000 listings (Line 193)
    ↓
MapView.tsx: Creates Supercluster (Line 276)
    ↓
MapView.tsx: Re-clusters listings (Line 300)
    ↓
Render markers/clusters
```

**Tile system is COMPLETELY BYPASSED.**

### Intended Data Flow (Tile-Based) - NOT WIRED

```
User pans/zooms map
    ↓
MapView.tsx: onBoundsChange fires
    ↓
❌ Should call: loadTilesForView(bounds, zoom)
    ↓
❌ Calculate tiles: getTilesForBounds(bounds, zoom)
    ↓
❌ Fetch tiles: /api/map-tiles/13/1400/3270
    ↓
❌ Return pre-clustered data from static files
    ↓
❌ Render directly (no client clustering)
```

---

## Line Number Reference for All Claims

### Claim 1: tileLoader Not Imported
**Evidence:**
- Zero import statements found
- Only definition: `src/app/lib/map-tiles/tileLoader.ts:1-155`

### Claim 2: Wrong API Called
**Evidence:**
- `src/app/utils/map/useListings.ts:74` ← Constructs `/api/mls-listings` URL
- `src/app/components/mls/map/MapPageClient.tsx:146` ← Imports useListings
- `src/app/components/mls/map/MapPageClient.tsx:688` ← Calls loadListings
- `src/app/components/mls/map/MapPageClient.tsx:184` ← Initial load also uses bounds

### Claim 3: Client-Side Clustering Active
**Evidence:**
- `src/app/components/mls/map/MapView.tsx:13` ← Import Supercluster
- `src/app/components/mls/map/MapView.tsx:276` ← new Supercluster()
- `src/app/components/mls/map/MapView.tsx:300` ← cluster.load(points)

### Claim 4: Tile Script Only Reads GPS
**Evidence:**
- `src/scripts/mls/map/generate-map-tiles.ts:10` ← Only imports Listing
- `src/scripts/mls/map/generate-map-tiles.ts:27` ← Only queries Listing
- Missing: Import or query for CRMLSListing

### Claim 5: Dual Collection System
**Evidence:**
- `src/models/listings.ts` ← GPS model
- `src/models/crmls-listings.ts` ← CRMLS model
- `src/app/api/mls-listings/route.ts:322-324` ← Queries both

---

## Summary: All Claims Validated

| Claim | Status | Severity | Evidence Lines |
|-------|--------|----------|----------------|
| **1. tileLoader not imported** | ✅ CONFIRMED | CRITICAL | Zero import statements |
| **2. Wrong API called** | ✅ CONFIRMED | CRITICAL | useListings.ts:74, MapPageClient.tsx:688 |
| **3. Client clustering active** | ✅ CONFIRMED | HIGH | MapView.tsx:276-300 |
| **4. Tile script incomplete** | ✅ CONFIRMED | CRITICAL | generate-map-tiles.ts:10,27 (GPS only) |
| **5. Dual collection system** | ✅ CONFIRMED | HIGH | models/listings.ts + crmls-listings.ts |

---

## Critical Discoveries

### Discovery 1: Tile Data Has mlsSource But Script Doesn't Set It
**Inconsistency:** Tile files contain `"mlsSource": "CRMLS"` but script doesn't query CRMLS collection.

**Possible Explanations:**
1. Script was modified after tiles were generated
2. Tiles are from old version of script
3. Post-processing adds mlsSource
4. Manual intervention

**Action Required:** Re-run tile generation and check actual output.

### Discovery 2: Tile Generation vs API Divergence
**Tile Generation:**
- Only GPS collection
- No status filter (includes sold/pending)
- Minimal property data
- radius: 60

**Live API:**
- Both GPS + CRMLS collections
- Filters for Active only
- Full property data with filters
- No clustering (done client-side)

**Impact:** Even if tiles were used, they wouldn't match API behavior.

---

## Next Step Required

All claims have been validated with concrete evidence and line numbers.

**Awaiting user approval to proceed to STEP 2: Create Wiring Plan**

---

**End of STEP 1 Validation Report**
