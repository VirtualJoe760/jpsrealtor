# Location Snapshot Fix - December 18, 2025

## Problem Report
**User Report**: "when i searched palm desert in the map search bar it came back with too modest of an answer, it didnt include any mark down. this is our snapshot that isnt functioning."

## Root Cause Analysis

### Issue 1: Missing Event Dispatch
**Location**: `src/app/components/mls/map/search/MapSearchBar.tsx`

**Problem**: The MapSearchBar component was NOT dispatching the `requestLocationInsights` event that ChatWidget was listening for.

**Expected Flow**:
1. User searches "Palm Desert" in MapSearchBar
2. MapSearchBar dispatches `requestLocationInsights` event
3. ChatWidget catches event and calls `/api/chat/stream` with `locationSnapshot` parameter
4. Stream route builds locationSnapshot prompt
5. AI returns 2-3 paragraph markdown overview

**Actual Flow**:
1. User searches "Palm Desert" in MapSearchBar
2. MapSearchBar only updates URL params and calls `onSearch(lat, lng)`
3. **No event dispatched** ❌
4. ChatWidget never receives the request
5. No AI snapshot generated

**Evidence**:
- ChatWidget.tsx lines 571-653: Event listener exists for `requestLocationInsights`
- MapSearchBar.tsx handleSelect function: Only navigates to listings or updates URL params
- No code dispatching the custom event

### Issue 2: LocationSnapshot Mode Using Generic AI Knowledge Instead of Real MLS Data
**Location**: `src/lib/chat/prompts/location-snapshot.ts` and `src/app/api/chat/stream/route.ts`

**Problem**: The locationSnapshot mode prompt was telling the AI to "use general knowledge" instead of calling tools to get REAL, CURRENT MLS data.

**Why This Matters**:
- Users expect a **market snapshot** with real numbers: total listings, avg price, median, days on market, bedroom distribution
- The original prompt said "Use general knowledge about the area's price ranges" - causing generic, non-specific responses
- Tools like `getMarketStats` and `queryDatabase` provide actual current data from the MLS database
- Without tool calls, AI gives training-data responses that may be outdated or inaccurate

**User Feedback**:
> "it doesnt look like it recruited any of the tools we have in our data base such as, average price, amount of listings, median price, average days on market, average sqft, or how many homes are 2, 3, or 4+ bed homes in the area."

**Evidence**:
Original prompt (WRONG):
```typescript
1. **Typical Home Prices** by property type (SFR, condos, townhomes)
   - Use general knowledge about the area's price ranges  // ❌ Generic data
   - Mention if it's a luxury, mid-range, or affordable market
   - Reference current market data if available
```

## The Fix

### Fix 1: Dispatch Event from MapSearchBar
**File**: `src/app/components/mls/map/search/MapSearchBar.tsx`

**Changes**:
```typescript
// Added after onSearch call in handleSelect
// Dispatch location insights request to ChatWidget
// This triggers AI to provide a location snapshot (2-3 paragraph overview)
const event = new CustomEvent('requestLocationInsights', {
  detail: {
    locationName: result.label,
    locationType: 'city', // geocode results are typically cities
    city: result.label,
    state: 'CA' // TODO: Extract from result if available
  }
});
window.dispatchEvent(event);
console.log('📍 [MapSearchBar] Dispatched requestLocationInsights for:', result.label);
```

### Fix 2: Update LocationSnapshot Prompt to Use Real Data
**File**: `src/lib/chat/prompts/location-snapshot.ts`

**Changes**:
```typescript
**CRITICAL: You MUST use tools to get REAL, CURRENT MLS data. Do NOT rely on general knowledge.**

**Step 1: Gather Real Data**
Use these tools to get actual market statistics:
- \`getMarketStats\` - Get average price, median price, days on market, price per sqft, total listings
- \`queryDatabase\` with \`includeStats: true\` - Get bedroom distribution (2BR, 3BR, 4+BR counts)

**Step 2: Write Snapshot**
After getting real data, provide a concise, engaging overview in 2-3 paragraphs covering:

1. **Current Market Data** (use REAL numbers from tools)
   - Total active listings
   - Average price, median price, price range
   - Average days on market
   - Bedroom distribution (how many 2BR, 3BR, 4+BR homes)
   - Average square footage
```

**Key Changes**:
- ✅ Explicitly instructs AI to use tools (not general knowledge)
- ✅ Specifies which tools to call: `getMarketStats`, `queryDatabase`
- ✅ Lists exact data points to include: total listings, avg/median price, DOM, bedroom counts
- ✅ Still prohibits UI components: "DO NOT include [LISTING_CAROUSEL], [MAP_VIEW]"
- ✅ Requires [SOURCES] attribution

**File**: `src/app/api/chat/stream/route.ts`

**Changes**:
```typescript
// Tools ARE enabled for locationSnapshot mode (to get real MLS data)
const shouldUseTools = !textOnly; // locationSnapshot mode NEEDS tools for real MLS data
```

