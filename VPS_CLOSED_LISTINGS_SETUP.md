# VPS Setup Instructions - Unified Closed Listings Collection

**Purpose:** Update the VPS cron job to move closed listings into the `unified_closed_listings` collection.

**Target:** VPS Claude instance running daily MLS update cronjob

---

## 📋 Overview

Currently, the VPS runs `update.py` daily to:
- Check active listing statuses
- Update changed statuses
- Move sold listings to `gpsClosedListings` (old GPS-only collection)

**We need to:**
1. Pull the new `unified_closed_listings` model files
2. Update `update.py` to use the new unified collection
3. Support all 8 MLS sources (not just GPS)
4. Maintain 5-year TTL auto-deletion

---

## 🗂️ Files to Pull from Main Repo

### Required Files (Pull these to VPS):

```
src/models/unified-closed-listing.ts
src/scripts/mls/test-closed-listings.py
```

### Existing File (Update on VPS):

```
src/scripts/mls/backend/update.py
```

---

## 📥 STEP 1: Pull Required Files to VPS

**Command for VPS Claude:**

```bash
# Navigate to project directory
cd ~/jpsrealtor

# Pull only the required files from main repo
git fetch origin main

# Check out specific files (doesn't pull entire repo)
git checkout origin/main -- src/models/unified-closed-listing.ts
git checkout origin/main -- src/scripts/mls/test-closed-listings.py

# Verify files exist
ls -la src/models/unified-closed-listing.ts
ls -la src/scripts/mls/test-closed-listings.py
```

---

## 🔧 STEP 2: Update `update.py` Script

### Current Code (Lines 38-41):

```python
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
db = client.get_database()
collection = db.listings  # GPS active listings
closed_collection = db.gpsClosedListings  # OLD: GPS-only closed collection
print("✅ Connected to MongoDB (GPS active + closed collections)")
```

### New Code:

```python
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
db = client.get_database()
collection = db.listings  # GPS active listings
closed_collection = db.unified_closed_listings  # NEW: Unified closed collection (all 8 MLSs)
print("✅ Connected to MongoDB (active + unified_closed_listings)")
```

---

## 🔧 STEP 3: Enhanced Closed Listing Handling

### Current Code (Lines 102-114, 136-149):

The script already moves closed listings, but only to `gpsClosedListings`.

### Required Updates:

**Update Line 40:**
```python
# OLD
closed_collection = db.gpsClosedListings

# NEW
closed_collection = db.unified_closed_listings
```

**Add Enhanced Field Mapping (after line 106):**

```python
if spark_status == "Closed":
    full_listing = collection.find_one({"listingKey": listing_key})
    if full_listing:
        # Prepare document for unified_closed_listings
        closed_doc = full_listing.copy()
        closed_doc["standardStatus"] = spark_status
        closed_doc["statusLastChecked"] = datetime.now(timezone.utc).isoformat()
        closed_doc.pop("_id", None)  # Remove _id to avoid duplicate key error

        # ⭐ REQUIRED FIELDS for unified_closed_listings
        # closeDate: REQUIRED (TTL index depends on this)
        if not closed_doc.get("closeDate"):
            # Use statusChangeTimestamp or current date as fallback
            closed_doc["closeDate"] = (
                closed_doc.get("statusChangeTimestamp") or
                datetime.now(timezone.utc).isoformat()
            )

        # closePrice: Should be set (actual sale price)
        if not closed_doc.get("closePrice"):
            # Use listPrice as fallback if closePrice not available
            closed_doc["closePrice"] = closed_doc.get("listPrice")

        # mlsSource & mlsId: REQUIRED for tracking
        if not closed_doc.get("mlsSource"):
            # Extract from listing metadata or set default
            closed_doc["mlsSource"] = closed_doc.get("mlsSource", "GPS")

        if not closed_doc.get("mlsId"):
            closed_doc["mlsId"] = "20190211172710340762000000"  # GPS default

        # Insert/update in unified_closed_listings
        closed_collection.update_one(
            {"listingKey": listing_key},
            {"$set": closed_doc},
            upsert=True
        )

        # Remove from active listings
        collection.delete_one({"listingKey": listing_key})
        return f"🏠💰 {listing_key}: {local_status} → SOLD (moved to unified_closed_listings)"
```

