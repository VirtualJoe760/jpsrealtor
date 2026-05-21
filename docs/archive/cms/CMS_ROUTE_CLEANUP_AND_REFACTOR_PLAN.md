# CMS Route Cleanup & Refactor Plan

**Created**: March 7, 2026
**Purpose**: Clean up old MongoDB article routes, consolidate with MDX-based system, prepare for dual-environment publishing
**Status**: Planning Complete → Ready for Implementation

---

## EXECUTIVE SUMMARY

### Current State
Your article system has **TWO parallel implementations**:

1. **OLD MongoDB-based system** (`/api/articles/route.ts`, `/api/articles/[id]`, `/api/articles/search`)
   - Uses Article MongoDB model
   - CRUD operations for database
   - Text search via MongoDB indexes
   - **Status**: Legacy, partially used

2. **NEW MDX file-based system** (`/api/articles/list`, `/api/articles/publish`, `/admin/cms`)
   - Articles stored as MDX files in `src/posts/`
   - Publishing pipeline writes to filesystem + Git
   - Read from filesystem at runtime
   - **Status**: Current production system

### The Problem
- Duplicate code and confusion about which endpoints to use
- Old `/admin/articles` page vs new `/admin/cms` page
- MongoDB CRUD endpoints (`GET/POST /api/articles`) not fully integrated
- Two search endpoints: `/search` (old) vs `/ai-search` (new)
- Dual environment plan (DUAL_ENVIRONMENT_PUBLISHING_TODO.md) not yet implemented

### The Solution
**Phase 1**: Clean up and deprecate old routes
**Phase 2**: Implement dual-environment publishing (MongoDB + MDX)
**Phase 3**: Consolidate Insights page as the home page with auth-aware content

---

## ROUTE INVENTORY

### Frontend Routes

| Route | Purpose | Status | Action |
|-------|---------|--------|--------|
| `/insights` | Main Insights page | ✅ Current | Keep, enhance for dual-purpose (guest/logged-in) |
| `/insights/[category]/[slugId]` | Individual article pages | ✅ Current | Keep |
| `/articles/preview` | Preview page for CMS editor | ✅ Current | Keep |
| `/admin/cms` | CMS article list & editor | ✅ Current | Keep |
| `/admin/cms/new` | New article editor | ✅ Current | Keep |
| `/admin/cms/edit/[slugId]` | Edit article | ✅ Current | Keep |
| `/admin/articles` | **OLD admin articles page** | ❌ Deprecated | **DELETE** |

### API Routes - Current System (Keep)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/articles/list` | GET | List published MDX articles | ✅ Keep - primary listing |
| `/api/articles/publish` | POST | Publish article to MDX + Git | ✅ Keep - update for dual env |
| `/api/articles/unpublish` | DELETE | Delete MDX file | ✅ Keep - update for dual env |
| `/api/articles/set-draft` | POST | Toggle draft status | ✅ Keep |
| `/api/articles/ai-search` | POST | AI-powered search (Groq) | ✅ Keep - used by Insights page |
| `/api/articles/topics` | GET | Generate topic cloud | ✅ Keep |
| `/api/articles/generate` | POST | AI article generation | ✅ Keep |
| `/api/articles/load-published` | GET | Load published articles | ⚠️ Review - might duplicate /list |
| `/api/articles/published-status` | GET | Check publish status | ⚠️ Review - needed for dual env |
| `/api/articles/regenerate-field` | POST | Regenerate specific field | ⚠️ Review - CMS feature |

