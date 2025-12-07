# CMA Closed Listings Strategy

**Date**: December 4, 2025
**Purpose**: Fetch closed listings from the past 5 years across all 8 MLS associations for AI-generated Comparative Market Analysis (CMA) reports

---

## Executive Summary

### The Opportunity

Closed listings are **critical for accurate CMA generation** because they provide:
- **Actual sale prices** (not just list prices)
- **Days on market** (time to close)
- **Price changes** (original vs final)
- **Market trends** (seasonal patterns, appreciation rates)
- **Comparable sales** (recent comps for AI analysis)

### The Numbers

Based on testing with GPS MLS (5,646 active listings):

| Metric | Estimate |
|--------|----------|
| **Active Listings (all 8 MLSs)** | 87,604 |
| **Closed Listings (5 years)** | ~350,000-450,000 |
| **Total Database Size** | ~440,000-540,000 listings |
| **Multiplier** | **4-5x current size** |

### Why This Matters for AI CMAs

**Current limitation**: AI only sees active listings → Can't provide accurate market analysis

**With closed listings**:
- "This home is similar to 123 Main St, which sold for $X last month"
- "Average time on market in this neighborhood: 45 days"
- "Homes in this price range appreciate 8% annually"
- "3 similar properties sold within 5% of list price"

---

## Technical Discovery

### Available Data

✅ **Closed listings ARE available** via replication API
✅ **CloseDate field** exists and is populated
✅ **ClosePrice field** tracks actual sale price
✅ **StatusChangeTimestamp** tracks when listing closed
✅ **StandardStatus = 'Closed'** filter works correctly

### API Query Syntax

```python
# Closed listings from last 5 years
five_years_ago = "2020-12-04"  # Dynamic calculation

filter = (
    f"MlsId Eq '{mls_id}' "
    f"And StandardStatus Eq 'Closed' "
    f"And CloseDate Ge {five_years_ago}"
)

# Note: Pagination.TotalRows may return 0, but results ARE returned
# Must paginate through all results using SkipToken
```

### Sample Closed Listing

```json
{
  "slug": "3yd-GPS-XX19077313",
  "standardStatus": "Closed",
  "mlsStatus": "Closed",
  "closeDate": "2025-12-03",
  "closePrice": 535000,
  "listPrice": 549000,
  "statusChangeDate": "2025-12-03",
  "statusChangeTimestamp": "2025-12-03T12:07:18Z",
  "daysOnMarket": 34,
  "unparsedAddress": "32220 Shifting Sands Trail, Cathedral City, CA 92234",
  "propertyType": "A",
  "bedroomsTotal": 3,
  "bathroomsTotalInteger": 2,
  // ... all other RESO fields
}
```

---

## Implementation Strategy

### Phase 1: Separate Collection Approach ✅ RECOMMENDED

**Why separate?**
1. **Different use cases**: Active (property search) vs Closed (CMA/analytics)
2. **Different query patterns**: Active needs speed, Closed needs analytics
3. **Easier to manage**: Can rebuild closed data without touching active
4. **Better indexing**: Different indexes for different needs

**Collection structure:**

```javascript
// MongoDB Collections
db.unified_listings        // Active + Pending listings (87,604)
db.unified_listings_closed // Closed listings only (350K-450K)
```

**Indexes for closed collection:**

```javascript
db.unified_listings_closed.createIndexes([
  // Geographic queries
  { location: "2dsphere" },

  // Date range queries
  { closeDate: -1 },
  { statusChangeTimestamp: -1 },

  // Property filtering
  { city: 1, closeDate: -1 },
  { postalCode: 1, closeDate: -1 },
  { propertyType: 1, closeDate: -1 },

  // Price analysis
  { closePrice: 1 },
  { city: 1, closePrice: 1, closeDate: -1 },

  // Compound for CMA queries
  {
    city: 1,
    propertyType: 1,
    bedroomsTotal: 1,
    closeDate: -1
  }
])
```

### Phase 2: Fetch Strategy

**Initial fetch** (Historical backfill - Run once)

