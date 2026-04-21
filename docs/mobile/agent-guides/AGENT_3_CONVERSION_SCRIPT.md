# Agent 3: Conversion Script

**Runs:** Third (after Agent 1 scaffold + Agent 2 shared package)
**Estimated Time:** 3-5 days

---

## Mission

Build and run an automated conversion script that mechanically transforms ~459 React/Next.js components into React Native components. Handle the ~70-80% of changes that are predictable tag/import swaps, leaving the ~20-30% that requires judgment for Agents 4-8.

---

## Script Architecture

Build a Node.js script using TypeScript + AST parsing (via `ts-morph` or `@babel/parser`) for reliable transformations. Avoid regex-only approaches — they'll miss edge cases.

```
scripts/
├── convert-to-rn.ts          # Main entry point
├── transforms/
│   ├── jsx-elements.ts       # HTML → RN element swaps
│   ├── imports.ts            # Import statement rewrites
│   ├── styles.ts             # className → style handling
│   ├── event-handlers.ts     # onClick → onPress, etc.
│   ├── next-specific.ts      # next/link, next/image, next/router removal
│   └── browser-apis.ts       # Flag browser API usage for manual review
├── utils/
│   ├── file-scanner.ts       # Find all .tsx files to process
│   └── report-generator.ts   # Generate conversion report
└── config.ts                 # Transformation rules
```

---

## Transformation Rules

### 1. JSX Element Swaps

| Web Element | RN Element | Import From |
|---|---|---|
| `<div>` | `<View>` | `react-native` |
| `<span>` | `<Text>` | `react-native` |
| `<p>` | `<Text>` | `react-native` |
| `<h1>` through `<h6>` | `<Text>` (add style variant) | `react-native` |
| `<label>` | `<Text>` | `react-native` |
| `<strong>`, `<b>` | `<Text style={{fontWeight:'bold'}}>` | `react-native` |
| `<em>`, `<i>` | `<Text style={{fontStyle:'italic'}}>` | `react-native` |
| `<img>` | `<Image>` | `react-native` |
| `<input>` | `<TextInput>` | `react-native` |
| `<textarea>` | `<TextInput multiline>` | `react-native` |
| `<button>` | `<Pressable>` | `react-native` |
| `<a>` | `<Pressable>` (with onPress navigation) | `react-native` |
| `<ul>`, `<ol>` | `<View>` | `react-native` |
| `<li>` | `<View>` | `react-native` |
| `<select>` | `<View>` (flag for manual — needs picker) | `react-native` |
| `<form>` | `<View>` | `react-native` |
| `<section>` | `<View>` | `react-native` |
| `<article>` | `<View>` | `react-native` |
| `<header>` | `<View>` | `react-native` |
| `<footer>` | `<View>` | `react-native` |
| `<nav>` | `<View>` | `react-native` |
| `<main>` | `<View>` | `react-native` |
| `<aside>` | `<View>` | `react-native` |
| `<hr>` | `<View style={{borderBottomWidth:1}}>` | `react-native` |
| `<br>` | `<Text>{'\n'}</Text>` | `react-native` |
| `<table>` | `<View>` (flag for manual) | `react-native` |
| `<tr>` | `<View style={{flexDirection:'row'}}>` | `react-native` |
| `<td>`, `<th>` | `<View>` | `react-native` |
| `<svg>` | Flag for manual — needs `react-native-svg` | - |

### 2. Attribute/Prop Swaps

| Web Prop | RN Prop | Notes |
|---|---|---|
| `onClick` | `onPress` | Move to wrapping `<Pressable>` if on non-pressable |
| `onChange` | `onChangeText` | For TextInput only |
| `onSubmit` | Remove (handle via button onPress) | |
| `className` | Keep if using NativeWind, else convert | See styles section |
| `htmlFor` | Remove | Not applicable in RN |
| `href` | Convert to `onPress` with navigation | |
| `src` (on img) | `source={{uri: ...}}` | |
| `alt` (on img) | `accessibilityLabel` | |
| `placeholder` | `placeholder` | Same! |
| `disabled` | `disabled` | Same! |
| `autoFocus` | `autoFocus` | Same! |
| `value` | `value` | Same! |
| `type="text"` | Remove (default) | |
| `type="password"` | `secureTextEntry` | |
| `type="email"` | `keyboardType="email-address"` | |
| `type="tel"` | `keyboardType="phone-pad"` | |
| `type="number"` | `keyboardType="numeric"` | |
| `style={{...}}` | `style={{...}}` | Same but RN subset |
| `dangerouslySetInnerHTML` | Flag for manual — needs WebView | |
| `target="_blank"` | Remove (use Linking.openURL) | |
| `tabIndex` | Remove | |
| `role` | `accessibilityRole` | |
| `aria-label` | `accessibilityLabel` | |
| `aria-hidden` | `accessibilityElementsHidden` | |

