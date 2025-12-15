# Neighborhoods CHAP Integration Plan

**Date:** December 14, 2025
**Goal:** Seamlessly integrate neighborhoods directory into CHAP through the HoverStatsOverlay info panel
**Status:** Planning Phase

---

## 🎯 Vision

Add a "View All Regions" or contextual navigation button to the **HoverStatsOverlay** (info panel at top of map) that allows users to:
1. Navigate to `/neighborhoods` directory when hovering over "Explore California"
2. Navigate to specific county page when hovering over a county (e.g., `/neighborhoods/riverside-county`)
3. Navigate to specific city page when hovering over a city (e.g., `/neighborhoods/palm-desert`)
4. View subdivision information when appropriate

---

## 📊 Current HoverStatsOverlay Structure

### Component Location
`src/app/components/mls/map/HoverStatsOverlay.tsx`

### Current Display States

#### 1. **Default State (No Hover)**
```
┌────────────────────────────────┐
│    Explore California          │
│                                │
│  79,588 Listings | $839K      │
│  (Rotating messages)           │
└────────────────────────────────┘
```

#### 2. **Region Hover State**
```
┌────────────────────────────────┐
│    Southern California         │
│                                │
│  67,164  │  $819K  │ $4K-$6M  │
│  Listings  Median   Range      │
│  [REGION badge]                │
└────────────────────────────────┘
```

#### 3. **County Hover State**
```
┌────────────────────────────────┐
│    Riverside                   │
│                                │
│  7,098   │  $650K  │ $50K-$4M │
│  Listings  Median   Range      │
│  [COUNTY badge]                │
└────────────────────────────────┘
```

#### 4. **City Hover State**
```
┌────────────────────────────────┐
│    Palm Desert                 │
│                                │
│  1,245   │  $725K  │ $80K-$3M │
│  Listings  Median   Range      │
│  [CITY badge]                  │
└────────────────────────────────┘
```

---

## 🎨 Proposed Enhanced Design

### Add Navigation Button Below Stats

```
┌────────────────────────────────────┐
│    Explore California              │
│                                    │
│  79,588 Listings | $839K Median   │
│                                    │
│  ┌──────────────────────────────┐ │
│  │  📍 View All Regions         │ │  ← NEW BUTTON
│  └──────────────────────────────┘ │
└────────────────────────────────────┘
```

### Contextual Buttons by Type

#### California Default:
- Button: **"📍 View All Regions"**
- Action: Navigate to `/neighborhoods`

#### Region Hover:
- Button: **"📍 Explore Southern California"**
- Action: Navigate to `/neighborhoods#southern-california` (scrolls to that region's counties)

#### County Hover:
- Button: **"🏘️ View Riverside County"**
- Action: Navigate to `/neighborhoods/riverside-county`

#### City Hover:
- Button: **"🏘️ View Palm Desert"**
- Action: Navigate to `/neighborhoods/palm-desert`

---

## 🛠️ Implementation Details

### 1. **Add Navigation Button to HoverStatsOverlay**

**File:** `src/app/components/mls/map/HoverStatsOverlay.tsx`

**New Props:**
```typescript
interface HoverStatsOverlayProps {
  data: {
    name: string;
    count: number;
    avgPrice?: number;
    medianPrice?: number;
    minPrice: number;
    maxPrice: number;
    type: 'county' | 'city' | 'region';
  } | null;
  californiaStats?: {
    count: number;
    medianPrice: number;
    minPrice: number;
    maxPrice: number;
  };
  contextualBoundary?: {
    name: string;
    count: number;
    avgPrice?: number;
    medianPrice?: number;
    minPrice: number;
    maxPrice: number;
    type: 'county' | 'city' | 'region' | 'california';
  } | null;
  // NEW: Add navigation handler
  onNavigateToNeighborhood?: (slug: string, type: 'california' | 'region' | 'county' | 'city') => void;
}
```

**New Button Component:**
```tsx
{displayData && (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 10 }}
    className="mt-4 w-full px-4"
  >
    <button
      onClick={() => handleNavigate(displayData)}
      className={`
        w-full px-4 py-2.5 rounded-lg font-semibold text-sm
        flex items-center justify-center gap-2
        transition-all duration-200 hover:scale-105 active:scale-95
        ${isLight
          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl'
        }
      `}
    >
      {getButtonIcon(displayData.type)}
      <span>{getButtonText(displayData)}</span>
    </button>
  </motion.div>
)}
```

**Helper Functions:**
```typescript
const getButtonIcon = (type: 'california' | 'region' | 'county' | 'city') => {
  switch (type) {
    case 'california':
      return <MapPin className="w-4 h-4" />;
    case 'region':
      return <MapPin className="w-4 h-4" />;
    case 'county':
    case 'city':
      return <Home className="w-4 h-4" />;
  }
};

const getButtonText = (data: DisplayData) => {
  if (!data) return 'View All Regions';

  switch (data.type) {
    case 'california':
      return 'View All Regions';
    case 'region':
      return `Explore ${data.name}`;
    case 'county':
      return `View ${data.name} County`;
    case 'city':
      return `View ${data.name}`;
  }
};

const handleNavigate = (data: DisplayData | null) => {
  if (!data) {
    // Navigate to neighborhoods directory
    router.push('/neighborhoods');
    return;
  }

  const slug = createSlug(data.name);

  switch (data.type) {
    case 'california':
      router.push('/neighborhoods');
      break;
    case 'region':
      // Navigate to neighborhoods directory with hash anchor to scroll to region
      // Examples:
      //   - Southern California → /neighborhoods#southern-california
      //   - Northern California → /neighborhoods#northern-california
      //   - Central California → /neighborhoods#central-california
      router.push(`/neighborhoods#${slug}`);
      break;
    case 'county':
      router.push(`/neighborhoods/${slug}-county`);
      break;
    case 'city':
      router.push(`/neighborhoods/${slug}`);
      break;
  }
};

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\\s-]/g, '')
    .replace(/\\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}
