# Unified MLS Data Pipeline

Complete data pipeline for fetching, processing, and storing listings from all 8 MLS associations into a unified MongoDB collection.

## Overview

This unified system replaces separate GPS and CRMLS pipelines with a single, scalable architecture that supports all 8 MLS associations.

### Supported MLSs (87,604+ listings)

1. **GPS** - 5,140+ active listings
2. **CRMLS** - California Regional MLS
3. **CLAW** - Combined LA/Westside
4. **SOUTHLAND** - Southland Regional
5. **HIGH_DESERT** - High Desert Association
6. **BRIDGE** - Bridge MLS
7. **CONEJO_SIMI_MOORPARK** - Conejo Simi Moorpark
8. **ITECH** - iTech MLS

## Pipeline Architecture

```
┌─────────────────┐
│ unified-fetch.py│  Fetch from Spark API (all 8 MLSs)
└────────┬────────┘
         │ JSON (RESO PascalCase)
         ▼
┌─────────────────┐
│   flatten.py    │  Transform to camelCase + enhance
└────────┬────────┘
         │ JSON (camelCase + mlsSource/mlsId/propertyTypeName)
         ▼
┌─────────────────┐
│     seed.py     │  Load to MongoDB unified_listings
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ unified_listings│  MongoDB collection (geospatial indexes)
└─────────────────┘
```

## Scripts

### 1. unified-fetch.py

Fetches listings from Spark Replication API with correct SkipToken pagination.

**Features:**
- All 8 MLS associations
- PropertyTypes A-D (Residential, Lease, Income, Land)
- Correct SkipToken pagination (fixes ID-based bug)
- Total count verification
- Rate limiting
- Retry logic

**Usage:**
```bash
# Fetch from GPS only (no prompts for single MLS)
python src/scripts/mls/backend/unified/unified-fetch.py --mls GPS

# Fetch from all 8 MLSs INTERACTIVELY (prompts after each MLS)
python src/scripts/mls/backend/unified/unified-fetch.py
# After GPS completes, you'll be prompted:
# "Continue to CRMLS? [y/n]:"
# Answer 'y' to continue or 'n' to skip

# Fetch from all 8 MLSs AUTO-CONFIRMED (no prompts, yes to all)
python src/scripts/mls/backend/unified/unified-fetch.py -y
# or
python src/scripts/mls/backend/unified/unified-fetch.py --yes

# Fetch from specific MLSs in sequence with prompts
python src/scripts/mls/backend/unified/unified-fetch.py --mls GPS CRMLS CLAW
# Fetches GPS, then prompts "Continue to CRMLS?", then "Continue to CLAW?"

# Fetch from specific MLSs without prompts
python src/scripts/mls/backend/unified/unified-fetch.py --mls GPS CRMLS -y

# Incremental update for all MLSs (auto-confirm recommended)
python src/scripts/mls/backend/unified/unified-fetch.py --incremental -y

# Custom batch size
python src/scripts/mls/backend/unified/unified-fetch.py --mls GPS --batch-size 1000
```

**Output:** `local-logs/all_{MLS}_listings.json`

### 2. flatten.py

Transforms RESO PascalCase to camelCase with enhanced fields.

**Enhancements:**
- `mlsSource`: Human-readable MLS name (GPS, CRMLS, etc.)
- `mlsId`: 26-digit MLS association ID
- `propertyTypeName`: Human-readable type (Residential, Land, etc.)
- `media`: Preserved from _expand=Media
- `landType`, `landLeaseAmount`, etc.: Derived land details
- `slugAddress`: URL-safe address slug

**Usage:**
```bash
# Auto-detect most recent fetch
python src/scripts/mls/backend/unified/flatten.py

# Specify input file
python src/scripts/mls/backend/unified/flatten.py --input local-logs/all_GPS_listings.json

# Specify output file
python src/scripts/mls/backend/unified/flatten.py --output local-logs/custom_output.json
```

**Output:** `local-logs/flattened_unified_{MLS}_listings.json`

### 3. seed.py

