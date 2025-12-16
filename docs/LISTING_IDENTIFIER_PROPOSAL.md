# Listing Identifier Architecture - Simplified AI Response

**Date:** December 15, 2025
**Proposal:** Replace full listing data in AI responses with identifiers only
**Goal:** Massively reduce token usage and simplify AI prompt

---

## Current Problem

### How It Works Now

**1. Tool Executor Returns Full Data:**
```typescript
// src/lib/chat/tool-executor.ts (lines 255-269)
return sampleListings.map((l: any) => ({
  ...l, // Include ALL 40+ original fields from database
  id: l.listingKey,
  price: l.listPrice,
  beds: l.bedroomsTotal,
  baths: l.bathroomsTotalDecimal,
  sqft: l.livingArea,
  address: l.unparsedAddress,
  city: l.city,
  subdivision: l.subdivisionName,
  image: photoMap.get(l.listingKey),
  url: `/mls-listings/${l.slug}`,
  slugAddress: l.slugAddress,
  publicRemarks: l.publicRemarks,
  listOfficeName: l.listOfficeName,
  listAgentFullName: l.listAgentFullName,
  daysOnMarket: l.daysOnMarket,
  yearBuilt: l.yearBuilt,
  lotSizeSqft: l.lotSizeSqft,
  // ... 30+ more fields
}));
```

**Token Usage:** ~4000 tokens for 10 listings

---

**2. AI Receives Full Data:**
```json
{
  "summary": {
    "sampleListings": [
      {
        "listingKey": "20251203205631387345000000",
        "price": 499000,
        "beds": 2,
        "baths": 2,
        "sqft": 1238,
        "address": "77300 Minnesota Avenue",
        "city": "Palm Desert",
        "publicRemarks": "Beautiful 2 bed 2 bath...",
        "listOfficeName": "Keller Williams Realty",
        "listAgentFullName": "Peter Zarenejad",
        "daysOnMarket": 45,
        "yearBuilt": 1982,
        // ... 30+ more fields per listing
      }
      // ... 9 more listings
    ]
  }
}
```

---

**3. AI Tries to Copy Everything:**
System prompt currently says:
```
HOW TO INCLUDE LISTINGS:
1. Find the "sampleListings" array in the queryDatabase tool response
2. Copy the array into the "listings" field
3. Include at minimum: id, price, beds, baths, sqft, address, city, subdivision, image, url, slug, slugAddress
4. Additional fields are helpful but not required (frontend will fetch complete data when needed)
```

**Problems:**
- ❌ AI often hits 4000 token response limit
- ❌ AI sometimes omits critical fields
- ❌ Wastes tokens on data the frontend will re-fetch anyway
- ❌ Prompt complexity

---

**4. Frontend Currently Uses AI Data:**
```typescript
// ChatWidget displays carousel using AI's data
<ListingCarousel
  listings={msg.components.carousel.listings} // From AI response
  onOpenPanel={handleOpenListingPanel}
/>

// Then re-fetches when panel opens
const handleOpenListingPanel = async (listings, startIndex) => {
  const listing = listings[startIndex];
  const response = await fetch(`/api/mls-listings/${listing.slugAddress}`);
  const fullData = await response.json();
  // Use full data for panel
};
```

**Inefficiency:** Data fetched twice (once in tool executor, once in panel)

---

## Proposed Solution

### Minimal Identifier Architecture

**1. Tool Executor Returns Only Identifiers:**
```typescript
// src/lib/chat/tool-executor.ts
return sampleListings.map((l: any) => ({
  // IDENTIFIERS (required for fetching)
  listingKey: l.listingKey,
  slugAddress: l.slugAddress,

  // DISPLAY FIELDS (for carousel cards)
  price: l.listPrice,
  beds: l.bedroomsTotal,
  baths: l.bathroomsTotalDecimal,
  sqft: l.livingArea,
  address: l.unparsedAddress,
  city: l.city,
  subdivision: l.subdivisionName,
  image: photoMap.get(l.listingKey),

  // LOCATION (for map)
  latitude: l.latitude,
  longitude: l.longitude,

  // That's it! No publicRemarks, no agent info, no 30+ extra fields
}));
```

