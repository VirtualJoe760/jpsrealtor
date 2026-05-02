# Backend CMA Builder — Pre-compute Listing-Level CMA Stats

## Objective

Build a Python script (`build-listing-cma.py`) that runs as a nightly VPS cron job. It pre-computes a CMA for every active listing in the `unified_listings` collection and stores the result as a `cmaStats` field on each listing document — the same pattern we already use for subdivisions.

Currently, listing CMAs are generated on-demand when a user visits `/mls-listings/[slug]`. The frontend component `CMAReport.tsx` makes a client-side fetch to `/api/cma/generate?listingKey=...`, which runs the full CMA engine (5-level hierarchy search, 12-factor scoring, narrative generation). This takes 1-20+ seconds depending on cache state. By pre-computing, the data is ready instantly.

---

## Current On-Demand Flow (What We're Replacing)

```
User visits /mls-listings/[slug]
  → ListingClient.tsx renders <CMASection listingKey={key} subdivisionName={name} />
    → CMAReport.tsx useEffect fires
      → Try fast path: GET /api/cma/subdivision/{slug} (pre-computed subdivision stats)
      → Fall back: GET /api/cma/generate?listingKey={key} (on-demand, 1-20s)
        → engine.ts: generateCMA(listing)
          1. buildSubjectFromListing(listing) → extract price, sqft, beds, baths, coords, etc.
          2. classifyTier(listPrice, livingArea) → "affordable" | "residential" | "luxury"
          3. parseRemarks(publicRemarks) → detect pool, spa, view, garage, gated, golf, etc.
          4. resolveAttributes(listing, profile, remarks) → confidence-scored attributes
          5. buildSearchLevels() → 5-level hierarchy (subdivision tight → city tight → radius)
          6. searchComps() → parallel queries to unified_listings + unified_closed_listings
          7. scoreComp() → 12-factor weighted similarity score (0-100) per comp
          8. computeStats() → aggregate stats for active + closed comps
          9. generateNarrative() → text summary
          10. collectLimitations() + collectInferences() → confidence notes
        → Returns CMAResult JSON to frontend
```

---

## Target: What the Backend Script Should Produce

For each active listing, compute and store a `cmaStats` object on the document in `unified_listings`. The frontend will then read `listing.cmaStats` directly instead of making an API call.

### `cmaStats` Schema to Write on Each Listing

```python
{
    "lastUpdated": datetime.utcnow(),  # ISO timestamp
    "tier": "affordable" | "residential" | "luxury",

    # ── Subject summary (pre-extracted from the listing itself) ──
    "subject": {
        "listPrice": int,
        "livingArea": int,
        "lotSize": int,
        "bedsTotal": int,
        "bathsTotal": int,
        "yearBuilt": int,
        "pricePerSqft": int,
        "propertyType": str,       # "A" (residential sale)
        "propertySubType": str,    # "Single Family Residence"
        "landType": str,           # "Fee" or "Lease"
        "pool": bool | None,
        "spa": bool | None,
        "view": str | None,
        "garageSpaces": int,
    },

    # ── Active comps (up to 5) ──
    "activeComps": [
        {
            "listingKey": str,
            "address": str,
            "city": str,
            "subdivisionName": str | None,
            "listPrice": int,
            "livingArea": int,
            "bedsTotal": int,
            "bathsTotal": int,
            "yearBuilt": int,
            "listPricePerSqft": int,
            "daysOnMarket": int,
            "similarityScore": float,  # 0-100
            "pool": bool | None,
            "spa": bool | None,
            "view": str | None,
            "garageSpaces": int,
            "landType": str,
            "lotSize": int,
        }
    ],

    # ── Closed comps (up to 5) ──
    "closedComps": [
        {
            "listingKey": str,
            "address": str,
            "city": str,
            "subdivisionName": str | None,
            "closePrice": int,
            "closeDate": str,          # ISO date
            "listPrice": int,
            "livingArea": int,
            "bedsTotal": int,
            "bathsTotal": int,
            "yearBuilt": int,
            "salePricePerSqft": int,
            "salePriceToListRatio": float,  # e.g. 0.965
            "daysOnMarket": int,
            "similarityScore": float,  # 0-100
            "pool": bool | None,
            "spa": bool | None,
            "view": str | None,
            "garageSpaces": int,
            "landType": str,
            "lotSize": int,
        }
    ],

    # ── Aggregated stats ──
    "stats": {
        "active": {
            "count": int,
            "avgPrice": int,
            "minPrice": int,
            "maxPrice": int,
            "medianPrice": int,
            "avgPricePerSqft": int,
            "avgSqft": int,
            "avgDaysOnMarket": int,
            "avgLotSize": int,
        },
        "closed": {
            "count": int,
            "avgPrice": int,
            "minPrice": int,
            "maxPrice": int,
            "medianPrice": int,
            "avgPricePerSqft": int,
            "avgSqft": int,
            "avgDaysOnMarket": int,
            "avgLotSize": int,
            "avgSalePriceToListRatio": float,  # e.g. 0.972
        }
    },

    # ── Search metadata ──
    "searchCriteria": {
        "levelsUsed": { "active": int, "closed": int },  # 1-5
        "subdivisionMatched": bool,
        "totalCandidatesEvaluated": { "active": int, "closed": int },
    },

    # ── Text analysis ──
    "narrative": str,        # 2-4 sentence market positioning summary
    "limitations": [str],    # Confidence warnings
    "inferences": [str],     # Attribute inference notes

    # ── Quality ──
    "quality": {
        "confidence": "high" | "good" | "medium" | "low" | "insufficient",
        "activeCompCount": int,
        "closedCompCount": int,
    }
}
```