### 3. Import Rewrites

| Web Import | RN Replacement |
|---|---|
| `import Link from 'next/link'` | Remove (use navigation) |
| `import Image from 'next/image'` | `import { Image } from 'react-native'` |
| `import { useRouter } from 'next/navigation'` | `import { useNavigation } from '@react-navigation/native'` |
| `import { useSearchParams } from 'next/navigation'` | `import { useRoute } from '@react-navigation/native'` |
| `import { usePathname } from 'next/navigation'` | `import { useRoute } from '@react-navigation/native'` |
| `from 'framer-motion'` | `from 'react-native-reanimated'` (flag for manual) |
| `from '@headlessui/react'` | Remove (flag for manual — use RN equivalents) |
| `from 'react-toastify'` | `from 'react-native-toast-message'` |
| `from 'swiper/react'` | Flag for manual — use FlatList or custom |
| `from 'recharts'` | Flag for manual — use react-native-chart-kit |
| `from 'maplibre-gl'` | Flag for manual — Agent 5 handles |
| `from '@vis.gl/react-maplibre'` | Flag for manual — Agent 5 handles |
| `from 'react-map-gl'` | Flag for manual — Agent 5 handles |
| `from 'leaflet'` | Flag for manual — Agent 5 handles |
| `from 'three'` | Flag for SKIP — not converting 3D |
| `from '@react-three/*'` | Flag for SKIP |

### 4. Style Handling (NativeWind Strategy)

Since we're using NativeWind, most `className` props can stay as-is. However, flag these patterns:

**Keep as-is (NativeWind supports):**
- `className="flex items-center justify-between p-4 bg-white rounded-lg"`
- `className="text-lg font-bold text-gray-900"`
- Responsive: `className="md:flex-row flex-col"` (NativeWind supports breakpoints)

**Flag for manual review:**
- `className` with CSS Grid (`grid`, `grid-cols-*`) — RN has no grid
- `className` with `position: fixed` — no fixed positioning in RN
- `className` with `overflow-x-auto` — needs ScrollView horizontal
- `className` with hover states (`hover:*`) — no hover on mobile
- `className` with `cursor-pointer` — not applicable
- `className` with `transition-*` — use Reanimated instead
- `className` with `animate-*` — flag for Reanimated conversion
- Complex `backdrop-blur`, `bg-gradient-*` — limited RN support

### 5. Next.js Specific Removals

| Pattern | Action |
|---|---|
| `'use client'` directive | Remove (all RN components are client) |
| `'use server'` directive | Remove (not applicable) |
| `export default function Page()` | Rename to screen component |
| `export function generateMetadata()` | Remove entirely |
| `export const metadata = ...` | Remove entirely |
| `export const revalidate = ...` | Remove |
| `export const dynamic = ...` | Remove |
| `<Head>` | Remove (not applicable) |
| `import dynamic from 'next/dynamic'` | Replace with `React.lazy` |

### 6. Browser API Flagging

These can't be auto-converted — flag with `// TODO: RN_MANUAL` comments:

| Browser API | RN Replacement |
|---|---|
| `window.innerWidth` | `Dimensions.get('window').width` |
| `window.innerHeight` | `Dimensions.get('window').height` |
| `window.addEventListener` | Platform-specific event handling |
| `window.location` | Navigation state |
| `document.getElementById` | `useRef` |
| `document.body` | Not applicable |
| `localStorage.getItem/setItem` | `AsyncStorage.getItem/setItem` |
| `sessionStorage` | In-memory state or AsyncStorage |
| `navigator.clipboard` | `@react-native-clipboard/clipboard` |
| `navigator.geolocation` | `react-native-geolocation-service` |
| `Notification.requestPermission()` | Firebase messaging |
| `new Audio()` | `react-native-sound` |
| `fetch` with `AbortController` | Same (works in RN!) |
| `createPortal` | Not applicable (use Modal component) |
| `screen.orientation` | `react-native-orientation-locker` |
| `ResizeObserver` | `onLayout` prop |
| `IntersectionObserver` | `onViewableItemsChanged` on FlatList |
| `matchMedia` | `Dimensions` + event listener |
| `URL`, `URLSearchParams` | `react-native-url-polyfill` |