```python
#!/usr/bin/env python3
"""
fetch-closed-listings.py

Fetches ALL closed listings from the past 5 years across all 8 MLSs.
Run once for initial backfill, then use incremental sync.
"""

from datetime import datetime, timedelta

# Calculate 5 years ago
five_years_ago = (datetime.now() - timedelta(days=365*5)).strftime("%Y-%m-%d")

# All 8 MLS IDs
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

# PropertyType codes (same as active listings)
PROPERTY_TYPES = ["A", "B", "C", "D"]  # Residential, Lease, Income, Land

for mls_name, mls_id in MLS_IDS.items():
    for property_type in PROPERTY_TYPES:
        # Build filter
        filter_str = (
            f"MlsId Eq '{mls_id}' "
            f"And PropertyType Eq '{property_type}' "
            f"And StandardStatus Eq 'Closed' "
            f"And CloseDate Ge {five_years_ago}"
        )

        # Fetch with pagination using SkipToken
        skiptoken = None
        batch_number = 0

        while True:
            # Build URL
            url = f"{BASE_URL}?_filter={filter_str}&_limit=1000"
            if skiptoken:
                url += f"&_skiptoken={skiptoken}"

            # Fetch batch
            response = requests.get(url, headers=headers, timeout=30)
            data = response.json().get("D", {})
            results = data.get("Results", [])

            if not results:
                break  # No more results

            batch_number += 1
            print(f"[{mls_name}] PropertyType {property_type} - Batch {batch_number}: {len(results)} listings")

            # Save to JSON (to be flattened and seeded)
            save_batch(results, mls_name, property_type, batch_number)

            # Get next skiptoken (CRITICAL: Use API-provided token!)
            skiptoken = data.get("SkipToken")
            if not skiptoken:
                break  # No more pages
```

**Incremental sync** (Daily updates)

```python
#!/usr/bin/env python3
"""
sync-closed-listings.py

Updates closed listings that changed in the last 24 hours.
Run daily via cron.
"""

from datetime import datetime, timedelta

# Yesterday
yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ")

for mls_name, mls_id in MLS_IDS.items():
    # Fetch recently closed listings
    filter_str = (
        f"MlsId Eq '{mls_id}' "
        f"And StandardStatus Eq 'Closed' "
        f"And StatusChangeTimestamp Ge {yesterday}"
    )

    # Fetch and update database
    # ... (similar pagination logic)
```

### Phase 3: Pipeline Updates

**1. Update flatten.py**

```python
# Add closed-specific fields
def flatten_listing(raw_listing, mls_short_name, mls_id):
    # ... existing flattening

    # Add closed listing fields
    flattened["closeDate"] = standard.get("CloseDate")
    flattened["closePrice"] = standard.get("ClosePrice")
    flattened["daysOnMarket"] = standard.get("DaysOnMarket")
    flattened["cumulativeDaysOnMarket"] = standard.get("CumulativeDaysOnMarket")
    flattened["priceChangeTimestamp"] = standard.get("PriceChangeTimestamp")

    return flattened
```

**2. Update seed.py**

```python
# Add closed collection target
def seed_listings(flattened_file, collection_name):
    """
    collection_name: 'unified_listings' or 'unified_listings_closed'
    """
    # ... existing seeding logic

    # Different indexes for closed collection
    if collection_name == 'unified_listings_closed':
        create_closed_indexes(db[collection_name])
```

### Phase 4: API Routes for CMA

**New endpoint:** `/api/cma/comparables`

```typescript
// src/app/api/cma/comparables/route.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Subject property details
  const city = searchParams.get('city');
  const propertyType = searchParams.get('propertyType');
  const bedrooms = parseInt(searchParams.get('bedrooms') || '0');
  const bathrooms = parseFloat(searchParams.get('bathrooms') || '0');
  const sqft = parseInt(searchParams.get('sqft') || '0');
  const lat = parseFloat(searchParams.get('lat') || '0');
  const lon = parseFloat(searchParams.get('lon') || '0');

  // CMA parameters
  const months = parseInt(searchParams.get('months') || '6'); // Default 6 months
  const radius = parseFloat(searchParams.get('radius') || '1.0'); // Miles

  // Calculate date cutoff
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);

  // Query closed listings
  const comparables = await db.collection('unified_listings_closed').find({
    // Geographic proximity (1 mile radius)
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lon, lat] },
        $maxDistance: radius * 1609.34 // Convert miles to meters
      }
    },

    // Property similarity
    propertyType: propertyType,
    bedroomsTotal: { $gte: bedrooms - 1, $lte: bedrooms + 1 },
    bathroomsTotalDecimal: { $gte: bathrooms - 1, $lte: bathrooms + 1 },
    livingArea: { $gte: sqft * 0.8, $lte: sqft * 1.2 }, // +/- 20%

    // Recent sales
    closeDate: { $gte: cutoffDate.toISOString().split('T')[0] }
  })
  .sort({ closeDate: -1 })
  .limit(10)
  .toArray();

  // Calculate statistics
  const stats = {
    avgClosePrice: average(comparables.map(c => c.closePrice)),
    medianClosePrice: median(comparables.map(c => c.closePrice)),
    avgDaysOnMarket: average(comparables.map(c => c.daysOnMarket)),
    avgPricePerSqft: average(comparables.map(c => c.closePrice / c.livingArea)),
    priceRange: {
      min: Math.min(...comparables.map(c => c.closePrice)),
      max: Math.max(...comparables.map(c => c.closePrice))
    },
    count: comparables.length
  };

  return Response.json({ comparables, stats });
}
```

