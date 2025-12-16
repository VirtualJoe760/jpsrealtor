# SwipePanel Architecture - Scalable Multi-Context Implementation

## Executive Summary

This document outlines the refactoring of `ListingBottomPanel` into `SwipePanel` with a context-aware queue management system that works seamlessly across Map, Chat, Dashboard, and Insights views.

## Current State Analysis

### Existing Components

1. **useSwipeQueue Hook** (`src/app/utils/map/useSwipeQueue.ts`)
   - ✅ Excellent smart scoring algorithm (7-tier prioritization)
   - ✅ Geographic proximity-based queue building
   - ✅ Price bracket compatibility filtering
   - ✅ Property subtype matching
   - ✅ Exclude keys management (already swiped listings)
   - ❌ Tightly coupled to map-based initialization (requires clicked listing)
   - ❌ No support for AI-driven query results

2. **ListingBottomPanel** (`src/app/components/mls/map/ListingBottomPanel.tsx`)
   - ✅ Beautiful 3D swipe animations
   - ✅ Responsive layout across devices
   - ✅ Internal data fetching via slugAddress
   - ❌ Named for map-specific use
   - ❌ No centralized queue management

3. **ChatWidget Queue** (`src/app/components/chat/ChatWidget.tsx`)
   - ✅ Simple array-based queue management
   - ✅ API data enrichment
   - ❌ Completely separate from map queue logic
   - ❌ No smart prioritization
   - ❌ Manual index tracking

## Problems to Solve

1. **Queue Source Diversity**: Different views need different queue initialization strategies
   - Map: Geographic proximity + scoring
   - Chat: AI search results (subdivision, city, filtered by property type)
   - Dashboard: User's favorites or saved searches
   - Insights: Market analysis results

2. **Queue Intelligence**: Chat needs to respect AI filters
   - "Show me single family homes in Palm Desert Country Club" should only include SFR
   - "Show me homes under $500k in Rancho Mirage" should filter by price AND city

3. **State Management**: Each view maintains its own queue state
   - No centralized management
   - Difficult to share exclude keys across contexts
   - Redundant logic

4. **Component Naming**: ListingBottomPanel implies map-specific use

## Proposed Architecture

### 1. Centralized Queue Management: SwipeQueueProvider

Create a React Context that manages queue state globally while supporting context-specific initialization:

```typescript
// src/app/contexts/SwipeQueueContext.tsx

interface SwipeQueueConfig {
  mode: 'geographic' | 'ai-search' | 'favorites' | 'custom';
  filters?: {
    propertySubType?: string[];
    propertyType?: string;
    city?: string;
    subdivision?: string;
    minPrice?: number;
    maxPrice?: number;
    beds?: number;
    baths?: number;
  };
  source?: {
    type: 'map-click' | 'chat-results' | 'saved-search';
    data: any;
  };
}

interface SwipeQueueContextValue {
  // Queue state
  queue: QueueItem[];
  currentIndex: number;
  isExhausted: boolean;
  isReady: boolean;

  // Queue operations
  initializeQueue: (config: SwipeQueueConfig) => Promise<void>;
  getNext: () => QueueItem | null;
  getPrevious: () => QueueItem | null;
  peekNext: (count?: number) => QueueItem[];

  // Swipe actions
  markAsLiked: (listingKey: string, listingData?: any) => void;
  markAsDisliked: (listingKey: string, listingData?: any) => void;

  // Utility
  reset: () => void;
  isExcluded: (listingKey: string) => boolean;
  excludeKeys: Set<string>;
}
```

### 2. Queue Initialization Strategies

#### Strategy Pattern for Different Contexts

```typescript
// src/app/utils/swipe/queue-strategies.ts

interface QueueStrategy {
  buildQueue(config: SwipeQueueConfig): Promise<QueueItem[]>;
}

class GeographicStrategy implements QueueStrategy {
  // Current useSwipeQueue logic
  // Proximity-based scoring, 7-tier prioritization
  async buildQueue(config: SwipeQueueConfig): Promise<QueueItem[]> {
    const { source } = config;
    const clickedListing = source.data as MapListing;

    // Existing smart scoring algorithm
    // ...
  }
}

class AISearchStrategy implements QueueStrategy {
  // For chat results - respects AI filters
  async buildQueue(config: SwipeQueueConfig): Promise<QueueItem[]> {
    const { filters, source } = config;
    const chatListings = source.data as Listing[];

    // Apply filters from AI query
    let filtered = chatListings;

    if (filters?.propertySubType) {
      filtered = filtered.filter(l =>
        filters.propertySubType!.includes(l.propertySubType || '')
      );
    }

    if (filters?.subdivision) {
      filtered = filtered.filter(l =>
        l.subdivision?.toLowerCase() === filters.subdivision!.toLowerCase()
      );
    }

    // Convert to queue items with simple scoring (preserve AI order)
    return filtered.map((l, index) => ({
      ...toQueueItem(l),
      score: index // Preserve AI search relevance order
    }));
  }
}

class FavoritesStrategy implements QueueStrategy {
  // For dashboard - user's liked listings
  async buildQueue(config: SwipeQueueConfig): Promise<QueueItem[]> {
    const { source } = config;
    const favorites = source.data as MapListing[];

    // Sort by most recently liked
    return favorites
      .sort((a, b) => (b.likedAt || 0) - (a.likedAt || 0))
      .map((l, index) => ({
        ...toQueueItem(l),
        score: index
      }));
  }
}

class CustomStrategy implements QueueStrategy {
  // For any custom use case
  async buildQueue(config: SwipeQueueConfig): Promise<QueueItem[]> {
    const { source, filters } = config;
    // Flexible implementation
    // ...
  }
}
```