---

## Files to SKIP (Do Not Convert)

These files should be excluded from conversion entirely:

### Admin-Only Pages
- `src/app/admin/**/*` — Admin panel stays web-only

### Server-Side Only
- `src/app/api/**/*` — API routes, not components
- `src/lib/**/*` — Server utilities (already in shared or stays in web)
- `src/models/**/*` — Database models
- `src/server/**/*` — Socket.io server
- `src/scripts/**/*` — Build/sync scripts
- `server.js` — Custom server

### Web-Only Features
- `src/app/components/backgrounds/StarsCanvas.tsx` — Three.js
- `src/app/components/backgrounds/ThreeStars.tsx` — Three.js
- `src/app/components/buy/BuyPageHero3D.tsx` — Three.js
- `src/app/components/LoadingGlobe.tsx` — Three.js
- `src/app/components/seo/**/*` — SEO/JSON-LD
- `src/app/components/mdx/**/*` — MDX rendering (keep web-only for now)
- `src/app/components/ServiceWorkerRegistration.tsx` — PWA
- `src/app/components/IframeSearch.tsx` — Embedded iframe

### Config Files
- `next.config.mjs`
- `tailwind.config.ts` (web version — mobile gets its own)
- `middleware.ts`
- `src/app/layout.tsx`, `src/app/providers.tsx` — Next.js app wrapper

---

## Conversion Report

The script should generate a report file after running:

```
CONVERSION_REPORT.md

## Summary
- Total files scanned: 459
- Files converted: 380
- Files skipped: 79
-
## Conversions Applied
- HTML → RN element swaps: 12,450
- Import rewrites: 890
- Prop swaps (onClick→onPress, etc.): 1,230
- Next.js removals: 340

## Manual Review Required
### Browser API Usage (48 files)
- src/app/components/mls/map/MapView.tsx — window.innerWidth, document
- src/app/components/mls/CollageHero.tsx — createPortal, document.body
- ...

### Complex Styles (35 files)
- src/app/components/mls/map/FiltersPannel.tsx — CSS Grid layout
- src/app/components/mls/map/ListingBottomPanel.tsx — position: fixed
- ...

### Library Replacements Needed (25 files)
- src/app/components/mls/map/MapView.tsx — maplibre-gl (Agent 5)
- src/app/components/campaigns/campaign-card/StatsDisplay.tsx — recharts (Agent 8)
- ...

### Animations (18 files)
- src/app/components/mls/map/AnimatedMarker.tsx — framer-motion (Agent 5)
- ...
```

---

## Execution Steps

1. **Build the script** using `ts-morph` for AST parsing
2. **Run on a copy** of `src/` — never modify originals
3. **Output to** `packages/mobile/src/` (the RN project from Agent 1)
4. **Generate report** listing everything that needs manual attention
5. **Run TypeScript compiler** to identify remaining type errors
6. **Categorize errors** by agent responsibility area

---

## Deliverables Checklist

- [ ] Conversion script built and tested
- [ ] Script run on all ~459 component files
- [ ] Converted files placed in `packages/mobile/src/`
- [ ] `CONVERSION_REPORT.md` generated with manual review items
- [ ] TypeScript error report categorized by agent
- [ ] Each manual review item tagged with responsible agent (4-8)
- [ ] NativeWind className compatibility verified

---

## Dependencies

| From | What We Need |
|---|---|
| Agent 1 | RN project structure to write converted files into |
| Agent 2 | Shared package so converted files can import types |

| Agent | What They Need From Us |
|---|---|
| Agent 4 | Converted listing/search components + manual review items |
| Agent 5 | Converted map components + manual review items |
| Agent 6 | Converted chat/messaging components + manual review items |
| Agent 7 | Converted CRM/contacts components + manual review items |
| Agent 8 | Converted campaign/analytics components + manual review items |