### Phase 5: AI Integration

**Update AI system prompt:**

```typescript
const CMA_SYSTEM_PROMPT = `
You are a real estate CMA (Comparative Market Analysis) expert.

When generating a CMA, you have access to:
1. Active listings (current market inventory)
2. Closed listings (actual sales from past 5 years)

For accurate CMAs, use the getCMAComparables tool to find recent sales of similar properties.

Key metrics to analyze:
- Median sale price vs list price ratio
- Average days on market
- Price per square foot trends
- Seasonal patterns
- Neighborhood appreciation rates

Always cite specific comparables with addresses and sale dates.
`;
```

**New AI tool:**

```typescript
const CMA_TOOLS = [
  {
    name: "getCMAComparables",
    description: "Find recent closed sales similar to a subject property for CMA analysis",
    input_schema: {
      type: "object",
      properties: {
        city: { type: "string" },
        propertyType: { type: "string", enum: ["A", "B", "C", "D"] },
        bedrooms: { type: "number" },
        bathrooms: { type: "number" },
        sqft: { type: "number" },
        latitude: { type: "number" },
        longitude: { type: "number" },
        months: { type: "number", description: "How many months back to search (default 6)" },
        radius: { type: "number", description: "Search radius in miles (default 1.0)" }
      },
      required: ["city", "propertyType", "bedrooms", "bathrooms", "sqft"]
    }
  }
];
```

---

## Data Volume Analysis

### Storage Requirements

**Per listing (flattened):**
- Average size: ~6 KB (after flattening, without nulls)

**Total storage:**

| Collection | Listings | Size per | Total Size |
|-----------|----------|----------|------------|
| unified_listings (active) | 87,604 | 6 KB | ~530 MB |
| unified_listings_closed (5 years) | 400,000 | 6 KB | ~2.4 GB |
| **Total** | **487,604** | | **~3 GB** |

**With indexes:**
- Active collection indexes: ~100 MB
- Closed collection indexes: ~500 MB
- **Total with indexes: ~3.6 GB**

**MongoDB Atlas M10 tier:**
- Storage: 10 GB included
- **Plenty of room** for closed listings

### Fetch Time Estimates

**Initial backfill:**
- 400,000 listings @ 1,000/batch = 400 batches
- ~2 seconds per batch = ~800 seconds = **13-15 minutes per MLS**
- 8 MLSs = **~2 hours total** (can run in parallel)

**Daily incremental sync:**
- Estimated 500-1,000 newly closed listings per day
- 1-2 batches per MLS
- **< 5 minutes total**

---

## Rollout Plan

### Week 1: Infrastructure
- [ ] Create `unified_listings_closed` collection schema
- [ ] Add closed collection indexes
- [ ] Create `fetch-closed-listings.py` script
- [ ] Create `sync-closed-listings.py` script
- [ ] Update `flatten.py` with closeDate, closePrice fields
- [ ] Update `seed.py` to support closed collection

### Week 2: Initial Data Load
- [ ] Run initial backfill for GPS MLS (test with 1 MLS first)
- [ ] Verify data quality (spot check 50 listings)
- [ ] Run backfill for all 8 MLSs
- [ ] Verify total count and date ranges
- [ ] Test query performance

### Week 3: API Development
- [ ] Create `/api/cma/comparables` endpoint
- [ ] Add geographic queries (radius search)
- [ ] Add similarity filters (beds/baths/sqft)
- [ ] Add statistics calculations
- [ ] Test with real-world CMA scenarios

### Week 4: AI Integration
- [ ] Add `getCMAComparables` AI tool
- [ ] Update system prompt for CMA context
- [ ] Test CMA generation with AI
- [ ] Refine prompts based on output quality

### Week 5: Automation
- [ ] Set up daily cron job for `sync-closed-listings.py`
- [ ] Add monitoring/alerts for sync failures
- [ ] Create dashboard for data freshness