### 3. Renamed Component: SwipePanel

```typescript
// src/app/components/common/SwipePanel.tsx

interface SwipePanelProps {
  // Context info
  context: 'map' | 'chat' | 'dashboard' | 'insights';

  // UI configuration
  isSidebarOpen?: boolean;
  isLeftSidebarCollapsed?: boolean;

  // Callbacks
  onClose: () => void;
  onExhausted?: () => void; // When queue runs out

  // Optional overrides
  customLayout?: {
    width?: number;
    position?: 'bottom' | 'center' | 'full';
  };
}

export default function SwipePanel({
  context,
  isSidebarOpen = false,
  isLeftSidebarCollapsed = false,
  onClose,
  onExhausted,
  customLayout
}: SwipePanelProps) {
  const { queue, currentIndex, getNext, markAsLiked, markAsDisliked, isExhausted } = useSwipeQueueContext();

  // Get current listing from queue
  const currentListing = queue[currentIndex];

  // Handle swipe actions
  const handleSwipeLeft = async () => {
    if (!currentListing) return;

    markAsDisliked(currentListing.listingKey, currentListing);

    const next = getNext();
    if (!next && onExhausted) {
      onExhausted();
    }
  };

  const handleSwipeRight = async () => {
    if (!currentListing) return;

    markAsLiked(currentListing.listingKey, currentListing);

    const next = getNext();
    if (!next && onExhausted) {
      onExhausted();
    }
  };

  // Render with context-aware styling
  // ...
}
```

### 4. Usage Examples

#### Map View
```typescript
// src/app/components/mls/map/MapPageClient.tsx

const { initializeQueue } = useSwipeQueueContext();

const handleMarkerClick = async (listing: MapListing) => {
  await initializeQueue({
    mode: 'geographic',
    source: {
      type: 'map-click',
      data: listing
    }
  });

  setShowSwipePanel(true);
};

return (
  <>
    <MapView onMarkerClick={handleMarkerClick} />
    {showSwipePanel && (
      <SwipePanel
        context="map"
        isSidebarOpen={isSidebarOpen}
        onClose={() => setShowSwipePanel(false)}
        onExhausted={() => setShowCompletionModal(true)}
      />
    )}
  </>
);
```

#### Chat View
```typescript
// src/app/components/chat/ChatWidget.tsx

const { initializeQueue } = useSwipeQueueContext();

const handleOpenListingPanel = async (listings: Listing[], startIndex: number) => {
  // Extract filters from AI query context
  const filters = extractFiltersFromQuery(lastUserMessage);

  await initializeQueue({
    mode: 'ai-search',
    filters: {
      propertySubType: filters.propertyTypes, // ['Single Family Residence']
      subdivision: filters.subdivision, // 'Palm Desert Country Club'
      city: filters.city,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice
    },
    source: {
      type: 'chat-results',
      data: listings
    }
  });

  setShowSwipePanel(true);
};

return (
  <>
    <ChatResultsContainer onOpenListingPanel={handleOpenListingPanel} />
    {showSwipePanel && (
      <SwipePanel
        context="chat"
        onClose={() => setShowSwipePanel(false)}
      />
    )}
  </>
);
```

#### Dashboard View
```typescript
// src/app/dashboard/page.tsx

const { initializeQueue } = useSwipeQueueContext();
const { likedListings } = useMLSContext();

const handleViewFavorites = async () => {
  await initializeQueue({
    mode: 'favorites',
    source: {
      type: 'saved-search',
      data: likedListings
    }
  });

  setShowSwipePanel(true);
};
```

## AI Filter Intelligence (Simplified - No Tool Changes)

### Client-Side Filter Extraction from Natural Language

**Key Principle**: Extract filters from the user's query and AI's response text - NO tool modifications needed.

