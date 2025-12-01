# CMS System Documentation

**Last Updated:** November 30, 2025
**Status:** ✅ Production Ready with Auto-Deploy

## Overview

The JPSRealtor CMS is a complete content management system for creating, editing, and publishing real estate articles with AI assistance, automatic GitHub deployment, and Vercel integration.

## Architecture

### Storage Model

**Published Articles:** MDX files in `src/posts/`
- Files are committed to Git and deployed to production
- Read by Next.js at build time for static generation
- Frontmatter contains metadata (title, SEO, category, etc.)

**Draft Articles:** MongoDB database
- Temporary storage for work-in-progress
- Can be published to MDX when ready
- Optional backup location

### Auto-Deploy Pipeline

```
Click "Update on Site"
  → Write MDX to src/posts/{slug}.mdx
  → git add src/posts/{slug}.mdx
  → git commit -m "Update article: {title}"
  → git push origin main
  → GitHub receives push
  → Vercel auto-deploys (~2 minutes)
  → Article live on jpsrealtor.com
```

## Features

### 1. Article Editor (`/admin/cms/edit/[slugId]`)

**Modern Side-by-Side Layout:**
- Left Panel (40%): Live preview iframe
- Right Panel (60%): Editor with AI regeneration

**Fields:**
1. **Title** - With AI regenerate button
2. **Excerpt** - 300 char limit, AI regenerate
3. **Category** - Dropdown (Articles, Market Insights, Real Estate Tips)
4. **Content** - TipTap WYSIWYG editor with AI regenerate
5. **Featured Image** - Cloudinary upload
6. **SEO Fields:**
   - Meta Title (60 char recommended)
   - Meta Description (300 char max, warning at >300)
   - Keywords (array, AI regenerate)

**Action Buttons:**
1. **Backup to DB** - Save to MongoDB (blue)
2. **Save as Draft** - Publish to site with `draft: true` flag (orange)
3. **Update on Site** - Publish and auto-deploy to production (green)

### 2. Article List (`/admin/cms`)

**Modern Minimal Design:**
- Clean interface with auto-scrolling stats carousel
- Icon-only "New Article" button (+ icon) in header
- No card backgrounds - content-focused layout
- HR dividers between articles for visual separation
- Thumbnails displayed for all articles (64x64 desktop, 80x80 mobile)

**Stats Carousel:**
- Auto-scrolls every 3 seconds through 6 metrics
- Icon, label, and data on same horizontal line
- Clickable indicator dots for manual navigation
- Metrics: Total Articles, Published, Drafts, General Articles, Market Insights, Real Estate Tips

**Features:**
- View all published MDX articles
- Search by title/content (auto-filters on input)
- Filter by category (Articles, Market Insights, Real Estate Tips)
- Responsive layout (desktop list view, mobile card view)

**Actions per article:**
- **View** - Opens article on live site
- **Edit** - Opens in modern editor
- **Unpublish** - Removes MDX file from site
- **Delete** - Removes article completely

### 3. AI Field Regeneration

**Powered by Groq (llama-3.3-70b-versatile)**

**Available Fields:**
- `title` - Generate SEO-optimized titles
- `excerpt` - Create compelling summaries
- `content` - Full article generation
- `seoTitle` - Meta title optimization
- `seoDescription` - Meta description
- `keywords` - Keyword extraction

**Context-Aware:**
- Passes article context (title, excerpt, content, category)
- Maintains consistency across fields
- Optional user prompts for customization

### 4. Publishing Pipeline

**File:** `src/lib/publishing-pipeline.ts`

**Functions:**

```typescript
// Validate article before publishing
validateForPublish(article: ArticleFormData): PublishValidation

// Publish article (write MDX + optional deploy)
publishArticle(
  article: ArticleFormData,
  slugId: string,
  options: { autoDeploy?: boolean }
): Promise<void>

// Deploy to production via Git
deployToProduction(
  article: ArticleFormData,
  slugId: string
): Promise<{ success: boolean, message: string, commitHash?: string }>

// Unpublish (delete MDX file)
unpublishArticle(slugId: string): Promise<void>
```

**Validation Rules:**
- ✅ Title: 10-200 characters
- ✅ Excerpt: 50-300 characters
- ✅ Content: 500+ characters
- ✅ Featured Image: Required
- ✅ SEO Title: <60 chars (recommended)
- ✅ SEO Description: <300 chars (warning only)
- ✅ Keywords: 3+ recommended

## Frontmatter Format

```yaml
---
title: "Article Title"
slugId: "article-slug"
date: "11/30/2025"
section: "articles"  # Maps to category
draft: true  # Optional, only if saved as draft
image: "https://res.cloudinary.com/.../image.jpg"
metaTitle: "SEO Title"
metaDescription: "SEO description for search engines"
ogImage: "https://res.cloudinary.com/.../image.jpg"
altText: "Image alt text"
keywords:
  - keyword 1
  - keyword 2
  - keyword 3
---

Article content here...
```

## Category Mapping

**UI (formData.category)** → **Frontmatter (section)**

- `articles` → `section: "articles"`
- `market-insights` → `section: "market-insights"`
- `real-estate-tips` → `section: "real-estate-tips"`

