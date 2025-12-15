# JPSRealtor Pre-Launch Trello Board

**Board Structure:** Organized by priority and phase
**Created:** 2024-12-14
**Goal:** Track all bugs and features needed before client-facing launch

---

## 📋 LIST 1: CRITICAL BUGS (Must Fix Before Launch)

### 🐛 BUG-001: Chat Error Handling
**Priority:** 🔴 Critical
**Status:** To Do
**Description:** Chat not responding gracefully when AI receives unprepared questions

**Details:**
- When AI encounters questions it's not prepared to answer, errors are not handled gracefully
- Users see broken/failed responses instead of friendly error messages
- Need robust error handling and fallback responses

**Acceptance Criteria:**
- [ ] Implement try-catch blocks around AI tool execution
- [ ] Add fallback response for unprepared questions: "I don't have that information yet, but I can help you with..."
- [ ] Log errors to monitoring system
- [ ] Display user-friendly error message in chat UI
- [ ] Test with various edge case questions

**Files to Update:**
- `src/lib/chat/tool-executor.ts` - Add error boundaries
- `src/app/api/chat/stream/route.ts` - Wrap streaming in try-catch
- `src/app/components/chat/ChatWidget.tsx` - Handle error states

**Technical Notes:**
```typescript
// Example error handling pattern
try {
  const result = await executeToolCall(args);
  return result;
} catch (error) {
  console.error('[Chat Error]:', error);
  return {
    type: 'error',
    message: "I encountered an issue with that request. Could you try rephrasing or asking something else?"
  };
}
```

---

### 🐛 BUG-002: Mobile Chat Scroll Direction
**Priority:** 🔴 Critical
**Status:** To Do
**Description:** AI responses push messages UP instead of DOWN on mobile, forcing user messages out of viewport

**Details:**
- Current behavior: New AI messages render upward, pushing user messages off screen
- Expected behavior: Messages should progress down the screen with space below
- Mobile viewport height not being respected

**Acceptance Criteria:**
- [ ] Messages render from top to bottom
- [ ] User messages stay in viewport when AI responds
- [ ] Auto-scroll to latest message after AI response
- [ ] Handle long responses gracefully
- [ ] Test on various mobile screen sizes (iPhone SE, Pro Max, Android)

**Files to Update:**
- `src/app/components/chat/ChatWidget.tsx` - Message container scroll logic
- `src/app/components/chat/ChatProvider.tsx` - Message ordering

**Technical Investigation:**
- Check `flexDirection` on message container
- Verify `scrollIntoView()` behavior
- Review CSS for `display: flex` direction
- Test with `overflow-y: scroll` and `scroll-behavior: smooth`

**CSS Fix Pattern:**
```css
.messages-container {
  display: flex;
  flex-direction: column; /* Not column-reverse */
  overflow-y: auto;
  scroll-behavior: smooth;
}
```

---

### 🐛 BUG-003: Listing Bottom Panel Swipe Queue
**Priority:** 🔴 Critical
**Status:** To Do
**Description:** Swipe queue not functioning correctly when browsing listings in bottom panel

**Details:**
- Current queue generation is not reliable
- Swiping through listings shows incorrect next/previous items
- Need to refactor queue generation with smart database queries

**Acceptance Criteria:**
- [ ] Create smart queue generator that fetches listings in batches
- [ ] Implement proper next/previous navigation
- [ ] Prefetch next 3 listings for smooth swiping
- [ ] Handle edge cases (first/last listing)
- [ ] Maintain queue state across panel open/close
- [ ] Test with various query filters (city, price range, etc.)

**Proposed Solution:**
1. Generate initial queue (e.g., 10 listings)
2. When user reaches listing #8, prefetch next 10
3. Keep sliding window of 20 listings in memory
4. Track current index in queue
5. Handle boundary conditions