```typescript
// src/app/utils/chat/filter-extractor.ts

interface ExtractedFilters {
  propertySubTypes?: string[];
  excludePropertySubTypes?: string[];
  subdivision?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  baths?: number;
}

/**
 * Extract filters from user's natural language query
 * Simple pattern matching - no LLM needed
 */
export function extractFiltersFromQuery(userMessage: string): ExtractedFilters {
  const lower = userMessage.toLowerCase();
  const filters: ExtractedFilters = {};

  // Property type detection (trigger phrases)
  if (lower.match(/\bsingle family\b|\bsfr\b|\bhouse\b|\bhome\b/i) &&
      !lower.match(/condo|townhouse|apartment/i)) {
    filters.propertySubTypes = ['Single Family Residence'];
    filters.excludePropertySubTypes = ['Condominium', 'Townhouse', 'Residential Income'];
  }

  if (lower.match(/\bcondo\b|\bcondominium\b/i)) {
    filters.propertySubTypes = ['Condominium'];
  }

  if (lower.match(/\btownhouse\b|\btown house\b/i)) {
    filters.propertySubTypes = ['Townhouse'];
  }

  // Subdivision detection
  const subdivisionMatch = lower.match(/\bin ([a-z\s]+?)(?: subdivision| neighborhood| community|,| with| that|$)/i);
  if (subdivisionMatch) {
    filters.subdivision = subdivisionMatch[1].trim();
  }

  // City detection
  const cityMatch = lower.match(/\b(palm desert|rancho mirage|palm springs|la quinta|indian wells|cathedral city|desert hot springs|indio|coachella)\b/i);
  if (cityMatch) {
    filters.city = cityMatch[1];
  }

  // Price detection
  const priceUnderMatch = lower.match(/\bunder \$?([\d,]+)k?\b/i);
  if (priceUnderMatch) {
    const amount = parseInt(priceUnderMatch[1].replace(/,/g, ''));
    filters.maxPrice = amount > 1000 ? amount : amount * 1000;
  }

  const priceOverMatch = lower.match(/\bover \$?([\d,]+)k?\b/i);
  if (priceOverMatch) {
    const amount = parseInt(priceOverMatch[1].replace(/,/g, ''));
    filters.minPrice = amount > 1000 ? amount : amount * 1000;
  }

  const priceBetweenMatch = lower.match(/\bbetween \$?([\d,]+)k? and \$?([\d,]+)k?\b/i);
  if (priceBetweenMatch) {
    const min = parseInt(priceBetweenMatch[1].replace(/,/g, ''));
    const max = parseInt(priceBetweenMatch[2].replace(/,/g, ''));
    filters.minPrice = min > 1000 ? min : min * 1000;
    filters.maxPrice = max > 1000 ? max : max * 1000;
  }

  // Bedroom detection
  const bedsMatch = lower.match(/\b(\d+)\s*(?:bed|bedroom)/i);
  if (bedsMatch) {
    filters.beds = parseInt(bedsMatch[1]);
  }

  // Bathroom detection
  const bathsMatch = lower.match(/\b(\d+)\s*(?:bath|bathroom)/i);
  if (bathsMatch) {
    filters.baths = parseInt(bathsMatch[1]);
  }

  return filters;
}

/**
 * Apply filters to listing array (client-side filtering)
 */
export function applyFiltersToListings(
  listings: Listing[],
  filters: ExtractedFilters
): Listing[] {
  let filtered = [...listings];

  if (filters.propertySubTypes && filters.propertySubTypes.length > 0) {
    filtered = filtered.filter(l =>
      filters.propertySubTypes!.includes(l.type || l.propertySubType || '')
    );
  }

  if (filters.excludePropertySubTypes && filters.excludePropertySubTypes.length > 0) {
    filtered = filtered.filter(l =>
      !filters.excludePropertySubTypes!.includes(l.type || l.propertySubType || '')
    );
  }

  if (filters.subdivision) {
    filtered = filtered.filter(l =>
      l.subdivision?.toLowerCase().includes(filters.subdivision!.toLowerCase())
    );
  }

  if (filters.city) {
    filtered = filtered.filter(l =>
      l.city?.toLowerCase() === filters.city!.toLowerCase()
    );
  }

  if (filters.minPrice) {
    filtered = filtered.filter(l => (l.price || 0) >= filters.minPrice!);
  }

  if (filters.maxPrice) {
    filtered = filtered.filter(l => (l.price || 0) <= filters.maxPrice!);
  }

  if (filters.beds) {
    filtered = filtered.filter(l => (l.beds || 0) >= filters.beds!);
  }

  if (filters.baths) {
    filtered = filtered.filter(l => (l.baths || 0) >= filters.baths!);
  }

  return filtered;
}
```

### Simple ChatWidget Integration

