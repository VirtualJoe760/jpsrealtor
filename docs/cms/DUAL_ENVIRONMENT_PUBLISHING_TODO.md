# Dual-Environment Publishing Implementation Plan

**Goal**: Enable article publishing from both localhost AND production environments
**Approach**: Database-First with Build Hook (Option 1)
**Estimated Timeline**: 4-6 hours development + 2 hours testing
**Status**: Planning Phase

---

## Phase 1: Environment Setup & Infrastructure (30 min)

### 1.1 Environment Variables
- [ ] Add `VERCEL_DEPLOY_HOOK_URL` to `.env.local`
- [ ] Create Vercel deploy hook in Vercel dashboard
  - Go to Project Settings → Git → Deploy Hooks
  - Create hook: "CMS Article Publish"
  - Copy webhook URL
- [ ] Add `VERCEL_DEPLOY_HOOK_URL` to Vercel environment variables
- [ ] Test webhook with curl:
  ```bash
  curl -X POST $VERCEL_DEPLOY_HOOK_URL
  ```

### 1.2 Environment Detection Utility
- [ ] Create `src/lib/environment.ts`:
  ```typescript
  export const IS_PRODUCTION = process.env.VERCEL === '1';
  export const IS_LOCALHOST = !IS_PRODUCTION;
  export const DEPLOY_HOOK_URL = process.env.VERCEL_DEPLOY_HOOK_URL;
  ```

---

## Phase 2: Database Layer Updates (45 min)

### 2.1 Verify Article Model
- [ ] Review `src/models/article.ts` schema
- [ ] Confirm all fields match `ArticleFormData` interface
- [ ] Add any missing fields:
  - [ ] `draft: boolean`
  - [ ] `authorId: string`
  - [ ] `authorName: string`
- [ ] Test MongoDB connection

### 2.2 Article Service Layer
- [ ] Create `src/lib/services/article.service.ts`:
  ```typescript
  // CRUD operations for MongoDB Article model
  - createArticle(data: ArticleFormData): Promise<Article>
  - updateArticle(id: string, data: Partial<ArticleFormData>): Promise<Article>
  - deleteArticle(id: string): Promise<void>
  - getArticleById(id: string): Promise<Article | null>
  - getArticleBySlug(slug: string): Promise<Article | null>
  - listArticles(filters: ArticleFilters): Promise<Article[]>
  - publishArticle(id: string): Promise<Article>
  - unpublishArticle(id: string): Promise<Article>
  - setDraftStatus(id: string, draft: boolean): Promise<Article>
  ```

### 2.3 Add Helper Methods
- [ ] `convertFormDataToMongoDoc()` - Transform ArticleFormData to MongoDB schema
- [ ] `convertMongoDocToFormData()` - Transform MongoDB doc to ArticleFormData
- [ ] `generateSlugFromTitle()` - Create URL-safe slug

---

## Phase 3: Publishing Pipeline Refactor (60 min)

### 3.1 Update `src/lib/publishing-pipeline.ts`

#### 3.1.1 Add Database Publishing
- [ ] Create `publishArticleToDatabase()` function:
  ```typescript
  export async function publishArticleToDatabase(
    article: ArticleFormData,
    slugId: string
  ): Promise<{ _id: string }> {
    // Save to MongoDB
    // Return document ID
  }
  ```

#### 3.1.2 Add Deploy Hook Trigger
- [ ] Create `triggerVercelRebuild()` function:
  ```typescript
  export async function triggerVercelRebuild(
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    // POST to VERCEL_DEPLOY_HOOK_URL
    // Return deployment status
  }
  ```

#### 3.1.3 Update Main `publishArticle()` Function
- [ ] Add environment detection
- [ ] Create branching logic:
  ```typescript
  if (IS_PRODUCTION) {
    // Save to MongoDB
    await publishArticleToDatabase(article, slugId);
    // Trigger Vercel rebuild
    await triggerVercelRebuild(`Article: ${article.title}`);
  } else {
    // Keep existing filesystem + git workflow
    await writeArticleToFilesystem(article, slugId);
    await deployToProduction(article, slugId);
  }
  ```

#### 3.1.4 Update `unpublishArticle()` Function
- [ ] Add environment detection
- [ ] Branch for production vs localhost
- [ ] Delete from MongoDB in production
- [ ] Delete MDX file in localhost