**When Loading:**
- Reads `section` from frontmatter → displays as `category` in UI

**When Saving:**
- Takes `category` from UI → writes as `section` in frontmatter

## Git Integration

### Auto-Commit & Push

**When:** Clicking "Update on Site" or "Save as Draft" (if autoDeploy: true)

**Process:**
```bash
# 1. Check for changes
git status --porcelain

# 2. Stage the file
git add src/posts/{slug}.mdx

# 3. Create commit
git commit -m "Update article: {title} [DRAFT]

- Category: {category}
- Slug: {slugId}
- Auto-deployed via CMS

🤖 Generated with Claude Code CMS"

# 4. Push to GitHub
git push origin main
```

**Error Handling:**
- Gracefully handles "nothing to commit"
- Provides helpful messages for git failures
- Returns commit hash for tracking

### Manual Git Operations

**Pull latest articles:**
```bash
# Fetch and update only src/posts/
git fetch origin main
git checkout origin/main -- src/posts/
```

**Alias for quick updates:**
```bash
git config --global alias.pull-articles '!git fetch origin main && git checkout origin/main -- src/posts/'

# Then use:
git pull-articles
```

## API Routes

### POST `/api/articles/publish`

**Body:**
```json
{
  "article": {
    "title": "Article Title",
    "excerpt": "Article excerpt",
    "content": "Full content...",
    "category": "articles",
    "draft": false,
    "featuredImage": { "url": "...", "publicId": "...", "alt": "..." },
    "seo": {
      "title": "SEO Title",
      "description": "SEO Description",
      "keywords": ["keyword1", "keyword2"]
    }
  },
  "slugId": "article-slug",
  "autoDeploy": true  // Optional, defaults to true
}
```

**Response:**
```json
{
  "success": true,
  "slugId": "article-slug",
  "url": "/insights/article-slug",
  "warnings": [],
  "message": "Article published successfully to src/posts/article-slug.mdx and deployed to production! Vercel will rebuild in ~2 minutes.",
  "deployed": true
}
```

### POST `/api/articles/regenerate-field`

**Body:**
```json
{
  "field": "title",
  "currentValue": "Current title",
  "articleContext": {
    "title": "Article Title",
    "excerpt": "Excerpt...",
    "content": "Content preview...",
    "category": "articles",
    "keywords": ["keyword1", "keyword2"]
  },
  "userPrompt": "Optional custom instructions"
}
```

**Response:**
```json
{
  "success": true,
  "newValue": "AI-generated title",
  "field": "title"
}
```

### GET `/api/articles/load-published?slugId={slug}`

Loads published article from MDX file for editing.

## Components

### RegenerateButton

**Location:** `src/app/components/RegenerateButton.tsx`

**Props:**
```typescript
{
  field: 'title' | 'excerpt' | 'content' | 'seoTitle' | 'seoDescription' | 'keywords'
  currentValue: string | string[]
  articleContext: {
    title?: string
    excerpt?: string
    content?: string
    category: string
    keywords: string[]
  }
  onRegenerate: (newValue: string | string[]) => void
  isLight: boolean
  disabled?: boolean
}
```

### TipTapEditor

**Location:** `src/app/components/TipTapEditor.tsx`

**Features:**
- Rich text formatting (bold, italic, headings)
- Lists (ordered, unordered)
- Links
- Code blocks
- Blockquotes
- Markdown output

## Removed Features

**Tags System** - Removed in favor of simpler category-based organization
- No tags input field
- No tags validation
- Tags removed from ArticleFormData interface
- Frontmatter does not include tags

## Deployment

### Development
```bash
npm run dev
```
Access CMS at: `http://localhost:3000/admin/cms`

### Production

**Automatic:**
- Click "Update on Site" → Auto-deploys via Git push
- Vercel detects push → Rebuilds entire site (~2 mins)
- Article live at: `https://jpsrealtor.com/insights/{category}/{slug}`

**Manual:**
```bash
git add src/posts/
git commit -m "Update articles"
git push origin main
```

## Security

- **Authentication:** NextAuth with admin role check
- **Authorization:** All CMS routes protected by `isAdmin` flag
- **Git Operations:** Run server-side only
- **API Routes:** Validate session before executing

## Future Enhancements

- [ ] Version history for articles
- [ ] Scheduled publishing
- [ ] Image optimization/compression
- [ ] Article analytics
- [ ] SEO score checker
- [ ] Bulk operations (delete, category change)

## Troubleshooting

**Article not deploying to production:**
- Check git status: `git status`
- Verify credentials: `git config --list`
- Check Vercel dashboard for build errors

**Preview not updating:**
- Click "Refresh Preview" button
- Check browser console for errors
- Verify article has valid frontmatter

**AI regeneration failing:**
- Check Groq API key in `.env`
- Verify network connection
- Check API quota limits

## Related Documentation

- [Frontend Architecture](./FRONTEND_ARCHITECTURE.md)
- [AI Integration](./AI_INTEGRATION.md)
- [Database Models](./DATABASE_MODELS.md)
- [Authentication](./AUTHENTICATION.md)