---

## Algorithm to Implement (Port from TypeScript)

### Step 1: Tier Classification

```python
def classify_tier(list_price: int, living_area: int) -> str:
    if list_price > 1_500_000 or living_area > 3000:
        return "luxury"
    if list_price < 500_000 or living_area < 1500:
        return "affordable"
    return "residential"
```

### Step 2: Tier Parameters

Each tier has different search tolerances:

| Parameter | Affordable | Residential | Luxury |
|-----------|-----------|-------------|--------|
| sqftRange (±) | 300 | 400 | 600 |
| radiusFallbackMiles | 3 | 2 | 5 |
| yearBuiltTolerance | ±15 | ±10 | ±10 |
| maxCompsPerStatus | 5 | 5 | 5 |
| Level 1 months | 6 | 6 | 9 |
| Level 2 months | 12 | 12 | 18 |
| Level 3 months | 6 | 6 | 9 |
| Level 4 months | 24 | 24 | 30 |
| Level 5 months | 36 | 36 | 48 |

### Step 3: Attribute Detection

Detect pool/spa/view/garage from MLS fields AND public remarks:

**MLS fields to check:**
- Pool: `poolYn` or `pool` (boolean)
- Spa: `spaYn` or `spa` (boolean)
- View: `view` (string) or `viewYn` (boolean)
- Garage: `garageSpaces` (number)
- Gated: `gatedCommunity` (boolean)
- Senior: `seniorCommunityYn` (boolean)
- Land type: `landType` ("Fee" or "Lease")

**Remarks parsing (if MLS field is null):**
Parse `publicRemarks` text for keywords. Key patterns:

- **Pool**: Match `private pool`, `heated pool`, `swimming pool`, `pool and spa`, `saltwater pool`, etc. Exclude: `community pool`, `pool table`, `carpool`. Explicit negatives: `no pool`, `pool removed`.
- **Spa**: Match `hot tub`, `jacuzzi`, `private spa`, `pool and spa`. Exclude: `spa-like`, `day spa`.
- **View**: Categories — Golf (`golf course view`, `on the golf course`), Mountain (`mountain view`, `san jacinto`), Desert (`desert view`), Water (`ocean view`, `lake view`), City (`city lights`, `panoramic`).
- **Garage**: Extract count from `3-car garage`, `garage for 2`, etc.
- **Gated**: `gated community`, `guard-gated`, `24-hour guard`.
- **Golf**: `golf membership`, `on the golf course`, `golf course lot`.

### Step 4: 5-Level Hierarchy Search

Search for comps in priority order. **Stop at the first level that produces ≥3 scored comps.**

For each level, query either `unified_listings` (active) or `unified_closed_listings` (closed), with a date filter based on tier parameters.

