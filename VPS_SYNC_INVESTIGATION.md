# VPS Database Sync Investigation - Stale Listing Data Issue

## Problem Summary

We have discovered that our `unified_listings` collection contains stale/outdated listing data. Specifically:

**Test Case - 53545 Avenida Ramirez, La Quinta, CA 92253:**

**What's in our database (STALE):**
- MLS # (listingId): `219131946`
- ListingKey: `20250626083953623863000000`
- On Market Date: October 17, 2025
- Days on Market: ~215 days (as calculated from Oct 17 to today)
- Status: Active (but shouldn't be - this listing was taken off market)

**What's in Spark Replication API (CURRENT):**
- MLS # (listingId): `219140735`
- ListingKey: `20260105125614516238000000`
- On Market Date: January 5, 2026
- Days on Market: 14 days
- Status: Active
- Photos: 37 photos available

**What's on FlexMLS Portal (TRUTH):**
- MLS #: 219140735 (or possibly 219140730 - need to verify)
- Date on Market: 12/03/2025
- Days on Market: 14 days
- Status: Active
- Photos: 37 photos

## Key Understanding

### Listing Identifiers
1. **listingKey** - 26-digit unique identifier assigned by Spark API (e.g., `20260105125614516238000000`)
   - This is THE primary key for fetching photos via Spark API
   - This changes when a property is relisted

2. **listingId** - Human-readable MLS # shown to agents (e.g., `219140735`)
   - This also changes when relisted

3. **mlsId** - Identifies which MLS association (e.g., GPS = `20190211172710340762000000`)
   - This stays the same across all GPS listings

### What Happened
The property was originally listed (MLS # 219131946), then taken off market, then **relisted** on December 3, 2025 with a **new MLS # and new ListingKey**. Our database sync is NOT picking up the new listing or removing the old one.

## Questions for VPS Claude

### 1. Database Sync Schedule
**Question:** What is the current schedule for running `unified-fetch.py`?
- How often does it run?
- What's the cron job configuration?
- When was the last successful run?
- Are there any logs showing errors or failures?

### 2. Sync Script Behavior
**Question:** How does `unified-fetch.py` handle property relistings?

Review the script at: `src/scripts/mls/backend/unified/unified-fetch.py`

- Does it query ALL active listings or only recently modified ones?
- Does it have any filters that might exclude new listings?
- Does it use `_skiptoken` pagination correctly (Diego's method)?
- Does it DELETE old listings that are no longer active?
- Does it UPDATE existing listings or only INSERT new ones?

### 3. Duplicate Handling
**Question:** What happens when the same address has multiple listing records?

Looking at our database, we have:
- 1 listing for address "53545 Avenida Ramirez, La Quinta, CA 92253"
- It's the OLD listing with OLD listingKey
- The NEW listing is in Spark API but NOT in our database

Expectations:
- Should we have BOTH old and new listings in the database?
- Should old listings be marked as "Closed" or "Expired" when relisted?
- Should the sync script be removing stale Active listings that are no longer in Spark?

### 4. Testing Commands
**Question:** Can you run these commands and share the output?

```bash
# Check last sync time
ls -lh /root/website-backup/jpsrealtor/local-logs/unified/

# Check cron job
crontab -l | grep unified

# Test if new listing exists in Spark (should return 1 result)
# This tests if the sync script SHOULD be finding this listing
# (You'll need to create a small Python script to test this)

# Count GPS listings in database
mongo $MONGODB_URI --eval "db.unified_listings.countDocuments({mlsSource: 'GPS', standardStatus: 'Active'})"

# Search for both old and new listings
mongo $MONGODB_URI --eval "db.unified_listings.find({unparsedAddress: /53545.*Avenida.*Ramirez/i}, {listingId: 1, listingKey: 1, standardStatus: 1, onMarketDate: 1}).pretty()"
```

### 5. Expected vs Actual Behavior

**Expected Behavior:**
1. Sync script runs daily (or on schedule)
2. Queries Spark Replication API for ALL active GPS listings
3. Finds the NEW listing (20260105125614516238000000)
4. Either:
   - UPSERTS the new listing into database, OR
   - Marks the old listing as Closed/Expired AND inserts new listing
5. Database now has current data matching FlexMLS

**Actual Behavior:**
1. Database only has OLD listing (20250626083953623863000000)
2. NEW listing is missing from database
3. Website shows stale data (215 days on market instead of 14)
4. Photo API tries to fetch photos for OLD listingKey, gets 0 results

### 6. Spark API Query Test

**Request:** Please test if the Spark API returns the new listing:

```python
# Test query (you can adapt this to your environment)
import requests
import os

ACCESS_TOKEN = os.getenv("SPARK_ACCESS_TOKEN")
GPS_MLS_ID = "20190211172710340762000000"

# Search for the address
url = f"https://replication.sparkapi.com/v1/listings?_filter=MlsId Eq '{GPS_MLS_ID}' And UnparsedAddress Eq '53545 Avenida Ramirez, La Quinta, CA 92253'&_limit=5"

response = requests.get(url, headers={
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "X-SparkApi-User-Agent": "jpsrealtor.com",
    "Accept": "application/json"
})

data = response.json()
results = data.get("D", {}).get("Results", [])

print(f"Found {len(results)} listings")
for listing in results:
    sf = listing["StandardFields"]
    print(f"  MLS #: {sf['ListingId']}")
    print(f"  ListingKey: {sf['ListingKey']}")
    print(f"  Status: {sf['StandardStatus']}")
    print(f"  On Market: {sf['OnMarketDate']}")
    print()
```

**Expected Output:**
- Should find the NEW listing with MLS # 219140735 and ListingKey 20260105125614516238000000
- Might also find old CLOSED listings at this address

### 7. Database Integrity Check

**Request:** Check if there are more stale listings beyond this one:

```bash
# Find all Active listings in database that were last modified more than 7 days ago
# These are potentially stale listings that should have been updated
mongo $MONGODB_URI --eval "
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  db.unified_listings.countDocuments({
    mlsSource: 'GPS',
    standardStatus: 'Active',
    modificationTimestamp: { \$lt: sevenDaysAgo }
  })
"

# This will tell us if the sync issue is widespread or isolated
```

## Immediate Action Needed

1. **Investigate why `unified-fetch.py` is not syncing properly**
2. **Run a manual sync to test:** `python3 src/scripts/mls/backend/unified/unified-fetch.py --mls GPS --yes`
3. **After sync, verify the new listing is in the database:**
   ```bash
   mongo $MONGODB_URI --eval "db.unified_listings.findOne({listingKey: '20260105125614516238000000'}, {listingId: 1, listingKey: 1, standardStatus: 1})"
   ```
4. **Check if old listing was updated or if both exist:**
   ```bash
   mongo $MONGODB_URI --eval "db.unified_listings.find({unparsedAddress: /53545.*Avenida.*Ramirez/i}).count()"
   ```

## Success Criteria

After fixing the sync issue:
1. ✅ New listing (20260105125614516238000000) exists in database
2. ✅ Old listing (20250626083953623863000000) is either removed OR marked as Closed/Expired
3. ✅ Website displays correct "Days on Market" (14 days, not 215)
4. ✅ Photo API returns 37 photos for the new listing
5. ✅ Future relistings are automatically detected and synced

## Additional Context

- This issue was discovered while investigating why photos weren't loading
- The photo API code is CORRECT - it properly queries Spark with listingKey + mlsId
- The root cause is database sync, not the photo API
- We do NOT store photos in the database - all photos come from Spark API
- The sync script should be the single source of truth for listing data

## Files to Review

1. `src/scripts/mls/backend/unified/unified-fetch.py` - Main sync script
2. Cron job configuration - Check `/etc/crontab` or `crontab -l`
3. Log files in `local-logs/unified/` - Look for errors
4. `.env.local` - Verify `SPARK_ACCESS_TOKEN` is valid

## Contact

This issue was identified by Claude on the Windows dev environment. The investigation showed:
- Windows dev database has stale data
- Spark Replication API has current data
- The sync script on VPS should be updating the database but isn't

Please investigate and report back with findings!
