# Package Cleanup & Optimization Analysis

**Date**: February 6, 2026
**Status**: Ready for Implementation
**Estimated Savings**: 200-300 MB, 20-30% faster installs

---

## Executive Summary

Comprehensive audit identified **20 unused packages** safe to remove, while confirming several packages previously thought unused are actually required peer dependencies.

### Key Findings:
- ✅ 84 packages actively used
- ⚠️ 8 packages peer dependencies (keep)
- ❌ 20 packages definitely unused (remove)

---

## SAFE TO REMOVE (20 Packages)

### Three.js Ecosystem (Not Using 3D Graphics)
```json
"@react-three/drei": "^9.111.0",      // Remove
"@react-three/fiber": "^8.17.5",      // Remove
"three": "^0.167.1",                  // Remove
"maath": "^0.10.8",                   // Remove
```

**Why**: Listed in `next.config.mjs` transpilePackages but never imported. ThreeStars.tsx uses Canvas 2D, not Three.js.

**Also update**: Remove from `next.config.mjs` line 50:
```javascript
// Remove: ['three', '@react-three/fiber', '@react-three/drei']
transpilePackages: [], // Empty or other packages
```

---

### Unused Frameworks & Libraries

```json
"express": "^4.21.2",                // Remove - using Node http.createServer
"cors": "^2.8.5",                    // Remove - not using Express
"styled-components": "^6.1.13",      // Remove - using Tailwind CSS
"ai": "^5.0.93",                     // Remove - using Claude/Groq SDKs directly
```

**Why**:
- `express`: `server.js` uses native Node.js http, not Express
- `cors`: No Express middleware needed
- `styled-components`: Project uses Tailwind exclusively
- `ai`: Using @anthropic-ai/sdk and groq-sdk directly

---

### Map Library Alternatives (Using MapLibre)

```json
"mapbox-gl": "^3.12.0",              // Remove - using maplibre-gl
"react-map-gl": "^8.0.4",            // Remove - using @vis.gl/react-maplibre
```

**Why**: Project uses `@vis.gl/react-maplibre` and `maplibre-gl` instead.

**Also update**: Remove from `next.config.mjs` line 151:
```javascript
// Remove this cacheGroup:
maps: {
  test: /[\\/]node_modules[\\/](mapbox-gl|maplibre-gl|react-map-gl)[\\/]/,
  name: 'maps',
  chunks: 'all',
  priority: 30,
},
```

---

### Duplicate / Superseded Packages

```json
"elevenlabs-node": "^2.0.3",         // Remove - using newer 'elevenlabs'
"react-spinner": "^0.2.7",           // Remove - using 'react-spinners' (plural)
```

**Why**: Migrated to newer versions.

---

### Unused CMS/Payment Libraries

```json
"@portabletext/react": "^3.2.0",     // Remove - not using Sanity CMS
"@stripe/stripe-js": "^8.6.1",       // Remove - using server-side stripe only
```

**Why**:
- `@portabletext/react`: No Sanity CMS integration
- `@stripe/stripe-js`: Only using server-side `stripe` package

---

### Unused MDX Package

```json
"@mdx-js/runtime": "^2.0.0",         // Remove - outdated, not needed
```

**Why**: Version 2.0 (outdated), not imported anywhere. Other MDX packages are v3.x.

---

### Unused Utilities

```json
"archiver": "^7.0.1",                // Remove - never imported
"dropcowboy": "^1.0.2",              // Remove - using fetch API directly
"rehype-slug": "^6.0.0",             // Remove - not in MDX processing chain
"remark-html": "^16.0.1",            // Remove - using remark-rehype instead
"use-supercluster": "^1.2.0",        // Remove - using supercluster directly
```

**Why**: Zero imports found, or calling APIs directly without SDK.

---

## KEEP - Required Peer Dependencies

### MDX Peer Dependencies (REQUIRED)

```json
"@mdx-js/loader": "^3.1.0",          // KEEP - peer dep of @next/mdx
"@mdx-js/react": "^3.1.0",           // KEEP - peer dep of @next/mdx + next-mdx-remote
```

**Why**: Required by `@next/mdx` for processing 44 blog posts in `src/posts/*.mdx`.

---

### Rehype Peer Dependencies (REQUIRED)

```json
"hast-util-to-html": "^9.0.5",       // KEEP - peer dep of rehype-stringify
"hast-util-to-string": "^3.0.1",     // KEEP - peer dep of rehype plugins
```

**Why**: Required by rehype plugins used in `src/lib/mdx-processor.ts`.

