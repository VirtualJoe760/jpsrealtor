# Contact Banner Photo Fetching Strategy

## Overview

The contact view panel now displays a property banner image behind the contact's profile photo and name. This document explains how we fetch and display property images for contacts.

## Visual Layout

```
┌─────────────────────────────────────────────────┐
│                                                 │
│         PROPERTY BANNER IMAGE                   │
│         (MLS or Street View)                    │
│              ↓                                  │
│    [Profile Photo]  Name & Organization         │
│    (overlapping)    (with backdrop)             │
└─────────────────────────────────────────────────┘
```

## Three-Tier Photo Fetching Strategy

When a contact has an address, we attempt to find property images using a three-tier fallback strategy:

### Strategy 1: Active MLS Listings (unified_listings)

**What it does:**
- Searches the `unified_listings` MongoDB collection for properties currently on the market
- Matches the contact's address using regex patterns against:
  - `unparsedAddress` field
  - `streetName` field
  - `city` field (if available)
  - `stateOrProvince` field (if available)

**Image sources:**
- Media array with multiple size options:
  - `Uri1280` (1280px - preferred)
  - `Uri1024` (1024px)
  - `Uri800` (800px)
  - `Uri640` (640px)
  - `MediaURL` (fallback)

**When to use:**
- Property is currently listed for sale
- Contact owns a property that's on the market

**Example log output:**
```
[Property Images API] ━━━ STRATEGY 1: Active MLS Listings ━━━
[Property Images API] Searching unified_listings collection...
[Property Images API] ✅ SUCCESS: Found active listing!
[Property Images API]   Listing Key: 12345678
[Property Images API]   Address: 123 Main St, City, State
[Property Images API]   Total Media Items: 25
[Property Images API] Extracting images from media array...
[Property Images API]   Image 1: Using 1280px version (Order: 0)
[Property Images API]   Image 2: Using 1280px version (Order: 1)
```

---

### Strategy 2: Closed MLS Listings (unified_closed_listings)

**What it does:**
- If no active listing found, searches `unified_closed_listings` for sold/closed properties
- Uses same address matching logic as Strategy 1
- Supports two data formats:
  1. **Media array** (newer format) - same as active listings
  2. **Photos array** (older format) - direct URL strings

**When to use:**
- Property previously listed but no longer active
- Contact bought/sold property in the past

**Example log output:**
```
[Property Images API] ━━━ STRATEGY 2: Closed MLS Listings ━━━
[Property Images API] Searching unified_closed_listings collection...
[Property Images API] ✅ SUCCESS: Found closed listing!
[Property Images API]   Listing Key: 87654321
[Property Images API]   Address: 123 Main St, City, State
[Property Images API]   Format: Media array (newer format)
[Property Images API]   Total Media Items: 18
[Property Images API] Extracting images from media array...
[Property Images API]   Image 1: Using 1024px version (Order: 0)
```

---

### Strategy 3: Google Street View (Fallback)

**What it does:**
- If no MLS images found, generates a Google Street View image
- Requires `GOOGLE_MAPS_API_KEY` environment variable
- Creates a static Street View image at 1200x800px

**When to use:**
- Property never listed in MLS
- No historical listing data available
- User wants some visual representation

**Requirements:**
- Set `GOOGLE_MAPS_API_KEY` in `.env.local`
- Contact must have complete address (street, city, state)

**Example log output:**
```
[Property Images API] ━━━ STRATEGY 3: Google Street View Fallback ━━━
[Property Images API] No MLS images found, attempting Street View...
[Property Images API] Full Address: 123 Main St, City, State 12345
[Property Images API] ✅ Google Maps API key is configured
[Property Images API] Generated Street View URL (key hidden for security)
[Property Images API] ✅ Using Google Street View as fallback
```

---

## Image Processing

### Size Preference
We prioritize larger images for better quality:
1. `Uri1280` (1280px wide) - Best quality
2. `Uri1024` (1024px wide)
3. `Uri800` (800px wide)
4. `Uri640` (640px wide)
5. `MediaURL` (fallback)

### Sorting
Images are sorted by their `order` field from the MLS data to display the primary/featured image first.