```

---

## 2. **Update MapView to Pass Navigation Handler**

**File:** `src/app/components/mls/map/MapView.tsx`

**Update HoverStatsOverlay Usage:**
```tsx
<HoverStatsOverlay
  data={hoveredPolygon}
  californiaStats={californiaStats}
  contextualBoundary={contextualBoundary}
  onNavigateToNeighborhood={handleNavigateToNeighborhood}
/>
```

**Add Navigation Handler:**
```tsx
const router = useRouter();

const handleNavigateToNeighborhood = useCallback((slug: string, type: 'california' | 'region' | 'county' | 'city') => {
  console.log('🗺️ [MapView] Navigating to neighborhood:', { slug, type });

  switch (type) {
    case 'california':
      router.push('/neighborhoods');
      break;
    case 'region':
      router.push('/neighborhoods#' + slug);
      break;
    case 'county':
      router.push(`/neighborhoods/${slug}-county`);
      break;
    case 'city':
      router.push(`/neighborhoods/${slug}`);
      break;
  }
}, [router]);
```

---

## 3. **Add Router Import to HoverStatsOverlay**

```tsx
import { useRouter } from 'next/navigation';

export default function HoverStatsOverlay({ ... }) {
  const router = useRouter();
  // ... rest of component
}
```

---

## 4. **Mobile Considerations**

### Mobile Button Styling
```tsx
className={`
  w-full px-3 md:px-4 py-2 md:py-2.5
  rounded-lg font-semibold text-xs md:text-sm
  // ... rest of classes
`}
```

### Button Placement on Mobile
- Position below stats grid
- Full width on mobile
- Slightly smaller padding/text on mobile

---

## 📍 Neighborhoods Page Hash Anchor Support

### Update Neighborhoods Directory to Handle Hash Anchors

**File:** `src/app/neighborhoods/page.tsx`

When navigating with a hash (e.g., `/neighborhoods#southern-california`), the page should:
1. Expand the correct region accordion
2. Scroll to that region's section

**Implementation:**
```tsx
'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function NeighborhoodsPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for hash in URL
    const hash = window.location.hash.replace('#', '');

    if (hash) {
      // Wait for DOM to render
      setTimeout(() => {
        // Find the region element by ID
        const element = document.getElementById(hash);

        if (element) {
          // Expand the accordion for this region (if using accordion)
          const regionButton = element.querySelector('[data-region-toggle]');
          if (regionButton && regionButton instanceof HTMLButtonElement) {
            regionButton.click();
          }

          // Scroll to the region
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }, 100);
    }
  }, []);

  // ... rest of component
}
```

**Update Region Sections with IDs:**
```tsx
{/* Southern California Section */}
<div id="southern-california" className="mb-8">
  <button
    data-region-toggle
    onClick={() => toggleRegion('southern-california')}
    className="..."
  >
    <h2>Southern California</h2>
  </button>

  {/* Counties list */}
  {expandedRegions.includes('southern-california') && (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      {/* County cards */}
    </div>
  )}
</div>

{/* Northern California Section */}
<div id="northern-california" className="mb-8">
  {/* ... */}
</div>

{/* Central California Section */}
<div id="central-california" className="mb-8">
  {/* ... */}
</div>
```

---

## 🔗 Integration with Neighborhoods Pages

### URL Structure

#### From Map → Neighborhoods

