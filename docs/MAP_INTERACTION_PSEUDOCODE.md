# Map Interaction Flow - Comprehensive Pseudo-Code

## System Overview

```
MAP_VIEW
├── Data Layer (polygonData)
├── Rendering Layer (MapLibre Sources & Layers)
├── Event Layer (Hover Handlers)
└── UI Layer (HoverStatsOverlay)
```

---

## 1. DATA PREPARATION PHASE

### 1.1 Generate Polygon Data (`polygonData` useMemo)

```pseudo
FUNCTION generatePolygonData(markers, listings):
  dataToRender = markers.length > 0 ? markers : listings
  IF dataToRender is empty:
    RETURN empty array

  cityIndexTracker = {}
  polygonArray = []

  FOR EACH marker IN dataToRender:
    IF marker has NO polygon:
      SKIP to next marker

    IF marker.clusterType == 'region':
      ADD to polygonArray:
        - type: 'region'
        - id: marker.regionName
        - name: marker.regionName
        - count, avgPrice, minPrice, maxPrice
        - polygon coordinates

    ELSE IF marker.clusterType == 'county':
      ADD to polygonArray:
        - type: 'county'
        - id: marker.countyName
        - name: marker.countyName
        - count, avgPrice, minPrice, maxPrice
        - polygon coordinates

    ELSE IF marker.clusterType == 'city':
      cityName = marker.cityName
      currentIndex = cityIndexTracker[cityName] || 0
      cityIndexTracker[cityName] = currentIndex + 1

      ADD to polygonArray:
        - type: 'city'
        - id: "{cityName}-{currentIndex}"  // e.g., "Redding-0"
        - name: cityName
        - count, avgPrice, minPrice, maxPrice
        - polygon coordinates

  RETURN polygonArray

DEPENDENCIES: [markers, listings]
TRIGGERS: When markers or listings change
```

### 1.2 Generate Polygon Key (`polygonKey` useMemo)

```pseudo
FUNCTION generatePolygonKey(polygonData):
  keys = []
  FOR EACH polygon IN polygonData:
    keys.push("{polygon.type}-{polygon.id}")

  SORT keys alphabetically
  RETURN keys.join("|")

EXAMPLE OUTPUT: "city-Redding-0|city-Anderson-0|county-Shasta|region-NorthernCA"
DEPENDENCIES: [polygonData]
PURPOSE: Detect when set of polygons changes (triggers handler re-registration)
```

---

## 2. RENDERING PHASE

### 2.1 Region Rendering (Zoom < 12)

```pseudo
IF currentZoom < 12 AND dataToRender has regions with polygons:

  regionCounts = EXTRACT all region.count values

  FOR EACH region IN dataToRender WHERE region has polygon:
    regionColor = getActivityColor(region.count, regionCounts, isLight)
    geometryType = detectGeometryType(region.polygon)

    RENDER MapLibre Source:
      - ID: "region-source-{region.regionName}"
      - Type: GeoJSON
      - Data:
          * Feature ID: 0 (required for feature-state)
          * Geometry: {type: geometryType, coordinates: region.polygon}
          * Properties: {name: regionName, count: region.count}

    RENDER Layers (in order):
      1. Shadow Layer: "region-shadow-{regionName}"
         - Type: line
         - Width: 0 (default) → 12 (on hover)
         - Blur: 0 (default) → 8 (on hover)
         - Opacity: 0 (default) → 0.6 (on hover)
         - Color: Purple/Violet

      2. Fill Layer: "region-fill-{regionName}"  ⚡ HOVER TARGET
         - Type: fill
         - Color: regionColor (activity-based)
         - Opacity: 0.35 (default) → 0.55 (on hover)

      3. Outline Layer: "region-outline-{regionName}"
         - Type: line
         - Width: 2 (default) → 4 (on hover)
         - Opacity: 0.7 (default) → 1.0 (on hover)
         - Color: regionColor
```

### 2.2 County Rendering (Zoom < 12)

