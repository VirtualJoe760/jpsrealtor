# Trello Cards - Unified MLS + CMA Implementation

**Project**: Unified MLS Architecture + Closed Listings CMA
**Created**: December 4, 2025
**Total Cards**: 35

---

## List 1: Phase 1 - Quick Wins (Week 1)

### Card 1: Enhance flatten.py for Unified Architecture
**Description:**
Update flatten.py to support unified collection with these enhancements:
- Add `mlsSource` field (GPS_MLS, CRMLS, etc.)
- Add `mlsId` field (26-digit MLS identifier)
- Add `propertyTypeName` mapping (A→"Residential", D→"Land", etc.)
- Preserve `Media` array from `_expand=Media`
- Add closed listing fields: `closeDate`, `closePrice`, `daysOnMarket`

**Checklist:**
- [ ] Add PROPERTY_TYPE_NAMES dict
- [ ] Update flatten_listing() signature with mls_short_name, mls_id params
- [ ] Add mlsSource and mlsId to flattened output
- [ ] Add propertyTypeName field
- [ ] Preserve Media array when present
- [ ] Add closed-specific fields
- [ ] Test with sample GPS listing

**Files:**
- `src/scripts/mls/backend/flatten.py`

**Reference:**
- `docs/FLATTEN_PY_ANALYSIS.md`

---

### Card 2: Add PropertyType D (Land) to Fetch Scripts
**Description:**
Update fetch.py and crmls/fetch.py to include PropertyType D (Land) listings.

**Current filter:**
```python
property_filter = "PropertyType Eq 'A' Or PropertyType Eq 'B' Or PropertyType Eq 'C'"
```

**Updated filter:**
```python
property_filter = "PropertyType Eq 'A' Or PropertyType Eq 'B' Or PropertyType Eq 'C' Or PropertyType Eq 'D'"
```

**Expected impact:**
- GPS MLS: +~500 Land listings
- CRMLS: +~1,200 Land listings

**Checklist:**
- [ ] Update fetch.py (GPS) line 52
- [ ] Update crmls/fetch.py line 52
- [ ] Run test fetch for GPS
- [ ] Verify Land listings returned
- [ ] Check flatten.py handles Land properly (landType derivation)

**Files:**
- `src/scripts/mls/backend/fetch.py`
- `src/scripts/mls/backend/crmls/fetch.py`

---

### Card 3: Fix SkipToken Pagination Bug
**Description:**
**CRITICAL BUG**: Current implementation uses listing ID as skiptoken, which can cause missed records or infinite loops.

**Wrong (current):**
```python
skiptoken = batch[-1].get("Id")  # Using listing ID
```

**Correct:**
```python
response_data = res.json().get("D", {})
skiptoken = response_data.get("SkipToken")  # API-provided token
```

**Impact:**
- May miss records during pagination
- Possible infinite loops
- Inaccurate total counts

**Checklist:**
- [ ] Update fetch.py pagination logic
- [ ] Update crmls/fetch.py pagination logic
- [ ] Test with large result set (>1000 listings)
- [ ] Verify no duplicates
- [ ] Verify complete data

**Files:**
- `src/scripts/mls/backend/fetch.py` (line 71)
- `src/scripts/mls/backend/crmls/fetch.py` (line 71)

**Reference:**
- `docs/MLS_FETCH_IMPROVEMENTS.md`
- `docs/REPLICATION_GUIDE.md`

---

### Card 4: Add _expand=Media to Fetch Scripts
**Description:**
Add `_expand=Media` parameter to fetch scripts to embed photo URLs in listing data. This will allow us to deprecate `cache_photos.py`.

**Current:**
```python
url = f"{BASE_URL}?_filter={combined_filter}&_limit=1000"
```

**Updated:**
```python
url = f"{BASE_URL}?_filter={combined_filter}&_limit=1000&_expand=Media"
```

**Benefits:**
- Photos embedded in listing data
- No need for separate photo caching step
- One less script to maintain

**Checklist:**
- [ ] Add `_expand=Media` to fetch.py
- [ ] Add `_expand=Media` to crmls/fetch.py
- [ ] Verify Media array in raw response
- [ ] Verify flatten.py preserves Media array
- [ ] Test with listing that has photos
- [ ] Test with listing without photos

**Files:**
- `src/scripts/mls/backend/fetch.py`
- `src/scripts/mls/backend/crmls/fetch.py`
- `src/scripts/mls/backend/flatten.py`

---

## List 2: Phase 2 - Unified Fetch (Week 2-3)

