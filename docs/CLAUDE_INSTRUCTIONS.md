# Instructions for Claude Code

**Last Updated:** November 29, 2025

---

## 🤖 Core Responsibilities

When working on this codebase, you MUST maintain documentation alongside code changes.

---

## 📝 Documentation Update Requirements

### ALWAYS Update Docs When You:

#### 1. Add New Features
- **New API routes** → Update ARTICLES_CMS_COMPLETE.md or relevant API docs
- **New components** → Update FRONTEND_ARCHITECTURE.md with component details
- **New database models** → Update DATABASE_MODELS.md with schema
- **New pages** → Update FRONTEND_ARCHITECTURE.md with route info
- **New AI features** → Update AI_INTEGRATION.md or CLAUDE_CMS_INTEGRATION.md

#### 2. Modify Existing Features
- **Changed API endpoints** → Update endpoint documentation with new parameters/responses
- **Changed component props** → Update component documentation with new interface
- **Changed database schemas** → Update model documentation with new fields
- **Changed environment variables** → Update .env examples and Quick Start guides

#### 3. Remove Features
- **Delete obsolete API docs** - Don't leave outdated information
- **Remove deprecated component references** - Keep docs clean
- **Archive old patterns** - Move to archive folder if needed

#### 4. Fix Bugs
- **Add to troubleshooting sections** - Help others avoid same issues
- **Update workarounds** - Document solutions
- **Document gotchas** - Explain non-obvious behaviors

---

## 🔄 Documentation Workflow

### Step 1: Make Code Changes
- Implement the requested feature/fix
- Test thoroughly

### Step 2: Identify Affected Documentation
Ask yourself:
- Which documentation files cover this feature?
- What examples need updating?
- Are there new concepts to document?

### Step 3: Update ALL Relevant Docs
- Update documentation files identified in Step 2
- Keep code examples current with implementation
- Update "Last Updated: YYYY-MM-DD" timestamps
- Verify no secrets exposed (use placeholders!)

### Step 4: Verify Completeness
- Documentation matches actual implementation
- Code examples are tested (if possible)
- No broken cross-references
- Security check passed (no real secrets)

---

## 🗺️ Documentation Mapping

| Code Change | Update These Docs |
|-------------|-------------------|
| New API route | `ARTICLES_CMS_COMPLETE.md`, feature-specific docs |
| New React component | `FRONTEND_ARCHITECTURE.md`, component reference |
| New database model | `DATABASE_MODELS.md`, `MASTER_SYSTEM_ARCHITECTURE.md` |
| New environment variable | `docs/README.md`, `.env.example` |
| New AI integration | `AI_INTEGRATION.md`, `CLAUDE_CMS_INTEGRATION.md` |
| Performance optimization | `PERFORMANCE.md` |
| UI/UX changes | `FRONTEND_ARCHITECTURE.md`, `RESPONSIVE_DESIGN.md` |
| Theme changes | `THEME_IMPLEMENTATION_GUIDE.md` |
| Authentication changes | `AUTHENTICATION.md` |
| Map system changes | `MAP_SYSTEM.md` |
| Swipe system changes | `SWIPE_SYSTEM.md` |
| CMS changes | `ARTICLES_CMS_COMPLETE.md` |
| Article/blog system | `ARTICLES_CMS_COMPLETE.md` |

---

## ✅ Examples

### Example 1: Adding New API Route

**✅ Correct Workflow:**
1. Create `/api/users/route.ts` with GET endpoint
2. Open `ARTICLES_CMS_COMPLETE.md` (or create `API_REFERENCE.md`)
3. Add new section:
   ```markdown
   ### GET /api/users
   **List all users**

   **Query Parameters:**
   - `page` (number) - Page number
   - `limit` (number) - Results per page

   **Response:**
   ```json
   {
     "users": [...],
     "pagination": { "page": 1, "total": 100 }
   }
   ```
   ```
4. Update "Last Updated" timestamp
5. Test endpoint matches documentation

**❌ Incorrect Workflow:**
- Create route, commit, forget to update docs
- Add TODO comment "update docs later"
- Assume docs will auto-update

---

### Example 2: Changing Component Props

**✅ Correct Workflow:**
1. Update `ArticleCard.tsx` to add `showAuthor` prop
2. Find component documentation in `FRONTEND_ARCHITECTURE.md`
3. Update props interface:
   ```typescript
   interface ArticleCardProps {
     article: Article;
     showAuthor?: boolean; // NEW
   }
   ```
4. Update usage example to show new prop
5. Update "Last Updated" timestamp

**❌ Incorrect Workflow:**
- Change component but leave old props in docs
- Update code without checking documentation

---

### Example 3: Bug Fix with Workaround

