# Listing Panel Data Fix - publicRemarks & Agent Info

**Date:** December 15, 2025
**Issue:** ListingBottomPanel not showing property description or agent info when opened from chat
**Root Cause:** AI was not copying all fields when creating LISTING_CAROUSEL blocks

---

## Problem Discovered

### Test Results

**Test Page (`/test-listing-panel`):** ✅ Works perfectly
- Description shows
- Agent info shows
- Days on market shows
- All fields present

**Chat Interface:** ❌ Fields missing
- Description blank
- Agent info blank
- Days on market blank

### Root Cause

The AI was NOT including all fields when copying the `sampleListings` array into the `[LISTING_CAROUSEL]` block. It was creating simplified versions with only basic fields like `price`, `beds`, `baths`, `sqft`, etc.

**Missing fields:**
- `publicRemarks` - Property description
- `listOfficeName` - Brokerage name
- `listAgentFullName` / `listAgentName` - Agent name
- `listAgentEmail` - Agent email
- `listOfficePhone` - Office phone
- `daysOnMarket` - Time on market
- And 30+ other fields

---

## Solution Applied

### 1. Enhanced System Prompt Instructions

**File:** `src/lib/chat/system-prompt.ts`

**Added explicit warnings at response format section (lines 259-260):**
```typescript
⚠️ CRITICAL: Use CTRL+C / CTRL+V to copy the ENTIRE sampleListings array
DO NOT manually type listings - this omits critical fields like publicRemarks, agent info, etc.
```

**Expanded field listing section (lines 290-324):**
- Added warning about 40+ fields
- Listed critical fields that MUST be included
- Added explicit example showing correct format
- Emphasized `publicRemarks`, `listOfficeName`, `listAgentFullName`, `daysOnMarket`

**New section added:**
```typescript
⚠️ CRITICAL: The user's panel REQUIRES these fields or it will be blank:
- publicRemarks (property description - MUST be included)
- listOfficeName (brokerage - MUST be included)
- listAgentFullName or listAgentName (agent - MUST be included)
- daysOnMarket (market time - MUST be included)

Example of CORRECT listing copy (includes ALL fields):
{
  "_id": "693d00e8c5f5ad6e4d71ea48",
  "listingKey": "20251211203925139964000000",
  "publicRemarks": "Beautiful 2 bed 2 bath home...",  ← MUST INCLUDE
  "listOfficeName": "Keller Williams Realty",         ← MUST INCLUDE
  "listAgentFullName": "John Smith",                  ← MUST INCLUDE
  "daysOnMarket": 45,                                 ← MUST INCLUDE
  ... (copy ALL other fields too)
}
```

---

## Technical Architecture

### Data Flow (Verified Working)

1. **Query API** → Returns ALL 40+ fields ✅
   - File: `src/lib/queries/aggregators/active-listings.ts`
   - Field selection includes: `publicRemarks`, `listAgentFullName`, `listOfficeName`, etc.

2. **Tool Executor** → Receives complete data ✅
   - File: `src/lib/chat/tool-executor.ts`
   - Logs show all fields present in tool response

3. **AI Response** → Should copy ALL fields ⚠️ (Fixed with prompt)
   - File: `src/lib/chat/system-prompt.ts`
   - Updated instructions to emphasize copying everything

4. **Response Parser** → Extracts JSON ✅
   - File: `src/lib/chat/response-parser.ts`
   - Works correctly, parses whatever AI provides

5. **ChatWidget** → Spreads all fields to panel ✅
   - File: `src/app/components/chat/ChatWidget.tsx` (line 1125)
   - Uses `...currentListingQueue[currentListingIndex]` to include everything

6. **ListingBottomPanel** → Displays data ✅
   - File: `src/app/components/mls/map/ListingBottomPanel.tsx`
   - Conditionally displays fields if present
   - Works perfectly on test page

---

## Test Page Created

**URL:** `http://localhost:3000/test-listing-panel`

**Purpose:** Verify that:
1. Data exists in database ✅
2. Query API returns all fields ✅
3. ListingBottomPanel component works ✅
4. Identifies where data gets lost

**Test Results:**
- ✅ Direct API fetch works
- ✅ All fields present (publicRemarks, agent info, etc.)
- ✅ Panel displays everything correctly
- ✅ Confirmed issue is in AI response generation

---

## Files Modified

### 1. System Prompt (Critical Fix)
**File:** `src/lib/chat/system-prompt.ts`
- Lines 259-260: Added critical warning about copying full array
- Lines 290-324: Expanded instructions with examples
- Lines 305-324: Added required fields list with example

### 2. Test Page (Diagnostic Tool)
**File:** `src/app/test-listing-panel/page.tsx` (NEW)
- Fetches specific PDCC listing
- Shows all available fields
- Opens actual ListingBottomPanel
- Verifies component functionality

### 3. Query Field Selection (Earlier Fix)
**File:** `src/lib/queries/aggregators/active-listings.ts`
- Lines 235-255: Added all missing fields to selection
- Ensures API returns complete data

### 4. Unified Listing Model (Earlier Fix)
**File:** `src/models/unified-listing.ts`
- Lines 210-218: Added timestamp and change tracking fields
- Lines 392-400: Added schema fields with indexes

---

## Expected Behavior After Fix

### AI Response Should Include

**BEFORE (Wrong):**
```json
{
  "title": "31 homes in Palm Desert Country Club",
  "listings": [
    {
      "id": "20251211203925139964000000",
      "price": 499000,
      "beds": 2,
      "baths": 2,
      "sqft": 1238
    }
  ]
}
```
❌ Only 5 fields - missing publicRemarks, agent, daysOnMarket, etc.