```pseudo
IF currentZoom < 12 AND dataToRender has counties with polygons:

  countyCounts = EXTRACT all county.count values

  FOR EACH county IN dataToRender WHERE county has polygon:
    countyColor = getActivityColor(county.count, countyCounts, isLight)
    geometryType = detectGeometryType(county.polygon)

    RENDER MapLibre Source:
      - ID: "county-source-{county.countyName}"
      - Type: GeoJSON
      - Data:
          * Feature ID: 0 (required for feature-state)
          * Geometry: {type: geometryType, coordinates: county.polygon}
          * Properties: {name: countyName, count: county.count}

    RENDER Layers (in order):
      1. Shadow Layer: "county-shadow-{countyName}"
         - Type: line
         - Width: 0 (default) → 12 (on hover)
         - Blur: 0 (default) → 8 (on hover)
         - Opacity: 0 (default) → 0.6 (on hover)
         - Color: Indigo

      2. Fill Layer: "county-fill-{countyName}"  ⚡ HOVER TARGET
         - Type: fill
         - Color: countyColor (activity-based)
         - Opacity:
             IF count == 0: 0.20 (default) → 0.35 (on hover)
             ELSE: 0.35 (default) → 0.55 (on hover)

      3. Outline Layer: "county-outline-{countyName}"
         - Type: line
         - Width: 2 (default) → 4 (on hover)
         - Opacity: 0.7 (default) → 1.0 (on hover)
         - Color: Indigo
```

### 2.3 City Rendering (Zoom < 12)

```pseudo
IF currentZoom < 12 AND dataToRender has cities with polygons:

  cityCounts = EXTRACT all city.count values
  cityIndexTracker = {} // For rendering IDs

  FOR EACH city IN dataToRender WHERE city has polygon:
    // Generate same indexed ID as polygonData
    cityName = city.cityName
    currentIndex = cityIndexTracker[cityName] || 0
    cityIndexTracker[cityName] = currentIndex + 1
    indexedId = "{cityName}-{currentIndex}"

    cityColor = getActivityColor(city.count, cityCounts, isLight)
    geometryType = detectGeometryType(city.polygon)

    RENDER MapLibre Source:
      - ID: "city-source-{indexedId}"  ⚡ MUST match polygonData ID!
      - Type: GeoJSON
      - Data:
          * Feature ID: 0 (required for feature-state)
          * Geometry: {type: geometryType, coordinates: city.polygon}
          * Properties: {name: cityName, count: city.count}

    RENDER Layers (in order):
      1. Shadow Layer: "city-shadow-{indexedId}"
         - Type: line
         - Width: 0 (default) → 12 (on hover)
         - Blur: 0 (default) → 8 (on hover)
         - Opacity: 0 (default) → 0.6 (on hover)
         - Color: Emerald

      2. Fill Layer: "city-fill-{indexedId}"  ⚡ HOVER TARGET
         - Type: fill
         - Color: cityColor (activity-based)
         - Opacity:
             IF count == 0: 0.15 (default) → 0.30 (on hover)
             ELSE: 0.35 (default) → 0.55 (on hover)

      3. Outline Layer: "city-outline-{indexedId}"
         - Type: line
         - Width: 2 (default) → 4 (on hover)
         - Opacity: 0.7 (default) → 1.0 (on hover)
         - Color: Emerald

      4. Stripe Layer (IF count == 0): "city-stripes-{indexedId}"
         - Type: line
         - Color: Gray
         - Dash pattern: [2, 4]
```

**CRITICAL: Z-Index Order (bottom to top)**
```
1. Regions (rendered first)
2. Counties (rendered second)
3. Cities (rendered last = ON TOP)
```

⚠️ **ISSUE**: Cities render on top of counties, blocking hover events!

---

## 3. EVENT HANDLER REGISTRATION PHASE

### 3.1 Handler Registration (`useEffect` with `polygonKey` dependency)