### Card 5: Create unified-fetch.py Script
**Description:**
Create new unified fetch script that fetches from all 8 MLSs in a single run.

**Features:**
- Fetch from all 8 MLS associations
- Per-MLS PropertyType mapping
- Correct SkipToken pagination
- _expand=Media for photos
- Error handling and logging
- Progress tracking

**MLS IDs:**
```python
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
```

**Checklist:**
- [ ] Create unified-fetch.py
- [ ] Add all 8 MLS IDs
- [ ] Add PropertyType filters (A, B, C, D)
- [ ] Implement correct SkipToken pagination
- [ ] Add _expand=Media
- [ ] Add progress logging
- [ ] Pass mls_short_name to flatten.py
- [ ] Test with GPS MLS only first

**Files:**
- NEW: `src/scripts/mls/backend/unified-fetch.py`

**Reference:**
- `docs/UNIFIED_MLS_ARCHITECTURE.md`
- `local-logs/mls_datashare_complete.json`

---

### Card 6: Test unified-fetch.py with GPS MLS
**Description:**
Run initial test of unified-fetch.py with GPS MLS only (smallest MLS) to verify functionality.

**Test checklist:**
- [ ] Fetch completes without errors
- [ ] SkipToken pagination works correctly
- [ ] All PropertyTypes included (A, B, C, D)
- [ ] Media array present in results
- [ ] mlsSource and mlsId fields set correctly
- [ ] Compare count to current GPS listings (~5,646 + Land)
- [ ] Spot check 10 random listings for data quality
- [ ] Verify no duplicates

**Expected results:**
- ~6,000-6,500 listings (including Land)
- All fields properly flattened
- Media array with CDN URLs

---

### Card 7: Create unified_listings MongoDB Collection
**Description:**
Create new MongoDB collection for unified listings with comprehensive indexes.

**Collection:** `unified_listings`

**Indexes:**
```javascript
db.unified_listings.createIndexes([
  // Unique identifier
  { slug: 1 }, // unique

  // MLS tracking
  { mlsSource: 1 },
  { mlsId: 1 },

  // Geospatial
  { location: "2dsphere" },

  // Property search
  { city: 1, propertyType: 1, listPrice: 1 },
  { postalCode: 1, propertyType: 1 },
  { propertyType: 1, bedroomsTotal: 1, bathroomsTotalDecimal: 1 },

  // Status
  { standardStatus: 1 },
  { statusChangeTimestamp: -1 },

  // City/subdivision context
  { "cityContext.slug": 1 },
  { "subdivisionContext.slug": 1 }
])
```

**Checklist:**
- [ ] Create collection
- [ ] Add all indexes
- [ ] Verify index creation
- [ ] Test query performance
- [ ] Document schema

**Files:**
- NEW: `src/scripts/mls/backend/create-unified-collection.js`

---

### Card 8: Update seed.py for Unified Collection
**Description:**
Update seed.py to:
1. Target `unified_listings` collection
2. Add city/subdivision context embedding
3. Support both active and closed collections

**Features:**
- Collection name parameter
- City context lookup and embedding
- Subdivision context lookup and embedding
- Bulk insert optimization

**Checklist:**
- [ ] Add collection_name parameter
- [ ] Implement city context embedding
- [ ] Implement subdivision context embedding
- [ ] Add bulk insert (1000 records/batch)
- [ ] Add progress logging
- [ ] Test with GPS flattened data

**Files:**
- `src/scripts/mls/backend/seed.py`

---

### Card 9: Run Full Unified Fetch for All 8 MLSs
**Description:**
Execute unified-fetch.py for all 8 MLSs to populate unified_listings collection.

**Expected results:**
- Total: ~87,604 active listings (all 8 MLSs)
- GPS: ~6,000
- CRMLS: ~55,000
- CLAW: ~14,000
- Others: ~12,000

**Checklist:**
- [ ] Run unified-fetch.py for all MLSs
- [ ] Monitor for errors
- [ ] Run flatten.py on results
- [ ] Run seed.py to unified_listings
- [ ] Verify total count (~87,604)
- [ ] Verify all MLSs represented
- [ ] Spot check data quality
- [ ] Verify geospatial data (location field)
- [ ] Verify city/subdivision context

**Estimated time:** 2-3 hours

---

## List 3: Phase 3 - API Routes (Week 4-5)

### Card 10: Create /api/unified-listings Route
**Description:**
Create new universal API endpoint for all listing queries.

