# Property Types & Data Pipeline Documentation

**Date**: December 3, 2025
**Status**: Production Guide
**Related**: UNIFIED_MLS_ARCHITECTURE.md

---

## Executive Summary

This document catalogs all available PropertyType codes across 8 MLS associations and documents the complete data ingestion pipeline. All 8 MLSs support property types **A through I**, enabling unified collection of residential sales, rentals, multi-family, land, commercial, and farm properties.

---

## Table of Contents

1. [PropertyType Codes Reference](#propertytype-codes-reference)
2. [PropertyType Availability by MLS](#propertytype-availability-by-mls)
3. [Current Data Pipeline](#current-data-pipeline)
4. [Photo Handling](#photo-handling)
5. [Unified Pipeline Updates](#unified-pipeline-updates)
6. [Migration Plan](#migration-plan)

---

## PropertyType Codes Reference

### GPS MLS PropertyType Codes (ACTUAL MAPPING)

**IMPORTANT**: PropertyType codes are **MLS-specific**. GPS MLS uses this mapping:

| Code | GPS MLS Name | Description | Currently Fetching? |
|------|--------------|-------------|---------------------|
| **A** | Residential | Single-family homes, condos, townhomes (For Sale) | ✅ Yes |
| **B** | Residential Lease | Rental/lease properties | ✅ Yes |
| **C** | Residential Income | Multi-family, 2-4 units, income properties | ✅ Yes |
| **D** | Land | Vacant land, lots, acreage | ❌ **No (Want to add!)** |
| **E** | Manufactured In Park | Mobile homes in parks | ❌ No |
| **F** | Commercial Sale | Commercial sale properties, offices, retail | ❌ No |
| **G** | Commercial Lease | Commercial lease properties | ❌ No |
| **H** | Business Opportunity | Business sales with real estate | ❌ No |
| **I** | Vacation Rental | Short-term vacation rentals | ❌ No |

**Source**: GPS MLS Web Portal Property Type dropdown (December 2025)

**Note**: Other MLSs (CRMLS, CLAW, etc.) may have different PropertyType mappings!

### RESO Standard Codes (for reference)

The Real Estate Standards Organization (RESO) defines these standard codes:

- **RESI** - Residential (maps to Spark "A")
- **RLSE** - Residential Lease (maps to Spark "F")
- **RINC** - Residential Income (maps to Spark "B")
- **LAND** - Land (maps to Spark "C")
- **MOBI** - Manufactured In Park / Mobile
- **FARM** - Farm (maps to Spark "E")
- **COMS** - Commercial Sale (maps to Spark "D")
- **COML** - Commercial Lease
- **BUSO** - Business Opportunity

**Note**: Spark API uses letter codes (A-I) instead of RESO mnemonic codes, but provides RESO-compliant field names in the `StandardFields` object.

---

## PropertyType Availability by MLS

### Complete MLS PropertyType Matrix

**All 8 MLS associations support all 9 property types (A-I):**

| MLS | Property Types | Active Listings | Notes |
|-----|----------------|-----------------|-------|
| **CRMLS** | A, B, C, D, E, F, G, H, I | 54,859 | Largest inventory |
| **CLAW** | A, B, C, D, E, F, G, H, I | 13,925 | Full coverage |
| **Southland Regional** | A, B, C, D, E, F, G, H, I | 7,459 | Full coverage |
| **GPS MLS** | A, B, C, D, E, F, G, H, I | 5,646 | Full coverage |
| **High Desert MLS** | A, B, C, D, E, F, G, H, I | 3,478 | Full coverage |
| **Bridge MLS** | A, B, C, D, E, F, G, H, I | 1,390 | Full coverage |
| **Conejo Simi Moorpark** | A, B, C, D, E, F, G, H, I | 821 | Full coverage |
| **ITECH** | A, B, C, D, E, F, G, H, I | 26 | Full coverage |

**Source**: Spark `/v1/standardfields/MlsId` endpoint (December 4, 2025)

**Total Available Listings**: 87,604 across all property types

### PropertyType Distribution Estimate

Based on typical MLS distributions:

| Property Type | Code | Est. % of Market | Est. Listings (of 87,604) |
|---------------|------|------------------|---------------------------|
| Residential (For Sale) | A | 70% | ~61,300 |
| Rental | F | 15% | ~13,100 |
| Multi-Family | B | 8% | ~7,000 |
| Land | C | 4% | ~3,500 |
| Commercial | D | 2% | ~1,750 |
| Farm | E | 0.5% | ~440 |
| Extended (G,H,I) | G,H,I | 0.5% | ~440 |

**Current Implementation**: Fetching only A, B, C (Residential, Multi-Family, Land from GPS)
**Missing**: ~13,100 rental listings (F) + ~2,190 commercial/farm/extended (D,E,G,H,I)

---

## Current Data Pipeline

### Overview

Current pipeline runs **per-MLS** with separate scripts for GPS and CRMLS:

```
fetch.py → flatten.py → seed.py → cache_photos.py
```

### Pipeline Stage 1: `fetch.py` (Data Retrieval)

**Location**: `src/scripts/mls/backend/fetch.py` (GPS), `src/scripts/mls/backend/crmls/fetch.py` (CRMLS)

**Current Configuration**:

```python
# GPS fetch.py (lines 49-54)
mls_filter = "MlsId Eq '20190211172710340762000000'"  # GPS only
property_filter = "PropertyType Eq 'A' Or PropertyType Eq 'B' Or PropertyType Eq 'C'"
status_filter = "StandardStatus Eq 'Active'"
combined_filter = f"{mls_filter} And ({property_filter}) And {status_filter}"
```

**What it does**:
1. Fetches listings from Spark Replication API
2. Applies filters:
   - MLS ID (currently GPS: `20190211172710340762000000`)
   - PropertyType: A (Residential), B (Multi-Family), C (Land)
   - StandardStatus: Active
3. Uses expansions: `["Rooms", "Units", "OpenHouses", "VirtualTours"]`
4. Paginates using SkipToken (**Bug**: Currently uses `batch[-1].get("Id")` - should use `response.get("D", {}).get("SkipToken")`)
5. Saves raw JSON to `local-logs/all_listings_with_expansions.json`

**Issues**:
- ❌ Incorrect SkipToken pagination (uses listing ID instead of API-provided token)
- ❌ Fetches from only 1 MLS at a time (GPS or CRMLS)
- ❌ Missing PropertyType F (Rentals) - 15% of market
- ❌ Missing PropertyType D (Commercial) - 2% of market
- ❌ Missing PropertyType E, G, H, I

### Pipeline Stage 2: `flatten.py` (Data Normalization)

**Location**: `src/scripts/mls/backend/flatten.py`

**What it does**:
1. Reads raw listings from `all_listings_with_expansions.json`
2. Extracts `StandardFields` object (RESO-compliant fields)
3. Converts PascalCase to camelCase for MongoDB
4. Derives land lease details (landType, landLeaseAmount, etc.)
5. Generates slugified address (`slugAddress`)
6. Merges top-level fields with standard fields
7. Saves to `local-logs/flattened_all_listings_preserved.json`

**Example transformation**:

```python
# Input (raw from Spark API)
{
  "StandardFields": {
    "ListingKey": "ABC123",
    "ListPrice": 500000,
    "BedroomsTotal": 3,
    "UnparsedAddress": "123 Main St"
  },
  "Media": [...],
  "OpenHouses": [...]
}

# Output (flattened)
{
  "slug": "ABC123",
  "slugAddress": "123-main-st",
  "listingKey": "ABC123",
  "listPrice": 500000,
  "bedroomsTotal": 3,
  "unparsedAddress": "123 Main St",
  "media": [...],
  "openHouses": [...]
}
```

**Land Details Derivation** (lines 46-119):
- Determines `landType`: "Fee" or "Lease"
- Extracts lease expiration date
- Calculates `landLeaseYearsRemaining`

### Pipeline Stage 3: `seed.py` (Database Insertion)

**Location**: `src/scripts/mls/backend/seed.py`

**What it does**:
1. Reads flattened listings from JSON
2. Connects to MongoDB
3. Upserts to `listings` collection (GPS) or `crmlsListings` collection (CRMLS)
4. Uses `listingKey` as unique identifier
5. Tracks inserted/updated counts

**Issue**: Creates separate collections per MLS instead of unified collection

### Pipeline Stage 4: `cache_photos.py` (Photo CDN Caching)

**Location**: `src/scripts/mls/backend/cache_photos.py`

**What it does**:
1. Queries MongoDB for listings without cached photos
2. Fetches photos from Spark API (`/v1/listings/{id}/photos`)
3. Extracts photo URLs at various sizes:
   - `uriThumb`, `uri300`, `uri640`, `uri800`, `uri1024`, `uri1280`, `uri1600`, `uri2048`, `uriLarge`
4. Stores photo metadata in `photos` collection
5. Maintains skip index to avoid re-processing

**Photo Model** (`src/models/photos.ts`):

```typescript
interface IPhoto {
  listingId: string;      // Foreign key
  photoId: string;        // Unique photo ID
  caption?: string;
  uriThumb?: string;      // CDN URL
  uri300?: string;        // CDN URL
  uri640?: string;        // CDN URL
  uri800?: string;        // CDN URL
  uri1024?: string;       // CDN URL
  uri1280?: string;       // CDN URL
  uri1600?: string;       // CDN URL
  uri2048?: string;       // CDN URL
  uriLarge?: string;      // CDN URL
  primary?: boolean;
  Order?: number;
}
```

**Important**: Photo URLs are **Spark CDN URLs**, not locally stored files. The `cache_photos.py` script simply **stores the CDN URL strings** in MongoDB for quick lookup.

---

## Photo Handling

### Current Approach

**Photo URLs are already CDN links from Spark API**:

```json
{
  "photoId": "12345",
  "uri1600": "https://photos.flexmls.com/spark/12345_1600.jpg",
  "uri1280": "https://photos.flexmls.com/spark/12345_1280.jpg",
  "uri800": "https://photos.flexmls.com/spark/12345_800.jpg"
}
```

The `cache_photos.py` script **does not download or store image files**. It only:
1. Fetches photo metadata from Spark API
2. Stores the CDN URL strings in MongoDB
3. Avoids re-fetching photo metadata for listings already processed

### With Cloudflare Caching

**Current Flow**:
```
User requests photo → Query photos collection → Return CDN URL → Browser fetches from Spark CDN
```

**With Cloudflare**:
```
User requests photo → Cloudflare Worker → Cache hit (return cached CDN URL) OR cache miss (query MongoDB + cache result)
```

**Optimization**: Since photos are external CDN URLs (not local files), we don't need Cloudflare R2 storage. Cloudflare edge caching can cache the **photo metadata responses** from your API, reducing MongoDB queries.

### Photo Collection Deprecation (Future)

With unified collection, photos can be embedded in listing documents:

```typescript
// Unified collection includes Media array
{
  "ListingKey": "ABC123",
  "Media": [
    {
      "MediaURL": "https://photos.flexmls.com/spark/12345_1600.jpg",
      "MediaType": "Image",
      "MediaCategory": "Primary",
      "Order": 1
    }
  ]
}
```

**Benefit**: Eliminates separate `photos` collection and `cache_photos.py` script entirely.

---

## Unified Pipeline Updates

### New Unified Fetch Script

**Replace**:
- `src/scripts/mls/backend/fetch.py` (GPS)
- `src/scripts/mls/backend/crmls/fetch.py` (CRMLS)

**With**:
- `src/scripts/mls/backend/unified-fetch.py` (All 8 MLSs)

**Key Changes**:

```python
# unified-fetch.py

# MLS IDs for all 8 associations
MLS_IDS = {
    "GPS": "20190211172710340762000000",
    "CRMLS": "20200218121507636729000000",
    "CLAW": "20200630203341057545000000",
    "SOUTHLAND": "20200630203518576361000000",
    "HIGH_DESERT": "20200630204544040064000000",
    "BRIDGE": "20200630204733042221000000",
    "CONEJO_SIMI_MOORPARK": "20160622112753445171000000",
    "ITECH": "20200630203206752718000000"
}

# Property types to fetch
PROPERTY_TYPES = ["A", "B", "C", "D", "F"]  # Add D (Commercial), F (Rental)
# Optional: Add E, G, H, I for complete coverage

# Filter for each MLS
def build_filter(mls_id, property_types, status="Active"):
    mls_filter = f"MlsId eq '{mls_id}'"

    # Build property type filter
    prop_filters = [f"PropertyType eq '{pt}'" for pt in property_types]
    property_filter = " or ".join(prop_filters)

    status_filter = f"StandardStatus eq '{status}'"

    return f"{mls_filter} and ({property_filter}) and {status_filter}"

# CORRECT SkipToken pagination
def fetch_listings(mls_id, mls_name, headers):
    url = f"{BASE_URL}?_filter={build_filter(mls_id, PROPERTY_TYPES)}&_limit=500&_expand=Rooms,Units,OpenHouses,VirtualTours,Media"

    skiptoken = None
    all_listings = []

    while True:
        if skiptoken:
            request_url = f"{url}&_skiptoken={skiptoken}"
        else:
            request_url = url

        response = requests.get(request_url, headers=headers)
        data = response.json()

        # CORRECT: Get SkipToken from API response
        response_data = data.get("D", {})
        batch = response_data.get("Results", [])
        new_skiptoken = response_data.get("SkipToken")  # ← From API

        if not batch:
            break

        # Add MLS source identifier
        for listing in batch:
            listing["_mlsSource"] = mls_name
            listing["_mlsId"] = mls_id

        all_listings.extend(batch)

        # End condition
        if new_skiptoken == skiptoken:
            break

        skiptoken = new_skiptoken

    return all_listings

# Fetch from all MLSs
all_listings = []
for short_name, mls_id in MLS_IDS.items():
    print(f"Fetching from {short_name}...")
    listings = fetch_listings(mls_id, short_name, headers)
    all_listings.extend(listings)
    print(f"  → {len(listings):,} listings")

print(f"\nTotal fetched: {len(all_listings):,} listings from {len(MLS_IDS)} MLSs")
```

### Updated Flatten Script

**Minimal changes needed** - `flatten.py` already handles RESO standard fields.

**Add**:

```python
# Add MLS source fields
output["mlsSource"] = raw.get("_mlsSource", "Unknown")
output["mlsId"] = raw.get("_mlsId")

# Extract Media array (photos embedded)
media = raw.get("Media", [])
if media:
    output["media"] = media
    # Set primary photo URL for quick access
    primary_photo = next((m for m in media if m.get("MediaCategory") == "Primary"), media[0] if media else None)
    if primary_photo:
        output["primaryPhotoUrl"] = primary_photo.get("MediaURL")
```

### Updated Seed Script

**Replace collection logic**:

```python
# OLD: Separate collections per MLS
if mls_source == "GPS":
    collection = db.listings
elif mls_source == "CRMLS":
    collection = db.crmlsListings

# NEW: Single unified collection
collection = db.unified_listings

# Upsert with listingKey
collection.update_one(
    {"listingKey": listing["listingKey"]},
    {"$set": listing},
    upsert=True
)
```

### Deprecate cache_photos.py

With `Media` array embedded in listings:

```python
# OLD: Separate photo caching step
python cache_photos.py

# NEW: Photos already embedded from fetch.py (via _expand=Media)
# No separate script needed!
```

---

## Migration Plan

### Phase 1: Add PropertyType F (Rentals) - Week 1

**Goal**: Add 15% more listings (rentals) without changing architecture

```python
# Update fetch.py and crmls/fetch.py
# Line 52: Change property filter
property_filter = "PropertyType Eq 'A' Or PropertyType Eq 'B' Or PropertyType Eq 'C' Or PropertyType Eq 'F'"
#                                                                                         ^^^^ Add F (Rentals)
```

**Run**:
```bash
# GPS
cd src/scripts/mls/backend
python fetch.py
python flatten.py
python seed.py

# CRMLS
cd src/scripts/mls/backend/crmls
python fetch.py
python flatten.py
python seed.py
```

**Expected Result**:
- GPS: ~5,646 → ~6,500 listings (+850 rentals)
- CRMLS: ~54,859 → ~63,000 listings (+8,000 rentals)
- Total: ~60,500 → ~69,500 listings

### Phase 2: Add PropertyType D (Commercial) - Week 2

```python
# Add D (Commercial)
property_filter = "PropertyType Eq 'A' Or PropertyType Eq 'B' Or PropertyType Eq 'C' Or PropertyType Eq 'D' Or PropertyType Eq 'F'"
#                                                                                         ^^^^ Add D
```

**Expected Result**: +1,750 commercial listings

### Phase 3: Fix SkipToken Bug - Week 2

**Critical Bug Fix**:

```python
# OLD (WRONG): fetch.py line 71
skiptoken = batch[-1].get("Id")  # Using listing ID

# NEW (CORRECT):
response_data = res.json().get("D", {})
batch = response_data.get("Results", [])
skiptoken = response_data.get("SkipToken")  # ← From API

# End condition check
if not batch or skiptoken == previous_skiptoken:
    break
```

### Phase 4: Deploy Unified Fetch Script - Week 3-4

**Replace per-MLS scripts with unified script**:

```bash
# 1. Create unified-fetch.py (already exists)
# 2. Test with single MLS
python unified-fetch.py --mls GPS

# 3. Test with multiple MLSs
python unified-fetch.py --mls GPS CRMLS

# 4. Run full fetch (all 8 MLSs)
python unified-fetch.py

# Expected: ~87,604 listings (2.7x current)
```

### Phase 5: Update Flatten & Seed for Unified Collection - Week 4

**Flatten changes**:
- Add `mlsSource` and `mlsId` fields
- Extract `Media` array
- Set `primaryPhotoUrl`

**Seed changes**:
- Target `unified_listings` collection
- Add geospatial index for `location` field
- Add indexes for `MlsId`, `PropertyType`, `StandardStatus`

### Phase 6: Deprecate cache_photos.py - Week 5

**After confirming Media array contains all photos**:

```bash
# 1. Verify Media array completeness
python scripts/verify-media-coverage.py

# 2. Stop running cache_photos.py in pipeline

# 3. Archive photos collection
mongo jpsrealtor --eval "
  db.photos.renameCollection('photos_archived_2025_12_03')
"

# 4. Update API routes to use listing.media instead of photos collection
```

### Phase 7: Implement Incremental Sync - Week 6

**Hourly sync for updates**:

```bash
# Cron: Every hour at :05
5 * * * * cd /path/to/project && python unified-fetch.py --incremental

# Only fetches listings modified in last hour
# Filter: ModificationTimestamp bt 2025-12-03T00:00:00Z,2025-12-03T01:00:00Z
```

---

## New Pipeline Architecture (Final State)

### Simplified Pipeline

```
unified-fetch.py → flatten.py → seed.py
(All 8 MLSs)       (normalize)   (MongoDB)
```

**Removed**: `cache_photos.py` (photos embedded via `_expand=Media`)

### Command-Line Usage

```bash
# Fetch all MLSs, all property types
python unified-fetch.py

# Fetch specific MLSs
python unified-fetch.py --mls GPS CRMLS

# Fetch specific property types
python unified-fetch.py --property-types A B C D F

# Incremental update (hourly sync)
python unified-fetch.py --incremental

# Custom time range
python unified-fetch.py --start "2025-12-03T00:00:00Z" --end "2025-12-03T01:00:00Z"

# Dry run (show what would be fetched)
python unified-fetch.py --dry-run
```

### Expected Results

**Final State** (all 8 MLSs, property types A-F):

| MLS | A (Resi) | B (Multi) | C (Land) | D (Comm) | F (Rental) | Total |
|-----|----------|-----------|----------|----------|------------|-------|
| CRMLS | 38,401 | 4,388 | 2,194 | 1,097 | 8,230 | 54,310 |
| CLAW | 9,748 | 1,114 | 557 | 279 | 2,089 | 13,787 |
| Southland | 5,221 | 596 | 298 | 149 | 1,118 | 7,382 |
| GPS | 3,952 | 451 | 226 | 113 | 847 | 5,589 |
| High Desert | 2,435 | 278 | 139 | 70 | 522 | 3,444 |
| Bridge | 973 | 111 | 56 | 28 | 209 | 1,377 |
| Conejo | 575 | 66 | 33 | 16 | 123 | 813 |
| ITECH | 18 | 2 | 1 | 1 | 4 | 26 |
| **Total** | **61,323** | **7,006** | **3,504** | **1,753** | **13,142** | **86,728** |

**Note**: Excludes E (Farm), G, H, I for now. Add with `--property-types A B C D E F G H I` if needed.

---

## PropertyType Filter Reference

### For API Routes

**Frontend property type selectors**:

```typescript
// src/app/api/unified-listings/route.ts

const propertyType = searchParams.get("propertyType");

const filter: any = {};

if (propertyType === "sale") {
  // Residential for sale + Commercial for sale
  filter.PropertyType = { $in: ["A", "D"] };
} else if (propertyType === "rental") {
  // Rentals only
  filter.PropertyType = "F";
} else if (propertyType === "multifamily") {
  // Multi-family / income properties
  filter.PropertyType = "B";
} else if (propertyType === "land") {
  // Land only
  filter.PropertyType = "C";
} else if (propertyType === "commercial") {
  // Commercial sale + lease
  filter.PropertyType = { $in: ["D"] };
} else if (propertyType === "all") {
  // No filter - return all types
}
```

### For AI Tools

**Update AI tool definition**:

```typescript
{
  name: "searchListings",
  parameters: {
    propertyType: {
      type: "string",
      enum: ["sale", "rental", "multifamily", "land", "commercial", "all"],
      description: `Property type filter:
        - sale: Residential homes for sale (A) + Commercial sale (D)
        - rental: Rental/lease properties (F)
        - multifamily: Multi-family/income properties (B)
        - land: Land/lots (C)
        - commercial: Commercial properties (D)
        - all: All property types (default)`
    }
  }
}
```

---

## Summary

### PropertyType Coverage

- **All 8 MLSs** support **property types A through I**
- **Current implementation**: A, B, C only (Residential, Multi-Family, Land)
- **Recommended addition**: F (Rentals) = +15% listings, D (Commercial) = +2% listings
- **Total potential**: 87,604 listings across all property types

### Pipeline Improvements

1. **Fix SkipToken bug** (critical)
2. **Add PropertyType F (Rentals)** (+13,142 listings)
3. **Add PropertyType D (Commercial)** (+1,753 listings)
4. **Deploy unified-fetch.py** (all 8 MLSs)
5. **Deprecate cache_photos.py** (use embedded Media array)
6. **Implement incremental sync** (hourly updates)

### Photo Handling

- Photos are **Spark CDN URLs**, not local files
- `cache_photos.py` stores URL strings in MongoDB
- With Cloudflare caching, can cache API responses (not files)
- With unified collection, embed `Media` array → deprecate photos collection

---

**Next Steps**: Begin Phase 1 (add PropertyType F for rentals) to immediately expand inventory by 15%.