---

## 🔧 STEP 4: Add Support for All 8 MLS Sources

**Current limitation:** The script only handles GPS listings (`db.listings` collection).

**Future enhancement (not required immediately):**

To handle all 8 MLS sources, you would:

1. Query from `unified_listings` instead of `listings`
2. Process all MLS sources uniformly
3. Ensure `mlsSource` and `mlsId` are correctly preserved

**For now:** Focus on GPS listings and add other MLSs later.

---

## 📊 STEP 5: Database Indexes

The `unified_closed_listings` model includes these indexes:

- ✅ **TTL Index:** Auto-deletes listings older than 5 years based on `closeDate`
- ✅ **Compound Indexes:** For city, subdivision, property type queries
- ✅ **Geospatial Index:** For radius-based CMA comps

**MongoDB will create these automatically** when the first document is inserted.

**Verify indexes after first run:**

```bash
# On VPS
mongosh "$MONGODB_URI" --eval "db.unified_closed_listings.getIndexes()"
```

Expected output should include:
```json
{
  "name": "closeDate_ttl_5years",
  "key": { "closeDate": 1 },
  "expireAfterSeconds": 157680000
}
```

---

## 🧪 STEP 6: Test the Updated Script

### Before Running in Production:

1. **Test with a single listing:**

```bash
# On VPS
cd ~/jpsrealtor/src/scripts/mls/backend

# Run in dry-run mode (if you add a --dry-run flag) or limit to 10 listings for testing
python3 update.py
```

2. **Verify the data:**

```bash
# Check unified_closed_listings collection
mongosh "$MONGODB_URI" --eval "
  db.unified_closed_listings.countDocuments({});
  db.unified_closed_listings.find().limit(1).pretty();
"
```

3. **Check required fields:**

```bash
mongosh "$MONGODB_URI" --eval "
  db.unified_closed_listings.findOne(
    {},
    {closeDate: 1, closePrice: 1, mlsSource: 1, mlsId: 1, listingKey: 1}
  )
"
```

Should show:
```json
{
  "_id": ObjectId("..."),
  "closeDate": "2024-12-10T...",
  "closePrice": 500000,
  "mlsSource": "GPS",
  "mlsId": "20190211172710340762000000",
  "listingKey": "..."
}
```

---

## ⚙️ STEP 7: Update Cron Job (if needed)

**Current cron job** (check with `crontab -l` on VPS):

```bash
# Likely something like:
0 6 * * * cd ~/jpsrealtor/src/scripts/mls/backend && python3 update.py >> ~/logs/mls-update.log 2>&1
```

**No changes needed** - the script name stays the same, just internal logic changes.

**Verify it's running:**

```bash
# Check cron logs
tail -f ~/logs/mls-update.log

# Or
journalctl -u cron -f
```

---

## 🔍 STEP 8: Monitor the Migration

### Day 1: Check the counts

```bash
# OLD collection (should stop growing)
mongosh "$MONGODB_URI" --eval "db.gpsClosedListings.countDocuments({})"

# NEW collection (should start growing)
mongosh "$MONGODB_URI" --eval "db.unified_closed_listings.countDocuments({})"
```

### After 1 Week: Verify TTL is working

```bash
# Check oldest closeDate in collection
mongosh "$MONGODB_URI" --eval "
  db.unified_closed_listings
    .find()
    .sort({closeDate: 1})
    .limit(1)
    .pretty()
"
```

Should be within last 5 years. If you see older dates, the TTL index may not be active.

---

## 📦 STEP 9: Optional - Migrate Existing gpsClosedListings

