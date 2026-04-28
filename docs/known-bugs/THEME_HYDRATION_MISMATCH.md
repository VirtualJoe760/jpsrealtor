# Theme Hydration Mismatch

**Status:** Known issue, deferred
**Severity:** Low-Medium (cosmetic error, doesn't break functionality)
**Error:** `Cannot read properties of null (reading 'removeChild')`
**Affected pages:** Neighborhoods, subdivisions, any page with theme-dependent rendering

## Problem

The server renders pages with a default theme (dark), but the client may have a different theme saved (light). React hydration fails because the DOM structure differs between server and client renders.

**Server renders:** `bg-gray-800 text-white border-gray-700`
**Client expects:** `bg-white text-gray-900 border-gray-200`

React tries to reconcile the mismatch by removing/replacing nodes, hitting the `removeChild` error.

## When it happens

- User has switched to light mode (or any non-default theme)
- Server always renders with default theme
- Client hydrates with saved theme preference → DOM mismatch
- Browser extensions (Grammarly, ad blockers) that inject DOM nodes make it worse

## Why it doesn't always crash

- If user is on the default theme, server and client match — no error
- `<html>` and `<body>` already have `suppressHydrationWarning` which covers top-level mismatches
- The error is caught by React's error recovery in most cases

## Current mitigations

- `suppressHydrationWarning` on `<html>` and `<body>` in layout.tsx
- Error boundaries added to neighborhood page components (prevents full page crash)

## Recommended fix: Cookie-based theme

Store the theme preference in a cookie instead of localStorage. The server can read cookies during SSR and render with the correct theme on the first pass.

### Implementation steps

1. **Middleware:** Read theme cookie in Next.js middleware, set it on the request
2. **Layout:** Read theme from cookie instead of hardcoded default
3. **ThemeContext:** On theme change, update both localStorage AND cookie
4. **Server components:** Access theme from cookie for SSR

### Files to modify

- `src/app/contexts/ThemeContext.tsx` — add cookie read/write alongside localStorage
- `src/app/layout.tsx` — read theme from cookie for `serverTheme`
- `src/middleware.ts` — optionally parse theme cookie for server components
- All components using `useThemeClasses()` — no changes needed (they'll get correct theme from context)

### Alternative: Delay theme rendering

Render neutral/skeleton state on server, apply theme only after hydration via `useEffect`. Simpler but causes a flash of unstyled content (FOUC).

## How to test the fix

1. Set theme to light mode
2. Hard refresh (Ctrl+Shift+R) any neighborhoods page
3. Should render in light mode immediately without flash or console errors
4. Check browser console for `removeChild` errors — should be gone
