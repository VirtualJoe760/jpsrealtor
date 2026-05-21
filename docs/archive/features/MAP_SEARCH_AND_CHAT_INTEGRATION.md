# Map Search + ChatWidget Integration

**Date**: December 11, 2025
**Status**: Implementation Plan
**Approach**: Build search into /map, then add ChatWidget overlay

---

## 🎯 Strategy

Instead of merging two pages, **enhance the map page** with:
1. **Search bar** for natural language queries
2. **ChatWidget** as an optional overlay/panel
3. **Keep map as the primary interface**

This is simpler and leverages your already-powerful map page.

---

## 🏗️ Architecture

### **Current Map Page**
```tsx
/map
  └─ MLSProvider
      └─ MapPageContent
          ├─ MapView (full-featured)
          ├─ Filter controls
          ├─ Style switcher
          └─ ListingBottomPanel
```

### **Enhanced Map Page**
```tsx
/map
  └─ MLSProvider
      └─ ChatProvider  ← ADD THIS
          └─ MapPageContent
              ├─ SearchBar  ← NEW (natural language)
              ├─ MapView (full-featured)
              ├─ Filter controls
              ├─ Style switcher
              ├─ ListingBottomPanel
              └─ ChatWidget (collapsible)  ← NEW (overlay)
```

---

## 🔍 Search Feature Design

### **Search Bar Placement**

#### **Desktop**
```
┌─────────────────────────────────────────────────────┐
│  🏠 JPS Realtor                            Profile  │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐   │
│  │  🔍 Search: "3br homes in Palm Springs..."  │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  [Filter] [Style] [Favorites]          [💬 Chat]   │
│                                                     │
│              🗺️ MAP VIEW                           │
│                                                     │
│           (markers, clusters, boundaries)           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Position**: Top center, below header
**Width**: 600px max-width
**Style**: Prominent search bar with AI sparkle icon

#### **Mobile**
```
┌────────────────────┐
│  🏠 JPS Realtor    │
├────────────────────┤
│  [🔍 Search...]    │  ← Compact search button
├────────────────────┤
│                    │
│                    │
│    🗺️ MAP          │
│                    │
│                    │
│                    │
│                    │
├────────────────────┤
│ [Filters] [Chat💬] │
└────────────────────┘
```

**Position**: Fixed at top (collapses on scroll down, shows on scroll up)
**Tap to expand**: Full-screen search overlay

---

## 🎨 Search Bar Component

### **Design**

```tsx
// src/app/components/map/MapSearchBar.tsx

