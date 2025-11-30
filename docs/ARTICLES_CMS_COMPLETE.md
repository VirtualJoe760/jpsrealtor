# Complete Articles & CMS System Documentation

**Last Updated:** November 29, 2025
**Version:** 2.0
**Author:** Claude Code Deep Dive

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Data Model - Article Schema](#data-model---article-schema)
3. [API Routes](#api-routes)
4. [Admin CMS Interface](#admin-cms-interface)
5. [Public Article Pages](#public-article-pages)
6. [Components](#components)
7. [Cloudinary Integration](#cloudinary-integration)
8. [Architecture Patterns](#architecture-patterns)
9. [SEO Implementation](#seo-implementation)
10. [Claude AI Integration](#claude-ai-integration)
11. [Chat Widget Integration](#chat-widget-integration)
12. [VPS Claude Content Writer](#vps-claude-content-writer)
13. [Deployment Guide](#deployment-guide)

---

## System Overview

The jpsrealtor.com platform features a **fully custom MongoDB-based CMS** with AI-powered content generation, professional image management, and integrated search capabilities.

### Key Features

**Content Management:**
- MongoDB-based article storage with year/month organization
- Three-stage workflow: Draft → Published → Archived
- Category taxonomy: articles, market-insights, real-estate-tips
- Tag system for content discovery
- Featured articles system
- Real-time view tracking and analytics

**AI-Powered Content:**
- Claude Sonnet 4.5 integration for article drafting
- Real-time streaming content generation
- SEO optimization built into AI prompts
- Coachella Valley real estate expertise
- Cost: ~$0.07 per article
- VPS Claude Code integration for advanced workflows

**Media Management:**
- Cloudinary CDN for all images
- Auto-optimization (quality, format, responsive srcsets)
- Featured images (1200x630px for social sharing)
- Open Graph images for SEO
- Drag-and-drop upload interface

**Search & Discovery:**
- MongoDB full-text search
- Keyword fallback search
- Chat widget integration with article citations
- Relevance scoring
- Stop word filtering

**Admin Interface:**
- Statistics dashboard with category breakdowns
- Advanced filtering (category, status, year, month, search)
- Real-time mobile/desktop preview
- Responsive design with theme support
- Claude AI "Draft with Claude" button

**Public Features:**
- SEO-optimized URLs (`/articles/{category}/{slug}`)
- Fast indexed queries
- Mobile-responsive article display
- ReactMarkdown rendering for MDX content
- Progressive Web App support

### Time Savings

- **Before:** 2-4 hours per article (research, writing, editing, SEO)
- **After:** 10-15 minutes (Claude draft + review + image selection)
- **Efficiency:** 90% time reduction

---

## Data Model - Article Schema

**Location:** `src/models/article.ts`

### Complete Interface

```typescript
interface IArticle extends Document {
  _id: mongoose.Types.ObjectId;

  // ===== BASIC INFO =====
  title: string;              // Max 200 chars
  slug: string;               // Auto-generated, unique, URL-safe
  excerpt: string;            // Max 300 chars, article summary
  content: string;            // Full MDX-formatted content

  // ===== ORGANIZATION =====
  category: "articles" | "market-insights" | "real-estate-tips";
  tags: string[];             // Array of keyword tags

  // ===== DATE ORGANIZATION =====
  publishedAt: Date;          // Publication date
  year: number;               // Auto-extracted from publishedAt
  month: number;              // Auto-extracted (1-12)

  // ===== STATUS WORKFLOW =====
  status: "draft" | "published" | "archived";
  featured: boolean;          // Show in featured sections

  // ===== MEDIA (CLOUDINARY) =====
  featuredImage: {
    url: string;              // Full Cloudinary URL
    publicId: string;         // Cloudinary asset ID
    alt: string;              // SEO alt text (required)
    caption?: string;         // Optional image caption
    width?: number;           // Image dimensions
    height?: number;
  };

  ogImage?: {                 // Separate Open Graph image
    url: string;
    publicId: string;
  };

  // ===== SEO =====
  seo: {
    title: string;            // Max 60 chars (Google cutoff)
    description: string;      // Max 160 chars (Google cutoff)
    keywords: string[];       // 5-10 keywords recommended
  };

  // ===== AUTHOR =====
  author: {
    id: mongoose.Types.ObjectId;  // Reference to User collection
    name: string;                  // Joseph Sardella
    email: string;                 // josephsardella@gmail.com
  };

  // ===== ANALYTICS =====
  metadata: {
    views: number;            // Total page views (default: 0)
    readTime: number;         // Minutes (calculated from word count)
    lastViewed?: Date;        // Last view timestamp
  };

  // ===== TIMESTAMPS (AUTO-MANAGED) =====
  createdAt: Date;            // Auto-set on creation
  updatedAt: Date;            // Auto-updated on save
  scheduledFor?: Date;        // Optional scheduled publish time
}
```

### Category Definitions

| Category | Purpose | Examples |
|----------|---------|----------|
| **articles** | Broader real estate topics, economics, industry trends | Market forecasts, investment strategies, economic analysis |
| **market-insights** | Coachella Valley specific market data and analysis | Palm Desert pricing trends, La Quinta inventory reports |
| **real-estate-tips** | Practical buying/selling advice for consumers | First-time buyer guides, negotiation tactics, inspection tips |

### Indexes for Performance

```typescript
// COMPOUND INDEXES
{ status: 1, publishedAt: -1 }
// Fast queries for published articles sorted by date

{ category: 1, status: 1, publishedAt: -1 }
// Category filtering with date sorting

{ year: 1, month: 1, status: 1 }
// Date archive queries (e.g., all articles from March 2025)

{ tags: 1, status: 1 }
// Tag-based content discovery

{ featured: 1, status: 1, publishedAt: -1 }
// Featured articles for homepage

{ "metadata.views": -1 }
// Popular/trending articles ranking

{ slug: 1 }
// UNIQUE index for fast slug lookups

// FULL-TEXT SEARCH INDEX
{ title: "text", excerpt: "text", content: "text", tags: "text" }
// Enables MongoDB text search across all content
```

### Pre-Save Hooks

**Year/Month Auto-Population:**
```typescript
ArticleSchema.pre("save", function (next) {
  if (this.publishedAt) {
    this.year = this.publishedAt.getFullYear();
    this.month = this.publishedAt.getMonth() + 1; // 1-12
  }
  next();
});
```

**Slug Auto-Generation:**
```typescript
ArticleSchema.pre("save", function (next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")  // Replace non-alphanumeric with hyphens
      .replace(/(^-|-$)/g, "");      // Remove leading/trailing hyphens
  }
  next();
});
```

### Static Methods

**Get Articles by Year/Month:**
```typescript
ArticleSchema.statics.getByYearMonth = function(
  year: number,
  month: number,
  status: ArticleStatus = "published"
) {
  return this.find({ year, month, status })
    .sort({ publishedAt: -1 })
    .exec();
};

// Usage:
const marchArticles = await Article.getByYearMonth(2025, 3);
```

**Get Featured Articles:**
```typescript
ArticleSchema.statics.getFeatured = function(limit: number = 5) {
  return this.find({ featured: true, status: "published" })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .exec();
};

// Usage:
const featuredArticles = await Article.getFeatured(3);
```

**Increment View Count:**
```typescript
ArticleSchema.statics.incrementViews = function(articleId: string) {
  return this.findByIdAndUpdate(
    articleId,
    {
      $inc: { "metadata.views": 1 },
      $set: { "metadata.lastViewed": new Date() }
    },
    { new: true }
  );
};

// Usage (called automatically on article view):
await Article.incrementViews(articleId);
```

### Instance Methods

**Calculate Read Time:**
```typescript
ArticleSchema.methods.calculateReadTime = function(): number {
  const wordsPerMinute = 200;
  const wordCount = this.content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
};

// Usage:
const article = await Article.findById(id);
const readTime = article.calculateReadTime(); // e.g., 5 (minutes)
```

**Get Formatted Date:**
```typescript
ArticleSchema.methods.getFormattedDate = function(): string {
  return this.publishedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
};

// Returns: "March 16, 2025"
```

---

## API Routes

### 1. GET /api/articles

**List articles with advanced filtering and pagination**

**Location:** `src/app/api/articles/route.ts`

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `category` | string | Filter by category | `market-insights` |
| `tag` | string | Filter by specific tag | `palm-desert` |
| `year` | number | Filter by publication year | `2025` |
| `month` | number | Filter by month (1-12) | `3` |
| `status` | string | Filter by status | `published` |
| `featured` | boolean | Filter featured articles | `true` |
| `page` | number | Page number (default: 1) | `2` |
| `limit` | number | Results per page (default: 10, max: 1000) | `50` |
| `search` | string | Full-text search query | `energy costs` |

#### Response Format

```json
{
  "articles": [
    {
      "_id": "675003f2e4dfbe5a66e4ec5a",
      "title": "5 Essential Tips for Buying Your First Home",
      "slug": "5-essential-tips-for-buying-your-first-home",
      "excerpt": "Discover five key tips for first-time homebuyers...",
      "category": "real-estate-tips",
      "tags": ["homebuying", "first-time-buyers", "tips"],
      "status": "published",
      "featured": false,
      "featuredImage": {
        "url": "https://res.cloudinary.com/YOUR_CLOUD_NAME/...",
        "publicId": "first-home",
        "alt": "Couple signing home purchase agreement"
      },
      "seo": {
        "title": "5 Essential Tips for Buying Your First Home",
        "description": "Expert advice for first-time homebuyers in the Coachella Valley",
        "keywords": ["homebuying tips", "first-time buyers", "coachella valley"]
      },
      "author": {
        "name": "Joseph Sardella",
        "email": "josephsardella@gmail.com"
      },
      "metadata": {
        "views": 247,
        "readTime": 5
      },
      "publishedAt": "2025-03-16T08:00:00.000Z",
      "year": 2025,
      "month": 3,
      "createdAt": "2025-03-15T10:30:00.000Z",
      "updatedAt": "2025-03-16T08:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

#### Security

- **Public access:** Only `status: "published"` articles are visible
- **Admin access:** Can see all statuses (draft, archived)
- **Authentication:** Checked via NextAuth session

#### Example Requests

**Get all published articles:**
```bash
GET /api/articles?status=published
```

**Get market insights from March 2025:**
```bash
GET /api/articles?category=market-insights&year=2025&month=3
```

**Search for articles about energy:**
```bash
GET /api/articles?search=energy%20costs&limit=5
```

**Get featured articles:**
```bash
GET /api/articles?featured=true
```

---

### 2. GET /api/articles/[id]

**Get single article by MongoDB ObjectId or slug**

**Location:** `src/app/api/articles/[id]/route.ts`

#### Parameters

- `id` - Can be either:
  - MongoDB ObjectId: `675003f2e4dfbe5a66e4ec5a`
  - URL slug: `5-essential-tips-for-buying-your-first-home`

#### Response

Returns full article object with all fields including complete MDX content.

```json
{
  "_id": "675003f2e4dfbe5a66e4ec5a",
  "title": "5 Essential Tips for Buying Your First Home",
  "content": "# Introduction\n\nBuying your first home is exciting...",
  // ... all other article fields
}
```

#### Features

1. **Flexible ID lookup:** Accepts ObjectId OR slug
2. **View tracking:** Auto-increments view count for published articles
3. **Access control:**
   - Published articles: Public access
   - Draft/archived: Admin only
4. **View exclusion:** Admins viewing articles don't increment view count

#### Example Requests

**By ObjectId:**
```bash
GET /api/articles/675003f2e4dfbe5a66e4ec5a
```

**By slug:**
```bash
GET /api/articles/5-essential-tips-for-buying-your-first-home
```

---

### 3. POST /api/articles

**Create new article (admin only)**

**Location:** `src/app/api/articles/route.ts`

#### Required Fields

```json
{
  "title": "Article Title Here",
  "excerpt": "Brief summary of the article...",
  "content": "# Full MDX Content\n\nArticle body...",
  "category": "real-estate-tips",
  "featuredImage": {
    "url": "https://res.cloudinary.com/YOUR_CLOUD_NAME/...",
    "publicId": "image-id",
    "alt": "Descriptive alt text"
  },
  "seo": {
    "title": "SEO Title (max 60 chars)",
    "description": "SEO description (max 160 chars)",
    "keywords": ["keyword1", "keyword2", "keyword3"]
  }
}
```

#### Optional Fields

```json
{
  "tags": ["tag1", "tag2"],
  "status": "draft",           // default: "draft"
  "featured": false,            // default: false
  "ogImage": {
    "url": "...",
    "publicId": "..."
  },
  "publishedAt": "2025-03-16T08:00:00.000Z",
  "scheduledFor": "2025-03-20T10:00:00.000Z",
  "metadata": {
    "readTime": 5
  }
}
```

#### Auto-Generated Fields

The following fields are automatically generated:
- `slug` - From title if not provided
- `year` - From publishedAt
- `month` - From publishedAt
- `author` - From authenticated session
- `metadata.views` - Defaults to 0
- `createdAt` - Current timestamp
- `updatedAt` - Current timestamp

#### Response

```json
{
  "message": "Article created successfully",
  "article": {
    "_id": "675003f2e4dfbe5a66e4ec5a",
    // ... full article object
  }
}
```

#### Security

- **Authentication required:** NextAuth session
- **Admin only:** `isAdmin: true` in session
- **Returns 403** if not admin

---

### 4. PUT /api/articles/[id]

**Update existing article (admin only)**

**Location:** `src/app/api/articles/[id]/route.ts`

#### Request Body

Send any fields you want to update (partial updates supported):

```json
{
  "title": "Updated Title",
  "content": "Updated content...",
  "status": "published",
  "featured": true
}
```

#### Protected Fields

These fields cannot be updated directly:
- `_id`
- `createdAt`
- `updatedAt` (auto-updated)

#### Response

```json
{
  "message": "Article updated successfully",
  "article": {
    // ... full updated article object
  }
}
```

#### Features

- Accepts partial updates
- Runs validation on all fields
- Updates `updatedAt` timestamp automatically
- If `publishedAt` changes, `year` and `month` are recalculated

---

### 5. PATCH /api/articles/[id]

**Partial update article (admin only)**

Same as PUT - both methods supported for partial updates.

---

### 6. DELETE /api/articles/[id]

**Permanently delete article (admin only)**

**Location:** `src/app/api/articles/[id]/route.ts`

#### Response

```json
{
  "message": "Article deleted successfully"
}
```

#### Important Notes

- **Permanent deletion** - No soft delete
- **Recommendation:** Use `status: "archived"` instead for content preservation
- **Image cleanup:** Manually delete Cloudinary images if needed

---

### 7. POST /api/articles/search

**AI-powered article search for chat widget integration**

**Location:** `src/app/api/articles/search/route.ts`

#### Request

```json
{
  "query": "energy costs coachella valley",
  "limit": 5
}
```

#### Response

```json
{
  "success": true,
  "results": [
    {
      "_id": "675003f2e4dfbe5a66e4ec5a",
      "title": "Hidden Costs of Home Ownership: What to Budget For",
      "slug": "hidden-costs-of-home-ownership",
      "excerpt": "Comprehensive guide to understanding all costs...",
      "category": "real-estate-tips",
      "featuredImage": {
        "url": "https://res.cloudinary.com/...",
        "alt": "Calculator and bills on desk"
      },
      "seo": {
        "description": "Learn about hidden homeownership costs...",
        "keywords": ["home costs", "energy bills", "HOA fees"]
      },
      "publishedAt": "2025-03-10T08:00:00.000Z",
      "relevanceScore": 1.5
    }
  ],
  "query": "energy costs coachella valley",
  "method": "text_search"
}
```

#### Search Algorithm

**Step 1: Text Search (Primary)**
```typescript
// MongoDB $text search with score
{
  $text: { $search: query },
  status: "published"
}
// Sort by { score: { $meta: "textScore" } }
```

**Step 2: Keyword Search (Fallback)**
```typescript
// If text search returns no results
{
  $or: [
    { title: { $regex: keyword, $options: "i" } },
    { excerpt: { $regex: keyword, $options: "i" } },
    { "seo.keywords": { $in: [keyword] } }
  ],
  status: "published"
}
```

**Step 3: Stop Word Filtering**

Common words filtered out:
```typescript
const stopWords = [
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'about', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'should', 'could', 'may', 'might', 'can'
];
```

#### Relevance Scoring

- Text search returns MongoDB's `textScore`
- Keyword search assigns score based on match location:
  - Title match: 2.0
  - Excerpt match: 1.5
  - Keyword array match: 1.0
- Higher scores = more relevant

#### Integration with Chat

The chat widget calls this endpoint when users ask questions, then:
1. Displays article cards in chat
2. Adds "Highly Relevant" badge if score > 0.7
3. Allows users to click through to full article
4. AI cites articles in responses

---

### 8. POST /api/claude/draft-article

**Claude AI article drafting with real-time streaming**

**Location:** `src/app/api/claude/draft-article/route.ts`

#### Request

```json
{
  "topic": "Write an article about the benefits of investing in Palm Desert golf communities, focusing on ROI and lifestyle amenities",
  "category": "market-insights",
  "keywords": ["palm desert", "golf communities", "investment", "ROI"],
  "tone": "professional yet approachable",
  "length": "medium",
  "existingArticleId": null,
  "userMessage": "Additional context or instructions"
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `topic` | string | Yes | Main article topic or prompt |
| `category` | string | Yes | Article category |
| `keywords` | string[] | No | Target keywords for SEO |
| `tone` | string | No | Writing tone (default: "professional yet approachable") |
| `length` | string | No | "short", "medium", or "long" (default: "medium") |
| `existingArticleId` | string | No | For editing existing articles |
| `userMessage` | string | No | Additional instructions |

#### Response (Server-Sent Events)

**Stream Format:**
```
data: {"text": "chunk of content"}
data: {"text": "more content"}
data: {"type": "complete", "parsed": {...}}
```

**Complete Event:**
```json
{
  "type": "complete",
  "parsed": {
    "frontmatter": {
      "title": "The Ultimate Guide to Palm Desert Golf Communities",
      "excerpt": "Discover why Palm Desert golf communities offer exceptional ROI...",
      "category": "market-insights",
      "tags": ["palm desert", "golf communities", "investment", "ROI"],
      "seo": {
        "title": "Palm Desert Golf Communities: ROI & Lifestyle Guide",
        "description": "Complete analysis of investment returns and amenities...",
        "keywords": ["palm desert golf", "golf community ROI", "investment property"]
      }
    },
    "content": "# The Ultimate Guide to Palm Desert Golf Communities\n\n..."
  }
}
```

#### Claude System Prompt

Claude is configured as an expert real estate writer with:

**Expertise:**
- Coachella Valley real estate market
- Palm Desert, La Quinta, Indian Wells, Rancho Mirage
- Investment properties and ROI analysis
- Luxury real estate and golf communities
- Market trends and economics
- Buyer/seller guidance

**Writing Style:**
- Professional yet conversational
- SEO-optimized with natural keyword integration
- Data-driven with market insights
- Action-oriented with practical advice
- Engaging and easy to read

**Content Structure:**
- Clear, compelling headlines
- Strong hook introductions
- Well-organized sections with subheadings
- Bullet points and lists for readability
- Strong conclusions with CTAs

**MDX Support:**
- Properly formatted markdown
- Frontmatter with metadata
- Support for custom components

#### Cost Analysis

**Model:** Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

**Pricing:**
- Input: $3 per million tokens
- Output: $15 per million tokens

**Average Article:**
- Input: ~600 tokens (system prompt + user prompt)
- Output: ~4,000 tokens (medium article)
- **Cost: ~$0.07 per article**

**Monthly Estimates:**
- 10 articles: $0.70
- 50 articles: $3.50
- 100 articles: $7.00

#### Integration with Admin

1. User clicks "Draft with Claude" button
2. Modal appears with prompt textarea
3. User enters topic/instructions
4. Request sent to API
5. Content streams in real-time to editor
6. Form fields auto-populate from frontmatter
7. User reviews, edits, and publishes

---

### 9. POST /api/upload

**Upload images to Cloudinary**

**Location:** `src/app/api/upload/route.ts`

#### Request

**FormData:**
- `file` - Image file (required)
- `type` - Image type: 'featured', 'og', or 'general' (required)

#### Response

```json
{
  "message": "Upload successful",
  "url": "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1234567890/articles/image.jpg",
  "publicId": "articles/image",
  "width": 1200,
  "height": 630
}
```

#### Image Transformations

**Featured Images:**
- Dimensions: 1200x630px
- Crop: fill
- Quality: auto:good
- Format: auto (WebP when supported)

**OG Images:**
- Same as featured images
- Optimized for social sharing

**General Images:**
- Max dimensions preserved
- Quality optimization
- Auto-format based on browser support

#### Security

- **Admin only** - Requires authentication
- **File validation** - Checks file type and size
- **Upload folder** - Organized by type (articles/, og/, etc.)

---

## Admin CMS Interface

### Dashboard - /admin/articles

**File:** `src/app/admin/articles/page.tsx`

#### Statistics Cards

**Row 1:**
- **Total Articles** - Count of all articles
- **Published** - Count of published articles (green badge)
- **Drafts** - Count of draft articles (yellow badge)
- **Total Views** - Sum of all article views

**Row 2:**
- **Articles** - Count in "articles" category
- **Market Insights** - Count in "market-insights" category
- **Real Estate Tips** - Count in "real-estate-tips" category

#### Advanced Filtering

**Filter Controls:**
1. **Search Bar** - Full-text search across title, excerpt, content
2. **Category Dropdown:**
   - All Categories
   - Articles
   - Market Insights
   - Real Estate Tips
3. **Status Dropdown:**
   - All Status
   - Published
   - Draft
   - Archived
4. **Year Dropdown:**
   - All Years
   - 2025
   - 2024
   - 2023
5. **Month Dropdown:**
   - All Months
   - January through December

**Filter Logic:**
- All filters combine with AND logic
- Search uses MongoDB text search
- Real-time updates (no page reload)
- Pagination resets to page 1 on filter change

#### Article Table (Desktop)

**Columns:**
1. **Title** - Bold with excerpt preview below
2. **Category** - Capitalized category name
3. **Status** - Color-coded badge:
   - Published: Blue
   - Draft: Red
   - Archived: Gray
4. **Views** - Centered view count
5. **Published** - Formatted date (MM/DD/YYYY)
6. **Actions** - Icon buttons:
   - 👁️ View (opens public page)
   - ✏️ Edit (opens edit page)
   - 🗑️ Delete (with confirmation)

**Features:**
- Hover effects on rows
- Responsive column widths
- Sortable (future enhancement)

#### Mobile Card View

**Card Layout:**
- Title (2-line clamp)
- Excerpt (2-line clamp)
- Status badge (top-right)
- Meta info (category, views, date)
- Action buttons (full-width)

**Responsive Breakpoint:** < 1024px (lg)

#### Pagination

- **Items per page:** 50
- **Navigation:** Previous / Next buttons
- **Page indicator:** "Page X of Y"
- **Disabled states:** Proper handling of first/last page

#### Header Actions

**Top-Right Buttons:**

1. **Claude VPS** (purple button)
   - Icon: Server + Sparkles
   - Launches Claude Code on VPS
   - SSH into 147.182.236.138
   - Modal with prompt textarea

2. **New Article** (primary button)
   - Icon: Plus
   - Navigate to /admin/articles/new

#### Theme Support

- Light gradient theme: Blue accents
- Blackspace theme: Emerald/purple accents
- Proper contrast ratios
- Hover states for both themes

---

### Create Article - /admin/articles/new

**File:** `src/app/admin/articles/new/page.tsx`

#### Layout Structure

**Header:**
- Page title: "New Article"
- Action buttons (top-right)

**Main Area:**
- Two-column layout on desktop (2:1 ratio)
- Single column on mobile
- Preview panel (fixed right sidebar on XL screens)

**Columns:**
1. **Main Content Column** (lg:col-span-2)
2. **Sidebar Column** (lg:col-span-1)

#### Main Content Fields

**1. Title Input**
- Full-width text input
- Max length: 200 characters
- Large font (text-xl)
- Placeholder: "Enter article title..."

**2. Excerpt Textarea**
- Max length: 300 characters
- 3 rows minimum
- Character counter below
- Format: "X/300 characters"

**3. Content Editor**
- Monospace font (font-mono)
- 20 rows
- MDX syntax support
- Placeholder: "Write your article content in MDX format..."
- No WYSIWYG (raw MDX editing)

#### Sidebar Panels

**1. Category Dropdown**
- Articles
- Market Insights
- Real Estate Tips

**2. Tags Manager**
- Tag input field
- "Add" button
- Tag pills with remove (×) button
- Blue color scheme for tags
- Enter key support

**3. Featured Image Upload**
- Cloudinary integration
- Preview thumbnail
- Drag-and-drop zone (future)
- Click to upload
- Remove button overlays image
- Loading spinner during upload

**4. SEO Panel**
- **Meta Title:**
  - Max 60 characters
  - Character counter
  - Google SERP preview (future)

- **Meta Description:**
  - Max 160 characters
  - Character counter
  - 3 rows textarea

- **Keywords:**
  - Add/remove interface
  - Gray pills
  - Enter key support

#### Header Action Buttons

**1. Draft with Claude** (purple, with sparkles icon)
- Opens modal with prompt textarea
- Streams response in real-time
- Auto-populates ALL form fields:
  - Title from frontmatter
  - Excerpt from frontmatter
  - Content from parsed MDX
  - Category from frontmatter
  - Tags from frontmatter
  - SEO fields from frontmatter
- Shows "Drafting..." with spinner while streaming

**2. Save Draft** (gray)
- Saves with status: "draft"
- No publishedAt date set
- Returns to /admin/articles

**3. Publish Now** (primary color)
- Sets status: "published"
- Sets publishedAt: current date/time
- Returns to /admin/articles

**4. Show/Hide Preview** (toggleable)
- Icon: Monitor
- Changes color when active
- Opens preview panel

#### Preview System

**Desktop (XL screens):**
- Fixed right sidebar (w-96, ~384px)
- Remains visible while scrolling
- iPhone frame (375x667px):
  - Notch at top
  - Home indicator at bottom
  - Border with shadow
- Manual refresh button
- Positioned right-8, top-24, bottom-8

**Mobile (<XL screens):**
- Full-screen modal overlay
- Black background (bg-black/95)
- Sticky header with:
  - "Article Preview" title
  - Refresh button
  - Close button
- iPhone-style preview frame:
  - Max-width centered
  - Rounded corners
  - Border shadow

**Preview Content:**
- Iframe loading `/articles/preview`
- Query params:
  - title
  - excerpt
  - content
  - category
  - imageUrl
- Refresh increments key to force reload

#### Claude Modal

**Triggered by:** "Draft with Claude" button

**Modal Structure:**
- Dark overlay (bg-black/80)
- Centered card (max-w-2xl)
- Header with sparkles icon
- Instruction text
- Prompt textarea (6 rows)
- Cancel + Start Drafting buttons

**Streaming Flow:**
1. User enters prompt
2. Modal closes
3. "Drafting..." state in button
4. Content streams into editor
5. Fields auto-populate on complete
6. Button returns to normal

---

### Edit Article - /admin/articles/[id]

**File:** `src/app/admin/articles/[id]/page.tsx`

#### Additional Features vs. New Article

**1. Article Loading State**
- Fetches article on mount
- Shows loading spinner
- Redirects to list on error

**2. Pre-Populated Form**
- All fields loaded from database
- Images display if present
- Tags and keywords shown

**3. Back Navigation**
- "Back to Articles" link
- Arrow icon
- Returns to /admin/articles

**4. Status Dropdown** (new in edit)
- Draft
- Published
- Archived
- Changes article visibility

**5. Different Button Text**
- "Save Changes" instead of "Save Draft"
- "Update & Publish" or "Publish Now" (conditional)

**6. Edit with Claude**
- Modal prompt asks for edits
- Example: "Expand the investment section..."
- Preserves existing structure
- Updates specific sections

#### Edit Flow

1. User clicks Edit on article row
2. Navigate to `/admin/articles/{id}`
3. Fetch article data via GET `/api/articles/{id}`
4. Populate form with existing data
5. User makes changes
6. Click "Save Changes"
7. PUT request to `/api/articles/{id}`
8. Return to /admin/articles

---

### Alternative CMS Routes

The system has duplicate routes under `/admin/cms/*`:

**Duplicate Pages:**
- `/admin/cms` → Same as `/admin/articles`
- `/admin/cms/new` → Same as `/admin/articles/new`

**Difference:**
- Includes AdminNav component
- Slightly different routing after save
- Otherwise identical functionality

**Purpose:** Support both URL structures for flexibility

---

## Public Article Pages

### Article Preview - /articles/preview

**File:** `src/app/articles/preview/page.tsx`

**Purpose:** Iframe preview for admin editors

#### Query Parameters

| Param | Description | Required |
|-------|-------------|----------|
| `title` | Article title | Yes |
| `excerpt` | Article excerpt | No |
| `content` | MDX content | Yes |
| `category` | Article category | Yes |
| `imageUrl` | Featured image URL | No |

#### Layout

**Hero Image Section:**
- Full-width background (h-64)
- Gray placeholder if no image
- Object-fit: cover

**Content Container:**
- Max-width: 3xl (768px)
- Centered with padding
- White background

**Category Badge:**
- Inline-block pill
- Blue background (bg-blue-100)
- Blue text (text-blue-700)
- Rounded-full
- Category names:
  - "Articles"
  - "Market Insights"
  - "Real Estate Tips"

**Title:**
- 4xl font size (desktop)
- Bold weight
- Gray-900 color
- Tight leading

**Excerpt:**
- XL font size
- Gray-600 color
- Relaxed leading
- Displayed if provided

**Meta Info:**
- Flex row with gap
- Small font (text-sm)
- Gray-500 color
- Icons: User, Calendar
- Author: "Joseph Sardella"
- Date: Current date (formatted)

**Divider:**
- Border-bottom
- Gray-200 color
- Spacing above and below

#### ReactMarkdown Rendering

**Custom Component Styling:**

```typescript
// Headings
h1: "text-3xl font-bold text-gray-900 mt-8 mb-4"
h2: "text-2xl font-bold text-gray-900 mt-6 mb-3"
h3: "text-xl font-bold text-gray-900 mt-4 mb-2"

// Text
p: "text-gray-700 mb-4 leading-relaxed"

// Lists
ul: "list-disc list-inside mb-4 space-y-2 text-gray-700"
ol: "list-decimal list-inside mb-4 space-y-2 text-gray-700"
li: "ml-4"

// Quotes
blockquote: "border-l-4 border-blue-500 pl-4 italic text-gray-600 my-4"

// Code
inline: "bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono"
block: "block bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono mb-4"

// Links
a: "text-blue-600 hover:text-blue-700 underline"

// Emphasis
strong: "font-bold text-gray-900"
em: "italic"
```

**Empty State:**
- Centered message
- Gray-400 color
- "Start writing to see your article preview..."

#### Suspense Boundary

- Wraps PreviewContent component
- Fallback: Loading spinner with "Loading preview..." text
- White background on loading state

---

## Components

### ArticleCard - Chat Integration

**File:** `src/app/components/chat/ArticleCard.tsx`

**Purpose:** Display article cards in chat widget when AI finds relevant articles

#### Props Interface

```typescript
interface ArticleCardProps {
  article: {
    _id: string;
    title: string;
    slug: string;
    excerpt: string;
    category: string;
    featuredImage: {
      url: string;
      alt: string;
    };
    seo: {
      description: string;
      keywords: string[];
    };
    publishedAt: string;
    relevanceScore?: number;
  };
}
```

#### Card Structure

**Container:**
- Theme-aware background (cardBg)
- Theme-aware border (cardBorder)
- Rounded-xl
- Overflow hidden
- Hover shadow effect
- Smooth transition

**Featured Image:**
- Aspect ratio: 16/9
- Full width
- Object-fit: cover
- Hover scale effect (105%)
- Smooth transition

**Content Area:**
- Padding: p-4
- Stacked flex layout

**Category Badge:**
- Small font size
- Rounded-full pill
- Theme-dependent colors:
  - Light: Category-specific colors
  - Dark: Gradient backgrounds
- Categories:
  - Articles: Blue
  - Market Insights: Emerald
  - Real Estate Tips: Purple

**Relevance Badge** (if score > 0.7):
- "Highly Relevant" text
- Amber/yellow color
- Small font
- Rounded-full
- Positioned after category

**Title:**
- Font semibold
- Theme-aware text color (textPrimary)
- 2-line clamp (line-clamp-2)
- Hover: Theme-specific color change
- Smooth transition

**Excerpt:**
- Smaller font (text-sm)
- Theme-aware secondary color (textSecondary)
- 3-line clamp (line-clamp-3)
- Margin top and bottom

**Footer Row:**
- Flex justify-between
- Small font (text-xs)
- Theme-aware muted color (textMuted)

**Published Date:**
- Calendar icon
- Formatted date (toLocaleDateString)

**Keywords:**
- Flex row with gap
- Hash symbol prefix (#)
- First 3 keywords only
- Truncated display

**External Link Icon:**
- Positioned absolute (top-right)
- ExternalLink icon
- Size: w-4 h-4
- Theme-aware color

#### ArticleResults Component

**Purpose:** Wrapper for displaying multiple article cards

**Props:**
```typescript
interface ArticleResultsProps {
  results: Article[];
  query: string;
}
```

**Layout:**
- Header with result count
- Query display
- Grid layout:
  - 1 column on mobile
  - 2 columns on tablet (md)
  - 3 columns on desktop (lg)
- Gap-4 between cards

**Empty State:**
- Centered message
- Muted color
- "No articles found matching your query"

---

### AdminNav Component

**File:** `src/app/components/AdminNav.tsx`

**Purpose:** Navigation bar for admin CMS pages

**Features:**
- Horizontal navigation
- Theme-aware styling
- Active route highlighting
- Icon + text labels
- Responsive design

**Nav Items:**
- Dashboard
- Articles
- CMS
- Settings (future)

---

## Cloudinary Integration

### Configuration

**File:** `src/lib/cloudinary.ts`

**Credentials:**
```typescript
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'YOUR_CLOUD_NAME',
  api_key: 'YOUR_CLOUDINARY_API_KEY',
  api_secret: 'YOUR_CLOUDINARY_API_SECRET'
});
```

### Upload Functions

#### uploadImage(file, folder, options)

**General-purpose upload with transformations**

```typescript
async function uploadImage(
  file: string | Buffer,
  folder: string = 'jpsrealtor',
  options?: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
  }
): Promise<{
  url: string;
  publicId: string;
  width: number;
  height: number;
}>
```

**Default Options:**
- Quality: auto:good
- Format: auto (WebP when supported)
- Fetch format: auto

**Example:**
```typescript
const result = await uploadImage(fileBuffer, 'articles/featured', {
  width: 1200,
  height: 630,
  crop: 'fill',
  quality: 'auto:best'
});
```

---

#### uploadArticleFeaturedImage(file)

**Optimized for featured images**

```typescript
async function uploadArticleFeaturedImage(file: Buffer): Promise<{
  url: string;
  publicId: string;
  width: number;
  height: number;
}>
```

**Transformations:**
- Dimensions: 1200x630px (optimal for social sharing)
- Crop: fill
- Quality: auto:good
- Folder: articles/featured

**Usage:**
```typescript
const featuredImg = await uploadArticleFeaturedImage(fileBuffer);
// Returns: { url, publicId, width: 1200, height: 630 }
```

---

#### uploadArticleOGImage(file)

**Optimized for Open Graph meta tags**

Same specifications as featured images:
- 1200x630px
- Fill crop
- Auto quality
- Folder: articles/og

**Usage:**
```typescript
const ogImg = await uploadArticleOGImage(fileBuffer);
```

---

#### deleteImage(publicId)

**Remove image from Cloudinary**

```typescript
async function deleteImage(publicId: string): Promise<void>
```

**Example:**
```typescript
await deleteImage('articles/featured/old-image');
```

---

#### getOptimizedImageUrl(publicId, options)

**Generate optimized URL with transformations**

```typescript
function getOptimizedImageUrl(
  publicId: string,
  options?: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
    format?: string;
  }
): string
```

**Example:**
```typescript
const url = getOptimizedImageUrl('articles/hero-image', {
  width: 800,
  crop: 'scale',
  quality: 'auto:eco',
  format: 'webp'
});
// Returns: https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/w_800,c_scale,q_auto:eco,f_webp/articles/hero-image
```

---

#### getResponsiveImageSrcSet(publicId, widths)

**Generate srcset for responsive images**

```typescript
function getResponsiveImageSrcSet(
  publicId: string,
  widths: number[] = [320, 640, 768, 1024, 1280, 1536]
): string
```

**Example:**
```typescript
const srcset = getResponsiveImageSrcSet('articles/hero');
// Returns:
// https://...w_320.../hero 320w,
// https://...w_640.../hero 640w,
// https://...w_768.../hero 768w,
// ...
```

**Usage in HTML:**
```html
<img
  src="https://res.cloudinary.com/.../hero"
  srcset={srcset}
  sizes="(max-width: 768px) 100vw, 50vw"
  alt="..."
/>
```

---

### Folder Structure

```
cloudinary://YOUR_CLOUD_NAME/
└── jpsrealtor/
    ├── articles/
    │   ├── featured/      # Featured images (1200x630)
    │   ├── og/            # Open Graph images
    │   └── content/       # In-article images
    ├── market-insights/
    │   ├── featured/
    │   └── charts/        # Market charts and graphs
    └── real-estate/
        ├── properties/    # Property photos
        ├── neighborhoods/ # Neighborhood images
        └── lifestyle/     # Lifestyle photos
```

---

### Image Specifications

#### Featured Images
- **Dimensions:** 1200 × 630px
- **Aspect Ratio:** 1.91:1
- **Format:** Auto (WebP preferred, JPEG fallback)
- **Quality:** auto:good
- **File Size Target:** < 200KB
- **Use Case:** Article headers, social sharing, previews

#### Open Graph Images
- **Dimensions:** 1200 × 630px (same as featured)
- **Aspect Ratio:** 1.91:1
- **Folder:** articles/og
- **Use Case:** Facebook, Twitter, LinkedIn sharing

#### In-Article Images
- **Max Width:** 1600px
- **Quality:** auto:eco (for faster loading)
- **Format:** Auto
- **Lazy Loading:** Enabled
- **Use Case:** Content illustrations, examples, screenshots

---

### Best Practices

**1. Image Optimization:**
- Always use `f_auto` (automatic format selection)
- Use `q_auto:eco` for in-article images
- Use `q_auto:good` for featured images
- Enable lazy loading for content images

**2. Responsive Images:**
- Generate srcset with 6 breakpoints
- Use `sizes` attribute appropriately
- Test on various screen sizes

**3. Alt Text:**
- Always provide descriptive alt text
- Include relevant keywords naturally
- Describe image content for accessibility

**4. File Organization:**
- Use consistent folder structure
- Include article slug in publicId
- Version images if replacing (v2, v3)

**5. Cache Management:**
- Cloudinary auto-caches transformed images
- Use versioning to bust cache if needed
- Default cache: 1 year

---

## Architecture Patterns

### 1. Year/Month Organization

**Automatic Date Extraction:**

```typescript
// Pre-save hook in article.ts
ArticleSchema.pre("save", function (next) {
  if (this.publishedAt) {
    this.year = this.publishedAt.getFullYear();
    this.month = this.publishedAt.getMonth() + 1; // 1-12
  }
  next();
});
```

**Benefits:**
- Fast date-based queries with indexes
- Archive by year/month
- URL structure: `/articles/2025/03/article-slug`
- Monthly newsletter grouping
- Annual reports

**Example Queries:**

```typescript
// Get all March 2025 articles
const articles = await Article.getByYearMonth(2025, 3);

// Get all 2025 articles
const yearArticles = await Article.find({ year: 2025, status: 'published' })
  .sort({ publishedAt: -1 });

// Count articles per month
const monthlyCounts = await Article.aggregate([
  { $match: { year: 2025, status: 'published' } },
  { $group: { _id: '$month', count: { $sum: 1 } } },
  { $sort: { _id: 1 } }
]);
```

---

### 2. Category System

**Three Content Pillars:**

| Category | Focus | Typical Topics | SEO Keywords |
|----------|-------|----------------|--------------|
| **articles** | Broader industry topics | Market forecasts, investment strategies, economic analysis, national trends | "real estate market", "housing trends", "investment strategy" |
| **market-insights** | Coachella Valley specific | Local pricing, inventory reports, neighborhood analysis, HOA trends | "palm desert homes", "la quinta market", "coachella valley real estate" |
| **real-estate-tips** | Practical consumer advice | Buying guides, negotiation tactics, inspection tips, closing process | "homebuying tips", "first-time buyer", "real estate advice" |

**Category Colors (Theme-Aware):**

```typescript
const categoryColors = {
  articles: {
    light: 'bg-blue-100 text-blue-700',
    dark: 'bg-blue-500/20 text-blue-400'
  },
  'market-insights': {
    light: 'bg-emerald-100 text-emerald-700',
    dark: 'bg-emerald-500/20 text-emerald-400'
  },
  'real-estate-tips': {
    light: 'bg-purple-100 text-purple-700',
    dark: 'bg-purple-500/20 text-purple-400'
  }
};
```

**Category-Based Routing:**

```
/articles/{category}/{slug}

Examples:
/articles/market-insights/palm-desert-q1-2025-report
/articles/real-estate-tips/5-essential-tips-for-buying-first-home
/articles/articles/coachella-valley-investment-outlook-2025
```

---

### 3. Status Workflow

**State Machine:**

```
draft → published → archived
  ↑                     ↓
  └─────────────────────┘
      (can republish)
```

**Draft:**
- **Visibility:** Admin only
- **Searchable:** No
- **View Count:** No tracking
- **Use Case:** Content review, pending approval, scheduled future publish

**Published:**
- **Visibility:** Public
- **Searchable:** Yes (text index)
- **View Count:** Active tracking
- **Use Case:** Live content, active articles

**Archived:**
- **Visibility:** Admin only (can republish)
- **Searchable:** No
- **View Count:** Preserved but frozen
- **Use Case:** Outdated content, seasonal articles, content refresh

**Status Transition Logic:**

```typescript
// Admin can transition between any states
if (isAdmin) {
  article.status = newStatus;
  if (newStatus === 'published' && !article.publishedAt) {
    article.publishedAt = new Date();
  }
  await article.save();
}
```

---

### 4. Featured Articles System

**Purpose:** Highlight important content on homepage and special sections

**Implementation:**

```typescript
// Mark article as featured
article.featured = true;
await article.save();

// Get featured articles
const featuredArticles = await Article.getFeatured(5);

// Featured articles index for fast queries
{ featured: 1, status: 1, publishedAt: -1 }
```

**Display Locations:**
- Homepage hero section
- Sidebar "Featured Articles" widget
- Newsletter highlights
- Category landing pages

**Best Practices:**
- Limit to 3-5 featured articles
- Rotate regularly (weekly/monthly)
- Feature high-performing content
- Mix categories for variety

---

### 5. View Tracking

**Automatic Tracking:**

```typescript
// In GET /api/articles/[id] route
if (article.status === 'published' && !isAdmin) {
  await Article.incrementViews(article._id.toString());
}

// Static method in article.ts
ArticleSchema.statics.incrementViews = function(articleId: string) {
  return this.findByIdAndUpdate(
    articleId,
    {
      $inc: { "metadata.views": 1 },
      $set: { "metadata.lastViewed": new Date() }
    },
    { new: true }
  );
};
```

**Analytics Uses:**
- Popular articles ranking
- Content performance tracking
- Editorial decisions
- A/B testing validation
- ROI measurement

**View Data:**
- `metadata.views` - Total view count
- `metadata.lastViewed` - Last view timestamp

**Exclusions:**
- Admin users viewing articles
- Draft/archived articles
- Preview page views
- Bot traffic (future enhancement)

---

### 6. Read Time Calculation

**Algorithm:**

```typescript
ArticleSchema.methods.calculateReadTime = function(): number {
  const wordsPerMinute = 200; // Average reading speed
  const wordCount = this.content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
};
```

**Industry Standards:**
- 200 words/min: Average adult reading speed
- 250 words/min: Fast reader
- 150 words/min: Careful reader

**Display Locations:**
- Article headers ("5 min read")
- Article cards in search results
- Chat article cards
- Admin dashboard

**Auto-Update:**
```typescript
// Before saving article
article.metadata.readTime = article.calculateReadTime();
await article.save();
```

---

## SEO Implementation

### 1. Meta Tags Architecture

**Title Tag:**
```html
<title>{seo.title}</title>
<!-- Max 60 chars, includes primary keyword -->
```

**Meta Description:**
```html
<meta name="description" content="{seo.description}" />
<!-- Max 160 chars, compelling summary with keyword -->
```

**Keywords (Meta):**
```html
<meta name="keywords" content="{seo.keywords.join(', ')}" />
<!-- 5-10 keywords, comma-separated -->
```

**Open Graph:**
```html
<meta property="og:title" content="{seo.title}" />
<meta property="og:description" content="{seo.description}" />
<meta property="og:image" content="{featuredImage.url}" />
<meta property="og:url" content="https://jpsrealtor.com/articles/..." />
<meta property="og:type" content="article" />
```

**Twitter Cards:**
```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{seo.title}" />
<meta name="twitter:description" content="{seo.description}" />
<meta name="twitter:image" content="{featuredImage.url}" />
```

---

### 2. URL Structure

**Pattern:**
```
/articles/{category}/{slug}
```

**Examples:**
```
/articles/market-insights/palm-desert-q1-2025-market-report
/articles/real-estate-tips/5-essential-tips-buying-first-home
/articles/articles/coachella-valley-real-estate-forecast-2025
```

**SEO Benefits:**
- **Descriptive:** URL contains keywords
- **Readable:** Humans can understand the topic
- **Category Context:** Category in URL path
- **Slug Optimization:** Generated from title with keywords
- **No Date in URL:** Evergreen content doesn't look dated

---

### 3. Image Optimization

**Featured Image SEO:**
```typescript
featuredImage: {
  url: "https://res.cloudinary.com/.../w_1200,h_630,c_fill,q_auto:good,f_auto/...",
  alt: "Modern Palm Desert golf course home with mountain views at sunset"
  // Alt text: Descriptive, includes keywords naturally
}
```

**Best Practices:**
- **Dimensions:** 1200x630px (optimal for social)
- **File Size:** < 200KB (fast loading)
- **Format:** WebP with JPEG fallback (f_auto)
- **Alt Text:** Descriptive, keyword-rich, natural language
- **Lazy Loading:** Enabled for below-the-fold images

**Cloudinary SEO URLs:**
```
https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/
  w_1200,               ← Width
  h_630,                ← Height
  c_fill,               ← Crop mode
  q_auto:good,          ← Quality
  f_auto,               ← Format (WebP/JPEG)
  /articles/featured/palm-desert-golf-home.jpg
```

---

### 4. Text Indexing & Search

**MongoDB Text Index:**
```typescript
ArticleSchema.index({
  title: "text",
  excerpt: "text",
  content: "text",
  tags: "text"
});
```

**Search Query:**
```typescript
const results = await Article.find(
  {
    $text: { $search: query },
    status: "published"
  },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } });
```

**Ranking Factors:**
- Title matches (highest weight)
- Excerpt matches (medium weight)
- Content matches (lower weight)
- Tag matches (medium weight)
- Text relevance score

**Stop Words Filtered:**
Common words ignored: the, a, an, and, or, but, in, on, at, to, for, of, with, by, etc.

---

### 5. Local SEO Strategy

**Always Include:**

**Geographic Keywords:**
- Coachella Valley
- Palm Springs
- Palm Desert
- La Quinta
- Indian Wells
- Rancho Mirage
- Indio
- Cathedral City

**Neighborhood/Landmark Keywords:**
- Specific golf courses (PGA West, Indian Wells Golf Resort)
- Country clubs (Vintage Club, Thunderbird)
- Shopping centers (El Paseo, Gardens on El Paseo)
- Events (Coachella, Stagecoach, BNP Paribas Open)

**Local Services:**
- Desert real estate
- Golf community homes
- Vacation rentals
- Investment properties
- Resort living

**Schema Markup (Future Enhancement):**
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "5 Essential Tips for Buying Your First Home",
  "author": {
    "@type": "Person",
    "name": "Joseph Sardella"
  },
  "datePublished": "2025-03-16",
  "image": "https://res.cloudinary.com/...",
  "publisher": {
    "@type": "Organization",
    "name": "Joseph Sardella - Coachella Valley Realtor",
    "logo": "https://jpsrealtor.com/logo.png"
  },
  "about": {
    "@type": "Place",
    "name": "Coachella Valley",
    "address": {
      "@type": "PostalAddress",
      "addressRegion": "CA",
      "addressLocality": "Palm Desert"
    }
  }
}
```

---

### 6. Content Length Guidelines

**Recommended Word Counts:**

| Article Type | Words | Read Time | Purpose |
|--------------|-------|-----------|---------|
| **Short** | 500-800 | 3-4 min | Quick tips, news updates, announcements |
| **Medium** | 1,000-1,500 | 5-8 min | Standard guides, market reports, how-tos |
| **Long** | 2,000-3,000 | 10-15 min | Comprehensive guides, deep dives, ultimate resources |
| **Ultimate** | 3,000+ | 15+ min | Pillar content, complete handbooks, yearly reports |

**SEO Benefits of Longer Content:**
- More keyword variations
- Better topic coverage
- Higher engagement (time on page)
- More internal linking opportunities
- Better ranking for competitive keywords

---

### 7. Internal Linking Strategy

**Link Types:**

1. **Contextual Links:**
   - Within article content
   - Relevant anchor text
   - Link to related articles

2. **Related Articles Section:**
   - End of article
   - 3-5 related articles
   - Same category or tags

3. **Category Archives:**
   - Link to category pages
   - "More in Market Insights →"

4. **Tag Pages:**
   - Link to tag collections
   - "More about #palm-desert"

**Example Internal Links:**
```markdown
For more details on HOA costs, read our guide on
[Hidden Costs of Home Ownership](/articles/real-estate-tips/hidden-costs-home-ownership).

Interested in golf communities? Check out our analysis of
[PGA West Investment Potential](/articles/market-insights/pga-west-investment-roi).
```

---

## Claude AI Integration

### System Prompt Configuration

**Model:** Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)

**System Prompt:**

```
You are an expert real estate writer specializing in the Coachella Valley market.
You create professional, SEO-optimized articles for jpsrealtor.com.

WRITING STYLE:
- Professional yet conversational
- SEO-optimized with natural keyword integration
- Data-driven with market insights and statistics
- Action-oriented with practical advice
- Engaging and easy to read

EXPERTISE AREAS:
- Coachella Valley real estate market
- Cities: Palm Springs, Palm Desert, La Quinta, Indian Wells, Rancho Mirage, Indio
- Golf communities and resort living
- Investment properties and ROI analysis
- Luxury real estate
- Market trends and economics
- First-time buyer guidance

CONTENT STRUCTURE:
- Clear, compelling headlines with keywords
- Strong hook in introduction (problem/opportunity)
- Well-organized sections with descriptive subheadings
- Bullet points and lists for readability
- Data and examples to support claims
- Strong conclusion with clear call-to-action

SEO REQUIREMENTS:
- Primary keyword in title, first paragraph, and conclusion
- Secondary keywords naturally throughout
- Meta title (max 60 chars) with primary keyword
- Meta description (max 160 chars) compelling summary
- 5-10 relevant keywords including local terms
- Alt text for images (if referenced)

LOCAL FOCUS:
Always include Coachella Valley geographic keywords:
- Coachella Valley
- Specific cities (Palm Desert, La Quinta, etc.)
- Neighborhoods and landmarks
- Local events (Coachella, BNP Paribas Open)

FORMAT:
Generate articles in MDX format with frontmatter:

---
title: "Article Title Here"
excerpt: "Brief summary (max 300 chars)"
category: "market-insights"
tags: ["tag1", "tag2", "tag3"]
seo:
  title: "SEO Title (max 60 chars)"
  description: "SEO description (max 160 chars)"
  keywords: ["keyword1", "keyword2", "keyword3"]
---

# Article Title

[Content here in markdown format]

CALL-TO-ACTION:
Always end articles with contact information:
📞 Call or Text: +1 (760) 833-6334
📧 Email: josephsardella@gmail.com
```

---

### Drafting Workflow

**Step 1: User Provides Prompt**

Admin clicks "Draft with Claude" and enters:
```
Write an article about the benefits of investing in Palm Desert golf communities,
focusing on ROI and lifestyle amenities. Target keywords: palm desert golf,
golf community investment, coachella valley ROI
```

**Step 2: API Call**

```typescript
POST /api/claude/draft-article
{
  "topic": "benefits of investing in Palm Desert golf communities...",
  "category": "market-insights",
  "keywords": ["palm desert golf", "golf community investment", "coachella valley ROI"],
  "tone": "professional yet approachable",
  "length": "medium"
}
```

**Step 3: Claude Generates Response**

**Server-Sent Events Stream:**
```
data: {"text": "---\n"}
data: {"text": "title: \"Palm"}
data: {"text": " Desert Golf"}
data: {"text": " Communities: The"}
data: {"text": " Ultimate Investment"}
data: {"text": " Guide\"\n"}
data: {"text": "excerpt: \"Discover"}
data: {"text": " why Palm Desert"}
...
data: {"type": "complete", "parsed": {...}}
```

**Step 4: Frontmatter Parsed**

```json
{
  "frontmatter": {
    "title": "Palm Desert Golf Communities: The Ultimate Investment Guide",
    "excerpt": "Discover why Palm Desert golf communities offer exceptional ROI combined with luxury lifestyle amenities in the heart of the Coachella Valley.",
    "category": "market-insights",
    "tags": ["palm desert", "golf communities", "investment", "ROI", "coachella valley"],
    "seo": {
      "title": "Palm Desert Golf Community Investment Guide | ROI Analysis",
      "description": "Complete guide to investing in Palm Desert golf communities with ROI analysis, amenities overview, and market insights.",
      "keywords": ["palm desert golf", "golf community investment", "coachella valley ROI", "luxury golf homes", "desert real estate"]
    }
  },
  "content": "# Palm Desert Golf Communities: The Ultimate Investment Guide\n\n..."
}
```

**Step 5: Form Auto-Population**

```typescript
setFormData({
  title: frontmatter.title,
  excerpt: frontmatter.excerpt,
  content: content,
  category: frontmatter.category,
  tags: frontmatter.tags,
  seo: frontmatter.seo
});
```

**Step 6: User Review & Publish**

- Review generated content
- Edit as needed
- Upload featured image
- Click "Publish Now" or "Save Draft"

---

### Edit with Claude

**Use Case:** Revise existing article

**Prompt Examples:**

```
"Expand the section about investment returns with more specific ROI data
and rental income projections for Palm Desert golf communities"

"Make the tone more conversational and add personal anecdotes about
client experiences in La Quinta golf communities"

"Add a new section about the tax benefits of investment properties
in California, specific to the Coachella Valley"

"Update the market statistics with 2025 Q1 data for Palm Desert
and emphasize the current inventory shortage"
```

**Workflow:**

1. User opens existing article in edit mode
2. Clicks "Edit with Claude"
3. Enters revision instructions
4. Claude streams updated content
5. Existing content is replaced/modified
6. User reviews and saves changes

---

### Cost Analysis

**Pricing Structure:**
- Input: $3 per million tokens
- Output: $15 per million tokens

**Average Article Breakdown:**

| Component | Tokens | Cost |
|-----------|--------|------|
| System Prompt | 500 | $0.0015 |
| User Prompt | 100 | $0.0003 |
| Generated Article | 4,000 | $0.0600 |
| **Total** | **4,600** | **~$0.07** |

**Monthly Cost Projections:**

| Articles/Month | Total Cost | Cost/Article |
|----------------|------------|--------------|
| 10 | $0.70 | $0.07 |
| 25 | $1.75 | $0.07 |
| 50 | $3.50 | $0.07 |
| 100 | $7.00 | $0.07 |
| 200 | $14.00 | $0.07 |

**ROI Calculation:**

**Before AI:**
- Time per article: 3 hours
- Hourly rate: $50 (conservative)
- Cost per article: $150

**With Claude:**
- Time per article: 15 minutes (review + edits)
- Hourly rate: $50
- Human time cost: $12.50
- AI cost: $0.07
- **Total: $12.57**

**Savings:** $137.43 per article (91.6% reduction)

---

## Chat Widget Integration

### Article Search in Chat

**How It Works:**

1. **User asks question:**
   ```
   "What should I know about energy costs in the Coachella Valley?"
   ```

2. **AI searches articles:**
   ```typescript
   const searchTool = {
     name: "searchArticles",
     parameters: {
       query: "energy costs coachella valley",
       limit: 5
     }
   };
   ```

3. **API returns relevant articles:**
   ```json
   {
     "results": [
       {
         "title": "Hidden Costs of Home Ownership: What to Budget For",
         "excerpt": "Comprehensive guide to understanding all costs...",
         "relevanceScore": 1.8
       }
     ]
   }
   ```

4. **AI responds with citation:**
   ```
   Based on our article "Hidden Costs of Home Ownership", here's what you
   need to know about energy costs in the Coachella Valley:

   Electricity costs vary significantly based on your service provider:

   • SCE (Southern California Edison): Higher rates, serves areas west of
     Washington Street in La Quinta
   • IID (Imperial Irrigation District): Lower rates, serves La Quinta
     east areas and Indio

   The difference can be $100-150/month for the same usage!

   [Article Card displayed]

   Source: Hidden Costs of Home Ownership
   ```

---

### ArticleCard in Chat

**Display:**

```
┌─────────────────────────────────────────┐
│ [Featured Image]                        │
│                                         │
├─────────────────────────────────────────┤
│ 🏷️ Market Insights  ⭐ Highly Relevant│
│                                         │
│ Hidden Costs of Home Ownership:         │
│ What to Budget For                      │
│                                         │
│ Comprehensive guide to understanding    │
│ all the costs of homeownership in      │
│ the Coachella Valley, including...     │
│                                         │
│ 📅 Mar 10, 2025    #energy #costs #HOA │
└─────────────────────────────────────────┘
```

**Features:**
- Featured image with hover zoom
- Category badge (colored)
- Relevance badge (if score > 0.7)
- Title (clickable, 2-line clamp)
- Excerpt (3-line clamp)
- Published date
- First 3 keywords
- External link icon
- Opens in new tab

---

### Relevance Scoring

**Factors:**

1. **Text Search Score** (MongoDB textScore)
   - Title match: Highest weight
   - Excerpt match: Medium weight
   - Content match: Lower weight
   - Tag match: Medium weight

2. **Keyword Match Bonus**
   - Title contains query: +2.0
   - Excerpt contains query: +1.5
   - Keyword array contains query: +1.0

3. **Recency Bonus**
   - Published within 30 days: +0.5
   - Published within 90 days: +0.2

4. **View Count Factor**
   - High views (>500): +0.3
   - Medium views (100-500): +0.1

**Score Interpretation:**
- **2.0+** - Highly relevant, exact match
- **1.0-2.0** - Very relevant, good match
- **0.5-1.0** - Moderately relevant
- **<0.5** - Weakly relevant

**Display Badge:**
```typescript
{relevanceScore > 0.7 && (
  <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">
    Highly Relevant
  </span>
)}
```

---

### Search Integration Flow

```
User Question
    ↓
AI analyzes query
    ↓
Calls searchArticles tool
    ↓
POST /api/articles/search
    ├─ MongoDB text search
    ├─ Keyword fallback search
    ├─ Relevance scoring
    └─ Return top 5 results
    ↓
AI receives article data
    ↓
AI crafts response with citations
    ↓
ArticleCard components rendered
    ↓
User clicks article
    ↓
Opens in new tab
```

---

## VPS Claude Content Writer

### Overview

**Purpose:** Run Claude Code directly on the VPS to create/manage articles with full codebase and database access.

**VPS Details:**
- **IP:** 147.182.236.138
- **User:** root
- **Password:** YOUR_VPS_PASSWORD
- **Platform:** DigitalOcean
- **Access:** SSH

---

### Launch Process

**From Admin Panel:**

1. Navigate to `/admin/articles`
2. Click "Claude VPS" button (purple, with Server + Sparkles icons)
3. Modal appears with prompt textarea
4. Enter instructions for Claude

**Example Instructions:**

```
Review our existing articles in the database to learn our writing style
and tone, then draft a new article about Indian Wells luxury real estate
market trends for Q1 2025. Include specific data on average prices,
inventory levels, and days on market. Save as draft when complete.
```

```
Analyze our top-performing articles (by views) and create a similar
article about Palm Desert golf community investments, focusing on ROI
analysis and rental income potential.
```

```
Create 3 short articles (500-800 words each) about:
1. Best neighborhoods for families in La Quinta
2. Investment opportunities in Indio
3. Luxury amenities in Rancho Mirage country clubs

Save all as drafts for review.
```

5. Click "Launch on VPS"
6. System executes:
   ```bash
   sshpass -p "YOUR_VPS_PASSWORD" ssh -o StrictHostKeyChecking=no root@147.182.236.138 "
     cd /root/jpsrealtor &&
     claude-code --prompt '${claudePrompt}'
   "
   ```

---

### What Claude Can Do on VPS

**Direct Access:**
- **Codebase:** Full read/write access to `/root/jpsrealtor/`
- **Database:** Direct MongoDB connection
- **File System:** Can read existing articles, create new ones
- **Git:** Can commit changes
- **npm:** Can run build scripts

**Capabilities:**

1. **Review Existing Articles:**
   ```bash
   # Read existing articles from database
   mongosh mongodb://... --eval "db.articles.find({status:'published'}).limit(10)"
   ```

2. **Create New Articles:**
   ```bash
   # Create article via API or direct DB insert
   curl -X POST http://localhost:3000/api/articles -d '{...}'
   ```

3. **Update Articles:**
   ```bash
   # Update existing articles
   curl -X PUT http://localhost:3000/api/articles/[id] -d '{...}'
   ```

4. **Upload Images:**
   ```bash
   # Upload to Cloudinary via API
   curl -X POST http://localhost:3000/api/upload -F file=@image.jpg
   ```

5. **Analyze Performance:**
   ```bash
   # Query article analytics
   mongosh --eval "db.articles.aggregate([
     {$match: {status: 'published'}},
     {$sort: {'metadata.views': -1}},
     {$limit: 10}
   ])"
   ```

---

### Benefits of VPS Claude

**Vs. Local Claude:**

| Feature | Local Claude (API) | VPS Claude |
|---------|-------------------|------------|
| **Database Access** | Indirect (via API) | Direct (MongoDB) |
| **File System** | No access | Full access |
| **Bulk Operations** | Limited | Unlimited |
| **Learning Style** | Can't read existing articles | Can analyze all articles |
| **Automation** | Manual trigger | Can schedule |
| **Cost** | ~$0.07/article | ~$0.07/article + VPS time |

**Use Cases:**

1. **Batch Article Creation:**
   - Generate 10 articles at once
   - Learn from existing content
   - Consistent style across all

2. **Content Refresh:**
   - Update outdated statistics
   - Refresh seasonal content
   - Add new data to existing articles

3. **Analytics-Driven Content:**
   - Create articles based on top-performing topics
   - Generate content for underserved categories
   - Fill content gaps

4. **A/B Testing:**
   - Generate multiple versions
   - Test different headlines
   - Compare engagement

---

### Security Considerations

**Approved Commands:**
```bash
# Safe operations
- Read articles from database
- Create new draft articles
- Update existing articles
- Upload images to Cloudinary
- Query analytics

# Requires approval
- Delete articles (should use archive instead)
- Publish articles directly (use draft → review → publish)
- Modify user accounts
- Change system settings
```

**Best Practices:**
- Always create articles as drafts first
- Review AI-generated content before publishing
- Verify image uploads
- Check for duplicate content
- Validate SEO fields

---

## Deployment Guide

### Environment Variables

**Production `.env`:**

```bash
# ===== API KEYS =====
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-...

# ===== CLOUDINARY =====
CLOUDINARY_CLOUD_NAME=YOUR_CLOUD_NAME
CLOUDINARY_API_KEY=YOUR_CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET=YOUR_CLOUDINARY_API_SECRET

# ===== DATABASE =====
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/jpsrealtor?retryWrites=true&w=majority

# ===== AUTHENTICATION =====
NEXTAUTH_URL=https://jpsrealtor.com
NEXTAUTH_SECRET=your-secret-here
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FACEBOOK_CLIENT_ID=...
FACEBOOK_CLIENT_SECRET=...

# ===== VPS SSH =====
VPS_HOST=147.182.236.138
VPS_USER=root
VPS_PASSWORD=YOUR_VPS_PASSWORD

# ===== OTHER =====
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://jpsrealtor.com
```

---

### VPS Deployment Steps

**1. SSH into VPS:**
```bash
ssh root@147.182.236.138
# Password: YOUR_VPS_PASSWORD
```

**2. Navigate to project:**
```bash
cd /root/jpsrealtor
```

**3. Pull latest code:**
```bash
git pull origin main
```

**4. Install dependencies:**
```bash
npm install
```

**5. Build production:**
```bash
npm run build
```

**6. Restart PM2:**
```bash
pm2 restart jpsrealtor

# Or if not yet set up:
pm2 start npm --name "jpsrealtor" -- start
pm2 save
pm2 startup
```

**7. Verify deployment:**
```bash
pm2 logs jpsrealtor --lines 50

# Check if running
pm2 status

# Check website
curl http://localhost:3000
```

---

### MongoDB Indexes Setup

**First-time deployment:**

```bash
# Connect to MongoDB
mongosh "mongodb+srv://..."

# Switch to database
use jpsrealtor

# Create indexes (if not auto-created)
db.articles.createIndex({ status: 1, publishedAt: -1 })
db.articles.createIndex({ category: 1, status: 1, publishedAt: -1 })
db.articles.createIndex({ year: 1, month: 1, status: 1 })
db.articles.createIndex({ tags: 1, status: 1 })
db.articles.createIndex({ featured: 1, status: 1, publishedAt: -1 })
db.articles.createIndex({ "metadata.views": -1 })
db.articles.createIndex({ slug: 1 }, { unique: true })
db.articles.createIndex({
  title: "text",
  excerpt: "text",
  content: "text",
  tags: "text"
})

# Verify indexes
db.articles.getIndexes()
```

---

### Post-Deployment Checks

**1. Articles API:**
```bash
curl https://jpsrealtor.com/api/articles?status=published&limit=5
```

**2. Article Search:**
```bash
curl -X POST https://jpsrealtor.com/api/articles/search \
  -H "Content-Type: application/json" \
  -d '{"query": "palm desert", "limit": 3}'
```

**3. Admin Access:**
- Navigate to https://jpsrealtor.com/admin/articles
- Verify statistics display
- Test filtering
- Check article creation

**4. Claude Integration:**
- Click "Draft with Claude"
- Test streaming response
- Verify form auto-population

**5. Image Upload:**
- Upload test image
- Verify Cloudinary storage
- Check image optimization

---

### Monitoring & Logs

**PM2 Logs:**
```bash
# Real-time logs
pm2 logs jpsrealtor

# Last 100 lines
pm2 logs jpsrealtor --lines 100

# Error logs only
pm2 logs jpsrealtor --err

# Clear logs
pm2 flush
```

**MongoDB Query Performance:**
```bash
mongosh "mongodb+srv://..." --eval "
  db.articles.find({status: 'published'})
    .sort({publishedAt: -1})
    .limit(10)
    .explain('executionStats')
"
```

**System Resources:**
```bash
# CPU and memory
pm2 monit

# Disk usage
df -h

# Memory usage
free -h

# Process tree
htop
```

---

### Backup Strategy

**1. MongoDB Backups:**
```bash
# Daily backup via cron
0 2 * * * mongodump --uri="mongodb+srv://..." --out=/backups/$(date +\%Y-\%m-\%d)

# Keep last 7 days
find /backups -type d -mtime +7 -exec rm -rf {} \;
```

**2. Cloudinary Backups:**
- Images already stored in CDN
- Download via Cloudinary API if needed
- Keep publicId references in database

**3. Code Backups:**
- GitHub repository (main source)
- Git tags for major releases
- Feature branches for large changes

---

## File Locations Quick Reference

### API Routes
```
src/app/api/articles/
├── route.ts                    # GET (list), POST (create)
├── [id]/
│   └── route.ts                # GET, PUT, PATCH, DELETE
└── search/
    └── route.ts                # POST (AI search)

src/app/api/claude/
└── draft-article/
    └── route.ts                # POST (Claude drafting)

src/app/api/upload/
└── route.ts                    # POST (Cloudinary upload)
```

### Admin Pages
```
src/app/admin/articles/
├── page.tsx                    # Dashboard
├── new/
│   └── page.tsx                # Create article
├── [id]/
│   └── page.tsx                # Edit article
└── test-edit/
    └── page.tsx                # Test route

src/app/admin/cms/
├── page.tsx                    # CMS dashboard (duplicate)
└── new/
    └── page.tsx                # CMS create (duplicate)
```

### Public Pages
```
src/app/articles/
└── preview/
    └── page.tsx                # Preview iframe
```

### Components
```
src/app/components/
├── chat/
│   └── ArticleCard.tsx         # Article cards for chat
└── AdminNav.tsx                # Admin navigation
```

### Models & Libraries
```
src/models/
└── article.ts                  # Article schema

src/lib/
├── cloudinary.ts               # Image management
└── mongoose.ts                 # Database connection
```

### Documentation
```
docs/
├── ARTICLES_CMS_COMPLETE.md    # This file
├── CLAUDE_CMS_INTEGRATION.md   # Claude AI guide
├── TESTING_ARTICLE_SEARCH.md   # Search testing
└── VPS_CLAUDE_CONTENT_WRITER.md # VPS workflow
```

---

## Summary

The jpsrealtor.com Articles & CMS system is a **production-ready, AI-powered content management platform** featuring:

**✅ Complete CRUD Operations**
- Create, read, update, delete articles via API
- Admin-only access control
- Draft → Published → Archived workflow

**✅ AI Content Generation**
- Claude Sonnet 4.5 integration
- Real-time streaming responses
- $0.07 per article cost
- 90% time savings

**✅ Professional Media Management**
- Cloudinary CDN integration
- Auto-optimization (quality, format, responsive)
- Featured and OG images
- Drag-and-drop uploads

**✅ Advanced Search**
- MongoDB text search
- Keyword fallback search
- Chat widget integration
- Relevance scoring

**✅ SEO-Optimized Architecture**
- Meta tags (title, description, keywords)
- Open Graph and Twitter Cards
- Descriptive URLs with keywords
- Image alt text and optimization
- Local SEO focus (Coachella Valley)

**✅ Analytics & Tracking**
- View counting
- Read time calculation
- Popular articles ranking
- Category performance

**✅ Developer-Friendly**
- Well-documented API
- TypeScript interfaces
- MongoDB indexes for performance
- Modular component architecture
- Theme support (light/dark)

**✅ VPS Integration**
- Claude Code on VPS
- Direct database access
- Bulk article creation
- Content analysis

**Time to Create Article:**
- Before: 2-4 hours (manual)
- After: 10-15 minutes (with Claude)
- **Efficiency: 90% improvement**

**Cost per Article:**
- Human time: $12.50 (15 min @ $50/hr)
- AI generation: $0.07
- **Total: $12.57** (vs. $150 manual)

This system enables Joseph Sardella to produce high-quality, SEO-optimized real estate content at scale with minimal time investment, allowing him to focus on client relationships and business growth.

---

**End of Documentation**

For questions or issues, contact the development team or refer to related documentation in the `/docs` folder.
