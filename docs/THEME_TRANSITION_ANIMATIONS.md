# Theme Transition Animations - Two-Act System

**Real Estate Storytelling Through Motion**

## 🎬 Concept Overview

Our theme toggle uses a two-act animation system that tells a story:
- **Act 1 (Exit):** "Closing" the old theme - securing, departing
- **Act 2 (Enter):** "Opening" the new theme - revealing, welcoming

Each transition uses real estate metaphors (doors, keys, windows) to create a cohesive, branded experience.

---

## 🎨 The 8 Animation Pairs

### 1. **Key Turn** 🔑
**Exit:** Key rotates clockwise (locking)
**Enter:** Key rotates counter-clockwise (unlocking)
**Duration:** 300ms each
**Metaphor:** Locking up one property, unlocking another

```css
Exit: rotate(0deg) → rotate(90deg)
Enter: rotate(90deg) → rotate(0deg)
```

---

### 2. **French Doors** 🚪
**Exit:** Double doors swing inward (closing)
**Enter:** Double doors swing outward (opening)
**Duration:** 500ms each
**Metaphor:** Grand entrance/exit, welcoming/departing

```css
Exit: rotateY(0deg) → rotateY(-90deg) (left), rotateY(0deg) → rotateY(90deg) (right)
Enter: rotateY(-90deg) → rotateY(0deg) (left), rotateY(90deg) → rotateY(0deg) (right)
```

---

### 3. **Venetian Blinds** 🪟
**Exit:** Horizontal slats rotate to closed position
**Enter:** Horizontal slats rotate to open position
**Duration:** 400ms each
**Metaphor:** Controlling light, privacy vs openness

```css
Exit: scaleY(1) → scaleY(0.05) rotateX(90deg) → scaleY(1)
Enter: scaleY(0.05) rotateX(90deg) → scaleY(1) rotateX(0deg)
```

---

### 4. **Garage Door** 🚗
**Exit:** Door rolls down from top
**Enter:** Door rolls up from bottom
**Duration:** 450ms each
**Metaphor:** Modern homes, secure storage

```css
Exit: clip-path: inset(0 0 0 0) → inset(0 0 100% 0)
Enter: clip-path: inset(100% 0 0 0) → inset(0 0 0 0)
```

---

### 5. **Sliding Glass Door** 🏠
**Exit:** Panel slides from left to right (closing)
**Enter:** Panel slides from right to left (opening)
**Duration:** 450ms each
**Metaphor:** Contemporary design, indoor/outdoor living

```css
Exit: translateX(0) → translateX(100%)
Enter: translateX(-100%) → translateX(0)
```

---

### 6. **Property Card Flip** 🏡
**Exit:** Card flips away (showing back)
**Enter:** Card flips to front (showing property)
**Duration:** 600ms each
**Metaphor:** Browsing listings, exploring options

```css
Exit: rotateY(0deg) → rotateY(180deg)
Enter: rotateY(-180deg) → rotateY(0deg)
```

---

### 7. **Window Shutters** 🪟
**Exit:** Shutters close from sides toward center
**Enter:** Shutters open from center to sides
**Duration:** 500ms each
**Metaphor:** Traditional homes, classic elegance

```css
Exit: Two panels move from edges → center
Enter: Two panels move from center → edges
```

---

### 8. **Curtain Draw** 🎭
**Exit:** Curtains pull closed from sides
**Enter:** Curtains pull open from center
**Duration:** 550ms each
**Metaphor:** Theatrical reveal, staging a home

```css
Exit: Two curtains slide to center (scaleX: 0 → 1)
Enter: Two curtains slide to sides (scaleX: 1 → 0)
```

---

## 🔄 User Journey Flow

### Scenario: Light Theme → Dark Theme

```
1. User clicks moon icon (theme toggle)
   └─ Current state: Light theme (indigo #4f46e5)

2. EXIT animation plays
   └─ Random selection: "French Doors"
   └─ Overlay color: INDIGO (old theme)
   └─ Animation: Doors swing CLOSED
   └─ Duration: 500ms
   └─ Save to sessionStorage: 'theme-transition-pair' = 'french-doors'

3. Cookie updated → Page refreshes
   └─ Server reads cookie: 'blackspace'
   └─ Renders with dark theme

4. ENTER animation plays (on mount)
   └─ Read sessionStorage: 'french-doors'
   └─ Overlay color: BLACK (new theme)
   └─ Animation: Doors swing OPEN
   └─ Duration: 500ms
   └─ Clear sessionStorage

5. User sees dark theme! ✨
```

---

## 🎯 Technical Architecture

### sessionStorage Keys
```typescript
'theme-transition-pair': 'key-turn' | 'french-doors' | 'blinds' | 'garage' | 'sliding-door' | 'property-card' | 'shutters' | 'curtains'
'theme-transition-timestamp': number // To prevent stale animations
```

