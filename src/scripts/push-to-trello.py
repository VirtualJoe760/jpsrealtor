#!/usr/bin/env python3
"""
Push Unified MLS + CMA tasks to Trello

Creates lists and cards for the complete implementation roadmap.
"""

import os
import requests
from pathlib import Path
from dotenv import load_dotenv
import time

# Load environment
env_path = Path(__file__).resolve().parents[2] / ".env.local"
load_dotenv(dotenv_path=env_path)

API_KEY = os.getenv("TRELLO_API_KEY")
TOKEN = os.getenv("TRELLO_TOKEN")
BOARD_ID = os.getenv("TRELLO_BOARD_ID")

BASE_URL = "https://api.trello.com/1"

def create_list(name, board_id):
    """Create a new list on the board"""
    url = f"{BASE_URL}/lists"
    params = {
        "key": API_KEY,
        "token": TOKEN,
        "name": name,
        "idBoard": board_id
    }
    response = requests.post(url, params=params)
    if response.status_code == 200:
        list_data = response.json()
        print(f"[OK] Created list: {name}")
        return list_data["id"]
    else:
        print(f"[ERR] Failed to create list {name}: {response.text}")
        return None

def create_card(name, desc, list_id, labels=None):
    """Create a new card in a list"""
    url = f"{BASE_URL}/cards"
    params = {
        "key": API_KEY,
        "token": TOKEN,
        "name": name,
        "desc": desc,
        "idList": list_id
    }
    if labels:
        params["idLabels"] = labels

    response = requests.post(url, params=params)
    if response.status_code == 200:
        print(f"  [OK] Created card: {name}")
        return response.json()["id"]
    else:
        print(f"  [ERR] Failed to create card {name}: {response.text[:100]}")
        return None