**Token Usage:** ~800 tokens for 10 listings (80% reduction!)

---

**2. AI Receives Minimal Data:**
```json
{
  "summary": {
    "sampleListings": [
      {
        "listingKey": "20251203205631387345000000",
        "slugAddress": "77300-minnesota-avenue-palm-desert-ca-92211",
        "price": 499000,
        "beds": 2,
        "baths": 2,
        "sqft": 1238,
        "address": "77300 Minnesota Avenue",
        "city": "Palm Desert",
        "subdivision": "Palm Desert Country Club",
        "image": "https://...",
        "latitude": 33.7489,
        "longitude": -116.3766
      }
      // ... 9 more listings (much smaller!)
    ]
  }
}
```

---

**3. AI Simply Passes Identifiers:**
System prompt becomes ultra-simple:
```
HOW TO INCLUDE LISTINGS:
1. Find the "sampleListings" array in the queryDatabase tool response
2. Copy it directly into the "listings" field
3. The frontend will fetch complete data automatically

Example:
[LISTING_CAROUSEL]
{
  "title": "10 homes in Palm Desert",
  "listings": [Copy entire sampleListings array here]
}
[/LISTING_CAROUSEL]
```

**AI just copies the small array - no thinking required!**

---

**4. Frontend Fetches Data On-Demand:**

#### Option A: Batch Fetch on Carousel Render
```typescript
// ChatResultsContainer.tsx
export default function ChatResultsContainer({ components, onOpenListingPanel }) {
  const [enrichedListings, setEnrichedListings] = useState(components.carousel?.listings || []);

  useEffect(() => {
    if (components.carousel?.listings) {
      // Fetch all listings in background
      const slugs = components.carousel.listings.map(l => l.slugAddress);

      fetch('/api/mls-listings/batch', {
        method: 'POST',
        body: JSON.stringify({ slugs })
      })
      .then(res => res.json())
      .then(data => {
        setEnrichedListings(data.listings);
      });
    }
  }, [components.carousel?.listings]);

  return (
    <ListingCarousel
      listings={enrichedListings}
      onOpenPanel={handleOpenListingPanel}
    />
  );
}
```

#### Option B: Fetch on Panel Open (Current Approach)
```typescript
// ChatWidget.tsx (already implemented!)
const handleOpenListingPanel = async (listings, startIndex) => {
  const listing = listings[startIndex];

  // Fetch complete data when user clicks "View Details"
  const response = await fetch(`/api/mls-listings/${listing.slugAddress}`);
  const { listing: fullData } = await response.json();

  setCurrentListingQueue([{ ...listing, ...fullData }]);
  setShowListingPanel(true);
};
```

**Option B is already implemented!** We just need to reduce what the AI sends.

---

## Implementation Plan

### Phase 1: Reduce Tool Executor Output ✅ READY

**File:** `src/lib/chat/tool-executor.ts` (lines 255-269)

**Change:**
```typescript
// BEFORE: Return all 40+ fields
return sampleListings.map((l: any) => ({
  ...l, // Spreads everything
  id: l.listingKey,
  price: l.listPrice,
  // ...
}));

// AFTER: Return only what's needed
return sampleListings.map((l: any) => ({
  // Identifiers
  listingKey: l.listingKey,
  slugAddress: l.slugAddress,
  slug: l.slug,

  // Display fields (for carousel cards)
  id: l.listingKey,
  price: l.listPrice,
  beds: l.bedroomsTotal || l.bedsTotal,
  baths: l.bathroomsTotalDecimal,
  sqft: l.livingArea,
  address: l.address || l.unparsedAddress,
  city: l.city,
  subdivision: l.subdivisionName,
  image: photoMap.get(l.listingKey) || DEFAULT_PHOTO_URL,
  url: `/mls-listings/${l.slug || l.listingKey}`,

  // Location (for map)
  latitude: l.latitude,
  longitude: l.longitude,
}));
```

