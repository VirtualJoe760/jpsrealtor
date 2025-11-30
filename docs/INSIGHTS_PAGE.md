# Insights Page (Blog/Content System)
**MDX-Based Content Management**
**Last Updated:** January 29, 2025

---

## 📋 OVERVIEW

The Insights page (`/insights`) is a blog/content system using **MDX** (Markdown + JSX) for rich, interactive articles about real estate, market trends, and community information.

### Key Features
- ✅ **MDX Support** - Markdown with React components
- ✅ **Category System** - Market Updates, Community Guides, Investment Tips, etc.
- ✅ **Metadata Extraction** - Frontmatter for title, description, date, author
- ✅ **Dynamic Routing** - `/insights/[slug]` for individual posts
- ✅ **Syntax Highlighting** - Code blocks with Prism.js
- ✅ **Custom Components** - YouTube embeds, image galleries, CTAs

---

## 🏗️ ARCHITECTURE

### File Structure

```
src/app/insights/
├── page.tsx                    # Main insights listing
├── [slug]/
│   └── page.tsx                # Individual insight page
└── _components/
    ├── InsightsList.tsx
    ├── InsightsCategories.tsx
    ├── InsightCard.tsx
    └── mdx-components.tsx      # Custom MDX components

content/insights/               # MDX files (gitignored or tracked)
├── market-update-january-2025.mdx
├── palm-desert-country-club-guide.mdx
└── investment-strategies-coachella-valley.mdx
```

### MDX File Example

```mdx
---
title: "Palm Desert Country Club: A Complete Guide"
description: "Everything you need to know about this luxury golf community"
date: "2025-01-15"
author: "Joseph Sardella"
category: "Community Guides"
tags: ["Palm Desert", "Golf", "Luxury"]
featuredImage: "/images/insights/pdcc-hero.jpg"
---

# Palm Desert Country Club

Palm Desert Country Club is one of the Coachella Valley's premier golf communities...

<YouTube videoId="abc123xyz" />

## Amenities

<Grid columns={3}>
  <Card title="Championship Golf" icon="⛳" />
  <Card title="Tennis Courts" icon="🎾" />
  <Card title="Fine Dining" icon="🍽️" />
</Grid>

## Current Listings

<ListingCarousel city="palm-desert" subdivision="palm-desert-country-club" />
```

---

## 🔧 COMPONENTS

### InsightsList.tsx
Displays all insights with filtering:
```typescript
- Grid/List view toggle
- Category filtering
- Tag filtering
- Search functionality
- Pagination (12 per page)
```

### InsightsCategories.tsx
Category filter chips:
```typescript
categories: [
  "Market Updates",
  "Community Guides",
  "Investment Tips",
  "Buying/Selling",
  "Local Events"
]
```

### InsightCard.tsx
Individual insight preview card:
```typescript
{
  featuredImage,
  title,
  description,
  date,
  category,
  tags,
  readTime,
  slug
}
```

### MDX Components

**Custom components available in MDX:**

```tsx
import { MDXComponents } from "mdx/types";

export const mdxComponents: MDXComponents = {
  // Enhanced elements
  Link: CustomLink,           // Next.js Link with styling
  Image: CustomImage,         // Next.js Image optimized
  YouTube: YouTubeEmbed,      // Embed YouTube videos

  // Layout components
  Grid: ResponsiveGrid,
  Card: ContentCard,
  Callout: CalloutBox,

  // Data components
  ListingCarousel: FeaturedListings,
  CityStats: CityStatsWidget,
  SchoolRatings: SchoolsWidget,

  // Code
  pre: CodeBlock,             // Syntax highlighted code
  code: InlineCode
};
```

---

## 📝 FRONTMATTER SCHEMA

```yaml
---
# Required
title: string                  # Page title and H1
description: string            # Meta description and excerpt
date: string                   # Publication date (YYYY-MM-DD)
author: string                 # Author name

# Optional
category: string               # Single category
tags: string[]                 # Array of tags
featuredImage: string          # Hero image URL
slug: string                   # Custom URL slug (auto-generated if omitted)
published: boolean             # Draft vs published (default: true)
updated: string                # Last updated date
readTime: number               # Estimated minutes (auto-calculated if omitted)
---
```

---

## 🌐 ROUTES

### Main Listing: `/insights`
**File:** `src/app/insights/page.tsx`

**Features:**
- Server-side rendering
- Fetches all MDX files from `content/insights/`
- Extracts frontmatter metadata
- Filters by category/tags (query params)
- Sorts by date (newest first)

**Query Params:**
```
/insights?category=Market+Updates
/insights?tag=Palm+Desert
/insights?search=investment
```

### Individual Insight: `/insights/[slug]`
**File:** `src/app/insights/[slug]/page.tsx`

**Features:**
- Dynamic route generation (generateStaticParams)
- MDX compilation with next-mdx-remote
- Custom components injection
- Related insights sidebar
- Social sharing buttons

---

## 💡 USAGE EXAMPLES

### Creating a New Insight

1. **Create MDX file:**
```bash
touch content/insights/my-new-post.mdx
```

2. **Add frontmatter and content:**
```mdx
---
title: "Top 5 Investment Properties in La Quinta"
description: "Our picks for the best ROI in La Quinta"
date: "2025-01-29"
author: "Joseph Sardella"
category: "Investment Tips"
tags: ["La Quinta", "Investment", "ROI"]
featuredImage: "/images/insights/la-quinta-invest.jpg"
---

# Top 5 Investment Properties

La Quinta offers exceptional investment opportunities...
```

3. **Access at:** `/insights/my-new-post`

### Embedding a Listing Carousel

```mdx
## Current Opportunities

<ListingCarousel
  city="palm-desert"
  subdivision="palm-desert-country-club"
  limit={6}
  sortBy="price"
/>
```

### Adding a Call-to-Action

```mdx
<Callout type="info">
  💡 **Want to learn more?**
  Contact us for a free market analysis of this area.
</Callout>
```

---

## 🎨 STYLING

**Theme-Aware:**
- Light mode: Clean white backgrounds, blue accents
- Dark mode: Dark backgrounds, emerald accents
- Uses `useThemeClasses()` hook

**Typography:**
- Headings: Plus Jakarta Sans
- Body: Inter
- Code: Fira Code

**Responsive:**
- Mobile: Single column, full-width images
- Tablet: 2-column grid for related posts
- Desktop: 3-column grid, sidebar

---

## 🚀 FUTURE ENHANCEMENTS

- [ ] Author profiles and bios
- [ ] Comments system (Disqus or custom)
- [ ] Newsletter subscription
- [ ] Related insights algorithm (ML-based)
- [ ] View count and analytics
- [ ] Social share count
- [ ] RSS feed generation
- [ ] AMP support for faster mobile
- [ ] Table of contents navigation
- [ ] Estimated read time indicator

---

## 📚 RELATED DOCUMENTATION

- [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md) - MDX component integration
- [MASTER_SYSTEM_ARCHITECTURE.md](./platform/MASTER_SYSTEM_ARCHITECTURE.md)

---

**Last Updated:** January 29, 2025