Loads flattened listings into MongoDB `unified_listings` collection.

**Features:**
- Bulk upsert (500 per batch)
- Automatic index creation
- Geospatial coordinates formatting
- Progress tracking
- Error handling

**Indexes Created:**
1. `coordinates_2dsphere` - Geospatial (for CMA radius queries)
2. `mlsSource_mlsId` - MLS filtering
3. `city_status` - City page queries
4. `subdivision_status` - Subdivision page queries
5. `propertyType_status` - Property type filtering
6. `listingKey_unique` - Unique identifier
7. `modificationTimestamp_desc` - Incremental updates

**Usage:**
```bash
# Auto-detect most recent flattened file
python src/scripts/mls/backend/unified/seed.py

# Specify input file
python src/scripts/mls/backend/unified/seed.py --input local-logs/flattened_unified_GPS_listings.json

# Recreate indexes only (no data seeding)
python src/scripts/mls/backend/unified/seed.py --indexes-only

# Use custom collection name
python src/scripts/mls/backend/unified/seed.py --collection my_listings
```

**Output:** MongoDB `unified_listings` collection

### 4. run-pipeline.py

Orchestrates the complete pipeline (fetch → flatten → seed).

**Usage:**
```bash
# Run full pipeline for GPS
python src/scripts/mls/backend/unified/run-pipeline.py --mls GPS

# Run full pipeline for all 8 MLSs
python src/scripts/mls/backend/unified/run-pipeline.py --all

# Run only specific steps
python src/scripts/mls/backend/unified/run-pipeline.py --mls GPS --steps fetch,flatten
python src/scripts/mls/backend/unified/run-pipeline.py --mls GPS --steps seed

# Incremental update (fetch recent changes only)
python src/scripts/mls/backend/unified/run-pipeline.py --all --incremental
```

## Data Schema

### Enhanced Fields

Each listing in `unified_listings` includes:

**MLS Tracking:**
```json
{
  "mlsSource": "GPS",
  "mlsId": "20190211172710340762000000"
}
```

**Property Type:**
```json
{
  "propertyType": "D",
  "propertyTypeName": "Land"
}
```

**PropertyType Mappings:**
- A: Residential
- B: Residential Lease
- C: Residential Income
- D: Land
- E: Commercial Sale
- F: Commercial Lease
- G: Business Opportunity
- H: Manufactured In Park
- I: Mobile Home

**Geospatial:**
```json
{
  "latitude": 33.7845,
  "longitude": -116.4321,
  "coordinates": {
    "type": "Point",
    "coordinates": [-116.4321, 33.7845]
  }
}
```

**Identifiers:**
```json
{
  "listingKey": "20190608123213401318000000",
  "slug": "20190608123213401318000000",
  "slugAddress": "123-main-st-palm-springs-ca-92262"
}
```

## Quick Start

### 1. Fetch GPS Listings (Test)
```bash
python src/scripts/mls/backend/unified/unified-fetch.py --mls GPS
# Output: local-logs/all_GPS_listings.json (5,140 listings)
```

### 2. Flatten
```bash
python src/scripts/mls/backend/unified/flatten.py
# Output: local-logs/flattened_unified_GPS_listings.json
```

### 3. Seed to MongoDB
```bash
python src/scripts/mls/backend/unified/seed.py
# Output: unified_listings collection (5,123 documents)
```

### 4. Or Run Full Pipeline
```bash
python src/scripts/mls/backend/unified/run-pipeline.py --mls GPS
# Runs all 3 steps automatically
```

## Full Production Run

To fetch all 87,604+ listings from all 8 MLSs:

```bash
# WARNING: This will take ~30-45 minutes and create ~500MB of data
python src/scripts/mls/backend/unified/run-pipeline.py --all
```

**Expected Results:**
- Fetch: ~30-45 minutes
- Flatten: ~2-3 minutes
- Seed: ~5-10 minutes
- Total: ~40-60 minutes
- Database size: ~500MB (87K+ listings)

## Incremental Updates

For hourly updates (recommended):

