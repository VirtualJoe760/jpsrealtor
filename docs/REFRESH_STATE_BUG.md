# REFRESH STATE BUG ANALYSIS
**Critical Issue**: Map View Appears Unexpectedly After Page Refresh
**Created**: December 20, 2025
**Status**: Bug Identified - Fix Required
**Severity**: High (Disrupts Development Workflow)

---

## PROBLEM DESCRIPTION

When working on the chat section, sometimes refreshing the page (especially after server restart) causes the page to incorrectly show the **map view** instead of the **chat view** that was active.

**User Experience**:
```
1. User is working on chat features
2. Makes code changes → Server restarts (hot reload)
3. Refreshes browser
4. ❌ Page shows MAP instead of CHAT
5. User is confused and frustrated
```

---

## ROOT CAUSE ANALYSIS

### **The State Synchronization Problem**

The application has **TWO sources of truth** that can become out-of-sync:

1. **URL Parameter**: `?view=map` (persistent in browser history)
2. **React State**: `isMapVisible` in `MapStateContext` (transient, resets to `false`)

**File**: `src/app/page.tsx`
**Problematic Code**:

```typescript
// Line 33: isMapVisible comes from MapStateContext (defaults to false)
const { isMapVisible, showMapAtLocation, hideMap } = useMapControl();

// Line 73-98: URL is SOURCE OF TRUTH on mount
useEffect(() => {
  const viewParam = searchParams?.get('view');
  const mapParam = searchParams?.get('map');

  if (viewParam === 'map' || mapParam === 'open') {
    if (!isMapVisible) {
      // ... show map based on URL parameters
      showMapAtLocation(lat, lng, zoom);
    }
  }

  setInitialLoad(false);
}, []); // Only run on mount

// Line 101-111: isMapVisible updates URL (but can race)
useEffect(() => {
  if (initialLoad) return;

  const currentView = searchParams?.get('view');

  if (isMapVisible && currentView !== 'map') {
    router.replace('/?view=map', { scroll: false }); // ← ADDS ?view=map
  } else if (!isMapVisible && currentView === 'map') {
    router.replace('/', { scroll: false }); // ← REMOVES ?view=map
  }
}, [isMapVisible, initialLoad]);
```

---

## THE BUG SCENARIO

### **Scenario 1: Race Condition**

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: User in Chat View                                  │
│ - URL: /                                                     │
│ - isMapVisible: false                                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: User Asks About Location                            │
│ - ChatWidget calls showMapAtLocation()                       │
│ - isMapVisible: false → true                                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: useEffect Fires (Line 106-107)                      │
│ - Detects: isMapVisible=true, currentView=undefined         │
│ - Action: router.replace('/?view=map')                       │
│ - URL: / → /?view=map                                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 4: User Quickly Navigates Away / Switches Tabs         │
│ - Map was only briefly visible                              │
│ - User goes back to chat                                     │
│ - BUT URL still has ?view=map                                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Server Restarts (Hot Reload)                        │
│ - MapStateContext resets to default                         │
│ - isMapVisible: true → false (reset)                         │
│ - URL: /?view=map (persisted in browser)                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 6: User Refreshes Page                                 │
│ - Component mounts                                           │
│ - useEffect (line 73-98) reads URL: ?view=map               │
│ - Calls: showMapAtLocation(37.0, -119.5, 5)                 │
│ - isMapVisible: false → true                                 │
│ - ❌ MAP SHOWS instead of CHAT                               │
└─────────────────────────────────────────────────────────────┘
```

---

### **Scenario 2: Unintentional Map Trigger**

```
1. User is typing in chat input
   └─ Autocomplete triggers location detection
       └─ ChatWidget.tsx line 155-157 calls showMapAtLocation()
           └─ isMapVisible: false → true
               └─ URL updated to /?view=map

2. User continues typing, doesn't notice map opened in background
   └─ clipPath wipe animation may have played
   └─ But user is focused on chat input

3. Server restarts during development

4. User refreshes page
   └─ URL has ?view=map → Map shows
   └─ User expected chat view
```

---

### **Scenario 3: Component Unmount Before Sync**

```
1. User opens map (isMapVisible: true)
   └─ URL updated to /?view=map

2. User closes map via handleToggleMap() → hideMap()
   └─ isMapVisible: true → false

3. useEffect (line 106-109) SHOULD fire to remove ?view=map
   └─ But dependency array is [isMapVisible, initialLoad]
   └─ Missing router/searchParams dependency

4. If component unmounts before useEffect completes:
   └─ URL cleanup doesn't happen
   └─ URL still has /?view=map

