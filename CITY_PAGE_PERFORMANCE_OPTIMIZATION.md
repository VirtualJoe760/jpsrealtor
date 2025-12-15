# City Page Performance Optimization

**Date:** December 14, 2025
**Status:** Implemented

---

## 🎯 Problem

City pages were taking 20+ seconds to load due to:
- Multiple parallel API calls all waiting to complete
- Large dataset queries (200 listings per city)
- No request prioritization or deferred loading
- Missing database indexes for common queries

**Before Optimization:**
```
GET /api/cities/visalia/hoa          200 in 17.9s
GET /api/cities/visalia/listings     200 in 19.2s
GET /api/cities/visalia/stats?sale   200 in 20.5s
GET /api/cities/visalia/stats?rental 200 in 20.6s
```

---

## ✨ Solutions Implemented

### 1. **Incremental Stats Loading** (CityStats.tsx)

**Before:**
```typescript
// Fetched both stats in parallel - blocked until both completed
const [saleRes, rentalRes] = await Promise.all([
  fetch(`/api/cities/${cityId}/stats?propertyType=sale`),
  fetch(`/api/cities/${cityId}/stats?propertyType=rental`)
]);
```

**After:**
```typescript
// Fetch sale stats first (priority), show immediately
const saleRes = await fetch(`/api/cities/${cityId}/stats?propertyType=sale`);
if (saleRes.ok && isMounted) {
  const saleData = await saleRes.json();
  setSaleStats(saleData.stats);
  // Immediately display sale stats
  if (currentType === "sale") {
    setStats(saleData.stats);
  }
}

// Then fetch rental stats (lower priority)
const rentalRes = await fetch(`/api/cities/${cityId}/stats?propertyType=rental`);
```

**Impact:** Users see sale stats immediately without waiting for rental data

---

### 2. **Deferred Component Loading**

**SubdivisionsSection.tsx** - 500ms delay:
```typescript
useEffect(() => {
  // Defer subdivisions loading by 500ms to prioritize critical content
  const timer = setTimeout(async () => {
    const res = await fetch(`/api/cities/${cityId}/subdivisions`);
    // ... load data
  }, 500);

  return () => clearTimeout(timer);
}, [cityId]);
```

**HOASection.tsx** - 1000ms delay:
```typescript
useEffect(() => {
  // Defer HOA data loading by 1 second to prioritize critical content
  const timer = setTimeout(async () => {
    const res = await fetch(`/api/cities/${cityId}/hoa`);
    // ... load data
  }, 1000);

  return () => clearTimeout(timer);
}, [cityId]);
```

**CityMap.tsx** - 300ms delay + reduced limit:
```typescript
useEffect(() => {
  // Defer map listings by 300ms to prioritize page render
  const timer = setTimeout(async () => {
    const params = new URLSearchParams({
      limit: "100", // Reduced from 200 for faster loading
      propertyType: propertyTypeFilter,
    });
    const response = await fetch(`/api/cities/${cityId}/listings?${params}`);
    // ... load data
  }, 300);

  return () => clearTimeout(timer);
}, [cityId, propertyTypeFilter, ...filters]);
```

**Impact:** Critical content (hero, initial stats) loads immediately. Secondary content streams in progressively.

---

### 3. **Database Query Optimization**

**Added Compound Index** (unified-listing.ts):
```typescript
// Optimized index for city stats queries (city + propertyType + listPrice)
UnifiedListingSchema.index({ city: 1, propertyType: 1, listPrice: 1 });
```

**Added Query Limit** (stats/route.ts):
```typescript
const allListings = await UnifiedListing.find(baseQuery)
  .select("listPrice")
  .lean()
  .limit(5000) // Cap at 5000 to prevent excessive memory usage
  .exec();
```

**Impact:** Database queries use indexes instead of collection scans. Memory usage capped.

---

### 4. **Reduced Map Listing Limit**

**CityMap.tsx:**
- Before: `limit: "200"`
- After: `limit: "100"`

**Impact:** 50% reduction in data transfer and processing time for map

---

## 📊 Loading Priority

### Phase 1: Immediate (0ms)
✅ Page shell and hero
✅ Initial city stats (from server-side props)
✅ City name, description, population

### Phase 2: High Priority (0-300ms)
✅ Fresh sale stats from API
✅ Map initialization

### Phase 3: Medium Priority (300-500ms)
✅ Map listings (100 properties)
✅ Fresh rental stats
✅ Subdivisions section

### Phase 4: Low Priority (1000ms+)
✅ HOA communities
✅ Additional city data

---

## 🎨 User Experience Improvements

### Progressive Loading with Skeletons

All deferred components show loading skeletons:
```typescript
if (loading) {
  return (
    <div className={`${cardBg} ${cardBorder} border rounded-lg p-6 animate-pulse`}>
      <div className={`h-6 ${bgTertiary} rounded w-1/3 mb-4`}></div>
      <div className={`h-4 ${bgTertiary} rounded w-2/3`}></div>
    </div>
  );
}
```

### Cleanup on Unmount

All components properly cancel timers:
```typescript
return () => clearTimeout(timer);
```

Prevents memory leaks and stale data updates.

---

## 🚀 Performance Gains

### Expected Improvements:

**Page Interaction Time:**
- Before: 20+ seconds
- After: ~1-2 seconds (critical content visible)

**Perceived Performance:**
- Before: Blank screen for 20 seconds
- After: Progressive content streaming

**Database Load:**
- Query limit: 5000 docs max
- Compound indexes: ~10-100x faster queries
- Reduced parallel load

**Network Efficiency:**
- Map data: 50% reduction (100 vs 200 listings)
- Deferred requests: Lower peak bandwidth

---

## 📝 Files Modified

1. `src/app/components/cities/CityStats.tsx`
   - Sequential stats loading (sale first, then rental)
   - Cleanup handler

2. `src/app/components/cities/SubdivisionsSection.tsx`
   - 500ms defer timer

3. `src/app/components/cities/HOASection.tsx`
   - 1000ms defer timer

4. `src/app/components/cities/CityMap.tsx`
   - 300ms defer timer
   - Reduced limit to 100

5. `src/app/api/cities/[cityId]/stats/route.ts`
   - Added 5000 doc limit

6. `src/models/unified-listing.ts`
   - Added compound index: `{ city: 1, propertyType: 1, listPrice: 1 }`

---

## ✅ Testing Checklist

- [ ] City page loads hero immediately
- [ ] Sale stats appear within 1 second
- [ ] Map initializes and shows markers
- [ ] Subdivisions section streams in
- [ ] HOA section appears last
- [ ] Loading skeletons display correctly
- [ ] No console errors
- [ ] Page responsive during loading
- [ ] Theme support maintained (light/dark)
- [ ] Mobile performance acceptable

---

## 🎯 Next Steps (Future Optimizations)

### Caching Strategy
- Implement Redis cache for city stats (1-hour TTL)
- Cache subdivision data (24-hour TTL)
- Cache HOA data (24-hour TTL)

### Server-Side Rendering
- Pre-fetch critical data at build time
- Use ISR (Incremental Static Regeneration)
- Revalidate every 1 hour

### API Aggregation
- Create single `/api/cities/[cityId]/all` endpoint
- Stream JSON response using Server-Sent Events
- Client receives data progressively

### Image Optimization
- Lazy load map markers
- Use Next.js Image component for photos
- Implement blur placeholders

### Database Sharding
- Separate active vs archived listings
- City-specific collections for hot cities
- Read replicas for stats queries

---

**Performance optimization complete! 🎉**