**Level 1 — Same subdivision, tight match:**
```python
{
    "subdivisionName": subject.subdivisionName,  # case-insensitive regex
    "propertyType": subject.propertyType,
    "propertySubType": subject.propertySubType,
    "listingKey": {"$ne": subject.listingKey},
    "livingArea": {"$gte": sqft - range, "$lte": sqft + range},
    "bedsTotal": {"$gte": beds - 1, "$lte": beds + 1},
    "landType": subject.landType,
    # If subject has pool: "$or": [{"poolYn": True}, {"pool": True}]
    # Date filter: closeDate >= (now - level1_months) for closed
}
```

**Level 2 — Same subdivision, relaxed sqft (±200 extra):**
Same as L1 but wider sqft range, longer date lookback, no bed/pool filters.

**Level 3 — Same city, tight match:**
Replace `subdivisionName` with `city` (case-insensitive regex). Add bed and pool filters back.

**Level 4 — Same city, relaxed:**
City filter only, wider sqft range (±300 extra), longer lookback.

**Level 5 — Geographic radius fallback:**
Use `$nearSphere` with `$maxDistance` (tier miles × 1609.34 meters). No city filter. Longest lookback.

**Important:** For each level, limit query to 20 candidates, then score and rank them.

### Step 5: 12-Factor Scoring (0-100)

Score each candidate against the subject. The total score is a weighted sum.

**Scoring weights by tier:**

| Factor | Affordable | Residential | Luxury |
|--------|-----------|-------------|--------|
| sqft | 25 | 20 | 17 |
| subdivision | 12 | 15 | 20 |
| bedBath | 17 | 12 | 8 |
| poolSpa | 5 | 10 | 10 |
| lotSize | 5 | 10 | 15 |
| view | 3 | 8 | 13 |
| recency | 13 | 10 | 5 |
| yearBuilt | 8 | 5 | 2 |
| archStyle | 0 | 3 | 6 |
| stories | 5 | 3 | 2 |
| garage | 4 | 2 | 1 |
| landType | 3 | 2 | 1 |

**Individual scoring functions:**

- **sqft**: `max(0, 1 - abs(comp - subject) / subject)`
- **subdivision**: 1 if exact match (case-insensitive), else 0
- **bedBath**: Average of bed score + bath score. Same=1.0, ±1=0.65, ±2=0.3, else 0
- **poolSpa**: 1 if both match, 0 if mismatch, 0.5 if comp unknown. Non-applicable if subject unknown.
- **lotSize**: `max(0, 1 - abs(comp - subject) / subject)`. Non-applicable if either is 0.
- **view**: 1 if same category, 0.2 if comp has no view, 0.1 if different category. Non-applicable if subject has no view.
- **recency**: `max(0, 1 - months_ago / max_months_lookback)`. Use closeDate for closed, onMarketDate for active.
- **yearBuilt**: `max(0, 1 - abs(diff) / 30)`. 0.5 if either unknown.
- **archStyle**: Keyword overlap ratio. Non-applicable if subject unknown.
- **stories**: 1 if same, 0.3 if different. Non-applicable if subject unknown.
- **garage**: 1 if exact, 0.6 if ±1, 0.2 if ±2+. Non-applicable if subject unknown.
- **landType**: 1 if match, 0 if mismatch. 0.5 if either unknown.

**Weight redistribution:** When a factor is "non-applicable" (subject has no data), set its weight to 0 and redistribute proportionally to the remaining applicable factors. This prevents penalizing missing data.

**Final score** = sum of (raw_score × adjusted_weight) for all 12 factors.

### Step 6: Compute Aggregate Stats

For the top 5 active and top 5 closed comps (sorted by similarityScore desc):

```python
stats = {
    "count": len(comps),
    "avgPrice": round(mean(prices)),
    "minPrice": min(prices),
    "maxPrice": max(prices),
    "medianPrice": median(prices),
    "avgPricePerSqft": round(mean(ppsf_values)),
    "avgSqft": round(mean(sqfts)),
    "avgDaysOnMarket": round(mean(doms)),
    "avgLotSize": round(mean(lot_sizes)),
}
# For closed comps, also compute:
stats["avgSalePriceToListRatio"] = round(mean(ratios), 3)
```

### Step 7: Generate Narrative

Build a 2-4 sentence summary:

1. **Price positioning**: Compare subject listPrice to median closed sale price. "Listed X% above/below median closed sale of $Y."
2. **Price/sqft**: Compare subject $/sqft to closed comp average. Only mention if >10% difference.
3. **Sale-to-list ratio**: If <0.95 → "buyers have negotiating leverage". If >1.0 → "strong seller's market".
4. **Days on market**: If ≤30 → "moving quickly". If ≥120 → "expect longer timeline".
5. **Tier note**: If luxury → "fewer comparable sales, widening confidence range".

