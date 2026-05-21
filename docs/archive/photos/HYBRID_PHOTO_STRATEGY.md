# Hybrid Photo Strategy - Implementation Guide

**Date**: December 7, 2025
**Status**: ✅ Architecture Finalized

---

## Strategy Overview

**Problem**: Storing all photos for 87k+ listings in MongoDB is too memory-intensive for VPS
**Solution**: Hybrid approach combining database caching + real-time API

### Architecture

1. **Database (`unified_listings`)**: Store ONLY primary photo per listing (lightweight)
2. **Photo API** (`/api/listings/[listingKey]/photos`): Fetch full photo array from Spark API in real-time
3. **Frontend**: Use photo API for carousels/galleries

---

## Part 1: Database - Primary Photo Only

### VPS Implementation (cache-photos.py)

VPS Claude's `cache-photos.py` script should cache ONLY the primary photo:

```python
# Already implemented by VPS Claude
# Fetches primary photo and stores in:
listing.primaryPhoto = {
    "id": photo_id,
    "uri300": "...",
    "uri640": "...",
    "uri800": "...",   # Used for thumbnails
    "uri1024": "...",
    "uri1280": "...",
    "uri1600": "...",  # Used for detail pages
    "uri2048": "...",
    "uriLarge": "...",
    "primary": true
}
```

### Run Primary Photo Cache

```bash
# On VPS
cd /root/website-backup/jpsrealtor
python3 src/scripts/mls/backend/unified/cache-photos.py
```

**Purpose**: Fast thumbnails without hitting Spark API
**Usage**: List pages, search results, map markers

---

## Part 2: Photo API - Full Photo Array

### API Route (Already Fixed)

`src/app/api/listings/[listingKey]/photos/route.ts`

**How it works**:
1. Gets `mlsId` from `unified_listings` collection
2. Fetches from Spark Replication API with `_expand=Photos`
3. Returns all photos for the listing
4. Cached for 1 hour via Next.js

**Endpoint**:
```
GET /api/listings/[listingKey]/photos
```

**Response**:
```json
{
  "listingKey": "20190608182210368068000000",
  "mlsSource": "GPS",
  "count": 25,
  "photos": [
    {
      "id": "...",
      "order": 0,
      "caption": "Front View",
      "uri300": "https://...",
      "uri640": "https://...",
      "uri800": "https://...",
      "uri1024": "https://...",
      "uri1280": "https://...",
      "uri1600": "https://...",
      "uri2048": "https://...",
      "uriThumb": "https://...",
      "uriLarge": "https://...",
      "primary": true
    },
    // ... 24 more photos
  ]
}
```

---

## Part 3: Frontend Usage

### List Pages / Search Results

Use `primaryPhoto` from database (fast, no API call):

```typescript
// In your listing card component
const photoUrl = listing.primaryPhoto?.uri800 || '/images/no-photo.png';

<Image
  src={photoUrl}
  alt={listing.unparsedAddress}
  width={800}
  height={600}
/>
```

### Detail Pages / Carousels

Use photo API endpoint (full gallery):

```typescript
// In PannelCarousel.tsx or listing detail page
const [photos, setPhotos] = useState([]);

useEffect(() => {
  fetch(`/api/listings/${listingKey}/photos`)
    .then(res => res.json())
    .then(data => setPhotos(data.photos));
}, [listingKey]);

// Render carousel
<Carousel>
  {photos.map(photo => (
    <Image
      key={photo.id}
      src={photo.uri1600}  // High-res for detail view
      alt={photo.caption || ''}
    />
  ))}
</Carousel>
```

---

## Components to Update

### 1. PannelCarousel.tsx

**Current**: Probably using old Photos collection or primaryPhoto
**Update to**: Use `/api/listings/[listingKey]/photos` endpoint

