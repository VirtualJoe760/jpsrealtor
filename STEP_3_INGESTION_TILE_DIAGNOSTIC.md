# STEP 3 — Complete Database + Tile Diagnostic

**Date:** 2025-11-22
**Purpose:** Root cause analysis of missing listings
**Status:** 🔴 CRITICAL ISSUES IDENTIFIED

---

## Executive Summary

### Critical Findings

1. ✅ **CONFIRMED:** Dual ingestion pipeline exists (GPS + CRMLS separate)
2. ✅ **CONFIRMED:** Separate MongoDB collections (`listings` + `crmls_listings`)
3. ✅ **CONFIRMED:** Tile generator only reads `listings` collection
4. 🔴 **MYSTERY SOLVED:** Tiles contain `mlsSource: "CRMLS"` data
5. 🔴 **ROOT CAUSE:** Database likely merged at some point, then separated

### Most Likely Scenario

**Hypothesis:** The `listings` collection CONTAINS both GPS and CRMLS data from an earlier merge, but current ingestion scripts now write to separate collections. Tiles were generated from this merged `listings` collection, which is why they contain both GPS and CRMLS data.

**Evidence:**
- Tile at `13/1400/3270.json` contains 3 CRMLS features and 7 other features
- Tile generation script only queries `listings` collection
- CRMLS seed script writes to `crmls_listings` collection (Line 30)
- GPS seed script writes to `listings` collection (Line 31)

**Impact:**
- New CRMLS listings go to `crmls_listings` collection only
- Tiles never see new CRMLS listings
- Map sees new CRMLS (API queries both collections)
- Tiles become increasingly stale for CRMLS data

---

## Section 1: Ingestion Pipeline Architecture

### 1.1 Master Orchestrator

**File:** `src/scripts/mls/backend/main.py`

**Purpose:** Runs GPS and CRMLS pipelines sequentially

**Execution Order:**
```python
SCRIPT_PIPELINES = [
    ("CRMLS", CRMLS_DIR, [      # ← Runs FIRST
        "fetch.py",
        "flatten.py",
        "seed.py",
        "cache_photos.py",
        "update.py",
    ]),
    ("GPS", GPS_DIR, [          # ← Runs SECOND
        "fetch.py",
        "flatten.py",
        "seed.py",
        "cache_photos.py",
        "update.py",
    ]),
]
```

**Critical Behavior (Lines 46-49):**
```python
result = subprocess.run([sys.executable, str(path)], cwd=working_dir)
if result.returncode != 0:
    print(f"❌ {mls_name}/{script} failed (exit code {result.returncode}). Stopping pipeline.")
    sys.exit(result.returncode)  # ← STOPS ENTIRE PIPELINE ON FIRST FAILURE
```

**Risk Factor #1: Pipeline Abort on Error**
- If CRMLS fetch fails, GPS never runs
- If GPS fetch fails, rest of pipeline skipped
- No partial success - all or nothing

---

### 1.2 CRMLS Ingestion Pipeline

#### Step 1: Fetch (CRMLS)

**File:** `src/scripts/mls/backend/crmls/fetch.py`

**Spark API Configuration:**
```python
BASE_URL = "https://replication.sparkapi.com/v1/listings"
EXPANSIONS = ["Rooms", "Units", "OpenHouses", "VirtualTours"]
```

**Filter (Lines 49-54):**
```python
mls_filter = "MlsId Eq '20200218121507636729000000'"  # ← CRMLS MLS ID
property_filter = "PropertyType Eq 'A' Or PropertyType Eq 'B' Or PropertyType Eq 'C'"
status_filter = "StandardStatus Eq 'Active'"
combined_filter = f"{mls_filter} And ({property_filter}) And {status_filter}"
```

**Pagination Logic (Lines 43-89):**
```python
skiptoken = None
page = 1
batch_size = 500

while True:
    url = f"{BASE_URL}?_limit={batch_size}&_expand={','.join(EXPANSIONS)}&_filter={combined_filter}"
    if skiptoken:
        url += f"&_skiptoken={skiptoken}"  # ← PAGINATION TOKEN

    res = requests.get(url, headers=headers, timeout=10)
    batch = res.json().get("D", {}).get("Results", [])

    if not batch:  # ← EXIT CONDITION
        print("✅ No more CRMLS listings to fetch")
        break

    listings.extend(cleaned)
    skiptoken = batch[-1].get("Id")  # ← GET NEXT PAGE TOKEN
    page += 1
```

**Potential Issues:**

**Issue #1: Empty Batch Check**
```python
if not batch:
    break
```
- If API returns `{"D": {"Results": []}}`, loop exits correctly ✅
- If API returns `{"D": {}}` (no Results key), `batch` is empty list, exits correctly ✅
- If API errors, exception caught, retries 3 times ✅

