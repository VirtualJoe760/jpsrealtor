# Chap - Unified Chat + Map Experience

**Date**: December 11, 2025
**Status**: High-Level Design Document
**Purpose**: Merge Chat (/) and Map (/map) into a unified experience

---

## 🎯 Vision

**"Chap"** (Chat + Map) creates a unified interface where AI chat and interactive map work together seamlessly, eliminating the need to switch between pages.

### **Current Problem**
```
User Flow Today:
1. User asks question on chat page (/)
2. Gets results with basic map
3. Clicks "View on full map"
4. Navigates to /map (loses chat context)
5. Can't ask follow-up questions
6. Has to go back to chat
7. Repeat cycle...
```

### **Chap Solution**
```
User Flow with Chap:
1. User asks question
2. AI responds AND controls the map
3. User explores map visually
4. User asks follow-up based on what they see
5. AI adjusts map view automatically
6. Everything in ONE unified view
```

---

## 🏗️ Architecture Overview

### **Layout Strategy**

#### **Desktop (≥1024px)**
```
┌────────────────────────────────────────────────────────┐
│  Header / Nav                                          │
├──────────────────┬─────────────────────────────────────┤
│                  │                                     │
│   CHAT PANEL     │        FULL MAP VIEW               │
│   (40% width)    │        (60% width)                 │
│                  │                                     │
│  - Messages      │  - Intelligent clustering          │
│  - Input box     │  - Boundaries                      │
│  - Suggestions   │  - Markers                         │
│  - Results       │  - Controls                        │
│  - Quick filters │  - Filter panel                    │
│                  │  - Style switcher                  │
│                  │                                     │
│  [Resizable]     │  [AI Controlled]                   │
│                  │                                     │
└──────────────────┴─────────────────────────────────────┘
```

**Key Features**:
- ✅ **Resizable panels** - Drag divider to adjust chat/map ratio
- ✅ **Collapsible chat** - Collapse to give map 100% width
- ✅ **Synchronized state** - Chat controls map, map updates chat
- ✅ **Persistent context** - Never lose conversation

#### **Tablet (768px - 1023px)**
```
┌────────────────────────────────────────────────────────┐
│  Header / Nav                                          │
├────────────────────────────────────────────────────────┤
│                                                        │
│               FULL MAP VIEW                            │
│               (Top 60%)                                │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│               CHAT PANEL                               │
│               (Bottom 40%)                             │
│               [Swipe to expand/collapse]               │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Key Features**:
- ✅ **Stacked layout** - Map on top, chat on bottom
- ✅ **Swipe gestures** - Swipe chat up/down to resize
- ✅ **Snap points** - 25%, 40%, 60% of screen height

#### **Mobile (<768px)**
```
┌────────────────────┐
│  Header / Nav      │
├────────────────────┤
│                    │
│                    │
│    FULL MAP        │
│    (100% view)     │
│                    │
│                    │
│                    │
│                    │
├────────────────────┤
│  Chat Input        │
│  [Tap to expand]   │
└────────────────────┘

When chat expanded:
┌────────────────────┐
│  [X] Close         │
├────────────────────┤
│                    │
│  CHAT OVERLAY      │
│  (85% height)      │
│                    │
│  - Messages        │
│  - Results         │
│  - Input           │
│                    │
│                    │
└────────────────────┘
```

**Key Features**:
- ✅ **Map-first view** - Map always visible
- ✅ **Floating chat input** - Fixed at bottom
- ✅ **Full-screen overlay** - Chat expands over map when active
- ✅ **Swipe to dismiss** - Swipe down to close chat overlay

---

## 🔄 AI-Map Interaction Patterns

### **1. AI Controls Map View**

**User**: "Show me homes in Palm Springs under $500k"

**AI Response**:
```json
{
  "message": "I found 47 homes in Palm Springs under $500k...",
  "mapAction": {
    "type": "zoom_to_bounds",
    "bounds": {
      "north": 33.8783,
      "south": 33.7803,
      "east": -116.4953,
      "west": -116.5953,
      "zoom": 12
    },
    "markers": [...],
    "highlight": ["listing-123", "listing-456", "listing-789"]
  }
}
```

**Result**: Map automatically zooms to Palm Springs and highlights the 47 properties

---

### **2. Map Selection Updates Chat**

**User**: *Clicks on a marker*

**Chat auto-responds**:
```
📍 123 Main Street - $475,000