**Additional Logging**:
```typescript
// Log mode for debugging
if (locationSnapshot) {
  console.log(`[AI] 📍 Location Snapshot Mode: ${locationSnapshot.name} (${locationSnapshot.type})`);
} else if (textOnly) {
  console.log(`[AI] 📝 Text-Only Mode`);
} else {
  console.log(`[AI] 🔧 Full Mode (with tools)`);
}
```

## Testing Plan

### Manual Test 1: Map Search Bar Integration
1. Open map view
2. Type "Orange" in search bar
3. Select "Orange" from dropdown
4. **Expected**:
   - Map flies to Orange
   - Chat receives location snapshot request
   - AI calls `getMarketStats({city: "Orange"})` and/or `queryDatabase({city: "Orange", includeStats: true})`
   - AI provides 2-3 paragraph markdown overview with REAL DATA:
     - "Right now, Orange has 247 active listings..."
     - "The average price is $850,000 with a median of $780,000..."
     - "Homes are averaging 32 days on market..."
     - "The inventory includes 45 2-bedroom, 128 3-bedroom, and 74 4+ bedroom homes..."
   - No [LISTING_CAROUSEL] or [MAP_VIEW] components
   - Includes [SOURCES] attribution

### Manual Test 2: Verify Event Flow
Check browser console for logs:
```
📍 [MapSearchBar] Dispatched requestLocationInsights for: Palm Desert
📍 [ChatWidget] Received location insights request: { locationName: "Palm Desert", ... }
🤖 [ChatWidget] Sending location snapshot request to AI (locationSnapshot mode)
[AI] 📍 Location Snapshot Mode: Palm Desert (city)
```

### Manual Test 3: Verify Real Data in Response
- Response should be 2-3 paragraphs of markdown with REAL MLS NUMBERS
- Should include specific data: total listings, avg price, median price, days on market, bedroom distribution
- Should NOT include [LISTING_CAROUSEL], [MAP_VIEW], or other UI tags
- SHOULD include [SOURCES] attribution
- Should be warm, conversational, informative
- Compare numbers to what's actually in the database for verification

## Architecture Notes

### Event-Driven Communication
The location snapshot feature uses a custom event pattern:
- **Dispatcher**: MapSearchBar (on geocode result selection)
- **Listener**: ChatWidget (useEffect on mount)
- **Event Name**: `requestLocationInsights`
- **Event Detail**: `{ locationName, locationType, city, state }`

### Mode System
The chat stream route supports 3 modes:
1. **Full Mode** (default): Tools enabled, markdown + UI components ([LISTING_CAROUSEL], [MAP_VIEW])
2. **Text-Only Mode**: NO tools, markdown-only digest for map background queries
3. **Location Snapshot Mode**: Tools enabled (for real data), markdown-only (no UI components)

Mode selection is controlled by parameters passed to `/api/chat/stream`:
- `textOnly: true` → Text-Only Mode (no tools, markdown only)
- `locationSnapshot: { name, type }` → Location Snapshot Mode (tools for data, markdown only)
- Neither → Full Mode (tools + UI components)

**Key Difference**:
- **textOnly**: General markdown response without calling database (fast)
- **locationSnapshot**: Market snapshot with real MLS data but rendered as markdown (accurate)

## Related Files
- `src/app/components/mls/map/search/MapSearchBar.tsx` - Event dispatcher
- `src/app/components/chat/ChatWidget.tsx` - Event listener
- `src/app/api/chat/stream/route.ts` - Mode handling
- `src/lib/chat/prompts/index.ts` - Prompt composition
- `src/lib/chat/prompts/location-snapshot.ts` - Snapshot prompt template

## Commit Message
```
Fix: Location snapshot returning generic AI responses instead of real MLS data

Two critical issues preventing location snapshot feature:

1. MapSearchBar not dispatching requestLocationInsights event
   - Added CustomEvent dispatch in handleSelect for geocode results
   - ChatWidget listener was present but never triggered

2. LocationSnapshot prompt using "general knowledge" instead of real data
   - Original prompt told AI to "use general knowledge about price ranges"
   - Updated to require tool calls: getMarketStats, queryDatabase
   - AI now provides REAL numbers: total listings, avg/median price, DOM, bedroom distribution
   - Still renders as markdown-only (no UI components)

Expected behavior:
- Search "Orange" in map search bar
- Map flies to location
- AI calls getMarketStats({city: "Orange"})
- Chat shows 2-3 paragraph overview with REAL MLS data
- No [LISTING_CAROUSEL] components, just markdown with real numbers
- Includes [SOURCES] attribution

Files changed:
- src/app/components/mls/map/search/MapSearchBar.tsx (event dispatch)
- src/lib/chat/prompts/location-snapshot.ts (require tools)
- src/app/api/chat/stream/route.ts (enable tools for locationSnapshot)
```
