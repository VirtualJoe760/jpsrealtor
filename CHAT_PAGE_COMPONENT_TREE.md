# Chat Page Component Tree

## Overview
This document maps out all components used in the root chat page (`src/app/page.tsx`), which serves as the main landing/chat interface for the application.

---

## Component Hierarchy

```
page.tsx (Root - Chat Page)
│
├── Providers (Wrappers)
│   ├── EnhancedChatProvider
│   └── MLSProvider
│
├── Background Components
│   └── StarsCanvas (from chatwidget/)
│
├── Utility Components
│   └── MLSPreloader
│
└── Main Views (Conditional Rendering)
    │
    ├── [DEFAULT VIEW] IntegratedChatWidget
    │   │
    │   ├── ChatProvider (context)
    │   ├── EnhancedChatProvider (context)
    │   ├── useSession (next-auth)
    │   │
    │   ├── AnimatedChatInput
    │   │   └── Lucide Icons: Send, Mic, MessageCircle, Loader2
    │   │
    │   ├── StarsCanvas (background)
    │   │
    │   ├── EnhancedSidebar (from chatwidget/)
    │   │   ├── Conversation history
    │   │   └── Navigation
    │   │
    │   ├── ListingCarousel (from chat/)
    │   │   ├── Listing cards with images
    │   │   ├── Favorite button (Heart icon)
    │   │   ├── MLSProvider context
    │   │   └── Icons: Home, Bed, Bath, Maximize2, Heart
    │   │
    │   ├── ChatMapView (from chat/)
    │   │   ├── MapLibre GL map
    │   │   ├── Marker components
    │   │   ├── Listing pins
    │   │   └── Icons: Home, MapPin
    │   │
    │   └── UI Elements
    │       ├── Message bubbles (User/Bot)
    │       ├── Loading indicators
    │       ├── Scroll to top button
    │       └── Icons: User, Bot, Loader2, MapPin
    │
    ├── ArticlesView
    │   └── Article listing interface
    │
    ├── DashboardViewIntegrated
    │   └── Dashboard metrics/stats
    │
    └── SubdivisionsView
        └── Subdivision browser
```

---

## Component File Locations

### Main Page
- `src/app/page.tsx` - Root page component

### Chat Components
- `src/app/components/chatwidget/IntegratedChatWidget.tsx` - Main chat interface
- `src/app/components/chatwidget/AnimatedChatInput.tsx` - Chat input with animations
- `src/app/components/chatwidget/StarsCanvas.tsx` - Animated starfield background
- `src/app/components/chatwidget/EnhancedSidebar.tsx` - Sidebar with history/nav
- `src/app/components/chatwidget/ArticlesView.tsx` - Articles view
- `src/app/components/chatwidget/DashboardViewIntegrated.tsx` - Dashboard view
- `src/app/components/chatwidget/SubdivisionsView.tsx` - Subdivisions view

### Shared Chat Components
- `src/app/components/chat/ChatProvider.tsx` - Chat context provider
- `src/app/components/chat/EnhancedChatProvider.tsx` - Enhanced features provider
- `src/app/components/chat/ListingCarousel.tsx` - Listing carousel component
- `src/app/components/chat/ChatMapView.tsx` - Embedded map view

### MLS Components
- `src/app/components/mls/MLSProvider.tsx` - MLS data provider
- `src/app/components/mls/MLSPreloader.tsx` - Background data preloader

---

## Key Dependencies

### External Libraries
| Library | Purpose | Used In |
|---------|---------|---------|
| `framer-motion` | Animations | All animated components |
| `@vis.gl/react-maplibre` | Map rendering | ChatMapView |
| `lucide-react` | Icon system | All UI components |
| `next-auth` | Authentication | IntegratedChatWidget |
| `next/navigation` | Routing | Page, IntegratedChatWidget |
| `next/image` | Image optimization | ListingCarousel, ChatMapView |
| `@mlc-ai/web-llm` | AI chat (WebLLM) | IntegratedChatWidget |

### Internal Utilities
| Utility | Purpose | Location |
|---------|---------|----------|
| `streamChatCompletion` | AI streaming | `/lib/webllm` |
| `getLocationWithCache` | User location | `/lib/geolocation` |
| `buildSystemPrompt` | AI prompts | `/lib/chat-utils` |
| `buildConversationHistory` | Chat history | `/lib/chat-utils` |
| `extractGoalsFromText` | Goal parsing | `/lib/chat-utils` |
| `detectFunctionCall` | Function detection | `/lib/ai-functions` |
| `executeMLSSearch` | MLS search | `/lib/ai-functions` |
| `formatSearchResultsForAI` | Result formatting | `/lib/ai-functions` |
| `fadeSlideIn` | Animation variants | `/app/utils/chat/motion` |
| `blurFade` | Animation variants | `/app/utils/chat/motion` |