**Files to Update:**
- `src/app/components/chat/ChatWidget.tsx` - Queue state management
- `src/lib/chat/tool-executor.ts` - Smart query generator
- Create new: `src/lib/utils/listing-queue-manager.ts`

**Technical Design:**
```typescript
class ListingQueueManager {
  private queue: Listing[] = [];
  private currentIndex: number = 0;
  private filters: QueryFilters;

  async initialize(initialListings: Listing[], filters: QueryFilters) {
    this.queue = initialListings;
    this.filters = filters;
  }

  async getNext(): Promise<Listing | null> {
    if (this.currentIndex < this.queue.length - 3) {
      return this.queue[++this.currentIndex];
    }
    // Prefetch more listings
    await this.fetchMore();
    return this.queue[++this.currentIndex];
  }

  async getPrevious(): Promise<Listing | null> {
    return this.currentIndex > 0 ? this.queue[--this.currentIndex] : null;
  }

  private async fetchMore() {
    // Fetch next batch from database
  }
}
```

---

## 📋 LIST 2: HIGH PRIORITY FEATURES

### 🚀 FEATURE-001: Map & AI Event Synchronization
**Priority:** 🟠 High
**Status:** To Do
**Description:** Map should auto-update to searched area while AI is populating results, even when map not visible

**Details:**
- When user searches "listings in Palm Desert", map should immediately center on Palm Desert
- Map should update WHILE AI is generating response (not after)
- Event listener pattern for AI → Map communication
- Works even when map viewport is hidden

**Acceptance Criteria:**
- [ ] Implement event emitter for AI search queries
- [ ] Map listens to search location events
- [ ] Map centers/zooms to correct area immediately
- [ ] Works when map is hidden (updates in background)
- [ ] Extract coordinates from city/subdivision/address queries
- [ ] Handle invalid/unknown locations gracefully
- [ ] Test with various location types (city, subdivision, address, radius)

**Technical Implementation:**

**Step 1: Create Event System**
```typescript
// src/lib/events/map-sync.ts
import { EventEmitter } from 'events';

export const mapSyncEmitter = new EventEmitter();

export const MAP_EVENTS = {
  CENTER_ON_LOCATION: 'centerOnLocation',
  UPDATE_BOUNDS: 'updateBounds',
  ZOOM_TO_LISTINGS: 'zoomToListings'
} as const;

interface CenterOnLocationEvent {
  city?: string;
  subdivision?: string;
  latitude?: number;
  longitude?: number;
  zoom?: number;
}

export function emitCenterOnLocation(data: CenterOnLocationEvent) {
  mapSyncEmitter.emit(MAP_EVENTS.CENTER_ON_LOCATION, data);
}
```

**Step 2: Emit from AI Query**
```typescript
// In src/lib/chat/tool-executor.ts
import { emitCenterOnLocation } from '@/lib/events/map-sync';

// When user queries a location
if (args.city) {
  emitCenterOnLocation({ city: args.city });
}
if (args.subdivision) {
  emitCenterOnLocation({ subdivision: args.subdivision });
}
```

**Step 3: Listen in Map Component**
```typescript
// In src/app/components/mls/map/MapView.tsx
useEffect(() => {
  const handleCenterOnLocation = async (data: CenterOnLocationEvent) => {
    if (data.city) {
      const coords = await geocodeCity(data.city);
      mapRef.current?.flyTo({ center: coords, zoom: 12 });
    }
  };

  mapSyncEmitter.on(MAP_EVENTS.CENTER_ON_LOCATION, handleCenterOnLocation);

  return () => {
    mapSyncEmitter.off(MAP_EVENTS.CENTER_ON_LOCATION, handleCenterOnLocation);
  };
}, []);
```

**Files to Create/Update:**
- Create: `src/lib/events/map-sync.ts`
- Update: `src/lib/chat/tool-executor.ts`
- Update: `src/app/components/mls/map/MapView.tsx`
- Create: `src/lib/utils/geocode-location.ts` (city → lat/lng lookup)

