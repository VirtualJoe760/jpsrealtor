# Home Page Mobile & Desktop Transition Guide

**Created**: March 6, 2026
**Purpose**: Comprehensive guide for optimizing the home page chat + map experience for mobile and desktop
**Status**: Implementation Ready

---

## TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Mobile vs Desktop UX Requirements](#mobile-vs-desktop-ux-requirements)
4. [Proposed Solution](#proposed-solution)
5. [Implementation Plan](#implementation-plan)
6. [Code Examples](#code-examples)
7. [Testing Strategy](#testing-strategy)
8. [Migration Path](#migration-path)

---

## EXECUTIVE SUMMARY

### Current Implementation
The home page (`src/app/page.tsx`) currently uses a **"wipe" clip-path animation** to transition between ChatWidget and MapView. While visually interesting, this approach has limitations for mobile users:

- ❌ Doesn't follow mobile UI patterns (modal overlays are more familiar)
- ❌ Chat becomes non-interactive when map is visible (pointer-events: none)
- ❌ No touch-optimized controls for mobile devices
- ❌ Desktop experience could be enhanced with side-by-side layout

### Recommended Approach
Implement a **responsive, device-aware layout system**:

- ✅ **Mobile (< 1024px)**: Modal overlay pattern with bottom sheet for chat
- ✅ **Desktop (≥ 1024px)**: Option for side-by-side or overlay mode
- ✅ **Tablet (768px - 1024px)**: Stacked layout with swipe gestures
- ✅ **Touch-optimized**: All interactive elements meet 44px minimum
- ✅ **Progressive enhancement**: Works without JavaScript

---

## CURRENT STATE ANALYSIS

### File: `src/app/page.tsx`

#### Current Architecture
```tsx
<div className="relative overflow-hidden" style={{ minHeight: '100dvh' }}>
  {/* Layer 0: Background */}
  <div className="fixed inset-0" style={{ zIndex: 0 }}>
    <SpaticalBackground />
  </div>

  {/* Layer 1: Map (wipe animation) */}
  <div
    className="fixed inset-0"
    style={{
      zIndex: 1,
      clipPath: isMapVisible
        ? 'inset(0% 0% 0% 0%)'      // Fully visible
        : 'inset(50% 0% 50% 0%)',   // Clipped to center (hidden)
      pointerEvents: isMapVisible ? 'auto' : 'none'
    }}
  >
    <MapLayer />
  </div>

  {/* Layer 2: Map Controls (only when map visible) */}
  {isMapVisible && (
    <>
      <MapSearchBar />
      <FavoritesPannel />
      <ListingBottomPanel />
    </>
  )}

  {/* Layer 3: ChatWidget */}
  <div
    className="relative z-20"
    style={{ pointerEvents: isMapVisible ? 'none' : 'auto' }}
  >
    <ChatWidget />
  </div>
</div>
```

#### Current State Management
```tsx
// From useMapControl hook
const { isMapVisible, showMapAtLocation, hideMap } = useMapControl();

// Toggle function in home page
const handleToggleMap = () => {
  if (isMapVisible) {
    hideMap();
  } else {
    if (viewState) {
      showMapAtLocation(viewState.centerLat, viewState.centerLng, viewState.zoom);
    } else {
      showMapAtLocation(37.0, -119.5, 5); // Default California view
    }
  }
};
```

### Issues Identified

#### 1. Mobile UX Issues
- **Pointer Events Problem**: When map is visible, ChatWidget has `pointer-events: none`, making it completely non-interactive
- **No Bottom Sheet**: Mobile users expect swipe-up bottom sheets, not clip-path wipes
- **Touch Targets**: Some controls (favorites button, map controls) may be too small for touch
- **No Swipe Gestures**: Can't swipe to dismiss map or expand chat

#### 2. Desktop UX Issues
- **No Side-by-Side Option**: Users can't see chat and map simultaneously
- **Wasted Screen Space**: On large displays (1920px+), could show both side-by-side
- **No Resize**: Can't adjust chat/map ratio based on preference

#### 3. Tablet UX Issues
- **Awkward Transition**: Neither mobile nor desktop pattern fits well at 768px-1024px
- **No Snap Points**: Stacked layout would benefit from draggable resize with snap points

---

## MOBILE VS DESKTOP UX REQUIREMENTS

### Mobile Requirements (< 1024px)

#### Primary Pattern: **Full-Screen Modal with Bottom Sheet**

**User Flow:**
1. User lands on home page → Sees ChatWidget (default)
2. User types query → AI responds with listings
3. User taps "View on Map" → Map opens in full screen
4. Chat minimizes to **bottom sheet** (swipeable)
5. User can swipe up sheet to expand chat
6. User can swipe down sheet to minimize
7. User can swipe down map to close and return to chat

**Requirements:**
- ✅ Chat bottom sheet with drag handle
- ✅ Three snap points: Minimized (64px), Partial (40%), Full (85%)
- ✅ Map full-screen with chat overlay
- ✅ Swipe gestures for navigation
- ✅ Touch targets minimum 44px
- ✅ One-handed operation friendly

### Desktop Requirements (≥ 1024px)

#### Option 1: **Side-by-Side Layout** (Recommended)

**User Flow:**
1. User lands on home page → Sees chat (left) + map (right)
2. Chat takes 40% width, map takes 60% width
3. Resizable divider allows user to adjust ratio
4. Both chat and map are simultaneously interactive
5. User can collapse chat to give map 100% width
6. User can collapse map to give chat 100% width

**Requirements:**
- ✅ Resizable panels with drag divider
- ✅ Collapsible panels (chevron buttons)
- ✅ Minimum panel width: 320px for chat, 500px for map
- ✅ Smooth animations (300ms ease)
- ✅ Persist layout preference to localStorage

#### Option 2: **Overlay Mode** (Alternative)

**User Flow:**
1. User lands on home page → Sees ChatWidget (full screen)
2. User types query → AI responds
3. User clicks "View on Map" → Map slides in (overlay)
4. Chat stays in place, map overlays on top
5. Floating chat button in corner to toggle overlay

**Requirements:**
- ✅ Slide-in animation for map (from right)
- ✅ Floating chat toggle button (bottom-right)
- ✅ ESC key to close map overlay
- ✅ Click outside map to close (optional)

### Tablet Requirements (768px - 1024px)

#### Pattern: **Stacked Layout with Drag Handle**

**User Flow:**
1. User lands on home page → Sees chat (top 60%) + map preview (bottom 40%)
2. User can drag divider to resize vertically
3. Three snap points: Chat-focused (75/25), Balanced (50/50), Map-focused (25/75)
4. Smooth snap animations
5. Touch-friendly drag handle (48px height)

**Requirements:**
- ✅ Vertical stacking (chat above, map below)
- ✅ Draggable resize handle
- ✅ Snap points with haptic feedback (if available)
- ✅ Minimum heights: Chat 200px, Map 300px
- ✅ Double-tap handle to toggle between snap points

---

## PROPOSED SOLUTION

### Architecture: **Unified Responsive Layout**

Create a new component: `HomeLayout.tsx` that handles responsive switching:

```tsx
<HomeLayout>
  {/* Desktop (≥ 1024px) */}
  <DesktopLayout mode="side-by-side">
    <ChatPanel />
    <MapPanel />
  </DesktopLayout>

  {/* Tablet (768px - 1023px) */}
  <TabletLayout mode="stacked">
    <ChatPanel />
    <MapPanel />
  </TabletLayout>

  {/* Mobile (< 768px) */}
  <MobileLayout mode="modal">
    <ChatPanel />
    <MapPanel />
  </MobileLayout>
</HomeLayout>
```

### Layout Modes

#### 1. Desktop Side-by-Side Mode

```
┌─────────────────────────────────────────────────┐
│  Chat Panel (40%)  │  Resize  │  Map Panel (60%) │
│  ─────────────────  │  Handle  │  ───────────────│
│                     │          │                  │
│  - Messages         │   ⋮⋮⋮    │  [Map View]      │
│  - Input box        │          │  - Clusters      │
│  - Results          │          │  - Markers       │
│                     │          │  - Controls      │
│                     │          │                  │
└─────────────────────────────────────────────────┘
```

**Features:**
- Resizable divider (can drag left/right)
- Collapse buttons (chevron icons)
- Minimum widths enforced
- Layout persists to localStorage

#### 2. Tablet Stacked Mode

```
┌────────────────────────┐
│  Chat Panel (60%)      │
│  ─────────────────────│
│                        │
│  - Messages            │
│  - Input box           │
│                        │
├════════════════════════┤ ← Drag Handle
│  Map Panel (40%)       │
│  ─────────────────────│
│                        │
│  [Map View]            │
│                        │
└────────────────────────┘
```

**Features:**
- Vertical drag handle (48px height, touch-friendly)
- Three snap points: 75/25, 50/50, 25/75
- Double-tap handle to cycle snap points
- Smooth snap animations

#### 3. Mobile Modal Mode

```
┌────────────────────────┐
│  [Map Full Screen]     │  ← Default: Chat is visible
│                        │
│  - Markers             │
│  - Clusters            │
│  - Controls (top)      │
│                        │
│                        │  ← User taps "View Map"
├────────────────────────┤
│  ═══ Chat Sheet ═══    │  ← Swipe up to expand
│  Latest AI message...  │
└────────────────────────┘
```

**Chat Sheet States:**
- **Minimized**: 64px tall (just drag handle + snippet)
- **Partial**: 40% screen height
- **Full**: 85% screen height

**Features:**
- Swipe gestures (Framer Motion drag)
- Snap to nearest state on release
- Backdrop overlay when fully expanded
- Can swipe down map itself to close

---

## IMPLEMENTATION PLAN

### Phase 1: Mobile Bottom Sheet (1 week)

**Goal**: Implement mobile modal overlay with swipeable bottom sheet

#### Tasks:
1. Create `MobileBottomSheet.tsx` component
2. Implement swipe gesture handling with Framer Motion
3. Add three snap points (minimized, partial, full)
4. Add backdrop overlay for full expansion
5. Test on real iOS/Android devices

**Files to Create/Modify:**
- `src/app/components/layout/MobileBottomSheet.tsx` (new)
- `src/app/page.tsx` (modify to use responsive layout)

**Acceptance Criteria:**
- ✅ Smooth swipe gestures
- ✅ Snaps to nearest point on release
- ✅ Works on iOS Safari and Chrome Android
- ✅ Touch targets meet 44px minimum
- ✅ No layout shift or jank

---

### Phase 2: Desktop Side-by-Side (1 week)

**Goal**: Implement resizable side-by-side layout for desktop

#### Tasks:
1. Create `ResizableLayout.tsx` component
2. Implement drag divider with mouse events
3. Add collapse/expand buttons
4. Persist layout preferences to localStorage
5. Add keyboard shortcuts (e.g., Cmd+B to toggle chat)

**Files to Create/Modify:**
- `src/app/components/layout/ResizableLayout.tsx` (new)
- `src/app/components/layout/ResizableDivider.tsx` (new)
- `src/app/page.tsx` (modify)

**Acceptance Criteria:**
- ✅ Smooth resize with mouse drag
- ✅ Minimum widths enforced (320px chat, 500px map)
- ✅ Collapse buttons work
- ✅ Layout persists across page reloads
- ✅ Keyboard shortcuts work

---

### Phase 3: Tablet Stacked Layout (3 days)

**Goal**: Implement vertical stacked layout with drag handle

#### Tasks:
1. Create `StackedLayout.tsx` component
2. Implement vertical drag handle
3. Add snap points (75/25, 50/50, 25/75)
4. Add double-tap to cycle snap points
5. Test on iPad and Android tablets

**Files to Create/Modify:**
- `src/app/components/layout/StackedLayout.tsx` (new)
- `src/app/page.tsx` (modify)

**Acceptance Criteria:**
- ✅ Smooth vertical drag
- ✅ Snap points work correctly
- ✅ Double-tap cycles snap points
- ✅ Works on iPad Safari
- ✅ Minimum heights enforced

---

### Phase 4: Responsive Wrapper (2 days)

**Goal**: Create unified layout component that switches based on breakpoint

#### Tasks:
1. Create `HomeLayout.tsx` wrapper component
2. Implement responsive switching logic
3. Add smooth transitions between layouts
4. Handle edge cases (window resize, orientation change)
5. Add SSR support (prevent hydration mismatch)

**Files to Create/Modify:**
- `src/app/components/layout/HomeLayout.tsx` (new)
- `src/app/page.tsx` (simplify to use HomeLayout)

**Acceptance Criteria:**
- ✅ Switches layouts at correct breakpoints
- ✅ No hydration mismatch errors
- ✅ Handles window resize smoothly
- ✅ Works with Next.js App Router

---

### Phase 5: Polish & Testing (3 days)

**Goal**: Final polish, animations, and comprehensive testing

#### Tasks:
1. Add smooth transitions between states
2. Implement haptic feedback (iOS) for snap points
3. Add loading states and skeletons
4. Comprehensive device testing
5. Performance optimization (Lighthouse scores)
6. Accessibility audit (keyboard navigation, screen readers)

**Acceptance Criteria:**
- ✅ Lighthouse Mobile > 90
- ✅ WCAG 2.1 AA compliant
- ✅ Works on all target devices
- ✅ Smooth 60fps animations
- ✅ No console errors or warnings

---

## CODE EXAMPLES

### 1. Mobile Bottom Sheet Component

```tsx
// src/app/components/layout/MobileBottomSheet.tsx
"use client";

import { motion, PanInfo, useAnimation } from "framer-motion";
import { useState, useEffect } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";

type SheetState = "minimized" | "partial" | "full";

interface MobileBottomSheetProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

const SNAP_POINTS = {
  minimized: 64,    // 64px - just handle + snippet
  partial: 0.4,     // 40% of screen
  full: 0.85,       // 85% of screen
};

export default function MobileBottomSheet({
  children,
  isOpen,
  onClose
}: MobileBottomSheetProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const [sheetState, setSheetState] = useState<SheetState>("minimized");
  const controls = useAnimation();

  // Get current sheet height based on state
  const getSheetHeight = (state: SheetState): number => {
    if (state === "minimized") return SNAP_POINTS.minimized;
    const screenHeight = window.innerHeight;
    return state === "partial"
      ? screenHeight * SNAP_POINTS.partial
      : screenHeight * SNAP_POINTS.full;
  };

  // Snap to nearest point
  const snapToNearest = (currentY: number) => {
    const screenHeight = window.innerHeight;
    const partialHeight = screenHeight * SNAP_POINTS.partial;
    const fullHeight = screenHeight * SNAP_POINTS.full;

    // Calculate distances to each snap point
    const distances = {
      minimized: Math.abs(currentY - SNAP_POINTS.minimized),
      partial: Math.abs(currentY - partialHeight),
      full: Math.abs(currentY - fullHeight),
    };

    // Find closest snap point
    const nearest = Object.keys(distances).reduce((a, b) =>
      distances[a as SheetState] < distances[b as SheetState] ? a : b
    ) as SheetState;

    setSheetState(nearest);
    controls.start({
      y: screenHeight - getSheetHeight(nearest),
      transition: { type: "spring", damping: 30, stiffness: 300 }
    });
  };

  // Handle drag end
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const currentY = getSheetHeight(sheetState) - info.offset.y;
    snapToNearest(currentY);
  };

  // Animate to state on change
  useEffect(() => {
    if (isOpen) {
      const screenHeight = window.innerHeight;
      controls.start({
        y: screenHeight - getSheetHeight(sheetState),
        transition: { type: "spring", damping: 30, stiffness: 300 }
      });
    }
  }, [sheetState, isOpen, controls]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop (only for full expansion) */}
      {sheetState === "full" && (
        <motion.div
          className="fixed inset-0 bg-black/50 z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSheetState("minimized")}
        />
      )}

      {/* Bottom Sheet */}
      <motion.div
        className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl ${
          isLight ? 'bg-white' : 'bg-gray-900'
        } shadow-2xl`}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        initial={{ y: window.innerHeight }}
        style={{
          height: getSheetHeight(sheetState),
          touchAction: "none" // Prevent scrolling while dragging
        }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className={`w-12 h-1.5 rounded-full ${
            isLight ? 'bg-gray-300' : 'bg-gray-700'
          }`} />
        </div>

        {/* Sheet Content */}
        <div className="overflow-y-auto h-full pb-20">
          {children}
        </div>
      </motion.div>
    </>
  );
}
```

---

### 2. Desktop Resizable Layout

```tsx
// src/app/components/layout/ResizableLayout.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";

interface ResizableLayoutProps {
  chatPanel: React.ReactNode;
  mapPanel: React.ReactNode;
  defaultChatWidth?: number; // 0-100 percentage
}

export default function ResizableLayout({
  chatPanel,
  mapPanel,
  defaultChatWidth = 40
}: ResizableLayoutProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [chatWidth, setChatWidth] = useState(defaultChatWidth);
  const [isDragging, setIsDragging] = useState(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Persist layout to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('home-layout-chat-width');
    if (saved) {
      setChatWidth(parseFloat(saved));
    }
  }, []);

  useEffect(() => {
    if (!isChatCollapsed) {
      localStorage.setItem('home-layout-chat-width', chatWidth.toString());
    }
  }, [chatWidth, isChatCollapsed]);

  // Handle mouse drag
  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newChatWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    // Enforce minimum widths (320px chat, 500px map)
    const minChatWidth = (320 / containerRect.width) * 100;
    const maxChatWidth = 100 - ((500 / containerRect.width) * 100);

    setChatWidth(Math.max(minChatWidth, Math.min(maxChatWidth, newChatWidth)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  // Collapse/expand chat
  const toggleChatCollapse = () => {
    setIsChatCollapsed(!isChatCollapsed);
  };

  const effectiveChatWidth = isChatCollapsed ? 0 : chatWidth;
  const mapWidth = 100 - effectiveChatWidth;

  return (
    <div
      ref={containerRef}
      className="flex h-screen w-full relative"
    >
      {/* Chat Panel */}
      <motion.div
        className="relative overflow-hidden"
        initial={false}
        animate={{ width: `${effectiveChatWidth}%` }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        {!isChatCollapsed && chatPanel}

        {/* Expand Button (when collapsed) */}
        {isChatCollapsed && (
          <button
            onClick={toggleChatCollapse}
            className={`absolute top-4 right-4 p-2 rounded-lg ${
              isLight
                ? 'bg-white hover:bg-gray-100'
                : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </motion.div>

      {/* Resize Divider (when chat not collapsed) */}
      {!isChatCollapsed && (
        <div
          className={`relative w-1 cursor-col-resize group ${
            isLight ? 'bg-gray-300 hover:bg-blue-500' : 'bg-gray-700 hover:bg-emerald-500'
          } transition-colors`}
          onMouseDown={handleMouseDown}
        >
          {/* Drag Handle Visual */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className={`w-1 h-12 rounded-full ${
              isLight ? 'bg-blue-500' : 'bg-emerald-500'
            }`} />
          </div>

          {/* Collapse Button */}
          <button
            onClick={toggleChatCollapse}
            className={`absolute top-4 -left-4 p-1.5 rounded-lg ${
              isLight
                ? 'bg-white hover:bg-gray-100 border border-gray-300'
                : 'bg-gray-800 hover:bg-gray-700 border border-gray-700'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Map Panel */}
      <motion.div
        className="relative overflow-hidden"
        initial={false}
        animate={{ width: `${mapWidth}%` }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        {mapPanel}
      </motion.div>
    </div>
  );
}
```

---

### 3. Unified Home Layout Wrapper

```tsx
// src/app/components/layout/HomeLayout.tsx
"use client";

import { useState, useEffect } from "react";
import MobileBottomSheet from "./MobileBottomSheet";
import ResizableLayout from "./ResizableLayout";
import StackedLayout from "./StackedLayout";

type DeviceMode = "mobile" | "tablet" | "desktop";

interface HomeLayoutProps {
  chatPanel: React.ReactNode;
  mapPanel: React.ReactNode;
}

export default function HomeLayout({ chatPanel, mapPanel }: HomeLayoutProps) {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [mounted, setMounted] = useState(false);

  // Detect device mode based on window width
  useEffect(() => {
    setMounted(true);

    const updateDeviceMode = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setDeviceMode("mobile");
      } else if (width < 1024) {
        setDeviceMode("tablet");
      } else {
        setDeviceMode("desktop");
      }
    };

    updateDeviceMode();
    window.addEventListener('resize', updateDeviceMode);
    return () => window.removeEventListener('resize', updateDeviceMode);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  // Render appropriate layout based on device mode
  switch (deviceMode) {
    case "mobile":
      return (
        <MobileLayout
          chatPanel={chatPanel}
          mapPanel={mapPanel}
        />
      );

    case "tablet":
      return (
        <StackedLayout
          chatPanel={chatPanel}
          mapPanel={mapPanel}
        />
      );

    case "desktop":
    default:
      return (
        <ResizableLayout
          chatPanel={chatPanel}
          mapPanel={mapPanel}
        />
      );
  }
}

// Mobile Layout Component
function MobileLayout({ chatPanel, mapPanel }: HomeLayoutProps) {
  const [showMap, setShowMap] = useState(false);

  return (
    <div className="relative min-h-screen">
      {/* Default: Chat View */}
      {!showMap && (
        <div className="min-h-screen">
          {chatPanel}
        </div>
      )}

      {/* Map View (when opened) */}
      {showMap && (
        <div className="fixed inset-0 z-30">
          {mapPanel}
        </div>
      )}

      {/* Bottom Sheet (over map) */}
      <MobileBottomSheet isOpen={showMap} onClose={() => setShowMap(false)}>
        {chatPanel}
      </MobileBottomSheet>
    </div>
  );
}
```

---

### 4. Updated Home Page Integration

```tsx
// src/app/page.tsx (simplified)
"use client";

import { MLSProvider } from "@/app/components/mls/MLSProvider";
import { ChatProvider } from "@/app/components/chat/ChatProvider";
import HomeLayout from "@/app/components/layout/HomeLayout";
import ChatWidget from "@/app/components/chat/ChatWidget";
import MapLayer from "@/app/components/MapLayer";
import MapSearchBar from "@/app/components/map/MapSearchBar";
import { useMLSContext } from "@/app/components/mls/MLSProvider";

function HomeContent() {
  const { selectedListing, closeListing } = useMLSContext();

  return (
    <HomeLayout
      chatPanel={<ChatWidget />}
      mapPanel={
        <>
          <MapLayer />
          <MapSearchBar />
          {/* Other map controls */}
        </>
      }
    />
  );
}

export default function Home() {
  return (
    <MLSProvider>
      <ChatProvider>
        <HomeContent />
      </ChatProvider>
    </MLSProvider>
  );
}
```

---

## TESTING STRATEGY

### Device Testing Matrix

| Device | Screen Size | OS | Browser | Priority |
|--------|-------------|----|---------| ---------|
| iPhone SE | 375x667 | iOS 17 | Safari | High |
| iPhone 14 Pro | 393x852 | iOS 17 | Safari | High |
| iPhone 14 Pro Max | 430x932 | iOS 17 | Safari | Medium |
| iPad | 768x1024 | iPadOS 17 | Safari | High |
| iPad Pro 11" | 834x1194 | iPadOS 17 | Safari | Medium |
| Android Phone | 360x800 | Android 13 | Chrome | High |
| Android Tablet | 800x1280 | Android 13 | Chrome | Medium |
| MacBook Pro 13" | 1280x800 | macOS | Chrome, Safari | High |
| Desktop 1080p | 1920x1080 | Windows/Mac | Chrome, Firefox | High |
| Desktop 2K | 2560x1440 | Windows/Mac | Chrome | Medium |

### Test Cases

#### Mobile Tests
1. **Bottom Sheet Gestures**
   - [ ] Swipe up from minimized → partial
   - [ ] Swipe up from partial → full
   - [ ] Swipe down from full → partial
   - [ ] Swipe down from partial → minimized
   - [ ] Release mid-swipe → snaps to nearest

2. **Touch Targets**
   - [ ] All buttons ≥ 44px touch target
   - [ ] Drag handle is easy to grab (48px height)
   - [ ] No accidental taps when swiping

3. **Map Interaction**
   - [ ] Can pan map while sheet is minimized
   - [ ] Can zoom map while sheet is minimized
   - [ ] Tap marker opens listing panel
   - [ ] Listing panel works with bottom sheet

#### Desktop Tests
1. **Resizable Layout**
   - [ ] Drag divider left/right smoothly
   - [ ] Minimum widths enforced (320px/500px)
   - [ ] Collapse chat → map takes full width
   - [ ] Expand chat → restores previous width
   - [ ] Layout persists after page reload

2. **Keyboard Shortcuts**
   - [ ] Cmd/Ctrl + B toggles chat panel
   - [ ] ESC closes any open overlays
   - [ ] Tab navigation works correctly

3. **Multi-monitor**
   - [ ] Works correctly on secondary monitor
   - [ ] Resizing window updates layout
   - [ ] Full-screen mode works

#### Tablet Tests
1. **Stacked Layout**
   - [ ] Drag handle resizes vertically
   - [ ] Snap points work (75/25, 50/50, 25/75)
   - [ ] Double-tap cycles snap points
   - [ ] Minimum heights enforced

2. **Orientation Change**
   - [ ] Portrait → Landscape transition smooth
   - [ ] Layout adjusts appropriately
   - [ ] No loss of state

### Performance Tests
1. **Lighthouse Scores**
   - [ ] Mobile: Performance > 90
   - [ ] Desktop: Performance > 95
   - [ ] Accessibility: 100
   - [ ] Best Practices: 100

2. **Animation Performance**
   - [ ] All animations at 60fps
   - [ ] No layout shifts (CLS < 0.1)
   - [ ] Smooth scrolling
   - [ ] No janky resize/drag

### Accessibility Tests
1. **Keyboard Navigation**
   - [ ] Can tab through all controls
   - [ ] Focus visible on all elements
   - [ ] ESC key closes overlays
   - [ ] Enter/Space activates buttons

2. **Screen Reader**
   - [ ] NVDA (Windows): All content readable
   - [ ] VoiceOver (Mac/iOS): All content readable
   - [ ] ARIA labels appropriate
   - [ ] Live regions announce updates

3. **Visual**
   - [ ] Text contrast meets WCAG AA (4.5:1)
   - [ ] Works at 200% zoom
   - [ ] Focus indicators visible
   - [ ] Color not sole indicator

---

## MIGRATION PATH

### Week 1: Foundation
- [ ] Create layout components (MobileBottomSheet, ResizableLayout, StackedLayout)
- [ ] Create HomeLayout wrapper
- [ ] Set up feature flag for gradual rollout

### Week 2: Mobile Implementation
- [ ] Implement mobile bottom sheet
- [ ] Add swipe gestures
- [ ] Test on real devices
- [ ] Fix bugs

### Week 3: Desktop Implementation
- [ ] Implement resizable layout
- [ ] Add collapse/expand
- [ ] Add keyboard shortcuts
- [ ] Persist preferences

### Week 4: Tablet & Polish
- [ ] Implement stacked layout
- [ ] Add snap points
- [ ] Polish animations
- [ ] Final testing

### Week 5: Rollout
- [ ] Enable for 10% of users (A/B test)
- [ ] Monitor analytics and feedback
- [ ] Fix critical issues
- [ ] Roll out to 50%
- [ ] Roll out to 100%

---

## SUCCESS METRICS

### User Experience
- ✅ Mobile bounce rate decreases by 20%
- ✅ Desktop session duration increases by 30%
- ✅ User engagement with map increases
- ✅ Positive user feedback (NPS score)

### Technical
- ✅ Lighthouse Mobile > 90
- ✅ Lighthouse Desktop > 95
- ✅ Zero critical accessibility issues
- ✅ < 5% error rate in production

### Business
- ✅ Increased property views
- ✅ Increased map interactions
- ✅ Improved conversion rates
- ✅ Positive user reviews

---

## CONCLUSION

This transition guide provides a comprehensive roadmap for upgrading the home page to a responsive, device-aware layout that provides optimal UX on mobile, tablet, and desktop. The key is to:

1. **Mobile**: Use familiar bottom sheet pattern
2. **Desktop**: Provide powerful side-by-side option
3. **Tablet**: Balance with stacked layout
4. **Progressive Enhancement**: Works without JS
5. **Accessibility**: WCAG 2.1 AA compliant

By following this guide, the home page will provide a best-in-class experience that rivals or exceeds competitors like Zillow and Redfin.

---

**Ready to implement? Start with Phase 1: Mobile Bottom Sheet** 🚀
