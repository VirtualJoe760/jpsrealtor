# Urgent Fixes - Chat Listings & Performance

## Date: 2025-11-22

## Issue 1: Chat Listings Not Displaying ✅ FIXED

### Problem
AI responds "Here are 20 homes for sale..." but no listings appear in the carousel.

### Root Cause
The client code was not extracting listings from the API response before returning.

### Fix Applied
**File:** `src/app/components/chatwidget/IntegratedChatWidget.tsx` (lines 396-430)

Added extraction logic that checks TWO locations:
1. `data.listings` (top-level - preferred)
2. `data.metadata.functionCalls[0].data.listings` (fallback)

### Testing
1. **Manual Test:**
   ```
   Ask: "show me homes for sale in palm desert country club"
   Expected: Carousel appears with 20 listing cards
   ```

2. **Automated Test:**
   ```bash
   # Make sure dev server is running first
   node scripts/test-chat-fix.mjs
   ```

3. **Browser Console Check:**
   After asking for listings, open browser console and check for:
   - `✅ Found X listings in top-level response` OR
   - `✅ Found X listings in function call metadata` OR
   - `⚠️ No listings found in API response`

### Browser Console Debugging
```javascript
// After AI responds, check if listings were extracted
window.__chatListings

// Should show array of 20 listings
// If undefined, listings were not extracted (bug)
```

---

## Issue 2: Extremely Slow Dev Server 🔴 CRITICAL

### Symptoms
- **Startup:** 44.4s (should be <10s)
- **Page Compilation:** 23.6s (should be <3s)
- **API Compilation:** 15.7s (should be <1s)

### Root Causes

#### A. Large Dependency Tree (103 deps)
Heavy libraries being loaded on every page:
- @react-three/fiber + three.js (3D rendering)
- @mlc-ai/web-llm (AI models)
- Multiple map libraries (mapbox-gl + maplibre-gl + react-map-gl)
- Puppeteer (22MB Chrome headless)

#### B. No Lazy Loading
All components load on startup instead of on-demand.

#### C. Next.js 16 Turbopack Overhead
Turbopack is enabled but showing warnings and may be slower than Webpack for your use case.

### Quick Fixes (Apply NOW)

#### Fix 1: Increase Node Memory (30 seconds)
**File:** `package.json`

```json
{
  "scripts": {
    "dev": "set NODE_OPTIONS=--max-old-space-size=8192 && next dev",
    "dev:fast": "next dev --turbo=false"
  }
}
```

Then run: `npm run dev`

#### Fix 2: Clear Next.js Cache (30 seconds)
```bash
# Windows PowerShell
Remove-Item -Recurse -Force .next
npm run dev
```

#### Fix 3: Update Next.js Config (2 minutes)
**File:** `next.config.mjs`

Add BEFORE `export default`:

```javascript
// Add performance optimizations
nextConfig.experimental = {
  ...nextConfig.experimental,
  // Optimize package imports for tree-shaking
  optimizePackageImports: [
    'lucide-react',
    'framer-motion',
    '@react-three/fiber',
    '@react-three/drei',
    'recharts',
  ],
};

// Faster TypeScript checking in development
nextConfig.typescript = {
  // Don't type-check during builds (faster, but use with caution)
  ignoreBuildErrors: process.env.NODE_ENV === 'development',
};

// Optimize webpack compilation
nextConfig.webpack = function(config, { isServer }) {
  // SVG support (existing)
  config.module.rules.push({
    test: /\.svg$/,
    use: ["@svgr/webpack"],
  });

  // Speed up development builds
  if (process.env.NODE_ENV === 'development') {
    config.cache = {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
    };
  }

  return config;
};
```

### Medium-Term Fixes (1-2 hours)

#### Fix 4: Lazy Load Heavy Components

**File:** `src/app/page.tsx` (or wherever StarsCanvas is used)

Change:
```typescript
import StarsCanvas from './components/chatwidget/StarsCanvas';
```

To:
```typescript
const StarsCanvas = dynamic(() => import('./components/chatwidget/StarsCanvas'), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-black" />
});
```

**File:** Chat widget (wherever WebLLM is used)

Change:
```typescript
import { streamChatCompletion } from "@/lib/webllm";
```

To:
```typescript
const streamChatCompletion = async (...args) => {
  const webllm = await import("@/lib/webllm");
  return webllm.streamChatCompletion(...args);
};
```

