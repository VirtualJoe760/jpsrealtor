# Insights Page Redesign - AI-Powered Search

**Status:** 🎨 Design Phase
**Target:** Complete redesign of `/insights` page
**Last Updated:** November 30, 2025

## Design Decisions

### AI Search
- **Type:** Natural language understanding
- **User Experience:** "Show me articles about buying homes in Palm Desert" → AI interprets intent

### Display
- **Initial Sort:** Most recent first
- **Layout:** Accordion (expandable) with thumbnails
- **Style:** Click to expand, thumbnail always visible

### Filter Tabs
1. ✨ **AI Suggestions** - AI-curated based on query/context
2. 📁 **Categories** - Articles, Market Insights, Real Estate Tips
3. 📅 **Date** - Month/Year filters
4. 🏷️ **Topics** - Auto-generated from content

## Component Architecture

### New Components

```
src/app/components/insights/
├── AISearchBar.tsx          # Natural language search input
├── FilterTabs.tsx           # Tab navigation (AI, Categories, Date, Topics)
├── ArticleAccordion.tsx     # Expandable article card
├── ArticleGrid.tsx          # Grid container for accordions
├── AISuggestions.tsx        # AI-curated article list
├── DateFilter.tsx           # Month/Year picker
├── TopicCloud.tsx           # Auto-generated topic tags
└── SearchResults.tsx        # Results display with highlighting
```

### Page Structure

```
/insights
├── Hero Section
│   ├── Title: "Real Estate Insights"
│   ├── AI Search Bar (prominent, centered)
│   └── Quick stats/highlights
│
├── Filter Tabs
│   ├── AI Suggestions (active on search)
│   ├── Categories
│   ├── Date (Month/Year)
│   └── Topics/Tags
│
└── Article Display
    └── Accordion Grid
        ├── Thumbnail (left, always visible)
        ├── Title + Excerpt (collapsed)
        └── Full content preview (expanded)
```

## AI Search Implementation

### Phase 1: Natural Language Processing

**API:** `/api/articles/ai-search`

**Input:**
```typescript
{
  query: "articles about buying homes in Palm Desert",
  limit: 20,
  filters?: {
    category?: string
    dateFrom?: string
    dateTo?: string
    topics?: string[]
  }
}
```

**AI Processing:**
1. Extract intent from query
2. Identify keywords (e.g., "buying", "homes", "Palm Desert")
3. Classify query type (location-based, topic-based, etc.)
4. Generate search parameters
5. Rank articles by relevance

**Output:**
```typescript
{
  results: Article[]
  intent: {
    action: "buying" | "selling" | "investing" | "learning"
    location: "Palm Desert" | "Coachella Valley" | etc.
    topics: string[]
  }
  suggestions: string[]  // Alternative queries
}
```

### Phase 2: Article Ranking Algorithm

**Factors:**
1. **Keyword Match** (40%) - Title, excerpt, content
2. **Semantic Similarity** (30%) - AI understanding of meaning
3. **Recency** (15%) - Newer articles ranked higher
4. **Engagement** (15%) - Views, time-on-page (future)

**Implementation:**
```typescript
// Groq prompt for ranking
const rankingPrompt = `
You are a search relevance expert. Given this query:
"${userQuery}"

And these articles:
${articles.map(a => `- ${a.title}: ${a.excerpt}`).join('\n')}

Rank them by relevance (1-10 scale) and explain why.
`;
```

## Component Specifications

### 1. AISearchBar Component

**Features:**
- Large, prominent search input
- AI sparkle icon
- "Ask me anything about real estate..." placeholder
- Auto-suggest as user types
- Voice input (optional future enhancement)

**Example Queries:**
- "What are the best neighborhoods for families?"
- "Articles about Indian lease land"
- "Market trends in Palm Desert 2025"
- "How to finance a home in Cathedral City"

```tsx
<AISearchBar
  onSearch={(query) => handleAISearch(query)}
  placeholder="Ask me anything about Coachella Valley real estate..."
  suggestions={recentSearches}
  isLoading={searching}
/>
```

### 2. ArticleAccordion Component