5. Refresh → Map shows unexpectedly
```

---

## CODE ANALYSIS

### **MapStateContext** (`src/app/contexts/MapStateContext.tsx`)

```typescript
export function MapStateProvider({ children }: MapStateProviderProps) {
  const [isMapVisible, setIsMapVisible] = useState(false); // ← NO PERSISTENCE
  const [viewState, setViewStateInternal] = useState<MapViewState | null>(null);
  // ... rest of state
}
```

**Issue**: State is **NOT persisted** to localStorage/sessionStorage
- Resets to `false` on every mount
- Lost on server restart
- Lost on page refresh

---

### **page.tsx URL Sync Logic**

```typescript
// useEffect 1: Initialize from URL (line 73-98)
useEffect(() => {
  const viewParam = searchParams?.get('view');

  if (viewParam === 'map') {
    showMapAtLocation(lat, lng, zoom); // Sets isMapVisible = true
  }
}, []); // ← Runs ONCE on mount

// useEffect 2: Sync URL with state (line 101-111)
useEffect(() => {
  if (initialLoad) return;

  const currentView = searchParams?.get('view');

  if (isMapVisible && currentView !== 'map') {
    router.replace('/?view=map'); // ← ADD param
  } else if (!isMapVisible && currentView === 'map') {
    router.replace('/'); // ← REMOVE param
  }
}, [isMapVisible, initialLoad]); // ← Missing searchParams dependency
```

**Issues**:
1. **Race Condition**: useEffect 2 can lag behind state changes
2. **Missing Dependency**: Doesn't track `searchParams` or `router`
3. **No Cleanup**: If component unmounts, URL cleanup doesn't happen
4. **URL is King**: On mount, URL always wins over state

---

## WHY IT HAPPENS DURING DEVELOPMENT

**Hot Module Reload (HMR) Amplifies the Issue**:
```
1. User makes code change
   └─ Next.js detects file change
       └─ Server restarts (HMR)
           └─ Components remount
               └─ MapStateContext resets: isMapVisible = false
                   └─ BUT browser URL persists: /?view=map
                       └─ On next render: URL forces map visible
```

**Fast Refresh Behavior**:
- React state is sometimes preserved
- But context providers often remount
- URL parameters are ALWAYS preserved
- This creates state/URL mismatch

---

## FREQUENCY & TRIGGERS

**High Frequency Triggers**:
- ✅ Server restarts (every code save during dev)
- ✅ Browser refresh while `?view=map` in URL
- ✅ Navigating back in browser history to a map URL
- ✅ Autocomplete triggering `showMapAtLocation()` unintentionally

**Low Frequency Triggers**:
- Component remounting due to parent re-render
- React strict mode double-mounting

---

## PROPOSED FIXES

### **Fix 1: Persist isMapVisible in sessionStorage** (Recommended)

**File**: `src/app/contexts/MapStateContext.tsx`

```typescript
export function MapStateProvider({ children }: MapStateProviderProps) {
  // Initialize from sessionStorage (survives refreshes but not new tabs)
  const [isMapVisible, setIsMapVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = sessionStorage.getItem('mapVisible');
    return stored === 'true';
  });

  // Persist on changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem('mapVisible', String(isMapVisible));
  }, [isMapVisible]);

  // ... rest of code
}
```

**Pros**:
- ✅ State survives server restarts
- ✅ State survives page refreshes
- ✅ Works with HMR
- ✅ Clears when tab closes (sessionStorage)

**Cons**:
- ⚠️ URL and sessionStorage can still conflict if user manually edits URL

---

### **Fix 2: Make URL the Single Source of Truth** (Cleaner)

**File**: `src/app/page.tsx`

```typescript
// DERIVE isMapVisible from URL instead of storing separately
const isMapVisible = useMemo(() => {
  const viewParam = searchParams?.get('view');
  return viewParam === 'map';
}, [searchParams]);

// Remove the useEffect that syncs state → URL
// Instead, always update URL directly when showing/hiding map

const handleShowMap = (lat: number, lng: number, zoom: number) => {
  router.push(`/?view=map&lat=${lat}&lng=${lng}&zoom=${zoom}`);
};