**Features:**
- City filtering
- Subdivision filtering
- PropertyType filtering
- MLS filtering
- Geospatial queries (map bounds)
- Pagination
- Sorting

**Example queries:**
```
/api/unified-listings?city=Palm+Springs
/api/unified-listings?propertyType=D&city=Coachella
/api/unified-listings?mlsSource=GPS_MLS,CRMLS
/api/unified-listings?bounds=-116.5,33.8,-116.3,33.9
```

**Checklist:**
- [ ] Create route file
- [ ] Add query parameter parsing
- [ ] Implement filters
- [ ] Add geospatial queries
- [ ] Add pagination
- [ ] Add Cloudflare cache headers
- [ ] Test with various filters
- [ ] Document API

**Files:**
- NEW: `src/app/api/unified-listings/route.ts`

**Reference:**
- `docs/UNIFIED_MLS_ARCHITECTURE.md`

---

### Card 11-12: Update City and Subdivision APIs
(Abbreviated - see docs for details)

---

### Card 13-14: Update AI Tools
(Abbreviated - see docs for details)

---

## List 4: Phase 4 - CMA Closed Listings (Week 5-8)

### Card 22: Create unified_listings_closed Collection
**Description:**
Create separate collection for closed listings (past 5 years) for CMA analysis.

**Collection:** `unified_listings_closed`

**CMA-specific indexes:**
```javascript
db.unified_listings_closed.createIndexes([
  // Date queries
  { closeDate: -1 },
  { statusChangeTimestamp: -1 },

  // Geospatial (radius search for comps)
  { location: "2dsphere" },

  // CMA similarity queries
  {
    city: 1,
    propertyType: 1,
    bedroomsTotal: 1,
    bathroomsTotalDecimal: 1,
    closeDate: -1
  },

  // Price analysis
  { city: 1, closePrice: 1, closeDate: -1 },
  { postalCode: 1, closePrice: 1, closeDate: -1 }
])
```

**Checklist:**
- [ ] Create collection
- [ ] Add CMA indexes
- [ ] Test index performance
- [ ] Document schema

**Expected size:**
- ~400,000 closed listings (5 years)
- ~2.4 GB storage

**Files:**
- NEW: `src/scripts/mls/backend/create-closed-collection.js`

---

### Card 23: Create fetch-closed-listings.py Script
**Description:**
Create script to fetch historical closed listings from past 5 years across all 8 MLSs.

**Filter:**
```python
five_years_ago = (datetime.now() - timedelta(days=365*5)).strftime("%Y-%m-%d")

filter = (
    f"MlsId Eq '{mls_id}' "
    f"And StandardStatus Eq 'Closed' "
    f"And CloseDate Ge {five_years_ago}"
)
```

**Features:**
- Fetch closed listings (StandardStatus = 'Closed')
- Date filter (CloseDate >= 5 years ago)
- All 8 MLSs
- All PropertyTypes (A, B, C, D)
- Correct SkipToken pagination
- _expand=Media

**Checklist:**
- [ ] Create fetch-closed-listings.py
- [ ] Add 5-year date calculation
- [ ] Add Closed filter
- [ ] Add all 8 MLSs
- [ ] Implement pagination
- [ ] Add progress logging
- [ ] Test with GPS MLS first

**Files:**
- NEW: `src/scripts/mls/backend/fetch-closed-listings.py`

**Reference:**
- `docs/CMA_CLOSED_LISTINGS_STRATEGY.md`
- `src/scripts/mls/test-closed-listings.py`

---

### Card 24: Run Test Backfill (GPS MLS Only)
**Description:**
Test closed listings fetch with GPS MLS only before running full backfill.

**Test checklist:**
- [ ] Run fetch-closed-listings.py for GPS only
- [ ] Verify CloseDate field populated
- [ ] Verify ClosePrice field populated
- [ ] Spot check 50 random listings
- [ ] Verify date range (5 years)
- [ ] Check for duplicates
- [ ] Flatten results
- [ ] Seed to unified_listings_closed
- [ ] Verify data in collection

**Expected results:**
- GPS: ~10,000-15,000 closed listings (5 years)

---

### Card 25-27: Full Closed Listings Backfill
(Run for all 8 MLSs, verify data quality, ~400K listings total)

---

### Card 28: Create /api/cma/comparables Endpoint
**Description:**
Create API endpoint to find comparable sales for CMA generation.

**Features:**
- Geographic proximity (radius search)
- Property similarity (beds/baths/sqft)
- Recent sales (6-12 months)
- Statistics calculation