**Collapsed State:**
```
┌────────────────────────────────────────────┐
│ [Thumbnail]  Title of Article              │
│  150x150     Short excerpt preview...      │
│              📅 Nov 30, 2025 | 📁 Articles │
│                                 [▼ Expand] │
└────────────────────────────────────────────┘
```

**Expanded State:**
```
┌────────────────────────────────────────────┐
│ [Thumbnail]  Title of Article              │
│  150x150     Full excerpt with more detail │
│              describing the article content│
│              in 2-3 sentences...           │
│                                            │
│  📅 Published: Nov 30, 2025                │
│  📁 Category: Market Insights              │
│  🏷️ Topics: Palm Desert, Buying, Investment│
│                                            │
│  [Read Full Article →]      [▲ Collapse]  │
└────────────────────────────────────────────┘
```

**Props:**
```typescript
interface ArticleAccordionProps {
  article: {
    title: string
    excerpt: string
    image: string
    category: string
    date: string
    slug: string
    topics: string[]
  }
  isExpanded: boolean
  onToggle: () => void
  highlightTerms?: string[]  // For search highlighting
}
```

### 3. FilterTabs Component

**Tab Structure:**
```tsx
<FilterTabs active={activeTab} onChange={setActiveTab}>
  <Tab name="ai-suggestions" icon={<Sparkles />} badge={suggestedCount}>
    AI Suggestions
  </Tab>
  <Tab name="categories" icon={<FolderIcon />}>
    Categories
  </Tab>
  <Tab name="date" icon={<Calendar />}>
    Date
  </Tab>
  <Tab name="topics" icon={<Tags />}>
    Topics
  </Tab>
</FilterTabs>
```

**Sub-Filters (shown when tab active):**

**AI Suggestions Tab:**
- "Based on your search: '{query}'"
- "Related articles you might like"
- Dynamically generated by AI

**Categories Tab:**
- Articles
- Market Insights
- Real Estate Tips
- All Categories

**Date Tab:**
- Dropdown: Year selector (2024, 2025, etc.)
- Dropdown: Month selector (Jan, Feb, etc.)
- Quick filters: "Last 30 days", "Last 3 months", "This year"

**Topics Tab:**
- Auto-generated tag cloud
- Example topics:
  - Palm Desert
  - Buying Guide
  - Market Trends
  - Investment
  - First-Time Buyers
  - Luxury Homes
  - etc.

### 4. TopicCloud Component

**Auto-Generation:**
```typescript
// Extract topics from all articles using AI
const topics = await extractTopics(articles);

// Example output:
[
  { name: "Palm Desert", count: 45, category: "location" },
  { name: "Buying Guide", count: 32, category: "topic" },
  { name: "Market Trends", count: 28, category: "topic" },
  { name: "Indian Lease Land", count: 12, category: "topic" },
  // ...
]
```

**Visual Style:**
- Variable font sizes based on frequency
- Color-coded by category
- Clickable to filter
- Smooth animations

## API Endpoints

### GET `/api/articles/search`

**Query Parameters:**
```
?q=palm%20desert%20homes
&category=articles
&dateFrom=2025-01-01
&topics=buying,investment
&limit=20
&offset=0
```

### POST `/api/articles/ai-search`

**Body:**
```json
{
  "query": "What are the best neighborhoods for young families?",
  "filters": {
    "category": "articles",
    "minDate": "2025-01-01"
  }
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "article": { /* article data */ },
      "relevanceScore": 9.2,
      "matchReasons": [
        "Contains 'families' in title",
        "Discusses neighborhood comparisons",
        "Recent publication (Nov 2025)"
      ]
    }
  ],
  "intent": {
    "action": "research",
    "audience": "young families",
    "topic": "neighborhoods"
  },
  "suggestions": [
    "Best schools in Coachella Valley",
    "Family-friendly communities in Palm Desert",
    "Parks and recreation in the area"
  ]
}
```

### GET `/api/articles/topics`

Auto-generates topic cloud from all articles.

**Response:**
```json
{
  "topics": [
    {
      "name": "Palm Desert",
      "count": 45,
      "category": "location",
      "slug": "palm-desert"
    },
    {
      "name": "First-Time Buyers",
      "count": 32,
      "category": "audience",
      "slug": "first-time-buyers"
    }
  ]
}
```

