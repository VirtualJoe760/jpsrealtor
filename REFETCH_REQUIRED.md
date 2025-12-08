# Photos Not Working - Refetch Required

**Status**: ✅ Code Fixed | ✅ Model Updated | ⚠️ **DATA REFETCH REQUIRED**

---

## Problem

Your photos aren't displaying because:

1. ✅ **API code is now fixed** - uses `mlsId` + `_expand=Media`
2. ✅ **Mongoose model supports media arrays** - updated with all URI fields
3. ❌ **Database records don't have `media` arrays populated**

## Evidence

Looking at your sample listing (`20190608182210368068000000`):

```json
{
  "photosCount": 25,  // ← Photos exist in Spark API
  "photosChangeTimestamp": "2019-06-19T12:53:56Z",  // ← Photos were updated
  // ❌ NO "media" field - the actual photo data isn't stored locally
}
```

## Why This Happened

Your `unified-fetch.py` **already has `_expand=Media`** on line 432:

```python
expansions=["Media", "OpenHouses", "VirtualTours"]
```

**BUT** your current database records were fetched **before** this expansion was added. The database has:
- ✅ 78,904 listings
- ✅ All listing metadata (price, beds, baths, etc.)
- ❌ **Zero** listings with populated `media` arrays

## The Fix

### 1. Model Updates (✅ Complete)

Updated `/src/models/unified-listing.ts` to include all photo URI fields:

```typescript
export interface IMedia {
  MediaKey?: string;
  Order?: number;
  MediaCategory?: string;
  Caption?: string;
  ShortDescription?: string;

  // All photo size variants
  Uri300?: string;
  Uri640?: string;
  Uri800?: string;
  Uri1024?: string;
  Uri1280?: string;
  Uri1600?: string;
  Uri2048?: string;
  UriThumb?: string;
  UriLarge?: string;

  ImageWidth?: number;
  ImageHeight?: number;
}
```

### 2. Refetch Data (⚠️ Required)

You need to re-run the unified-fetch script to populate media arrays:

```bash
# Start with your primary MLSs (GPS and CRMLS = 60,478 listings)
python src/scripts/mls/backend/unified/unified-fetch.py --mls GPS CRMLS --yes

# Then the remaining 6 MLSs (27,426 listings)
python src/scripts/mls/backend/unified/unified-fetch.py --mls CLAW SOUTHLAND HIGH_DESERT BRIDGE CONEJO_SIMI_MOORPARK ITECH --yes
```

**Time Estimate**:
- GPS (5,645 listings): ~15 minutes
- CRMLS (54,833 listings): ~2 hours
- Other 6 MLSs (27,426 listings): ~1.5 hours
- **Total**: ~3.5 hours

### 3. What the Refetch Does

The script will:
1. Fetch listings from Spark API with `_expand=Media,OpenHouses,VirtualTours`
2. Extract the `Media` array from `StandardFields.Media`
3. Upsert to `unified_listings` collection (updates existing records)
4. Each listing will now have a `media` array like:

```json
{
  "listingKey": "20190608182210368068000000",
  "photosCount": 25,
  "media": [
    {
      "MediaKey": "...",
      "Order": 0,
      "MediaCategory": "Primary Photo",
      "ShortDescription": "Front View",
      "Uri300": "https://photos.sparkplatform.com/gps/.../300.jpg",
      "Uri640": "https://photos.sparkplatform.com/gps/.../640.jpg",
      "Uri800": "https://photos.sparkplatform.com/gps/.../800.jpg",
      "Uri1024": "https://photos.sparkplatform.com/gps/.../1024.jpg",
      "Uri1280": "https://photos.sparkplatform.com/gps/.../1280.jpg",
      "Uri1600": "https://photos.sparkplatform.com/gps/.../1600.jpg",
      "Uri2048": "https://photos.sparkplatform.com/gps/.../2048.jpg",
      "UriThumb": "https://photos.sparkplatform.com/gps/.../thumb.jpg",
      "UriLarge": "https://photos.sparkplatform.com/gps/.../large.jpg"
    },
    // ... 24 more photos
  ]
}
```

## How the New Photo API Works

Once data is refetched, here's the flow:

```
GET /api/listings/[listingKey]/photos
  ↓
1. Query unified_listings for mlsId
   - listingKey: "20190608182210368068000000"
   - mlsId: "20190211172710340762000000" (GPS)
   - mlsSource: "GPS"
  ↓
2. Fetch from Spark Replication API
   https://replication.sparkapi.com/v1/listings
   ?_filter=MlsId Eq '20190211172710340762000000' And ListingKey Eq '20190608182210368068000000'
   &_expand=Media
   &_limit=1
  ↓
3. Extract Media array from response
   response.D.Results[0].StandardFields.Media
  ↓
4. Transform to photo format
   {
     mediaKey, order, caption,
     uri300, uri640, uri800, uri1024, uri1280, uri1600, uri2048,
     uriThumb, uriLarge, primary
   }
  ↓
5. Return JSON
   {
     listingKey: "...",
     mlsSource: "GPS",
     count: 25,
     photos: [...]
   }
```

## Testing After Refetch

### 1. Check Data Population

```bash
node -e "
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const total = await db.collection('unified_listings').countDocuments();
  const withMedia = await db.collection('unified_listings').countDocuments({
    media: { \$exists: true, \$ne: [] }
  });

  console.log('Total listings:', total);
  console.log('Listings with media:', withMedia);
  console.log('Percentage:', ((withMedia/total)*100).toFixed(1) + '%');

  // Get sample
  const sample = await db.collection('unified_listings').findOne({
    media: { \$exists: true, \$ne: [] }
  });

  if (sample) {
    console.log('\\nSample listing:', sample.listingKey);
    console.log('Photo count:', sample.media?.length);
    console.log('First photo URL:', sample.media[0]?.Uri1024);
  }

  await mongoose.disconnect();
}

check();
"
```

**Expected After Refetch**:
```
Total listings: 78904
Listings with media: 78904
Percentage: 100.0%

Sample listing: 20190608182210368068000000
Photo count: 25
First photo URL: https://photos.sparkplatform.com/gps/.../1024.jpg
```

### 2. Test Photo API

```bash
# Start dev server (if not already running)
npm run dev

# Run multi-MLS photo test
node test-photos-fix.js
```

**Expected Output**:
```
✅ GPS                       | Testing 20190608182210368068000000
   ✓ Photos: 25 | First URI: https://photos.sparkplatform.com/gps/...

✅ CRMLS                     | Testing 20200725001310100570000000
   ✓ Photos: 18 | First URI: https://photos.sparkplatform.com/crmls/...

...

🎉 TEST PASSED! Photo fetching works correctly across all MLSs.
```

## Why Re-fetch is Safe

The `unified-fetch.py` script uses **upsert** operations:

```python
UpdateOne(
    {"listingKey": listing["listingKey"]},  # Match on unique key
    {"$set": listing},                      # Update all fields
    upsert=True                             # Create if doesn't exist
)
```

This means:
- ✅ Existing listings will be **updated** (not deleted)
- ✅ All existing data (price, beds, etc.) will be refreshed
- ✅ New `media` arrays will be added
- ✅ No data loss

## Alternative: Incremental Update

If you want to test with just one MLS first:

```bash
# Test with GPS only (smallest MLS = 5,645 listings)
python src/scripts/mls/backend/unified/unified-fetch.py --mls GPS --yes

# Takes ~15 minutes
# Updates 5,645 GPS listings with media arrays
# Leaves other 73,259 listings unchanged
```

Then verify GPS photos work before refetching all 8 MLSs.

## Files Changed

| File | Status | Changes |
|------|--------|---------|
| `src/app/api/listings/[listingKey]/photos/route.ts` | ✅ Fixed | Uses mlsId + filter approach |
| `src/models/unified-listing.ts` | ✅ Updated | Added all URI fields to Media schema |
| `docs/photos/PHOTO_FIX_COMPLETE.md` | ✅ Created | Complete documentation |
| `test-photos-fix.js` | ✅ Created | Multi-MLS test script |

## Next Steps

1. **Run Refetch** (Required):
   ```bash
   python src/scripts/mls/backend/unified/unified-fetch.py --mls GPS CRMLS --yes
   ```

2. **Verify Data** (After refetch):
   ```bash
   node -e "..." # Check media population script above
   ```

3. **Test API** (After refetch):
   ```bash
   node test-photos-fix.js
   ```

4. **Verify in Browser**:
   - Open your site
   - Navigate to a listing page
   - Check that photos display correctly

5. **Monitor** (Ongoing):
   - Set up hourly incremental sync
   - Monitor photo CDN cache hit rates
   - Check for broken image URLs

---

**Last Updated**: December 7, 2025
**Status**: Code ready, awaiting data refetch
**Action Required**: Run `unified-fetch.py` to populate media arrays