**California Default:**
```
Map: Explore California
  ↓
Click "View All Regions"
  ↓
Navigate to: /neighborhoods
```

**Region Hover:**
```
Map: Southern California
  ↓
Click "Explore Southern California"
  ↓
Navigate to: /neighborhoods#southern-california
  ↓
Page loads and scrolls to Southern California section
Counties accordion auto-expands
```

**County Hover:**
```
Map: Riverside County
  ↓
Click "View Riverside County"
  ↓
Navigate to: /neighborhoods/riverside-county
```

**City Hover:**
```
Map: Palm Desert
  ↓
Click "View Palm Desert"
  ↓
Navigate to: /neighborhoods/palm-desert
```

---

## 📱 User Experience Flow

### Desktop Flow - Region Navigation

```
User on /map page
  ↓
Hovers over Southern California region
  ↓
Info panel shows:
  - "Southern California"
  - "67,164 Listings | $819K Median | $4K-$6M Range"
  - [REGION badge]
  - [Explore Southern California button] ← NEW
  ↓
Clicks "Explore Southern California"
  ↓
Navigates to /neighborhoods#southern-california
  ↓
Neighborhoods page loads:
  - Scrolls to Southern California section
  - Auto-expands accordion showing all counties
  - User sees: Los Angeles, San Bernardino, Riverside, Orange,
    Coachella Valley, San Diego, Ventura, Joshua Tree Area, etc.
  - Can click any county to go to county page
```

### Desktop Flow - County Navigation

```
User on /map page
  ↓
Hovers over Riverside County
  ↓
Info panel shows:
  - "Riverside"
  - "7,098 Listings | $650K Median | $50K-$4M Range"
  - [COUNTY badge]
  - [View Riverside County button] ← NEW
  ↓
Clicks "View Riverside County"
  ↓
Navigates to /neighborhoods/riverside-county
  ↓
Shows CountyCityGrid with:
  - Hero section (Riverside County description)
  - Grid of 50 cities
  - Pagination
  - Back to Neighborhoods link
```

### Mobile Flow

```
User on /map page (mobile)
  ↓
Info panel always visible at top
  ↓
Default shows: "Explore California"
  ↓
User zooms/pans to Coachella Valley region
  ↓
Info panel updates to: "Coachella Valley"
  ↓
[View Coachella Valley County button] appears
  ↓
User taps button
  ↓
Navigates to /neighborhoods/coachella-valley-county
  ↓
Shows 20 cities in Coachella Valley with pagination
```

---

## 🎨 Advanced Filters Integration

### Move Advanced Filters to Cogwheel Icon

**Current:** Advanced Filters is an accordion component below property type filters

**Proposed:** Move to cogwheel icon on map (like production)

#### 1. **Add Cogwheel Button to MapView**

**Location:** Top-right of map, next to satellite toggle

```tsx
{/* Advanced Filters Cogwheel */}
<div className="absolute top-4 right-4 z-40 flex gap-2">
  {/* Satellite Toggle */}
  <button
    onClick={() => setIsSatelliteView(!isSatelliteView)}
    className={`p-3 rounded-lg backdrop-blur-xl transition-all ...`}
  >
    {isSatelliteView ? <Map /> : <Satellite />}
  </button>

  {/* Advanced Filters Cogwheel */}
  <button
    onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
    className={`p-3 rounded-lg backdrop-blur-xl transition-all ...`}
  >
    <SlidersHorizontal className="w-5 h-5" />
  </button>
</div>

{/* Advanced Filters Modal/Panel */}
<AnimatePresence>
  {isAdvancedFiltersOpen && (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="absolute top-16 right-4 z-50 ..."
    >
      <FiltersPanel
        filters={filters}
        onFilterChange={handleFilterChange}
        onClose={() => setIsAdvancedFiltersOpen(false)}
      />
    </motion.div>
  )}
</AnimatePresence>
```

---

## 🔧 CityMap Integration

### Add Same Navigation to City Pages

**File:** `src/app/components/cities/CityMap.tsx`

When viewing a city page (e.g., `/neighborhoods/palm-desert`), the map should also have the info panel with navigation:

```tsx
// Add HoverStatsOverlay to CityMap
<HoverStatsOverlay
  data={{
    name: cityName,
    count: listings.length,
    medianPrice: stats?.medianPrice || 0,
    minPrice: stats?.priceRange?.min || 0,
    maxPrice: stats?.priceRange?.max || 0,
    type: 'city'
  }}
  onNavigateToNeighborhood={(slug, type) => {
    // Navigate to parent county or back to directory
    router.push('/neighborhoods');
  }}
/>
```

---

## 🧪 Testing Checklist

