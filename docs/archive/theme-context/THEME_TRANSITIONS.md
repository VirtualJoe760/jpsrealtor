# Theme Transition System Documentation

## Overview

The JPSRealtor theme system provides smooth transitions between light (`lightgradient`) and dark (`blackspace`) themes with Obsidian Group property showcases during theme changes.

## Architecture

### 1. Initial Page Load (SSR + Inline Script)

**Flow:**
```
Server-Side Rendering → HTML Sent → Inline Script → React Hydration → ThemeContext
```

#### Step 1: Server-Side Rendering (layout.tsx)
Location: `src/app/layout.tsx:130-145`

```typescript
// Read theme from cookie on the server
const cookieStore = await cookies();
const serverTheme = getServerTheme(cookieStore); // 'lightgradient' or 'blackspace'

// Get theme color for Dynamic Island/status bar
const themeColor = serverTheme === 'lightgradient' ? '#ffffff' : '#000000';
const statusBarStyle = serverTheme === 'lightgradient' ? 'default' : 'black';

return (
  <html lang="en" className={`theme-${serverTheme}`}>
    <head>
      <meta name="theme-color" content={themeColor} />
      <meta name="apple-mobile-web-app-status-bar-style" content={statusBarStyle} />
```

**What it does:**
- Reads `site-theme` cookie from server
- Sets initial meta tags with correct theme colors
- Applies `theme-${serverTheme}` class to `<html>`

**Browser Controls Set:**
- Light theme: `theme-color=#ffffff` (white), `status-bar-style=default`
- Dark theme: `theme-color=#000000` (black), `status-bar-style=black`

#### Step 2: Inline Blocking Script (Before React Hydration)
Location: `src/app/layout.tsx:166-203`

```javascript
<script dangerouslySetInnerHTML={{
  __html: `
    (function() {
      // Check cookie first (matches server), then localStorage
      var cookieMatch = document.cookie.match(/(^| )site-theme=([^;]+)/);
      var theme = cookieMatch ? cookieMatch[2] : localStorage.getItem('site-theme') || 'lightgradient';

      // Apply theme class
      document.documentElement.className = 'theme-' + theme;

      // Update meta tags IMMEDIATELY
      var themeColor = theme === 'lightgradient' ? '#ffffff' : '#000000';
      var statusBarStyle = theme === 'lightgradient' ? 'default' : 'black';

      var metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', themeColor);
      }

      var metaStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (metaStatusBar) {
        metaStatusBar.setAttribute('content', statusBarStyle);
      }
    })();
  `
}} />
```

**What it does:**
- Runs BEFORE React hydrates (synchronous, blocking)
- Re-checks cookie/localStorage (handles edge cases)
- Updates meta tags if theme differs from SSR
- Prevents "flash of unstyled content" (FOUC)

**Purpose:**
- Handle cases where cookie changed between SSR and client load
- Sync localStorage with cookie
- Ensure meta tags match actual theme

#### Step 3: React Hydration + ThemeContext
Location: `src/app/contexts/ThemeContext.tsx:705-830`

```typescript
useEffect(() => {
  setMounted(true);
  const storedTheme = getInitialTheme(); // Check cookie → localStorage
  if (storedTheme !== currentTheme) {
    setCurrentTheme(storedTheme);
  }
}, []);

// Fetch Obsidian Group listings on mount
useEffect(() => {
  fetchFeaturedListings(); // Load property photos for transitions
}, []);

// Apply theme to document and persist
useEffect(() => {
  if (!mounted) return;

  // Apply CSS variables
  const theme = themes[currentTheme];
  Object.entries(theme.colors).forEach(([key, value]) => {
    document.documentElement.style.setProperty(`--color-${key}`, value);
  });

  // Update theme classes
  document.documentElement.className = `theme-${currentTheme}`;
  document.body.className = `theme-${currentTheme}`;

  // PWA Mode: Update meta tags dynamically
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  if (isStandalone) {
    const themeColor = isLight ? '#ffffff' : '#000000';
    const statusBarStyle = isLight ? 'default' : 'black';

    // Update meta tags for PWA
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeColor);
    }
  }

  // Persist to cookie + localStorage
  setThemeCookie(currentTheme);
  localStorage.setItem('site-theme', currentTheme);
}, [currentTheme, mounted]);
```

