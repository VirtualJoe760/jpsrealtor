# Photo Fetching Fix - Multi-MLS Support

**Date**: December 7, 2025
**Status**: ✅ **Code Fixed** | ⚠️ **Data Population Pending**

---

## Problem Summary

Photos were not fetching correctly because:

1. ❌ **Wrong Approach**: API route was trying to fetch a single listing by `listingKey` without specifying which MLS
2. ❌ **Missing MLS Context**: Didn't use `mlsId` from the database to target the correct MLS association
3. ❌ **No Media Arrays**: The `unified_listings` collection doesn't have `media` arrays populated

---

## The Fix

### Code Changes (✅ Complete)

Updated `/api/listings/[listingKey]/photos/route.ts` to:

1. **Fetch `mlsId` from database**:
   ```typescript
   const listing = await UnifiedListing.findOne({ listingKey })
     .select("mlsSource mlsId listingKey")
     .lean();
   ```

2. **Use MLS-specific filter** (Diego's method):
   ```typescript
   const replicationUrl = `https://replication.sparkapi.com/v1/listings?_filter=MlsId Eq '${mlsId}' And ListingKey Eq '${listingKey}'&_expand=Media&_limit=1`;
   ```

### Why This Works

According to the Spark API Replication docs:

> When using a **Replication API key**, you can use `_expand=Media` to get photos embedded in the listing response.

The key insight from **Diego's email** (in `docs/misc/REPLICATION_GUIDE.md`):

- You have a **replication API key** (not a standard API key)
- You must use `https://replication.sparkapi.com` endpoint
- You need to specify the **MLS ID** in the filter to target the correct association
- Use `_expand=Media` to get photos inline (not `/photos` sub-resource)

---

## Multi-MLS Architecture

Your site supports **8 MLS associations**:

| MLS Name | MLS ID | Active Listings |
|----------|--------|-----------------|
| **GPS** | `20190211172710340762000000` | 5,645 |
| **CRMLS** | `20200218121507636729000000` | 54,833 |
| **CLAW** | `20200630203341057545000000` | 13,918 |
| **SOUTHLAND** | `20200630203518576361000000` | 7,456 |
| **HIGH_DESERT** | `20200630204544040064000000` | 3,478 |
| **BRIDGE** | `20200630204733042221000000` | 1,385 |
| **CONEJO_SIMI_MOORPARK** | `20160622112753445171000000` | 821 |
| **ITECH** | `20200630203206752718000000` | 26 |

**Total**: 87,562 listings

Each listing in `unified_listings` has:
- `listingKey`: Unique identifier
- `mlsId`: Which MLS it came from (26-digit ID)
- `mlsSource`: Human-readable name (GPS, CRMLS, etc.)

---

## Data Population (⚠️ Pending)

### Current State

```bash
✅ API code: Fixed
✅ unified-fetch.py: Already has Media expansion support (line 432)
❌ unified_listings.media: Empty arrays (not populated yet)
```

### Check Status

```bash
node -e "
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const totalListings = await db.collection('unified_listings').countDocuments();
  const withMediaCount = await db.collection('unified_listings').countDocuments({
    media: { \$exists: true, \$ne: [] }
  });

  console.log('Total unified_listings:', totalListings);
  console.log('Listings with media array:', withMediaCount);
  console.log('Percentage:', ((withMediaCount/totalListings)*100).toFixed(1) + '%');

  await mongoose.disconnect();
}

check().catch(console.error);
"
```

### Populate Media Arrays

Run the unified-fetch script to populate media arrays for **all 8 MLSs**:

```bash
# Recommended: Start with GPS and CRMLS (your primary MLSs)
python src/scripts/mls/backend/unified/unified-fetch.py --mls GPS CRMLS --yes

# Then add the rest
python src/scripts/mls/backend/unified/unified-fetch.py --mls CLAW SOUTHLAND --yes
python src/scripts/mls/backend/unified/unified-fetch.py --mls HIGH_DESERT BRIDGE --yes
python src/scripts/mls/backend/unified/unified-fetch.py --mls CONEJO_SIMI_MOORPARK ITECH --yes
```

**Note**: The script **already includes** `_expand=Media` on line 432:
```python
expansions=["Media", "OpenHouses", "VirtualTours"]
```

### Expected Timeline

| MLS | Listings | Est. Time |
|-----|----------|-----------|
| GPS | 5,645 | ~15 min |
| CRMLS | 54,833 | ~2 hours |
| CLAW | 13,918 | ~45 min |
| SOUTHLAND | 7,456 | ~25 min |
| HIGH_DESERT | 3,478 | ~12 min |
| BRIDGE | 1,385 | ~5 min |
| CONEJO_SIMI_MOORPARK | 821 | ~3 min |
| ITECH | 26 | ~1 min |

**Total**: ~3.5 hours for all 87,562 listings

---

## Testing

### 1. Test Photo API (After Data Population)

```bash
# Start dev server
npm run dev

# Run test script
node test-photos-fix.js
```

Expected output:
```
✅ Successful API calls:  8/8
📸 Listings with photos:  6-8/8  (some listings may legitimately have 0 photos)
❌ Failed API calls:      0/8

🎉 TEST PASSED! Photo fetching works correctly across all MLSs.
```

### 2. Manual API Test

```bash
# Get a sample listing key
node -e "
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function getSample() {
  await mongoose.connect(process.env.MONGODB_URI);
  const listing = await mongoose.connection.db.collection('unified_listings')
    .findOne({ mlsSource: 'GPS', standardStatus: 'Active' });
  console.log('Test this URL:');
  console.log('http://localhost:3000/api/listings/' + listing.listingKey + '/photos');
  await mongoose.disconnect();
}

getSample();
"
```

Then visit that URL in your browser. Expected response:
```json
{
  "listingKey": "20190608123213401318000000",
  "mlsSource": "GPS",
  "count": 15,
  "photos": [
    {
      "mediaKey": "...",
      "order": 0,
      "caption": "Front View",
      "uri1024": "https://photos.sparkplatform.com/...",
      "uri1280": "https://photos.sparkplatform.com/...",
      "primary": true
    },
    ...
  ]
}
```

---

## How It Works

### Request Flow

```
User/Component
  ↓
GET /api/listings/[listingKey]/photos
  ↓
1. Query MongoDB for mlsId
   SELECT mlsId, mlsSource FROM unified_listings WHERE listingKey = ?
  ↓
2. Construct Replication API URL
   https://replication.sparkapi.com/v1/listings
   ?_filter=MlsId Eq '20190211172710340762000000' And ListingKey Eq 'ABC123'
   &_expand=Media
   &_limit=1
  ↓
3. Fetch from Spark API (with SPARK_ACCESS_TOKEN)
  ↓
4. Extract Media array from response.D.Results[0].StandardFields.Media
  ↓
5. Transform to photo format
   {
     mediaKey, order, caption,
     uri300, uri640, uri800, uri1024, uri1280, uri1600, uri2048,
     uriThumb, uriLarge, primary
   }
  ↓
6. Return JSON response
  ↓
Frontend displays photos
```

### Spark API Response Structure

```json
{
  "D": {
    "Success": true,
    "Results": [
      {
        "StandardFields": {
          "ListingKey": "20190608123213401318000000",
          "MlsId": "20190211172710340762000000",
          "ListPrice": 500000,
          "Media": [
            {
              "MediaKey": "20180515142618296938000000",
              "Order": 0,
              "MediaType": "Image",
              "MediaCategory": "Primary Photo",
              "ShortDescription": "Front View",
              "Uri300": "https://photos.sparkplatform.com/.../300.jpg",
              "Uri640": "https://photos.sparkplatform.com/.../640.jpg",
              "Uri800": "https://photos.sparkplatform.com/.../800.jpg",
              "Uri1024": "https://photos.sparkplatform.com/.../1024.jpg",
              "Uri1280": "https://photos.sparkplatform.com/.../1280.jpg",
              "Uri1600": "https://photos.sparkplatform.com/.../1600.jpg",
              "Uri2048": "https://photos.sparkplatform.com/.../2048.jpg",
              "UriThumb": "https://photos.sparkplatform.com/.../thumb.jpg",
              "UriLarge": "https://photos.sparkplatform.com/.../large.jpg"
            }
          ]
        }
      }
    ]
  }
}
```

---

## Caching Strategy

The photo endpoint has multi-tier caching:

```
Request
  ↓
Cloudflare Edge Cache (5 min TTL)
  ↓ (miss)
Cloudflare R2 Storage (15 min TTL)
  ↓ (miss)
Next.js Route
  ↓
MongoDB (unified_listings.media OR Spark API)
```

Cache headers (from route.ts:152-159):
```typescript
{
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
  'CDN-Cache-Control': 'public, max-age=3600',
  'Vercel-CDN-Cache-Control': 'public, max-age=3600',
}
```

---

## Related Files

| File | Purpose |
|------|---------|
| `src/app/api/listings/[listingKey]/photos/route.ts` | Photo API endpoint (✅ FIXED) |
| `src/scripts/mls/backend/unified/unified-fetch.py` | Fetch script with Media expansion |
| `test-photos-fix.js` | Multi-MLS test script |
| `docs/misc/REPLICATION_GUIDE.md` | Diego's email about MLS IDs |
| `docs/listings/UNIFIED_MLS_ARCHITECTURE.md` | 8 MLS architecture overview |
| `docs/architecture/PHOTOS_MODEL_MIGRATION.md` | Photos migration history |

---

## Troubleshooting

### Issue: Photos API returns 0 photos

**Check 1**: Is `media` array populated in database?
```bash
node -e "
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const listing = await mongoose.connection.db.collection('unified_listings')
    .findOne({ media: { \$exists: true, \$ne: [] } });

  if (listing) {
    console.log('✅ Media arrays exist');
    console.log('Sample:', listing.media?.length, 'photos');
  } else {
    console.log('❌ No media arrays found - need to run unified-fetch.py');
  }
  await mongoose.disconnect();
}

check();
"
```

**Solution**: Run `unified-fetch.py` to populate media arrays

---

**Check 2**: Is `mlsId` field present in listings?
```bash
node -e "
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const withMlsId = await mongoose.connection.db.collection('unified_listings')
    .countDocuments({ mlsId: { \$exists: true } });
  const total = await mongoose.connection.db.collection('unified_listings')
    .countDocuments();

  console.log('Listings with mlsId:', withMlsId, '/', total);
  await mongoose.disconnect();
}

check();
"
```

**Solution**: If 0, need to run unified-fetch.py (it adds mlsId field)

---

### Issue: Spark API returns 403 Forbidden

**Cause**: Using wrong API endpoint or wrong API key

**Check**:
```bash
echo $SPARK_ACCESS_TOKEN
```

**Solution**: Ensure you're using:
- Endpoint: `https://replication.sparkapi.com` (NOT `https://sparkapi.com`)
- Token: Your **replication API key** (starts with eyJ...)

---

### Issue: Photos return blank/broken images

**Cause**: Photo URLs may be expired or protected

**Check**: Open photo URL directly in browser:
```
https://photos.sparkplatform.com/gps/20180515142618296938000000-1024.jpg
```

**Solution**:
- If 404: Photo deleted from Spark API
- If 403: Need to proxy through your backend
- If works: Frontend issue (CORS, CSP, etc.)

---

## Next Steps

1. ✅ **Code Fix**: Complete
2. ⚠️ **Data Population**: Run `unified-fetch.py` for all 8 MLSs
3. ⚠️ **Testing**: Run `test-photos-fix.js` after data population
4. ⚠️ **Frontend**: Verify photos display correctly in UI
5. ⚠️ **Monitoring**: Check Cloudflare cache hit rates
6. ⚠️ **Documentation**: Update API docs with new endpoint behavior

---

**Last Updated**: December 7, 2025
**Author**: Claude Code
**Status**: Code fixed, awaiting data population