def main():
    print("="*80)
    print("PUSHING UNIFIED MLS + CMA TASKS TO TRELLO")
    print("="*80)
    print(f"\nBoard ID: {BOARD_ID}")
    print()

    # Phase 1: Quick Wins (Week 1)
    print("\n[LIST] Creating Phase 1: Quick Wins (Week 1)")
    list1_id = create_list("Phase 1: Quick Wins (Week 1)", BOARD_ID)
    time.sleep(0.5)

    if list1_id:
        cards_phase1 = [
            {
                "name": "1. Enhance flatten.py for Unified Architecture",
                "desc": """**Goal**: Add mlsSource, mlsId, propertyTypeName, Media fields

**Changes needed:**
- [ ] Add PROPERTY_TYPE_NAMES mapping dict
- [ ] Update flatten_listing() signature (add mls_short_name, mls_id params)
- [ ] Add mlsSource and mlsId to output
- [ ] Add propertyTypeName field
- [ ] Preserve Media array when present
- [ ] Add closeDate, closePrice fields for CMA
- [ ] Test with sample listing

**Files**: `src/scripts/mls/backend/flatten.py`
**Reference**: `docs/FLATTEN_PY_ANALYSIS.md`"""
            },
            {
                "name": "2. Add PropertyType D (Land) to Fetch Scripts",
                "desc": """**Goal**: Include Land listings (+1,700 listings)

**Update filter from:**
```python
"PropertyType Eq 'A' Or PropertyType Eq 'B' Or PropertyType Eq 'C'"
```

**To:**
```python
"PropertyType Eq 'A' Or PropertyType Eq 'B' Or PropertyType Eq 'C' Or PropertyType Eq 'D'"
```

**Checklist:**
- [ ] Update fetch.py (line 52)
- [ ] Update crmls/fetch.py (line 52)
- [ ] Test with GPS MLS
- [ ] Verify Land listings returned

**Files**:
- `src/scripts/mls/backend/fetch.py`
- `src/scripts/mls/backend/crmls/fetch.py`"""
            },
            {
                "name": "3. Fix SkipToken Pagination Bug (CRITICAL)",
                "desc": """**CRITICAL BUG**: Using listing ID as skiptoken causes missed records

**Wrong (current):**
```python
skiptoken = batch[-1].get("Id")
```

**Correct:**
```python
response_data = res.json().get("D", {})
skiptoken = response_data.get("SkipToken")
```

**Checklist:**
- [ ] Update fetch.py (line 71)
- [ ] Update crmls/fetch.py (line 71)
- [ ] Test with >1000 listings
- [ ] Verify no duplicates
- [ ] Verify complete data

**Files**: Both fetch scripts
**Reference**: `docs/MLS_FETCH_IMPROVEMENTS.md`"""
            },
            {
                "name": "4. Add _expand=Media to Fetch Scripts",
                "desc": """**Goal**: Embed photo URLs, deprecate cache_photos.py

**Add to URL:**
```python
url = f"{BASE_URL}?_filter={filter}&_limit=1000&_expand=Media"
```

**Checklist:**
- [ ] Add to fetch.py
- [ ] Add to crmls/fetch.py
- [ ] Verify Media array in response
- [ ] Verify flatten.py preserves Media
- [ ] Test with photos
- [ ] Test without photos

**Files**: Both fetch scripts + flatten.py"""
            }
        ]

        for card in cards_phase1:
            create_card(card["name"], card["desc"], list1_id)
            time.sleep(0.5)

    # Phase 2: Unified Fetch (Week 2-3)
    print("\n📋 Creating Phase 2: Unified Fetch (Week 2-3)")
    list2_id = create_list("Phase 2: Unified Fetch (Week 2-3)", BOARD_ID)
    time.sleep(0.5)

    if list2_id:
        cards_phase2 = [
            {
                "name": "5. Create unified-fetch.py Script",
                "desc": """**Goal**: Single script for all 8 MLSs

**Features:**
- Fetch from all 8 MLS associations
- Per-MLS PropertyType mapping
- Correct SkipToken pagination
- _expand=Media for photos
- Progress tracking
- Error handling

**MLS IDs:**
- GPS: 20190211172710340762000000
- CRMLS: 20200218121507636729000000
- CLAW: 20200630203341057545000000
- SOUTHLAND: 20200630203518576361000000
- HIGH_DESERT: 20200630204544040064000000
- BRIDGE: 20200630204733042221000000
- CONEJO_SIMI_MOORPARK: 20160622112753445171000000
- ITECH: 20200630203206752718000000

**Checklist:**
- [ ] Create script
- [ ] Add all 8 MLS IDs
- [ ] Add PropertyType filters (A,B,C,D)
- [ ] Implement SkipToken pagination
- [ ] Add _expand=Media
- [ ] Add logging
- [ ] Test with GPS only first

**Files**: NEW `src/scripts/mls/backend/unified-fetch.py`
**Reference**: `docs/UNIFIED_MLS_ARCHITECTURE.md`"""
            },
            {
                "name": "6. Test unified-fetch.py with GPS MLS",
                "desc": """**Goal**: Verify script works before full run

**Test checklist:**
- [ ] Fetch completes without errors
- [ ] SkipToken pagination works
- [ ] All PropertyTypes included (A,B,C,D)
- [ ] Media array present
- [ ] mlsSource/mlsId fields set
- [ ] Compare count to current (~5,646 + Land)
- [ ] Spot check 10 listings
- [ ] Verify no duplicates

**Expected**: ~6,000-6,500 listings"""
            },
            {
                "name": "7. Create unified_listings MongoDB Collection",
                "desc": """**Goal**: New collection with comprehensive indexes

**Indexes needed:**
```javascript
{ slug: 1 } // unique
{ mlsSource: 1 }
{ location: "2dsphere" } // geospatial
{ city: 1, propertyType: 1, listPrice: 1 }
{ propertyType: 1, bedroomsTotal: 1 }
{ "cityContext.slug": 1 }
{ "subdivisionContext.slug": 1 }
```

**Checklist:**
- [ ] Create collection
- [ ] Add all indexes
- [ ] Verify index creation
- [ ] Test query performance
- [ ] Document schema

**Files**: NEW `src/scripts/mls/backend/create-unified-collection.js`"""
            },
            {
                "name": "8. Update seed.py for Unified Collection",
                "desc": """**Goal**: Seed to unified_listings with context embedding

**Features:**
- Collection name parameter
- City context lookup/embedding
- Subdivision context lookup/embedding
- Bulk insert (1000/batch)
- Progress logging

**Checklist:**
- [ ] Add collection_name parameter
- [ ] Implement city context embedding
- [ ] Implement subdivision context
- [ ] Add bulk insert
- [ ] Test with GPS data

**Files**: `src/scripts/mls/backend/seed.py`"""
            },
            {
                "name": "9. Run Full Unified Fetch (All 8 MLSs)",
                "desc": """**Goal**: Populate unified_listings with 87,604 listings

**Expected results:**
- GPS: ~6,000
- CRMLS: ~55,000
- CLAW: ~14,000
- Others: ~12,000
- **Total: ~87,604**

**Checklist:**
- [ ] Run unified-fetch.py
- [ ] Monitor for errors
- [ ] Run flatten.py
- [ ] Run seed.py
- [ ] Verify total count
- [ ] Verify all MLSs present
- [ ] Spot check data quality
- [ ] Verify geospatial data
- [ ] Verify city/subdivision context

**Estimated time**: 2-3 hours"""
            }
        ]

        for card in cards_phase2:
            create_card(card["name"], card["desc"], list2_id)
            time.sleep(0.5)

    # Phase 3: API Routes (Week 4-5)
    print("\n📋 Creating Phase 3: API Routes (Week 4-5)")
    list3_id = create_list("Phase 3: API Routes (Week 4-5)", BOARD_ID)
    time.sleep(0.5)

    if list3_id:
        cards_phase3 = [
            {
                "name": "10. Create /api/unified-listings Route",
                "desc": """**Goal**: Universal search endpoint

**Features:**
- City filtering
- Subdivision filtering
- PropertyType filtering
- MLS filtering
- Geospatial queries (map bounds)
- Pagination
- Sorting
- Cloudflare cache headers

**Example queries:**
- `/api/unified-listings?city=Palm+Springs`
- `/api/unified-listings?propertyType=D&city=Coachella`
- `/api/unified-listings?mlsSource=GPS_MLS,CRMLS`
- `/api/unified-listings?bounds=-116.5,33.8,-116.3,33.9`

**Checklist:**
- [ ] Create route file
- [ ] Add query parameter parsing
- [ ] Implement filters
- [ ] Add geospatial queries
- [ ] Add pagination
- [ ] Add cache headers
- [ ] Test various filters
- [ ] Document API

**Files**: NEW `src/app/api/unified-listings/route.ts`"""
            },
            {
                "name": "11-12. Update City & Subdivision APIs",
                "desc": """**Goal**: Use unified collection, improve performance

**Changes:**
- Switch to unified_listings collection
- Simplify queries (no joins)
- Embedded context (no lookups)
- 76-81% faster responses

**APIs to update:**
- `/api/cities/[cityId]/listings`
- `/api/subdivisions/[slug]/listings`

**Checklist:**
- [ ] Update city route
- [ ] Update subdivision route
- [ ] Test performance
- [ ] Verify data correctness
- [ ] Update tests"""
            },
            {
                "name": "13-14. Update AI Tools",
                "desc": """**Goal**: Consolidate to single searchListings tool

**Before:** 2 tools (searchCity + matchLocation)
**After:** 1 tool (searchListings)

**New capabilities:**
- Multi-MLS queries
- Geospatial searches
- All property types
- Embedded context

**Checklist:**
- [ ] Update tool definition
- [ ] Implement tool execution
- [ ] Update system prompt
- [ ] Test with AI queries
- [ ] Verify 40% token reduction

**Files**: AI tool definitions + chat/stream route"""
            }
        ]

        for card in cards_phase3:
            create_card(card["name"], card["desc"], list3_id)
            time.sleep(0.5)

    # Phase 4: CMA Closed Listings (Week 6-8)
    print("\n📋 Creating Phase 4: CMA Closed Listings (Week 6-8)")
    list4_id = create_list("Phase 4: CMA Closed Listings (Week 6-8)", BOARD_ID)
    time.sleep(0.5)

    if list4_id:
        cards_phase4 = [
            {
                "name": "CMA 1. Create unified_listings_closed Collection",
                "desc": """**Goal**: Separate collection for ~400K closed listings

**CMA-specific indexes:**
```javascript
{ closeDate: -1 }
{ location: "2dsphere" } // radius search
{ city: 1, propertyType: 1, bedroomsTotal: 1, closeDate: -1 }
{ city: 1, closePrice: 1, closeDate: -1 }
```

**Expected size:**
- ~400,000 listings
- ~2.4 GB storage
- Within MongoDB M10 limits

**Checklist:**
- [ ] Create collection
- [ ] Add CMA indexes
- [ ] Test index performance

**Files**: NEW `create-closed-collection.js`
**Reference**: `docs/CMA_CLOSED_LISTINGS_STRATEGY.md`"""
            },
            {
                "name": "CMA 2. Create fetch-closed-listings.py",
                "desc": """**Goal**: Fetch 5 years of closed listings

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
- All 8 MLSs
- PropertyTypes A,B,C,D
- Correct SkipToken pagination
- _expand=Media
- Progress logging

**Checklist:**
- [ ] Create script
- [ ] Add 5-year filter
- [ ] Add all MLSs
- [ ] Test with GPS first

**Files**: NEW `fetch-closed-listings.py`"""
            },
            {
                "name": "CMA 3-4. Test & Verify Closed Data",
                "desc": """**Goal**: Validate before full backfill

**Test with GPS MLS:**
- [ ] Run fetch for GPS only
- [ ] Verify CloseDate populated
- [ ] Verify ClosePrice populated
- [ ] Spot check 50 listings
- [ ] Verify 5-year range
- [ ] Check for duplicates
- [ ] Flatten results
- [ ] Seed to closed collection

**Expected**: ~10K-15K GPS closed listings"""
            },
            {
                "name": "CMA 5. Run Full Closed Backfill (All 8 MLSs)",
                "desc": """**Goal**: Populate ~400K closed listings

**Expected by MLS:**
- GPS: ~10-15K
- CRMLS: ~150-200K
- Others: ~190-235K
- **Total: ~400,000**

**Checklist:**
- [ ] Run for all 8 MLSs
- [ ] Monitor progress
- [ ] Flatten all results
- [ ] Seed to closed collection
- [ ] Verify total count
- [ ] Verify date ranges
- [ ] Spot check quality

**Estimated time**: 2-3 hours"""
            },
            {
                "name": "CMA 6. Create /api/cma/comparables Endpoint",
                "desc": """**Goal**: Find comparable sales for CMA

**Features:**
- Geographic radius search (1 mile default)
- Property similarity (beds/baths/sqft +/- 20%)
- Recent sales (6-12 months)
- Statistics (median price, DOM, price/sqft)

**Query params:**
- city, propertyType
- bedrooms, bathrooms, sqft
- lat, lon, radius
- months (default 6)

**Response:**
```json
{
  "comparables": [...],
  "stats": {
    "avgClosePrice": 542000,
    "medianClosePrice": 535000,
    "avgDaysOnMarket": 38,
    "count": 8
  }
}
```

**Checklist:**
- [ ] Create route
- [ ] Implement geospatial query
- [ ] Add similarity filters
- [ ] Calculate stats
- [ ] Test with real properties

**Files**: NEW `/api/cma/comparables/route.ts`"""
            },
            {
                "name": "CMA 7-8. AI Integration",
                "desc": """**Goal**: Enable AI-powered CMA generation

**Tasks:**
- [ ] Create getCMAComparables AI tool
- [ ] Update system prompt with CMA context
- [ ] Test CMA generation
- [ ] Refine prompts

**AI will cite:**
- Specific addresses of comps
- Actual sale prices
- Sale dates
- Market trends
- Price recommendations

**Example output:**
"Based on 3 recent sales (123 Main St $542K, 456 Oak Ave $558K), this home should list for $535K-565K. Avg DOM: 38 days."

**Files**: AI tool definitions + system prompts"""
            },
            {
                "name": "CMA 9. Daily Sync Automation",
                "desc": """**Goal**: Keep closed listings up-to-date

**Create sync-closed-listings.py:**
```python
yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
filter = f"StandardStatus Eq 'Closed' And StatusChangeTimestamp Ge {yesterday}"
```

**Set up cron:**
```bash
0 2 * * * python sync-closed-listings.py
```

**Checklist:**
- [ ] Create sync script
- [ ] Use StatusChangeTimestamp filter
- [ ] Implement upsert logic
- [ ] Add logging
- [ ] Set up cron job (2 AM PST)
- [ ] Add monitoring/alerts

**Files**: NEW `sync-closed-listings.py`"""
            }
        ]

        for card in cards_phase4:
            create_card(card["name"], card["desc"], list4_id)
            time.sleep(0.5)

    print("\n" + "="*80)
    print("[OK] SUCCESSFULLY CREATED TRELLO BOARD")
    print("="*80)
    print(f"\nBoard ID: {BOARD_ID}")
    print(f"Total Lists: 4")
    print(f"Total Cards: ~25")
    print("\nView board at: https://trello.com/b/{BOARD_ID}")
    print("\n" + "="*80)

if __name__ == "__main__":
    main()
