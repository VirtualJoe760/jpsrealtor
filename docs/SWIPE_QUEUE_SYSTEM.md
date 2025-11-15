# Swipe Queue System Documentation

## Overview

The swipe queue system provides users with an intelligent, priority-based feed of property listings similar to the one they're currently viewing. It handles likes/dislikes, prevents duplicate showings, and automatically transitions between priority levels to maximize relevant results.

## Architecture

### Consolidated Hook: `useSwipeQueue()`

**Location**: `src/app/utils/map/useSwipeQueue.ts`

This hook consolidates all swipe-related functionality into a single, maintainable interface:

- **Queue Management**: Priority-based fetching and filtering
- **Swipe Tracking**: Like/dislike actions with batch syncing
- **Exclude Keys**: Prevents showing already-swiped properties
- **Session Management**: Initializes once per swipe session

## Priority System

The queue fetches similar listings using a 4-level priority system. Each level is attempted in order until results are found.

### Priority Levels

#### **Priority 1: Same Subdivision + Same Property Subtype** 🏘️
- **Goal**: Show properties in the exact same community with the same style
- **Example**: User viewing a Single Family home in "Palm Desert Country Club" → shows other Single Family homes in PDCC
- **Filters**:
  - Same subdivision name
  - Same property subtype (Single Family, Condo, Townhome, etc.)
  - Same property type (A=Sale, B=Lease, C=Income)
  - Excludes already-swiped listings
- **Limit**: 50 listings
- **Skip Condition**: Non-HOA properties (subdivision = "Not Applicable" or "Other")

#### **Priority 2: Same Subdivision + Different Property Subtype** 🏘️
- **Goal**: Show other property styles in the same community
- **Example**: User viewing a Single Family home in PDCC → shows Condos and Townhomes in PDCC
- **Filters**:
  - Same subdivision name
  - **Any** property subtype (expands options)
  - Same property type (A/B/C)
  - Excludes already-swiped listings
- **Limit**: 50 listings
- **Skip Condition**: Non-HOA properties

#### **Priority 3: 2-Mile Radius + Same Property Subtype** 📍
- **Goal**: Find similar properties nearby geographically
- **Example**: User viewing a Single Family home in PDCC → shows other Single Family homes within 2 miles
- **Filters**:
  - Within 2-mile radius of original listing
  - Same property subtype (returns to original style preference)
  - Same property type (A/B/C)
  - **Any** subdivision (geographic expansion)
  - Excludes already-swiped listings
- **Limit**: 50 listings

#### **Priority 4: 5-Mile Radius + Same Property Subtype** 📍
- **Goal**: Expand geographic search to find more options
- **Example**: User viewing a Single Family home → shows other Single Family homes within 5 miles
- **Filters**:
  - Within 5-mile radius of original listing
  - Same property subtype
  - Same property type (A/B/C)
  - **Any** subdivision
  - Excludes already-swiped listings
- **Limit**: 50 listings

#### **Priority 5: Exhausted** 🏁
- **Goal**: Signal that all relevant properties have been shown
- **Result**: Display completion modal suggesting user move to a different area or browse favorites

## Key Design Decisions

### ✅ Property Type (A/B/C) is ALWAYS Maintained

**Critical**: The system **never** mixes Sale (A), Lease (B), and Income (C) properties.

- If user starts with a Sale property, they only see Sale properties
- This prevents confusing users by mixing rental and sale listings

### ✅ Property Subtype Flexibility

- **Priority 1**: Strict (same subtype)
- **Priority 2**: Flexible (any subtype in same subdivision)
- **Priority 3 & 4**: Strict again (back to original subtype preference)

**Rationale**: Users interested in a subdivision may like different property styles within it, but when expanding geographically, revert to their original preference.

### ✅ Non-HOA Handling

Properties with subdivision = "Not Applicable" or "Other" **skip Priorities 1 & 2 entirely** and start at Priority 3.

**Rationale**: These aren't real subdivisions, so subdivision-based filtering doesn't make sense. Instead, we jump directly to geographic search (2-mile radius + same subtype).

**Example**: User clicks on a Single Family home with subdivision "Not Applicable" in Palm Desert:
- ❌ Skip Priority 1 (no meaningful subdivision to match)
- ❌ Skip Priority 2 (no meaningful subdivision to match)
- ✅ Start at Priority 3: Find other Single Family homes within 2 miles of Palm Desert
- ✅ Priority 4: Expand to 5 miles if needed

This prevents showing random properties from completely different cities (e.g., Long Beach when user is in Palm Desert).

### ✅ One-Time Initialization Per Session

The queue initializes **once** when the user first selects a listing to swipe on. It does NOT re-initialize when advancing through listings.

**Rationale**: Prevents the bug where users saw the same listing repeatedly. Each swipe session maintains a consistent queue based on the initial context.