#### 3.1.5 Create `updateArticle()` Function
- [ ] New function for editing published articles
- [ ] Environment-aware (DB vs filesystem)

---

## Phase 4: API Endpoints Updates (45 min)

### 4.1 Update `/api/articles/publish/route.ts`
- [ ] Import environment utilities
- [ ] Update response to include deployment status:
  ```typescript
  if (IS_PRODUCTION) {
    return NextResponse.json({
      success: true,
      message: 'Article saved! Rebuilding site...',
      deploying: true,
      estimatedTime: '2-3 minutes'
    });
  } else {
    // Existing response
  }
  ```

### 4.2 Update `/api/articles/unpublish/route.ts`
- [ ] Import `unpublishArticle()` with new logic
- [ ] Handle database deletion
- [ ] Test both environments

### 4.3 Create `/api/articles/publish-status/route.ts` (NEW)
- [ ] Check deployment status
- [ ] Return whether article is live
- [ ] Poll this endpoint after publishing in production

### 4.4 Update `/api/articles/list/route.ts`
- [ ] Add fallback to MongoDB if MDX file not found
- [ ] Maintain agent scoping logic
- [ ] Cache results for performance

### 4.5 Create `/api/articles/sync/route.ts` (NEW)
- [ ] Admin-only endpoint
- [ ] Sync MongoDB articles to MDX files
- [ ] Useful for manual syncs

---

## Phase 5: Build-Time MDX Generation (60 min)

### 5.1 Create Build Script
- [ ] Create `scripts/generate-mdx-from-db.ts`:
  ```typescript
  // Connect to MongoDB
  // Fetch all published articles
  // Generate MDX files in src/posts/
  // Write to filesystem
  ```

### 5.2 Update Build Process
- [ ] Update `package.json` scripts:
  ```json
  "prebuild": "tsx scripts/generate-mdx-from-db.ts",
  "build": "next build"
  ```
- [ ] Test locally: `npm run build`

### 5.3 Vercel Build Configuration
- [ ] Create/update `vercel.json`:
  ```json
  {
    "buildCommand": "npm run prebuild && npm run build",
    "env": {
      "MONGODB_URI": "@mongodb-uri"
    }
  }
  ```

---

## Phase 6: Frontend Updates (30 min)

### 6.1 Update CMS Publish Button
- [ ] Update publish handler in CMS components
- [ ] Show deployment status message
- [ ] Add loading states:
  - "Publishing..."
  - "Deploying..." (production only)
  - "Live!" (success)

### 6.2 Add Deployment Status Polling
- [ ] Create `useDeploymentStatus()` hook
- [ ] Poll `/api/articles/publish-status` every 5 seconds
- [ ] Show progress indicator
- [ ] Auto-refresh article list when done

### 6.3 Update Article List Refresh
- [ ] Ensure `refetch()` works after publishing
- [ ] Clear any caches
- [ ] Show "Pending deployment" badge if in production

---

## Phase 7: Data Migration (45 min)

### 7.1 Create Migration Script
- [ ] Create `scripts/migrate-mdx-to-mongodb.ts`:
  ```typescript
  // Read all src/posts/*.mdx files
  // Parse frontmatter
  // Create MongoDB documents
  // Handle duplicates
  // Validate all migrations
  ```

### 7.2 Run Migration
- [ ] Backup MongoDB database
- [ ] Run migration script
- [ ] Verify all 44 articles migrated:
  ```bash
  tsx scripts/migrate-mdx-to-mongodb.ts
  ```

### 7.3 Validation
- [ ] Check MongoDB Atlas - verify 44 articles
- [ ] Test `/api/articles/list` - should return all articles
- [ ] Test one article on `/insights` page
- [ ] Verify agent scoping works (check authorId)

---

## Phase 8: Testing (60 min)

### 8.1 Localhost Testing
- [ ] Test publishing new article:
  - Should write MDX file
  - Should git commit
  - Should git push
- [ ] Test unpublishing:
  - Should delete MDX file
  - Should git commit
- [ ] Test editing published article
- [ ] Verify `/insights` pages load correctly

