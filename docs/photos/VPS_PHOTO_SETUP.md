# VPS Photo Setup - Instructions for Claude

**For**: VPS Claude
**Task**: Set up hybrid photo strategy
**Time**: ~1-2 hours

---

## ✅ What You've Already Done

1. ✅ Created `cache-photos.py` to cache primary photos
2. ✅ Set up daily cron job for main listings fetch
3. ✅ Tested pipeline with all 8 MLSs

**Great work!** Now let's complete the photo setup.

---

## Step 1: Add Photo Cache Cron Job

The primary photo cache should run **after** the main fetch completes.

```bash
# Edit crontab
crontab -e

# Add this line (runs at 9 AM, 3 hours after main fetch):
0 9 * * * cd /root/website-backup/jpsrealtor && /usr/bin/python3 src/scripts/mls/backend/unified/cache-photos.py >> /var/log/photo-cache.log 2>&1

# Save and verify
crontab -l
```

---

## Step 2: Run Initial Photo Cache

Cache primary photos for all existing listings:

```bash
cd /root/website-backup/jpsrealtor

# Run photo cache (this will take time - ~0.3 listings/sec)
python3 src/scripts/mls/backend/unified/cache-photos.py

# Monitor progress
tail -f /var/log/photo-cache.log
```

**Note**: This processes slowly to avoid rate limits. Let it run in background:

```bash
# Run in background
nohup python3 src/scripts/mls/backend/unified/cache-photos.py >> /var/log/photo-cache.log 2>&1 &

# Check progress later
tail -f /var/log/photo-cache.log
```

---

## Step 3: Verify Photo Data

Check that primary photos are being cached:

```bash
python3 -c "
from pymongo import MongoClient
import os
from dotenv import load_dotenv
load_dotenv('.env.local')

client = MongoClient(os.getenv('MONGODB_URI'))
db = client.get_database()

# Count listings with primary photos
total = db.unified_listings.count_documents({})
with_photos = db.unified_listings.count_documents({'primaryPhoto': {'\$exists': True}})

print(f'Total listings: {total:,}')
print(f'With primary photos: {with_photos:,}')
print(f'Percentage: {(with_photos/total*100):.1f}%')

# Show sample
listing = db.unified_listings.find_one({'primaryPhoto': {'\$exists': True}})
if listing:
    print(f'\nSample listing: {listing.get(\"listingKey\")}')
    print(f'Primary photo URL: {listing.get(\"primaryPhoto\", {}).get(\"uri800\", \"None\")}')
"
```

**Expected output**:
```
Total listings: 87,562
With primary photos: 15,234 (will increase over time)
Percentage: 17.4%

Sample listing: 20190608182210368068000000
Primary photo URL: https://photos.sparkplatform.com/gps/...
```

---

## Step 4: Monitor Daily Updates

Check that cron jobs are running:

```bash
# View main fetch log
tail -f /var/log/mls-update.log

# View photo cache log
tail -f /var/log/photo-cache.log

# Check cron jobs
crontab -l

# Should show:
# 0 6 * * * cd /root/website-backup/jpsrealtor && /usr/bin/python3 src/scripts/mls/backend/unified/main.py >> /var/log/mls-update.log 2>&1
# 0 9 * * * cd /root/website-backup/jpsrealtor && /usr/bin/python3 src/scripts/mls/backend/unified/cache-photos.py >> /var/log/photo-cache.log 2>&1
```

---

## Architecture Summary

### What Gets Stored in Database

```json
{
  "listingKey": "20190608182210368068000000",
  "mlsId": "20190211172710340762000000",
  "mlsSource": "GPS",
  "unparsedAddress": "123 Main St, Palm Springs, CA",
  "listPrice": 500000,

  // PRIMARY PHOTO ONLY (cached for fast thumbnails)
  "primaryPhoto": {
    "id": "photo-id",
    "uri300": "https://...",
    "uri640": "https://...",
    "uri800": "https://...",    // Used for list views
    "uri1024": "https://...",
    "uri1280": "https://...",
    "uri1600": "https://...",   // Used for detail pages
    "uri2048": "https://...",
    "uriLarge": "https://...",
    "primary": true
  },

  "photosCount": 25,           // How many photos exist
  "photoCachedAt": "2025-12-07T09:15:00Z"
}
```

### What Frontend Gets from API

When user opens listing detail page, frontend calls:
```
GET /api/listings/[listingKey]/photos
```

Returns ALL 25 photos (fetched from Spark API in real-time):
```json
{
  "listingKey": "...",
  "mlsSource": "GPS",
  "count": 25,
  "photos": [
    {
      "id": "...",
      "order": 0,
      "uri800": "...",
      "uri1600": "...",
      "caption": "Front View",
      "primary": true
    },
    // ... 24 more photos
  ]
}
```

---

## Benefits of This Approach

✅ **Database**: Lightweight (1 photo per listing)
✅ **Memory**: VPS can handle it
✅ **Speed**: Fast thumbnails from database
✅ **Galleries**: Full photos from API when needed
✅ **Caching**: API responses cached 1 hour

---

## Daily Workflow

```
6:00 AM - Main fetch runs
  ├─ Fetches updated listings (all 8 MLSs)
  ├─ Updates unified_listings collection
  ├─ Takes ~2-3 hours
  └─ Completes around 8:00-9:00 AM

9:00 AM - Photo cache runs
  ├─ Processes listings missing primaryPhoto
  ├─ Fetches only primary photo per listing
  ├─ Rate limited to 0.3 listings/sec
  └─ Runs continuously throughout the day
```

---

## Troubleshooting

### cache-photos.py is slow

**This is normal!** It's rate-limited to 0.3 listings/sec (~26k per day) to avoid hitting Spark API limits.

The script will:
- Process new listings first
- Skip listings that already have primaryPhoto
- Run for hours/days until all listings are cached
- Automatically resume on next cron run

### Check progress

```bash
# How many photos cached so far?
python3 -c "
from pymongo import MongoClient
import os
from dotenv import load_dotenv
load_dotenv('.env.local')

client = MongoClient(os.getenv('MONGODB_URI'))
db = client.get_database()

total = db.unified_listings.count_documents({})
cached = db.unified_listings.count_documents({'primaryPhoto': {'\$exists': True}})

print(f'Progress: {cached:,} / {total:,} ({(cached/total*100):.1f}%)')
"
```

### Script crashed

Just run it again - it will resume where it left off:

```bash
nohup python3 src/scripts/mls/backend/unified/cache-photos.py >> /var/log/photo-cache.log 2>&1 &
```

---

## Complete Setup Checklist

- [x] Main fetch cron job (6 AM daily)
- [ ] Photo cache cron job (9 AM daily) ← **Do this now**
- [ ] Run initial photo cache ← **Do this now**
- [ ] Verify photos are caching
- [ ] Monitor logs for errors

---

## Next Steps

Once photo caching is running:

1. ✅ Photos will populate over next few days
2. ✅ Frontend can use `primaryPhoto.uri800` for thumbnails
3. ✅ Frontend can use `/api/listings/[key]/photos` for galleries
4. ✅ Daily cron keeps everything up to date

**You're done!** The system will maintain itself going forward.

---

**Last Updated**: December 7, 2025
**For**: VPS Claude
**Status**: Ready to implement