const handleHideMap = () => {
  router.push('/');
};
```

**Changes to MapStateContext**:
```typescript
// Remove isMapVisible from context
// Only store viewState (position) and displayListings
interface MapStateContextType {
  viewState: MapViewState | null;
  setViewState: (state: MapViewState) => void;
  displayListings: MapListing[];
  setDisplayListings: (listings: MapListing[]) => void;
  // ... other fields
  // ❌ Remove: isMapVisible, setMapVisible
}
```

**Pros**:
- ✅ **Single source of truth** (URL only)
- ✅ No sync issues
- ✅ Shareable URLs work correctly
- ✅ Browser back/forward works perfectly
- ✅ No race conditions

**Cons**:
- ⚠️ Requires refactoring MapStateContext
- ⚠️ More URL manipulation code
- ⚠️ Components must read from URL instead of context

---

### **Fix 3: Add Cleanup on Component Unmount** (Quick Fix)

**File**: `src/app/page.tsx`

```typescript
// Add cleanup effect
useEffect(() => {
  return () => {
    // On unmount, if map is hidden, clear URL parameter
    if (!isMapVisible) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'map') {
        router.replace('/', { scroll: false });
      }
    }
  };
}, [isMapVisible, router]);
```

**Pros**:
- ✅ Minimal code change
- ✅ Cleans up stale URL params

**Cons**:
- ⚠️ Doesn't fix root cause
- ⚠️ Still has race conditions
- ⚠️ May interfere with intentional map URLs

---

### **Fix 4: Add Missing Dependencies** (Partial Fix)

**File**: `src/app/page.tsx` (line 101-111)

```typescript
useEffect(() => {
  if (initialLoad) return;

  const currentView = searchParams?.get('view');

  if (isMapVisible && currentView !== 'map') {
    router.replace('/?view=map', { scroll: false });
  } else if (!isMapVisible && currentView === 'map') {
    router.replace('/', { scroll: false });
  }
}, [isMapVisible, initialLoad, searchParams, router]); // ← ADD DEPS
```

**Pros**:
- ✅ React will warn about missing deps
- ✅ Effect re-runs when URL changes externally

**Cons**:
- ⚠️ May cause infinite loops if not careful
- ⚠️ Doesn't fix persistence issue

---

## RECOMMENDED SOLUTION

**Combine Fix 1 + Fix 4**:

1. **Persist `isMapVisible` in sessionStorage** (Fix 1)
   - Survives refreshes and HMR
   - Cleared when tab closes

2. **Add missing dependencies** (Fix 4)
   - Ensures URL stays in sync
   - Detects external URL changes

3. **Add explicit sync logic**:
   ```typescript
   // On mount: sessionStorage beats URL
   useEffect(() => {
     const storedMapVisible = sessionStorage.getItem('mapVisible') === 'true';
     const urlMapVisible = searchParams?.get('view') === 'map';

     if (storedMapVisible !== urlMapVisible) {
       // Resolve conflict: prefer sessionStorage (user's last action)
       if (storedMapVisible) {
         router.replace('/?view=map');
       } else {
         router.replace('/');
       }
     }
   }, []); // Only on mount
   ```

**Result**: State and URL stay in sync, survives restarts, works with HMR

---

## TESTING CHECKLIST

After implementing the fix, test these scenarios:

- [ ] **Scenario 1**: Open map → Refresh page → Map still visible ✅
- [ ] **Scenario 2**: Close map → Refresh page → Chat visible ✅
- [ ] **Scenario 3**: Open map → Server restart → Refresh → Map visible ✅
- [ ] **Scenario 4**: Chat view → Server restart → Refresh → Chat visible ✅
- [ ] **Scenario 5**: Manually edit URL to `?view=map` → Refresh → Map shows ✅
- [ ] **Scenario 6**: Manually remove `?view=map` → Refresh → Chat shows ✅
- [ ] **Scenario 7**: Browser back/forward with map URLs → Correct view ✅
- [ ] **Scenario 8**: Open map in new tab → Separate state ✅

---

## ALTERNATIVE: SHORT-TERM WORKAROUND

If you can't implement a full fix right now, add this **manual reset**:

**In browser DevTools console**:
```javascript
// Clear the map view parameter
window.history.replaceState({}, '', '/');

// Or clear session storage
sessionStorage.removeItem('mapVisible');

// Then refresh
location.reload();
```

**Or add a keyboard shortcut** in `page.tsx`:
```typescript
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    // Press Ctrl+Shift+R to force reset to chat view
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
      sessionStorage.removeItem('mapVisible');
      router.replace('/');
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [router]);
```

---

## IMPACT ASSESSMENT

**Who is Affected**:
- ✅ **Developers**: High impact (happens every HMR)
- ✅ **End Users**: Low impact (rare, only if they refresh at wrong time)

**User Experience Impact**:
- Development: **Major annoyance** (disrupts workflow)
- Production: **Minor confusion** (user can click chat toggle)

**Priority**: **HIGH** for development experience

---

## NEXT STEPS

1. **Immediate**: Add keyboard shortcut workaround (5 minutes)
2. **Short-term**: Implement Fix 1 + Fix 4 (1-2 hours)
3. **Long-term**: Consider Fix 2 for cleaner architecture (4-6 hours)
4. **Testing**: Run full checklist (30 minutes)
5. **Documentation**: Update STATE_MANAGEMENT_ARCHITECTURE.md

---

**Created**: December 20, 2025
**Status**: Ready for Implementation
**Assigned**: Development Team
**Priority**: High