This 3bd/2ba home is in the Vista Las Palmas neighborhood,
known for mid-century modern architecture. Built in 1958,
recently remodeled. Pool and mountain views.

Would you like to:
- See similar homes nearby
- Schedule a showing
- Get a CMA analysis
- Learn more about Vista Las Palmas
```

---

### **3. Follow-up Questions Stay in Context**

**User**: "Which of these are closest to good schools?"

**AI**: *Analyzes the 47 properties already on map*
```
The top 3 for schools are:
1. 456 Oak Ave - Near Desert Oasis High (9/10 rating)
2. 789 Palm Dr - Near Nellie Coffman Middle (8/10)
3. 321 Canyon Rd - Near Katherine Finchy Elementary (9/10)

I've highlighted them in blue on the map.
```

**Result**: Map markers update to show blue highlights on the 3 schools-adjacent homes

---

### **4. Visual Exploration Triggers AI Insights**

**User**: *Zooms out to see entire Coachella Valley*

**AI**: *Detects map change, offers insight*
```
💡 I notice you're looking at the broader area.

Quick insight: Palm Desert has the most listings (2,847)
followed by Palm Springs (1,923). Homes in Indian Wells
average $1.2M vs $650K in Cathedral City.

Want me to break down by city or neighborhood?
```

---

## 🎨 UI Component Strategy

### **Unified Component Structure**
```tsx
<ChapPage>
  <MLSProvider>
    <ChatProvider>
      <ChapLayout>
        {/* Desktop: Side-by-side */}
        {/* Tablet: Stacked */}
        {/* Mobile: Overlay */}

        <ChatPanel>
          <ChatHeader />
          <MessageList />
          <QuickFilters />
          <ChatInput />
        </ChatPanel>

        <MapPanel>
          <MapView />  {/* Full MapView, not ChatMapView */}
          <MapControls />
          <FilterPanel />
        </MapPanel>

        <ListingBottomPanel />  {/* Shared swipe UI */}
      </ChapLayout>
    </ChatProvider>
  </MLSProvider>
</ChapPage>
```

### **Key Components**

#### **ChapLayout** (New)
- Responsive layout manager
- Handles desktop/tablet/mobile switching
- Manages panel sizing and collapsing
- Keyboard shortcuts (ESC to close chat, etc.)

#### **ChatPanel** (Enhanced ChatWidget)
- Maintains all current chat functionality
- Adds map interaction callbacks
- Shows "AI is updating map..." states
- Quick filter chips for common queries

#### **MapPanel** (Uses existing MapView)
- Full-featured MapView (not ChatMapView)
- All clustering, boundaries, filters
- Listen for AI commands to update view
- Emit events when user interacts

#### **Unified State Bridge** (New)
```typescript
interface ChapState {
  // Chat state
  messages: Message[];
  isTyping: boolean;

  // Map state
  mapBounds: Bounds;
  visibleListings: Listing[];
  selectedListing: Listing | null;
  highlightedListings: string[];  // IDs to highlight

  // Interaction state
  aiControllingMap: boolean;
  userExploringMap: boolean;