```bash
# Fetch only changes from last hour
python src/scripts/mls/backend/unified/run-pipeline.py --all --incremental
```

Set up as cron job:
```cron
0 * * * * cd /path/to/jpsrealtor && python src/scripts/mls/backend/unified/run-pipeline.py --all --incremental
```

## MongoDB Queries

### Find listings by MLS
```javascript
db.unified_listings.find({ mlsSource: "GPS" }).count()
```

### Find by property type
```javascript
db.unified_listings.find({ propertyTypeName: "Land" }).count()
```

### Find by city
```javascript
db.unified_listings.find({ city: "Palm Springs", standardStatus: "Active" })
```

### Geospatial radius query (CMA)
```javascript
db.unified_listings.find({
  coordinates: {
    $near: {
      $geometry: { type: "Point", coordinates: [-116.5453, 33.8303] },
      $maxDistance: 1609  // 1 mile in meters
    }
  },
  standardStatus: "Active"
})
```

## Verification

Check data quality:
```bash
python -c "
import os
from pymongo import MongoClient
from dotenv import load_dotenv
load_dotenv('.env.local')

client = MongoClient(os.getenv('MONGODB_URI'))
db = client.get_database()
collection = db.unified_listings

print(f'Total listings: {collection.count_documents({}):,}')
print(f'Active: {collection.count_documents({\"standardStatus\": \"Active\"}):,}')
print(f'With coordinates: {collection.count_documents({\"coordinates\": {\"\\$exists\": True}}):,}')
print(f'GPS: {collection.count_documents({\"mlsSource\": \"GPS\"}):,}')
print(f'CRMLS: {collection.count_documents({\"mlsSource\": \"CRMLS\"}):,}')
"
```

## Troubleshooting

### Pagination stops early
- **Fixed**: Updated unified-fetch.py to use API-provided SkipToken (not listing ID)
- **Fixed**: Corrected break condition logic in pagination loop

### Missing enhanced fields
- Check flatten.py ran successfully
- Verify MLS_ID_TO_NAME mapping includes all 8 MLSs
- Check PROPERTY_TYPE_NAMES has A-I mappings

### Geospatial queries not working
- Ensure coordinates_2dsphere index exists: `db.unified_listings.getIndexes()`
- Recreate indexes: `python seed.py --indexes-only`
- Verify coordinates format: `[longitude, latitude]` (GeoJSON order)

### Skipped listings during seed
- Check for missing listingKey/unparsedAddress
- Verify flatten.py output has required fields
- Review seed.py output for specific errors

## Performance

### GPS MLS (5,140 listings)
- Fetch: ~20 seconds
- Flatten: ~1 second
- Seed: ~3 seconds
- **Total: ~25 seconds**

### All 8 MLSs (87,604 listings - estimated)
- Fetch: ~30-45 minutes
- Flatten: ~2-3 minutes
- Seed: ~5-10 minutes
- **Total: ~40-60 minutes**

## Next Steps

1. ✅ Unified fetch with all 8 MLSs
2. ✅ Enhanced flatten with mlsSource/mlsId/propertyTypeName
3. ✅ Seed to unified_listings with geospatial indexes
4. ⏭️ Create `/api/unified-listings` endpoint
5. ⏭️ Update city/subdivision APIs to use unified collection
6. ⏭️ Consolidate AI tools (searchCity + matchLocation → searchListings)
7. ⏭️ Deploy Cloudflare caching
8. ⏭️ Implement CMA closed listings fetch

## Files

```
src/scripts/mls/backend/unified/
├── README.md              # This file
├── unified-fetch.py       # Fetch from Spark API
├── flatten.py             # Transform to camelCase + enhance
├── seed.py                # Load to MongoDB
└── run-pipeline.py        # Orchestrate full pipeline
```

## Support

For issues or questions:
1. Check this README
2. Review docs/UNIFIED_MLS_ARCHITECTURE.md
3. Check logs in local-logs/
4. Verify environment variables in .env.local

---

**Created:** December 4, 2025
**Status:** ✅ Production Ready
**Version:** 1.0
