# Search Index Builder — Backend Claude Prompt

## Task Overview

Build a Python script (`src/scripts/mls/backend/build_search_index.py`) that creates and maintains a `search_index` MongoDB collection for instant autocomplete search across the platform. This runs as a nightly cron job after the main MLS sync pipeline.

## Why This Exists

The chat interface needs sub-50ms autocomplete as users type addresses, cities, or neighborhoods. Searching the main `unified_listings` collection (76k+ docs with media arrays) is too slow for real-time autocomplete. This pre-built index contains tiny, denormalized documents with a MongoDB text index for instant `$text` search.

## MongoDB Connection

```python
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path
import os

env_path = Path(__file__).resolve().parents[4] / ".env.local"
load_dotenv(dotenv_path=env_path)

MONGO_URI = os.getenv("MONGODB_URI")
client = MongoClient(MONGO_URI, tls=True, tlsAllowInvalidCertificates=True)
db = client["admin"]
```

Use the same connection pattern as `extract_subdivisions.py` and other scripts in `src/scripts/mls/backend/`.

## Target Collection: `search_index`

### Schema

```python
{
    # Identity
    "type": "listing" | "city" | "subdivision",
    "entityId": str,           # listingKey for listings, slug for cities/subdivisions

    # Display
    "label": str,              # "77095 Desi Drive, Indian Wells, CA 92210"
    "sublabel": str,           # "Indian Wells Country Club" or "136 listings" or "Palm Desert"

    # Search (text-indexed)
    "searchText": str,         # "77095 desi drive indian wells ca 92210 indian wells country club"

    # Listing-specific fields (null for cities/subdivisions)
    "slug": str | None,        # slugAddress for URL routing
    "price": int | None,       # listPrice
    "beds": int | None,        # bedroomsTotal
    "baths": float | None,     # bathroomsTotalDecimal
    "sqft": int | None,        # livingArea
    "photo": str | None,       # primaryPhotoUrl
    "city": str | None,
    "subdivision": str | None, # subdivisionName
    "status": str | None,      # standardStatus (Active, Pending, etc.)

    # City-specific
    "totalListings": int | None,

    # Subdivision-specific
    "parentCity": str | None,

    # Metadata
    "updatedAt": datetime
}
```

### Indexes

```python
# Text index for $text search (THE key index for autocomplete)
collection.create_index([("searchText", "text")], name="search_text_idx")

# Compound index for type-filtered queries
collection.create_index([("type", 1), ("price", -1)], name="type_price_idx")

# TTL or manual cleanup — not needed since we rebuild nightly
```

## Build Process

### Step 1: Build listing entries

```python
# Query only active listings with minimal projection
listings = db["unified_listings"].find(
    {"standardStatus": "Active", "propertyType": "A"},
    {
        "listingKey": 1,
        "slugAddress": 1,
        "unparsedAddress": 1,
        "listPrice": 1,
        "bedroomsTotal": 1,
        "bathroomsTotalDecimal": 1,
        "livingArea": 1,
        "primaryPhotoUrl": 1,
        "city": 1,
        "subdivisionName": 1,
        "postalCode": 1,
        "standardStatus": 1,
        "streetName": 1,
        "streetNumber": 1,
    }
)
```

For each listing, build `searchText` by concatenating (lowercase, stripped):
- `unparsedAddress` (full address)
- `city`
- `subdivisionName` (if present and not "Not Applicable", "N/A", etc.)
- `postalCode`
- `streetName` (standalone for partial matches like "desi drive")

Example:
```
Input:  77095 Desi Drive, Indian Wells, CA 92210 | subdivision: Indian Wells Country Club
Output: "77095 desi drive indian wells ca 92210 indian wells country club desi drive"
```

Note: append `streetName` separately at the end so text search scores it when users type just the street name.

### Step 2: Build city entries

```python
cities = db["cities"].find({}, {"name": 1, "totalListings": 1, "slug": 1})
```

For each city:
- `type`: "city"
- `entityId`: slug
- `label`: city name
- `sublabel`: f"{totalListings} active listings"
- `searchText`: city name lowercase
- `totalListings`: from document

### Step 3: Build subdivision entries

```python
subdivisions = db["subdivisions"].find(
    {"listingCount": {"$gt": 0}},  # Only subdivisions with active listings
    {"name": 1, "slug": 1, "city": 1, "listingCount": 1}
)
```

For each subdivision:
- `type`: "subdivision"
- `entityId`: slug
- `label`: subdivision name
- `sublabel`: city name
- `searchText`: f"{name.lower()} {city.lower()}"
- `parentCity`: city