```pseudo
WHEN polygonKey changes:
  map = get MapLibre instance

  IF map is null OR polygonData is empty:
    EXIT (do nothing)

  LOG: "🎨 Registering polygon hover handlers for X polygons"

  handlers = [] // For cleanup tracking

  FUNCTION registerHandlers():
    FOR EACH polygon IN polygonData:
      layerId = "{polygon.type}-fill-{polygon.id}"
      sourceName = "{polygon.type}-source-{polygon.id}"

      // Check if layer exists
      IF map.getLayer(layerId) does NOT exist:
        LOG WARNING: "⚠️ Layer {layerId} not found, skipping"
        CONTINUE to next polygon

      // Define mouseenter handler
      FUNCTION onMouseEnter(event):
        LOG: "🎯 Hover ENTER: {polygon.type} - {polygon.name}"
        SET cursor to pointer

        // Clear previous hover state
        IF hoveredFeatureRef.current exists:
          map.setFeatureState(hoveredFeatureRef.current, {hover: false})

        // Set new hover state
        IF event has features:
          featureRef = {source: sourceName, id: 0}
          map.setFeatureState(featureRef, {hover: true})
          hoveredFeatureRef.current = featureRef

        // Update UI state
        setHoveredPolygon({
          name: polygon.name,
          count: polygon.count,
          avgPrice: polygon.avgPrice,
          minPrice: polygon.minPrice,
          maxPrice: polygon.maxPrice,
          type: polygon.type
        })

      // Define mouseleave handler
      FUNCTION onMouseLeave():
        SET cursor to default

        // Clear hover state
        IF hoveredFeatureRef.current exists:
          map.setFeatureState(hoveredFeatureRef.current, {hover: false})
          hoveredFeatureRef.current = null

        // Clear UI state
        setHoveredPolygon(null)

      // Register handlers
      map.on('mouseenter', layerId, onMouseEnter)
      map.on('mouseleave', layerId, onMouseLeave)

      // Track for cleanup
      handlers.push({layerId, type: 'mouseenter', handler: onMouseEnter})
      handlers.push({layerId, type: 'mouseleave', handler: onMouseLeave})

    LOG: "✅ Registered {handlers.length} event handlers for polygons"

  // Execute registration
  IF map.isStyleLoaded():
    LOG: "✅ Style already loaded, registering handlers immediately"
    registerHandlers()
  ELSE:
    LOG: "⏳ Waiting for style to load before registering handlers..."
    map.once('style.load', () => {
      LOG: "✅ Style loaded, registering handlers now"
      registerHandlers()
    })

  // Cleanup function (runs when polygonKey changes or component unmounts)
  RETURN cleanup function:
    LOG: "🧹 Cleaning up polygon hover handlers"
    FOR EACH handler IN handlers:
      TRY:
        map.off(handler.type, handler.layerId, handler.handler)
      CATCH error:
        // Layer might not exist anymore
```

---

## 4. USER INTERACTION FLOW

### 4.1 User Hovers Over Boundary

```pseudo
USER moves mouse over map

MapLibre checks layers at mouse position (TOP to BOTTOM):
  1. Cities (top layer)
  2. Counties (middle layer)
  3. Regions (bottom layer)

MapLibre triggers event on FIRST matching layer only:

  SCENARIO A: Mouse over rural Shasta County area
    ✅ No city polygon at this location
    ✅ County polygon matches
    → Triggers: "mouseenter" on "county-fill-Shasta"
    → Handler executes for Shasta County

  SCENARIO B: Mouse over Redding (inside Shasta County)
    ❌ City polygon "city-fill-Redding-0" matches FIRST
    ❌ County polygon "county-fill-Shasta" is BLOCKED
    → Triggers: "mouseenter" on "city-fill-Redding-0"
    → Handler executes for Redding City
    → Shasta County handler NEVER fires! ⚠️ BUG!
```

### 4.2 Handler Execution Flow

```pseudo
WHEN mouseenter event fires on layer "X-fill-Y":

  1. Find matching handler from registered handlers
  2. Execute onMouseEnter(event)
  3. Update feature-state for visual feedback:
     - Shadow layer: width 0→12, blur 0→8, opacity 0→0.6
     - Fill layer: opacity increases (e.g., 0.35→0.55)
     - Outline layer: width 2→4, opacity 0.7→1.0
  4. Update React state: setHoveredPolygon(polygonData)
  5. React re-renders HoverStatsOverlay component
```

### 4.3 Info Card Update Flow

```pseudo
HoverStatsOverlay component receives: hoveredPolygon state

FUNCTION HoverStatsOverlay({ data }):
  // ⚠️ CURRENT ISSUE: data might be null but we're not handling it!

  displayData = data || defaultData  // ✅ We added this

  RENDER:
    <AnimatePresence mode="wait">
      <motion.div key={displayData.name}>  // Re-animates when name changes
        Show: displayData.name
        Show: displayData.count, avgPrice, minPrice, maxPrice
        Show: displayData.type
      </motion.div>
    </AnimatePresence>

  ⚠️ ISSUE: AnimatePresence with mode="wait" might not update smoothly!
```

### 4.4 User Moves Mouse Away

```pseudo
USER moves mouse off boundary

MapLibre triggers: "mouseleave" on previous layer

Handler executes onMouseLeave():
  1. Set cursor to default
  2. Clear feature-state: {hover: false}
  3. Update React state: setHoveredPolygon(null)
  4. HoverStatsOverlay shows default "Explore California" message
```

---

## 5. IDENTIFIED LOGIC FLAWS

### 🐛 FLAW #1: Info Card Not Updating
```pseudo
PROBLEM:
  AnimatePresence mode="wait" might be causing lag
  Component re-renders but animation delays update

EXPECTED:
  Hover over Trinity → Show "Trinity" immediately
  Hover over Shasta → Show "Shasta" immediately

ACTUAL:
  Hover over Trinity → Shows "Trinity" ✅
  Hover over Shasta → Stays on "Trinity" or shows "Explore California" ❌

ROOT CAUSE:
  - AnimatePresence "wait" mode waits for exit animation before showing new content
  - Key might not be changing properly (duplicate names?)
  - setHoveredPolygon might not be triggering re-render
```