### 8.2 Production Testing (Deploy to Vercel)
- [ ] Deploy changes to Vercel
- [ ] Test publishing from production:
  - Should save to MongoDB
  - Should trigger deploy hook
  - Wait for rebuild (~2-3 min)
  - Verify article appears on live site
- [ ] Test unpublishing from production
- [ ] Test editing from production
- [ ] Test agent scoping (login as agent, verify only see own articles)

### 8.3 Edge Cases
- [ ] Test publishing same article from localhost then production
- [ ] Test concurrent publishes
- [ ] Test with very long titles/content
- [ ] Test with special characters in slugs
- [ ] Test draft vs published status
- [ ] Test missing featured images

### 8.4 Performance Testing
- [ ] Measure page load times on `/insights`
- [ ] Check MongoDB query performance
- [ ] Verify ISR/caching working
- [ ] Test with 50+ articles (simulate growth)

---

## Phase 9: Monitoring & Logging (30 min)

### 9.1 Add Logging
- [ ] Add detailed logs to publishing pipeline:
  ```typescript
  console.log('[PUBLISH] Environment:', IS_PRODUCTION ? 'PROD' : 'LOCAL');
  console.log('[PUBLISH] Article:', slugId);
  console.log('[PUBLISH] Method:', IS_PRODUCTION ? 'DB' : 'FS');
  ```
- [ ] Log deploy hook responses
- [ ] Log MongoDB operations

### 9.2 Error Handling
- [ ] Wrap all async operations in try-catch
- [ ] Return user-friendly error messages
- [ ] Log errors to console (visible in Vercel logs)
- [ ] Add Sentry/error tracking (optional)

### 9.3 Add Health Check Endpoint
- [ ] Create `/api/articles/health/route.ts`:
  ```typescript
  // Check MongoDB connection
  // Check deploy hook configured
  // Return system status
  ```

---

## Phase 10: Documentation (30 min)

### 10.1 Update README
- [ ] Add section on article publishing
- [ ] Document environment variables
- [ ] Explain dual-environment approach
- [ ] Add troubleshooting section

### 10.2 Create Developer Docs
- [ ] Create `docs/cms/PUBLISHING_ARCHITECTURE.md`:
  - Data flow diagrams
  - Environment detection logic
  - MongoDB schema
  - API endpoints reference

### 10.3 Create User Guide
- [ ] Create `docs/cms/PUBLISHING_USER_GUIDE.md`:
  - How to publish from localhost
  - How to publish from production
  - Expected wait times
  - What to do if something goes wrong

### 10.4 Update Code Comments
- [ ] Add JSDoc comments to all new functions
- [ ] Document environment-specific behavior
- [ ] Add examples to complex functions

---

## Phase 11: Cleanup & Optimization (30 min)

### 11.1 Remove Unused Code
- [ ] Remove old MongoDB CRUD APIs if not needed:
  - `/api/articles/route.ts` (if redundant)
  - `/api/articles/[id]/route.ts` (if redundant)
- [ ] Clean up commented code
- [ ] Remove debug console.logs

### 11.2 Code Organization
- [ ] Ensure consistent naming conventions
- [ ] Group related functions
- [ ] Extract reusable utilities

### 11.3 Performance Optimization
- [ ] Add database indexes for common queries
- [ ] Implement query result caching
- [ ] Optimize MDX file generation (parallel processing)
- [ ] Minimize deploy hook calls

---

## Phase 12: Final Verification (30 min)

### 12.1 Comprehensive Test Suite
- [ ] Create test checklist:
  ```
  Localhost:
  ✓ Publish new article
  ✓ Edit published article
  ✓ Unpublish article
  ✓ Toggle draft status
  ✓ View on /insights
  ✓ Git history shows commits

  Production:
  ✓ Publish new article
  ✓ Deploy hook triggered
  ✓ Article appears after rebuild
  ✓ Edit published article
  ✓ Unpublish article
  ✓ Agent scoping works
  ✓ Draft articles hidden
  ```

### 12.2 Agent Testing
- [ ] Login as agent user
- [ ] Publish article from production
- [ ] Verify only agent's articles visible
- [ ] Test all CRUD operations

### 12.3 Admin Testing
- [ ] Login as admin
- [ ] Verify can see all articles
- [ ] Test bulk operations (if any)
- [ ] Test migration tools