### Metadata Returned
For each image:
- `url` - The image URL
- `source` - Where it came from ("MLS Active", "MLS Closed", "Google Street View")
- `caption` - Optional description from MLS
- `order` - Display order (0 is primary)

---

## API Endpoint

**Route:** `/api/crm/contacts/[id]/property-images`

**Method:** GET

**Authentication:** Required (session-based)

**Response:**
```json
{
  "success": true,
  "images": [
    {
      "url": "https://...",
      "source": "MLS Active",
      "caption": "Beautiful front view",
      "order": 0
    }
  ],
  "source": "active",
  "address": {
    "street": "123 Main St",
    "city": "City",
    "state": "State",
    "zip": "12345"
  }
}
```

**Source Values:**
- `"active"` - Active MLS listing
- `"closed"` - Closed MLS listing
- `"streetview"` - Google Street View
- `"none"` - No images found

---

## Component Integration

### ContactPropertyCarousel.tsx
- Fetches images from the API endpoint
- Displays images in a carousel with navigation
- Shows source badge (color-coded by type)
- Handles loading and error states
- Supports multiple images with prev/next controls

### ContactViewPanel.tsx
- Embeds carousel as banner background
- Profile photo overlaps the banner (negative margin)
- Gradient overlay for text readability
- Fallback to colored gradient if no address

---

## Logging

The API includes comprehensive logging for debugging:

```
================================================================================
[Property Images API] 📸 PHOTO FETCHING PROCESS FOR CONTACT 507f1f77bcf86cd799439011
================================================================================
[Property Images API] Contact Address:
[Property Images API]   Street: 123 Main St
[Property Images API]   City:   San Diego
[Property Images API]   State:  CA
[Property Images API]   Zip:    92101

[Property Images API] 🔍 THREE-TIER SEARCH STRATEGY:
[Property Images API]   1. Active MLS Listings (unified_listings)
[Property Images API]   2. Closed MLS Listings (unified_closed_listings)
[Property Images API]   3. Google Street View (fallback)

[Property Images API] ━━━ STRATEGY 1: Active MLS Listings ━━━
...

[Property Images API] 📊 FINAL RESULTS
[Property Images API] ✅ SUCCESS: Returning 25 images from source: ACTIVE
[Property Images API] Images:
[Property Images API]   1. Source: MLS Active, Order: 0, Caption: Front view
[Property Images API]   2. Source: MLS Active, Order: 1, Caption: Living room
================================================================================
```

---

## Configuration

### Required Environment Variables

**.env.local:**
```bash
# Optional - for Google Street View fallback
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### When to Add Google Maps API Key

Only needed if:
- Many contacts don't have MLS listings
- Want comprehensive coverage for all addresses
- Need Street View as reliable fallback

---

## Performance Considerations

1. **Database Indexes**: Ensure indexes on address fields for fast queries
2. **Caching**: API uses `cache: "no-store"` for fresh data
3. **Image CDN**: MLS images served from CDN (Uri fields)
4. **Sequential Search**: Strategies run sequentially, stopping at first success

---

## Troubleshooting

### No Images Displayed

**Check logs for:**
```
[Property Images API] ⚠️ NO IMAGES FOUND - All strategies exhausted
[Property Images API] Possible reasons:
[Property Images API]   • Address not found in MLS databases
[Property Images API]   • Property never listed or listing too old
[Property Images API]   • Google Maps API key not configured
```

**Solutions:**
1. Verify contact has complete address
2. Check if property was ever listed in MLS
3. Add `GOOGLE_MAPS_API_KEY` for fallback coverage
4. Review MongoDB indexes on `unified_listings` and `unified_closed_listings`

### Wrong Property Images

**Possible causes:**
- Address regex too broad (matching wrong property)
- Multiple properties at similar addresses

**Solution:**
- Tighten address matching logic in queries
- Add additional filters (unit number, exact street match)

---

## Future Enhancements

1. **Cache property images** for faster loading
2. **Allow manual image upload** for contacts without MLS data
3. **Property type filtering** to improve match accuracy
4. **Fuzzy address matching** for better results
5. **Image quality selection** based on screen size
