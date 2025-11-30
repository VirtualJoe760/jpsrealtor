# Instructions for Frontend Claude: Test Article Request System

**Date:** 2025-11-30
**Purpose:** Test the VPS Claude article writing system from the admin UI
**Location:** `/root/website-backup/jpsrealtor`

---

## 📋 Overview

The VPS Claude article request system is now fully set up and running. Your job is to test it from the frontend admin interface to ensure the complete workflow works end-to-end.

---

## 🎯 Your Tasks

### Task 1: Verify the Admin UI Has the Article Request Feature

1. **Navigate to the admin articles page:**
   ```bash
   # First, check if the admin page component exists
   cat src/app/admin/articles/page.tsx | grep -i "request.*article\|claude"
   ```

2. **Look for the "Request Article from Claude" button or similar UI element**

3. **If the UI doesn't exist, you'll need to add it.** Check the docs:
   ```bash
   cat docs/VPS_CLAUDE_BLOG_WORKFLOW.md | grep -A 30 "Frontend: Request Article Button"
   ```

### Task 2: Test Creating an Article Request via the Admin UI

**If the admin UI is ready:**

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/admin/articles`

3. Click "Request Article from Claude" (or equivalent button)

4. Fill in the form:
   - **Prompt:** "Write a comprehensive guide about investing in Palm Desert golf course homes. Include ROI analysis, lifestyle benefits, and current market trends."
   - **Category:** `market-insights`
   - **Keywords:** `palm desert golf, golf course homes, investment property, ROI`

5. Submit the request

6. Verify you see a success message

### Task 3: Monitor the Request Status

**Check MongoDB directly:**

```bash
# Run this script to see all pending/processing requests
node scripts/check-article-requests-simple.js
```

**Or check via the status checker:**

```bash
# Get the request ID from the admin UI response, then:
node scripts/check-request-status.js <REQUEST_ID>
```

**Watch the logs in real-time:**

```bash
tail -f /var/log/claude-article-writer.log
```

### Task 4: Verify the Article Was Created

**After 5-10 minutes, check:**

1. **Check MongoDB for completed status:**
   ```bash
   node scripts/check-request-status.js <REQUEST_ID>
   ```

   Should show:
   - Status: `completed`
   - resultFilePath: `src/posts/2025/[slug].mdx`
   - resultTitle: [Article title]

2. **Verify the MDX file was created:**
   ```bash
   ls -la src/posts/2025/*.mdx
   ```

3. **Read the generated article:**
   ```bash
   cat src/posts/2025/[slug].mdx
   ```

4. **Verify Git commit:**
   ```bash
   git log --oneline -5
   ```

   Should show a recent commit like:
   ```
   Draft article: [Article Title]
   ```

5. **Check if it was pushed to GitHub:**
   ```bash
   git status
   git log origin/main..HEAD
   ```

   Should show no unpushed commits (article should be on GitHub)

### Task 5: Review Article Quality

**Check that the article has:**

- [ ] Complete frontmatter (title, excerpt, date, category, tags, status, seo, author)
- [ ] Proper MDX structure
- [ ] Section headers with numbers and bold titles
- [ ] Emoji bullets (✅ 🏡 💡)
- [ ] Local keywords (Coachella Valley, Palm Desert, etc.)
- [ ] Action-oriented language
- [ ] Strong CTA with contact info
- [ ] Status: "draft" (not published)

**Review checklist:**

```bash
# View the article and check each item above
cat src/posts/2025/[slug].mdx | less
```

---

## 🔧 If the Admin UI Doesn't Exist Yet

You'll need to add the "Request Article" feature to the admin UI. Here's how:

### Step 1: Check Current Admin Articles Page

```bash
# Read the current admin articles page
cat src/app/admin/articles/page.tsx
```

### Step 2: Add the Request Article Button

Based on the documentation in `docs/VPS_CLAUDE_BLOG_WORKFLOW.md`, add:

1. **Import statements:**
   ```typescript
   import { Server, Sparkles } from 'lucide-react';
   ```

2. **State for modal:**
   ```typescript
   const [showRequestModal, setShowRequestModal] = useState(false);
   const [requestPrompt, setRequestPrompt] = useState('');
   const [requestCategory, setRequestCategory] = useState('articles');
   const [requestKeywords, setRequestKeywords] = useState('');
   ```

3. **Handler function:**
   ```typescript
   async function handleRequestArticle() {
     const response = await fetch('/api/vps/request-article', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         prompt: requestPrompt,
         category: requestCategory,
         keywords: requestKeywords.split(',').map(k => k.trim())
       })
     });

     const data = await response.json();

     if (data.success) {
       alert(`✅ Request submitted! ID: ${data.requestId}`);
       setShowRequestModal(false);
     } else {
       alert(`❌ Error: ${data.error}`);
     }
   }
   ```

4. **Button in the UI:**
   ```tsx
   <button
     onClick={() => setShowRequestModal(true)}
     className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
   >
     <Server className="w-5 h-5" />
     <Sparkles className="w-5 h-5" />
     Request Article from Claude VPS
   </button>
   ```

5. **Modal component:**
   ```tsx
   {showRequestModal && (
     <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
       <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-2xl w-full">
         <h2 className="text-2xl font-bold mb-4">Request Article from Claude</h2>

         <textarea
           value={requestPrompt}
           onChange={(e) => setRequestPrompt(e.target.value)}
           placeholder="Enter article topic and instructions..."
           rows={6}
           className="w-full p-3 border rounded-lg mb-4"
         />

         <select
           value={requestCategory}
           onChange={(e) => setRequestCategory(e.target.value)}
           className="w-full p-3 border rounded-lg mb-4"
         >
           <option value="articles">Articles</option>
           <option value="market-insights">Market Insights</option>
           <option value="real-estate-tips">Real Estate Tips</option>
         </select>

         <input
           type="text"
           value={requestKeywords}
           onChange={(e) => setRequestKeywords(e.target.value)}
           placeholder="Keywords (comma-separated)"
           className="w-full p-3 border rounded-lg mb-4"
         />

         <div className="flex gap-2">
           <button
             onClick={() => setShowRequestModal(false)}
             className="px-4 py-2 border rounded-lg"
           >
             Cancel
           </button>
           <button
             onClick={handleRequestArticle}
             className="px-4 py-2 bg-purple-600 text-white rounded-lg"
           >
             Submit Request
           </button>
         </div>
       </div>
     </div>
   )}
   ```

### Step 3: Test the New UI

1. Save the changes
2. Restart the dev server
3. Go to `/admin/articles`
4. Click the "Request Article from Claude VPS" button
5. Fill in the form and submit
6. Verify the request was created in MongoDB

---

## 🧪 Alternative: Test via Script (No UI Required)

If you want to skip the UI and test the system directly:

```bash
# Create a test request
node scripts/create-test-article-request.js

# Monitor the logs
tail -f /var/log/claude-article-writer.log

# Check status (replace with actual request ID)
node scripts/check-request-status.js <REQUEST_ID>

# Wait 5-10 minutes, then check if article was created
ls -la src/posts/2025/

# Read the generated article
cat src/posts/2025/*.mdx | tail -100
```

---

## 📊 Expected Timeline

| Time | Event |
|------|-------|
| 0:00 | Submit request via UI or script |
| 0:00-5:00 | Request sits as "pending" in MongoDB |
| 5:00 | Cron job picks up request, status → "processing" |
| 5:00-10:00 | Claude reads docs, reviews articles, writes MDX |
| 10:00-12:00 | Claude commits to Git and pushes to GitHub |
| 12:00 | Status → "completed", article ready for review |

---

## ✅ Success Criteria

Your test is successful if:

1. [ ] Request was created in MongoDB with status "pending"
2. [ ] Cron job picked up the request (status → "processing")
3. [ ] Article MDX file was created in `src/posts/2025/[slug].mdx`
4. [ ] Article has proper frontmatter and follows style guide
5. [ ] Git commit was created with proper message
6. [ ] Article was pushed to GitHub
7. [ ] MongoDB status updated to "completed"
8. [ ] Article appears in admin CMS as draft

---

## 🚨 Troubleshooting

### Issue: Request stuck in "pending"

**Check:**
```bash
# Is the cron job running?
crontab -l | grep check-article-requests

# Check cron logs
tail -f /var/log/claude-article-writer.log

# Manually trigger the polling service
node scripts/check-article-requests-simple.js
```

### Issue: Request stuck in "processing"

**Check:**
```bash
# Look for Claude Code process
ps aux | grep claude

# Check Claude logs
ls -la /tmp/claude-*.log
tail -f /tmp/claude-*.log
```

### Issue: Article not created

**Check:**
```bash
# Did Claude encounter an error?
node scripts/check-request-status.js <REQUEST_ID>

# Check if MongoDB connection is working
node scripts/test-article-request-api.js
```

### Issue: Article not pushed to GitHub

**Check:**
```bash
# Is there an unpushed commit?
git status
git log origin/main..HEAD

# Try pushing manually
git push origin main

# Check Git credentials
git config --list | grep user
```

---

## 📝 Report Your Results

After testing, please report:

1. **Did the UI work?** (Yes/No, or "Added new UI")
2. **Request ID:** [ID from MongoDB]
3. **Time to completion:** [Duration in minutes]
4. **Article file path:** [Path to generated MDX]
5. **Article quality:** [Brief review - Good/Needs improvement]
6. **Issues encountered:** [List any problems]
7. **Final status:** [Success/Partial/Failed]

---

## 🎯 Example Test Flow

```bash
# 1. Create test request
node scripts/create-test-article-request.js
# Output: Request ID: 692bfce96da8677301eb3e09

# 2. Monitor logs (in separate terminal)
tail -f /var/log/claude-article-writer.log

# 3. Check status every minute
watch -n 60 'node scripts/check-request-status.js 692bfce96da8677301eb3e09'

# 4. When completed, view the article
cat src/posts/2025/*.mdx | tail -200

# 5. Verify it's on GitHub
git log --oneline -3
git status
```

---

## 📚 Reference Documentation

- **Main Instructions:** `docs/FOR_VPS_CLAUDE.md`
- **Style Guide:** `docs/VPS_CLAUDE_CONTENT_WRITER.md`
- **Workflow:** `docs/VPS_CLAUDE_BLOG_WORKFLOW.md`
- **Implementation:** `docs/IMPLEMENTATION_SUMMARY.md`

---

## 🎉 Good Luck!

The system is fully configured and ready to test. Claude on the VPS is standing by, waiting for your article request!

Remember: The cron job runs every 5 minutes, so there may be a short wait before your request is picked up.

---

**Last Updated:** 2025-11-30
**Status:** Production Ready
**System:** VPS Claude Article Writer v1.0