### API Routes - Old MongoDB System (Deprecate/Refactor)

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/articles` (route.ts) | GET | List articles from MongoDB | ❌ Deprecate - use `/list` instead |
| `/api/articles` (route.ts) | POST | Create article in MongoDB | ⚠️ Refactor - will be needed for dual env |
| `/api/articles/[id]` | GET | Get article by MongoDB ID | ❌ Deprecate - not used |
| `/api/articles/[id]` | PATCH | Update article in MongoDB | ⚠️ Refactor - will be needed for dual env |
| `/api/articles/[id]` | DELETE | Delete from MongoDB | ⚠️ Refactor - will be needed for dual env |
| `/api/articles/search` | POST | MongoDB text search | ❌ Deprecate - use `/ai-search` |

### Admin API Routes

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `/api/admin/articles` | Admin article management | ⚠️ Review - might be old |

---

## CLEANUP PLAN

### Phase 1: Remove Old Routes (1 hour)

#### 1.1 Delete Old Frontend Routes
```bash
# Remove old admin articles page (if exists and not used)
rm -rf src/app/admin/articles/

# Verify no imports reference this page
grep -r "admin/articles" src/
```

#### 1.2 Deprecate Old API Endpoints

**Option A: Delete Immediately** (if not used)
```bash
# Check usage first
grep -r "/api/articles/search" src/
grep -r "/api/articles/\[id\]" src/

# If no references found, delete
rm src/app/api/articles/route.ts
rm -rf src/app/api/articles/[id]/
rm src/app/api/articles/search/route.ts
```

**Option B: Add Deprecation Warnings** (safer approach)
```typescript
// src/app/api/articles/route.ts
export async function GET(req: NextRequest) {
  console.warn('[DEPRECATED] /api/articles - Use /api/articles/list instead');
  return NextResponse.json({
    error: 'This endpoint is deprecated. Use /api/articles/list instead.',
    deprecatedSince: '2026-03-07',
    migrateToalternate: '/api/articles/list'
  }, { status: 410 }); // 410 Gone
}
```

#### 1.3 Update Chat Integration
If `/api/articles/search` is used by chat system:
```typescript
// Find all references
grep -r "api/articles/search" src/