---

### 🚀 FEATURE-002: Neighborhoods Directory Expansion
**Priority:** 🟠 High
**Status:** To Do
**Description:** Completely update neighborhoods directory with expanded dataset

**Details:**
- Current neighborhood data is limited
- Need comprehensive neighborhood/subdivision coverage
- Add neighborhood pages, stats, and metadata

**Acceptance Criteria:**
- [ ] Audit current neighborhoods dataset
- [ ] Identify missing neighborhoods in coverage area
- [ ] Source comprehensive neighborhood/subdivision data
- [ ] Create migration script to populate new neighborhoods
- [ ] Add neighborhood metadata (schools, amenities, demographics)
- [ ] Generate SEO-friendly neighborhood pages
- [ ] Add neighborhood images/maps
- [ ] Verify all neighborhoods have correct boundaries

**Data Sources:**
- MLS subdivision data
- County GIS boundaries
- Census tract data
- Local chamber of commerce listings

**Files to Update:**
- `src/models/neighborhood.ts` - Expand schema
- Create: `src/scripts/neighborhoods/import-comprehensive-data.ts`
- Update: `src/app/neighborhoods/[slug]/page.tsx`
- Create neighborhood metadata JSON files

**Database Schema Updates:**
```typescript
interface Neighborhood {
  slug: string;
  name: string;
  city: string;
  boundaries: GeoJSONPolygon; // Geographic boundary
  metadata: {
    population?: number;
    medianHomePrice?: number;
    schools?: School[];
    amenities?: string[];
    walkScore?: number;
    transitScore?: number;
  };
  images: string[];
  description: string;
  seoTitle: string;
  seoDescription: string;
}
```

---

### 🚀 FEATURE-003: Neighborhood Chat Integration
**Priority:** 🟠 High
**Status:** To Do
**Description:** Add neighborhood query functionality to chat AI

**Details:**
- Users should be able to ask "Tell me about La Quinta Cove"
- AI should return neighborhood stats, listings, and info
- Integrate with expanded neighborhoods dataset

**Acceptance Criteria:**
- [ ] Add `queryNeighborhood` tool to AI
- [ ] Fetch neighborhood metadata and stats
- [ ] Show neighborhood listings in chat
- [ ] Display neighborhood info card
- [ ] Link to full neighborhood page
- [ ] Handle misspellings/variations of neighborhood names

**AI Tool Definition:**
```typescript
{
  name: "queryNeighborhood",
  description: "Get information about a specific neighborhood or subdivision",
  parameters: {
    neighborhood: {
      type: "string",
      description: "Neighborhood or subdivision name"
    },
    includeListings: {
      type: "boolean",
      description: "Whether to include active listings in this neighborhood"
    }
  }
}
```

**Files to Update:**
- `src/lib/chat/tools.ts` - Add queryNeighborhood tool
- `src/lib/chat/tool-executor.ts` - Implement neighborhood query
- `src/lib/chat/system-prompt.ts` - Add neighborhood examples

---

### 🚀 FEATURE-004: Neighborhood Info Panels
**Priority:** 🟠 High
**Status:** To Do
**Description:** Add neighborhood context to listing info panels

**Details:**
- When viewing a listing, show neighborhood info in panel
- Display subdivision stats, amenities, schools
- Link to full neighborhood page

**Acceptance Criteria:**
- [ ] Add neighborhood section to ListingBottomPanel
- [ ] Fetch neighborhood data based on listing subdivision
- [ ] Display key neighborhood stats
- [ ] Add "View Neighborhood" link
- [ ] Show nearby amenities
- [ ] Handle listings without subdivision data

**Files to Update:**
- `src/app/components/mls/map/ListingBottomPanel.tsx`
- `src/lib/queries/neighborhoods.ts` - Query helpers

---