**What it does:**
- Waits for client-side mount
- Syncs cookie/localStorage with React state
- Applies CSS variables to DOM
- Updates meta tags in PWA mode
- Persists theme choice

### 2. Theme Toggle Flow (Two-Act System)

When user clicks theme toggle button:

```
User Click → EXIT Animation → Page Refresh → ENTER Animation → Done
```

#### Act 1: EXIT Animation (Before Refresh)
Location: `src/app/contexts/ThemeContext.tsx:343-506`

**Timeline:**
```
Animation IN → Hold 2s → Cross-dissolve 600ms → Buffer 300ms → Refresh
```

**Code Flow:**
```typescript
async function handleThemeToggle() {
  const newTheme = currentTheme === 'lightgradient' ? 'blackspace' : 'lightgradient';
  const animationKey = selectRandomAnimation();

  // Store animation info in sessionStorage
  sessionStorage.setItem('theme-transition-pair', animationKey);
  sessionStorage.setItem('theme-transition-timestamp', Date.now().toString());

  // Play EXIT animation (old theme color)
  await playExitAnimation(animationKey, newTheme);

  // Update cookie and refresh
  setThemeCookie(newTheme);
  window.location.reload();
}
```

**EXIT Animation Steps:**
1. **Create Overlay** (0ms)
   - Full-screen overlay with solid color (target theme)
   - Load random Obsidian Group listing photo
   - Show eXp logo + property details

2. **Animation IN** (500ms)
   - Door/garage/curtain animation plays
   - Logo + "Featured Team Property" fade in

3. **Hold** (2000ms)
   - Display property details:
     * Address (e.g., "82223 Vandenberg Drive")
     * City (e.g., "Indio")
     * Price ($655,000 in green)
     * Beds/Baths/SqFt

4. **Cross-Dissolve to Solid** (600ms)
   - Fade from listing photo to solid color
   - Solid color matches target theme (white/black)

5. **Stability Buffer** (300ms)
   - Hold on solid color before refresh
   - Ensures stable state

6. **Refresh Triggered** (Total: 3400ms)
   - Page reloads with new theme
   - Overlay stays visible during refresh

#### Between Acts: Page Refresh

**What Happens:**
1. Browser refreshes page
2. Server sends HTML with NEW theme
3. Inline blocking script runs IMMEDIATELY
4. Creates instant solid color overlay
5. ENTER animation starts

#### Blocking Script During Refresh
Location: `src/app/layout.tsx:207-251`

```javascript
<script dangerouslySetInnerHTML={{
  __html: `
    (function() {
      // Check if we're returning from a theme toggle
      var animationKey = sessionStorage.getItem('theme-transition-pair');
      var timestamp = sessionStorage.getItem('theme-transition-timestamp');

      if (animationKey && timestamp) {
        var age = Date.now() - parseInt(timestamp, 10);

        // Only create overlay if refresh happened within 5 seconds
        if (age < 5000) {
          // Detect current theme to determine solid color
          var cookieMatch = document.cookie.match(/(^| )site-theme=([^;]+)/);
          var theme = cookieMatch ? cookieMatch[2] : 'lightgradient';
          var solidColor = theme === 'blackspace' ? '#000000' : '#ffffff';

          // Create overlay DIV IMMEDIATELY (before React renders)
          var overlay = document.createElement('div');
          overlay.className = 'theme-transition-overlay';
          overlay.id = 'instant-transition-overlay';
          overlay.style.cssText = 'position: fixed; inset: 0; z-index: 99999; background-color: ' + solidColor;

          // Add to body immediately
          document.body.appendChild(overlay);
        }
      }
    })();
  `
}} />
```

**Purpose:**
- Prevent flash of UI during refresh
- Create solid color overlay INSTANTLY
- Matches new theme color
- Removed by ENTER animation

#### Act 2: ENTER Animation (After Refresh)
Location: `src/app/contexts/ThemeContext.tsx:509-698`

**Timeline:**
```
Cross-dissolve 600ms → Hold 2s → Animation OUT 500ms → Done
```

**ENTER Animation Steps:**
1. **Remove Instant Overlay** (0ms)
   - Remove blocking script overlay
   - Replace with animated listing photo overlay

2. **Cross-Dissolve from Solid** (600ms)
   - Fade from solid color to listing photo
   - Different property than EXIT animation

3. **Fade In Details** (0ms after cross-dissolve)
   - "Featured Team Property" text
   - Property details card (0.2s delay)