**Example query:**
```
/api/cma/comparables?
  city=Palm+Springs
  &propertyType=A
  &bedrooms=3
  &bathrooms=2
  &sqft=1500
  &lat=33.8303
  &lon=-116.5453
  &months=6
  &radius=1.0
```

**Response:**
```json
{
  "comparables": [
    {
      "slug": "...",
      "unparsedAddress": "123 Main St, Palm Springs, CA 92262",
      "closeDate": "2025-11-15",
      "closePrice": 535000,
      "listPrice": 549000,
      "daysOnMarket": 34,
      "bedroomsTotal": 3,
      "bathroomsTotalDecimal": 2.0,
      "livingArea": 1450
    }
  ],
  "stats": {
    "avgClosePrice": 542000,
    "medianClosePrice": 535000,
    "avgDaysOnMarket": 38,
    "avgPricePerSqft": 368,
    "count": 8
  }
}
```

**Checklist:**
- [ ] Create route
- [ ] Implement geospatial query
- [ ] Add similarity filters
- [ ] Calculate statistics
- [ ] Add caching headers
- [ ] Test with real properties
- [ ] Document API

**Files:**
- NEW: `src/app/api/cma/comparables/route.ts`

---

### Card 29-31: CMA AI Integration
(Create AI tool, update prompts, test CMA generation)

---

### Card 32: Create sync-closed-listings.py Script
**Description:**
Create daily incremental sync script for closed listings.

**Filter:**
```python
yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ")

filter = (
    f"MlsId Eq '{mls_id}' "
    f"And StandardStatus Eq 'Closed' "
    f"And StatusChangeTimestamp Ge {yesterday}"
)
```

**Features:**
- Fetch recently closed listings (last 24 hours)
- Update existing records
- Insert new records
- Log changes

**Checklist:**
- [ ] Create sync script
- [ ] Use StatusChangeTimestamp filter
- [ ] Implement upsert logic
- [ ] Add logging
- [ ] Test with sample data
- [ ] Verify no duplicates

**Files:**
- NEW: `src/scripts/mls/backend/sync-closed-listings.py`

---

### Card 33: Set Up Daily Cron Job
**Description:**
Configure cron job to run closed listings sync daily at 2 AM PST.

**Cron entry:**
```bash
0 2 * * * cd /path/to/jpsrealtor && python src/scripts/mls/sync-closed-listings.py >> /var/log/mls-sync-closed.log 2>&1
```

**Checklist:**
- [ ] Add cron entry
- [ ] Test manual execution
- [ ] Verify logging
- [ ] Set up log rotation
- [ ] Add monitoring alerts

---

### Card 34: Add Sync Monitoring and Alerts
**Description:**
Set up monitoring for daily sync failures.

**Checklist:**
- [ ] Create health check endpoint
- [ ] Add last sync timestamp
- [ ] Email alerts on failure
- [ ] Dashboard for data freshness
- [ ] Weekly report of sync stats

---

### Card 35: Documentation and Training
**Description:**
Final documentation and team training.

**Deliverables:**
- [ ] API documentation
- [ ] CMA usage guide
- [ ] AI prompt examples
- [ ] Troubleshooting guide
- [ ] Team training session

---

## Priority Summary

**Week 1 (Cards 1-4):** Quick wins
- Enhance flatten.py
- Add PropertyType D
- Fix SkipToken bug
- Add Media expansion

**Week 2-3 (Cards 5-9):** Unified fetch
- Create unified-fetch.py
- Test with GPS
- Create unified_listings collection
- Run full fetch

**Week 4-5 (Cards 10-14):** API routes
- Create /api/unified-listings
- Update city/subdivision APIs
- Update AI tools

**Week 5-8 (Cards 22-35):** CMA implementation
- Create closed collection
- Fetch closed listings (~400K)
- Build CMA API
- AI integration
- Daily sync

**Total Timeline:** 8 weeks

---

## How to Import to Trello

### Option 1: Manual Creation
Copy each card title and description into Trello manually.

### Option 2: Trello API (Automated)
Use the Trello API to create cards programmatically:

1. Get your API key: https://trello.com/app-key
2. Get your token: https://trello.com/1/authorize?key=YOUR_KEY&scope=read,write&expiration=never&response_type=token
3. Run import script (provide script separately)

### Option 3: CSV Import
Export this as CSV and use Trello's import feature.

---

**Status**: Ready for Trello import
**Total Cards**: 35
**Total Lists**: 4
**Estimated Completion**: 8 weeks