---

### Actually Used (Previously Thought Unused)

```json
"formidable": "^3.5.2",              // KEEP - used in contact analysis API
```

**Why**: Used in `src/app/api/crm/contacts/analyze/route.ts:17` for file uploads.

---

## CSV Package Clarification

### KEEP All CSV Packages (Actively Used)

```json
"csv-parse": "^6.1.0",               // KEEP - contact-cleaner.service.ts
"csv-stringify": "^6.6.0",           // KEEP - contact-cleaner.service.ts
"papaparse": "^5.5.3",               // KEEP - 4 files (import services)
```

**Why**: Used in contact import system:
- `csv-parse` & `csv-stringify`: `src/lib/services/contact-cleaner.service.ts`
- `papaparse`: Contact import preview/confirm routes

### Script-Only Packages (Evaluate Separately)

```json
"csv-parser": "^3.2.0",              // Only in expiredTextMessages.ts, expiredEmails.ts
"csv-writer": "^1.6.0",              // Only in skiptrace.ts
"puppeteer": "^23.11.1",             // Only in scraper.ts (190 MB!)
```

**Recommendation**: Keep for now, evaluate if scripts are still needed.

---

## Implementation Steps

### 1. Remove Unused Packages

```bash
npm uninstall \
  @react-three/drei \
  @react-three/fiber \
  three \
  maath \
  express \
  cors \
  styled-components \
  ai \
  mapbox-gl \
  react-map-gl \
  elevenlabs-node \
  react-spinner \
  @portabletext/react \
  @stripe/stripe-js \
  @mdx-js/runtime \
  archiver \
  dropcowboy \
  rehype-slug \
  remark-html \
  use-supercluster
```

### 2. Update next.config.mjs

**Remove from transpilePackages (line 50):**
```javascript
// Before:
transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],

// After:
transpilePackages: [],
```

**Remove from splitChunks (lines 144-155):**
```javascript
// Remove these cacheGroups:
three: {
  test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
  name: 'three',
  chunks: 'all',
  priority: 30,
},
maps: {
  test: /[\\/]node_modules[\\/](mapbox-gl|maplibre-gl|react-map-gl)[\\/]/,
  name: 'maps',
  chunks: 'all',
  priority: 30,
},
```

### 3. Run Clean Install

```bash
npm install
```

### 4. Test Build

```bash
npm run build
```

---

## Verification Checklist

After removal, verify:
- [ ] MDX blog posts render correctly (`/insights/...`)
- [ ] Contact CSV imports work (`/agent/crm/contacts`)
- [ ] Maps display correctly (property search)
- [ ] Voicemail generation works (ElevenLabs)
- [ ] No build errors in `npm run build`
- [ ] Dev server starts (`npm run dev`)

---

## Expected Benefits

### Performance Improvements
- **Node modules size**: ~200-300 MB reduction
- **Install time**: 20-30% faster
- **Build time**: Faster (fewer packages to process)
- **Bundle size**: Smaller (unused code eliminated)

### Maintenance Benefits
- Cleaner dependency tree
- Fewer security vulnerabilities to monitor
- Easier to audit in future
- Less confusion about which packages are used

---

## Notes

- **Peer dependencies are critical**: Don't remove @mdx-js/loader, @mdx-js/react, hast-util packages
- **CSV packages are active**: All CSV packages except csv-parser/csv-writer are in active use
- **Three.js completely unused**: Safe to remove entire ecosystem
- **formidable IS used**: Contrary to initial analysis, it's imported in contact analysis

---

## Related Files

- `package.json` - Dependency definitions
- `next.config.mjs` - Build configuration (update after removal)
- `src/posts/*.mdx` - 44 blog posts requiring MDX packages
- `src/lib/services/contact-*.service.ts` - CSV processing services
- `src/app/api/crm/contacts/` - Contact import APIs

---

## Future Optimization Opportunities

### Script-Only Packages (Evaluate Later)
- `puppeteer` (190 MB!) - Only in `scraper.ts`, rarely used?
- `csv-parser` - Only in expired email/text scripts
- `csv-writer` - Only in skiptrace script
- `pg` - PostgreSQL client, only in one file
- `ssh2` - Only in vps-ssh.ts
- `xml` - Only for RSS feeds

### Consider Alternatives
- Replace `axios` with native `fetch` (already using fetch in many places)
- Evaluate if all chart libraries in `recharts` are needed
- Consider lighter alternatives to `puppeteer` if needed

---

**Last Updated**: February 6, 2026
**Next Review**: After implementation