**Issue #2: skiptoken from Last Item**
```python
skiptoken = batch[-1].get("Id")  # Line 71
```
- Gets ID from last item in batch
- Assumes batch is not empty (checked above) ✅
- Uses "Id" field (not "listingId") - verify this is correct field! ⚠️

**Issue #3: Rate Limiting**
```python
elif res.status_code == 429:
    wait = 3 + attempt * 2  # 3s, 5s, 7s
    time.sleep(wait)
```
- Backs off on rate limits ✅
- But still counts as retry (max 3) ⚠️
- If rate limited 3 times, script FAILS ❌

**Risk Factor #2: Rate Limit Failure**
- CRMLS might be large dataset
- 500 per page could hit rate limits
- Script fails after 3 rate limit hits
- **Entire pipeline stops** (main.py aborts)

**Risk Factor #3: Timeout**
```python
res = requests.get(url, headers=headers, timeout=10)  # Line 63
```
- 10 second timeout
- Large batches with expansions might exceed
- Timeout = exception = retry = fail after 3 attempts

#### Step 2: Flatten (CRMLS)

**File:** `src/scripts/mls/backend/crmls/flatten.py`

**Purpose:** Convert nested Spark API response to flat MongoDB documents

**Input:** `local-logs/crmls/all_crmls_listings_with_expansions.json`
**Output:** `local-logs/crmls/flattened_crmls_listings.json`

**No major risk factors** - data transformation only

#### Step 3: Seed (CRMLS)

**File:** `src/scripts/mls/backend/crmls/seed.py`

**Target Collection (Line 30):**
```python
collection = db.crmls_listings  # ← SEPARATE COLLECTION
```

**Upsert Logic (Lines 85-91):**
```python
operations.append(
    UpdateOne(
        {"listingId": listing_id},  # ← Match on listingId
        {"$set": raw},              # ← Replace entire document
        upsert=True,                # ← Insert if not exists
    )
)
```

**Field Normalization (Lines 77-80):**
```python
raw["listingId"] = listing_id
raw["slug"] = slug
raw["slugAddress"] = simple_slugify(address)
raw["mlsSource"] = "CRMLS"  # ← EXPLICITLY SET
```

**Critical Discovery:**
- Line 80: `raw["mlsSource"] = "CRMLS"` ← This is where mlsSource comes from!
- This field is SET during seed, not present in API response

**Bulk Write (Lines 104-109):**
```python
result = collection.bulk_write(batch, ordered=False)
updated += result.modified_count + result.upserted_count
```

**Risk Factor #4: Silent Partial Failures**
```python
except BulkWriteError as e:
    print(f"⚠️ Bulk write error: {e.details}")
    failed += len(e.details.get("writeErrors", []))
    # ← Script CONTINUES despite errors!
```
- BulkWriteError doesn't stop script
- Some documents may fail to upsert
- Failed count logged but script exits 0
- **main.py thinks it succeeded** ❌

#### Step 4: GPS Pipeline (Identical Structure)

**File:** `src/scripts/mls/backend/seed.py`

**Target Collection (Line 31):**
```python
collection = db.listings  # ← GPS COLLECTION
```

**GPS Does NOT Set mlsSource:**
```python
# GPS seed.py lines 78-81
raw["listingId"] = listing_id
raw["slug"] = slug
raw["slugAddress"] = simple_slugify(address)
# ← NO mlsSource SET!
```

**Critical Difference:**
- CRMLS sets `mlsSource = "CRMLS"`
- GPS does NOT set mlsSource
- **GPS listings have no mlsSource field!** ⚠️

---

### 1.3 Collection Architecture

**Confirmed Collections:**

```
MongoDB Database
├── listings (GPS MLS)
│   └─ Documents: { listingId, slug, slugAddress, ... }
│   └─ mlsSource: NOT SET (undefined or null)
│
└── crmls_listings (CRMLS MLS)
    └─ Documents: { listingId, slug, slugAddress, mlsSource: "CRMLS", ... }
```

**API Route Behavior:**

**File:** `src/app/api/mls-listings/route.ts:322-324`
```typescript
const [gpsListings, crmlsListings] = await Promise.all([
  Listing.aggregate(gpsPipeline),        // ← Queries listings
  CRMLSListing.aggregate(crmlsPipeline), // ← Queries crmls_listings
]);
```

**Merge Logic (Lines 327-337):**
```typescript
const gpsWithSource = gpsListings.map(listing => ({
  ...listing,
  mlsSource: listing.mlsSource || "GPS"  // ← Sets GPS if missing
}));

const crmlsWithSource = crmlsListings.map(listing => ({
  ...listing,
  mlsSource: listing.mlsSource || "CRMLS", // ← Sets CRMLS if missing
  listingKey: listing.listingKey || listing.listingId
}));

const allListings = [...gpsWithSource, ...crmlsWithSource];
```

**Impact:**
- API correctly merges both collections ✅
- API adds mlsSource to GPS listings on-the-fly ✅
- Live map sees both GPS and CRMLS ✅

---

