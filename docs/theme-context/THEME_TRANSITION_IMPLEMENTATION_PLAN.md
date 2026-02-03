# Theme Transition Implementation Plan

**Project:** Two-Act Animation System for Theme Switching
**Timeline:** 3-4 hours (estimated)
**Phases:** 5

---

## 📋 Phase 1: Foundation Setup (30 min)

### 1.1 Create CSS File
**File:** `src/app/styles/theme-transitions.css`

**Tasks:**
- [ ] Create base overlay container styles
- [ ] Define CSS variables for timing
- [ ] Set up z-index layering
- [ ] Add will-change optimizations

**Deliverable:**
```css
.theme-transition-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  pointer-events: none;
  will-change: transform, opacity, clip-path;
}
```

### 1.2 Import CSS in Layout
**File:** `src/app/layout.tsx`

**Tasks:**
- [ ] Add import for theme-transitions.css
- [ ] Verify CSS loads correctly

---

## 📋 Phase 2: Animation Keyframes (60 min)

### 2.1 Create EXIT Animations (8 total)
**File:** `src/app/styles/theme-transitions.css`

**Tasks:**
- [ ] `@keyframes key-lock` - Key rotation CW
- [ ] `@keyframes doors-close` - French doors inward
- [ ] `@keyframes blinds-close` - Venetian blinds
- [ ] `@keyframes garage-down` - Garage door descend
- [ ] `@keyframes slide-close` - Sliding door right
- [ ] `@keyframes card-flip-away` - Property card flip
- [ ] `@keyframes shutters-close` - Window shutters inward
- [ ] `@keyframes curtains-close` - Curtain pull together

**Testing:** Each animation should be visually smooth at 60fps

### 2.2 Create ENTER Animations (8 total)
**File:** `src/app/styles/theme-transitions.css`

**Tasks:**
- [ ] `@keyframes key-unlock` - Key rotation CCW
- [ ] `@keyframes doors-open` - French doors outward
- [ ] `@keyframes blinds-open` - Venetian blinds
- [ ] `@keyframes garage-up` - Garage door ascend
- [ ] `@keyframes slide-open` - Sliding door left
- [ ] `@keyframes card-flip-to` - Property card flip
- [ ] `@keyframes shutters-open` - Window shutters outward
- [ ] `@keyframes curtains-open` - Curtain pull apart

**Testing:** Verify timing matches exit animations

### 2.3 Add Animation Classes
**File:** `src/app/styles/theme-transitions.css`

**Tasks:**
- [ ] Create utility classes for each animation
- [ ] Add easing functions (ease-in-out, cubic-bezier)
- [ ] Set durations per animation type

---

## 📋 Phase 3: Core Logic (45 min)

### 3.1 Animation Configuration
**File:** `src/app/contexts/ThemeContext.tsx`

**Tasks:**
- [ ] Define ANIMATION_PAIRS constant
- [ ] Add duration metadata
- [ ] Create type definitions

```typescript
const ANIMATION_PAIRS = {
  'key-turn': { exit: 'key-lock', enter: 'key-unlock', duration: 300 },
  // ... 7 more
} as const;

type AnimationPairKey = keyof typeof ANIMATION_PAIRS;
```

### 3.2 Random Selection Function
**File:** `src/app/contexts/ThemeContext.tsx`

**Tasks:**
- [ ] Create `selectRandomAnimation()` function
- [ ] Ensure no repeats on consecutive toggles
- [ ] Add localStorage for "last animation" tracking

```typescript
const selectRandomAnimation = (): AnimationPairKey => {
  const lastAnim = localStorage.getItem('last-theme-animation');
  const options = Object.keys(ANIMATION_PAIRS).filter(k => k !== lastAnim);
  const selected = options[Math.floor(Math.random() * options.length)];
  localStorage.setItem('last-theme-animation', selected);
  return selected as AnimationPairKey;
};
```

### 3.3 Exit Animation Function
**File:** `src/app/contexts/ThemeContext.tsx`

**Tasks:**
- [ ] Create `playExitAnimation()` function
- [ ] Generate overlay element
- [ ] Apply animation class
- [ ] Return promise when complete
- [ ] Save animation to sessionStorage

