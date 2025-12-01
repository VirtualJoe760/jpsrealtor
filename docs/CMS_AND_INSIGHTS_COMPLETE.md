# CMS & Insights Page - Complete Documentation

**Last Updated:** December 1, 2025
**Status:** ✅ Production Ready - All Features Implemented

## Overview

Complete CMS system with AI-powered article generation and redesigned Insights page featuring natural language search, category filtering, and modern UI components. All changes are live on production.

## Table of Contents

1. [CMS System](#cms-system)
2. [Insights Page](#insights-page)
3. [Navigation Updates](#navigation-updates)
4. [Recent Changes (Dec 1, 2025)](#recent-changes)
5. [API Endpoints](#api-endpoints)
6. [Components](#components)

---

## CMS System

### Article List Page (`/admin/cms`)

**Modern Minimal Design:**
- Auto-scrolling stats carousel (3-second intervals, 6 metrics)
- Icon-only "New Article" button (+ icon) positioned opposite header with `justify-between`
- No card backgrounds - clean, content-focused layout
- HR dividers between article rows for visual separation
- Article thumbnails (64x64 desktop, 80x80 mobile)
- Translucent backgrounds on article rows for better readability:
  - Light mode: `bg-white/40 backdrop-blur-sm`
  - Dark mode: `bg-gray-900/40 backdrop-blur-sm`

**Stats Carousel:**
- 6 metrics displayed one at a time
- Auto-scrolls every 3 seconds
- Icon + label + data on single horizontal line
- Clickable indicator dots for manual navigation
- Metrics tracked:
  1. All Published Articles
  2. Live on Website
  3. Draft Articles
  4. General Articles
  5. Market Insights
  6. Real Estate Tips

**Features:**
- Search by title/content (auto-filters on input change, no submit button)
- Filter by category dropdown (Articles, Market Insights, Real Estate Tips)
- Removed obsolete filters: Status, Year, Month
- Responsive layout: Desktop list view, mobile card view

**Actions per Article:**
- **View** - Opens article on live site
- **Edit** - Opens in editor (`/admin/cms/edit/[slugId]`)
- **Unpublish** - Sets `draft: true` in frontmatter (non-destructive)
- **Delete** - Permanently removes MDX file from GitHub (with warning confirmation)

**Article Type Definition:**
```typescript
interface Article {
  title: string;
  slug: string;
  date: string;
  category: string;
  excerpt: string;
  image?: string;
  draft?: boolean;
  keywords?: string[];
}
```

### Article Editor (`/admin/cms/edit/[slugId]` and `/admin/cms/new`)

**Tab Navigation:**
- Styled like AdminNav with colored underline indicators
- Active tab shows colored bottom border (blue/emerald based on theme)
- Tabs: Generate, Edit, Preview
- Preview button opens modal overlay (doesn't change tab)

**Action Buttons:**
- **Save Draft** - Saves with `draft: true` flag (orange button)
- **Publish to Site** - Publishes and auto-deploys (green button)
- Both buttons on same flex line with gap-3
- No "Save to DB" button (removed for simplicity)

**Preview Modal:**
- Full-screen overlay with dark backdrop
- Large preview window (90vh height, max-width 6xl)
- X button in top-right corner to close
- Preview loads in iframe
- Uses route: `/articles/preview` with URLSearchParams

**Form Sections:**
All backgrounds removed for cleaner, minimal design:
- Title input (no background)
- Excerpt textarea (no background)
- Content editor (no background)
- Tags section (no background)
- Category dropdown (no background)
- Featured Image upload (no background)
- SEO fields (no background)

**AI Article Generator:**
- Background removed
- Hidden on mobile (visible only on desktop with `hidden lg:block`)
- Users use Preview button/tab on mobile instead

**Publishing Pipeline:**
```typescript
// API: POST /api/articles/publish
{
  "article": { /* article data */ },
  "slugId": "article-slug",
  "autoDeploy": true
}

// API: POST /api/articles/set-draft
{
  "slugId": "article-slug",
  "draft": true
}

// API: DELETE /api/articles/unpublish?slugId={slug}
// Permanently deletes MDX file from src/posts/
```

---

## Insights Page

### Main Page (`/insights`)

**Header:**
- Title: "Real Estate Insights"
- Subtitle: "Discover expert advice, market insights, and tips..."
- Market Stats component displaying mortgage rates and economic data

**Filter Tabs:**
Three main tabs with Admin-style underline indicators:
1. **AI Suggestions** - Natural language search results
2. **Categories** - Filter by category
3. **Topics** - Auto-generated topic cloud

**Category Filter:**
When Categories tab is active, shows four category buttons:
- **All** (FolderOpen icon)
- **Articles** (FileText icon)
- **Insights** (TrendingUp icon)
- **Tips** (Lightbulb icon)

**Button Styling:**
- Border-bottom container with underline indicator style
- Active state: Colored bottom border (blue/emerald) with matching text
- Inactive state: Transparent border with secondary text color
- Smooth hover transitions
- Centered with `justify-center`
- Responsive text sizing (text-sm md:text-base)

### AI Search Bar

**Features:**
- Natural language input
- Placeholder: "Ask me anything about Coachella Valley real estate..."
- AI sparkle icon
- Real-time suggestions
- Only shown on AI Suggestions tab

**Example Queries:**
- "articles about Palm Desert homes"
- "buying guide for first-time buyers"
- "market trends 2025"

**API Endpoint:** `POST /api/articles/ai-search`
```json
{
  "query": "articles about Palm Desert homes",
  "limit": 50
}
```

**Response:**
```json
{
  "results": [
    {
      "article": { /* article data */ },
      "relevanceScore": 9.2,
      "matchReasons": ["reason 1", "reason 2"]
    }
  ],
  "suggestions": ["related query 1", "related query 2"]
}
```

### Article Display

**ArticleAccordion Component:**
- Simplified from accordion to clickable card
- Entire card is now a Link to article page
- No expand/collapse functionality
- Clean, minimal design

**Card Layout:**
```
┌─────────────────────────────────────────┐
│ [Thumbnail]  Title                      │
│   80x80      Excerpt text...            │
│              📅 Date | 📁 Category      │
└─────────────────────────────────────────┘
```

**Features:**
- Thumbnail always visible
- Click anywhere to navigate to article
- No "Read Full Article" button (removed)
- Topics section hidden
- Search term highlighting when searching

### Topic Cloud

**Auto-Generation:**
- Extracts topics from article keywords
- Groups by category (location, topic, audience)
- Clickable tags to filter articles
- Variable sizing based on frequency

**API:** `GET /api/articles/topics`
```json
{
  "topics": [
    {
      "name": "Palm Desert",
      "count": 45,
      "category": "location"
    }
  ]
}
```

### Market Stats Component

**Displays:**
- Current 30-year mortgage rate
- Current 15-year mortgage rate
- Current 5/1 ARM rate
- Historical rate trends (past 12 months)
- Economic indicators (inflation, unemployment)

**Environment Variables Required:**
- `API_NINJA_KEY` - For current mortgage rates (CA specific)
- `FRED_API_KEY` - For historical rates and economic data

**Setup Instructions:**
See `VERCEL_ENV_SETUP.md` for configuring on Vercel

### Article Page (`/insights/[category]/[slugId]`)

**Layout:**
- Back button: "Back to insights" (always goes to `/insights`)
- Article header with BookOpen icon
- Featured image
- Article content with prose styling
- No Contact component (removed for cleaner layout)

**Back Button:**
- Always navigates to `/insights` regardless of category
- Text: "Back to insights"
- Icon: ArrowLeft

**Theme-Appropriate Styling:**
- Light mode: Blue accents, slate text, white backgrounds
- Dark mode: Emerald accents, gray text, dark backgrounds
- Prose styling adapts to theme

---

## Navigation Updates

### Enhanced Sidebar

**Dashboard Dropdown:**
- Separate click handlers for navigation vs. dropdown
- Click "Dashboard" text/icon: Navigate to `/dashboard` and close sidebar
- Click chevron icon: Toggle dropdown open/closed, sidebar stays open
- Wrapped chevron in clickable div with `stopPropagation()`

**Menu Items:**
- Chat (MessageSquare icon) → `/`
- Map (Map icon) → `/map`
- **Insights** (Lightbulb icon) → `/insights` (changed from "Articles")
- Neighborhoods (MapPin icon) → `/neighborhoods`

**Mobile Behavior:**
- Fixed bug where dashboard click would close sidebar before dropdown interaction
- Sidebar now stays open when opening dropdown
- Users can access Settings/Admin links on mobile

### Mobile Bottom Nav

**Items:**
- Chat (MessageSquare) → `/`
- Map (Map) → `/map`
- **Insights** (Lightbulb) → `/insights` (changed from "Articles")
- Profile/Login (User) → `/dashboard` or `/auth/signin`

**Theme-Appropriate Active States:**
- Light mode: Blue (text-blue-600, bg-blue-600/10)
- Dark mode: Emerald (text-emerald-500, bg-emerald-500/10)

---

## Recent Changes (Dec 1, 2025)

### CategoryFilter Redesign
1. Changed from rounded buttons to tab-style underline indicators
2. Matches FilterTabs and AdminNav aesthetic
3. Active state shows colored bottom border
4. Centered layout with `justify-center`

### Navigation Rebranding
1. "Articles" renamed to "Insights" throughout app
2. Icon changed from FileText to Lightbulb
3. Updated in both Enhanced Sidebar and Mobile Bottom Nav
4. Theme-appropriate active state colors

### Article Page Improvements
1. Back button always goes to `/insights`
2. Text changed to "Back to insights"
3. Contact component removed for cleaner layout

### CMS Improvements
1. Added translucent backgrounds to article rows for better readability
2. Delete button now permanently removes MDX file from GitHub
3. Unpublish button sets `draft: true` instead of deleting
4. Stats carousel with auto-scroll functionality
5. Removed obsolete filter dropdowns (Status, Year, Month)

### Dashboard Navigation Fix
1. Separated dashboard button click from dropdown toggle
2. Main button navigates to dashboard page
3. Chevron icon toggles dropdown
4. Fixed mobile sidebar closing issue

### Light Mode Enhancement
1. Added vibrant animated background gradient
2. Improved text contrast with darker slate colors
3. Blue button accents instead of green
4. Better visibility for text boxes and navigation

---

## API Endpoints

### Articles API

#### GET `/api/articles/list`
Returns all published articles (excludes drafts).

**Response:**
```json
{
  "articles": [
    {
      "title": "Article Title",
      "slug": "article-slug",
      "date": "11/30/2025",
      "category": "articles",
      "excerpt": "Article excerpt...",
      "image": "https://...",
      "keywords": ["keyword1", "keyword2"]
    }
  ]
}
```

#### POST `/api/articles/ai-search`
AI-powered natural language search.

**Request:**
```json
{
  "query": "articles about Palm Desert homes",
  "limit": 50
}
```

**Response:**
```json
{
  "results": [
    {
      "article": { /* article data */ },
      "relevanceScore": 9.2,
      "matchReasons": ["Contains 'Palm Desert' in title"]
    }
  ],
  "suggestions": ["Palm Desert real estate market", "Homes for sale Palm Desert"]
}
```

#### GET `/api/articles/topics`
Auto-generates topic cloud from article keywords.

**Response:**
```json
{
  "topics": [
    {
      "name": "Palm Desert",
      "count": 45,
      "category": "location"
    }
  ]
}
```

#### POST `/api/articles/set-draft`
Sets draft status on published article.

**Request:**
```json
{
  "slugId": "article-slug",
  "draft": true
}
```

#### DELETE `/api/articles/unpublish?slugId={slug}`
Permanently removes MDX file from `src/posts/`.

### Market Stats API

#### GET `/api/market-stats`
Fetches current mortgage rates and economic data.

**Environment Variables Required:**
- `API_NINJA_KEY` - API Ninjas key
- `FRED_API_KEY` - Federal Reserve Economic Data key

**Response:**
```json
{
  "rates": {
    "thirtyYear": 6.23,
    "fifteenYear": 5.51,
    "arm": 5.89
  },
  "economic": {
    "inflation": 3.2,
    "unemployment": 4.0,
    "gdp": 3.8
  }
}
```

---

## Components

### FilterTabs
**Location:** `src/app/components/insights/FilterTabs.tsx`

Tab navigation with admin-style underline indicators.

**Props:**
```typescript
{
  activeTab: "ai-suggestions" | "categories" | "topics"
  onTabChange: (tab) => void
  aiSuggestionsCount?: number
}
```

### CategoryFilter
**Location:** `src/app/components/insights/CategoryFilter.tsx`

Category filter buttons with tab-style underline.

**Props:**
```typescript
{
  selectedCategory: string | null
  onCategorySelect: (category: string | null) => void
  categoryCounts?: {
    articles: number
    "market-insights": number
    "real-estate-tips": number
  }
}
```

### AISearchBar
**Location:** `src/app/components/insights/AISearchBar.tsx`

Natural language search input with AI sparkle icon.

**Props:**
```typescript
{
  onSearch: (query: string) => void
  placeholder: string
  suggestions?: string[]
  isLoading?: boolean
  initialValue?: string
}
```

### ArticleAccordion
**Location:** `src/app/components/insights/ArticleAccordion.tsx`

Simplified clickable article card (no longer an accordion).

**Props:**
```typescript
{
  article: {
    title: string
    excerpt: string
    image: string
    category: string
    date: string
    slug: string
    topics?: string[]
  }
  initialExpanded?: boolean
  highlightTerms?: string[]
}
```

### TopicCloud
**Location:** `src/app/components/insights/TopicCloud.tsx`

Auto-generated topic tags with color coding.

**Props:**
```typescript
{
  topics: Array<{
    name: string
    count: number
    category?: "location" | "topic" | "audience"
  }>
  selectedTopics: string[]
  onTopicSelect: (topic: string) => void
  maxTopics?: number
}
```

### MarketStats
**Location:** `src/app/components/insights/MarketStats.tsx`

Displays current mortgage rates and economic indicators.

**Environment Variables:**
- `API_NINJA_KEY`
- `FRED_API_KEY`

---

## Theme System

### Light Mode (lightgradient)
- Animated multi-color gradient background (purple, blue, cyan)
- Blue accents for buttons and active states
- Slate text colors (900/800/700/600)
- White/translucent backgrounds with backdrop blur
- Higher contrast for better readability

### Dark Mode (blackspace)
- Dark neutral backgrounds
- Emerald accents for buttons and active states
- Gray text colors (300/400)
- Smooth transitions between themes

### Theme-Appropriate Components
All components adapt colors based on `useThemeClasses()` hook:
- Navigation active states
- Button colors
- Text colors
- Border colors
- Background colors

---

## Deployment

### Production Deployment
All changes are automatically deployed via Vercel when pushed to main:

```bash
git add .
git commit -m "Your commit message"
git push origin main
```

Vercel automatically rebuilds and deploys (~2 minutes).

### Environment Variables
Required on Vercel for Market Stats:
1. `API_NINJA_KEY` - From https://api-ninjas.com/
2. `FRED_API_KEY` - From https://fred.stlouisfed.org/docs/api/api_key.html

Add in Vercel Dashboard → Settings → Environment Variables

---

## File Structure

```
src/
├── app/
│   ├── admin/
│   │   └── cms/
│   │       ├── page.tsx                    # Article list
│   │       ├── new/page.tsx                # New article editor
│   │       └── edit/[slugId]/page.tsx      # Edit existing
│   ├── insights/
│   │   ├── page.tsx                        # Main insights page
│   │   ├── [category]/
│   │   │   └── [slugId]/
│   │   │       ├── page.tsx                # Article page (server)
│   │   │       └── ArticlePageClient.tsx   # Article page (client)
│   ├── components/
│   │   ├── insights/
│   │   │   ├── AISearchBar.tsx
│   │   │   ├── FilterTabs.tsx
│   │   │   ├── CategoryFilter.tsx
│   │   │   ├── ArticleAccordion.tsx
│   │   │   ├── TopicCloud.tsx
│   │   │   └── MarketStats.tsx
│   │   ├── EnhancedSidebar.tsx
│   │   └── navbar/
│   │       └── MobileBottomNav.tsx
│   └── api/
│       └── articles/
│           ├── list/route.ts
│           ├── ai-search/route.ts
│           ├── topics/route.ts
│           ├── set-draft/route.ts
│           └── unpublish/route.ts
├── posts/                                  # Published MDX articles
└── lib/
    └── publishing-pipeline.ts              # Publishing utilities
```

---

## Future Enhancements

- [ ] Article analytics and view tracking
- [ ] Scheduled publishing
- [ ] Version history for articles
- [ ] Bulk operations (delete, category change)
- [ ] SEO score checker
- [ ] Voice search input
- [ ] Personalized AI suggestions
- [ ] Article recommendations based on reading history

---

## Troubleshooting

### Market Stats Not Loading
- Check environment variables are set on Vercel
- Verify API keys are valid
- Check browser console for API errors

### Article Not Publishing
- Verify Git credentials configured
- Check Vercel deployment logs
- Ensure article passes validation

### Search Not Working
- Check Groq API key in `.env`
- Verify network connection
- Check browser console for errors

---

**All systems operational ✅**
**Last deployment:** December 1, 2025
**Status:** Production Ready