  // Methods
  aiUpdateMap: (action: MapAction) => void;
  userSelectsListing: (listing: Listing) => void;
  userChangesView: (bounds: Bounds) => void;
}
```

---

## 🚀 Implementation Phases

### **Phase 1: Core Layout** (1 week)
**Goal**: Get basic split-screen working

- [ ] Create `ChapLayout` component
- [ ] Implement responsive breakpoints
- [ ] Desktop: Resizable panels with drag divider
- [ ] Tablet: Stacked layout with snap points
- [ ] Mobile: Overlay pattern
- [ ] Migrate `/` route to use new layout

**Deliverable**: Can see chat + full map side-by-side on desktop

---

### **Phase 2: AI → Map Control** (1 week)
**Goal**: AI can control map view

- [ ] Define `MapAction` interface
- [ ] Implement `aiUpdateMap()` method
- [ ] AI response includes map commands:
  - `zoom_to_bounds`
  - `highlight_markers`
  - `draw_circle` (radius search)
  - `set_filters`
- [ ] Smooth map transitions (animated zoom/pan)
- [ ] "AI is updating map..." loading states

**Deliverable**: AI can automatically zoom map to search results

---

### **Phase 3: Map → AI Feedback** (1 week)
**Goal**: Map interactions trigger AI responses

- [ ] Click marker → Auto-generate property summary
- [ ] Zoom out → AI offers area insights
- [ ] Apply filter → AI confirms and suggests follow-ups
- [ ] Select cluster → AI summarizes group
- [ ] Implement `userSelectsListing()` → AI response

**Deliverable**: Clicking a property shows AI-generated insights in chat

---

### **Phase 4: Context Persistence** (3 days)
**Goal**: Never lose conversation context

- [ ] URL state includes both chat and map
- [ ] Share button creates Chap link (chat history + map view)
- [ ] Browser back/forward works correctly
- [ ] Save chat sessions with map snapshots
- [ ] Resume conversations with map state

**Deliverable**: Can share exact Chap state via URL

---

### **Phase 5: Advanced Interactions** (1 week)
**Goal**: Sophisticated AI-map coordination

- [ ] Multi-step queries:
  - User: "Compare these 3 homes"
  - AI: "Click on 3 properties to compare"
  - User clicks 3 markers
  - AI: Generates comparison table
- [ ] Drawing tools:
  - User: "Show homes in this area"
  - AI: "Draw a circle on the map"
  - User draws circle
  - AI: Shows properties in circle
- [ ] Smart suggestions:
  - AI detects user zoomed to new area
  - Proactively offers: "Want to search here?"

**Deliverable**: Advanced AI-map collaboration features

---

### **Phase 6: Mobile Optimization** (3 days)
**Goal**: Perfect mobile experience

- [ ] Gesture controls (swipe, pinch, tap)
- [ ] Bottom sheet for chat (Material Design style)
- [ ] Map stays interactive while chat open
- [ ] Voice input for chat (hands-free)
- [ ] Share location for "homes near me"

**Deliverable**: Seamless mobile Chap experience

---

### **Phase 7: Deprecate Old Routes** (2 days)
**Goal**: Clean up old architecture

- [ ] `/map` redirects to `/?view=map` (opens with chat collapsed)
- [ ] Update all internal links to use Chap
- [ ] Archive `ChatMapView` (no longer needed)
- [ ] Update documentation
- [ ] Migration complete

**Deliverable**: Single unified experience, old routes deprecated

---

## 📊 Technical Decisions

### **Route Structure**

**Option A: Single Route with Query Params**
```
/ = Default (chat + map)
/?chat=collapsed = Map-only view
/?chat=expanded = Chat-focused view
/?session=abc123 = Restore saved session
```

**Option B: Separate Routes (Current)**
```
/ = Chat + Map (Chap)
/map = Legacy redirect to /?chat=collapsed
```

**Recommendation**: **Option A** - Simpler, single source of truth

---

### **State Management**

**Option A: Extend MLSProvider**
```typescript
// Add Chap-specific state to existing MLSProvider
const MLSProvider = {
  ...existingState,
  highlightedListings: string[],
  aiControllingMap: boolean,
  mapAction: MapAction | null,
}
```

**Option B: New ChapProvider**
```typescript
// New provider wraps both
<ChapProvider>
  <MLSProvider>
    <ChatProvider>
      ...
