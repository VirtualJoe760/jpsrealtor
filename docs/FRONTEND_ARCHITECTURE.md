# Frontend Architecture
**JPSRealtor.com - Next.js 16 App Router Application**
**Last Updated:** January 29, 2025

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Theme System](#theme-system)
4. [Component Architecture](#component-architecture)
5. [State Management](#state-management)
6. [Performance Optimizations](#performance-optimizations)
7. [Styling & Design](#styling--design)

---

## 🎯 OVERVIEW

JPSRealtor.com is built with Next.js 16 using the App Router architecture, featuring:
- **React 19** with Server and Client Components
- **Dual theme system** (blackspace, lightgradient)
- **MapLibre** for interactive property mapping
- **Groq AI** integration for natural language search
- **Tinder-style swipe** discovery
- **Progressive Web App** (PWA) capabilities

---

## 🛠️ TECHNOLOGY STACK

### Core Framework
```yaml
Next.js: 16.0.3
  - App Router (not Pages Router)
  - React Server Components
  - Turbopack dev mode (862ms startup!)
  - Server Actions
  - API Routes
  - Image Optimization

React: 19.0.0
  - Client Components ("use client")
  - Server Components (default)
  - Suspense boundaries
  - Error boundaries
```

### UI & Styling
```yaml
Tailwind CSS: 3.4.17
  - Custom theme configuration
  - JIT compiler
  - Custom plugins
  - PostCSS
  - Responsive utilities

Framer Motion: 11.15.0
  - Page transitions
  - Swipe gestures (listing discovery)
  - Map marker animations
  - Loading states
  - 3D transforms

Lucide React: 0.468.0
  - Tree-shakeable icons
  - Modular imports optimized
  - Consistent sizing
```

### Maps & Geospatial
```yaml
MapLibre GL: 4.7.1
  - @vis.gl/react-maplibre
  - Vector tiles (MapTiler)
  - Custom marker components
  - Geospatial clustering (Supercluster)
  - 4 map styles (dark, bright, satellite, toner)
```

### Performance
```yaml
Development:
  - Turbopack: 862ms startup (95% faster)
  - SWC transpiler
  - Hot Module Replacement
  - Incremental TypeScript

Production:
  - Code splitting
  - Tree shaking
  - Image optimization
  - Font optimization (@fontsource)
  - Service Worker (PWA)
```

---

## 🎨 THEME SYSTEM

### Architecture

**Theme Context:** `src/app/contexts/ThemeContext.tsx`

The centralized theme management system provides:
- Theme state management
- localStorage persistence
- CSS variable injection
- Theme switching functions

### Available Themes

#### 1. **Black Space** (`blackspace`)
Deep space aesthetic with starfield background:
```typescript
{
  name: "blackspace",
  colors: {
    bgPrimary: "#000000",
    bgSecondary: "#0a0a0a",
    textPrimary: "#ffffff",
    textSecondary: "#e5e7eb",
    surfaceGlass: "rgba(17, 24, 39, 0.5)",
    accentPrimary: "#10b981", // emerald
    accentSecondary: "#8b5cf6", // purple
  }
}
```

**Visual Features:**
- Animated starfield background (2500 particles)
- Deep space colors
- Emerald accents
- Glassmorphic surfaces

#### 2. **Light Gradient** (`lightgradient`)
Clean, bright interface with soft gradients:
```typescript
{
  name: "lightgradient",
  colors: {
    bgPrimary: "#ffffff",
    bgSecondary: "#f9fafb",
    textPrimary: "#111827",
    textSecondary: "#374151",
    surfaceGlass: "rgba(255, 255, 255, 0.8)",
    accentPrimary: "#3b82f6", // blue
    accentSecondary: "#10b981", // emerald
  }
}
```

**Visual Features:**
- Gradient backgrounds (`from-gray-50 via-blue-50/30 to-emerald-50/20`)
- Glassmorphism effects
- Blue/emerald accents
- Subtle pattern overlay

### Using Themes in Components

#### Option 1: useThemeClasses Hook (Recommended)
```tsx
import { useThemeClasses } from "@/app/contexts/ThemeContext";

function MyComponent() {
  const {
    cardBg,
    textPrimary,
    textSecondary,
    border,
    buttonPrimary
  } = useThemeClasses();

  return (
    <div className={`${cardBg} ${border} p-4 rounded`}>
      <h1 className={`${textPrimary} text-2xl font-bold`}>
        Auto-themed Heading
      </h1>
      <p className={`${textSecondary} mt-2`}>
        Automatically adapts to current theme
      </p>
      <button className={`${buttonPrimary} px-4 py-2 rounded`}>
        Themed Button
      </button>
    </div>
  );
}
```

**Available Classes:**
- `bgPrimary`, `bgSecondary`, `bgTertiary`
- `textPrimary`, `textSecondary`, `textTertiary`, `textMuted`
- `cardBg`, `cardBorder`, `cardHover`
- `border`, `borderLight`, `borderDark`
- `buttonPrimary`, `buttonSecondary`
- `shadow`, `shadowSm`
- `hover`, `active`

#### Option 2: useTheme Hook
```tsx
import { useTheme } from "@/app/contexts/ThemeContext";

function MyComponent() {
  const { currentTheme, theme, setTheme, toggleTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  return (
    <div className={isLight ? "bg-white text-gray-900" : "bg-black text-white"}>
      Current theme: {currentTheme}
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
}
```

#### Option 3: CSS Variables
```css
.my-component {
  background: var(--color-bgPrimary);
  color: var(--color-textPrimary);
  border: 1px solid var(--color-surfaceBorder);
}
```

### Theme-Aware Components

**1. Spatial Background** (`src/app/components/backgrounds/SpaticalBackground.tsx`)
- Black Space: Animated starfield (ThreeStars component)
- Light Gradient: Soft blue/white gradients with pattern overlay

**2. Map Markers** (`src/app/components/mls/map/AnimatedMarker.tsx`)
- Light mode: Softer emerald tones
- Dark mode: Vibrant emerald with glow
- Property type colors maintained (rentals: purple, multi-family: yellow)

**3. Map Clusters** (`src/app/components/mls/map/AnimatedCluster.tsx`)
- Light mode: Blue (blue-300 to blue-500, 40-90% opacity)
- Dark mode: Emerald with glow effects

**4. Listing Panel** (`src/app/components/mls/map/ListingBottomPanel.tsx`)
- Glassmorphism: `backdrop-filter: blur(20px) saturate(180%)`
- Light: `bg-white/75` with blue accents
- Dark: `bg-zinc-900/85` with emerald accents

**5. Chat Widget** (`src/app/components/chatwidget/IntegratedChatWidget.tsx`)
- Light: Gradient background, blue accents, black logo
- Dark: Starfield background, purple accents, white logo

### Theme Components

**ThemeToggle** (`src/app/components/ThemeToggle.tsx`)
```tsx
import ThemeToggle from "@/app/components/ThemeToggle";

<ThemeToggle /> // Simple toggle switch
```

**ThemeSelector** (`src/app/components/ThemeToggle.tsx`)
```tsx
import { ThemeSelector } from "@/app/components/ThemeToggle";

<ThemeSelector /> // Full selector with previews
```

---

## 🧩 COMPONENT ARCHITECTURE

### Application Structure

```
src/app/
├── components/
│   ├── mls/map/              # Map-related components
│   ├── chatwidget/           # AI chat interface
│   ├── cities/               # City page components
│   ├── subdivisions/         # Subdivision components
│   ├── backgrounds/          # Theme backgrounds
│   ├── navbar/               # Navigation
│   └── ui/                   # Reusable UI components
├── contexts/
│   ├── ThemeContext.tsx      # Theme management
│   ├── ChatProvider.tsx      # Chat state
│   └── MLSProvider.tsx       # MLS/map state (future)
├── utils/
│   └── map/                  # Map utilities
└── (routes)/                 # App Router pages
```

### Key Component Categories

#### 1. Map Components

**MapView.tsx** (`src/app/components/mls/map/MapView.tsx`)
- Main map container using MapLibre GL
- Supercluster for marker clustering
- 4 map styles (dark, bright, satellite, toner)
- Viewport-based listing loading
- Debounced bounds changes (250ms)

**AnimatedMarker.tsx** (`src/app/components/mls/map/AnimatedMarker.tsx`)
- **Performance Optimized:** 90-95% CPU reduction
- Static canvas rendering (no continuous animation loop)
- Redraws only on prop changes (isSelected, isHovered)
- CSS-only shimmer effect on hover
- `useMemo` and `useCallback` optimizations
- Framer Motion stiffness reduced to 260

**AnimatedCluster.tsx** (`src/app/components/mls/map/AnimatedCluster.tsx`)
- Theme-aware cluster colors
- Pulsing animation
- Rotating ring segments
- Dynamic sizing based on point count

**MapPageClient.tsx** (`src/app/components/mls/map/MapPageClient.tsx`)
- State management for map, filters, selections
- Coordinates MapView ↔ ListingBottomPanel ↔ FavoritesPanel
- URL parameter synchronization
- Swipe queue integration
- Prefetching (first 5 visible + next 3 in queue)

**ListingBottomPanel.tsx** (`src/app/components/mls/map/ListingBottomPanel.tsx`)
- Fixed-width centerpiece (500-900px)
- Framer Motion 3D swipe animations
- Swipeable cards (20% threshold or 450px/s velocity)
- Photo carousel (PannelCarousel)
- Disliked badge with countdown timer

**FavoritesPanel.tsx** (`src/app/components/mls/map/FavoritesPannel.tsx`)
- Three tabs: "In View", "Favorites", "Disliked"
- Grouped by subdivision with priority sorting
- Swipe-to-close gesture
- 30-minute dislike expiration

**MapGlobeLoader.tsx** (`src/app/components/mls/map/MapGlobeLoader.tsx`)
- 3D rotating globe loading spinner
- 800 animated dots with depth-based rendering
- 33 fun loading messages (rotate every 3 seconds)
- Only shows on `/map` page

#### 2. Chat Components

**IntegratedChatWidget.tsx** (`src/app/components/chatwidget/IntegratedChatWidget.tsx`)
- AI-powered natural language search
- Streaming responses from Groq
- Theme-aware UI (gradient bg for light, starfield for dark)
- Quick action buttons
- Markdown parser with theme support
- Listing carousel integration
- CMA display
- Map view integration

**ChatProvider.tsx** (`src/app/components/chat/ChatProvider.tsx`)
- Message history management
- localStorage persistence
- Add/clear messages API

#### 3. Listing Display Components

**SubdivisionListings.tsx** (`src/app/components/subdivisions/SubdivisionListings.tsx`)
- Glassmorphism cards
- Light mode: `bg-white/80 backdrop-blur-sm border-gray-300`
- Dark mode: `bg-gray-900 border-gray-800`
- Theme-aware filters, pagination
- Property type toggles

**SubdivisionPhotoCarousel.tsx** (`src/app/components/subdivisions/SubdivisionPhotoCarousel.tsx`)
- Framer Motion animations
- Glassmorphic navigation arrows
- Photo counter badge
- Thumbnail strip
- `motion.button` with `whileHover={{ scale: 1.1 }}`

**PannelCarousel.tsx** (`src/app/components/mls/map/PannelCarousel.tsx`)
- Swipeable photo carousel
- Quality 100 (room for optimization)
- Preloads next photo
- Framer Motion drag gestures

#### 4. City/Neighborhood Components

**CityPageClient.tsx** (`src/app/neighborhoods/[cityId]/CityPageClient.tsx`)
- City overview page
- Statistics display
- Subdivision listings
- Schools section
- HOA section
- Map view

**SubdivisionPageClient.tsx** (`src/app/neighborhoods/[cityId]/[slug]/SubdivisionPageClient.tsx`)
- Subdivision detail page
- Photo carousel
- Statistics
- Listings grid
- Favorite button (theme-aware)

**CityStats.tsx** (`src/app/components/cities/CityStats.tsx`)
- Market statistics visualization
- Theme-aware stat cards
- Charts (Recharts)

**SubdivisionStats.tsx** (`src/app/components/subdivisions/SubdivisionStats.tsx`)
- Similar to CityStats
- Uses useThemeClasses()

#### 5. Background Components

**SpaticalBackground.tsx** (`src/app/components/backgrounds/SpaticalBackground.tsx`)
- Reusable theme-aware background
- Black Space: ThreeStars component
- Light Gradient: CSS gradients + pattern overlay
- Optional gradient overlay for depth

**ThreeStars.tsx** (`src/app/components/backgrounds/ThreeStars.tsx`)
- 2500 stars in spherical distribution
- Canvas-based rendering
- Ambient rotation (0.01-0.015 rad/s)
- Optimized for performance

**StarsCanvas.tsx** (`src/app/components/backgrounds/StarsCanvas.tsx`)
- Wrapper for ThreeStars with dynamic import
- Fallback gradient if import fails
- SSR: false (client-only)

---

## 🔄 STATE MANAGEMENT

### React Context Strategy

**ThemeContext** (`src/app/contexts/ThemeContext.tsx`)
```typescript
interface ThemeContextType {
  currentTheme: ThemeName;
  theme: Theme;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
}
```

**ChatProvider** (`src/app/components/chat/ChatProvider.tsx`)
```typescript
interface ChatContextType {
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
}
```

**MLSProvider** (`src/app/components/mls/MLSProvider.tsx`) - Future
```typescript
interface MLSContextType {
  allListings: IListing[];
  visibleListings: IListing[];
  selectedListing: IListing | null;
  filters: Filters;
  setFilters: (filters: Filters) => void;
  likedListings: string[];
  dislikedListings: string[];
  toggleFavorite: (listingKey: string) => void;
  swipeLeft: (listingKey: string) => void;
}
```

### URL State Management

**useSearchParams** for shareable state:
- Map viewport (bounds, zoom)
- Filters (price, beds, baths, etc.)
- Selected listing
- Listing type (sale/rental/multifamily)

### localStorage Patterns

**Theme Persistence:**
```typescript
localStorage.setItem('theme', themeName);
```

**Favorites:**
```typescript
localStorage.setItem('favorites', JSON.stringify(listingKeys));
```

**Chat History:**
```typescript
localStorage.setItem('chatMessages', JSON.stringify(messages));
```

### Cookie Storage

**Authentication (NextAuth):**
- `next-auth.session-token` (JWT)
- HTTP-only, secure, sameSite: lax

**Theme (SSR-compatible):**
```typescript
document.cookie = `theme=${themeName}; max-age=31536000; path=/`;
```

---

## ⚡ PERFORMANCE OPTIMIZATIONS

### Development Performance

**Turbopack Configuration:**
- Dev server startup: **862ms** (95% improvement!)
- Hot Module Replacement: Sub-second
- TypeScript: Incremental compilation
- Source maps: `cheap-module-source-map`

**next.config.mjs Optimizations:**
```javascript
reactStrictMode: !isDev, // Only in production
modularizeImports: {
  'lucide-react': {
    transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
  },
  'framer-motion': {
    transform: 'framer-motion/dist/es/{{member}}',
  }
}
```

### Production Performance

**Code Splitting:**
```javascript
splitChunks: {
  cacheGroups: {
    three: { // Three.js in separate chunk
      test: /[\\/]node_modules[\\/](three|@react-three)/,
      name: 'three',
      priority: 10,
    },
    maps: { // Map libraries in separate chunk
      test: /[\\/]node_modules[\\/](maplibre-gl|mapbox-gl|supercluster)/,
      name: 'maps',
      priority: 9,
    }
  }
}
```

**Bundle Size:**
- Main bundle: ~350KB gzipped
- Three.js chunk: ~150KB gzipped
- Maps chunk: ~100KB gzipped

### Component Optimizations

**1. AnimatedMarker (90-95% CPU Reduction):**
- Removed continuous `requestAnimationFrame` loop
- Static canvas rendering
- Redraws only on prop changes
- CSS-only shimmer on hover (GPU accelerated)
- `useMemo` for theme calculation
- `useCallback` for drawMarker function

**Before:**
```typescript
useEffect(() => {
  const animate = () => {
    drawMarker(); // 60fps continuous
    animationId = requestAnimationFrame(animate);
  };
  animate();
}, []);
```

**After:**
```typescript
useEffect(() => {
  drawMarker(); // Only on prop change
}, [isSelected, isHovered, isLight]);
```

**2. Image Loading:**
- Next.js Image component with automatic optimization
- Lazy loading with `loading="lazy"`
- Responsive sizes attribute
- Priority loading for above-fold images

**3. Font Loading:**
- @fontsource for self-hosted fonts
- Preload critical fonts
- Font-display: swap

### Service Worker (PWA)

**Caching Strategies:**
```javascript
runtimeCaching: [
  {
    urlPattern: /^https:\/\/fonts\.googleapis\.com/,
    handler: 'StaleWhileRevalidate',
    options: { cacheName: 'google-fonts' }
  },
  {
    urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/,
    handler: 'CacheFirst',
    options: {
      cacheName: 'images',
      expiration: { maxEntries: 200, maxAgeSeconds: 86400 }
    }
  }
]
```

---

## 🎨 STYLING & DESIGN

### Tailwind Configuration

**Custom Theme Extensions:**
```javascript
theme: {
  extend: {
    colors: {
      emerald: { /* custom emerald palette */ },
      purple: { /* custom purple palette */ }
    },
    backdropBlur: {
      xs: '2px'
    },
    animation: {
      'spin-slow': 'spin 3s linear infinite',
      'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
    }
  }
}
```

### Glassmorphism Pattern

**Light Mode:**
```tsx
className="bg-white/80 backdrop-blur-sm border-gray-300 shadow-md"
style={{
  backdropFilter: "blur(10px) saturate(150%)",
  WebkitBackdropFilter: "blur(10px) saturate(150%)"
}}
```

**Dark Mode:**
```tsx
className="bg-gray-900/85 backdrop-blur-md border-gray-800 shadow-xl"
```

### Color Palette

**Light Mode:**
- Backgrounds: `white/80`, `gray-50`, `blue-50`, `emerald-50`
- Text: `gray-900` (primary), `gray-700` (secondary), `gray-500` (muted)
- Accents: `blue-600`, `emerald-500`
- Borders: `gray-300`, `gray-200`

**Dark Mode:**
- Backgrounds: `black`, `gray-900`, `zinc-900`
- Text: `white`, `gray-300`, `neutral-400`
- Accents: `emerald-400`, `purple-600`
- Borders: `gray-800`, `zinc-800`

### Responsive Design

**Breakpoints:**
```css
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */
```

**Mobile-First Approach:**
```tsx
<div className="w-full md:w-1/2 lg:w-1/3">
  {/* Full width on mobile, half on tablet, third on desktop */}
</div>
```

---

## 📚 FILE STRUCTURE REFERENCE

```
src/app/
├── components/
│   ├── mls/
│   │   └── map/
│   │       ├── MapView.tsx
│   │       ├── MapPageClient.tsx
│   │       ├── AnimatedMarker.tsx (90% CPU optimized)
│   │       ├── AnimatedCluster.tsx
│   │       ├── ListingBottomPanel.tsx (glassmorphism)
│   │       ├── FavoritesPannel.tsx
│   │       ├── MapGlobeLoader.tsx (3D loader)
│   │       └── PannelCarousel.tsx
│   ├── chatwidget/
│   │   ├── IntegratedChatWidget.tsx (AI chat)
│   │   └── ChatHistory.tsx
│   ├── backgrounds/
│   │   ├── SpaticalBackground.tsx (theme-aware)
│   │   ├── ThreeStars.tsx (2500 particles)
│   │   └── StarsCanvas.tsx
│   ├── subdivisions/
│   │   ├── SubdivisionListings.tsx
│   │   ├── SubdivisionPhotoCarousel.tsx
│   │   └── SubdivisionStats.tsx
│   ├── cities/
│   │   ├── CityStats.tsx
│   │   ├── SubdivisionsSection.tsx
│   │   └── HOASection.tsx
│   ├── navbar/
│   │   ├── Navbar.tsx
│   │   ├── MobileMenuButton.tsx
│   │   └── Logo.tsx
│   ├── ThemeToggle.tsx
│   ├── ClientLayoutWrapper.tsx (ThemeProvider)
│   └── Footer.tsx
├── contexts/
│   ├── ThemeContext.tsx (theme management)
│   └── ChatProvider.tsx (chat state)
├── utils/
│   └── map/
│       ├── useListings.ts
│       └── useSwipeQueue.ts
└── (routes)/
    ├── page.tsx (landing/chat page)
    ├── map/page.tsx
    ├── neighborhoods/
    │   └── [cityId]/
    │       ├── page.tsx
    │       └── [slug]/page.tsx
    └── insights/
        └── [slug]/page.tsx
```

---

## 🔮 FUTURE ENHANCEMENTS

### Planned Improvements
- [ ] Additional themes (ocean blue, sunset gradient)
- [ ] Custom theme builder
- [ ] System preference detection (`prefers-color-scheme`)
- [ ] Theme transition animations
- [ ] High contrast mode (accessibility)
- [ ] Chap experience (Chat + Map unified)
- [ ] Voice input for chat
- [ ] AR map view

### Performance Goals
- [ ] Cloudinary image optimization (40-60% bandwidth savings)
- [ ] Redis caching for API responses
- [ ] Photo carousel pagination
- [ ] Further bundle size reduction

---

**This document reflects the current frontend architecture as of January 2025.**
**For backend architecture, see:** [MASTER_SYSTEM_ARCHITECTURE.md](./platform/MASTER_SYSTEM_ARCHITECTURE.md)

### **📖 Theme Implementation Guide**

**IMPORTANT:** For detailed theme implementation patterns, examples, and best practices, see:

**[THEME_IMPLEMENTATION_GUIDE.md](./THEME_IMPLEMENTATION_GUIDE.md)**

This guide includes:
- ✅ Correct background implementation patterns
- ❌ Common mistakes to avoid
- 📖 Complete code examples (admin pages, forms, tables, modals)
- 🎨 Available theme classes reference
- 🔍 When to use conditional logic
- ✅ Implementation checklist

**Quick Reference:**
- **DO NOT** use `bgPrimary` on page containers
- **DO** use `className="min-h-screen py-12 px-4"` for page wrappers
- **DO** use `${cardBg}` for cards, modals, and containers
- **DO** use `${bgSecondary}` for inputs and form elements


---

## 📱 RESPONSIVE DESIGN

For complete responsive design standards and implementation patterns, see:

**[RESPONSIVE_DESIGN.md](./RESPONSIVE_DESIGN.md)**

This guide includes:
- 📱 Breakpoint strategy for iPhone, iPad, MacBook 13", Desktop 2XL
- 📐 Container width patterns and typography scaling
- ✋ Touch target standards (44px minimum)
- 🎨 Layout patterns by component type (admin pages, forms, tables)
- 📊 Table vs card view responsive patterns
- 🖼️ Preview panel: modal (mobile) vs sidebar (desktop)
- 🎯 Performance optimization guidelines
- ✅ Device and functionality testing checklists

**Key Breakpoints:**
- Mobile: `< 640px` (sm)
- Tablet: `768px - 1024px` (md - lg)
- Laptop: `1024px - 1280px` (lg - xl)
- Desktop: `1280px+` (xl - 2xl)

---

## ✍️ CONTENT WRITING & CMS

For content creation workflow and article writing guidelines, see:

**[VPS_CLAUDE_CONTENT_WRITER.md](./VPS_CLAUDE_CONTENT_WRITER.md)**

This guide includes:
- ✍️ Article writing style guide and tone
- 📝 Article structure patterns (listicle, guide, educational)
- 🗄️ MongoDB Article model schema
- 🔄 Creating articles workflow
- 🌿 Git workflow for draft articles
- 🖼️ Cloudinary image management
- 📊 CMS review and publishing process
- 🔍 SEO best practices for real estate content

**Quick Reference:**
- Always create articles with `status: "draft"`
- Use action-oriented, opportunity-focused language
- Include CTAs with contact information
- Optimize for local SEO (Coachella Valley keywords)
- Push to GitHub for CMS review before publishing

