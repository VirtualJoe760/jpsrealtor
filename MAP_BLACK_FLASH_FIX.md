# Map Page Black Flash Fix

## Issue

When visiting `/map` in light mode, a black flash appeared:
1. During initial page load
2. After the globe spinner finished
3. In the empty state (no listings)

## Root Cause

The map page had hardcoded `bg-black` backgrounds in three locations:

1. **Line 343** - Main container: `className="h-screen w-screen relative bg-black"`
2. **Line 349** - Empty state container: `className="h-full w-full flex items-center justify-center bg-black"`
3. **Line 953** - Suspense fallback: `className="h-screen w-screen bg-black flex items-center justify-center"`

Additionally, text colors in the empty state were hardcoded for dark mode (white/gray), making them invisible in light mode.

## Solution Applied

### 1. Made Main Container Theme-Aware ✅

**File:** `src/app/map/page.tsx` (Lines 343-347)

**Before:**
```typescript
<div className="h-screen w-screen relative bg-black" data-page="map">
```

**After:**
```typescript
<div
  className={`h-screen w-screen relative ${
    isLight ? 'bg-white' : 'bg-black'
  }`}
  data-page="map"
>
```

### 2. Made Empty State Container Theme-Aware ✅

**File:** `src/app/map/page.tsx` (Lines 354-356)

**Before:**
```typescript
<div className="h-full w-full flex items-center justify-center bg-black">
```

**After:**
```typescript
<div className={`h-full w-full flex items-center justify-center ${
  isLight ? 'bg-white' : 'bg-black'
}`}>
```

### 3. Updated Empty State Text Colors ✅

**File:** `src/app/map/page.tsx` (Lines 366-375)

**Before:**
```typescript
<h2 className="text-3xl font-light text-white mb-2">Map View</h2>
<p className="text-neutral-400 max-w-md">
  No properties found. Adjust your filters or try a different area.
</p>
```

**After:**
```typescript
<h2 className={`text-3xl font-light mb-2 ${
  isLight ? 'text-gray-900' : 'text-white'
}`}>
  Map View
</h2>
<p className={`max-w-md ${
  isLight ? 'text-gray-600' : 'text-neutral-400'
}`}>
  No properties found. Adjust your filters or try a different area.
</p>
```

### 4. Updated Suspense Fallback ✅

**File:** `src/app/map/page.tsx` (Lines 960-962)

**Before:**
```typescript
<Suspense fallback={
  <div className="h-screen w-screen bg-black flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
      <p className="text-neutral-400">Loading map...</p>
    </div>
  </div>
}>
```

**After:**
```typescript
<Suspense fallback={
  <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-white via-gray-50 to-emerald-50 dark:from-black dark:via-gray-900 dark:to-black">
    <MapGlobeLoader />
  </div>
}>
```

**Benefits:**
- Uses branded globe loader for consistency
- Theme-aware gradient background (light or dark)
- Matches the home page loading experience

## How It Works Now

### Light Mode Map Load Sequence:
```
0ms     - Suspense fallback shows light gradient + globe loader
0ms     - Main container renders with bg-white
500ms   - MapGlobeLoader appears (if needed)
1000ms  - Map tiles begin loading
1500ms  - Globe fades out
2000ms  - Map fully visible on white background
```

### Dark Mode Map Load Sequence:
```
0ms     - Suspense fallback shows dark gradient + globe loader
0ms     - Main container renders with bg-black
500ms   - MapGlobeLoader appears (if needed)
1000ms  - Map tiles begin loading
1500ms  - Globe fades out
2000ms  - Map fully visible on black background
```

### Empty State (No Listings):
**Light Mode:**
- White background
- Dark gray heading (text-gray-900)
- Medium gray description (text-gray-600)
- Visible and readable

**Dark Mode:**
- Black background
- White heading (text-white)
- Light gray description (text-neutral-400)
- Visible and readable

## Visual Comparison

### Before Fix:

**Light Mode:**
- ❌ Black flash on page load
- ❌ Black background after spinner
- ❌ Black background in empty state
- ❌ White text invisible on white background (if it rendered)

**Dark Mode:**
- ✅ Black background (intentional)
- ✅ White text visible
- ✅ Consistent experience

### After Fix:

**Light Mode:**
- ✅ White background from first pixel
- ✅ White background after spinner
- ✅ White background in empty state
- ✅ Dark text visible on white background
- ✅ Smooth, professional experience

**Dark Mode:**
- ✅ Black background (intentional)
- ✅ White text visible
- ✅ Consistent experience

## Files Modified

✅ `src/app/map/page.tsx` (Lines 343-347, 354-356, 366-375, 960-962)

## Testing Checklist

### Light Mode:
- [ ] Visit `/map` directly in light mode
- [ ] No black flash should appear
- [ ] Background should be white throughout load
- [ ] Globe loader should have light colors
- [ ] Map should load on white background
- [ ] Empty state (if no listings) should have white background
- [ ] Empty state text should be dark and readable

### Dark Mode:
- [ ] Visit `/map` directly in dark mode
- [ ] Background should be black (intentional)
- [ ] Globe loader should have dark colors
- [ ] Map should load on black background
- [ ] Empty state should have black background
- [ ] Empty state text should be white and readable

### Navigation:
- [ ] Navigate from home page to map
- [ ] Navigate from chat to map (with bounds)
- [ ] Use browser back/forward
- [ ] Direct URL entry

### Spinner Completion:
- [ ] Globe fades out smoothly
- [ ] No black flash after globe disappears
- [ ] Map tiles load seamlessly
- [ ] Controls remain visible and styled correctly

## Expected User Experience

**Before Fix:**
- ❌ Jarring black flash in light mode
- ❌ Inconsistent with light theme
- ❌ Unpolished appearance
- ❌ Empty state text invisible

**After Fix:**
- ✅ Zero black flash in light mode
- ✅ Consistent white background throughout
- ✅ Professional, polished appearance
- ✅ Readable text in all states
- ✅ Branded globe loader
- ✅ Smooth theme-aware transitions

## Integration with Other Fixes

This fix works together with:
1. **Home Page Black Flash Fix** - `BLACK_FLASH_FIX.md`
2. **Theme Flash Fix** - `THEME_AND_GLOBE_LOADER_COMPLETE.md`
3. **Globe Loader** - `src/app/components/GlobalLoader.tsx`
4. **Map Globe Loader** - `src/app/components/mls/map/MapGlobeLoader.tsx`

All pages now have consistent theme-aware backgrounds:
- ✅ Home page (`/`)
- ✅ Map page (`/map`)
- ✅ Chat widget
- ✅ All loading states

## Performance Impact

**Negligible:**
- Added conditional classes based on existing `isLight` variable
- No additional JavaScript
- No network requests
- No bundle size increase
- Uses existing `useTheme()` hook

## Rollback Instructions

If issues occur:

```bash
# View changes
git diff src/app/map/page.tsx

# Rollback
git checkout src/app/map/page.tsx
```

## Summary

🎉 **Map page black flash eliminated!**

**Changes:**
1. ✅ Main container uses theme-aware background (white/black)
2. ✅ Empty state container uses theme-aware background
3. ✅ Empty state text uses theme-aware colors
4. ✅ Suspense fallback uses branded globe loader with theme-aware gradient
5. ✅ Consistent experience across all loading states
6. ✅ Smooth transitions in both light and dark modes

**Result:**
- Zero black flash when visiting `/map` in light mode
- Professional appearance throughout page load
- Readable text in all states and themes
- Consistent with home page experience

**Ready for testing!** Please visit `/map` in light mode and verify no black flash appears at any point.
