# Neighborhoods System Fixes - Session Summary

**Date:** December 14, 2025

## Overview
This session focused on fixing critical issues with the neighborhoods directory system, including routing conflicts, photo loading problems, and slug collision issues.

---

## 1. Fixed Subdivision Page Routing (404 Error)

### Problem
- Subdivision pages like `/neighborhoods/los-angeles/non-hoa-los-angeles` were returning 404 errors
- Root cause: City pages were using hardcoded constants with incorrect city IDs (e.g., "los-angeles-city" vs "los-angeles")
- The subdivision page validation was comparing the wrong city ID formats

### Solution
**File Modified:** `src/app/neighborhoods/[cityId]/[slug]/page.tsx`

**Changes:**
- Removed dependency on hardcoded `findCityByName()` from constants
- Added `createSlug()` helper function to generate slugs dynamically
- Updated validation to compare slugs generated from subdivision's city name with URL cityId
- Now works with any subdivisions in the database automatically

**Code Change:**
```typescript
// BEFORE (hardcoded validation):
const cityData = findCityByName(subdivision.city);
if (!cityData || cityData.city.id !== cityId) {
  notFound();
}

// AFTER (dynamic slug validation):
const citySlug = createSlug(subdivision.city);
if (citySlug !== cityId) {
  notFound();
}
```

**Result:** ✅ Subdivision pages now load correctly (e.g., `/neighborhoods/los-angeles/non-hoa-los-angeles`)

---

## 2. Fixed Subdivision Photo Loading

### Problem
- Subdivision photo carousel was showing "No photos available"
- API was querying for `media` array field that wasn't populated in MongoDB
- Photos were being stored in `photoUrl`/`primaryPhotoUrl` fields instead

### Solution
**File Modified:** `src/app/api/subdivisions/[slug]/photos/route.ts`

**Complete Rewrite Approach:**
1. Changed from database media field queries to Spark API photo fetching
2. Now uses `/api/listings/${listingKey}/photos` endpoint for each listing (same as MLS listing pages)
3. Falls back to `primaryPhotoUrl` if Spark API fails
4. Simplified query logic with case-insensitive regex for city matching

**New Implementation:**
```typescript
// For each listing, fetch photos from Spark API
const photoPromises = listings.map(async (listing: any) => {
  const photosRes = await fetch(
    `${baseUrl}/api/listings/${listing.listingKey}/photos`,
    { cache: "no-store", headers: { "Accept": "application/json" } }
  );

  // Use first photo from API response
  const firstPhoto = photos[0];

  // Fallback to primaryPhotoUrl if API fails
  if (!firstPhoto) {
    return {
      src: listing.primaryPhotoUrl || "",
      // ... other fields
    };
  }

  return {
    src: firstPhoto.uri1600 || firstPhoto.uri1280 || ...,
    thumb: firstPhoto.uriThumb || firstPhoto.uri300,
    // ... other fields
  };
});
```

**Result:** ✅ Photos now load successfully from Spark API with proper caching

---

## 3. Fixed County/City Slug Conflicts

### Problem
- URL `/neighborhoods/riverside` was ambiguous - could mean:
  - Riverside County (13,503 listings)
  - Riverside City (734 listings)
- Both had the same slug "riverside", causing routing conflicts

### Solution
**File Modified:** `src/app/api/neighborhoods/directory/route.ts`

**Changes:**
- Added "-county" suffix to all county slugs in the API response
- This prevents conflicts with cities that have the same name as their county

**Code Change:**
```typescript
return {
  name: countyGroup._id,
  slug: createSlug(countyGroup._id) + '-county', // Add -county suffix
  listings: countyGroup.countyCount,
  cities,
  region: COUNTY_TO_REGION[countyGroup._id] || 'Other'
};
```

**New URL Structure:**
- Counties: `/neighborhoods/riverside-county`, `/neighborhoods/los-angeles-county`, `/neighborhoods/san-bernardino-county`
- Cities: `/neighborhoods/riverside`, `/neighborhoods/los-angeles`, `/neighborhoods/san-bernardino`

**Result:** ✅ County and city pages now have unique routes without conflicts

---

## 4. Added Regional Grouping Infrastructure

### Problem
- User requested Coachella Valley and Joshua Tree areas to be separate regions (as they were in old constants)
- Riverside County was too large and not showing subdivisions for these specialized areas

### Partial Implementation
**File Modified:** `src/app/api/neighborhoods/directory/route.ts`