```

**Recommendation**: **Option A** - Less complexity, leverages existing architecture

---

### **Map Component**

**Option A: Use Full MapView**
```typescript
// ChatPanel and MapView share state via MLSProvider
<ChatPanel />
<MapView />  // Same component as /map page
```

**Option B: Create ChapMapView**
```typescript
// Hybrid component with ChatMapView simplicity + MapView features
<ChapMapView />
```

**Recommendation**: **Option A** - Reuse battle-tested MapView, avoid duplication

---

## 🎯 Success Metrics

### **User Experience**
- ✅ **Reduced friction**: No page switches needed
- ✅ **Faster searches**: AI + map work together instantly
- ✅ **Better context**: Conversation never resets
- ✅ **Mobile friendly**: Overlay pattern works great on phones

### **Technical**
- ✅ **Single codebase**: Eliminate ChatMapView duplication
- ✅ **Better performance**: One map instance, not switching between two
- ✅ **Easier maintenance**: One unified experience to test/update

### **Business**
- ✅ **Higher engagement**: Users stay in flow longer
- ✅ **More conversions**: Easier to explore and save properties
- ✅ **Better mobile**: Critical for on-the-go users
- ✅ **Unique differentiator**: No other real estate site has this

---

## 🎨 Visual Examples

### **Desktop - Default View**
```
┌─────────────────────────────────────────────────────────┐
│  🏠 JPS Realtor                                    ☀️🌙│
├──────────────────┬──────────────────────────────────────┤
│ 💬 Chat          │  🗺️ Palm Springs, CA               │
│                  │                                      │
│ You:             │     ╔═══╗ ╔═══╗                     │
│ Show me homes in │     ║ 🏠 ║ ║ 🏠 ║  ╔═══╗             │
│ Palm Springs     │     ╚═══╝ ╚═══╝  ║ 🏠 ║             │
│                  │                  ╚═══╝              │
│ AI:              │        ╔═══╗                         │
│ I found 47 homes │        ║ 🏠 ║  ╔═══╗                │
│ in Palm Springs  │        ╚═══╝  ║ 🏠 ║                │
│ under $500k.     │                ╚═══╝                 │
│                  │                                      │
│ [3bd/2ba card]   │  Zoom: 12  |  47 properties shown   │
│ [4bd/3ba card]   │  ├─ Satellite ─ Streets ─ Hybrid ┤  │
│ [2bd/2ba card]   │                                      │
│                  │                                      │
│ ┌──────────────┐ │                                      │
│ │ Type message │ │                                      │
│ └──────────────┘ │                                      │
└──────────────────┴──────────────────────────────────────┘
```

### **Mobile - Chat Collapsed**
```
┌──────────────────┐
│ 🏠 JPS Realtor   │
├──────────────────┤
│                  │
│    ╔═══╗         │
│    ║ 🏠 ║  ╔═══╗ │
│    ╚═══╝  ║ 🏠 ║ │
│            ╚═══╝ │
│                  │
│  ╔═══╗           │
│  ║ 🏠 ║  ╔═══╗   │
│  ╚═══╝  ║ 🏠 ║   │
│          ╚═══╝   │
│                  │
│  Zoom: 12        │
├──────────────────┤
│ 💬 Ask me...     │
└──────────────────┘
```

### **Mobile - Chat Expanded**
```
┌──────────────────┐
│ ✕ Close Chat     │
├──────────────────┤
│                  │
│ You: Show homes  │
│ in Palm Springs  │
│                  │
│ AI: I found 47   │
│ homes...         │
│                  │
│ [3bd/2ba card]   │
│ [4bd/3ba card]   │
│                  │
│ ┌──────────────┐ │
│ │ Type message │ │
│ └──────────────┘ │
└──────────────────┘
```

---

## 🤝 Integration with Existing Features

### **Swipe Discovery**
- Works the same in Chap
- Swipe left/right on desktop and mobile
- AI can queue up swipe recommendations:
  - "I found 12 homes. Want to swipe through them?"
  - User clicks yes → ListingBottomPanel opens with queue

### **Favorites**
- Heart icon on markers (map view)
- Save button in chat cards
- Both update same MLSProvider state
- Favorites panel accessible from both chat and map

### **Filters**
- AI interprets natural language → sets filters
- Manual filter panel still available on map
- Quick filter chips in chat:
  - "Under $500k" [x]
  - "3+ beds" [x]
  - "Pool" [x]

### **Articles/Insights**
- AI can reference articles in responses
- Article cards render in chat
- "Learn more about Palm Springs market trends" → article card

---

## 🎓 Example Interactions

### **Example 1: First-Time User**

**User lands on Chap**:
- Sees map of entire California
- Chat suggests: "Hi! Ask me about homes, or explore the map 👋"

**User**: "I'm looking for a family home in Orange County"

**AI**:
- Responds with text
- Zooms map to Orange County
- Highlights family-friendly areas
- Asks follow-up: "What's your budget?"

**User**: "Around $800k"

**AI**:
- Applies price filter
- Shows 342 homes on map
- Highlights top neighborhoods: Irvine, Tustin, Lake Forest

**User**: *Clicks on a marker in Irvine*

**AI**: Auto-generates property summary in chat

**User**: "Tell me about schools in Irvine"

**AI**: Responds with school info + shows school boundaries on map

---

### **Example 2: Power User**

**User**: "Compare appreciation rates: Palm Springs vs Palm Desert vs La Quinta"

**AI**:
- Generates comparison table in chat
- Draws colored boundaries on map (blue, green, yellow)
- Shows appreciation heatmap overlay
- Links to detailed appreciation analysis

**User**: "Show me the top 10 appreciating properties in Palm Springs from the last year"

**AI**:
- Highlights 10 markers in gold
- Ranks them in chat with % increase
- Offers: "Want to see these in swipe mode?"

**User**: "Yes"

**AI**: Opens ListingBottomPanel with the 10 properties queued

---

### **Example 3: Mobile User On-the-Go**

**User**: *At coffee shop, opens Chap on phone*

**User**: "Homes near me under $600k"

**AI**:
- Requests location permission
- Zooms map to user's current location
- Shows 23 nearby homes
- Chat displays closest 3 as cards

**User**: *Taps on a marker*

**Chat overlay appears** with property details

**User**: "Schedule a showing"

**AI**: "I'll connect you with Joseph. When works for you?"

---

## 📝 Migration Strategy

### **Week 1-2: Build Core Chap Layout**
- No breaking changes
- New `/chap` route for testing
- Existing `/` and `/map` routes unchanged

### **Week 3-4: Add AI-Map Interactions**
- Test with beta users
- Gather feedback
- Iterate on UX

### **Week 5: Soft Launch**
- Make `/` route use Chap
- Keep `/map` as legacy redirect
- Monitor analytics

### **Week 6: Full Migration**
- Deprecate old ChatMapView
- Update all documentation
- Remove legacy code

### **Week 7: Optimization**
- Performance tuning
- Mobile optimization
- Accessibility improvements

---

## ✅ Acceptance Criteria

**Chap is ready when**:

- [ ] User can chat and see map simultaneously on desktop
- [ ] AI responses automatically control map view
- [ ] Clicking markers generates AI insights in chat
- [ ] Follow-up questions maintain context
- [ ] Mobile overlay pattern works smoothly
- [ ] All existing features still work (swipe, favorites, filters)
- [ ] Performance is same or better than current pages
- [ ] No loss of functionality from either `/` or `/map`
- [ ] URL state is shareable
- [ ] Documentation is complete

---

## 🎉 Expected Outcomes

### **User Benefits**
- 🚀 **Faster property search** - No page switching
- 🧠 **Smarter exploration** - AI + visual map together
- 📱 **Better mobile UX** - Overlay pattern is intuitive
- 💾 **Never lose context** - Continuous conversation flow

### **Business Benefits**
- ⏱️ **Higher engagement** - Users spend more time in app
- 🎯 **More leads** - Easier to convert exploration to action
- 🏆 **Market differentiator** - Unique unified experience
- 📊 **Better analytics** - See how chat + map usage correlate

### **Technical Benefits**
- 🧹 **Cleaner codebase** - Remove ChatMapView duplication
- 🛠️ **Easier maintenance** - Single unified experience
- ⚡ **Better performance** - One map instance, optimized state
- 📚 **Simpler architecture** - Less cognitive load for developers

---

## 🔮 Future Enhancements (Post-Launch)

- **Voice Input**: "Hey Chap, show me homes near downtown"
- **AR Mode**: Point phone at neighborhood, see properties in AR
- **Collaborative Viewing**: Share Chap session with partner/agent
- **Smart Recommendations**: AI learns preferences, proactively suggests
- **3D Building View**: Integrate 3D building models on map
- **Virtual Tours**: Embedded 360° tours in chat responses

---

**Next Step**: Get approval on this high-level design, then move to detailed technical spec for Phase 1 implementation.

**Status**: 📋 Design Document - Ready for Review
**Owner**: Development Team
**Timeline**: 7 weeks (full implementation)
**Priority**: 🔥 High - Core differentiator for reenvisioning