---

## Success Criteria

### Must Have ✅
- [ ] Articles can be published from localhost (existing flow works)
- [ ] Articles can be published from production (new flow works)
- [ ] All 44 existing articles migrated to MongoDB
- [ ] Published articles appear on `/insights` pages
- [ ] Agent scoping works correctly
- [ ] No data loss during migration
- [ ] Vercel deploy hook triggers successfully

### Should Have 🎯
- [ ] Deployment status visible in UI
- [ ] Error messages are clear and actionable
- [ ] Performance is acceptable (<2s page loads)
- [ ] Logging is comprehensive
- [ ] Documentation is complete

### Nice to Have 🌟
- [ ] Real-time deployment progress updates
- [ ] Rollback capability
- [ ] Article version history
- [ ] Scheduled publishing
- [ ] Analytics tracking

---

## Rollback Plan

If something goes wrong:

### Immediate Rollback (< 5 min)
1. Revert Git commits:
   ```bash
   git revert HEAD
   git push origin main
   ```
2. Vercel will auto-deploy previous version
3. MDX files in `src/posts/` remain intact

### Database Rollback
1. MongoDB Atlas has point-in-time recovery
2. Or restore from pre-migration backup
3. Rebuild site to regenerate MDX files

### Emergency Hotfix
1. Disable production publishing:
   ```typescript
   // In publish route
   if (IS_PRODUCTION) {
     return NextResponse.json({ error: 'Publishing temporarily disabled' });
   }
   ```
2. Fix issues
3. Re-enable after testing

---

## Post-Implementation Tasks

### Week 1
- [ ] Monitor Vercel logs for errors
- [ ] Check MongoDB query performance
- [ ] Gather user feedback
- [ ] Fix any bugs found

### Week 2
- [ ] Optimize build times if needed
- [ ] Add missing features
- [ ] Update documentation based on feedback

### Month 1
- [ ] Review analytics
- [ ] Plan next improvements:
  - Scheduled publishing
  - Article versioning
  - Collaborative editing
  - Rich media support

---

## Resources & References

### Documentation
- Next.js ISR: https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration
- Vercel Deploy Hooks: https://vercel.com/docs/concepts/git/deploy-hooks
- MongoDB Atlas: https://docs.atlas.mongodb.com/

### Code References
- Article Model: `src/models/article.ts`
- Publishing Pipeline: `src/lib/publishing-pipeline.ts`
- MDX Processor: `src/lib/mdx-processor.ts`
- CMS Page: `src/app/agent/cms/page.tsx`

### Environment Variables
```bash
# Required
MONGODB_URI=mongodb+srv://...
VERCEL_DEPLOY_HOOK_URL=https://api.vercel.com/v1/integrations/deploy/...

# Optional
NODE_ENV=development|production
VERCEL=1  # Auto-set by Vercel
```

---

## Timeline Summary

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Environment Setup | 30 min | ⏳ Pending |
| 2 | Database Updates | 45 min | ⏳ Pending |
| 3 | Publishing Refactor | 60 min | ⏳ Pending |
| 4 | API Updates | 45 min | ⏳ Pending |
| 5 | Build Script | 60 min | ⏳ Pending |
| 6 | Frontend Updates | 30 min | ⏳ Pending |
| 7 | Data Migration | 45 min | ⏳ Pending |
| 8 | Testing | 60 min | ⏳ Pending |
| 9 | Monitoring | 30 min | ⏳ Pending |
| 10 | Documentation | 30 min | ⏳ Pending |
| 11 | Cleanup | 30 min | ⏳ Pending |
| 12 | Verification | 30 min | ⏳ Pending |
| **TOTAL** | | **8 hours** | |

**Plus buffer time**: 2 hours for unexpected issues
**Total estimated**: **10 hours** (1-2 days of focused work)

---

## Next Steps

1. **Review this plan** - Make sure it covers everything
2. **Get Vercel deploy hook** - Create in dashboard
3. **Start with Phase 1** - Environment setup
4. **Commit after each phase** - Atomic changes for easy rollback
5. **Test frequently** - Don't wait until the end

---

**Created**: February 6, 2026
**Last Updated**: February 6, 2026
**Status**: 📋 Planning Complete → Ready for Implementation
