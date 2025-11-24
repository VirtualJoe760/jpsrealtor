# Performance Analysis - Next.js Dev Server

## Date: 2025-11-22

## Critical Performance Issues Identified

### 1. **Extremely Slow Compilation Times**

From your logs:
- **Startup:** 44.4s (CRITICAL - should be <10s)
- **Homepage (/):** 23.6s compile (CRITICAL - should be <2s)
- **Chat Stream API:** 4.5s compile (HIGH - should be <1s)
- **Auth Session:** 29.8s compile (CRITICAL - should be <1s)
- **MLS Listings Page:** 11.6s compile (CRITICAL - should be <2s)

### 2. **Root Causes**

#### A. Next.js 16 with Turbopack Issues
```
⚠ Invalid next.config.mjs options detected:
⚠   Unrecognized key(s) in object: 'turbo' at "experimental"
```
- You're using Next.js 16.0.3 which has Turbopack enabled by default
- The warning suggests there was an invalid experimental config (now removed)
- Turbopack in Next 16 is still stabilizing and may have performance issues

#### B. Large Dependency Tree
You have 103 production dependencies including:
- Heavy 3D libraries (@react-three/fiber, three.js)
- Multiple map libraries (mapbox-gl, maplibre-gl, react-map-gl)
- ML/AI libraries (@mlc-ai/web-llm)
- Payload CMS
- Multiple UI frameworks
- Puppeteer (22MB+ installed)

#### C. No Build Optimization
- No TypeScript path aliases configured for faster resolution
- No SWC minification settings
- No module federation or code splitting optimization
- PWA config runs even in development (should be disabled)

#### D. Database/API Latency
- Some API routes take 15-17s to compile
- MongoDB connection might be slow
- No caching strategy visible

### 3. **Specific Slow Routes**

| Route | Compile Time | Status |
|-------|-------------|---------|
| `/` | 23.6s | 🔴 CRITICAL |
| `/api/auth/session` | 29.8s | 🔴 CRITICAL |
| `/api/chat/history` | 15.7s | 🔴 CRITICAL |
| `/api/swipes/exclude-keys` | 15.2s | 🔴 CRITICAL |
| `/api/mls-listings` | 13.7s | 🔴 CRITICAL |
| `/api/mls-listings/[slug]` | 11.6s | 🔴 CRITICAL |
| `/api/chat/stream` | 4.5s | 🟡 HIGH |

### 4. **Secondary Issues**

#### Missing Icons
```
GET /icons/icon-32x32.png 404
GET /icons/icon-16x16.png 404
```

#### Deprecated Middleware
```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
```

#### Multiple Failed Auth Logs
```
POST /api/chat/log 403 (x6)
```

## Performance Optimization Plan

### PHASE 1: Immediate Fixes (30 min)

1. **Disable PWA in Development**
   - ✅ Already done in config: `disable: process.env.NODE_ENV === "development"`
   - Verify it's actually working

2. **Add TypeScript Path Aliases**
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./src/*"],
         "@/components/*": ["./src/app/components/*"],
         "@/lib/*": ["./src/lib/*"],
         "@/models/*": ["./src/models/*"],
         "@/types/*": ["./src/types/*"]
       }
     }
   }
   ```

3. **Optimize Next.js Config**
   - Add compiler optimizations
   - Enable SWC minification
   - Configure modularizeImports for tree-shaking

4. **Fix Missing Icons**
   - Generate proper PWA icons or disable PWA entirely

### PHASE 2: Dependency Optimization (1 hour)

1. **Lazy Load Heavy Libraries**
   - Three.js (@react-three/fiber) - only load on pages that need 3D
   - @mlc-ai/web-llm - lazy load in chat widget
   - Puppeteer - should be dev dependency or separate service

2. **Remove Duplicate Map Libraries**
   - Choose ONE: maplibre-gl OR mapbox-gl (not both)
   - Remove unused react-map-gl if using vis.gl

3. **Code Split by Route**
   - Use dynamic imports for chat components
   - Use dynamic imports for map components
   - Use dynamic imports for admin/CMS components

### PHASE 3: Build System Optimization (2 hours)

1. **Webpack Bundle Analysis**
   ```bash
   npm install --save-dev @next/bundle-analyzer
   ```

2. **Enable SWC Compiler**
   ```js
   experimental: {
     swcMinify: true,
     optimizePackageImports: ['lucide-react', 'framer-motion']
   }
   ```

3. **Configure Turborepo**
   - Set up proper caching
   - Configure incremental builds

### PHASE 4: Database/API Optimization (ongoing)

1. **Add MongoDB Connection Pooling**
2. **Implement API Response Caching**
3. **Optimize Mongoose Queries**
4. **Add Database Indexes**

## Recommended Next.js Config Changes

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'mdx', 'ts', 'tsx'],

  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  experimental: {
    // Optimize package imports for faster builds
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@react-three/fiber',
      '@react-three/drei',
    ],

    // Enable faster server components
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    remotePatterns: [/* your existing patterns */],
  },

  // Webpack optimizations
  webpack(config, { isServer }) {
    // SVG support
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });

    // Optimize for development
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for 3rd party modules
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20
            },
            // Common chunk for shared code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true
            }
          }
        }
      };
    }

    return config;
  },
};
```

## Quick Wins (Do These First)

### 1. Check if Turbopack is Actually Helping
Try disabling Turbopack temporarily:
```bash
# Instead of: npm run dev
# Use:
next dev --no-turbo
```

### 2. Clear Next.js Cache
```bash
rm -rf .next
npm run dev
```

### 3. Update Dependencies
```bash
npm update next react react-dom
```

### 4. Check Node Version
```bash
node --version  # Should be 18.17+ or 20+
```

### 5. Increase Node Memory
```json
// package.json
{
  "scripts": {
    "dev": "NODE_OPTIONS='--max-old-space-size=8192' next dev"
  }
}
```

## Monitoring Plan

Add these scripts to track performance:

```json
{
  "scripts": {
    "dev:debug": "NODE_OPTIONS='--inspect' next dev",
    "analyze": "ANALYZE=true next build",
    "build:profile": "next build --profile"
  }
}
```

## Expected Improvements

After optimizations:
- **Startup:** 44.4s → **~5-8s** (80% improvement)
- **Page Compilation:** 23.6s → **~2-3s** (90% improvement)
- **API Compilation:** 15.7s → **~500ms-1s** (95% improvement)
- **Overall Development Experience:** Much smoother hot reload

## Next Steps

1. ✅ Analyze current config (DONE)
2. ⏳ Implement Phase 1 fixes
3. ⏳ Test and measure improvements
4. ⏳ Implement Phase 2 if needed
5. ⏳ Create bundle analysis report