### 🐛 FLAW #2: Hover Effect Not Showing
```pseudo
PROBLEM:
  Boundaries don't show visual hover effects (glow, opacity change)

EXPECTED:
  Hover → Shadow glow appears
  Hover → Fill opacity increases
  Hover → Outline thickens

ACTUAL:
  Hover → No visual changes ❌

ROOT CAUSE POSSIBILITIES:
  1. feature-state not being set properly
     - map.setFeatureState({source, id: 0}, {hover: true})
     - Source name might not match

  2. Layers referencing wrong feature-state
     - Layer paint properties: ['boolean', ['feature-state', 'hover'], false]
     - Might be checking wrong feature or wrong source

  3. Feature ID mismatch
     - We set Feature ID: 0 in GeoJSON
     - But setFeatureState might expect different ID

  4. Source ID mismatch
     - Handler uses: "{type}-source-{id}"
     - Rendering uses: "{type}-source-{id}" or "{type}-source-{name}-{index}"
     - MISMATCH = feature-state never updates! ⚠️
```

### 🐛 FLAW #3: Z-Index Blocking
```pseudo
PROBLEM:
  Cities render on top of counties, blocking hover events

EXPECTED:
  Hover anywhere in Shasta County → Show Shasta stats

ACTUAL:
  Hover in rural Shasta → Shows Shasta ✅
  Hover over Redding (in Shasta) → Shows Redding, NOT Shasta ❌

ROOT CAUSE:
  MapLibre only triggers event on TOP layer
  Cities render after counties = cities are on top
  No way to "pass through" to county layer below

SOLUTIONS:
  A. Render cities at different zoom level (zoom >= 9)
  B. Query all layers at mouse position, prioritize county
  C. Make city fill layers semi-transparent pointer-events
```

---

## 6. CRITICAL ID MATCHING CHECK

### Current ID Generation Logic

```pseudo
POLYGON DATA GENERATION:
  Region ID: "NorthernCA"
  County ID: "Shasta"
  City ID: "Redding-0", "Redding-1", etc.

RENDERING:
  Region Source: "region-source-NorthernCA"
  Region Layer: "region-fill-NorthernCA"

  County Source: "county-source-Shasta"
  County Layer: "county-fill-Shasta"

  City Source: "city-source-Redding-0"  ⚠️ Uses indexedId
  City Layer: "city-fill-Redding-0"      ⚠️ Uses indexedId

HANDLERS:
  Looking for layer: "{polygon.type}-fill-{polygon.id}"

  Region: "region-fill-NorthernCA" ✅ MATCHES
  County: "county-fill-Shasta" ✅ MATCHES
  City: "city-fill-Redding-0" ✅ SHOULD MATCH (after our fix)

FEATURE-STATE:
  Setting state on source: "{polygon.type}-source-{polygon.id}"

  Region: "region-source-NorthernCA" ✅ MATCHES
  County: "county-source-Shasta" ✅ MATCHES
  City: "city-source-Redding-0" ⚠️ NEED TO VERIFY RENDERING MATCHES!
```

---

## 7. DEBUGGING CHECKLIST

```pseudo
✅ Verify handler registration:
   - Console shows: "🎨 Registering polygon hover handlers"
   - Console shows: "✅ Registered X event handlers"

✅ Verify hover detection:
   - Hover over boundary
   - Console shows: "🎯 Hover ENTER: county - Shasta"

❌ Verify feature-state update:
   - Add logging to setFeatureState calls
   - Check if feature-state actually changes

❌ Verify source ID matching:
   - Log sourceName in handler
   - Log actual source IDs in rendering
   - MUST BE IDENTICAL!

❌ Verify AnimatePresence behavior:
   - Check if displayData.name changes
   - Check if motion.div re-renders
   - Try removing mode="wait" to test

❌ Verify paint properties reading feature-state:
   - Add test layer with static hover: true
   - See if visual effect works
   - Isolate feature-state vs CSS issue
```

---

## NEXT STEPS

1. **Fix Info Card Updates**
   - Remove AnimatePresence "wait" mode
   - Add logging to verify state changes
   - Ensure displayData.name is unique per polygon

2. **Fix Hover Visual Effects**
   - Verify source ID matching between handlers and rendering
   - Add logging to setFeatureState calls
   - Test with simplified feature-state (static true/false)

3. **Fix Z-Index Blocking** (if needed)
   - Implement zoom-based rendering
   - Or query multiple layers on hover