**If you want to migrate old data** from `gpsClosedListings` to `unified_closed_listings`:

```bash
# Create migration script on VPS
cat > ~/jpsrealtor/src/scripts/mls/migrate-closed-listings.py << 'EOF'
#!/usr/bin/env python3
import os
from pymongo import MongoClient
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from pathlib import Path

env_path = Path.home() / "jpsrealtor" / ".env.local"
load_dotenv(dotenv_path=env_path)

MONGO_URI = os.getenv("MONGODB_URI")
client = MongoClient(MONGO_URI)
db = client.get_database()

# Collections
old_collection = db.gpsClosedListings
new_collection = db.unified_closed_listings

# Only migrate listings from last 5 years
five_years_ago = datetime.now(timezone.utc) - timedelta(days=365*5)

print("🔄 Migrating gpsClosedListings → unified_closed_listings")
print(f"Date filter: closeDate >= {five_years_ago.isoformat()}")

# Query old collection
query = {"closeDate": {"$gte": five_years_ago.isoformat()}}
listings = list(old_collection.find(query))

print(f"Found {len(listings)} listings to migrate")

migrated = 0
for listing in listings:
    listing_key = listing.get("listingKey")
    if not listing_key:
        continue

    # Ensure required fields
    if not listing.get("mlsSource"):
        listing["mlsSource"] = "GPS"
    if not listing.get("mlsId"):
        listing["mlsId"] = "20190211172710340762000000"

    # Remove old _id
    listing.pop("_id", None)

    # Upsert into new collection
    new_collection.update_one(
        {"listingKey": listing_key},
        {"$set": listing},
        upsert=True
    )
    migrated += 1

    if migrated % 100 == 0:
        print(f"Migrated {migrated}/{len(listings)}...")

print(f"✅ Migration complete! Migrated {migrated} listings")
print(f"Old collection count: {old_collection.count_documents({})}")
print(f"New collection count: {new_collection.count_documents({})}")
EOF

chmod +x ~/jpsrealtor/src/scripts/mls/migrate-closed-listings.py
python3 ~/jpsrealtor/src/scripts/mls/migrate-closed-listings.py
```

---

## 📝 Summary Checklist for VPS Claude

- [ ] Pull `src/models/unified-closed-listing.ts` from main repo
- [ ] Pull `src/scripts/mls/test-closed-listings.py` from main repo
- [ ] Update `update.py` line 40: Change `gpsClosedListings` → `unified_closed_listings`
- [ ] Update closed listing handler (lines 102-114, 136-149) with enhanced field mapping
- [ ] Test the script with a small batch
- [ ] Verify `unified_closed_listings` collection is being populated
- [ ] Check that `closeDate`, `closePrice`, `mlsSource`, `mlsId` fields are present
- [ ] Verify TTL index is created (check with `.getIndexes()`)
- [ ] Monitor cron job logs
- [ ] (Optional) Run migration script for existing `gpsClosedListings` data

---

## 🚨 Troubleshooting

### Issue: "closeDate is required" error

**Fix:** Ensure the `closeDate` fallback logic is in place (use `statusChangeTimestamp` or current date)

### Issue: TTL index not deleting old records

**Fix:**
```bash
# Manually create TTL index
mongosh "$MONGODB_URI" --eval "
  db.unified_closed_listings.createIndex(
    {closeDate: 1},
    {expireAfterSeconds: 157680000, name: 'closeDate_ttl_5years'}
  )
"
```

### Issue: Duplicate key error on listingKey

**Fix:** The `upsert=True` should handle this, but if it persists:
```bash
# Check for duplicate listingKeys
mongosh "$MONGODB_URI" --eval "
  db.unified_closed_listings.aggregate([
    {\$group: {_id: '\$listingKey', count: {\$sum: 1}}},
    {\$match: {count: {\$gt: 1}}}
  ])
"
```

---

**Created:** 2024-12-14
**For:** VPS Claude instance
**Priority:** Medium (implement before next major CMA feature release)