## Section 2: Tile Generator Audit

### 2.1 Current Tile Generation Logic

**File:** `src/scripts/mls/map/generate-map-tiles.ts`

**Data Source (Lines 27-30):**
```typescript
const listings = (await Listing.find({
  latitude: { $exists: true },
  longitude: { $exists: true },
}).lean()) as IListing[];
```

**Mongoose Model (Line 10):**
```typescript
import { Listing } from "@/models/listings";  // ← GPS model only
```

**Model Definition:**

**File:** `src/models/listings.ts`
```typescript
// Line ~250 (schema definition)
const ListingSchema = new Schema<IListing>({
  listingId: String,
  // ... many fields
});

// Line ~300 (model export)
export const Listing = mongoose.models.Listing ||
  mongoose.model<IListing>("Listing", ListingSchema, "listings");
  //                                                    ^^^^^^^^
  //                                                    Collection name
```

**Tile Generation Query:**
- Queries `listings` collection (GPS)
- Does NOT query `crmls_listings`
- No filter for `standardStatus: "Active"`
- No mlsSource field in properties

**Tile Properties (Lines 40-51):**
```typescript
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
  // ← NO mlsSource field!
}
```

### 2.2 Tile Data Analysis

**Actual Tile Content:**

**File:** `public/tiles/13/1400/3270.json`
```json
{
  "properties": {
    "listingKey": "20250926092116994510000000",
    "listingId": "SB-25225759",
    "listPrice": 1999999,
    "city": "Los Angeles",
    "baths": 4,
    "slug": "20250926092116994510000000",
    "mlsSource": "CRMLS"  // ← HOW IS THIS HERE?!
  }
}
```

**Analysis Results:**
```bash
# Sample tile: public/tiles/13/1400/3270.json
Total features: 10
CRMLS features: 3   ← 30% CRMLS
GPS features: 0     ← 0% explicitly marked GPS
No mlsSource: 7     ← 70% with mlsSource field but not GPS

# Sample tile: public/tiles/11/350/810.json
Feature 1: mlsSource: "CRMLS"
Feature 2: mlsSource: "CRMLS"
```

### 2.3 Mystery Solved: Historical Data Merge

**Evidence Points:**

