# Frontend Architecture Documentation

**Version:** 2.0
**Last Updated:** 2025-01-23
**Project:** ChatRealty / JPSRealtor
**Framework:** Next.js 16.0.3 (App Router) + React 19.0.0

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Technology Stack](#technology-stack)
3. [Directory Structure](#directory-structure)
4. [Component Architecture](#component-architecture)
5. [State Management](#state-management)
6. [Routing & Navigation](#routing--navigation)
7. [Theme System](#theme-system)
8. [API Integration](#api-integration)
9. [Performance Optimization](#performance-optimization)
10. [Key Features](#key-features)
11. [Development Patterns](#development-patterns)

---

## Executive Summary

The JPSRealtor frontend is a high-performance Next.js 16 application leveraging React Server Components, App Router, and Turbopack for optimal performance. The architecture emphasizes:

- **Component Modularity**: Atomic design with reusable components
- **Type Safety**: Full TypeScript coverage with strict mode
- **Performance**: Code splitting, lazy loading, and optimistic UI updates
- **Theme Flexibility**: Dynamic theme switching (lightgradient/blackspace)
- **AI-First**: Conversational search interface powered by Groq AI
- **Map-Centric**: Enterprise-grade map system with clustering and tile optimization

**Core Principle**: Every component should be self-contained, theme-aware, and optimized for both mobile and desktop.

---

## Technology Stack

### Core Framework
```json
{
  "next": "16.0.3",
  "react": "19.0.0",
  "react-dom": "19.0.0",
  "typescript": "5.7.2"
}
```

### UI & Styling
- **Tailwind CSS** 3.4.17 - Utility-first CSS framework
- **Framer Motion** 11.15.0 - Animations and transitions
- **Radix UI** - Accessible UI primitives
  - `@radix-ui/react-dialog` 1.1.4
  - `@radix-ui/react-dropdown-menu` 2.2.3
  - `@radix-ui/react-tabs` 1.2.1
- **Lucide React** 0.469.0 - Icon system

### Map & Geospatial
- **MapLibre GL** 4.7.1 - Open-source map rendering
- **Supercluster** 8.0.1 - High-performance point clustering
- **Turf.js** 7.1.0 - Geospatial analysis

### State Management
- **React Context API** - Global theme and chat state
- **URL State** - Search params, map view
- **localStorage** - Persistence layer for chat history

### AI & API Integration
- **Groq SDK** 0.8.0 - AI chat interface
- **SWR** - Data fetching (if applicable)
- **Axios** - HTTP client for API calls

### Authentication (via PayloadCMS)
- **JWT-based tokens** from PayloadCMS backend
- **HTTP-only cookies** for secure session management
- **OAuth bridge** through Next.js API routes

---

## Directory Structure

```
src/app/
├── (routes)/
│   ├── page.tsx                          # Homepage
│   ├── map/page.tsx                      # Map view page
│   ├── neighborhoods/[cityId]/[slug]/    # Subdivision pages
│   │   └── SubdivisionPageClient.tsx
│   ├── listing/[listingId]/              # Listing detail pages
│   │   └── ListingClient.tsx
│   └── auth/                             # Auth pages
│       ├── signin/page.tsx
│       └── signup/page.tsx
│
├── components/
│   ├── chat/                             # Chat-related components
│   │   ├── ChatMapView.tsx               # Map integration for chat
│   │   ├── ChatProvider.tsx              # Chat context provider
│   │   └── ListingCarousel.tsx           # Listing display carousel
│   │
│   ├── chatwidget/                       # Chat widget components
│   │   ├── IntegratedChatWidget.tsx      # Main chat orchestrator
│   │   ├── AnimatedChatInput.tsx         # Chat input UI
│   │   ├── MessageBubble.tsx             # Message rendering
│   │   ├── LoadingIndicator.tsx          # Loading states
│   │   └── ErrorMessage.tsx              # Error UI
│   │
│   ├── mls/                              # MLS/Listing components
│   │   ├── CollageHero.tsx               # Hero image gallery
│   │   ├── ListingClient.tsx             # Listing detail view
│   │   └── map/
│   │       ├── MapView.tsx               # Main map component
│   │       ├── MapPageClient.tsx         # Map page orchestrator
│   │       ├── MapGlobeLoader.tsx        # 3D globe loader
│   │       ├── ListingBottomPanel.tsx    # Swipe review panel
│   │       └── MortgageCalculator.tsx    # Calculator widget
│   │
│   ├── ClientLayoutWrapper.tsx           # Client-side layout
│   └── EnhancedSidebar.tsx               # Navigation sidebar
│
├── contexts/
│   └── ThemeContext.tsx                  # Theme provider & state
│
├── api/                                  # API routes (Next.js)
│   ├── chat/
│   │   ├── stream/route.ts               # Streaming AI chat
│   │   └── match-location/route.ts       # Location matching
│   ├── auth/
│   │   └── [...nextauth]/route.ts        # OAuth bridge to Payload
│   ├── mls-listings/                     # Direct MongoDB queries
│   └── subdivisions/                     # Subdivision listings
│
├── lib/                                  # Utilities and helpers
│   ├── groq.ts                           # Groq AI client
│   ├── ai-functions.ts                   # AI function calling
│   ├── location-matcher.ts               # Location NLP parsing
│   └── mongodb.ts                        # MongoDB client
│
├── hooks/                                # Custom React hooks
│   ├── useScrollPosition.ts
│   ├── useAutoScroll.ts
│   ├── useUserData.ts
│   └── useConversationPersistence.ts
│
├── types/
│   └── types.ts                          # TypeScript definitions
│
├── models/
│   └── listings.ts                       # Mongoose schemas
│
├── utils/
│   └── chat/                             # Chat utilities
│       ├── parseMarkdown.tsx
│       ├── chatLogger.ts
│       ├── mapUtils.ts
│       └── messageFormatters.ts
│
└── globals.css                           # Global styles + Tailwind

public/
├── tiles/                                # Pre-generated map tiles
│   └── [zoom]/[x]/[y].json
└── theme-init.js                         # Theme flash prevention
```

---

## Component Architecture

### 1. Core Layout Components

#### **ClientLayoutWrapper.tsx**
**Purpose**: Client-side layout orchestrator that manages theme and sidebar state.

**Key Responsibilities**:
- Theme context provision
- Sidebar visibility state
- Mobile responsiveness
- Layout persistence

**Props**: `{ children: ReactNode }`

**State**:
```typescript
const [isSidebarOpen, setIsSidebarOpen] = useState(true);
```

---

#### **EnhancedSidebar.tsx**
**Purpose**: Navigation sidebar with theme-aware styling.

**Key Features**:
- User authentication status
- Navigation links (Home, Map, Neighborhoods, Favorites)
- Theme toggle button
- Mobile drawer behavior

**Theme Integration**:
```typescript
const { theme } = useTheme();
const bgClass = theme === 'lightgradient'
  ? 'bg-gradient-to-br from-blue-50 to-purple-50'
  : 'bg-gradient-to-br from-gray-900 to-black';
```

---

### 2. Chat System Components

#### **IntegratedChatWidget.tsx** ⭐ CRITICAL COMPONENT
**Purpose**: Main orchestrator for AI chat, swipe mode, and listing interactions.

**State Management**:
```typescript
// Chat state
const [messages, setMessages] = useState<Message[]>([]);
const [isStreaming, setIsStreaming] = useState(false);
const [inputValue, setInputValue] = useState('');

// Swipe mode state
const [swipeMode, setSwipeMode] = useState<{
  enabled: boolean;
  session: SwipeSession | null;
  source: 'chat' | 'map' | null;
}>({ enabled: false, session: null, source: null });

// Listing panel state
const [selectedListing, setSelectedListing] = useState<any | null>(null);
const [showListingPanel, setShowListingPanel] = useState(false);
```

**Key Methods**:
- `handleSendMessage()` - Sends user message, streams AI response
- `handleViewListingsInSwipeMode()` - Initiates swipe review session
- `handleSwipeLeft/Right()` - Navigation through listings
- `handleSwipeSessionComplete()` - Records session analytics

**Data Flow**:
```
User Input → handleSendMessage()
           → /api/chat/stream
           → Groq AI (llama-3.1-70b-versatile)
           → Stream response back
           → Parse for listing IDs
           → Fetch listings from MongoDB
           → Display in ListingCarousel
           → User clicks "View in Swipe Mode"
           → handleViewListingsInSwipeMode()
           → Open ListingBottomPanel
```

**File Reference**: `src/app/components/chatwidget/IntegratedChatWidget.tsx:1`

---

#### **ChatProvider.tsx**
**Purpose**: Context provider for chat state across components.

**Context Shape**:
```typescript
interface ChatContextType {
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}
```

---

#### **AnimatedChatInput.tsx**
**Purpose**: Theme-aware chat input with animations.

**Features**:
- Auto-resize textarea
- Send button with loading state
- Enter to send (Shift+Enter for new line)
- Framer Motion animations

**Theme Styling**:
```typescript
const inputBg = theme === 'lightgradient'
  ? 'bg-white/90 border-purple-200'
  : 'bg-gray-800/90 border-gray-700';
```

---

#### **MessageBubble.tsx**
**Purpose**: Renders individual chat messages with markdown support.

**Features**:
- Markdown parsing (bold, italic, links, lists)
- Code block syntax highlighting
- User vs Assistant styling
- Timestamp display

**Markdown Parser**: `src/app/utils/chat/parseMarkdown.tsx`

---

### 3. Listing Components

#### **ListingCarousel.tsx**
**Purpose**: Displays listing results in a horizontal scrollable carousel.

**Props**:
```typescript
interface ListingCarouselProps {
  listings: Listing[];
  onViewInSwipeMode?: (listings: Listing[]) => void;
  meta?: {
    subdivision?: string;
    subdivisionSlug?: string;
    cityId?: string;
  };
}
```

**Features**:
- Horizontal scroll with snap points
- Listing cards with image, price, beds/baths
- "View in Swipe Mode" button
- Loading skeletons

**File Reference**: `src/app/components/chat/ListingCarousel.tsx:1`

---

#### **ListingBottomPanel.tsx** ⭐ SWIPE MODE UI
**Purpose**: Bottom sheet panel for swipe review mode.

**Props**:
```typescript
interface ListingBottomPanelProps {
  listing: MapListing;
  fullListing?: IListing;
  onClose: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  swipeModeEnabled?: boolean;
  swipeProgress?: {
    current: number;
    total: number;
  };
}
```

**Key Features**:
- Full-screen mobile view
- Listing details (price, beds, baths, sqft)
- Image gallery
- Swipe navigation buttons
- Progress indicator (e.g., "3/12")
- Save to favorites button
- Close/exit button

**Swipe Handlers**:
- **Left Swipe** → Mark as "Not Interested", move to next
- **Right Swipe** → Save to favorites, move to next
- **Close** → Exit swipe mode, save analytics

**File Reference**: `src/app/components/mls/map/ListingBottomPanel.tsx:1`

---

#### **CollageHero.tsx**
**Purpose**: Hero section for listing detail pages with image gallery.

**Features**:
- 5-image collage layout
- Lightbox modal on click
- Responsive grid (desktop: 3-col, mobile: single)
- Lazy loading images

---

#### **ListingClient.tsx**
**Purpose**: Full listing detail page with all property information.

**Sections**:
- Hero images (CollageHero)
- Price and key stats
- Property description
- Features list
- Map location
- Mortgage calculator
- Similar listings

---

### 4. Map Components

#### **MapView.tsx** ⭐ ENTERPRISE MAP SYSTEM
**Purpose**: High-performance map with clustering and tile rendering.

**Technology**:
- MapLibre GL JS 4.7.1
- Supercluster for point clustering
- Pre-generated GeoJSON tiles

**State**:
```typescript
const [viewport, setViewport] = useState({
  latitude: 33.8303,
  longitude: -116.5453,
  zoom: 10
});
const [clusters, setClusters] = useState<Cluster[]>([]);
const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
```

**Clustering Logic**:
```typescript
const supercluster = new Supercluster({
  radius: 75,
  maxZoom: 16,
  minZoom: 0,
  extent: 512,
  nodeSize: 64
});

supercluster.load(
  listings.map(listing => ({
    type: 'Feature',
    properties: listing,
    geometry: {
      type: 'Point',
      coordinates: [listing.longitude, listing.latitude]
    }
  }))
);
```

**Tile Loading**:
```typescript
// Load pre-generated tiles
const tileUrl = `/tiles/${zoom}/${x}/${y}.json`;
const response = await fetch(tileUrl);
const tileData = await response.json();
```

**Performance Optimizations**:
- Viewport-based rendering (only visible tiles)
- WebGL-accelerated rendering
- Debounced viewport updates
- Marker sprite sheets

**File Reference**: `src/app/components/mls/map/MapView.tsx:1`

---

#### **MapPageClient.tsx**
**Purpose**: Page-level orchestrator for map view with filters and search.

**Features**:
- Filter panel (price, beds, baths, sqft)
- Search bar integration
- Listing detail panel
- URL state management for filters

---

#### **MapGlobeLoader.tsx**
**Purpose**: Animated 3D globe loader for initial map load.

**Technology**: Three.js + React Three Fiber

**Features**:
- Rotating Earth globe
- Zoom-in animation
- Smooth transition to map

---

### 5. Subdivision Components

#### **SubdivisionPageClient.tsx**
**Purpose**: Neighborhood/subdivision detail pages.

**Features**:
- Subdivision overview
- Active listings grid
- Statistics (median price, DOM, inventory)
- Map view of subdivision boundaries
- Schools information
- Walk score integration

---

## State Management

### 1. Theme Context (`ThemeContext.tsx`)

**Purpose**: Global theme state management.

**Context Provider**:
```typescript
interface ThemeContextType {
  theme: 'lightgradient' | 'blackspace';
  setTheme: (theme: 'lightgradient' | 'blackspace') => void;
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<'lightgradient' | 'blackspace'>('lightgradient');

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem('theme');
    if (saved === 'lightgradient' || saved === 'blackspace') {
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    // Persist to localStorage and body class
    localStorage.setItem('theme', theme);
    document.body.className = theme;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
```

**Usage in Components**:
```typescript
import { useTheme } from '@/app/contexts/ThemeContext';

const MyComponent = () => {
  const { theme } = useTheme();

  const bgClass = theme === 'lightgradient'
    ? 'bg-gradient-to-br from-blue-50 to-purple-50'
    : 'bg-gradient-to-br from-gray-900 to-black';

  return <div className={bgClass}>Content</div>;
};
```

**File Reference**: `src/app/contexts/ThemeContext.tsx:1`

---

### 2. URL State (Search Params)

**Pattern**: Store filter state in URL for shareable links.

**Example** (Map filters):
```typescript
// Read from URL
const searchParams = useSearchParams();
const minPrice = searchParams.get('minPrice');
const maxPrice = searchParams.get('maxPrice');
const beds = searchParams.get('beds');

// Update URL
const router = useRouter();
const params = new URLSearchParams();
params.set('minPrice', '300000');
params.set('maxPrice', '500000');
params.set('beds', '3');
router.push(`/map?${params.toString()}`);
```

---

### 3. localStorage Persistence

**Chat History**:
```typescript
// Save conversation
localStorage.setItem(`chat_${userId}_${conversationId}`, JSON.stringify(messages));

// Load conversation
const saved = localStorage.getItem(`chat_${userId}_${conversationId}`);
const messages = saved ? JSON.parse(saved) : [];
```

**Favorites**:
```typescript
// Save favorite listings
const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
favorites.push(listingId);
localStorage.setItem('favorites', JSON.stringify(favorites));
```

---

## Routing & Navigation

### App Router Structure

**Next.js 16 App Router** with file-based routing:

```
app/
├── page.tsx                                # / (Homepage)
├── map/page.tsx                            # /map
├── neighborhoods/[cityId]/[slug]/page.tsx  # /neighborhoods/palm-desert/palm-desert-country-club
├── listing/[listingId]/page.tsx            # /listing/GPS123456
└── auth/signin/page.tsx                    # /auth/signin
```

### Dynamic Routes

**Subdivision Pages**:
```typescript
// app/neighborhoods/[cityId]/[slug]/page.tsx
export default async function SubdivisionPage({
  params
}: {
  params: Promise<{ cityId: string; slug: string }>
}) {
  const { cityId, slug } = await params;

  // Fetch subdivision data
  const subdivision = await fetchSubdivision(cityId, slug);

  return <SubdivisionPageClient subdivision={subdivision} />;
}
```

**Listing Detail Pages**:
```typescript
// app/listing/[listingId]/page.tsx
export default async function ListingPage({
  params
}: {
  params: Promise<{ listingId: string }>
}) {
  const { listingId } = await params;

  // Fetch listing data
  const listing = await fetchListing(listingId);

  return <ListingClient listing={listing} />;
}
```

### Programmatic Navigation

```typescript
import { useRouter } from 'next/navigation';

const router = useRouter();

// Navigate to page
router.push('/map');

// Navigate with query params
router.push('/map?minPrice=300000&maxPrice=500000');

// Replace (no history entry)
router.replace('/map');

// Back
router.back();
```

---

## Theme System

### Two Themes: `lightgradient` and `blackspace`

#### **lightgradient** (Default)
- Background: Blue-to-purple gradients
- Text: Dark gray (#1f2937)
- Cards: White with subtle shadows
- Use case: General browsing, daytime use

#### **blackspace**
- Background: Black-to-gray gradients with spatial effects
- Text: Light gray/white
- Cards: Dark gray with glowing borders
- Use case: Night mode, immersive experience

### Theme Implementation Pattern

**CSS Classes**:
```typescript
const getThemeClasses = (theme: 'lightgradient' | 'blackspace') => ({
  background: theme === 'lightgradient'
    ? 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
    : 'bg-gradient-to-br from-gray-900 via-black to-gray-800',

  text: theme === 'lightgradient'
    ? 'text-gray-900'
    : 'text-gray-100',

  card: theme === 'lightgradient'
    ? 'bg-white border border-gray-200 shadow-sm'
    : 'bg-gray-800 border border-gray-700 shadow-xl',

  button: theme === 'lightgradient'
    ? 'bg-purple-600 hover:bg-purple-700 text-white'
    : 'bg-blue-500 hover:bg-blue-600 text-white',

  input: theme === 'lightgradient'
    ? 'bg-white border-gray-300 text-gray-900'
    : 'bg-gray-800 border-gray-600 text-gray-100'
});
```

### Flash Prevention

**Problem**: Theme flash on page load (wrong theme briefly visible).

**Solution**: Inline script in `<head>` that runs before React hydration.

**File**: `public/theme-init.js`
```javascript
(function() {
  const theme = localStorage.getItem('theme') || 'lightgradient';
  document.body.className = theme;
  document.documentElement.style.colorScheme = theme === 'blackspace' ? 'dark' : 'light';
})();
```

**Integration**: Referenced in `app/layout.tsx`
```typescript
<Script src="/theme-init.js" strategy="beforeInteractive" />
```

---

## API Integration

### API Route Pattern

**Next.js API Routes** (`app/api/`) serve as the backend layer.

#### **Chat Streaming** (`/api/chat/stream/route.ts`)

**Purpose**: Stream AI responses from Groq.

**Request**:
```typescript
POST /api/chat/stream
{
  "messages": [
    { "role": "user", "content": "show me homes in palm desert" }
  ],
  "userId": "user123",
  "userTier": "free"
}
```

**Response**: Server-Sent Events (SSE) stream
```typescript
data: {"type":"chunk","content":"I found"}
data: {"type":"chunk","content":" 12 homes"}
data: {"type":"listings","listingIds":["GPS123","GPS456"]}
data: {"type":"done"}
```

**Frontend Integration**:
```typescript
const handleSendMessage = async (message: string) => {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [...messages, { role: 'user', content: message }],
      userId: user?.id,
      userTier: user?.subscriptionTier || 'free'
    })
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));

        if (data.type === 'chunk') {
          // Append to message
          setStreamingContent(prev => prev + data.content);
        } else if (data.type === 'listings') {
          // Fetch and display listings
          fetchListings(data.listingIds);
        }
      }
    }
  }
};
```

**File Reference**: `src/app/api/chat/stream/route.ts:1`

---

#### **Location Matching** (`/api/chat/match-location/route.ts`)

**Purpose**: Parse user queries for location entities (cities, neighborhoods).

**Request**:
```typescript
POST /api/chat/match-location
{
  "query": "show me homes in palm desert country club"
}
```

**Response**:
```typescript
{
  "city": "Palm Desert",
  "cityId": "palm-desert",
  "subdivision": "Palm Desert Country Club",
  "subdivisionSlug": "palm-desert-country-club",
  "confidence": 0.95
}
```

**File Reference**: `src/app/api/chat/match-location/route.ts:1`

---

#### **MLS Listings** (`/api/mls-listings/*`)

**Purpose**: Direct MongoDB queries for listing data (performance-critical).

**Endpoints**:
- `GET /api/mls-listings` - Search listings
- `GET /api/mls-listings/[id]` - Get single listing
- `GET /api/mls-listings/subdivision/[slug]` - Subdivision listings

**Example**:
```typescript
GET /api/mls-listings?city=Palm+Desert&minPrice=300000&maxPrice=500000&beds=3

Response:
{
  "listings": [...],
  "total": 47,
  "page": 1,
  "limit": 20
}
```

---

### Authentication Flow

**Pattern**: PayloadCMS JWT tokens stored in HTTP-only cookies.

**Login Flow**:
```typescript
// 1. User submits credentials
const login = async (email: string, password: string) => {
  const response = await fetch('https://cms.jpsrealtor.com/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const { token, user } = await response.json();

  // 2. Store token in HTTP-only cookie via Next.js API route
  await fetch('/api/auth/set-token', {
    method: 'POST',
    body: JSON.stringify({ token })
  });

  // 3. Update client state
  setUser(user);
  router.push('/');
};
```

**OAuth Flow**:
```typescript
// 1. User clicks "Sign in with Google"
router.push('/api/auth/google');

// 2. Next.js API route redirects to Google OAuth
// 3. Google redirects back to /api/auth/google/callback
// 4. Next.js exchanges code for token
// 5. Next.js creates/updates user in PayloadCMS
// 6. Next.js sets JWT cookie and redirects to app
```

**File Reference**: `src/app/api/auth/[...nextauth]/route.ts:1`

---

## Performance Optimization

### 1. Code Splitting

**Dynamic Imports** for heavy components:

```typescript
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/app/components/mls/map/MapView'), {
  ssr: false,
  loading: () => <MapGlobeLoader />
});

const ListingBottomPanel = dynamic(() => import('@/app/components/mls/map/ListingBottomPanel'), {
  ssr: false
});
```

### 2. Image Optimization

**Next.js Image Component**:
```typescript
import Image from 'next/image';

<Image
  src={listing.photos[0]}
  alt={listing.address}
  width={800}
  height={600}
  quality={85}
  placeholder="blur"
  blurDataURL={listing.thumbnailBase64}
  loading="lazy"
/>
```

**Cloudinary Integration**:
```typescript
const optimizedUrl = listing.photos[0]
  .replace('/upload/', '/upload/w_800,h_600,c_fill,f_auto,q_auto/');
```

### 3. React Server Components

**Pattern**: Default to Server Components, use Client Components only when needed.

```typescript
// Server Component (default)
export default async function SubdivisionPage({ params }) {
  const data = await fetchSubdivision(params.slug);
  return <SubdivisionPageClient data={data} />;
}

// Client Component (interactive)
'use client';
export default function SubdivisionPageClient({ data }) {
  const [filter, setFilter] = useState('all');
  // ...
}
```

### 4. Map Tile Pre-generation

**Strategy**: Pre-generate GeoJSON tiles at build time, serve as static files.

**Build Script**: `src/scripts/generate-map-tiles.ts`
```typescript
// Generate tiles for zoom levels 5-13
for (let zoom = 5; zoom <= 13; zoom++) {
  const tiles = generateTilesForZoom(listings, zoom);

  for (const tile of tiles) {
    fs.writeFileSync(
      `public/tiles/${zoom}/${tile.x}/${tile.y}.json`,
      JSON.stringify(tile.features)
    );
  }
}
```

**Result**: ~10,000 static tile files, average 5KB each, served via CDN.

### 5. Debouncing & Throttling

**Map Viewport Updates**:
```typescript
import { debounce } from 'lodash';

const handleViewportChange = debounce((viewport) => {
  setViewport(viewport);
  loadVisibleTiles(viewport);
}, 300);
```

**Search Input**:
```typescript
const handleSearchChange = debounce((query: string) => {
  searchListings(query);
}, 500);
```

---

## Key Features

### 1. Swipe Review Mode

**Purpose**: Tinder-like interface for reviewing listings.

**Components**:
- `IntegratedChatWidget.tsx` - Orchestrator
- `ListingBottomPanel.tsx` - UI
- `SwipeSession` type - State management

**Data Flow**:
```
Chat → "show me homes in palm desert"
    → AI returns 12 listings
    → ListingCarousel displays results
    → User clicks "View in Swipe Mode"
    → IntegratedChatWidget.handleViewListingsInSwipeMode()
    → Opens ListingBottomPanel with first listing
    → User swipes left (not interested) or right (favorite)
    → Navigate to next listing
    → When done, save analytics to SwipeReviewSessions collection
```

**Analytics Tracked**:
- Session duration
- Listings viewed
- Swipe left count (not interested)
- Swipe right count (favorites)
- Conversion rate

**File Reference**: `src/app/components/chatwidget/IntegratedChatWidget.tsx:200`

---

### 2. AI-Powered Conversational Search

**Purpose**: Natural language search for listings.

**Example Queries**:
- "show me homes in palm desert under 500k"
- "find 3 bedroom houses with a pool in movie colony"
- "what neighborhoods are good for families in palm springs?"

**Pipeline**:
```
User Query → /api/chat/stream
           → Groq AI (llama-3.1-70b-versatile)
           → Function calling for location_match & listing_search
           → Parse extracted parameters (city, price, beds, features)
           → Query MongoDB listings collection
           → Return listing IDs to AI
           → AI formats response with listing details
           → Frontend displays in ListingCarousel
```

**AI Functions** (`src/lib/ai-functions.ts`):
- `location_match` - Extract city/subdivision from query
- `listing_search` - Search MongoDB with parameters
- `calculate_mortgage` - Estimate monthly payment
- `get_subdivision_stats` - Fetch neighborhood data

**File Reference**: `src/lib/ai-functions.ts:1`

---

### 3. Enterprise Map System

**Purpose**: High-performance map with 11,000+ listing markers.

**Technology Stack**:
- MapLibre GL JS (WebGL rendering)
- Supercluster (point clustering)
- Pre-generated GeoJSON tiles

**Performance Metrics**:
- 60 FPS at all zoom levels
- < 100ms tile load time
- < 50ms clustering computation
- Viewport-only rendering (only 50-200 visible markers at once)

**Clustering Logic**:
- Zoom 5-9: Cluster radius 100px
- Zoom 10-12: Cluster radius 75px
- Zoom 13+: No clustering (individual markers)

**Marker Types**:
- Cluster (shows count)
- Single listing (price badge)
- Selected listing (highlighted)

**File Reference**: `src/app/components/mls/map/MapView.tsx:1`

---

### 4. Theme Switching

**Purpose**: User preference for light vs dark mode with custom gradients.

**Themes**:
- **lightgradient**: Blue/purple gradients, white cards, dark text
- **blackspace**: Black/gray gradients with space effects, dark cards, light text

**Implementation**: React Context + localStorage + body class.

**File Reference**: `src/app/contexts/ThemeContext.tsx:1`

---

## Development Patterns

### 1. Component Structure

**Recommended Pattern**:
```typescript
'use client'; // If interactive

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import type { Listing } from '@/types/types';

interface MyComponentProps {
  listing: Listing;
  onSelect?: (listing: Listing) => void;
}

export default function MyComponent({ listing, onSelect }: MyComponentProps) {
  const { theme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = useCallback(() => {
    onSelect?.(listing);
  }, [listing, onSelect]);

  return (
    <div
      className={`
        ${theme === 'lightgradient' ? 'bg-white' : 'bg-gray-800'}
        rounded-lg p-4 transition-all
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* Content */}
    </div>
  );
}
```

### 2. Type Safety

**Always define prop types**:
```typescript
// ❌ Bad
export default function MyComponent({ data }) {
  // ...
}

// ✅ Good
interface MyComponentProps {
  data: ListingData;
  onUpdate: (id: string) => void;
}

export default function MyComponent({ data, onUpdate }: MyComponentProps) {
  // ...
}
```

### 3. Error Handling

**Pattern**: Try-catch with user-friendly error messages.

```typescript
const fetchListings = async () => {
  try {
    setIsLoading(true);
    const response = await fetch('/api/mls-listings');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    setListings(data.listings);
  } catch (error) {
    console.error('Failed to fetch listings:', error);
    setError('Unable to load listings. Please try again.');
  } finally {
    setIsLoading(false);
  }
};
```

### 4. Memoization

**Use `useMemo` and `useCallback` for expensive operations**:

```typescript
const filteredListings = useMemo(() => {
  return listings.filter(listing => {
    return listing.price >= minPrice && listing.price <= maxPrice;
  });
}, [listings, minPrice, maxPrice]);

const handleSelect = useCallback((listing: Listing) => {
  onSelect?.(listing);
  trackEvent('listing_selected', { id: listing.id });
}, [onSelect]);
```

### 5. Accessibility

**Always include ARIA labels and keyboard support**:

```typescript
<button
  onClick={handleClose}
  aria-label="Close panel"
  className="..."
>
  <X className="w-6 h-6" />
</button>

<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  aria-label={`View listing at ${listing.address}`}
>
  {/* Content */}
</div>
```

---

## Cross-References

- **Backend Architecture**: See `BACKEND_ARCHITECTURE.md`
- **Authentication Flow**: See `AUTH_ARCHITECTURE.md`
- **Database Schema**: See `DATABASE_ARCHITECTURE.md`
- **Multi-Tenant Strategy**: See `MULTI_TENANT_ARCHITECTURE.md`
- **Deployment**: See `DEPLOYMENT_PIPELINE.md`

---

## Next Steps for Developers

1. **Read** `RELOAD_PROJECT_MEMORY.md` for quick onboarding
2. **Review** component examples in `src/app/components/`
3. **Test** theme switching and swipe mode locally
4. **Understand** the chat → AI → listings data flow
5. **Explore** map system with clustering logic

**Questions?** Refer to `DEVELOPER_ONBOARDING.md` for FAQs and troubleshooting.
