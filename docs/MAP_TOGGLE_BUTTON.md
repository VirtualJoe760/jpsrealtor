# Map Toggle Button - Global CHAP Control

**Date**: December 15, 2025
**Status**: Implemented
**Component**: `MapToggleButton.tsx`

---

## 🎯 Overview

The **MapToggleButton** is a global floating action button that provides access to the CHAP (Chat + Map) unified experience from any page in the application.

---

## 📍 Location & Visibility

### Position
- **Fixed positioning**: `top-4 right-4`
- **Always visible**: Present on all pages globally
- **High z-index**: `z-50` ensures it appears above all other content
- **Responsive sizing**:
  - Mobile: `w-12 h-12` (48x48px)
  - Desktop: `w-14 h-14` (56x56px)

### File Location
```
src/app/components/MapToggleButton.tsx
```

### Integration Point
Rendered in `ClientLayoutWrapper.tsx` - makes it globally available across the entire app.

---

## 🎨 Design

### Visual States

#### Chat Mode (Map Hidden)
- **Icon**: Map icon (Lucide `Map`)
- **Color (Light)**: Blue-600 background (`bg-blue-600`)
- **Color (Dark)**: Emerald-600 background (`bg-emerald-600`)
- **Hover**: Slightly darker shade + scale to 1.05
- **Active**: Scale to 0.95

#### Map Mode (Map Visible)
- **Icon**: Chat icon (Lucide `MessageSquare`)
- **Color (Light)**: Blue-600 background
- **Color (Dark)**: Emerald-600 background
- **Indicates**: "Click to return to chat"

### Styling
```tsx
className={`
  fixed top-4 right-4 z-50
  w-12 h-12 md:w-14 md:h-14
  flex items-center justify-center
  rounded-xl
  transition-all duration-200
  shadow-lg
  ${isLight
    ? 'bg-blue-600 hover:bg-blue-700 text-white'
    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
  }
`}
```

### Animations (Framer Motion)
- **Tap**: `scale: 0.95` - Provides tactile feedback
- **Hover**: `scale: 1.05` - Draws attention on desktop
- **Transition**: `duration: 200ms` - Smooth and snappy

---

## ⚙️ Functionality

### Core Behavior

```typescript
const handleToggleMap = () => {
  if (isMapVisible) {
    hideMap();
  } else {
    // Show map centered on Palm Desert (default location)
    showMapAtLocation(33.8303, -116.5453, 12);
  }
};
```

### Hook Integration
Uses `useMapControl()` hook from `@/app/hooks/useMapControl`:
- `isMapVisible` - Current map visibility state
- `showMapAtLocation(lat, lng, zoom)` - Reveals map with wipe animation
- `hideMap()` - Hides map with reverse wipe animation

### Default Map Location
**Palm Desert, CA**
- Latitude: `33.8303`
- Longitude: `--116.5453`
- Zoom: `12`

---

## 🌐 Global Availability

### Where It Appears
The MapToggleButton is available on **ALL pages**:
- ✅ Homepage (Chat/Landing)
- ✅ Neighborhoods directory
- ✅ City pages
- ✅ Subdivision pages
- ✅ Article/Insights pages
- ✅ Dashboard
- ✅ Settings
- ✅ Authentication pages
- ✅ **Every other route**

### Why Global?
The CHAP architecture is designed to provide map access everywhere, allowing users to:
1. Explore properties from any page
2. Instantly switch between content and map view
3. Maintain spatial context across navigation
4. Access map-based search anywhere

---

## 🔧 Technical Implementation

### Component Structure

```tsx
// src/app/components/MapToggleButton.tsx
"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { useMapControl } from "@/app/hooks/useMapControl";
import { Map, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

export default function MapToggleButton() {
  const { currentTheme } = useTheme();
  const { isMapVisible, showMapAtLocation, hideMap } = useMapControl();
  const isLight = currentTheme === "lightgradient";

  const handleToggleMap = () => {
    if (isMapVisible) {
      hideMap();
    } else {
      showMapAtLocation(33.8303, -116.5453, 12);
    }
  };

  return (
    <motion.button
      onClick={handleToggleMap}
      className="..."
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.05 }}
      aria-label={isMapVisible ? "Show Chat" : "Show Map"}
      style={{ pointerEvents: 'auto' }}
    >
      {isMapVisible ? (
        <MessageSquare className="w-5 h-5 md:w-6 md:h-6" />
      ) : (
        <Map className="w-5 h-5 md:w-6 md:h-6" />
      )}
    </motion.button>
  );
}
```

### Layout Integration

**File**: `src/app/components/ClientLayoutWrapper.tsx`

```tsx
import MapToggleButton from "./MapToggleButton";

function LayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* ... other global components ... */}

      {/* Global Map Toggle Button - Available on all pages */}
      <MapToggleButton />

      {/* Main content */}
      <div>{children}</div>
    </>
  );
}
```

---

## 🎭 User Experience

### Interaction Flow

#### From Chat to Map
```
User on homepage (chat interface)
  ↓
Clicks map button (Map icon visible)
  ↓
Map wipes in from top/bottom with 1.5s animation
  ↓
Button icon changes to MessageSquare (chat icon)
  ↓
User can interact with full map
```

#### From Map to Chat
```
User viewing map
  ↓
Clicks map button (MessageSquare icon visible)
  ↓
Map wipes out to center with 1.5s animation
  ↓
Button icon changes back to Map icon
  ↓
Chat interface restored
```

### Accessibility
- **ARIA Label**: Descriptive label changes based on state
  - Chat mode: `"Show Map"`
  - Map mode: `"Show Chat"`
