# Chat Widget - Listing Detail Panel Data Fix

**Issue:** When clicking "View Details" on a listing in chat, the bottom panel shows incomplete/missing data

**Root Cause:** The `sampleListings` object only included minimal fields, but `ListingBottomPanel` expects full MLS data

---

## Changes Made

### 1. `src/lib/chat/tool-executor.ts` (lines 214-249)

**Before:** Only returned 12 basic fields
```typescript
{
  id, price, beds, baths, sqft, address, city,
  subdivision, image, url, latitude, longitude
}
```

**After:** Now returns 26 fields including:
```typescript
{
  // Original fields
  id, price, beds, baths, sqft, address, city, subdivision,
  image, url, latitude, longitude,

  // NEW: Additional MLS fields
  yearBuilt, lotSizeSqft, pool, spa, garageSpaces,
  propertyType, propertySubType, publicRemarks,
  daysOnMarket, onMarketDate, slug, mlsSource,
  associationFee, viewYn
}
```

### 2. `src/app/components/chat/ChatWidget.tsx` (lines 943-956)

**Updated `fullListing` prop** to include all new fields from sampleListings:

```typescript
fullListing={{
  // Original fields...
  listingKey, slug, address, city, subdivision, price,
  beds, baths, sqft, lat/lng, photo,

  // NEW: Pass through additional fields
  yearBuilt: currentListingQueue[currentListingIndex].yearBuilt,
  lotSizeSqft: currentListingQueue[currentListingIndex].lotSizeSqft,
  poolYn: currentListingQueue[currentListingIndex].pool,
  spaYn: currentListingQueue[currentListingIndex].spa,
  garageSpaces: currentListingQueue[currentListingIndex].garageSpaces,
  propertyType: currentListingQueue[currentListingIndex].propertyType,
  propertySubType: currentListingQueue[currentListingIndex].propertySubType,
  publicRemarks: currentListingQueue[currentListingIndex].publicRemarks,
  daysOnMarket: currentListingQueue[currentListingIndex].daysOnMarket,
  onMarketDate: currentListingQueue[currentListingIndex].onMarketDate,
  mlsSource: currentListingQueue[currentListingIndex].mlsSource,
  associationFee: currentListingQueue[currentListingIndex].associationFee,
  viewYn: currentListingQueue[currentListingIndex].viewYn,
}}
```

---

## What This Fixes

### Before:
- ❌ Year Built: Missing
- ❌ Lot Size: Missing
- ❌ Pool/Spa: Missing
- ❌ Garage Spaces: Missing
- ❌ Property Description: Missing
- ❌ HOA Fee: Missing
- ❌ Days on Market: Missing
- ❌ View: Missing

### After:
- ✅ Year Built: Shows actual year
- ✅ Lot Size: Shows sqft
- ✅ Pool/Spa: Shows Yes/No
- ✅ Garage Spaces: Shows count
- ✅ Property Description: Shows publicRemarks
- ✅ HOA Fee: Shows monthly fee
- ✅ Days on Market: Shows DOM
- ✅ View: Shows if property has a view

---

## Testing

1. **Ask for listings:**
   ```
   "Show me listings in Palm Desert"
   ```

2. **Click "View Details" or "Show Details"** on any listing

3. **Verify the panel shows:**
   - Property description
   - Year built
   - Lot size
   - Pool/Spa indicators
   - Garage info
   - HOA fees
   - Days on market
   - All other MLS details

---

## Related Files

- ✅ `src/lib/chat/tool-executor.ts` - Expanded sampleListings object
- ✅ `src/app/components/chat/ChatWidget.tsx` - Updated fullListing prop
- 📄 `src/app/components/mls/map/ListingBottomPanel.tsx` - Consumer (no changes needed)
- 📄 `src/lib/queries/aggregators/active-listings.ts` - Source data (already includes all fields)

---

## Performance Impact

**Minimal** - These fields already exist in the query result from the API. We're just passing them through instead of dropping them. No additional database queries required.

**Payload size increase:** ~500-1000 bytes per listing (for publicRemarks text)

---

## Future Enhancements

Consider fetching full listing data on-demand when user clicks "View Details" if payload size becomes an issue:

```typescript
// Option: Lazy load full data
const handleViewDetails = async (listingId: string) => {
  const fullData = await fetch(`/api/mls-listings/${listingId}`);
  setCurrentFullListing(fullData);
  setShowPanel(true);
};
```

For now, the upfront approach is simpler and provides instant detail view.

---

**Created:** 2024-12-14
**Status:** ✅ Ready for testing after server restart
**Impact:** High - Fixes user-facing data completeness issue