**Session Reset**: Queue resets when:
- User closes the listing panel
- User manually selects a different listing from the map

## Swipe Batching System

### Optimistic Updates

When a user swipes:
1. Listing is **immediately** added to `excludeKeys` (optimistic)
2. Swipe action is added to pending batch
3. UI updates instantly (no lag)

### Batch Syncing

**Trigger Conditions** (whichever comes first):
- Batch reaches **10 swipes**
- **2 minutes** elapse since first swipe

**Sync Process**:
1. Send pending swipes to `/api/swipes/batch`
2. Server stores likes (permanent) and dislikes (30-min TTL)
3. Refresh exclude keys from database
4. Update analytics (top subdivisions, cities, property types)

### Anonymous Users

Users without accounts are tracked via:
- **Browser fingerprint**: Generated using device/browser characteristics
- **Persistent across sessions**: Same fingerprint = same user
- **Automatic account linking**: If user signs in later, their swipe history is preserved

## Queue Refill Logic

The queue automatically refills when it gets low:

```
Valid Queue Size < MIN_QUEUE_SIZE (3)
  ↓
Fetch more listings at current priority
  ↓
If no results → advance to next priority
  ↓
If all priorities exhausted → set isExhausted = true
```

**Prevents**:
- Running out of listings mid-session
- Duplicate fetches (tracks fetching state)
- Showing already-swiped listings (filters by excludeKeys)

## Example User Flow

### Scenario: User views a Single Family home in "Palm Desert Country Club"

1. **Initial Selection**
   - User clicks listing on map
   - Queue initializes with context:
     ```json
     {
       "subdivision": "Palm Desert Country Club",
       "propertyType": "A",
       "propertySubType": "Single Family",
       "city": "Palm Desert",
       "latitude": 33.72,
       "longitude": -116.37
     }
     ```

2. **Priority 1 Fetch**
   - Fetches 50 Single Family homes in PDCC
   - Filters out current listing
   - Loads first 10 into queue

3. **User Swipes Right** ❤️
   - Current listing added to `excludeKeys`
   - Swipe batched (1/10)
   - Next listing from queue displayed
   - 2-minute timer starts

4. **User Continues Swiping**
   - Each swipe removes listing from queue
   - When queue drops below 3 valid listings → auto-refills
   - Still fetching from Priority 1 (PDCC Single Family homes)

5. **Priority 1 Exhausted**
   - All Single Family homes in PDCC shown/swiped
   - Automatically advances to Priority 2
   - Fetches Condos/Townhomes in PDCC

6. **User Swipes 10 Times**
   - Batch auto-flushes to database
   - Server stores likes and dislikes
   - Analytics updated
   - Exclude keys refreshed from DB

7. **All Priorities Exhausted**
   - No more relevant properties found
   - `isExhausted = true`
   - Completion modal shown: "You've seen all similar properties!"
   - Options: View favorites or browse different area

## API Endpoints

### `GET /api/mls-listings`
Fetches listings with filters for each priority level.

**Query Parameters**:
- `propertyType`: A/B/C (always included)
- `subdivision`: For Priorities 1 & 2
- `propertySubType`: For Priorities 1, 3, 4
- `lat`, `lng`, `radius`: For Priorities 3 & 4
- `excludeKeys`: Comma-separated listing keys to exclude
- `limit`: Max results (typically 50)

### `POST /api/swipes/batch`
Syncs batched swipe actions to database.

**Request Body**:
```json
{
  "swipes": [
    {
      "listingKey": "12345-A",
      "action": "like" | "dislike",
      "listingData": { /* full listing object */ },
      "timestamp": 1234567890
    }
  ],
  "anonymousId": "fingerprint-hash"
}
```

**Response**:
```json
{
  "success": true,
  "likesCount": 5,
  "dislikesCount": 3,
  "analytics": {
    "topSubdivisions": ["PDCC", "Desert Willow"],
    "topCities": ["Palm Desert"],
    "topPropertyTypes": ["Single Family"]
  }
}
```

### `GET /api/swipes/exclude-keys`
Returns all listing keys the user has already swiped on.

**Query Parameters**:
- `anonymousId`: Browser fingerprint (for non-logged-in users)

**Response**:
```json
{
  "excludeKeys": ["12345-A", "67890-B", ...]
}
```

**Includes**:
- All liked listings (permanent)
- Non-expired disliked listings (< 30 minutes old)

### `GET /api/swipes/user`
Returns user's complete swipe history.

**Response**:
```json
{
  "likedListings": [
    {
      "listingKey": "12345-A",
      "listingData": { /* full listing */ },
      "swipedAt": "2025-01-14T10:30:00Z"
    }
  ],
  "dislikedListings": [
    {
      "listingKey": "67890-B",
      "listingData": { /* full listing */ },
      "swipedAt": "2025-01-14T10:32:00Z",
      "expiresAt": "2025-01-14T11:02:00Z"
    }
  ],
  "analytics": { /* swipe patterns */ }
}
```

