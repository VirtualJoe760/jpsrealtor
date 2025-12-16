# Chat System Testing Guide

**Date:** December 15, 2025
**Purpose:** Verify recent fixes for ArticleCard images, ListingBottomPanel data, and AI response formatting

---

## Recent Changes Summary

### 1. ArticleCard Image Display Fix
- **Issue:** Images showed placeholder icons instead of actual thumbnails
- **Root Cause:** API returned `featuredImage: {url: "..."}` but ArticleCard expected `image: "..."`
- **Fix:** Added transformation in `tool-executor.ts` (lines 310-317)
- **File:** `src/lib/chat/tool-executor.ts`

### 2. Complete Listing Data in ListingBottomPanel
- **Issue:** Missing fields: publicRemarks, agent info, bathrooms, lotSize, propertySubType
- **Root Cause:** Tool executor was filtering to only ~15 fields
- **Fix:** Changed to spread operator `...l` to include ALL database fields (line 256)
- **File:** `src/lib/chat/tool-executor.ts`

### 3. AI Response Formatting
- **Issue:** AI was dumping raw JSON and URLs in chat text
- **Root Cause:** System prompt didn't clarify component blocks are hidden from user
- **Fix:** Added "CRITICAL FORMATTING RULES" section (lines 276-283)
- **File:** `src/lib/chat/system-prompt.ts`

### 4. Map Zoom Level
- **Issue:** Map was too zoomed in
- **Fix:** Changed default zoom from 13 to 12
- **File:** `src/app/components/chat/ChatMap.tsx`

### 5. Carousel/List View Toggle
- **Feature:** Added ability to toggle between carousel and list view
- **File:** `src/app/components/chat/ChatWidget.tsx`

---

## Test Cases

### Test Case 1: Palm Desert Country Club Search

**Objective:** Verify listings render correctly with complete data and proper formatting

**Steps:**
1. Reload your dev server if needed
2. Open chat widget on the homepage
3. Type: "Palm Desert Country Club"
4. Submit the query

**Expected Results:**

✅ **AI Response Text:**
- Natural language only (e.g., "I found 31 homes in Palm Desert Country Club")
- NO raw JSON visible in chat text
- NO URLs visible in chat text (like jpsrealtor.com/mls-listings/...)
- NO property data dumped as text

✅ **Listing Carousel:**
- Carousel component renders below the AI message
- All property cards show images (no broken image icons)
- Clicking a card opens the listing detail page

✅ **Map Component:**
- Map renders below the carousel
- Markers show for all properties
- Map zoom level is appropriate (not too zoomed in)
- Default zoom should be 12

✅ **View Toggle:**
- Toggle button appears above the listings
- Clicking toggle switches between carousel and list view
- Both views show the same properties

---

### Test Case 2: Listing Detail Data Completeness

**Objective:** Verify ListingBottomPanel receives all required fields

**Steps:**
1. Complete Test Case 1 first
2. Click on any property card from the results
3. Scroll to the "Property Details" section on the listing page

**Expected Results:**

✅ **Required Fields Present:**
- Property description (publicRemarks) - full text visible
- Listing agent name and contact info
- Bathrooms count (not just bedrooms)
- Lot size (in square feet or acres)
- Property subtype (e.g., "Single Family Residence", "Condominium")
- Land type if applicable
- Year built
- HOA fees if applicable
- All other standard MLS fields

✅ **Data Accuracy:**
- No "undefined" or "null" displayed
- Numbers formatted correctly (prices, sqft, etc.)
- Dates formatted as readable dates

---

### Test Case 3: Article Search and Display

**Objective:** Verify ArticleCard shows thumbnail images correctly

**Steps:**
1. Open chat widget
2. Type: "articles about buying homes" or "real estate market trends"
3. Submit the query

**Expected Results:**

✅ **AI Response:**
- Natural language introduction
- [ARTICLE_RESULTS] component renders (not shown as JSON)
- NO raw JSON in chat text

✅ **Article Cards:**
- All article cards show thumbnail images
- No placeholder icons (unless article truly has no image)
- Images load from MongoDB `featuredImage.url` field
- Clicking card opens article page

✅ **Console Logs (check browser DevTools):**
```
[executeSearchArticles] API returned: X articles
[executeSearchArticles] First article has image?: https://...
[PARSE] Found article results with X articles
```

---

### Test Case 4: Sources and Citations

**Objective:** Verify URLs appear in [SOURCES] blocks, not in response text

**Steps:**
1. Open chat widget
2. Type: "Show me the neighborhood page for Indian Wells"
3. Submit the query

**Expected Results:**

✅ **AI Response:**
- Natural language only
- NO URLs written in the response text
- [NEIGHBORHOOD_LINK] or [SOURCES] component renders separately
- Clicking the component/link navigates to the page

❌ **WRONG (should NOT happen):**
- "Check out jpsrealtor.com/insights/article-slug for more info"
- "Visit /neighborhoods/indian-wells"
- Any visible URL in the chat text

---

### Test Case 5: Complex Multi-Tool Query

**Objective:** Verify AI handles complex queries efficiently

**Steps:**
1. Open chat widget
2. Type: "Compare average prices between Palm Desert and Indian Wells"
3. Submit the query

**Expected Results:**

✅ **AI Behavior:**
- Uses 1-2 tool rounds (efficient batching)
- Returns both sets of stats in one response
- No raw JSON visible
- [MARKET_STATS] or [COMPARISON] component renders

✅ **Response Content:**
- Clear comparison of both cities
- Specific numbers (average prices, sqft, days on market)
- [SOURCES] block for data attribution
- Natural language explanation