interface MapSearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export default function MapSearchBar({ onSearch, isLoading }: MapSearchBarProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  return (
    <div className="relative w-full max-w-2xl mx-auto px-4 py-3">
      {/* Search Input */}
      <div className={`
        relative flex items-center gap-3 px-4 py-3 rounded-xl
        backdrop-blur-md transition-all
        ${isLight
          ? 'bg-white/90 shadow-lg border border-gray-200'
          : 'bg-gray-900/90 shadow-2xl border border-gray-700'}
      `}>
        {/* AI Sparkle Icon */}
        <Sparkles className={`w-5 h-5 ${
          isLight ? 'text-blue-500' : 'text-emerald-500'
        }`} />

        {/* Input Field */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch(query)}
          placeholder="Ask me anything... 'Show 3br homes in Palm Springs under $500k'"
          className={`
            flex-1 bg-transparent outline-none text-base
            ${isLight ? 'text-gray-900 placeholder-gray-500' : 'text-white placeholder-gray-400'}
          `}
        />

        {/* Loading or Search Button */}
        {isLoading ? (
          <Loader2 className={`w-5 h-5 animate-spin ${
            isLight ? 'text-blue-500' : 'text-emerald-500'
          }`} />
        ) : (
          <button
            onClick={() => onSearch(query)}
            className={`p-2 rounded-lg transition-colors ${
              isLight
                ? 'hover:bg-blue-50 text-blue-600'
                : 'hover:bg-emerald-900/50 text-emerald-500'
            }`}
          >
            <Search className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Quick Suggestions (on focus) */}
      {suggestions.length > 0 && (
        <div className={`
          absolute top-full left-0 right-0 mt-2 p-2 rounded-xl backdrop-blur-md
          ${isLight ? 'bg-white/95 shadow-lg' : 'bg-gray-900/95 shadow-2xl'}
        `}>
          {suggestions.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => {
                setQuery(suggestion);
                onSearch(suggestion);
              }}
              className={`
                w-full text-left px-4 py-2 rounded-lg transition-colors
                ${isLight
                  ? 'hover:bg-blue-50 text-gray-700'
                  : 'hover:bg-emerald-900/30 text-gray-300'}
              `}
            >
              <Lightbulb className="w-4 h-4 inline mr-2" />
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### **Quick Suggestions**

Pre-populate common searches:
- "Show homes under $500k"
- "3 bedroom homes in Palm Springs"
- "Homes with pools near me"
- "Recently reduced properties"
- "Waterfront homes in the desert"
- "Investment properties with high ROI"

---

## 💬 ChatWidget Integration

### **Position Options**

#### **Option A: Bottom-Right Floating Button** (Recommended)
```
┌─────────────────────────────────────────┐
│  [Search bar]                           │
├─────────────────────────────────────────┤
│                                         │
│          🗺️ MAP                        │
│                                         │
│                                         │
│                                    ┌────┤
│                                    │ 💬 │
│                                    │Chat│
└────────────────────────────────────┴────┘
```

**Implementation**:
```tsx
// Floating chat button
<motion.button
  onClick={() => setShowChat(!showChat)}
  className={`
    fixed bottom-6 right-6 z-50
    p-4 rounded-full shadow-2xl
    ${isLight ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}
  `}
  whileHover={{ scale: 1.1 }}
  whileTap={{ scale: 0.95 }}
>
  <MessageSquare className="w-6 h-6 text-white" />
  {unreadMessages > 0 && (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
      {unreadMessages}
    </span>
  )}
</motion.button>

{/* Chat Panel (when open) */}
<AnimatePresence>
  {showChat && (
    <motion.div
      initial={{ opacity: 0, x: 400 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 400 }}
      className={`
        fixed bottom-6 right-6 z-40
        w-96 h-[600px] rounded-2xl shadow-2xl overflow-hidden
        ${isLight ? 'bg-white' : 'bg-gray-900'}
      `}
    >
      <ChatWidget
        mode="overlay"  // New prop
        onClose={() => setShowChat(false)}
        onMapAction={(action) => handleAIMapAction(action)}
      />
    </motion.div>
  )}
</AnimatePresence>
```

**Benefits**:
- ✅ Doesn't obstruct map view
- ✅ Familiar pattern (like chat support widgets)
- ✅ Easy to open/close
- ✅ Shows unread message count

---

#### **Option B: Left Panel (Collapsible)**
```
┌───┬─────────────────────────────────────┐
│   │  [Search bar]                       │
│💬 ├─────────────────────────────────────┤
│   │                                     │
│C  │          🗺️ MAP                    │
│h  │                                     │
│a  │                                     │
│t  │                                     │
│   │                                     │
└───┴─────────────────────────────────────┘
```

**Benefits**:
- ✅ More vertical space for chat
- ✅ Side-by-side comparison
- ❌ Takes map space (less ideal on smaller screens)

---

#### **Option C: Mobile Bottom Sheet**
```
Mobile Only:

┌────────────────────┐
│  [Search]          │
├────────────────────┤
│                    │
│    🗺️ MAP          │
│                    │
│                    │
├────────────────────┤
│ ▔▔▔ Swipe up ▔▔▔  │ ← Drag handle
│ 💬 Chat (3 msgs)   │
└────────────────────┘

When swiped up:
┌────────────────────┐
│ ▁▁▁ Swipe down ▁▁▁ │
├────────────────────┤
│                    │
│  💬 CHAT           │
│                    │
│  Messages...       │
│                    │
│  [Input box]       │
└────────────────────┘
```

**Implementation**: Use `framer-motion` drag gestures + snap points

---

## 🔄 Search + Chat Integration Flow

### **Flow 1: Search → AI Response → Map Update**

```
1. User types in search bar:
   "Show me 3br homes in Palm Springs under $500k"

2. handleSearch():
   - Call AI API (same as ChatWidget)
   - AI returns listings + map bounds

3. Update map:
   - Zoom to bounds
   - Show markers
   - Highlight results

4. Show results:
   - Option A: Results appear in chat widget (if open)
   - Option B: Results appear as overlay cards on map
   - Option C: Bottom carousel of properties

5. User can:
   - Click markers → see details
   - Open chat for follow-up questions
   - Apply filters manually
```

### **Flow 2: Chat Follow-up Questions**

```
1. User clicks chat button
   → Chat panel slides open

2. Chat shows context:
   "You searched for: 3br homes in Palm Springs under $500k
    I found 47 properties. What would you like to know?"

3. User: "Which are near good schools?"

4. AI:
   - Analyzes the 47 properties already on map
   - Highlights 3 best options
   - Shows school ratings in chat

5. Map updates:
   - Highlights 3 properties in blue
   - Draws school district boundaries
```

### **Flow 3: Map → Chat**

```
1. User clicks marker on map

2. Auto-opens chat (if not open)

3. AI generates property summary:
   "📍 123 Main Street - $475,000

    This 3bd/2ba home in Vista Las Palmas features:
    - Recently remodeled (2023)
    - Pool and mountain views
    - Mid-century modern architecture
    - Near top-rated schools

    Want to:
    - Schedule a showing
    - See similar homes
    - Get a CMA analysis"

4. User can continue conversation about this property
```

---

## 🎨 UI Component Structure

### **Updated MapPageContent**

```tsx
function MapPageContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [searchResults, setSearchResults] = useState<Listing[]>([]);

  // Handle search from search bar
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    // Call AI API (same as ChatWidget)
    const response = await fetch("/api/chat/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });

    const data = await response.json();

    if (data.success) {
      // Update map bounds
      if (data.mapBounds) {
        handleBoundsChange(data.mapBounds);
      }

      // Update markers/listings
      if (data.listings) {
        setSearchResults(data.listings);
        loadListings(data.mapBounds, filters);
      }

      // Add to chat history (if chat is open)
      if (showChat) {
        setChatMessages([
          ...chatMessages,
          { role: "user", content: query },
          { role: "assistant", content: data.response }
        ]);
      }
    }
  };

  // Handle AI map actions from chat
  const handleAIMapAction = (action: MapAction) => {
    switch (action.type) {
      case "zoom_to_bounds":
        handleBoundsChange(action.bounds);
        break;
      case "highlight_markers":
        setHighlightedListings(action.listingIds);
        break;
      case "apply_filters":
        setFilters(action.filters);
        break;
    }
  };

  return (
    <>
      {/* Search Bar */}
      <MapSearchBar
        onSearch={handleSearch}
        isLoading={isLoading}
      />

      {/* Map View */}
      <MapView
        // ... existing props
        highlightedListings={highlightedListings}
        searchResults={searchResults}
      />

      {/* Existing controls */}
      <FilterPanel />
      <MapControls />
      <FavoritesPannel />
      <ListingBottomPanel />

      {/* Chat Button */}
      <motion.button
        onClick={() => setShowChat(!showChat)}
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl bg-blue-600"
      >
        <MessageSquare className="w-6 h-6 text-white" />
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            className="fixed bottom-6 right-6 z-40 w-96 h-[600px]"
          >
            <ChatWidget
              mode="overlay"
              messages={chatMessages}
              onClose={() => setShowChat(false)}
              onMapAction={handleAIMapAction}
              initialContext={`Current search: ${searchQuery}`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

---

## 📱 Mobile Considerations

### **Search Bar**
- Collapses to icon on scroll down (more map space)
- Shows on scroll up
- Tap to expand full-screen overlay

### **Chat Button**
- Bottom-left (not right, to avoid gesture conflicts)
- Smaller on mobile (48px circle)
- Badge for unread messages

### **Chat Panel**
- Bottom sheet (Material Design style)
- Drag handle to resize
- Snap points: 25%, 50%, 85% of screen
- Swipe down to dismiss

---

## ✅ Implementation Checklist

### **Phase 1: Search Bar** (2-3 days)
- [ ] Create `MapSearchBar` component
- [ ] Add to `/map` page above map
- [ ] Connect to AI API (reuse chat endpoint)
- [ ] Handle search results → update map bounds
- [ ] Show loading states
- [ ] Add quick suggestions dropdown
- [ ] Mobile: Collapsible search bar
- [ ] Mobile: Full-screen search overlay

### **Phase 2: Chat Integration** (2-3 days)
- [ ] Add chat button (bottom-right floating)
- [ ] Wrap MapPageContent in ChatProvider
- [ ] Create overlay mode for ChatWidget
- [ ] Pass `onMapAction` prop to ChatWidget
- [ ] Handle AI map commands (zoom, highlight, filter)
- [ ] Sync search bar queries with chat history
- [ ] Mobile: Bottom sheet implementation
- [ ] Add unread message badge

### **Phase 3: Enhanced Interactions** (2-3 days)
- [ ] Marker click → auto-open chat with property details
- [ ] Chat can reference current map view
- [ ] Follow-up questions maintain context
- [ ] "Show on map" buttons in chat responses
- [ ] Highlight markers mentioned in chat
- [ ] Quick actions in chat (filters, areas, comparisons)

### **Phase 4: Polish** (1-2 days)
- [ ] Animations and transitions
- [ ] Keyboard shortcuts (Cmd+K to open search, ESC to close chat)
- [ ] Empty states and error handling
- [ ] Accessibility (ARIA labels, keyboard navigation)
- [ ] Performance optimization
- [ ] Analytics events

---

## 🎯 Success Metrics

**User Experience**:
- ✅ Can search via natural language without leaving map
- ✅ Chat is optional (doesn't get in the way)
- ✅ Map remains the primary interface
- ✅ Easy to switch between search and manual exploration

**Technical**:
- ✅ Reuses existing ChatWidget (no duplication)
- ✅ Minimal changes to map page architecture
- ✅ Chat state managed separately (can be opened/closed)
- ✅ Search bar is simple and performant

**Business**:
- ✅ Faster property search (search bar + map)
- ✅ Optional AI assistance (chat when needed)
- ✅ Familiar map interface (less learning curve)
- ✅ Mobile-friendly (bottom sheet pattern)

---

## 🚀 Migration Strategy

### **Week 1: Search Bar**
- Build and test search bar component
- Add to `/map` page (doesn't affect existing functionality)
- Connect to AI API
- Test with real queries

### **Week 2: Chat Integration**
- Add floating chat button
- Integrate ChatWidget as overlay
- Test AI → map interactions
- Mobile bottom sheet implementation

### **Week 3: Polish & Launch**
- Animations and transitions
- Mobile optimizations
- User testing and feedback
- Soft launch to beta users

### **Week 4: Monitor & Iterate**
- Analytics review
- Performance monitoring
- User feedback collection
- Iterate based on data

---

## 💡 Key Advantages of This Approach

1. **Incremental**: Add features without breaking existing map
2. **Simple**: Search bar + optional chat (not forced)
3. **Familiar**: Map stays primary (users know how to use it)
4. **Flexible**: Chat can be hidden if not needed
5. **Fast to build**: Reuse existing components
6. **Mobile-friendly**: Bottom sheet is proven pattern

---

## 🎨 Visual Mockup

### **Desktop - Search Only**
```
┌─────────────────────────────────────────────────────┐
│  🏠 JPSRealtor                            Profile   │
├─────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐ │
│  │ ✨ Ask me anything...                     🔍  │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│  [Filters] [Style] [Favorites]                     │
│                                                     │
│              🗺️ Markers, clusters, boundaries      │
│                                                     │
│                                            ┌────┐  │
│                                            │💬  │  │
│                                            │Chat│  │
│                                            └────┘  │
└─────────────────────────────────────────────────────┘
```

### **Desktop - With Chat Open**
```
┌─────────────────────────────────────────────────────┐
│  🏠 JPSRealtor                            Profile   │
├─────────────────────────────────────────────────────┤
│  [Search: "3br homes in Palm Springs..."]          │
├─────────────────────────────────────┬───────────────┤
│                                     │  💬 Chat      │
│     🗺️ MAP                         │  ─────────    │
│                                     │               │
│     (markers showing results)       │  You: Show... │
│                                     │               │
│                                     │  AI: I found  │
│                                     │  47 homes...  │
│                                     │               │
│                                     │  [Card]       │
│                                     │  [Card]       │
│                                     │               │
│                                     │  [Input...]   │
└─────────────────────────────────────┴───────────────┘
```

---

**This approach is simpler, faster to build, and keeps the map as the star of the show!** 🎯

Ready to start with Phase 1 (search bar)?