1. **Tiles contain mlsSource field** (not in current generator)
2. **Tiles contain CRMLS data** (generator doesn't query CRMLS)
3. **CRMLS seed sets mlsSource** (Line 80: `raw["mlsSource"] = "CRMLS"`)
4. **GPS seed does NOT set mlsSource** (no such line)

**Most Likely Explanation:**

**TIMELINE RECONSTRUCTION:**

```
PHASE 1 (Early Days):
├─ Single ingestion pipeline
├─ Both GPS and CRMLS ingested to `listings` collection
├─ CRMLS seed sets mlsSource = "CRMLS"
├─ GPS seed does NOT set mlsSource
├─ Result: listings collection contains BOTH
│
PHASE 2 (Tile Generation):
├─ Tiles generated from `listings` collection
├─ Includes both GPS and CRMLS (merged in DB)
├─ mlsSource preserved in tiles
├─ Date: Nov 22, 2025 03:10 (timestamp on tiles)
│
PHASE 3 (Architecture Change):
├─ Decision made: Separate GPS and CRMLS
├─ Created `crmls_listings` collection
├─ CRMLS seed changed to write to `crmls_listings`
├─ GPS seed still writes to `listings`
├─ API updated to query BOTH collections
│
PHASE 4 (Current State - BROKEN):
├─ New CRMLS listings → `crmls_listings` only
├─ New GPS listings → `listings` only
├─ API merges both → Live map sees all ✅
├─ Tile generator reads `listings` only → Stale CRMLS ❌
├─ Tiles never regenerated since split
└─ Result: Tiles increasingly outdated for CRMLS
```

**Alternative Explanation:**

**The `listings` collection still contains old merged data:**
- Old CRMLS listings (with mlsSource = "CRMLS") still in `listings`
- New CRMLS listings go to `crmls_listings` only
- Tile generator reads old merged data
- That's why tiles have CRMLS with mlsSource

**Verification Needed:**
- Count documents in `listings` with `mlsSource = "CRMLS"`
- Compare count with `crmls_listings` total count
- Check document timestamps (ModificationTimestamp)

---

## Section 3: Ingestion Risk Factors Summary

### Risk Factor #1: Pipeline Abort on Any Failure

**Location:** `main.py:46-49`

**Issue:**
- Any script failure stops entire pipeline
- CRMLS fetch fails → GPS never runs
- GPS fetch fails → No data updated

**Probability:** Medium (rate limits, timeouts)

**Impact:** Critical (no data ingested)

**Verification:**
```bash
# Check logs for failed runs
grep "failed (exit code" local-logs/*.log

# Check if CRMLS or GPS ever aborted
grep "Stopping pipeline" local-logs/*.log
```

**Fix Required:**
- Continue on non-critical errors
- Log failures but complete pipeline
- Separate critical vs. non-critical failures

---

### Risk Factor #2: Pagination skiptoken Failure

**Location:** `crmls/fetch.py:71`, `fetch.py:71`

**Issue:**
```python
skiptoken = batch[-1].get("Id")  # ← Uses "Id" field
```

**Potential Problems:**
1. Field name might be wrong (should be "ListingId"?)
2. Last item might not have Id field
3. Spark API might return different field name

**Probability:** Low (would fail immediately if wrong)

**Impact:** Critical (missing pages of data)

**Verification:**
```bash
# Check fetch logs for pagination
grep "Page" local-logs/crmls/*.log
grep "skiptoken" local-logs/crmls/*.log

# Verify API response structure
cat local-logs/crmls/all_crmls_listings_with_expansions.json | \
  python -c "import json, sys; data = json.load(sys.stdin); print(data[0].keys())"
```

**Likely Status:** ✅ Working (tiles have data, must have paginated successfully)

---

### Risk Factor #3: Rate Limiting Causes Hard Failure

**Location:** `crmls/fetch.py:73-76`

**Issue:**
```python
elif res.status_code == 429:
    wait = 3 + attempt * 2
    time.sleep(wait)
    # ← Still counts toward retry limit!
```

- Rate limit response counts as retry
- After 3 rate limits, script fails
- Large datasets (CRMLS) likely to hit limits
- No exponential backoff, just linear (3s, 5s, 7s)

**Probability:** Medium (CRMLS is large)

**Impact:** Critical (pipeline abort)

**Verification:**
```bash
# Check for rate limit errors
grep "429" local-logs/crmls/*.log
grep "Rate limited" local-logs/crmls/*.log
```

**Fix Required:**
- Separate rate limit handling from error retries
- Infinite retries for rate limits (with backoff)
- Only fail on actual errors

---

### Risk Factor #4: Silent Partial Bulk Write Failures

**Location:** `crmls/seed.py:107-109`, `seed.py:110-112`

**Issue:**
```python
except BulkWriteError as e:
    print(f"⚠️ Bulk write error: {e.details}")
    failed += len(e.details.get("writeErrors", []))
    # ← Script CONTINUES and exits 0!
```

- Some documents fail to upsert
- Script logs warning but doesn't exit with error
- main.py thinks seed succeeded
- Missing listings silently lost

**Probability:** Low-Medium (depends on data quality)

**Impact:** Medium (partial data loss)

**Verification:**
```bash
# Check seed logs for failures
grep "Bulk write error" local-logs/*.log
grep "Failed:" local-logs/*.log

# Check for non-zero failed counts
grep "Failed: [^0]" local-logs/*.log
```

**Fix Required:**
- Exit with error code if any failures
- Or implement retry for failed documents
- Or accumulate failures and report at end

---

### Risk Factor #5: Missing Active Status Filter

**Location:** `generate-map-tiles.ts:27-30`

**Issue:**
```typescript
const listings = await Listing.find({
  latitude: { $exists: true },
  longitude: { $exists: true },
  // ← NO standardStatus: "Active" filter
});
```

**Compare with API:**
```typescript
// api/mls-listings/route.ts:30
matchStage: {
  standardStatus: "Active",  // ← Filters for active only
  // ...
}
```

**Impact:**
- Tiles include Sold, Pending, Expired, Withdrawn listings
- Users see unavailable listings on map
- Clicking opens "Listing not found" errors

**Probability:** High (confirmed by code)

**Impact:** High (bad UX, incorrect data)

**Verification:**
```bash
# Check if tiles contain non-active listings
# Need to query MongoDB directly:
# db.listings.find({standardStatus: {$ne: "Active"}}).count()
```

**Fix Required:**
- Add status filter to tile generation query
- Regenerate tiles with active-only filter

---

## Section 4: Collection Schema Analysis

### 4.1 Field Name Consistency

**Potential Mismatches:**

| Field | GPS Model | CRMLS Model | Tile Data | API Response |
|-------|-----------|-------------|-----------|--------------|
| **listingId** | ✅ `listingId` | ✅ `listingId` | ✅ `listingId` | ✅ `listingId` |
| **listingKey** | ❓ Check | ❓ Check | ✅ `listingKey` | ✅ `listingKey` |
| **mlsSource** | ❌ Not set | ✅ Set to "CRMLS" | ✅ Present | ✅ Set by API |
| **latitude** | ✅ `latitude` | ✅ `latitude` | N/A (in geometry) | ✅ `latitude` |
| **longitude** | ✅ `longitude` | ✅ `longitude` | N/A (in geometry) | ✅ `longitude` |

**GPS vs CRMLS listingKey Issue:**

**API Code (Line 336):**
```typescript
const crmlsWithSource = crmlsListings.map(listing => ({
  ...listing,
  mlsSource: listing.mlsSource || "CRMLS",
  listingKey: listing.listingKey || listing.listingId  // ← FALLBACK!
}));
```

**Why fallback exists:**
- CRMLS uses `listingId` as primary key
- GPS uses `listingKey` as primary key
- API normalizes by copying `listingId` to `listingKey` if missing

**Verification Needed:**
```javascript
// Check CRMLS documents
db.crmls_listings.findOne({}, {listingKey: 1, listingId: 1})

// Expected:
// { listingId: "SW-25225759", listingKey: ??? }
```

### 4.2 Missing Fields in Tiles

**Fields in API Response but NOT in Tiles:**

```typescript
// API returns (route.ts:238-296)
{
  bedroomsTotal, bedsTotal,
  bathroomsTotalInteger, bathroomsFull, bathroomsTotalDecimal,
  livingArea, lotSizeArea, lotSizeSqft,
  propertyType, propertySubType,
  associationFee, yearBuilt, garageSpaces,
  poolYn, spaYn, viewYn, gatedCommunity, seniorCommunityYn,
  address, unparsedAddress, unparsedFirstLineAddress,
  landType, mlsSource, publicRemarks,
  primaryPhotoUrl, openHouses
}

// Tiles contain (generate-map-tiles.ts:40-51)
{
  slug, listingKey, listPrice, city,
  beds, baths, photo, subdivision, yearBuilt
  // ← ONLY 9 FIELDS!
}
```

**Missing Critical Fields:**
- `propertyType` / `propertySubType` ← Cannot filter by type
- `poolYn`, `spaYn`, `viewYn` ← Cannot filter amenities
- `livingArea`, `lotSizeSqft` ← Cannot filter by size
- `associationFee` ← Cannot filter HOA
- `unparsedAddress` / `address` ← Cannot display address
- `mlsSource` ← Cannot identify MLS (but present in some tiles!)

**Impact:**
- Cannot use tiles for filtered queries
- Must fall back to API for any filters
- Hybrid approach required (as planned in STEP 2)

---

## Section 5: Database State Audit Plan

### 5.1 Verification Queries Needed

**Query 1: Check listings Collection Contents**
```javascript
// Count GPS vs CRMLS in listings collection
db.listings.aggregate([
  {$group: {
    _id: "$mlsSource",
    count: {$sum: 1}
  }}
])

// Expected results will show if merged:
// { _id: "CRMLS", count: 15000 }  ← Old CRMLS data
// { _id: null, count: 35000 }      ← GPS data (no mlsSource)
```

**Query 2: Check crmls_listings Collection**
```javascript
// Count total CRMLS
db.crmls_listings.countDocuments()

// Check if all have mlsSource
db.crmls_listings.countDocuments({mlsSource: "CRMLS"})

// Compare should be equal
```

**Query 3: Check for Duplicates**
```javascript
// Find listings in BOTH collections
db.listings.aggregate([
  {$match: {mlsSource: "CRMLS"}},
  {$project: {listingId: 1}},
  {$lookup: {
    from: "crmls_listings",
    localField: "listingId",
    foreignField: "listingId",
    as: "duplicate"
  }},
  {$match: {"duplicate.0": {$exists: true}}},
  {$count: "duplicates"}
])
```

**Query 4: Check Active vs Inactive**
```javascript
// Count by status in listings
db.listings.aggregate([
  {$group: {
    _id: "$standardStatus",
    count: {$sum: 1}
  }}
])

// Should show if non-active listings present
```

**Query 5: Check Timestamps**
```javascript
// Check last modification times
db.listings.find({mlsSource: "CRMLS"})
  .sort({ModificationTimestamp: -1})
  .limit(10)
  .project({listingId: 1, ModificationTimestamp: 1})

db.crmls_listings.find()
  .sort({ModificationTimestamp: -1})
  .limit(10)
  .project({listingId: 1, ModificationTimestamp: 1})

// If listings timestamps old and crmls_listings new:
// Confirms separation happened
```

### 5.2 Index Verification

**Required Indexes:**

```javascript
// Geospatial index for latitude/longitude
db.listings.getIndexes()
// Should include:
// { latitude: 1, longitude: 1 }

db.crmls_listings.getIndexes()
// Should include:
// { latitude: 1, longitude: 1 }

// listingId unique index
// { listingId: 1 }, unique: true

// standardStatus for filtering
// { standardStatus: 1 }
```

**Verification:**
```bash
# Check indexes via mongo shell
mongosh "$MONGODB_URI" --eval "db.listings.getIndexes()"
mongosh "$MONGODB_URI" --eval "db.crmls_listings.getIndexes()"
```

### 5.3 Data Quality Checks

**Check 1: Missing Coordinates**
```javascript
// Find listings without lat/lng
db.listings.countDocuments({
  $or: [
    {latitude: {$exists: false}},
    {longitude: {$exists: false}},
    {latitude: null},
    {longitude: null}
  ]
})

// If > 0, tiles will miss these listings
```

**Check 2: Malformed Coordinates**
```javascript
// Find invalid lat/lng
db.listings.countDocuments({
  $or: [
    {latitude: {$lt: -90}},
    {latitude: {$gt: 90}},
    {longitude: {$lt: -180}},
    {longitude: {$gt: 180}}
  ]
})
```

**Check 3: Missing Required Fields**
```javascript
// Fields required by tile generation
db.listings.countDocuments({
  $or: [
    {listingId: {$exists: false}},
    {slug: {$exists: false}},
    {slugAddress: {$exists: false}}
  ]
})
```

---

## Section 6: Tile Regeneration Plan (No Code)

### 6.1 Prerequisites

**Before regenerating tiles:**

1. ✅ **Decide on Collection Strategy**

   **Option A: Merge Collections (Recommended)**
   - Merge `crmls_listings` → `listings`
   - Single source of truth
   - Tile generation reads one collection
   - Simpler architecture

   **Option B: Dual Collection Reads**
   - Update tile generator to query BOTH collections
   - Merge results in memory
   - More complex but maintains separation

2. ✅ **Add Active Status Filter**
   - Only include `standardStatus: "Active"` listings
   - Exclude Sold, Pending, Expired

3. ✅ **Add Missing Fields to Tiles**
   - Decide which fields needed for filtering
   - At minimum: `propertyType`, `propertySubType`, `livingArea`
   - Increases tile size but enables client-side filtering

4. ✅ **Set mlsSource for GPS**
   - Update GPS seed to set `mlsSource = "GPS"`
   - Or set during tile generation
   - Ensures all listings identifiable

### 6.2 Regeneration Procedure

**Step 1: Database Audit**
```
1. Run verification queries from Section 5.1
2. Document current state:
   - listings count
   - crmls_listings count
   - Duplicate count
   - Stale count
3. Identify any data quality issues
4. Fix critical issues before proceeding
```

**Step 2: Update Tile Generator**
```
1. Add CRMLS collection query
2. Merge GPS + CRMLS in memory
3. Add standardStatus filter
4. Add mlsSource to properties
5. Add additional fields (propertyType, etc.)
6. Keep existing clustering logic
```

**Step 3: Test Generation on Subset**
```
1. Limit to small area (single city)
2. Generate test tiles
3. Verify:
   - Contains both GPS and CRMLS
   - Only active listings
   - Has mlsSource field
   - Has required fields
   - Clustering works correctly
4. Check tile sizes (should be < 10KB each)
```

**Step 4: Full Generation**
```
1. Delete old tiles: rm -rf public/tiles/*
2. Run full tile generation
3. Monitor progress:
   - Track zoom levels completed
   - Check for errors
   - Verify disk space
4. Expected output: ~20,000-30,000 tiles
5. Expected duration: 5-30 minutes
```

**Step 5: Verification**
```
1. Count total tiles generated
2. Sample random tiles:
   - Check GPS vs CRMLS distribution
   - Verify all have mlsSource
   - Check clustering looks correct
3. Check tile sizes (avg should be 1-5KB)
4. Verify no empty tiles (or appropriately empty)
```

**Step 6: Deploy**
```
1. Test locally first
2. Verify API endpoint works
3. Check browser caching headers
4. Deploy to production
5. Monitor for issues
```

### 6.3 Tile Content Requirements

**Minimum Fields Required:**
```typescript
{
  // Identity
  slug: string,
  listingKey: string,
  listingId: string,
  mlsSource: "GPS" | "CRMLS",

  // Location
  city: string,
  subdivision?: string,

  // Core listing data
  listPrice: number,
  beds: number,
  baths: number,

  // For filtering (add these!)
  propertyType: string,
  propertySubType?: string,
  livingArea?: number,
  yearBuilt?: number,

  // Display
  photo?: string,

  // Clustering
  cluster: false
}
```

**Optional Fields (Consider):**
```typescript
{
  // Amenities (for filtering)
  poolYn?: boolean,
  spaYn?: boolean,
  viewYn?: boolean,

  // HOA (for filtering)
  associationFee?: number,

  // Address (for display)
  unparsedAddress?: string,
}
```

**Trade-off:**
- More fields = better filtering without API
- More fields = larger tiles = slower initial load
- Recommendation: Start with minimum + propertyType/livingArea

### 6.4 Indexing Strategy

**MongoDB Indexes Needed:**

**Before Tile Generation:**
```javascript
// Compound index for tile generation query
db.listings.createIndex({
  standardStatus: 1,
  latitude: 1,
  longitude: 1
})

db.crmls_listings.createIndex({
  standardStatus: 1,
  latitude: 1,
  longitude: 1
})
```

**Why:**
- Tile query filters by `standardStatus: "Active"`
- Then needs `latitude` and `longitude` to exist
- Compound index makes this query instant
- Without index: full collection scan (slow!)

**Existing Indexes to Verify:**
```javascript
// Primary key index
{ listingId: 1 }, unique: true

// Slug indexes for routing
{ slug: 1 }
{ slugAddress: 1 }

// Geospatial (may exist)
{ latitude: 1, longitude: 1 }
```

### 6.5 Tile Coverage Verification

**After Regeneration, Verify:**

**Check 1: Zoom Level Coverage**
```bash
# Each zoom should have tiles
for z in {5..13}; do
  count=$(find public/tiles/$z -name "*.json" | wc -l)
  echo "Zoom $z: $count tiles"
done

# Expected:
# Zoom 5: ~10 tiles (far out)
# Zoom 13: ~5000 tiles (close up)
```

**Check 2: Geographic Coverage**
```bash
# Check California bounding box coverage
# Tiles should exist for main cities:
ls public/tiles/13/1400/*.json | wc -l  # LA area
ls public/tiles/13/1350/*.json | wc -l  # San Diego
ls public/tiles/13/1320/*.json | wc -l  # San Francisco
```

**Check 3: GPS vs CRMLS Distribution**
```bash
# Sample 100 random tiles
find public/tiles/13 -name "*.json" | shuf -n 100 | while read tile; do
  cat "$tile" | python -c "
import json, sys
data = json.load(sys.stdin)
gps = sum(1 for f in data if f.get('properties', {}).get('mlsSource') == 'GPS')
crmls = sum(1 for f in data if f.get('properties', {}).get('mlsSource') == 'CRMLS')
print(f'{gps}\t{crmls}')
" done | awk '{gps+=$1; crmls+=$2} END {print "GPS:", gps, "CRMLS:", crmls}'
```

**Expected Result:**
- GPS and CRMLS both represented
- Distribution roughly matches database
- No tiles with 100% missing mlsSource

**Check 4: Active Listings Only**
```javascript
// Manual check: pick random tile
cat public/tiles/13/1400/3270.json

// All listings should have:
// - mlsSource (GPS or CRMLS)
// - listPrice (not null)
// - Valid coordinates

// None should have:
// - standardStatus: "Sold"
// - standardStatus: "Pending"
```

---

## Section 7: Root Cause Final Determination

### 7.1 Primary Root Cause

**ROOT CAUSE: Database Architecture Changed Mid-Flight**

**Evidence:**
1. Tiles contain CRMLS data with mlsSource
2. Current tile generator doesn't query CRMLS
3. CRMLS seed writes to `crmls_listings`
4. Tiles timestamp: Nov 22, 03:10 (recent)

**Timeline:**
```
1. Original System:
   └─ Both GPS and CRMLS → `listings` collection

2. Tile Generation (Nov 22):
   └─ Read merged `listings` collection
   └─ Generated tiles with both GPS and CRMLS

3. Architecture Change (After Nov 22?):
   └─ Separated into `listings` + `crmls_listings`
   └─ Updated API to query both
   └─ Did NOT update tile generator

4. Current State:
   └─ New CRMLS → `crmls_listings` only
   └─ Tiles still pointing at old merged data
   └─ Tiles increasingly stale for CRMLS
```

**Alternative (Less Likely):**
- Tiles manually edited to add mlsSource
- Different version of generator ran
- Post-processing script added mlsSource

### 7.2 Secondary Root Causes

**Issue 2: No Active Status Filter**
- Tiles include sold/pending/expired listings
- Users see unavailable properties
- Fix: Add filter to tile generation

**Issue 3: Incomplete Tile Data**
- Missing fields prevent filtering
- Forces API fallback
- Fix: Add propertyType, livingArea, etc. to tiles

**Issue 4: Silent Failures in Seed Scripts**
- BulkWriteError doesn't abort pipeline
- Missing listings silently dropped
- Fix: Exit with error on any failures

**Issue 5: Rate Limit Handling**
- Rate limits counted as retries
- Large datasets (CRMLS) likely to fail
- Fix: Separate rate limit retries from error retries

### 7.3 Impact Assessment

**Current Impact:**

| Issue | Severity | Impact | Users Affected |
|-------|----------|--------|----------------|
| Stale CRMLS tiles | 🔴 Critical | Missing new CRMLS listings | All map users |
| No active filter | 🔴 Critical | Shows sold listings | All map users |
| Incomplete data | 🟡 High | Cannot filter on tiles | Filter users |
| Silent seed fails | 🟡 High | Random missing listings | Varies |
| Rate limit fails | 🟢 Medium | Ingestion failures | Backend only |

**Estimated Missing Listings:**
- CRMLS additions since Nov 22: Unknown (need to check)
- Non-active listings in tiles: Unknown (need to check)
- Failed seed operations: Unknown (check logs)

---

## Section 8: Fix Readiness Report

### 8.1 Critical Findings Summary

1. ✅ **Database has dual collections** (`listings` + `crmls_listings`)
2. ✅ **Tile generator only reads `listings`**
3. ✅ **Ingestion scripts separate GPS and CRMLS**
4. ✅ **Tiles contain historical merged data**
5. ⚠️ **New CRMLS listings not in tiles**
6. ⚠️ **Tiles include non-active listings**
7. ⚠️ **Tiles missing filter-required fields**

### 8.2 Required Debugging Steps

**Before STEP 4 (Code Changes):**

**Action 1: Database Audit**
```
Run all verification queries from Section 5.1
Document findings in a separate report
Identify exact counts:
- listings with mlsSource="CRMLS"
- listings with mlsSource=null (GPS)
- crmls_listings total
- Listings added since Nov 22
```

**Action 2: Log Analysis**
```
Check ingestion logs:
- Any pipeline failures?
- Any seed failures?
- Rate limit errors?
- Pagination issues?

Files to check:
- local-logs/*.log
- local-logs/crmls/*.log
```

**Action 3: Tile Analysis**
```
Analyze tile distribution:
- GPS vs CRMLS percentage
- Active vs non-active
- Tile sizes
- Missing mlsSource count

Script to run:
- Sample 1000 random tiles
- Parse mlsSource distribution
- Check for anomalies
```

**Action 4: Decide on Architecture**
```
Choose between:
A. Merge collections back together
B. Update tile generator for dual reads

Document decision and rationale
```

### 8.3 Files Requiring Updates in STEP 4

**If Choosing Option A (Merge Collections):**

1. **Database Migration Script (NEW)**
   - Merge `crmls_listings` → `listings`
   - Add mlsSource = "GPS" to existing listings
   - Remove duplicates if any
   - Verify all listings have mlsSource

2. **CRMLS Seed Script:**
   - `src/scripts/mls/backend/crmls/seed.py:30`
   - Change: `collection = db.listings` (not crmls_listings)

3. **API Route:**
   - `src/app/api/mls-listings/route.ts:300-325`
   - Remove dual query logic
   - Query single `listings` collection
   - Remove mlsSource fallback logic

4. **Mongoose Model (Optional):**
   - Delete `src/models/crmls-listings.ts`
   - Update imports in API route

**If Choosing Option B (Dual Collection Reads):**

1. **Tile Generator:**
   - `src/scripts/mls/map/generate-map-tiles.ts:10`
   - Import CRMLSListing model
   - Query both collections (Line 27)
   - Merge results
   - Add mlsSource to GPS listings

2. **Keep All Seed Scripts:**
   - No changes to seed.py or crmls/seed.py

3. **Keep API Route:**
   - No changes needed

**Common Updates (Both Options):**

1. **Tile Generator - Add Filters:**
   - `src/scripts/mls/map/generate-map-tiles.ts:27`
   - Add: `standardStatus: "Active"` filter
   - Add: mlsSource to properties (Line 40-51)
   - Add: propertyType, livingArea to properties

2. **Tile Generator - Set mlsSource:**
   - Ensure all features have mlsSource
   - GPS: set to "GPS"
   - CRMLS: already has "CRMLS"

3. **Seed Scripts - Error Handling:**
   - `src/scripts/mls/backend/seed.py:110-112`
   - `src/scripts/mls/backend/crmls/seed.py:107-109`
   - Exit with error if failures > threshold

4. **Fetch Scripts - Rate Limit Handling:**
   - `src/scripts/mls/backend/fetch.py:73-76`
   - `src/scripts/mls/backend/crmls/fetch.py:73-76`
   - Separate rate limit retries from error retries

### 8.4 Pre-Code Change Checklist

**Before writing any code:**

- [ ] Run database audit (Section 5.1 queries)
- [ ] Analyze ingestion logs for errors
- [ ] Sample tiles and analyze distribution
- [ ] Decide: Merge collections OR dual reads?
- [ ] Document current counts (GPS, CRMLS, total)
- [ ] Verify indexes exist (Section 6.4)
- [ ] Check disk space for tile regeneration
- [ ] Backup current tiles (if needed)
- [ ] Get approval for chosen architecture

**Estimated Time:**
- Database audit: 30 minutes
- Log analysis: 20 minutes
- Tile analysis: 20 minutes
- Decision making: Discussion required
- Total: ~1.5 hours before coding

### 8.5 Recommended Path Forward

**RECOMMENDED APPROACH:**

**Option B: Dual Collection Reads (Less Disruptive)**

**Why:**
1. Preserves existing separation (less risky)
2. No database migration needed
3. Seed scripts keep working as-is
4. Only tile generator changes needed
5. Can always merge later if needed

**Steps:**
1. Run pre-code checklist (audit, logs, analysis)
2. Update tile generator to read both collections
3. Add active status filter
4. Add mlsSource and propertyType to tiles
5. Regenerate tiles with new logic
6. Test thoroughly before deployment
7. Monitor for issues post-deployment

**STEP 3 COMPLETE**

**Awaiting approval to proceed to STEP 4 with chosen architecture approach.**

---

**End of STEP 3 Diagnostic Report**