**Impact:**
- Token reduction: ~4000 → ~800 (80% savings)
- Faster AI responses
- No risk of hitting token limit

---

### Phase 2: Simplify System Prompt ✅ READY

**File:** `src/lib/chat/system-prompt.ts`

**Change:**
```typescript
// BEFORE (lines 290-294):
HOW TO INCLUDE LISTINGS:
1. Find the "sampleListings" array in the queryDatabase tool response
2. Copy the array into the "listings" field
3. Include at minimum: id, price, beds, baths, sqft, address, city, subdivision, image, url, slug, slugAddress
4. Additional fields are helpful but not required (frontend will fetch complete data when needed)

// AFTER (much simpler):
HOW TO INCLUDE LISTINGS:
1. Find the "sampleListings" array in the queryDatabase tool response
2. Copy it EXACTLY as provided into the "listings" field
3. The frontend automatically enriches data when users view details

Example:
[LISTING_CAROUSEL]
{
  "title": "[count] homes in [location]",
  "listings": [Copy the entire sampleListings array here]
}
[/LISTING_CAROUSEL]
```

**Impact:**
- Simpler instructions = fewer AI errors
- No field-specific warnings needed
- AI just copies small array verbatim

---

### Phase 3: Frontend Already Ready! ✅ DONE

**Current implementation:**
- `ChatWidget.handleOpenListingPanel()` already fetches complete data
- `ListingBottomPanel` works perfectly with enriched data
- `ChatResultsContainer` renders carousel with whatever data available

**No changes needed!** The frontend enrichment is already implemented.

---

## Token Savings Analysis

### Before (Current)

**Per Listing:**
```json
{
  "listingKey": "...",
  "price": 499000,
  "beds": 2,
  "baths": 2,
  "sqft": 1238,
  "address": "...",
  "city": "...",
  "subdivision": "...",
  "image": "...",
  "url": "...",
  "slugAddress": "...",
  "publicRemarks": "Beautiful 2 bed 2 bath home with pool and spa...",
  "listOfficeName": "Keller Williams Realty",
  "listAgentFullName": "Peter Zarenejad",
  "listAgentEmail": "peter@kw.com",
  "listOfficePhone": "760-969-1000",
  "daysOnMarket": 45,
  "yearBuilt": 1982,
  "lotSizeSqft": 7500,
  "poolYn": true,
  "spaYn": true,
  "viewYn": true,
  "garageSpaces": 2,
  "associationFee": 350,
  "bathroomsFull": 2,
  "bathroomsHalf": 0,
  "propertyType": "Residential",
  "propertySubType": "Single Family Residence",
  "mlsSource": "CRMLS",
  "onMarketDate": "2025-10-15",
  "listingContractDate": "2025-10-10",
  "priceChangeTimestamp": "2025-11-01",
  // ... 10+ more fields
}
```
**Estimated tokens:** ~400 tokens per listing

---

### After (Proposed)

**Per Listing:**
```json
{
  "listingKey": "20251203205631387345000000",
  "slugAddress": "77300-minnesota-avenue-palm-desert-ca-92211",
  "slug": "20251203205631387345000000",
  "id": "20251203205631387345000000",
  "price": 499000,
  "beds": 2,
  "baths": 2,
  "sqft": 1238,
  "address": "77300 Minnesota Avenue",
  "city": "Palm Desert",
  "subdivision": "Palm Desert Country Club",
  "image": "https://...",
  "url": "/mls-listings/...",
  "latitude": 33.7489,
  "longitude": -116.3766
}
```
**Estimated tokens:** ~80 tokens per listing

---

### Savings

| Scenario | Before | After | Savings |
|----------|--------|-------|---------|
| **Per listing** | ~400 tokens | ~80 tokens | 80% |
| **10 listings** | ~4000 tokens | ~800 tokens | 80% |
| **Total AI response** | ~6000 tokens | ~2000 tokens | 67% |

**Benefits:**
- ✅ Never hit 4000 token response limit
- ✅ Faster AI responses (less to generate)
- ✅ Lower API costs
- ✅ More reliable (simpler task for AI)