```typescript
const playExitAnimation = (
  animationKey: AnimationPairKey,
  backgroundColor: string
): Promise<void> => {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'theme-transition-overlay';
    overlay.style.backgroundColor = backgroundColor;
    overlay.setAttribute('data-animation', animationKey);
    overlay.setAttribute('data-phase', 'exit');
    document.body.appendChild(overlay);

    const { exit, duration } = ANIMATION_PAIRS[animationKey];
    overlay.classList.add(exit);

    setTimeout(() => {
      resolve();
      // Keep overlay for refresh
    }, duration);
  });
};
```

### 3.4 Enter Animation Function
**File:** `src/app/contexts/ThemeContext.tsx`

**Tasks:**
- [ ] Create `playEnterAnimation()` function
- [ ] Read animation from sessionStorage
- [ ] Generate overlay element
- [ ] Apply animation class
- [ ] Clean up overlay after completion
- [ ] Clear sessionStorage

```typescript
const playEnterAnimation = (
  animationKey: AnimationPairKey,
  backgroundColor: string
): Promise<void> => {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'theme-transition-overlay';
    overlay.style.backgroundColor = backgroundColor;
    overlay.setAttribute('data-animation', animationKey);
    overlay.setAttribute('data-phase', 'enter');
    document.body.appendChild(overlay);

    const { enter, duration } = ANIMATION_PAIRS[animationKey];
    overlay.classList.add(enter);

    setTimeout(() => {
      overlay.remove();
      resolve();
    }, duration);
  });
};
```

---

## 📋 Phase 4: Integration (30 min)

### 4.1 Update toggleTheme Function
**File:** `src/app/contexts/ThemeContext.tsx`

**Tasks:**
- [ ] Add animation logic to toggleTheme
- [ ] Select random animation
- [ ] Play exit animation
- [ ] Save to sessionStorage with timestamp
- [ ] Update cookie
- [ ] Trigger refresh (browser mode only)

```typescript
const toggleTheme = async () => {
  const newTheme = currentTheme === 'blackspace' ? 'lightgradient' : 'blackspace';
  const oldColor = getThemeColor(currentTheme);

  if (!isStandalone) {
    // Browser mode: Two-act animation
    const selectedAnimation = selectRandomAnimation();

    // Save to sessionStorage
    sessionStorage.setItem('theme-transition-pair', selectedAnimation);
    sessionStorage.setItem('theme-transition-timestamp', Date.now().toString());

    // Play exit animation
    await playExitAnimation(selectedAnimation, oldColor);

    // Update cookie
    setThemeCookie(newTheme);

    // Refresh page
    window.location.reload();
  } else {
    // PWA mode: Instant update
    setCurrentTheme(newTheme);
  }
};
```

### 4.2 Add Enter Animation on Mount
**File:** `src/app/contexts/ThemeContext.tsx`

**Tasks:**
- [ ] Create useEffect for mount detection
- [ ] Check sessionStorage for pending animation
- [ ] Validate timestamp (< 5 seconds old)
- [ ] Play enter animation
- [ ] Clean up sessionStorage

```typescript
useEffect(() => {
  if (!mounted) return;

  const animationKey = sessionStorage.getItem('theme-transition-pair') as AnimationPairKey | null;
  const timestamp = sessionStorage.getItem('theme-transition-timestamp');

  if (animationKey && timestamp) {
    const age = Date.now() - parseInt(timestamp, 10);

    // Only play if refresh happened within 5 seconds (prevent stale animations)
    if (age < 5000) {
      const newColor = getThemeColor(currentTheme);

      playEnterAnimation(animationKey, newColor).then(() => {
        sessionStorage.removeItem('theme-transition-pair');
        sessionStorage.removeItem('theme-transition-timestamp');
      });
    } else {
      // Clear stale data
      sessionStorage.removeItem('theme-transition-pair');
      sessionStorage.removeItem('theme-transition-timestamp');
    }
  }
}, [mounted, currentTheme]);
```

---

## 📋 Phase 5: Testing & Polish (60 min)

### 5.1 Create Test Page
**File:** `src/app/test-theme-transitions/page.tsx`

**Tasks:**
- [ ] Create Next.js page component
- [ ] Add pagination controls
- [ ] Display current animation name
- [ ] Show both exit and enter animations
- [ ] Add play/pause controls
- [ ] Display animation metadata (duration, type)