```typescript
// src/app/components/mls/map/PannelCarousel.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Photo {
  id: string;
  order: number;
  uri800?: string;
  uri1600?: string;
  caption?: string;
  primary: boolean;
}

export default function PannelCarousel({ listingKey }: { listingKey: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/listings/${listingKey}/photos`)
      .then(res => res.json())
      .then(data => {
        setPhotos(data.photos || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load photos:', err);
        setLoading(false);
      });
  }, [listingKey]);

  if (loading) {
    return <div>Loading photos...</div>;
  }

  if (photos.length === 0) {
    return <div>No photos available</div>;
  }

  return (
    <div className="carousel">
      {photos.map(photo => (
        <Image
          key={photo.id}
          src={photo.uri1600 || photo.uri800 || '/images/no-photo.png'}
          alt={photo.caption || 'Property photo'}
          width={1600}
          height={1200}
          className="carousel-image"
        />
      ))}
    </div>
  );
}
```

### 2. Listing Detail Page

**Location**: `src/app/mls-listings/[slugAddress]/page.tsx` (or similar)

```typescript
// Use the same PannelCarousel component
<PannelCarousel listingKey={listing.listingKey} />
```

---

## VPS Configuration for Cron

The daily cron job should:
1. ✅ Fetch listings (without photos expansion - lightweight)
2. ✅ Update `unified_listings` collection
3. ✅ Run `cache-photos.py` to update primary photos (runs separately, slowly)

### Cron Job (Already Set Up)

```cron
# Daily at 6:00 AM - fetch listings
0 6 * * * cd /root/website-backup/jpsrealtor && /usr/bin/python3 src/scripts/mls/backend/unified/main.py >> /var/log/mls-update.log 2>&1

# Daily at 9:00 AM - update primary photos (after main fetch completes)
0 9 * * * cd /root/website-backup/jpsrealtor && /usr/bin/python3 src/scripts/mls/backend/unified/cache-photos.py >> /var/log/photo-cache.log 2>&1
```

---

## Data Flow Diagram

```
User Opens Listing Detail Page
  ↓
Frontend fetches listing data
  - Gets listing from unified_listings
  - Shows primaryPhoto.uri800 immediately (fast)
  ↓
PannelCarousel component mounts
  ↓
Fetches /api/listings/[listingKey]/photos
  ↓
Photo API route:
  1. Gets mlsId from unified_listings
  2. Calls Spark API with _expand=Photos
  3. Returns all 25 photos
  ↓
Carousel shows full gallery
```

---

## Benefits

| Aspect | Benefit |
|--------|---------|
| **Database Size** | Small - only 1 photo per listing |
| **Memory Usage** | Low - VPS can handle it |
| **Initial Load** | Fast - primary photo from DB |
| **Full Gallery** | Available - via API when needed |
| **Spark API Calls** | Minimized - cached 1 hour |
| **User Experience** | Best - fast thumbnails + full galleries |

---

## Photo Size Guide

| Use Case | Field | Resolution | Where |
|----------|-------|------------|-------|
| List thumbnails | `uri800` | 800x600 | Search results, map markers |
| Detail hero | `uri1600` | 1600x1200 | Listing detail page |
| Gallery/lightbox | `uri2048` | 2048x1600 | Full-screen gallery |
| Small icons | `uri300` | 300x225 | Related listings |

---

## Testing

### Test Photo API

```bash
# Get a listing key
curl http://localhost:3000/api/mls-listings | jq -r '.listings[0].listingKey'

# Test photo endpoint
curl http://localhost:3000/api/listings/YOUR_LISTING_KEY/photos | jq
```

Expected response:
```json
{
  "listingKey": "...",
  "mlsSource": "GPS",
  "count": 25,
  "photos": [...]
}
```

### Test in Browser

1. Navigate to a listing detail page
2. Open DevTools Network tab
3. Look for `/api/listings/[key]/photos` request
4. Should return full photo array
5. Carousel should display all photos

---

## Migration Checklist

- [x] Photo API updated to use `_expand=Photos` (not `Media`)
- [x] Photo API uses `mlsId` filter for multi-MLS support
- [ ] VPS Claude runs `cache-photos.py` for primary photos
- [ ] Update PannelCarousel.tsx to use photo API endpoint
- [ ] Update listing detail page to use PannelCarousel
- [ ] Test photo loading on production
- [ ] Set up photo cache cron job (9 AM daily)

---

## Troubleshooting

### Issue: Photos not loading in carousel

**Check**:
```bash
# Test photo API directly
curl https://your-domain.com/api/listings/YOUR_KEY/photos
```

**Common causes**:
- Missing `mlsId` in database (run fetch pipeline)
- Wrong `SPARK_ACCESS_TOKEN`
- Spark API rate limit

---

### Issue: Primary photos missing

**Fix**:
```bash
# On VPS
cd /root/website-backup/jpsrealtor
python3 src/scripts/mls/backend/unified/cache-photos.py
```

---

## Summary

✅ **Database**: Primary photo only (lightweight)
✅ **API**: Full photos on-demand (via Spark API)
✅ **Frontend**: Fast thumbnails + full galleries
✅ **VPS**: Can handle memory requirements

**Result**: Best of both worlds! 🎉

---

**Last Updated**: December 7, 2025
**Status**: Ready for implementation
