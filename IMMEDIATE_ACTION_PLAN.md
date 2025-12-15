# Immediate Action Plan - Date Filter Fix

**Status:** 🔴 Ready for dev server restart
**Next Step:** Force clean rebuild

---

## ✅ What We Know For Sure

1. **MongoDB query is correct** - All test scripts return 6 listings
2. **Date filter logic is correct** - Timestamp appending works
3. **Server is running stale code** - Debug logs appear that were removed from source
4. **Hidden filters exist** - API returns 3 listings, tests return 100+

---

## 🚨 STEP 1: Force Clean Rebuild (DO THIS NOW)

```bash
# Stop dev server (CTRL+C)

# Clear all caches
rm -rf .next
rm -rf node_modules/.cache

# Rebuild (optional but recommended)
npm run build

# Restart
npm run dev
```

---

## 🧪 STEP 2: Test After Restart

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"city":"Palm Desert","filters":{"listedAfter":"2025-12-07","limit":10}}'
```

**Expected Result:** Should return 6 listings

---

## 🔍 STEP 3: If Still Broken - Add Logging

Add this to `src/lib/queries/aggregators/active-listings.ts`:

```typescript
export async function getActiveListingsByCity(
  city: string,
  filters: ActiveListingsFilters = {}
): Promise<ActiveListing[]> {
  const query = combineFilters({ city, ...filters });

  // LOG THE ACTUAL QUERY
  console.log('[FINAL MONGO QUERY]', JSON.stringify(query, (key, value) => {
    if (value instanceof RegExp) {
      return value.toString();
    }
    return value;
  }, 2));

  const listings = await UnifiedListing.find(query)
    .select(getFieldSelection())
    .limit(filters.limit || 100)
    .skip(filters.skip || 0)
    .sort(getSortOrder(filters.sort))
    .lean();

  console.log('[MONGO RESULT COUNT]', listings.length);
  return listings as ActiveListing[];
}
```

Then:
1. Run the API call again
2. Copy the logged query
3. Test it in MongoDB Compass/shell
4. If Compass returns 6 but API returns 0 → middleware issue

---

## 🔧 STEP 4: Nuclear Option - Bypass combineFilters

If logging doesn't reveal the issue, hardcode the query temporarily:

```typescript
// TEMPORARY DEBUG - REMOVE AFTER TESTING
const listings = await UnifiedListing.find({
  city: /^Palm Desert$/i,
  listPrice: { $exists: true, $ne: null, $gt: 0 },
  propertyType: { $ne: 'B' },
  onMarketDate: { $gte: "2025-12-07T00:00:00Z" }
})
.select(getFieldSelection())
.limit(filters.limit || 100)
.sort({ onMarketDate: -1 })
.lean();
```

If this works → `combineFilters()` is adding hidden constraints

---

## 🎯 Long-Term Fix: Normalize Dates

**Problem:** Mixing Date objects and strings causes serialization issues

**Solution:** Store dates as Date objects in MongoDB

### Migration Plan:

1. **Update Schema**
```typescript
// src/models/unified-listing.ts
onMarketDate: {
  type: Date,
  required: true,
  index: true
}
```

2. **Convert Existing Data**
```javascript
db.unified_listings.updateMany(
  { onMarketDate: { $type: "string" } },
  [{
    $set: {
      onMarketDate: { $toDate: "$onMarketDate" }
    }
  }]
)
```

3. **Update API Layer**
```typescript
// Convert string to Date at API boundary
if (body.filters.listedAfter) {
  body.filters.listedAfter = new Date(body.filters.listedAfter);
}
```

4. **Update buildTimeQuery**
```typescript
if (filter.listedAfter) {
  const date = filter.listedAfter instanceof Date
    ? filter.listedAfter
    : new Date(filter.listedAfter);
  query.onMarketDate = { $gte: date };
}
```

**Benefits:**
- No more string comparison issues
- MongoDB date operators work natively
- Proper timezone handling
- Index optimization
- Type safety

---

## 📊 Success Criteria

### After server restart, these should all pass:

1. ✅ API returns 6 listings with `listedAfter: "2025-12-07"`
2. ✅ AI chat correctly shows new listings
3. ✅ No debug logs from removed code
4. ✅ Consistent behavior between test scripts and API

---

## 🐛 Root Cause Analysis

**Primary Issue:** Next.js Turbopack not recompiling server routes
- Server running old compiled code
- TypeScript changes not picked up
- Debug logs from deleted code still executing

**Secondary Issue:** Hidden filters in query pipeline
- Base query returns 3 listings (should be 100+)
- Something is constraining results before date filter applies
- Not visible in logs

**Tertiary Issue:** String vs Date type ambiguity
- MongoDB stores as strings with timestamps
- API sometimes converts to Date objects
- Serialization breaks comparison
- Long-term fix: normalize to Date type everywhere

---

## 📝 Files That Need Attention

### Already Modified (Need Server Restart):
- ✅ `src/lib/queries/filters/time.ts` - Timestamp appending
- ✅ `src/app/api/query/route.ts` - Keep as string
- ✅ `src/lib/chat/tool-executor.ts` - Keep as string

### Needs Investigation:
- 🔍 `src/lib/queries/filters/index.ts` - combineFilters() logic
- 🔍 `src/lib/queries/aggregators/active-listings.ts` - Why only 3 results?

### Future Cleanup:
- 📅 Migration script to convert dates to Date type
- 📅 Schema update for type safety
- 📅 API layer date normalization

---

## 💡 Prevention Strategy

1. **Always restart dev server** after modifying:
   - API routes
   - Query builders
   - Server-side utilities

2. **Clear .next cache** when seeing weird behavior

3. **Add comprehensive logging** at query boundaries

4. **Use Date type** consistently (long-term)

5. **Test in MongoDB Compass** to isolate query vs code issues

---

## ✅ Next Action

**YOU NEED TO:**
1. Stop dev server
2. Clear caches
3. Restart
4. Test the API
5. Report results

**Most likely outcome:** It will work immediately after restart ✨

---

**Created:** 2024-12-14
**Priority:** 🔴 CRITICAL
**Estimated Fix Time:** 2 minutes (server restart) or 30 minutes (if deeper issue)