**✅ Correct Workflow:**
1. Fix the MapLibre clustering bug
2. Open `MAP_SYSTEM.md`
3. Add to "Troubleshooting" or "Common Issues":
   ```markdown
   ### Clusters Not Updating After Filter
   **Issue:** Clusters don't refresh when filters change
   **Solution:** Call `map.getSource('listings').setData(newData)` after filter
   **File:** `src/app/components/Map.tsx:245`
   ```
4. Update "Last Updated" timestamp

**❌ Incorrect Workflow:**
- Fix bug silently
- Hope no one else encounters it

---

## 🚨 Security Requirements

### Before Committing ANY Documentation:

- [ ] **No real API keys** - Use `YOUR_API_KEY` placeholder
- [ ] **No real passwords** - Use `YOUR_PASSWORD` placeholder
- [ ] **No real database URIs** - Use `mongodb+srv://user:pass@cluster...`
- [ ] **No hardcoded secrets** - Always use `process.env.VAR_NAME`
- [ ] **No exposed credentials** - Check with grep before commit

### Safe Placeholders:
```bash
CLOUDINARY_CLOUD_NAME=YOUR_CLOUD_NAME
CLOUDINARY_API_KEY=YOUR_CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET=YOUR_CLOUDINARY_API_SECRET
ANTHROPIC_API_KEY=sk-ant-api03-...
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
VPS_PASSWORD=YOUR_VPS_PASSWORD
NEXTAUTH_SECRET=your-secret-here
```

---

## ✅ Quality Checklist

Before marking a task as complete:

- [ ] **Code implemented** - Feature/fix is working
- [ ] **Tests passing** - If applicable
- [ ] **Documentation updated** - ALL affected docs
- [ ] **Examples current** - Code snippets match implementation
- [ ] **No secrets exposed** - Security check passed
- [ ] **Timestamps updated** - "Last Updated" is current
- [ ] **Cross-references valid** - No broken links
- [ ] **User tested** - Verify user can follow docs

---

## 🚫 Dev Server Rules

### DO NOT Run Dev Server

**You should NEVER run `npm run dev` or start the development server.**

**Why:**
- User should control when server starts/stops
- Prevents accidental server kills
- Avoids port conflicts
- User knows when to test changes

**If user wants to test:**
- Tell them to run `npm run dev`
- Don't start it yourself

**If server needs restart:**
- Tell user "Please restart dev server to see changes"
- Don't kill and restart it yourself

---

## 📊 Documentation File Structure

```
docs/
├── README.md                           # Index and overview
├── CLAUDE_INSTRUCTIONS.md              # This file (your guide!)
├── platform/
│   └── MASTER_SYSTEM_ARCHITECTURE.md  # Complete system overview
├── FRONTEND_ARCHITECTURE.md            # Frontend patterns
├── DATABASE_MODELS.md                  # MongoDB schemas
├── AI_INTEGRATION.md                   # Groq chat integration
├── ARTICLES_CMS_COMPLETE.md            # Blog/CMS system (HUGE)
├── AUTHENTICATION.md                   # NextAuth setup
├── MAP_SYSTEM.md                       # MapLibre implementation
├── SWIPE_SYSTEM.md                     # Tinder-style discovery
├── PERFORMANCE.md                      # Optimizations
├── RESPONSIVE_DESIGN.md                # Mobile-first patterns
├── THEME_IMPLEMENTATION_GUIDE.md       # Dual theme system
└── [feature-specific docs]
```

---

## 🎯 Best Practices

1. **Update docs AS you code** - Don't defer
2. **Be specific** - Exact file paths, line numbers when relevant
3. **Include examples** - Show, don't just tell
4. **Test examples** - Verify code snippets work
5. **Think like a new developer** - Explain clearly
6. **Keep it current** - Remove outdated info
7. **Link related docs** - Help navigation
8. **Use consistent formatting** - Follow existing patterns

---

## 🔍 Common Mistakes to Avoid

❌ **Don't:**
- Update code without updating docs
- Leave TODO comments to update docs later
- Expose real secrets in examples
- Use outdated examples
- Forget "Last Updated" timestamps
- Start dev server without being asked
- Assume user knows implementation details

✅ **Do:**
- Update docs immediately with code changes
- Use placeholders for all secrets
- Test code examples when possible
- Update timestamps
- Let user control dev server
- Explain context and reasoning
- Think about future developers

---

## 📞 When in Doubt

If unsure about documentation:
1. **Ask the user** - "Should I document this in [FILE]?"
2. **Over-document** - Better too much than too little
3. **Follow existing patterns** - Look at similar docs
4. **Check security** - When in doubt, use placeholders

---

**Remember:** Good documentation is as important as good code. Future developers (and future you!) will thank you for keeping docs current and accurate.

---

**This file last updated:** November 29, 2025
**Next review:** February 28, 2026 (3 months)