```typescript
// src/app/components/chat/ChatWidget.tsx

import { extractFiltersFromQuery, applyFiltersToListings } from '@/app/utils/chat/filter-extractor';

const handleOpenListingPanel = async (listings: Listing[], startIndex: number) => {
  // Get user's last message for filter extraction
  const lastUserMessage = messages
    .filter(m => m.role === 'user')
    .pop()?.content || '';

  // Extract filters from natural language (no AI needed)
  const filters = extractFiltersFromQuery(lastUserMessage);

  console.log('[ChatWidget] Extracted filters:', filters);

  // Apply filters client-side
  const filteredListings = applyFiltersToListings(listings, filters);

  console.log(`[ChatWidget] Filtered: ${listings.length} → ${filteredListings.length} listings`);

  // Initialize queue with filtered results
  await initializeQueue({
    mode: 'ai-search',
    filters,
    source: {
      type: 'chat-results',
      data: filteredListings
    }
  });

  setShowSwipePanel(true);
};
```

### Example Trigger Phrases

| User Query | Detected Filters |
|------------|------------------|
| "Show me single family homes in Palm Desert Country Club" | `propertySubTypes: ['Single Family Residence']`<br>`subdivision: 'palm desert country club'`<br>`excludePropertySubTypes: ['Condominium', 'Townhouse']` |
| "Homes under $500k in Rancho Mirage" | `maxPrice: 500000`<br>`city: 'rancho mirage'` |
| "3 bedroom condos in La Quinta" | `beds: 3`<br>`propertySubTypes: ['Condominium']`<br>`city: 'la quinta'` |
| "Houses in Indian Wells between $800k and $1.2M" | `minPrice: 800000`<br>`maxPrice: 1200000`<br>`city: 'indian wells'`<br>`propertySubTypes: ['Single Family Residence']` |

### Benefits of This Approach

1. ✅ **Zero AI Tool Changes** - Works with existing tool structure
2. ✅ **Simple Pattern Matching** - Fast, deterministic, no LLM overhead
3. ✅ **Client-Side Filtering** - Instant results, no server round-trip
4. ✅ **Transparent Logic** - Easy to debug and extend
5. ✅ **Fail-Safe** - If no filters detected, shows all results (graceful degradation)

### Fallback Behavior

If filter extraction fails or results in zero listings:
```typescript
if (filteredListings.length === 0) {
  console.warn('[ChatWidget] Filters too restrictive, using original results');
  filteredListings = listings; // Show all results
}
```

## Migration Plan

### Phase 1: Create Core Infrastructure ✅
1. Create `SwipeQueueContext.tsx` with provider
2. Create `queue-strategies.ts` with all strategies
3. Update `useSwipeQueue.ts` to support multiple strategies

### Phase 2: Refactor Component ✅
1. Rename `ListingBottomPanel.tsx` to `SwipePanel.tsx`
2. Update component to use SwipeQueueContext
3. Add context-aware styling/behavior

### Phase 3: Update Consumers ✅
1. Update MapPageClient to use new context
2. Update ChatWidget to use new context with AI filters
3. Update Dashboard (if applicable)
4. Update Insights page (if applicable)

### Phase 4: Testing ✅
1. Test map swipe queue (ensure no regression)
2. Test chat swipe queue with various filters
3. Test property type filtering ("only single family homes")
4. Test subdivision filtering
5. Test price filtering
6. Test exclude keys work across contexts

## Benefits

1. **Scalability**: Easy to add new contexts (e.g., email campaigns, mobile app)
2. **Maintainability**: Single source of truth for queue logic
3. **Intelligence**: AI-driven filtering respects user intent
4. **Consistency**: Same swipe experience across all views
5. **Performance**: Centralized exclude keys reduce redundant API calls
6. **Flexibility**: Strategy pattern allows context-specific behavior

## Technical Considerations

### Exclude Keys Persistence
- Store in browser localStorage
- Sync with API on app start
- Update on each swipe (existing behavior)

### Queue Pre-fetching
- Fetch full listing data for next 3 items
- Improves swipe speed
- Reduces perceived latency

### Analytics
- Track which context generated the swipe
- Track which queue strategy was used
- Track filter effectiveness

### Error Handling
- Gracefully handle empty queues
- Show appropriate messaging per context
- Allow manual queue refresh

## Future Enhancements

1. **Smart Queue Replenishment**
   - Auto-fetch more listings when queue < 5
   - Use existing strategy to maintain continuity

2. **Cross-Session Persistence**
   - Save queue state to localStorage
   - Resume where user left off

3. **Multi-Listing Comparison**
   - Allow users to "stack" multiple listings
   - Compare side-by-side before swiping

4. **Queue Branching**
   - "Show me more like this" - create sub-queue
   - Preserve main queue for later

5. **Collaborative Filtering**
   - Use aggregate swipe data to improve scoring
   - Machine learning-based prioritization