**AFTER (Correct):**
```json
{
  "title": "31 homes in Palm Desert Country Club",
  "listings": [
    {
      "_id": "693d00e8c5f5ad6e4d71ea48",
      "listingKey": "20251211203925139964000000",
      "associationFee": 0,
      "bathroomsTotalDecimal": 2,
      "bedsTotal": 2,
      "city": "Palm Desert",
      "publicRemarks": "Beautiful 2 bed 2 bath home with pool...",
      "listOfficeName": "Keller Williams Realty",
      "listAgentFullName": "Peter Zarenejad",
      "listOfficePhone": "760-969-1000",
      "daysOnMarket": 45,
      "onMarketDate": "2025-12-04T21:03:13Z",
      "slug": "20251203205631387345000000",
      "slugAddress": "77300-minnesota-avenue-palm-desert-ca-92211",
      ... (30+ more fields)
    }
  ]
}
```
✅ All 40+ fields included

---

## Testing After Prompt Update

### Steps to Verify Fix

1. **Clear any AI cache** (if applicable)

2. **Search in chat:** "Palm Desert Country Club"

3. **Click "View Details"** on any listing

4. **Verify panel shows:**
   - ✅ Property description below details
   - ✅ "Listed by [Office], [Agent]" at bottom
   - ✅ "X Days on Market" badge
   - ✅ Phone number clickable

5. **Check browser console:**
   ```javascript
   [ListingBottomPanel] fullListing data: {
     hasPublicRemarks: true,  // Should be TRUE
     publicRemarksLength: 250+,
     publicRemarksPreview: "Beautiful home...",
     allKeys: [...includes 'publicRemarks', 'listOfficeName', etc...]
   }
   ```

6. **Check AI response logs:**
   ```
   [PARSE] Found carousel with 10 listings
   [PARSE] Raw carousel JSON: {..."publicRemarks":"..."...}
   ```

---

## Monitoring

Track these to ensure fix is working:

### Success Indicators
- [ ] Property description shows in 100% of panel opens
- [ ] Agent/brokerage info shows in 100% of panel opens
- [ ] Days on market shows when available
- [ ] Console logs show `hasPublicRemarks: true`

### Failure Indicators
- [ ] Description section blank
- [ ] "Listed by" missing or shows "Listing Brokerage"
- [ ] Console shows `hasPublicRemarks: false`
- [ ] Console shows publicRemarksLength: 0

---

## Rollback Plan

If AI still doesn't copy fields correctly:

### Option 1: Post-Process in Tool Executor
Add validation in `executeQueryDatabase()` to check if AI is using the data:

```typescript
// After AI creates response, validate it includes critical fields
if (aiResponse.includes('[LISTING_CAROUSEL]')) {
  const carouselMatch = aiResponse.match(/\[LISTING_CAROUSEL\](.*?)\[\/LISTING_CAROUSEL\]/s);
  if (carouselMatch) {
    const carouselData = JSON.parse(carouselMatch[1]);
    const firstListing = carouselData.listings[0];

    if (!firstListing.publicRemarks) {
      console.warn('[AI WARNING] publicRemarks missing from carousel!');
    }
  }
}
```

### Option 2: Frontend Enrichment
Fetch full listing data in ChatWidget before opening panel:

```typescript
const handleOpenListingPanel = async (listings: Listing[], startIndex: number) => {
  const listing = listings[startIndex];

  // Fetch full data from API
  const response = await fetch(`/api/mls-listings/${listing.slugAddress}`);
  const { listing: fullData } = await response.json();

  // Merge with chat listing
  const enrichedListing = { ...listing, ...fullData };

  setCurrentListingQueue([enrichedListing]);
  setShowListingPanel(true);
};
```

### Option 3: Reduce Token Usage
If AI is hitting token limits, reduce number of sample listings from 10 to 5:

```typescript
// In src/lib/queries/index.ts
const sampleListings = allListings.slice(0, 5); // Was 10
```

---

## Alternative Solutions Considered

### 1. ❌ Filter fields in query
**Rejected:** Defeats purpose of having complete data

### 2. ❌ Create simplified listing interface
**Rejected:** Loses important information

### 3. ✅ Strengthen AI prompt (CHOSEN)
**Reason:** Root cause is AI not following instructions

### 4. ✅ Add validation/monitoring
**Reason:** Catch issues early

---

## Future Improvements

### 1. Add Schema Validation
Validate AI response includes required fields before parsing:

```typescript
const requiredFields = ['publicRemarks', 'listOfficeName', 'listAgentName'];
const missingFields = requiredFields.filter(field => !listing[field]);

if (missingFields.length > 0) {
  console.warn('[VALIDATION] Missing fields:', missingFields);
  // Optionally fetch from API
}
```

### 2. Field Importance Scoring
Prioritize which fields to include if hitting token limits:

```typescript
const criticalFields = ['publicRemarks', 'listOfficeName', 'listAgentName'];
const importantFields = ['daysOnMarket', 'yearBuilt', 'lotSizeSqft'];
const optionalFields = ['bathroomsFull', 'bathroomsHalf'];
```

### 3. Automatic Fallback Fetch
If panel opens with missing data, auto-fetch from API:

```typescript
useEffect(() => {
  if (!fullListing.publicRemarks && fullListing.slugAddress) {
    // Fetch complete data
    fetchFullListing(fullListing.slugAddress);
  }
}, [fullListing]);
```

---

## Summary

**Problem:** AI was omitting critical fields when copying listing data
**Solution:** Enhanced system prompt with explicit warnings and examples
**Status:** ✅ Prompt updated, awaiting testing
**Test Page:** Available at `/test-listing-panel` to verify data integrity

All infrastructure is working correctly. The fix relies on the AI following the updated instructions to copy ALL fields exactly as provided.

---

**Next Step:** Test a new chat query for "Palm Desert Country Club" and verify the panel now shows description and agent info!