// Update to use /api/articles/ai-search instead
// src/lib/chat/tools/executors/search-articles.ts (example)
- const response = await fetch('/api/articles/search', {
+ const response = await fetch('/api/articles/ai-search', {
```

---

### Phase 2: Implement Dual-Environment Publishing (6-8 hours)

Follow the plan in `DUAL_ENVIRONMENT_PUBLISHING_TODO.md`:

#### 2.1 Environment Detection
```typescript
// src/lib/environment.ts (create this)
export const IS_PRODUCTION = process.env.VERCEL === '1';
export const IS_LOCALHOST = !IS_PRODUCTION;
export const DEPLOY_HOOK_URL = process.env.VERCEL_DEPLOY_HOOK_URL;

export function getEnvironment() {
  return IS_PRODUCTION ? 'production' : 'localhost';
}
```

#### 2.2 Create Article Service Layer
```typescript
// src/lib/services/article.service.ts (create this)
import { IS_PRODUCTION } from '@/lib/environment';
import Article from '@/models/article';
import { publishArticleToMDX } from '@/lib/publishing-pipeline';

export class ArticleService {
  /**
   * Publish article - environment-aware
   * - Production: Save to MongoDB + trigger deploy hook
   * - Localhost: Write MDX file + git commit/push
   */
  static async publishArticle(data: ArticleFormData, slugId: string) {
    if (IS_PRODUCTION) {
      // Save to MongoDB
      const article = await Article.findOneAndUpdate(
        { slug: slugId },
        { ...data, draft: false, publishedAt: new Date() },
        { upsert: true, new: true }
      );

      // Trigger Vercel rebuild
      await triggerDeployHook('Article published: ' + data.title);

      return { _id: article._id, deploying: true };
    } else {
      // Existing MDX workflow
      await publishArticleToMDX(data, slugId);
      return { success: true };
    }
  }

  /**
   * List articles - reads from MDX files (generated at build time from MongoDB)
   */
  static async listArticles(filters?: ArticleFilters) {
    // Read MDX files from src/posts/
    // This works in both environments
    return await loadMDXArticles(filters);
  }

  // ... more methods
}
```

#### 2.3 Build-Time MDX Generation
```typescript
// scripts/generate-mdx-from-db.ts (create this)
import dbConnect from '@/lib/mongoose';
import Article from '@/models/article';
import fs from 'fs/promises';
import path from 'path';

async function generateMDXFiles() {
  console.log('🔄 Generating MDX files from MongoDB...');

  await dbConnect();

  // Fetch all published articles
  const articles = await Article.find({ draft: false }).sort({ publishedAt: -1 });

  console.log(`📝 Found ${articles.length} published articles`);

  const postsDir = path.join(process.cwd(), 'src', 'posts');

  // Ensure directory exists
  await fs.mkdir(postsDir, { recursive: true });

  // Generate MDX file for each article
  for (const article of articles) {
    const mdxContent = generateMDXContent(article);
    const filePath = path.join(postsDir, `${article.slug}.mdx`);

    await fs.writeFile(filePath, mdxContent, 'utf-8');
    console.log(`✅ Generated: ${article.slug}.mdx`);
  }

  console.log('🎉 MDX generation complete!');
}

function generateMDXContent(article: any): string {
  return `---
title: "${article.title}"
date: "${article.publishedAt.toISOString().split('T')[0]}"
excerpt: "${article.excerpt}"
category: "${article.category}"
image: "${article.image || ''}"
keywords: ${JSON.stringify(article.seo?.keywords || [])}
draft: false
---

${article.content}
`;
}

generateMDXFiles().catch(console.error);
```

#### 2.4 Update package.json
```json
{
  "scripts": {
    "prebuild": "tsx scripts/generate-mdx-from-db.ts",
    "build": "next build",
    "dev": "next dev"
  }
}
```

#### 2.5 Update API Endpoints
```typescript
// src/app/api/articles/publish/route.ts
import { ArticleService } from '@/lib/services/article.service';
import { IS_PRODUCTION } from '@/lib/environment';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { article, slugId, autoDeploy } = body;

    // Environment-aware publishing
    const result = await ArticleService.publishArticle(article, slugId);

    if (IS_PRODUCTION) {
      return NextResponse.json({
        success: true,
        message: 'Article saved! Site is rebuilding...',
        deploying: true,
        estimatedTime: '2-3 minutes',
        articleId: result._id
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'Article published successfully',
        mdxFile: `src/posts/${slugId}.mdx`
      });
    }
  } catch (error) {
    console.error('[Publish] Error:', error);
    return NextResponse.json(
      { error: 'Failed to publish article' },
      { status: 500 }
    );
  }
}
```

---

### Phase 3: Insights as Dual-Purpose Home Page (4 hours)

Now that articles work in both environments, enhance Insights page:

#### 3.1 Add Auth-Aware Hero
```typescript
// src/app/insights/page.tsx
import { getServerSession } from 'next-auth';
import GuestHero from '@/app/components/insights/GuestHero';
import UserHero from '@/app/components/insights/UserHero';

export default async function InsightsPage() {
  const session = await getServerSession(authOptions);
  const isAuthenticated = !!session?.user;

  return (
    <div className="min-h-screen pt-12 px-4">
      {/* Conditional Hero */}
      {!isAuthenticated ? (
        <GuestHero /> // Joseph introduction
      ) : (
        <UserHero user={session.user} /> // Welcome back, [Name]
      )}

      {/* Market Stats - same for both */}
      <MarketStats />

      {/* Articles - same for both but can add personalization */}
      <ArticlesList />
    </div>
  );
}
```

#### 3.2 Personalized Recommendations (Logged-In Users)
```typescript
// Add to insights page for logged-in users
{isAuthenticated && (
  <RecommendedArticles
    userId={session.user.id}
    favoriteLocations={user.favoriteLocations}
    searchHistory={user.searchHistory}
  />
)}
```

---

## MIGRATION CHECKLIST

### Pre-Migration
- [ ] **Backup MongoDB database** (Atlas snapshot)
- [ ] **Backup `src/posts/` directory** (commit to Git)
- [ ] **Document all current API endpoints** being used
- [ ] **Search codebase for deprecated route usage**
```bash
grep -r "/api/articles/\[" src/
grep -r "/api/articles/search" src/
grep -r "/admin/articles" src/
```

### Phase 1: Cleanup (Day 1)
- [ ] Remove `/admin/articles` page (if deprecated)
- [ ] Add deprecation warnings to old API routes
- [ ] Update chat integration to use `/api/articles/ai-search`
- [ ] Test all Insights page functionality still works
- [ ] Commit and push changes

### Phase 2: Dual Environment (Day 2-3)
- [ ] Create `src/lib/environment.ts`
- [ ] Create `src/lib/services/article.service.ts`
- [ ] Create `scripts/generate-mdx-from-db.ts`
- [ ] Update `package.json` scripts
- [ ] Update `/api/articles/publish` endpoint
- [ ] Create Vercel deploy hook
- [ ] Test publishing from localhost (should still work)
- [ ] Deploy to Vercel
- [ ] Test publishing from production (should save to MongoDB + rebuild)
- [ ] Wait for rebuild, verify article appears
- [ ] Commit and push

### Phase 3: Insights Enhancement (Day 4)
- [ ] Create `GuestHero.tsx` component
- [ ] Create `UserHero.tsx` component
- [ ] Update Insights page with conditional rendering
- [ ] Add user preferences API (`/api/user/preferences`)
- [ ] Add personalized recommendations
- [ ] Test as guest user
- [ ] Test as logged-in user
- [ ] Mobile optimization
- [ ] Commit and push

### Phase 4: Final Cleanup (Day 5)
- [ ] Delete old API routes (if fully deprecated)
```bash
rm src/app/api/articles/route.ts
rm -rf src/app/api/articles/[id]/
rm src/app/api/articles/search/route.ts
```
- [ ] Update documentation
- [ ] Add JSDoc comments to new code
- [ ] Run full test suite
- [ ] Final production deploy
- [ ] Monitor for 24 hours

---

## TESTING PLAN

### Localhost Testing
```bash
# 1. Test article publishing (should write MDX file)
# - Create new article in /admin/cms/new
# - Click "Publish to Site"
# - Verify MDX file created in src/posts/
# - Verify Git commit created
# - Check article appears on /insights

# 2. Test article editing
# - Edit existing article
# - Publish changes
# - Verify MDX file updated

# 3. Test unpublishing
# - Unpublish an article
# - Verify MDX file deleted
# - Verify article removed from /insights
```

### Production Testing (After Deploy)
```bash
# 1. Test article publishing (should save to MongoDB)
# - Login to production /admin/cms
# - Create new test article
# - Click "Publish to Site"
# - Verify success message says "Site is rebuilding..."
# - Wait 2-3 minutes for rebuild
# - Check article appears on /insights

# 2. Check MongoDB
# - Login to MongoDB Atlas
# - Verify article document exists
# - Check all fields populated correctly

# 3. Verify MDX generation
# - Check Vercel build logs
# - Look for "Generating MDX files from MongoDB..."
# - Verify MDX files created at build time
```

---

## ROLLBACK PLAN

If something goes wrong:

### Emergency Rollback (< 5 min)
```bash
# Revert last commit
git revert HEAD
git push origin main

# Vercel will auto-deploy previous version
# All MDX files in src/posts/ remain intact
```

### MongoDB Rollback
```bash
# MongoDB Atlas has point-in-time recovery
# Or restore from pre-migration backup
# Then rebuild site to regenerate MDX files
```

### Disable New Features
```typescript
// In article.service.ts
const ENABLE_DUAL_ENV = false; // Emergency kill switch

if (!ENABLE_DUAL_ENV) {
  // Fallback to old behavior
  return await publishArticleToMDX(data, slugId);
}
```

---

## SUCCESS METRICS

### Must Have ✅
- [ ] All 44 existing articles still accessible on `/insights`
- [ ] Publishing from localhost still works (MDX + Git)
- [ ] Publishing from production works (MongoDB + rebuild)
- [ ] No broken links or 404s
- [ ] No console errors on client or server
- [ ] Insights page loads in < 2 seconds

### Should Have 🎯
- [ ] Old API routes return 410 Gone
- [ ] Build script generates MDX files from MongoDB
- [ ] Vercel deploy hook triggers successfully
- [ ] Guest hero shows Joseph introduction
- [ ] Logged-in hero shows personalized welcome

### Nice to Have 🌟
- [ ] Personalized article recommendations
- [ ] User preferences saved to database
- [ ] Analytics tracking on article views
- [ ] Deployment status visible in UI

---

## FILE STRUCTURE AFTER CLEANUP

```
src/
├── app/
│   ├── insights/                          # Main insights page (dual-purpose)
│   │   ├── page.tsx                       # Guest + logged-in experience
│   │   └── [category]/[slugId]/page.tsx   # Individual article pages
│   ├── articles/
│   │   └── preview/page.tsx               # CMS preview (keep)
│   ├── admin/
│   │   └── cms/                           # CMS management (keep)
│   │       ├── page.tsx
│   │       ├── new/page.tsx
│   │       └── edit/[slugId]/page.tsx
│   ├── api/
│   │   └── articles/
│   │       ├── list/route.ts              # ✅ List published (keep)
│   │       ├── publish/route.ts           # ✅ Publish (updated)
│   │       ├── unpublish/route.ts         # ✅ Unpublish (updated)
│   │       ├── set-draft/route.ts         # ✅ Draft status (keep)
│   │       ├── ai-search/route.ts         # ✅ AI search (keep)
│   │       ├── topics/route.ts            # ✅ Topic cloud (keep)
│   │       ├── generate/route.ts          # ✅ AI generation (keep)
│   │       ├── load-published/route.ts    # ⚠️ Review
│   │       ├── published-status/route.ts  # ⚠️ Review
│   │       ├── regenerate-field/route.ts  # ⚠️ Review
│   │       ├── route.ts                   # ❌ DELETE (old MongoDB CRUD)
│   │       ├── [id]/route.ts              # ❌ DELETE (old MongoDB by ID)
│   │       └── search/route.ts            # ❌ DELETE (old MongoDB search)
│   └── components/
│       └── insights/
│           ├── GuestHero.tsx              # 🆕 Joseph introduction
│           ├── UserHero.tsx               # 🆕 Personalized welcome
│           ├── RecommendedArticles.tsx    # 🆕 User recommendations
│           └── ... (existing components)
├── lib/
│   ├── environment.ts                     # 🆕 Environment detection
│   ├── services/
│   │   └── article.service.ts             # 🆕 Unified article service
│   └── publishing-pipeline.ts             # ✏️ Updated for dual env
├── posts/                                 # MDX files (generated at build)
└── scripts/
    └── generate-mdx-from-db.ts            # 🆕 Build-time MDX generation
```

---

## ESTIMATED TIMELINE

| Phase | Tasks | Time | Days |
|-------|-------|------|------|
| **Phase 1: Cleanup** | Remove old routes, add deprecation | 2 hours | 0.5 |
| **Phase 2: Dual Env** | Service layer, build script, API updates | 8 hours | 1.5 |
| **Phase 3: Insights Enhancement** | Guest/user heroes, personalization | 6 hours | 1 |
| **Phase 4: Testing & Polish** | Full test suite, docs, deploy | 4 hours | 0.5 |
| **Buffer** | Unexpected issues | 4 hours | 0.5 |
| **TOTAL** | | **24 hours** | **4 days** |

**Recommended Schedule:**
- **Day 1**: Phase 1 (cleanup) + start Phase 2
- **Day 2**: Complete Phase 2 (dual environment)
- **Day 3**: Phase 3 (Insights enhancement)
- **Day 4**: Phase 4 (testing, polish, deploy)

---

## NEXT STEPS

1. ✅ Review this plan with team
2. ⏳ Get approval for cleanup (deleting old routes)
3. ⏳ Create Vercel deploy hook
4. ⏳ Backup MongoDB database
5. ⏳ Start Phase 1: Cleanup

Ready to start when you are! 🚀

---

**Status**: 📋 Planning Complete → Awaiting Approval
**Created**: March 7, 2026
**Last Updated**: March 7, 2026