### Step 8: Quality Assessment

```python
active_count = len(active_comps)
closed_count = len(closed_comps)
total = active_count + closed_count

if total >= 8:
    confidence = "high"
elif total >= 5:
    confidence = "good"
elif total >= 3:
    confidence = "medium"
elif total >= 1:
    confidence = "low"
else:
    confidence = "insufficient"
```

### Step 9: Limitations

Check and log:
- Active or closed comps < 3 → "Only N comparable(s) found"
- Search expanded beyond subdivision → "Insufficient comparables in {name}"
- Subject has pool but <60% of closed comps have pool → "pool mismatch"
- Closed search required level 4+ → "extended lookback period"
- Subject is fee-land but some comps are lease-land → "land type mismatch"

---

## Script Structure

```python
#!/usr/bin/env python3
"""
build-listing-cma.py — Pre-compute CMA stats for all active listings

Usage:
    python build-listing-cma.py                    # All active listings
    python build-listing-cma.py --city "Indian Wells"  # Single city
    python build-listing-cma.py --key 20260306...  # Single listing
    python build-listing-cma.py --limit 100        # First N listings
    python build-listing-cma.py --dry-run          # Preview without writing

Writes `cmaStats` field to each document in `unified_listings`.
"""

import os, sys, re, json, math, logging
from datetime import datetime, timedelta
from statistics import median, mean
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv

load_dotenv(".env.local")

MONGO_URI = os.getenv("MONGODB_URI")
client = MongoClient(MONGO_URI)
db = client["jpsrealtor"]  # or parse from URI

active_coll = db["unified_listings"]
closed_coll = db["unified_closed_listings"]

BATCH_SIZE = 50  # bulk_write batch size

def main():
    # Parse CLI args
    # Fetch all active listings (propertyType "A", standardStatus "Active")
    # For each listing:
    #   1. classify_tier()
    #   2. detect_attributes() — MLS fields + remarks parsing
    #   3. search_comps() — 5-level hierarchy against both collections
    #   4. score_comps() — 12-factor weighted scoring
    #   5. compute_stats()
    #   6. generate_narrative()
    #   7. assess_quality()
    #   8. Build cmaStats object
    # Batch upsert via bulk_write([UpdateOne({"listingKey": key}, {"$set": {"cmaStats": stats}})])
    # Log summary: total processed, updated, errors, duration
    pass
```

---

## MongoDB Considerations

- **Write method**: Use `bulk_write` with `UpdateOne` + `$set` on the `cmaStats` field only. Do NOT replace the entire document.
- **Index**: The `listingKey` field is already indexed.
- **Schema**: The Mongoose model uses `strict: true` by default. Since we just added `cmaStats: { type: Schema.Types.Mixed }` to the schema, Mongoose will now accept this field. But since the Python script uses PyMongo directly, it bypasses Mongoose anyway.
- **Stale data**: When a listing status changes (goes pending/closed), the listing is removed from `unified_listings` by the status update cron. So stale CMA data auto-cleans.

---

## Cron Schedule

Run after the existing pipeline completes:
```bash
# Existing pipeline order: fetch → status → CMA subdivisions → photos
# Add listing CMA after subdivision CMA:
# fetch → status → CMA subdivisions → CMA listings → photos
```

Suggested: Daily at ~3 AM (after subdivision CMA at ~2 AM).

---

## Performance Estimates

- ~5,600 active listings (GPS alone has 5,646)
- Each listing: 2 MongoDB queries (5 levels each, but parallelizable) ≈ 50-200ms
- Scoring + narrative: ~5ms per listing
- **Total estimated runtime: 15-30 minutes** for full rebuild
- Use `--city` flag for targeted rebuilds during testing

---

## Frontend Changes Needed After This Script Is Live

Once `cmaStats` is on the listing document, update `CMAReport.tsx` to check for pre-computed data first:

```tsx
// In CMAReport.tsx useEffect:
// 1. Check if listing.cmaStats exists (passed from server component)
// 2. If yes → use immediately, skip all fetches
// 3. If no → fall back to current fetch flow
```

And in the server component `page.tsx`, pass `cmaStats` from the listing document to the client component. This eliminates the client-side fetch entirely.