### 🚀 FEATURE-005: Neighborhood Favorites Integration
**Priority:** 🟠 High
**Status:** To Do
**Description:** Allow users to favorite entire neighborhoods, not just listings

**Details:**
- Users can save favorite neighborhoods
- Dashboard shows favorite neighborhoods with stats
- Get alerts for new listings in favorite neighborhoods

**Acceptance Criteria:**
- [ ] Add neighborhood favorites to user model
- [ ] Create "Favorite Neighborhood" button
- [ ] Display favorite neighborhoods in dashboard
- [ ] Show listing count + recent activity for each favorite
- [ ] Send notifications for new listings in favorites
- [ ] Allow unfavoriting

**Files to Update:**
- `src/models/User.ts` - Add favoriteNeighborhoods array
- `src/app/components/favorites/NeighborhoodFavorites.tsx` (new)
- `src/app/dashboard/favorites/page.tsx`
- Create: `src/app/api/favorites/neighborhoods/route.ts`

---

## 📋 LIST 3: TESTING & OPTIMIZATION

### 🧪 TEST-001: AI Stress Testing
**Priority:** 🟠 High
**Status:** To Do
**Description:** Stress test AI to ensure it functions correctly after series of messages

**Details:**
- Test AI with 20+ consecutive messages
- Verify context retention
- Check for memory leaks
- Test error recovery

**Test Scenarios:**
1. **Context Retention:** Ask 10 follow-up questions
2. **Mixed Queries:** Alternate between listings, neighborhoods, CMAs
3. **Error Recovery:** Send invalid queries, then valid ones
4. **Concurrent Requests:** Multiple users asking simultaneously
5. **Large Result Sets:** Queries returning 100+ listings
6. **Complex Filters:** 5+ simultaneous filters

**Acceptance Criteria:**
- [ ] Create automated stress test suite
- [ ] Test with 50 consecutive messages
- [ ] Verify no context loss after 20 messages
- [ ] Check response times don't degrade
- [ ] Monitor memory usage over time
- [ ] Test concurrent users (10+ simultaneous chats)
- [ ] Document failure modes and recovery

**Create Test Script:**
```typescript
// tests/stress/ai-chat-stress.test.ts
describe('AI Chat Stress Test', () => {
  it('should handle 50 consecutive messages', async () => {
    const messages = [
      "Show me listings in Palm Desert",
      "Filter under $500k",
      "Add 3 bedrooms minimum",
      // ... 47 more
    ];

    for (const msg of messages) {
      const response = await sendChatMessage(msg);
      expect(response.success).toBe(true);
    }
  });

  it('should maintain context across conversation', async () => {
    await sendChatMessage("Show me Palm Desert listings");
    const response = await sendChatMessage("Filter those under $500k");
    expect(response).toIncludeFilter({ city: "Palm Desert", maxPrice: 500000 });
  });
});
```

---

## 📋 LIST 4: INTERACTION FEATURES

### 🎨 FEATURE-006: Drag to Select Properties
**Priority:** 🟡 Medium
**Status:** To Do
**Description:** Implement drag-to-select functionality on map for multi-property selection

**Details:**
- Users can click and drag to draw selection box on map
- All properties within box are selected
- Selected properties can be added to favorites or compared

**Acceptance Criteria:**
- [ ] Implement drag rectangle drawing on map
- [ ] Detect listings within selection bounds
- [ ] Highlight selected properties
- [ ] Show selection count badge
- [ ] Add "Add Selected to Favorites" button
- [ ] Add "Compare Selected" button
- [ ] Clear selection functionality
- [ ] Works on mobile (long-press + drag)

**Technical Implementation:**
```typescript
// Use Mapbox Draw plugin
import MapboxDraw from '@mapbox/mapbox-gl-draw';

const draw = new MapboxDraw({
  displayControlsDefault: false,
  controls: {
    polygon: false,
    trash: true
  },
  defaultMode: 'draw_rectangle'
});

map.addControl(draw);

map.on('draw.create', (e) => {
  const selectedListings = getListingsInPolygon(e.features[0]);
  setSelectedProperties(selectedListings);
});
```