**UI Layout:**
```
┌─────────────────────────────────────┐
│ Theme Transition Animation Tester   │
├─────────────────────────────────────┤
│                                     │
│  Animation: French Doors (2/8)      │
│  Duration: 500ms                    │
│                                     │
│  [◀ Prev] [Play Exit] [Play Enter] [Next ▶]│
│                                     │
│  [Preview Area - Fullscreen]        │
│                                     │
└─────────────────────────────────────┘
```

### 5.2 Manual Testing
**Browser Testing:**
- [ ] Safari iOS (iPhone 14 Pro with Dynamic Island)
- [ ] Chrome iOS
- [ ] Desktop Safari
- [ ] Desktop Chrome

**Scenarios:**
- [ ] Light → Dark theme switch
- [ ] Dark → Light theme switch
- [ ] Rapid successive toggles
- [ ] Mid-animation interruption
- [ ] Stale sessionStorage data
- [ ] Chat history persistence

### 5.3 Performance Optimization
**Tasks:**
- [ ] Check animation fps (should be 60fps)
- [ ] Verify no layout shifts
- [ ] Test on slower devices
- [ ] Add `transform: translateZ(0)` for GPU acceleration
- [ ] Minimize repaints/reflows

### 5.4 Accessibility
**Tasks:**
- [ ] Add `prefers-reduced-motion` media query
- [ ] Provide instant theme change option
- [ ] Add ARIA labels
- [ ] Test with screen readers

---

## 📋 Phase 6: Documentation & Deployment (15 min)

### 6.1 Code Comments
**Tasks:**
- [ ] Add JSDoc comments to all functions
- [ ] Document animation pairs
- [ ] Add inline comments for complex logic
- [ ] Reference THEME_TRANSITION_ANIMATIONS.md

### 6.2 Build & Deploy
**Tasks:**
- [ ] Run `npm run build`
- [ ] Fix any TypeScript errors
- [ ] Test production build locally
- [ ] Commit with descriptive message
- [ ] Push to `crm` branch
- [ ] Create pull request (if needed)

---

## 🎯 Success Criteria

### Functional Requirements
- ✅ 8 animation pairs implemented
- ✅ Random selection works
- ✅ sessionStorage persistence
- ✅ Colors match themes
- ✅ PWA mode skips animations
- ✅ Chat history survives refresh

### Performance Requirements
- ✅ 60fps animations
- ✅ Total transition < 2 seconds
- ✅ No layout shifts
- ✅ No memory leaks

### User Experience Requirements
- ✅ Animations feel intentional
- ✅ Metaphors are clear
- ✅ Variety prevents fatigue
- ✅ Accessible (reduced motion support)

---

## 🐛 Known Challenges & Solutions

### Challenge 1: Animation Interrupt
**Problem:** User refreshes during animation
**Solution:** Timestamp validation (< 5 seconds)

### Challenge 2: Stale sessionStorage
**Problem:** Animation data persists indefinitely
**Solution:** Auto-clear on age > 5 seconds

### Challenge 3: PWA vs Browser Detection
**Problem:** Detecting standalone mode
**Solution:** `window.matchMedia('(display-mode: standalone)')`

### Challenge 4: Animation Flicker
**Problem:** Overlay appears before animation starts
**Solution:** Use `requestAnimationFrame` before adding class

---

## 📊 Estimated Timeline

| Phase | Task | Duration | Dependencies |
|-------|------|----------|--------------|
| 1 | Foundation Setup | 30 min | None |
| 2 | Animation Keyframes | 60 min | Phase 1 |
| 3 | Core Logic | 45 min | Phase 1 |
| 4 | Integration | 30 min | Phase 2, 3 |
| 5 | Testing & Polish | 60 min | Phase 4 |
| 6 | Documentation & Deployment | 15 min | Phase 5 |
| **Total** | | **4 hours** | |

---

## 🚀 Post-Launch Enhancements

### Future Features
1. **Animation Preferences** - Let users select favorites
2. **Seasonal Themes** - Holiday-specific animations
3. **Sound Effects** - Optional audio cues
4. **Analytics** - Track animation popularity
5. **Easter Eggs** - Rare golden key animation

---

**Status:** Ready to Implement 🚀
**Next Step:** Begin Phase 1 (Foundation Setup)
**Last Updated:** 2026-01-24