---

### Test Case 6: Map Zoom Test

**Objective:** Verify map zoom is appropriate for various queries

**Steps:**
1. Search: "homes in Palm Desert"
2. Observe map zoom level
3. Search: "homes in Desert Horizons" (smaller subdivision)
4. Observe map zoom level

**Expected Results:**

✅ **City-Level Query:**
- Zoom level: ~11-12
- Shows entire city area
- Multiple listings visible

✅ **Subdivision-Level Query:**
- Zoom level: ~13-14 (slightly closer)
- Shows entire subdivision
- All subdivision listings visible

❌ **WRONG (should NOT happen):**
- Zoom level 15+ (too close, can't see area)
- Zoom level 8-9 (too far out, too much whitespace)

---

### Test Case 7: View Toggle Functionality

**Objective:** Verify carousel/list view toggle works correctly

**Steps:**
1. Search: "homes in La Quinta under $500k"
2. Observe default carousel view
3. Click the toggle button
4. Observe list view
5. Click toggle again

**Expected Results:**

✅ **Toggle Button:**
- Button appears above the listings
- Icon changes between carousel icon and list icon
- Smooth transition

✅ **Carousel View (default):**
- Horizontal scrollable cards
- Property photos prominent
- 2-3 visible at once

✅ **List View:**
- Vertical stacked cards
- More details visible per listing
- Full width cards

✅ **State Persistence:**
- Toggle state persists during the conversation
- If you toggle to list, next search also shows list
- State resets on page refresh (expected)

---

## Browser Console Checks

### Open DevTools (F12) and check for:

**Good Signs (✅):**
```
[PARSE] Found carousel with X listings
[PARSE] Found map view with X listings
[batchFetchPhotos] Fetched X photos
[CACHE HIT] queryDatabase (age: Xs, ttl: 120s)
[executeSearchArticles] API returned: X articles
```

**Warning Signs (⚠️):**
```
[PARSE] Failed to parse carousel JSON: ...
[fetchListingPhoto] Timeout after 3s, using placeholder
[PARSE] Failed to parse article results JSON: ...
```

**Bad Signs (❌):**
```
[PARSE] Failed to parse ... (repeated errors)
Uncaught TypeError: Cannot read property 'url' of undefined
Network error: 500 Internal Server Error
```

---

## Network Tab Checks

### Open DevTools → Network Tab:

**For Listing Searches:**
1. Look for `/api/query` request
2. Check response includes `sampleListings` array
3. Verify each listing has 30+ fields

**For Photo Fetching:**
1. Look for `/api/listings/*/photos` requests
2. Should fire in parallel (not sequential)
3. Should have 3-second timeout

**For Article Searches:**
1. Look for `/api/articles/search` request
2. Check response includes `results` array
3. Verify each article has `featuredImage.url` field

---

## Known Issues / Pending Items

### Still TODO:
1. **List view pagination** - List view doesn't have pagination yet
2. **Navigation-style toggle** - User wants toggle to look like admin nav (text-based), not button-style
3. **Placeholder image hosting** - Currently uses Unsplash, should host locally

### Won't Fix (Expected Behavior):
1. **Cache staleness** - Cached results valid for 2 minutes (by design)
2. **External image loading** - Some listing photos load slower (external MLS servers)

---

## Rollback Instructions

If any test fails and you need to revert changes:

### Revert Article Image Fix:
```bash
git diff HEAD src/lib/chat/tool-executor.ts
# Find lines 310-317 and remove transformation
```

### Revert Listing Data Spread:
```bash
# Change line 256 back to selective fields
# (Not recommended - will break ListingBottomPanel)
```

### Revert System Prompt Changes:
```bash
git checkout HEAD -- src/lib/chat/system-prompt.ts
```

### Revert Map Zoom:
```bash
# Change default zoom back to 13 in ChatMap.tsx
```

---

## Success Criteria

All tests pass if:

- ✅ ArticleCard shows thumbnails correctly (no placeholders)
- ✅ ListingBottomPanel has all required fields
- ✅ AI never shows raw JSON in chat text
- ✅ AI never shows URLs in chat text
- ✅ [LISTING_CAROUSEL] and [MAP_VIEW] render as components
- ✅ Map zoom level is appropriate (12 for cities)
- ✅ Toggle button switches between carousel and list view
- ✅ All property cards are clickable and navigate correctly
- ✅ No JavaScript errors in console
- ✅ Photo fetching completes in <3 seconds

---

## Debugging Tips

### If ArticleCard shows placeholders:
1. Check browser console for `[executeSearchArticles]` logs
2. Verify API response has `featuredImage.url`
3. Check Network tab for `/api/articles/search` response
4. Verify transformation in `tool-executor.ts` lines 310-317

### If ListingBottomPanel missing data:
1. Check browser console for `[queryDatabase]` logs
2. Verify API response has full listing objects
3. Check `tool-executor.ts` line 256 has `...l` spread
4. Inspect component props in React DevTools

### If AI shows raw JSON:
1. Check `system-prompt.ts` lines 276-283 are present
2. Verify AI is using latest system prompt
3. Check response for component block markers
4. Try asking question in different way

### If map zoom is wrong:
1. Check `ChatMap.tsx` default zoom value
2. Verify bounds calculation for query type
3. Check fitBounds logic for city vs subdivision

---

## Contact

If tests fail or you encounter unexpected behavior:
- Check `local-logs/chat-records` for full conversation logs
- Review terminal output for API errors
- Check MongoDB for data issues
- Verify environment variables are set correctly

---

**Last Updated:** December 15, 2025
**Next Review:** After testing completion