**Files to Create/Update:**
- Update: `src/app/components/mls/map/MapView.tsx`
- Create: `src/lib/utils/geospatial-selection.ts`
- Update: `src/app/components/mls/map/MapControls.tsx`

---

### 🎨 FEATURE-007: Update Selected Properties in Favorites Panel
**Priority:** 🟡 Medium
**Status:** To Do
**Description:** Improve selected properties functionality in favorites panel and dashboard

**Details:**
- Better multi-select UI
- Bulk actions (delete, move to folder, export)
- Comparison view

**Acceptance Criteria:**
- [ ] Add checkbox selection mode
- [ ] Select all / deselect all
- [ ] Bulk delete selected
- [ ] Move selected to folders
- [ ] Export selected to PDF/CSV
- [ ] Compare selected properties side-by-side
- [ ] Show selection count

**Files to Update:**
- `src/app/components/favorites/FavoritesList.tsx`
- `src/app/dashboard/favorites/page.tsx`
- Create: `src/app/components/favorites/BulkActions.tsx`

---

## 📋 LIST 5: CMA FEATURES

### 💰 FEATURE-008: AI Auto-CMA
**Priority:** 🟡 Medium
**Status:** To Do
**Description:** AI automatically generates CMA (Comparative Market Analysis) when user views a listing

**Details:**
- AI detects when user is interested in property valuation
- Automatically finds comparable properties
- Generates CMA report with sold comps

**Acceptance Criteria:**
- [ ] Add `generateCMA` AI tool
- [ ] Query unified_closed_listings for comps
- [ ] Match by: location (1 mile radius), sqft (±20%), beds/baths, property type
- [ ] Sort by recency (last 6 months preferred)
- [ ] Calculate price per sqft analysis
- [ ] Display CMA card in chat
- [ ] Link to full CMA report page
- [ ] Save CMA to user's dashboard

**AI Tool Definition:**
```typescript
{
  name: "generateCMA",
  description: "Generate Comparative Market Analysis for a property",
  parameters: {
    listingKey: {
      type: "string",
      description: "The listing to generate CMA for"
    },
    radius: {
      type: "number",
      description: "Search radius in miles (default 1.0)",
      default: 1.0
    },
    timeframe: {
      type: "number",
      description: "Months back to search (default 6)",
      default: 6
    }
  }
}
```

**CMA Calculation Logic:**
```typescript
async function generateCMA(listing: Listing) {
  // 1. Find sold comps
  const comps = await UnifiedClosedListing.find({
    location: {
      $nearSphere: {
        $geometry: listing.location,
        $maxDistance: 1609.34 // 1 mile in meters
      }
    },
    closeDate: { $gte: sixMonthsAgo },
    livingArea: {
      $gte: listing.livingArea * 0.8,
      $lte: listing.livingArea * 1.2
    },
    bedroomsTotal: listing.bedroomsTotal,
    propertyType: listing.propertyType
  })
  .sort({ closeDate: -1 })
  .limit(10);

  // 2. Calculate metrics
  const avgPricePerSqft = comps.reduce((sum, c) => sum + (c.closePrice / c.livingArea), 0) / comps.length;
  const estimatedValue = avgPricePerSqft * listing.livingArea;

  return {
    listing,
    comps,
    analysis: {
      estimatedValue,
      avgPricePerSqft,
      compCount: comps.length,
      priceRange: [Math.min(...comps.map(c => c.closePrice)), Math.max(...comps.map(c => c.closePrice))]
    }
  };
}
```

**Files to Create/Update:**
- Create: `src/lib/analytics/cma-generator.ts`
- Update: `src/lib/chat/tools.ts`
- Update: `src/lib/chat/tool-executor.ts`
- Create: `src/app/components/chat/CMACard.tsx`
- Create: `src/app/cma/[id]/page.tsx` - Full CMA report