- **Keyboard accessible**: Standard button, focusable
- **Touch target**: 48x48px minimum (mobile) exceeds WCAG standards
- **High contrast**: Strong color differentiation in both themes

---

## 📱 Mobile Considerations

### Touch Optimization
- **Size**: 48x48px on mobile (WCAG 2.1 Level AAA)
- **Position**: Top-right corner, easy thumb reach
- **Feedback**: Immediate scale animation on tap
- **No conflicts**: Positioned away from hamburger menu (top-left)

### Responsive Behavior
- Remains visible during scroll (fixed positioning)
- Doesn't interfere with mobile navigation bar (bottom)
- Works alongside MobileTopNav branding bar

---

## 🚀 CHAP Integration

### Map Control Hook
The button relies on the `useMapControl` hook which manages:
- Map visibility state (via context)
- Wipe animation timing
- Map positioning and zoom
- Listing display on map

### Map Layer Architecture
The map itself is pre-rendered as a background layer in `page.tsx`:
```tsx
{/* Map Layer with wipe clip-path effect */}
<div
  className="fixed inset-0"
  style={{
    zIndex: 1,
    clipPath: isMapVisible
      ? 'inset(0% 0% 0% 0%)'  // Fully visible
      : 'inset(50% 0% 50% 0%)',  // Hidden (clipped to center)
    pointerEvents: isMapVisible ? 'auto' : 'none',
  }}
>
  <MapLayer />
</div>
```

The MapToggleButton simply controls the `isMapVisible` state.

---

## 🎨 Theme Support

### Light Theme (lightgradient)
- **Background**: Blue-600 → Blue-700 on hover
- **Text**: White
- **Shadow**: Standard shadow-lg
- **Gradient branding**: Blue-700 to Blue-900

### Dark Theme (blackspace)
- **Background**: Emerald-600 → Emerald-700 on hover
- **Text**: White
- **Shadow**: Enhanced shadow-lg
- **Gradient branding**: Emerald-400 to Emerald-200

---

## 📊 Related Components

### MobileTopNav
- **Before refactor**: Contained the map toggle button
- **After refactor**: Only shows "JPS" branding
- **Purpose**: Provides navigation context on chat page only

### ChatHeader
- **Status**: Previously attempted to add map button
- **Issue**: Was inside ChatWidget with pointer-events issues
- **Resolution**: Superseded by global MapToggleButton

### GlobalHamburgerMenu
- **Position**: Top-left corner
- **No conflict**: MapToggleButton is top-right
- **Both**: Fixed position, z-50

---

## ✅ Benefits

### User Benefits
- 🌍 **Universal access**: Map available from anywhere
- 🎯 **One-click toggle**: Instant switch between chat and map
- 💡 **Clear affordance**: Icon indicates current state
- 📱 **Mobile optimized**: Perfect touch target size

### Developer Benefits
- 🧩 **Modular**: Single component, easy to maintain
- 🔄 **Reusable**: Works across all pages automatically
- 🎨 **Theme-aware**: Automatically adapts to light/dark
- 📦 **Clean integration**: Added to layout, no per-page setup

### Business Benefits
- 📈 **Increased engagement**: Users explore map more frequently
- 🗺️ **Spatial context**: Map reinforces location-based value
- ✨ **Premium feel**: Smooth animations, polished UX
- 🎯 **Unique differentiator**: CHAP experience is unique to this app

---

## 🧪 Testing Checklist

### Functionality
- [ ] Button visible on homepage
- [ ] Button visible on neighborhoods page
- [ ] Button visible on city pages
- [ ] Button visible on article pages
- [ ] Button visible on dashboard
- [ ] Click toggles map visibility
- [ ] Icon changes (Map ↔ MessageSquare)
- [ ] Map centers on Palm Desert on first open
- [ ] Smooth wipe animation (1.5s)
- [ ] Works in light theme
- [ ] Works in dark theme

### Mobile
- [ ] Button visible on mobile
- [ ] Touch target is 48x48px
- [ ] Tap animation works
- [ ] No conflicts with hamburger menu
- [ ] No conflicts with bottom nav
- [ ] Doesn't interfere with scroll

### Accessibility
- [ ] Keyboard focusable
- [ ] ARIA label correct in both states
- [ ] High contrast in both themes
- [ ] Screen reader announces state changes

---

## 📝 Future Enhancements

### Potential Improvements
1. **Smart positioning**
   - Auto-center on user's last viewed location
   - Remember user's preferred zoom level
   - Use geolocation if permitted

2. **Badge indicators**
   - Show count of new listings on map
   - Indicate unseen favorites
   - Highlight active filters

3. **Haptic feedback**
   - Vibrate on tap (mobile)
   - Different patterns for map on/off

4. **Contextual behavior**
   - On neighborhoods page: center on that neighborhood
   - On city page: center on that city
   - On subdivision page: center on subdivision

---

## 🎉 Summary

The **MapToggleButton** is a key component of the CHAP architecture, providing:
- ✅ **Global map access** from any page
- ✅ **Seamless toggle** between chat and map
- ✅ **Consistent UX** across the entire app
- ✅ **Mobile-first design** with perfect touch targets
- ✅ **Theme-aware styling** for light and dark modes
- ✅ **Smooth animations** for premium feel

It's a simple yet powerful component that makes the CHAP unified experience accessible everywhere.

---

**Component**: `src/app/components/MapToggleButton.tsx`
**Integration**: `src/app/components/ClientLayoutWrapper.tsx`
**Documentation**: `docs/MAP_TOGGLE_BUTTON.md`