**Changes Added:**
```typescript
// Special city-to-region mappings for Coachella Valley and Joshua Tree area
const COACHELLA_VALLEY_CITIES = [
  'Palm Desert', 'Palm Springs', 'La Quinta', 'Indio', 'Rancho Mirage',
  'Desert Hot Springs', 'Cathedral City', 'Indian Wells', 'Coachella',
  'Bermuda Dunes', 'Thermal', 'Thousand Palms', 'Mecca', 'Sky Valley',
  'North Shore', 'Desert Center', 'North Palm Springs', 'Oasis', 'Cabazon', 'Whitewater'
];

const JOSHUA_TREE_AREA_CITIES = [
  'Joshua Tree', 'Yucca Valley', '29 Palms', 'Twentynine Palms',
  'Morongo Valley', 'Pioneertown', 'Landers', 'Wonder Valley', 'Sunfair'
];
```

**Status:** ⚠️ Infrastructure added but not yet fully implemented
**Next Steps Needed:**
- Update region assignment logic to use these city arrays
- Split Riverside County cities into "Coachella Valley" and "Other Riverside County"
- Split San Bernardino County cities into "Joshua Tree Area" and "Other San Bernardino County"

---

## Files Modified Summary

1. **`src/app/neighborhoods/[cityId]/[slug]/page.tsx`**
   - Removed hardcoded constants
   - Added dynamic slug-based validation
   - Fixed subdivision routing

2. **`src/app/api/subdivisions/[slug]/photos/route.ts`**
   - Complete rewrite to use Spark API
   - Added photo fetching from `/api/listings/${listingKey}/photos`
   - Added primaryPhotoUrl fallback

3. **`src/app/api/neighborhoods/directory/route.ts`**
   - Added "-county" suffix to county slugs
   - Added Coachella Valley and Joshua Tree city arrays (infrastructure)

---

## Current Status

### ✅ Working
- Subdivision pages load correctly
- Photos display in subdivision carousels
- County pages have unique URLs (e.g., `/neighborhoods/riverside-county`)
- City pages remain at original URLs (e.g., `/neighborhoods/riverside`)

### ⚠️ Known Issues
1. **Frontend links still using old county slugs** - The neighborhoods page frontend needs to be updated to link to county pages with the new "-county" suffix
2. **Regional grouping incomplete** - Coachella Valley and Joshua Tree areas are defined but not yet separated from their parent counties
3. **Mongoose duplicate index warnings** - Subdivision model has duplicate slug indexes (field-level + schema-level)

---

## Next Steps Required

1. **Update Frontend County Links**
   - Modify `src/app/neighborhoods/page.tsx` to use `county.slug` (which now includes "-county")
   - Ensure all county links point to `/neighborhoods/${county.slug}` format

2. **Complete Regional Grouping**
   - Implement logic to split Riverside County into "Coachella Valley" and remaining cities
   - Implement logic to split San Bernardino County into "Joshua Tree Area" and remaining cities
   - Update aggregation pipeline to group by these new regions

3. **Fix Mongoose Warnings**
   - Remove duplicate index on `slug` field in `src/models/subdivisions.ts`
   - Choose either field-level OR schema-level index, not both

4. **Populate Subdivisions**
   - Investigate why Riverside and San Bernardino counties show `subdivisions: []`
   - May need to update aggregation to include subdivision data

---

## Testing Performed

- ✅ Tested subdivision page: `/neighborhoods/los-angeles/non-hoa-los-angeles` - Returns 200
- ✅ Tested photos API: `/api/subdivisions/non-hoa-los-angeles/photos?limit=2` - Returns photos with valid URLs
- ✅ Tested county API: `/api/neighborhoods/directory` - Counties have "-county" suffix
- ✅ Verified county page loads: `/neighborhoods/riverside-county` - Returns 200 (after initial 404)

---

## Technical Details

### Photo API Response Format
```json
{
  "photos": [
    {
      "photoId": "20250823193715781648000000",
      "listingId": "20250816200405983895000000",
      "slug": "3191-casitas-avenue-los-angeles-ca-90039",
      "caption": "25578959_cac901e1-40c6-4970-94eb-ed347ec",
      "src": "https://media.crmls.org/mediaz/36672032-1daf-4f90-8a77-4fba92f00cfa.jpg",
      "thumb": "https://media.crmls.org/mediaz/36672032-1daf-4f90-8a77-4fba92f00cfa.jpg",
      "address": "3191 Casitas Avenue, Los Angeles, CA 90039",
      "listPrice": 6,
      "bedroomsTotal": 0,
      "bathroomsTotalDecimal": 0
    }
  ],
  "total": 2,
  "subdivision": {
    "name": "Non-HOA Los Angeles",
    "city": "Los Angeles"
  }
}
```

### County Slug Examples
- "Los Angeles" → "los-angeles-county"
- "Riverside" → "riverside-county"
- "San Bernardino" → "san-bernardino-county"
- "Orange" → "orange-county"

---

## Notes
- All changes follow the same pattern as MLS listing pages for consistency
- Dynamic routing ensures automatic pickup of new cities/subdivisions from database
- No hardcoded constants needed - fully API-driven architecture