---

### 💰 FEATURE-009: User-Selected CMA
**Priority:** 🟡 Medium
**Status:** To Do
**Description:** Allow users to manually select comparable properties for custom CMA

**Details:**
- Users can pick specific sold listings as comps
- Override AI auto-selection
- Save and share custom CMAs

**Acceptance Criteria:**
- [ ] Add "Add to CMA" button on closed listings
- [ ] CMA builder interface
- [ ] Drag and drop comps to reorder
- [ ] Remove/replace comps
- [ ] Adjust weights for each comp
- [ ] Generate PDF report
- [ ] Save CMA to dashboard
- [ ] Share CMA via link

**UI Flow:**
1. User clicks "Create CMA" from listing
2. AI suggests comps (FEATURE-008)
3. User can add/remove/reorder comps
4. User adjusts analysis parameters
5. Generate final report

**Files to Create:**
- Create: `src/app/cma/builder/page.tsx`
- Create: `src/app/components/cma/CMABuilder.tsx`
- Create: `src/app/components/cma/CompCard.tsx`
- Create: `src/app/api/cma/generate-pdf/route.ts`

---

## 📋 LIST 6: CRM FEATURES (Phase 2 - Post Launch)

### 📞 CRM-001: Voicemail Drops
**Priority:** 🟢 Low (Post-Launch)
**Status:** Backlog
**Description:** Implement automated voicemail drop system for lead follow-up

**Details:**
- Pre-recorded voicemail messages
- Triggered by CRM workflows
- Track delivery and responses

**Technical Stack:**
- Slybroadcast or similar service
- Webhook integration
- Activity logging

---

### 📱 CRM-002: Twilio SMS Integration
**Priority:** 🟢 Low (Post-Launch)
**Status:** Backlog
**Description:** Two-way SMS messaging with leads via Twilio

**Details:**
- Send/receive SMS from dashboard
- SMS templates
- Conversation threading
- Auto-responses

**Files to Create:**
- Create: `src/app/api/sms/send/route.ts`
- Create: `src/app/api/sms/webhook/route.ts`
- Create: `src/app/dashboard/messages/page.tsx`

---

### 🤖 CRM-003: AI Webhook for Twilio
**Priority:** 🟢 Low (Post-Launch)
**Status:** Backlog
**Description:** AI-powered SMS responses via Twilio webhook

**Details:**
- Incoming SMS triggers AI
- AI generates contextual response
- Human review before sending (optional)
- Auto-respond to common questions

**Technical Flow:**
1. Twilio receives SMS → webhook
2. Webhook triggers AI with conversation context
3. AI generates response
4. (Optional) Queue for human approval
5. Send response via Twilio

---

### 📄 CRM-004: AI-Generated Results Pages
**Priority:** 🟢 Low (Post-Launch)
**Status:** Backlog
**Description:** Dynamically generate custom listing results pages for leads

**Details:**
- AI creates personalized listing collections
- Shareable URLs
- Track page views
- Lead capture forms

**Use Case:**
Agent: "Send me a results page for 3-bed homes under $600k in Palm Desert"
System: Generates custom page at `/results/palm-desert-3bed-600k`

---

### 🧹 CRM-005: Contact Cleanup Swipe App
**Priority:** 🟢 Low (Post-Launch)
**Status:** Backlog
**Description:** Tinder-style swipe interface for cleaning up CRM contacts

**Details:**
- Swipe right: Keep contact
- Swipe left: Archive/delete
- Swipe up: Merge duplicate
- Swipe down: Flag for review
- Bulk cleanup mode

**Files to Create:**
- Create: `src/app/dashboard/contacts/cleanup/page.tsx`
- Create: `src/app/components/contacts/SwipeCard.tsx`

---

## 📊 PRIORITY SUMMARY