---

## Context Providers

### ChatProvider
- **File:** `src/app/components/chat/ChatProvider.tsx`
- **Purpose:** Manages chat messages, user ID, and message operations
- **Key Features:**
  - Message state management
  - Add/clear message functions
  - User ID tracking

### EnhancedChatProvider
- **File:** `src/app/components/chat/EnhancedChatProvider.tsx`
- **Purpose:** Enhanced chat features and view management
- **Key Features:**
  - View switching (chat/articles/dashboard/subdivisions)
  - Chat mode management (landing/conversation/minimized)
  - Search results state
  - Animation controls

### MLSProvider
- **File:** `src/app/components/mls/MLSProvider.tsx`
- **Purpose:** MLS listing data management
- **Key Features:**
  - Listing data caching
  - Favorite listings
  - Data preloading

---

## Icon Usage

### Lucide React Icons Used
- `User` - User message avatar
- `Bot` - AI assistant avatar
- `Loader2` - Loading spinner
- `MapPin` - Location markers
- `Heart` - Favorite button
- `Home` - Property icon
- `Bed` - Bedroom count
- `Bath` - Bathroom count
- `Maximize2` - Square footage
- `Send` - Send message button
- `Mic` - Voice input button
- `MessageCircle` - Minimized chat icon

---

## State Management

### URL State Synchronization
- **Component:** `URLSyncHandler` (in page.tsx)
- **Purpose:** Syncs URL params with view state
- **Params:**
  - `?view=chat` (default)
  - `?view=articles`
  - `?view=dashboard`
  - `?view=subdivisions`
  - `?conversation=<id>` - Load specific conversation

### Local Storage
- **Conversation History:** Stored per conversation ID
- **User Preferences:** Chat settings and favorites
- **Message Cache:** Recent chat messages

---

## Animation System

### Motion Variants
- **blurFade** - Blur and fade in effect for view transitions
- **fadeSlideIn** - Slide up with fade for messages
- **AnimatePresence** - Framer Motion component for exit animations

### Transitions
- Spring animations for smooth, natural motion
- Stagger animations for message lists
- Hover/tap interactions on buttons and cards

---

## Data Flow

```
User Input (AnimatedChatInput)
    ↓
IntegratedChatWidget (handleSend)
    ↓
AI Processing (Groq API / WebLLM)
    ↓
Function Detection (detectFunctionCall)
    ↓
MLS Search (executeMLSSearch) OR Location Match
    ↓
Results Display (ListingCarousel + ChatMapView)
    ↓
User Interaction (View details, Favorite, etc.)
```

---

## Mobile Considerations

### Responsive Breakpoints
- **Mobile:** `< 768px` (md breakpoint)
- **Desktop:** `>= 768px`

### Mobile-Specific Features
- Touch gestures on carousel
- Simplified input on mobile
- Adjusted spacing and font sizes
- Collapsed sidebar on mobile

### Known Mobile Issues (To Fix)
- Layout breaks on certain screen sizes
- Input positioning on mobile keyboards
- Map interaction on touch devices
- Carousel scroll behavior

---

## Performance Optimizations

### Code Splitting
- Dynamic imports for heavy components
- Lazy loading for map libraries
- Suspense boundaries for async components

### Caching
- MLS data preloading
- Image optimization via Next.js Image
- Conversation history in localStorage
- Location data caching

### Rendering Optimizations
- React.memo for expensive components
- useMemo for computed values
- Debounced scroll events
- Virtual scrolling for long message lists

---

## Future Improvements

1. **Component Consolidation**
   - Merge duplicate StarsCanvas components
   - Standardize naming conventions
   - Create shared UI component library

2. **Mobile Optimization**
   - Fix layout issues on small screens
   - Improve touch interactions
   - Optimize map performance on mobile
   - Better keyboard handling

3. **Performance**
   - Implement virtual scrolling for messages
   - Optimize animation performance
   - Reduce bundle size
   - Improve initial load time

4. **Code Quality**
   - Remove unused components
   - Consolidate providers
   - Improve TypeScript types
   - Add comprehensive error boundaries

---

## Last Updated
November 19, 2025
