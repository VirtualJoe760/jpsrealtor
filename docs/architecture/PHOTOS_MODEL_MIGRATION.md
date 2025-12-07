# Photos Model Migration to unified_listings.media

**Date**: December 6, 2025
**Status**: ✅ Complete

## Overview

Successfully migrated the entire codebase from the deprecated `Photos` collection to using the `media` field directly within `unified_listings`. This eliminates data duplication and simplifies the architecture by leveraging the existing Spark API Media expansion.

## Background

Previously, photos were stored in a separate `photos` collection, duplicating data that already existed in the `media` field of `unified_listings`. This created unnecessary complexity and maintenance overhead.

## Changes Made

### 1. API Routes Updated (13 files)

All API routes now read photos directly from `unified_listings.media`:

#### City Routes
- **`/api/cities/[cityId]/hoa/route.ts`** - Changed from `Listing` to `UnifiedListing`
- **`/api/cities/[cityId]/schools/route.ts`** - Changed from `Listing` to `UnifiedListing`
- **`/api/cities/[cityId]/photos/route.ts`** - Now uses `unified_listings.media` with primary photo selection
- **`/api/cities/[cityId]/listings/route.ts`** - References `unified_listings.media`

#### Subdivision Routes
- **`/api/subdivisions/[slug]/photos/route.ts`** - Completely rewritten to use `media` array
- **`/api/subdivisions/[slug]/listings/route.ts`** - Updated photo extraction from `media`

#### Listing Routes
- **`/api/mls-listings/[slugAddress]/route.ts`** - Gets primary photo from `media` array
- **`/api/mls-listings/[slugAddress]/documents/route.ts`** - Updated to use `Documents` field
- **`/api/mls-listings/[slugAddress]/openhouses/route.ts`** - Updated to use `OpenHouses` field
- **`/api/mls-listings/[slugAddress]/videos/route.ts`** - Updated to use `Videos` field
- **`/api/mls-listings/[slugAddress]/virtualtours/route.ts`** - Filters `Videos` by Type="VirtualTour"

#### Other Routes
- **`/api/photos/[listingId]/route.ts`** - Completely rewritten to read from `unified_listings.media`
- **`/api/search/route.ts`** - Removed async photo fetching, reads inline from `media`
- **`/api/test-photos/route.ts`** - Updated to test `unified_listings.media` instead

### 2. Photo Selection Pattern

Standard pattern used throughout:

```typescript
const media = listing.media || [];
const primaryPhoto = media.find(
  (m: any) => m.MediaCategory === "Primary Photo" || m.Order === 0
) || media[0];

const photoUrl = primaryPhoto?.Uri1280 ||
                 primaryPhoto?.Uri1024 ||
                 primaryPhoto?.Uri800 ||
                 primaryPhoto?.Uri640;
```

### 3. Component Naming Fixes

Fixed import/usage mismatches for Unified components:

- `ListingAttribution` → `UnifiedListingAttribution`
- `ListingBottomPanel` → `UnifiedListingBottomPanel`
- `ListingClient` → `UnifiedListingClient`

**Files Fixed**:
- `src/app/components/mls/ListingClient.tsx`
- `src/app/components/mls/map/MapPageClient.tsx`
- `src/app/components/mls/map/SwipeableListingStack.tsx`
- `src/app/mls-listings/[slugAddress]/page.tsx`

### 4. Type Fixes

#### MapView.tsx
Added type assertions for boundary polygon data:
```typescript
const currentName = (polygon as any).regionName ||
                   (polygon as any).countyName ||
                   (polygon as any).cityName;
```

#### MLSProvider.tsx
Fixed type conversion for disliked/favorited listings:
```typescript
addDislike(listing as unknown as MapListing);
removeFavoriteFromHook(listing as unknown as MapListing);
```

#### useServerClusters.ts
Removed non-existent `medianPrice` field reference, using `avgPrice` instead.

### 5. Field Name Capitalization

Updated to match Spark API capitalization in unified_listings:
- `documents` → `Documents`
- `openHouses` → `OpenHouses`
- `videos` → `Videos`

## Media Field Structure

The `media` array in `unified_listings` contains objects with:

```typescript
{
  MediaKey: string;
  Order: number;
  MediaType: string;
  MediaCategory: string; // "Primary Photo", etc.
  ShortDescription: string;
  Uri300: string;
  Uri640: string;
  Uri800: string;
  Uri1024: string;
  Uri1280: string;
  Uri1600: string;
  Uri2048: string;
  UriThumb: string;
  UriLarge: string;
  ImageWidth: number;
  ImageHeight: number;
}
```

## Photos Collection Status

The `Photos` collection and model (`src/models/photos.ts`) have been marked as **DEPRECATED** with a notice:

```typescript
/**
 * Photo Model - DEPRECATED
 *
 * Photos are now stored directly in unified_listings.media field.
 * Use /api/listings/[listingKey]/photos endpoint instead.
 *
 * This model is kept for backward compatibility only.
 */
```

## Benefits

1. ✅ **No Data Duplication** - Photos stored once in `unified_listings.media`
2. ✅ **Simplified Architecture** - One source of truth for listing data
3. ✅ **Cloudflare Caching** - API responses cached at CDN edge
4. ✅ **Consistency** - All listings have same media structure
5. ✅ **Performance** - Fewer database queries (no separate photo collection lookups)

## Migration Checklist

- [x] Update all API routes to use `unified_listings.media`
- [x] Fix component naming (Unified prefix)
- [x] Add type assertions for boundary polygons
- [x] Fix field capitalization (Documents, OpenHouses, Videos)
- [x] Update photo selection pattern across codebase
- [x] Mark Photos model as deprecated
- [x] Test all photo-related endpoints
- [x] Document changes

## Next Steps

1. Run `unified-fetch.py` with Media expansion for all MLSs to populate media arrays
2. Consider removing Photos collection entirely after verification period
3. Monitor Cloudflare cache hit rates on photo endpoints

## Related Files

- `/api/listings/[listingKey]/photos/route.ts` - Cloudflare-cached photo endpoint
- `src/app/components/mls/map/PannelCarousel.tsx` - Uses photo endpoint
- `src/models/unified-listing.ts` - Contains media field definition
- `src/scripts/mls/backend/unified/unified-fetch.py` - Fetches with Media expansion