#### Fix 5: Remove Duplicate Dependencies

**Check which map library you're actually using:**
```bash
grep -r "mapbox-gl\|maplibre-gl" src --include="*.tsx" --include="*.ts" | wc -l
```

If you're only using one, remove the others:
```bash
npm uninstall mapbox-gl  # or maplibre-gl, whichever you don't use
npm uninstall react-map-gl  # if using vis.gl instead
```

#### Fix 6: Move Puppeteer to Dev Dependencies

Puppeteer should NOT be a production dependency:

**File:** `package.json`

Move `"puppeteer": "^23.11.1"` from `dependencies` to `devDependencies`.

Then:
```bash
npm install
```

### Long-Term Optimizations (2-4 hours)

#### Fix 7: Implement Code Splitting

Create a `src/app/components/LazyLoad.tsx`:
```typescript
import dynamic from 'next/dynamic';

// Lazy load map components
export const MapView = dynamic(() => import('./mls/map/MapView'), {
  ssr: false,
  loading: () => <div>Loading map...</div>
});

// Lazy load 3D components
export const StarsCanvas = dynamic(() => import('./chatwidget/StarsCanvas'), {
  ssr: false,
  loading: () => null
});

// Lazy load chat widget
export const ChatWidget = dynamic(() => import('./chatwidget/IntegratedChatWidget'), {
  ssr: false,
  loading: () => <div>Loading chat...</div>
});
```

#### Fix 8: Bundle Analysis

Install analyzer:
```bash
npm install --save-dev @next/bundle-analyzer
```

Update `next.config.mjs`:
```javascript
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(pwaConfig(withMDX(nextConfig)));
```

Run analysis:
```bash
set ANALYZE=true && npm run build
```

#### Fix 9: Database Connection Pooling

**File:** `src/lib/db.ts`

Ensure you're reusing connections:
```typescript
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10, // Limit connections
      serverSelectionTimeoutMS: 5000, // Fail faster
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
```

### Expected Improvements

| Metric | Before | After Phase 1 | After Phase 2 |
|--------|--------|---------------|---------------|
| Startup | 44.4s | ~15-20s | ~5-8s |
| Page Compile | 23.6s | ~8-10s | ~2-3s |
| API Compile | 15.7s | ~3-5s | ~500ms-1s |
| Hot Reload | Slow | Medium | Fast |

### Testing Checklist

After each fix:

- [ ] Clear .next folder
- [ ] Restart dev server
- [ ] Time the startup
- [ ] Test page load times
- [ ] Check browser console for errors
- [ ] Test chat listings display
- [ ] Test map functionality
- [ ] Verify no broken imports

### Rollback Plan

If any fix breaks something:

```bash
# Revert specific file
git checkout HEAD -- next.config.mjs

# Revert all changes
git reset --hard HEAD

# Clear cache and retry
Remove-Item -Recurse -Force .next
npm run dev
```

### Priority Order

1. **IMMEDIATE (Do Now):**
   - ✅ Chat listings fix (already applied)
   - Clear .next cache
   - Increase Node memory
   - Update Next.js config with caching

2. **URGENT (Today):**
   - Lazy load StarsCanvas
   - Lazy load ChatWidget
   - Move Puppeteer to devDependencies

3. **HIGH (This Week):**
   - Bundle analysis
   - Remove duplicate map libraries
   - Database connection pooling
   - Full code splitting implementation

4. **MEDIUM (Next Sprint):**
   - Comprehensive dependency audit
   - Implement proper caching strategy
   - Optimize Mongoose queries
   - Add performance monitoring

### Monitoring

Add these to track improvements:

**File:** `package.json`
```json
{
  "scripts": {
    "dev:profile": "next dev --profile",
    "build:analyze": "set ANALYZE=true && next build"
  }
}
```

### Success Criteria

✅ Chat listings display correctly
✅ Dev server starts in <10s
✅ Pages compile in <3s
✅ API routes compile in <1s
✅ Hot reload works smoothly
✅ No console errors
✅ Bundle size reduced by 30%+

### Support

If you encounter issues:

1. Check the detailed analysis in `PERFORMANCE_ANALYSIS.md`
2. Run the test script: `node scripts/test-chat-fix.mjs`
3. Check browser console for my debug logs
4. Share the console output and I'll help debug further