4. **Hold** (2000ms)
   - Display property showcase

5. **Animation OUT** (500ms)
   - Door/garage/curtain animation OUT
   - Overlay fades away

6. **Complete** (Total: 3100ms)
   - Remove overlay
   - User sees new theme

### 3. Browser Control Colors

**IMPORTANT**: Safari uses **BOTH** meta tags AND CSS `background-color` to determine browser controls!

**Meta Tags:**
- `theme-color`: Controls address bar color (mobile) and Dynamic Island (iOS)
- `apple-mobile-web-app-status-bar-style`: Controls iOS status bar style

**CSS Background Color (Critical!):**
Safari samples the CSS `background-color` property from `<html>` and `<body>` elements to determine browser control colors, even when gradients are used.

Location: `src/app/globals.css:190, 201`

```css
html.theme-lightgradient {
  background: linear-gradient(...); /* Visual gradient */
  background-color: #ffffff; /* CRITICAL: Safari samples THIS for browser controls */
}

html.theme-lightgradient body {
  background: linear-gradient(...); /* Visual gradient */
  background-color: #ffffff; /* CRITICAL: Must match meta tags! */
}
```

**Why This Matters:**
- The `background:` gradient is what users see
- The `background-color:` fallback is what Safari uses for browser controls
- If these don't match meta tags, you'll get wrong colors

**Color Values:**
```typescript
// Light Theme (lightgradient)
meta theme-color: #ffffff (white)
meta status-bar-style: default (light status bar, dark text)
css background-color: #ffffff (white) ← MUST MATCH

// Dark Theme (blackspace)
meta theme-color: #000000 (black)
meta status-bar-style: black (dark status bar, light text)
css background-color: #000000 (black) ← MUST MATCH
```

**Where Set:**
1. **SSR Meta Tags**: `layout.tsx:145, 151` - Initial server render
2. **Inline Script Meta Tags**: `layout.tsx:216, 220` - Client-side sync before React
3. **CSS Background**: `globals.css:190, 201` - Browser control sampling
4. **Manifest**: `manifest-v2.json:8` - PWA theme color
5. **ThemeContext**: `ThemeContext.tsx:800-817` - PWA mode dynamic updates

**Browser Support:**
- **iOS Safari**: Uses meta tags + CSS background-color
- **Android Chrome**: Uses meta tags + manifest
- **Desktop Browsers**: Ignore (meta tags not visible)
- **PWA Mode**: Dynamic updates work (standalone mode)

## Data Flow

### Initial Load
```
1. Server reads cookie → Determines theme → Sets meta tags
2. HTML sent to browser with theme class + meta tags
3. Inline script runs → Validates theme → Updates meta tags if needed
4. React hydrates → ThemeContext initializes → Fetches listings
5. User sees correctly themed page
```

### Theme Toggle
```
1. User clicks toggle → selectRandomAnimation()
2. Store animation data → sessionStorage
3. playExitAnimation() → Show listing photo → Cross-dissolve → Solid color
4. Update cookie → window.location.reload()
5. Page refreshes → Inline script → Creates instant overlay
6. React hydrates → playEnterAnimation() → Cross-dissolve → Show listing → Animate OUT
7. User sees new theme with smooth transition
```

## Files

| File | Purpose | Lines |
|------|---------|-------|
| `src/app/layout.tsx` | SSR theme detection, meta tags, inline scripts | 126-275 |
| `src/app/contexts/ThemeContext.tsx` | Theme state, animations, browser control updates | 1-830 |
| `src/app/styles/theme-transitions.css` | Animation keyframes, overlay styles | 1-425 |
| `src/app/api/listings/featured/route.ts` | Obsidian Group listings API | 1-60 |

## Animation Pairs

```typescript
const ANIMATION_PAIRS = {
  'french-doors': { exit: 'doors-close', enter: 'doors-open', duration: 500 },
  'garage': { exit: 'garage-down', enter: 'garage-up', duration: 450 },
  'sliding-door': { exit: 'slide-close', enter: 'slide-open', duration: 450 },
  'shutters': { exit: 'shutters-close', enter: 'shutters-open', duration: 500 },
  'curtains': { exit: 'curtains-close', enter: 'curtains-open', duration: 550 }
};
```

Each animation has:
- **EXIT**: Closing animation (old theme)
- **ENTER**: Opening animation (new theme)
- **Duration**: Animation length in milliseconds