### Animation Selection Logic
```typescript
const ANIMATION_PAIRS = {
  'key-turn': { exit: 'key-lock', enter: 'key-unlock', duration: 300 },
  'french-doors': { exit: 'doors-close', enter: 'doors-open', duration: 500 },
  'blinds': { exit: 'blinds-close', enter: 'blinds-open', duration: 400 },
  'garage': { exit: 'garage-down', enter: 'garage-up', duration: 450 },
  'sliding-door': { exit: 'slide-close', enter: 'slide-open', duration: 450 },
  'property-card': { exit: 'card-flip-away', enter: 'card-flip-to', duration: 600 },
  'shutters': { exit: 'shutters-close', enter: 'shutters-open', duration: 500 },
  'curtains': { exit: 'curtains-close', enter: 'curtains-open', duration: 550 }
} as const;
```

### Color Mapping
```typescript
const getThemeColor = (theme: ThemeName) => {
  return theme === 'blackspace' ? '#000000' : '#4f46e5';
};

// Exit animation uses OLD theme color
const exitColor = getThemeColor(currentTheme);

// Enter animation uses NEW theme color
const enterColor = getThemeColor(newTheme);
```

---

## 📱 Platform Behavior

### PWA Mode (Standalone)
- ✅ Direct theme updates (no refresh)
- ❌ No transition animations (instant is better)
- Console log: "PWA mode - instant theme update"

### Browser Mode (Safari, Chrome)
- ✅ Two-act animation system
- ✅ Exit animation → Refresh → Enter animation
- ✅ sessionStorage preserves animation choice
- Console logs: "Exit animation: french-doors" → "Enter animation: french-doors"

---

## 🎨 CSS Implementation Strategy

### File Structure
```
src/app/styles/
  └── theme-transitions.css
      ├── Base overlay styles
      ├── 8 EXIT animations (@keyframes)
      ├── 8 ENTER animations (@keyframes)
      └── Utility classes
```

### Overlay Component
```tsx
<div
  className="theme-transition-overlay"
  style={{ backgroundColor: overlayColor }}
  data-animation={animationType}
  data-phase="exit" | "enter"
/>
```

---

## ⏱️ Timing & Performance

### Total Transition Time
- **Exit:** 300-600ms (depending on animation)
- **Page Refresh:** ~200-500ms (network dependent)
- **Enter:** 300-600ms (same as exit)
- **Total:** ~800-1700ms

### Optimization
- ✅ CSS-only animations (GPU accelerated)
- ✅ `will-change: transform, opacity`
- ✅ No JavaScript animation libraries
- ✅ Cleanup after completion

---

## 🧪 Testing Checklist

- [ ] All 8 exit animations render correctly
- [ ] All 8 enter animations render correctly
- [ ] Random selection works (no repeats if possible)
- [ ] Colors match theme transitions (old → new)
- [ ] sessionStorage persists through refresh
- [ ] Cleanup happens after animation
- [ ] Works on iOS Safari browser
- [ ] Works on Chrome iOS
- [ ] Works on desktop Safari
- [ ] Chat history survives refresh
- [ ] PWA mode skips animations correctly
- [ ] No animation on initial page load
- [ ] Stale animations cleared (timestamp check)

---

## 🚀 Future Enhancements

### Possible Additions
- **Seasonal Animations:** Holiday-themed doors (e.g., wreaths in December)
- **User Preferences:** Let users pick favorite animations
- **Animation Stats:** Track which animations users see most
- **Easter Eggs:** Rare "golden key" animation (1% chance)
- **Sound Effects:** Subtle door creak, key click (optional)

### Analytics
```typescript
// Track animation preferences
logEvent('theme_transition', {
  animation: 'french-doors',
  from_theme: 'lightgradient',
  to_theme: 'blackspace',
  duration_ms: 500
});
```

---

## 📝 Code Comments Standard

```typescript
/**
 * Theme Transition - Two-Act Animation System
 *
 * ACT 1 (Exit): User clicks toggle
 * - Play closing animation with OLD theme color
 * - Save animation choice to sessionStorage
 * - Update cookie with new theme
 * - Refresh page
 *
 * ACT 2 (Enter): Page reloads
 * - Read animation choice from sessionStorage
 * - Play opening animation with NEW theme color
 * - Clear sessionStorage
 * - User sees new theme!
 *
 * Metaphor: "Closing on one home, opening another"
 */
```

---

## 🎯 Success Metrics

### User Experience Goals
- ✅ Transition feels intentional, not jarring
- ✅ Metaphors are clear and on-brand
- ✅ Total time < 2 seconds
- ✅ No animation fatigue (variety keeps it fresh)
- ✅ Works seamlessly across devices

### Performance Goals
- ✅ 60fps animations (no jank)
- ✅ No layout shifts
- ✅ No flash of unstyled content
- ✅ Graceful degradation (if CSS fails, still switches themes)

---

**Last Updated:** 2026-01-24
**Author:** Claude + Joseph (AI + Human Collaboration)
**Status:** Implementation In Progress 🚧