## Data Models

### User Model (`src/models/user.ts`)

**Swipe-Related Fields**:
```typescript
{
  anonymousId: String,  // Browser fingerprint
  likedListings: [
    {
      listingKey: String,
      listingData: Object,  // Full listing details
      swipedAt: Date
    }
  ],
  dislikedListings: [
    {
      listingKey: String,
      listingData: Object,
      swipedAt: Date,
      expiresAt: Date  // 30 minutes from swipedAt
    }
  ],
  swipeAnalytics: {
    topSubdivisions: [String],
    topCities: [String],
    topPropertyTypes: [String]
  },
  lastSwipeSync: Date
}
```

## Testing Checklist

### ✅ Basic Functionality
- [ ] User can swipe right (like) on a listing
- [ ] User can swipe left (dislike) on a listing
- [ ] Next listing appears after swipe
- [ ] Liked listings appear in favorites panel
- [ ] Disliked listings appear in disliked panel

### ✅ Priority System
- [ ] Priority 1 shows same subdivision + same subtype
- [ ] Priority 2 shows same subdivision + different subtypes
- [ ] Priority 3 shows 2-mile radius + same subtype
- [ ] Priority 4 shows 5-mile radius + same subtype
- [ ] Completion modal shows when all priorities exhausted

### ✅ Exclude Keys
- [ ] Swiped listings don't reappear in queue
- [ ] After batch sync, exclude keys refresh from database
- [ ] Manual page refresh loads exclude keys correctly

### ✅ Session Management
- [ ] Queue initializes once per session
- [ ] Queue doesn't re-initialize when advancing through listings
- [ ] Queue resets when user closes panel
- [ ] Queue resets when user manually selects different listing from map

### ✅ Edge Cases
- [ ] Non-HOA properties skip Priorities 1 & 2
- [ ] Property type (A/B/C) never mixes
- [ ] Queue handles 0 results gracefully
- [ ] Batch syncs after 10 swipes or 2 minutes
- [ ] Page unload sends remaining swipes via beacon

## Troubleshooting

### Issue: Same listing appears multiple times

**Cause**: Queue was re-initializing on every listing change

**Fix**: `isInitializedRef` prevents re-initialization. Queue now initializes once per session.

### Issue: Listings from different property types appear

**Cause**: `propertyType` filter not consistently applied

**Fix**: All priority levels now enforce `propertyType` filter at query level.

### Issue: Swipes not saving to database

**Cause**: Batch timer not starting or beacon not firing

**Fix**:
1. Check browser console for batch timer logs
2. Verify `/api/swipes/batch` endpoint is accessible
3. Ensure `navigator.sendBeacon` is supported (all modern browsers)

### Issue: User sees listings they already swiped on

**Cause**: Exclude keys not syncing properly

**Fix**:
1. Check `excludeKeys` are being added optimistically on swipe
2. Verify batch sync refreshes exclude keys from database
3. Ensure API endpoint returns both likes and non-expired dislikes

## Future Enhancements

### Potential Improvements

1. **Machine Learning Priority**
   - Analyze user's like patterns
   - Adjust priority weights based on preferences
   - Example: If user likes mostly Condos, prioritize Condos even in Priority 2

2. **Price Range Affinity**
   - Track user's price range preferences
   - Filter queue to similar price points
   - Example: User likes properties $500K-$700K → prioritize that range

3. **Time-Based Re-Showing**
   - Allow disliked listings to reappear after 7 days
   - Add "Maybe Later" option (shorter TTL than dislike)

4. **Collaborative Filtering**
   - "Users who liked this also liked..."
   - Cross-reference with other users' swipe patterns

5. **Save Searches from Swipe Patterns**
   - Auto-generate saved search based on swipe analytics
   - Example: "You've liked 10 homes in PDCC - Save this search?"

6. **A/B Testing Priorities**
   - Test different priority orders
   - Measure engagement and conversion rates
   - Optimize for user satisfaction

## Summary

The swipe queue system provides an intelligent, context-aware feed of property listings that:

- ✅ Maintains strict property type boundaries (Sale/Lease/Income)
- ✅ Prioritizes hyperlocal results (same subdivision) before expanding geographically
- ✅ Prevents duplicate showings via optimistic exclude keys
- ✅ Syncs swipes efficiently with smart batching
- ✅ Supports anonymous users with browser fingerprinting
- ✅ Provides clear completion state when all options exhausted
- ✅ Initializes once per session to prevent re-initialization bugs

This creates a smooth, predictable user experience similar to popular swipe-based apps like Tinder, but optimized for real estate discovery.