## Troubleshooting

### Issue: Wrong colors on initial page load

**Symptoms:**
- Light theme loads with black Dynamic Island
- Browser controls show blue/indigo instead of white
- Theme toggle works perfectly but initial load is wrong

**Root Cause:**
Safari samples the CSS `background-color` property (NOT just meta tags!) to determine browser control colors. If you use a gradient with an indigo fallback, Safari will use that indigo color for browser controls.

**Diagnosis Steps:**
1. Open Safari Web Inspector → Elements tab
2. Inspect `<html>` or `<body>` element
3. Look at Computed Styles → `background-color`
4. Check if it matches your expected theme color

**Solution:**
Update `globals.css` to use theme-appropriate fallback colors:

```css
/* ❌ WRONG - Safari samples indigo for browser controls */
html.theme-lightgradient {
  background: linear-gradient(...);
  background-color: #4f46e5; /* Indigo fallback */
}

/* ✅ CORRECT - Safari samples white for browser controls */
html.theme-lightgradient {
  background: linear-gradient(...);
  background-color: #ffffff; /* White fallback - matches meta tags */
}
```

**Other Possible Causes:**
1. **Browser Cache**: Mobile Safari aggressively caches meta tags and manifest
2. **Manifest Cache**: `manifest.json` cached with old `theme_color`
3. **Dev Server**: Changes to `layout.tsx` not hot-reloaded
4. **Cookie/localStorage Mismatch**: Different theme stored in each

**Solutions:**
1. **Hard Refresh**: Pull down to refresh on mobile, or Cmd+Shift+R on desktop
2. **Clear Cache**: Safari → Settings → Clear History and Website Data
3. **Restart Dev Server**: Kill node process and restart
4. **Check Cookie**: Verify `site-theme` cookie matches expected theme
5. **Check CSS**: Inspect element and verify `background-color` property value

### Issue: Flash of content during theme toggle

**Symptoms:**
- See UI flash when page refreshes
- Listing photo doesn't show smoothly

**Solutions:**
- Ensure blocking script runs (check `sessionStorage`)
- Verify `theme-transition-overlay` class has `z-index: 99999`
- Check cross-dissolve timing (should complete before refresh)

### Issue: No listing photos during transitions

**Symptoms:**
- Solid colors only, no property showcases
- Console warns "No featured listings available"

**Solutions:**
- Check `/api/listings/featured` returns data
- Verify Obsidian Group listings exist in database
- Check `fetchFeaturedListings()` runs on mount

## Testing Checklist

### Initial Page Load
- [ ] Light theme: White address bar, white Dynamic Island
- [ ] Dark theme: Black address bar, black Dynamic Island
- [ ] No flash of wrong theme
- [ ] Theme class applied immediately

### Theme Toggle
- [ ] EXIT animation plays with listing photo
- [ ] Property details display (address, price, beds/baths)
- [ ] Cross-dissolve to solid color completes
- [ ] No flash during refresh
- [ ] ENTER animation plays with different listing
- [ ] New theme colors apply correctly

### PWA Mode
- [ ] Dynamic Island updates when theme changes
- [ ] Status bar style changes (default ↔ black)
- [ ] No visual glitches during transitions

### Browser Compatibility
- [ ] iOS Safari: All meta tags work
- [ ] Android Chrome: Address bar changes color
- [ ] Desktop: No errors, graceful degradation

## Performance

**Animation Timing:**
- EXIT: 3400ms (animation 500ms + hold 2000ms + cross-dissolve 600ms + buffer 300ms)
- ENTER: 3100ms (cross-dissolve 600ms + hold 2000ms + animation 500ms)
- Total: ~6.5 seconds for complete theme toggle

**Optimizations:**
- Hardware acceleration (`transform: translateZ(0)`)
- Will-change hints on overlays
- Lazy-load listings (fetch on mount, cache in memory)
- Prevent scroll during animations (`overflow: hidden`)

## Future Improvements

1. **Preload Next Listing**: Load next property photo during animation
2. **Animation Library**: Add more real estate-themed transitions
3. **Reduced Motion**: Respect `prefers-reduced-motion` (instant fade)
4. **Service Worker**: Cache listing photos for offline transitions
5. **Analytics**: Track which animations users see most

---

**Last Updated**: January 25, 2026
**Version**: 2.0 (Cross-Dissolve System)