### Must Fix Before Launch (Critical):
1. ✅ Chat error handling (BUG-001)
2. ✅ Mobile scroll direction (BUG-002)
3. ✅ Swipe queue refactor (BUG-003)

### Should Have for Launch (High Priority):
4. ✅ Map & AI sync (FEATURE-001)
5. ✅ Neighborhoods expansion (FEATURE-002)
6. ✅ Neighborhood chat (FEATURE-003)
7. ✅ Neighborhood info panels (FEATURE-004)
8. ✅ Neighborhood favorites (FEATURE-005)
9. ✅ AI stress testing (TEST-001)

### Nice to Have for Launch (Medium Priority):
10. ✅ Drag to select (FEATURE-006)
11. ✅ Selected properties update (FEATURE-007)
12. ✅ AI Auto-CMA (FEATURE-008)
13. ✅ User-selected CMA (FEATURE-009)

### Post-Launch Phase 2 (Low Priority):
14. 📦 Voicemail drops (CRM-001)
15. 📦 Twilio SMS (CRM-002)
16. 📦 AI Twilio webhook (CRM-003)
17. 📦 AI results pages (CRM-004)
18. 📦 Contact cleanup swipe (CRM-005)

---

## 🔧 TECHNICAL DEBT & INFRASTRUCTURE

### TECH-001: API Rate Limiting
- Implement rate limiting on all public endpoints
- Prevent abuse and spam
- User tier-based limits

### TECH-002: Error Monitoring
- Set up Sentry or similar
- Track frontend errors
- Monitor API failures
- Alert on critical issues

### TECH-003: Performance Monitoring
- Add analytics for page load times
- Track API response times
- Monitor database query performance
- Set up alerting for degradation

### TECH-004: SEO Optimization
- Meta tags for all pages
- Open Graph images
- Structured data (Schema.org)
- XML sitemap
- Robots.txt

### TECH-005: Mobile Responsiveness Audit
- Test all pages on mobile
- Fix any layout issues
- Optimize touch targets
- Test on iOS Safari, Chrome Android

### TECH-006: Accessibility (A11y)
- ARIA labels
- Keyboard navigation
- Screen reader testing
- Color contrast compliance

---

## 📅 ESTIMATED TIMELINE

### Week 1: Critical Bugs
- BUG-001: Chat error handling (2 days)
- BUG-002: Mobile scroll (1 day)
- BUG-003: Swipe queue (2 days)

### Week 2-3: Core Features
- FEATURE-001: Map/AI sync (3 days)
- FEATURE-002: Neighborhoods expansion (4 days)
- FEATURE-003-005: Neighborhood integration (3 days)

### Week 4: Testing & Polish
- TEST-001: AI stress testing (2 days)
- Bug fixes from testing (3 days)

### Week 5: Nice-to-Haves
- FEATURE-006-007: Selection features (2 days)
- FEATURE-008-009: CMA features (3 days)

### Week 6: Launch Prep
- Final testing
- Performance optimization
- Documentation
- Deploy to production

---

## 📝 NOTES FOR TRELLO SETUP

**Suggested Labels:**
- 🔴 Critical
- 🟠 High Priority
- 🟡 Medium Priority
- 🟢 Low Priority
- 🐛 Bug
- 🚀 Feature
- 🧪 Testing
- 📞 CRM
- 💰 CMA
- 🏘️ Neighborhoods

**Suggested Lists:**
1. Backlog
2. To Do
3. In Progress
4. Code Review
5. Testing
6. Done
7. Post-Launch

**Card Templates:**
Each card should include:
- Title
- Priority label
- Description
- Acceptance criteria checklist
- Technical notes
- Files to update
- Estimated time

---

**Next Steps:**
1. Review this board structure
2. Provide Trello API credentials to create cards programmatically
3. Or manually copy cards to Trello board
4. Assign team members to cards
5. Start with Critical Bugs list