### Desktop Testing
- [ ] Hover over California default → Shows "View All Regions" button
- [ ] Click "View All Regions" → Navigates to `/neighborhoods`
- [ ] Hover over region → Shows "Explore [Region]" button
- [ ] Click region button → Navigates to appropriate page/section
- [ ] Hover over county → Shows "View [County] County" button
- [ ] Click county button → Navigates to `/neighborhoods/[county]-county`
- [ ] Hover over city → Shows "View [City]" button
- [ ] Click city button → Navigates to `/neighborhoods/[city]`
- [ ] Button styling matches theme (light/dark)
- [ ] Hover effects work smoothly
- [ ] No layout shift when button appears/disappears

### Mobile Testing
- [ ] Info panel always visible at top
- [ ] Button appears below stats
- [ ] Button is full-width on mobile
- [ ] Text size appropriate for mobile
- [ ] Touch target is large enough (min 44px)
- [ ] Navigation works on tap
- [ ] Smooth transitions

### Integration Testing
- [ ] Map → Neighborhoods directory works
- [ ] Map → County page works
- [ ] Map → City page works
- [ ] County page → Back to directory works
- [ ] City page → Back to directory works
- [ ] Breadcrumbs work correctly
- [ ] Browser back button works
- [ ] URL updates correctly

---

## 📦 Files to Modify

### 1. **HoverStatsOverlay.tsx** (Main Changes)
- Add navigation button component
- Add helper functions for button text/icon
- Add router import
- Add navigation handler
- Update TypeScript interfaces

### 2. **MapView.tsx** (Integration)
- Import useRouter
- Add handleNavigateToNeighborhood callback
- Pass callback to HoverStatsOverlay

### 3. **neighborhoods/page.tsx** (Hash Anchor Support)
- Add useEffect to handle hash anchors
- Add IDs to region sections (southern-california, northern-california, central-california)
- Add data-region-toggle attribute to region buttons
- Auto-expand accordion when hash matches region
- Smooth scroll to region section

### 4. **CityMap.tsx** (Optional Enhancement)
- Add HoverStatsOverlay with city data
- Add navigation back to directory

### 5. **MapPageClient.tsx** (Advanced Filters)
- Move filters to cogwheel icon
- Create modal/panel for advanced filters
- Add state for filters open/closed

---

## 🎯 Success Metrics

### User Experience
- ✅ Seamless navigation from map to neighborhoods
- ✅ Contextual buttons that make sense
- ✅ No confusion about what button does
- ✅ Smooth animations and transitions

### Technical
- ✅ No layout shift
- ✅ Responsive on all devices
- ✅ Works with theme switching
- ✅ Proper URL structure
- ✅ Browser history works correctly

### Business
- ✅ Increased discovery of neighborhoods section
- ✅ Better integration between map and directory
- ✅ More engagement with county/city pages

---

## 🚀 Implementation Phases

### Phase 1: Add Navigation Button to HoverStatsOverlay (Week 1)
- [ ] Add button component to HoverStatsOverlay
- [ ] Add helper functions (getButtonText, getButtonIcon, handleNavigate)
- [ ] Add router import
- [ ] Support for all types: california, region, county, city
- [ ] Test on desktop
- [ ] Test on mobile

### Phase 2: Integrate with MapView + Neighborhoods Page (Week 1)
- [ ] Add navigation handler to MapView
- [ ] Pass handler to HoverStatsOverlay
- [ ] Add hash anchor support to neighborhoods/page.tsx
- [ ] Add IDs to region sections (southern-california, northern-california, central-california)
- [ ] Test region navigation with hash anchors
- [ ] Test accordion auto-expand on hash
- [ ] Test smooth scroll to region
- [ ] Test county/city navigation
- [ ] Verify URL structure

### Phase 3: Advanced Filters to Cogwheel (Week 2)
- [ ] Add cogwheel button to MapView
- [ ] Create filters modal/panel
- [ ] Move advanced filters logic
- [ ] Test filters functionality
- [ ] Mobile responsive testing

### Phase 4: Polish & Testing (Week 2)
- [ ] Refine animations
- [ ] Test all navigation paths
- [ ] Cross-browser testing
- [ ] Mobile device testing
- [ ] Accessibility audit

---

## 📝 Next Steps

1. **Review & Approve Plan**
   - Get feedback on proposed design
   - Confirm navigation structure
   - Verify URL patterns

2. **Start Implementation**
   - Begin with HoverStatsOverlay changes
   - Add navigation button
   - Test locally

3. **Iterate & Test**
   - Test on different devices
   - Gather user feedback
   - Refine as needed

---

**Ready to implement!** 🚀

This integration will make the neighborhoods section a natural extension of the map exploration experience, allowing users to seamlessly transition from high-level exploration to detailed neighborhood information.