## Implementation Plan

### Phase 1: Core Components (Week 1)
- [ ] Create AISearchBar component
- [ ] Build ArticleAccordion component
- [ ] Implement FilterTabs component
- [ ] Design responsive grid layout

### Phase 2: AI Search Backend (Week 1-2)
- [ ] Create `/api/articles/ai-search` endpoint
- [ ] Implement natural language processing with Groq
- [ ] Build intent extraction logic
- [ ] Create article ranking algorithm
- [ ] Add search result highlighting

### Phase 3: Filtering System (Week 2)
- [ ] Implement category filtering
- [ ] Build date range filters
- [ ] Create topic extraction system
- [ ] Generate topic cloud

### Phase 4: AI Suggestions (Week 2-3)
- [ ] Build suggestion algorithm
- [ ] Implement "related articles" logic
- [ ] Add personalization (optional)
- [ ] Create fallback for zero results

### Phase 5: Polish & Testing (Week 3)
- [ ] Add loading states
- [ ] Implement error handling
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] SEO optimization
- [ ] Analytics integration

## Design Mockup

### Desktop Layout

```
┌─────────────────────────────────────────────────────────────┐
│                    Real Estate Insights                      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  🤖 Ask me anything about Coachella Valley real estate...│ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ✨ AI Suggestions | 📁 Categories | 📅 Date | 🏷️ Topics    │
│  ───────────────────────────────────────────────────────── │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ [IMG] Indian Lease Land: What You Need to Know    [▼]│  │
│  │       Learn about lease land in Palm Desert...       │  │
│  │       📅 Nov 30, 2025 | 📁 Articles                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ [IMG] Best Neighborhoods for Families            [▼]│  │
│  │       Discover family-friendly areas in...          │  │
│  │       📅 Nov 28, 2025 | 📁 Market Insights           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ [IMG] Market Trends 2025                         [▲]│  │
│  │       Full description shown when expanded...        │  │
│  │       Detailed preview of article content here with  │  │
│  │       additional information and topics.             │  │
│  │                                                       │  │
│  │       📅 Nov 25, 2025 | 📁 Market Insights           │  │
│  │       🏷️ Palm Desert, Trends, 2025                    │  │
│  │                                                       │  │
│  │       [Read Full Article →]                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│              [Load More Articles]                            │
└─────────────────────────────────────────────────────────────┘
```

### Mobile Layout

```
┌────────────────────────┐
│  Real Estate Insights  │
│                        │
│  ┌──────────────────┐ │
│  │  🤖 Search...    │ │
│  └──────────────────┘ │
│                        │
│  ✨ AI | 📁 Cat | 📅  │
│  ─────────────────── │
│                        │
│  ┌──────────────────┐ │
│  │ [IMG]           │ │
│  │ Article Title   │ │
│  │ Short excerpt.. │ │
│  │ 📅 Nov 30    [▼]│ │
│  └──────────────────┘ │
│                        │
│  ┌──────────────────┐ │
│  │ [IMG]           │ │
│  │ Article Title   │ │
│  │ Full expanded   │ │
│  │ content here... │ │
│  │ 📅 Nov 28       │ │
│  │ [Read →]    [▲]│ │
│  └──────────────────┘ │
│                        │
│      [Load More]       │
└────────────────────────┘
```

## Technical Stack

**Frontend:**
- React (Next.js App Router)
- Framer Motion (animations)
- Tailwind CSS (styling)
- Lucide React (icons)

**AI/Search:**
- Groq (llama-3.3-70b-versatile)
- Natural language processing
- Intent extraction
- Relevance ranking

**Data:**
- MDX articles from `src/posts/`
- MongoDB (optional caching)
- Real-time filtering client-side

## Success Metrics

- [ ] Search query understanding >90% accuracy
- [ ] Results relevance score >8/10 average
- [ ] Mobile responsive on all devices
- [ ] <2s load time for initial page
- [ ] <500ms filter/sort operations
- [ ] Accessibility WCAG 2.1 AA compliant

## Next Steps

1. Review and approve design
2. Create component stubs
3. Implement AI search backend
4. Build accordion component
5. Integrate filtering system
6. Test and iterate

---

**Ready to start implementation?** 🚀