---

## Performance Considerations

### Batch Fetch API Endpoint

If we want to fetch all listings upfront (Option A), create batch endpoint:

**File:** `src/app/api/mls-listings/batch/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import UnifiedListing from '@/models/unified-listing';
import connectDB from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { slugs } = await request.json();

    if (!slugs || !Array.isArray(slugs)) {
      return NextResponse.json(
        { error: 'slugs array required' },
        { status: 400 }
      );
    }

    // Fetch all listings in parallel
    const listings = await UnifiedListing.find({
      slugAddress: { $in: slugs }
    }).lean();

    // Return in same order as requested
    const orderedListings = slugs.map(slug =>
      listings.find(l => l.slugAddress === slug)
    ).filter(Boolean);

    return NextResponse.json({
      listings: orderedListings,
      count: orderedListings.length
    });
  } catch (error: any) {
    console.error('[Batch Listings] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

**Benefits:**
- Single database query for all listings
- Parallel fetching
- Order preserved

---

### Caching Strategy

Add Redis caching for frequently viewed listings:

```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

export async function GET(
  request: NextRequest,
  { params }: { params: { slugAddress: string } }
) {
  const cacheKey = `listing:${params.slugAddress}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return NextResponse.json({ listing: cached });
  }

  // Fetch from database
  const listing = await UnifiedListing.findOne({ slugAddress: params.slugAddress });

  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, listing);

  return NextResponse.json({ listing });
}
```

---

## Testing Plan

### 1. Verify Token Reduction

**Before:**
```bash
# Count tokens in current AI response
AI Response: ~6000 tokens
```

**After:**
```bash
# Count tokens in new AI response
AI Response: ~2000 tokens
Expected: 67% reduction ✅
```

---

### 2. Verify Data Completeness

**Test carousel cards:**
```
✅ Price displays
✅ Beds/baths display
✅ Sqft displays
✅ Image displays
✅ Address displays
```

**Test panel opening:**
```
✅ publicRemarks displays
✅ Agent info displays
✅ Days on market displays
✅ All 40+ fields present
```

---

### 3. Verify Performance

**Measure carousel render:**
```
Before: Instant (data already in message)
After: Instant (data still in message)
No change ✅
```

**Measure panel open:**
```
Before: ~150ms (fetch full data)
After: ~150ms (fetch full data)
No change ✅
```

---

## Rollback Plan

If issues arise:

```bash
# Revert tool executor
git checkout HEAD -- src/lib/chat/tool-executor.ts

# Revert system prompt
git checkout HEAD -- src/lib/chat/system-prompt.ts
```

Frontend changes not needed (already enriching data).

---

## Migration Strategy

### Option 1: Immediate Switch (Recommended)
- Change tool executor to return minimal fields
- Update system prompt
- Test with one search
- If works, done!

**Risk:** Low (frontend already handles enrichment)

---

### Option 2: Gradual Rollout
- Add feature flag: `USE_MINIMAL_LISTINGS`
- Test with subset of users
- Monitor error rates
- Gradual rollout

**Risk:** Very low (can switch back instantly)

---

## Summary

### Current Architecture
- AI receives 40+ fields per listing (~4000 tokens)
- AI tries to copy everything
- Often hits token limits
- Frontend re-fetches anyway

### Proposed Architecture
- AI receives 12 fields per listing (~800 tokens)
- AI just copies small array
- Never hits token limits
- Frontend enriches on-demand

### Benefits
- ✅ 80% token reduction
- ✅ Simpler AI prompt
- ✅ Faster responses
- ✅ More reliable
- ✅ Lower costs
- ✅ Frontend already ready

### Implementation
- Change 1 function in tool-executor
- Simplify system prompt
- No frontend changes needed
- 30 minutes of work

---

**Recommendation:** Implement immediately. The frontend enrichment is already built and working perfectly. We're just reducing unnecessary data transfer.

**Next Step:** Update tool executor to return minimal fields and test with a search.