### Week 6: Production
- [ ] Deploy to production
- [ ] Monitor performance
- [ ] Gather user feedback
- [ ] Iterate on AI prompts

---

## Key Decisions

### ✅ Decision 1: Separate Collection

**Chosen**: `unified_listings_closed` (separate from active)

**Rationale:**
- Different use cases
- Different query patterns
- Easier maintenance
- Better performance (targeted indexes)

### ✅ Decision 2: 5-Year Window

**Chosen**: CloseDate >= 5 years ago

**Rationale:**
- Industry standard for CMAs (3-6 month comps, up to 12 months)
- 5 years allows trend analysis
- Reasonable data size (~400K listings)

**Alternative considered**: 3 years (smaller dataset, faster queries)

### ✅ Decision 3: Daily Sync

**Chosen**: Daily incremental sync using StatusChangeTimestamp

**Rationale:**
- CMA data doesn't need real-time updates
- Daily is fresh enough for accurate analysis
- Reduces API load vs hourly

**Alternative considered**: Weekly (less accurate, harder to debug issues)

### ✅ Decision 4: Include All PropertyTypes

**Chosen**: A, B, C, D (Residential, Lease, Income, Land)

**Rationale:**
- CMAs needed for all property types
- Land sales are important comparables
- Minimal additional storage cost

---

## Risks & Mitigations

### Risk 1: Data Volume Overwhelming Database

**Impact**: Medium
**Likelihood**: Low

**Mitigation:**
- MongoDB Atlas M10 has 10 GB (we need ~3.6 GB)
- Can upgrade to M20 (20 GB) if needed
- Can implement data retention policy (drop listings > 7 years)

### Risk 2: Slow CMA Queries

**Impact**: High (bad UX)
**Likelihood**: Low

**Mitigation:**
- Comprehensive indexes on closed collection
- Geospatial index for radius queries
- Compound indexes for common filters
- Cloudflare caching for repeated queries
- Limit comparables to 10-20 results

### Risk 3: Stale Closed Data

**Impact**: Medium (inaccurate CMAs)
**Likelihood**: Low

**Mitigation:**
- Daily sync via cron
- Monitoring/alerts for sync failures
- Dashboard showing last sync timestamp
- Manual re-sync option

### Risk 4: API Rate Limiting

**Impact**: High (failed fetches)
**Likelihood**: Low

**Mitigation:**
- Batch fetches at 1,000/batch (tested, works)
- Add exponential backoff on errors
- Run initial backfill during off-peak hours
- Spread across multiple days if needed

---

## Success Metrics

### Data Completeness
- ✅ **Target**: 350,000-450,000 closed listings (5 years)
- ✅ **Verify**: All 8 MLSs represented
- ✅ **Verify**: PropertyTypes A, B, C, D included
- ✅ **Verify**: Date range covers full 5 years

### Query Performance
- ✅ **Target**: < 200ms for CMA comparables query
- ✅ **Target**: < 50ms with Cloudflare cache
- ✅ **Verify**: Indexes used (check query plans)

### Data Freshness
- ✅ **Target**: Daily sync completes < 5 minutes
- ✅ **Target**: 99.5% uptime for sync cron
- ✅ **Verify**: Last sync timestamp < 24 hours

### CMA Quality
- ✅ **Target**: Find 5-10 comparables for 80% of queries
- ✅ **Target**: Comparables within 1 mile radius
- ✅ **Target**: Comparables within 6 months
- ✅ **Verify**: AI-generated CMAs cite actual addresses and sale prices

---

## Cron Job Configuration

**Daily sync** (runs at 2 AM PST every day)

```bash
# crontab entry
0 2 * * * cd /path/to/jpsrealtor && python src/scripts/mls/sync-closed-listings.py >> /var/log/mls-sync-closed.log 2>&1
```

**Weekly full refresh** (Sunday 3 AM - verify no missing data)

```bash
# crontab entry
0 3 * * 0 cd /path/to/jpsrealtor && python src/scripts/mls/verify-closed-listings.py >> /var/log/mls-verify-closed.log 2>&1
```

---

## Next Steps

1. **Review this strategy** with stakeholders
2. **Update todo list** with closed listings tasks
3. **Create Trello cards** for each phase
4. **Begin Week 1** (Infrastructure setup)

---

**Status**: Strategy complete, ready for implementation
**Estimated timeline**: 6 weeks
**Estimated storage**: 3.6 GB (well within limits)
**Estimated value**: 4-5x more data for AI CMAs