### Step 4: Bulk upsert

```python
from pymongo import UpdateOne

operations = []
for entry in all_entries:
    operations.append(UpdateOne(
        {"type": entry["type"], "entityId": entry["entityId"]},
        {"$set": entry},
        upsert=True
    ))

# Process in batches of 1000
for i in range(0, len(operations), 1000):
    collection.bulk_write(operations[i:i+1000], ordered=False)
```

### Step 5: Cleanup stale entries

After upserting, remove entries that weren't updated in this run:

```python
# Delete entries older than this run
collection.delete_many({"updatedAt": {"$lt": run_start_time}})
```

### Step 6: Ensure indexes

```python
collection.create_index([("searchText", "text")], name="search_text_idx")
collection.create_index([("type", 1), ("price", -1)], name="type_price_idx")
```

## Expected Output

```
[SearchIndex] Starting build...
[SearchIndex] Found 5,847 active listings
[SearchIndex] Found 42 cities
[SearchIndex] Found 1,424 subdivisions with listings
[SearchIndex] Built 7,313 search entries
[SearchIndex] Upserted in 8 batches (2.3s)
[SearchIndex] Cleaned 12 stale entries
[SearchIndex] Indexes verified
[SearchIndex] Done in 4.1s
```

## Cron Integration

Add to the VPS cron pipeline AFTER the main MLS sync and status update:

```bash
# In crontab — add after existing pipeline
# Current pipeline: fetch → status → CMA → photos
# New:              fetch → status → CMA → photos → search_index

cd /path/to/jpsrealtor && /usr/bin/python3 src/scripts/mls/backend/build_search_index.py >> /var/log/search-index.log 2>&1
```

## Testing

```bash
# Run locally
cd F:\web-clients\joseph-sardella\jpsrealtor
python src/scripts/mls/backend/build_search_index.py

# Verify in MongoDB shell
db.search_index.countDocuments()                              # Should be ~7k+
db.search_index.find({$text: {$search: "desi drive"}})       # Should return Desi Drive listings
db.search_index.find({$text: {$search: "palm springs"}})     # Should return city + subdivisions + listings
db.search_index.find({$text: {$search: "indian wells country club"}}).explain("executionStats")  # Should show IXSCAN
```

## Non-applicable subdivision names to exclude

```python
EXCLUDED_SUBDIVISIONS = [
    "not applicable", "n/a", "none", "other", "na", "no hoa",
    "see remarks", "unknown", "tbd", "various"
]
```

---

# Frontend Claude Setup Instructions

Once the `search_index` collection is built and populated, the frontend needs a new API endpoint to query it.

## New API Endpoint

**File:** `src/app/api/listings/quick-search/route.ts` (already exists — replace contents)

```typescript
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import mongoose from "mongoose";

/**
 * GET /api/listings/quick-search?q=desi+drive
 *
 * Queries the pre-built search_index collection using MongoDB $text search.
 * Returns in <50ms for any query.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  await dbConnect();
  const db = mongoose.connection.db;
  const collection = db.collection("search_index");

  const results = await collection
    .find(
      { $text: { $search: q } },
      { projection: { score: { $meta: "textScore" }, searchText: 0 } }
    )
    .sort({ score: { $meta: "textScore" } })
    .limit(8)
    .toArray();

  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
```

## ChatInput.tsx Changes

The `ChatInput.tsx` autocomplete is already wired to call `/api/listings/quick-search`. Once the backend populates the `search_index` collection and the API endpoint is updated, the autocomplete will work with <50ms responses.

The `SearchResult` interface in `ChatInput.tsx` should be updated to match the `search_index` schema:

```typescript
interface SearchResult {
  type: "listing" | "city" | "subdivision";
  label: string;
  sublabel?: string;
  slug?: string;
  photo?: string;
  price?: number;       // was listPrice
  beds?: number;        // was bedrooms
  baths?: number;       // was bathrooms
  sqft?: number;
  city?: string;
  totalListings?: number;
  parentCity?: string;
}
```

## Verification Checklist

1. Run `build_search_index.py` — should complete in <10s
2. Check MongoDB: `db.search_index.countDocuments()` should be ~7k+
3. Test queries in Mongo shell: `db.search_index.find({$text: {$search: "desi drive"}})`
4. Hit `/api/listings/quick-search?q=desi+drive` — should return in <50ms
5. Type "desi" in chat input — autocomplete should appear instantly
6. Click a result — should send to AI and get listing detail card
