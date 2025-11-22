# Progressive Web App (PWA) Setup

Your app is now configured as a Progressive Web App! Users can install it on their mobile devices and desktop for a native app-like experience.

## What Was Added

### 1. **Manifest File** (`public/manifest.json`)
- App name, description, and branding
- App icons in multiple sizes (72x72 to 512x512)
- Display mode set to "standalone" for app-like experience
- Theme colors and orientation settings
- Shortcuts to key pages (Properties, Neighborhoods, Contact)

### 2. **Service Worker Configuration** (`next.config.mjs`)
- Automatic caching for fonts, images, and static assets
- Offline support for previously visited pages
- Network-first strategy for dynamic content
- Cache-first strategy for static resources

### 3. **PWA Icons** (`public/icons/`)
- Generated icons in 8 different sizes
- Apple touch icons for iOS devices
- Favicon for browser tabs

### 4. **Meta Tags** (`src/app/layout.tsx`)
- Apple mobile web app meta tags
- Theme color for mobile browsers
- Open Graph and Twitter card metadata

## How to Test PWA Installation

### On Mobile (Android)

1. **Build the production version:**
   ```bash
   npm run build
   npm start
   ```

2. **Access the site** on your mobile device (must be HTTPS in production or localhost in dev)

3. **Chrome will show an install prompt:**
   - Look for the "Add to Home Screen" banner
   - Or tap the menu (⋮) > "Install app"

4. **After installation:**
   - App icon appears on home screen
   - Opens in standalone mode (no browser UI)
   - Works offline for cached content

### On Mobile (iOS/Safari)

1. **Open the site in Safari**

2. **Tap the Share button** (square with arrow)

3. **Scroll down and tap "Add to Home Screen"**

4. **Tap "Add"** in the top right

5. **App icon appears on home screen**

### On Desktop (Chrome/Edge)

1. **Visit the site in Chrome or Edge**

2. **Look for the install icon** in the address bar (⊕ or computer icon)

3. **Click the icon** and select "Install"

4. **App opens in its own window** without browser UI

## Testing Checklist

- [ ] Build runs successfully (`npm run build`)
- [ ] Manifest loads at `/manifest.json`
- [ ] Icons display correctly in manifest
- [ ] Install prompt appears on mobile
- [ ] App installs and appears on home screen
- [ ] App opens in standalone mode
- [ ] Offline functionality works (visit pages, then go offline)
- [ ] Service worker registers successfully (check DevTools > Application > Service Workers)
- [ ] Cache is populated (check DevTools > Application > Cache Storage)

## DevTools Testing

### Chrome DevTools

1. **Open DevTools** (F12 or Cmd+Option+I)

2. **Go to Application tab**

3. **Check Manifest:**
   - Click "Manifest" in left sidebar
   - Verify all fields are populated
   - Check icons load correctly

4. **Check Service Worker:**
   - Click "Service Workers" in left sidebar
   - Should show "activated and running"
   - Use "Update" to test new changes

5. **Check Cache Storage:**
   - Click "Cache Storage" in left sidebar
   - Should see multiple caches (fonts, images, pages, etc.)

6. **Simulate Offline:**
   - Click "Service Workers"
   - Check "Offline" checkbox
   - Navigate the app to test offline functionality

### Lighthouse Audit

1. **Open DevTools** > **Lighthouse tab**

2. **Select:**
   - ✓ Progressive Web App
   - Device: Mobile

3. **Click "Generate report"**

4. **Goal:** Score 90+ on PWA metrics
   - ✓ Installable
   - ✓ Works offline
   - ✓ Configured for custom splash screen
   - ✓ Sets theme color

## Production Deployment

### HTTPS Required

PWA features require HTTPS in production. Make sure your hosting supports SSL:
- Vercel (automatic HTTPS)
- Netlify (automatic HTTPS)
- Custom server (use Let's Encrypt)

### Build Command

```bash
npm run build
```

The build process will:
1. Generate optimized production bundles
2. Create service worker files (`sw.js`, `workbox-*.js`)
3. Configure caching strategies
4. Minify and optimize assets

### Generated Files

After build, these files are created in `public/`:
- `sw.js` - Main service worker
- `workbox-*.js` - Workbox runtime libraries
- `worker-*.js` - Additional worker files

These are gitignored and regenerated on each build.

## Updating the PWA

### Update Manifest

Edit `public/manifest.json` to change:
- App name
- Description
- Theme colors
- Shortcuts
- Screenshots

### Update Icons

Replace icons in `public/icons/` with your own:
```bash
npx pwa-asset-generator public/images/brand/your-logo.png public/icons
```

### Update Caching Strategy

Edit `next.config.mjs` > `runtimeCaching` array to:
- Add new URL patterns to cache
- Change cache expiration times
- Modify cache strategies (CacheFirst, NetworkFirst, StaleWhileRevalidate)

## Troubleshooting

### Install Prompt Not Showing

- Ensure you're on HTTPS (or localhost)
- Check manifest is valid in DevTools
- Make sure icons are loading
- Try clearing browser data and revisiting

### Service Worker Not Updating

- Service workers cache aggressively
- Use "Update on reload" in DevTools > Application > Service Workers
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Unregister old service worker and refresh

### Offline Not Working

- Check DevTools > Application > Cache Storage
- Verify routes are being cached
- Test with DevTools offline mode
- Check service worker is activated

### iOS Installation Issues

- iOS requires specific icon sizes (120x120, 152x152, 167x167, 180x180)
- Icons must be PNG format
- Must use Safari browser (not Chrome or Firefox on iOS)

## Resources

- [Next-PWA Documentation](https://github.com/shadowwalker/next-pwa)
- [Web.dev PWA Guide](https://web.dev/progressive-web-apps/)
- [PWA Icon Generator](https://realfavicongenerator.net/)
- [Workbox Documentation](https://developer.chrome.com/docs/workbox/)
- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

## Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "pwa:icons": "node scripts/generate-pwa-icons.js"
  }
}
```

## Next Steps

1. **Test thoroughly** on multiple devices
2. **Update icons** with properly sized versions (use pwa-asset-generator)
3. **Add screenshots** to manifest for richer install experience
4. **Configure push notifications** (optional)
5. **Add offline fallback page** (optional)
6. **Monitor PWA metrics** in production with analytics

---

**Your app is now installable!** 🎉

Users can add it to their home screen and use it like a native app with offline support.
