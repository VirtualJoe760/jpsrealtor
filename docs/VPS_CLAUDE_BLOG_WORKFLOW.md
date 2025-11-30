# VPS Claude Code Blog Writing Workflow

**Last Updated:** January 29, 2025

---

## Overview

This system allows you to request blog posts from Claude Code running on your VPS. The workflow is simple:

1. **You**: Send a message/request from admin panel → "Write a blog post about X"
2. **Claude**: Writes the article in MDX format
3. **Claude**: Pushes it to GitHub as a draft
4. **You**: Get a toast notification when it's ready
5. **You**: Review the MDX file in admin CMS and publish

**No API costs. No copy-paste. Fully automated.**

---

## How It Works

### Architecture

```
Admin CMS (/admin/articles)
    ↓ Click "Request Article from Claude"
    ↓ Enter prompt: "Write about Palm Desert golf communities"
    ↓
API Endpoint (/api/vps/request-article)
    ↓ Creates job in queue/database
    ↓
VPS Polling Service (runs every 5 min)
    ↓ Checks for new article requests
    ↓ Launches Claude Code with instructions
    ↓
Claude Code Session on VPS
    ├── Reads style guide (docs/VPS_CLAUDE_CONTENT_WRITER.md)
    ├── Reviews existing articles for tone/style
    ├── Writes new MDX article
    ├── Saves to src/posts/[year]/[slug].mdx
    ├── git add, commit, push to GitHub
    └── Updates job status to "completed"
    ↓
GitHub Repository
    ↓ New commit with draft article
    ↓
Admin Panel (polling or webhook)
    ↓ Detects new draft article
    ↓
Toast Notification
    └── "✨ New draft ready: Palm Desert Golf Communities"
        [View Article] [Dismiss]
```

---

## User Workflow

### Step 1: Request Article

1. Navigate to `/admin/articles`
2. Click **"Request Article from Claude"** button
3. Modal appears with prompt textarea

### Step 2: Enter Instructions

**Example Prompts:**

```
Write a comprehensive guide to Palm Desert golf communities as
investment properties. Focus on ROI, luxury amenities, and current
market trends. Target keywords: palm desert golf, golf community
investment, ROI. Category: market-insights
```

```
Create a first-time homebuyer guide for the Coachella Valley.
Include financing tips, neighborhood recommendations, and common
pitfalls to avoid. Make it actionable with checklists.
Category: real-estate-tips
```

```
Write a market analysis for La Quinta luxury real estate Q1 2025.
Include average prices, inventory levels, days on market stats.
Category: market-insights
```

### Step 3: Submit Request

- Click **"Submit Request"**
- Modal closes
- Request is queued on VPS
- You see confirmation: "Article request submitted. You'll be notified when ready."

### Step 4: Claude Works in Background

**What Claude does (automatically):**

1. ✅ Reads your style guide from docs
2. ✅ Reviews 3-5 existing articles to learn your tone
3. ✅ Drafts article in MDX format with frontmatter
4. ✅ Saves to `src/posts/2025/article-slug.mdx`
5. ✅ Creates Git commit with structured message
6. ✅ Pushes to GitHub main branch
7. ✅ Updates request status to "completed"

**Time:** 2-5 minutes (depending on article length)

### Step 5: Get Notified

When Claude finishes and pushes to GitHub:

**Toast Notification Appears:**
```
┌─────────────────────────────────────────────────┐
│ ✨ New Draft Article Ready!                     │
│                                                  │
│ "Palm Desert Golf Communities: Investment Guide"│
│                                                  │
│ Category: market-insights                       │
│ Created: Just now                               │
│                                                  │
│ [View Article]  [Dismiss]                      │
└─────────────────────────────────────────────────┘
```

- Auto-dismisses after 30 seconds
- Optional sound notification
- Click "View Article" to jump to draft in CMS

### Step 6: Review and Publish

1. Click "View Article" in notification
2. Review MDX content in CMS
3. **Check:**
   - Title and excerpt
   - Content quality and tone
   - SEO metadata
   - Category and tags
4. **Add:**
   - Featured image (upload to Cloudinary)
   - Additional images if needed
5. **Publish:**
   - Change status from "draft" to "published"
   - Click "Save"

**Total time: 5-10 minutes (just review and image selection)**

---

## Technical Implementation

### Frontend: Request Article Button

**Location:** `src/app/admin/articles/page.tsx`

```tsx
<button
  onClick={handleRequestArticle}
  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
>
  <Server className="w-5 h-5" />
  <Sparkles className="w-5 h-5" />
  Request Article from Claude
</button>
```

**Modal Component:**

```tsx
<Modal isOpen={showModal} onClose={() => setShowModal(false)}>
  <h2>Request Article from Claude</h2>
  <p>Claude will write, commit, and push a draft article to GitHub.</p>

  <textarea
    value={prompt}
    onChange={(e) => setPrompt(e.target.value)}
    placeholder="Enter article topic and instructions..."
    rows={6}
    className="w-full p-3 border rounded-lg"
  />

  <select value={category} onChange={(e) => setCategory(e.target.value)}>
    <option value="articles">Articles</option>
    <option value="market-insights">Market Insights</option>
    <option value="real-estate-tips">Real Estate Tips</option>
  </select>

  <div className="flex gap-2">
    <button onClick={handleCancel}>Cancel</button>
    <button onClick={handleSubmit}>Submit Request</button>
  </div>
</Modal>
```

### API Endpoint: Submit Request

**Location:** `src/app/api/vps/request-article/route.ts`

```typescript
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { prompt, category, keywords } = await request.json();

  // Create article request in database
  const articleRequest = await ArticleRequest.create({
    prompt,
    category,
    keywords,
    status: "pending",
    requestedBy: session.user.id,
    requestedAt: new Date()
  });

  return NextResponse.json({
    success: true,
    requestId: articleRequest._id,
    message: "Article request submitted. You'll be notified when ready."
  });
}

// GET endpoint to fetch pending/completed requests
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const requests = await ArticleRequest.find()
    .sort({ requestedAt: -1 })
    .limit(20);

  return NextResponse.json({ requests });
}
```

### VPS: Polling Service

**Location:** VPS cron job or background service

**Cron Job (runs every 5 minutes):**

```bash
# /etc/cron.d/claude-article-writer
*/5 * * * * root /usr/local/bin/claude-article-writer.sh >> /var/log/claude-article-writer.log 2>&1
```

**Script:** `/usr/local/bin/claude-article-writer.sh`

```bash
#!/bin/bash

# Load environment
source /root/.bashrc
cd /root/jpsrealtor

# Check for pending article requests
node scripts/check-article-requests.js
```

**Script:** `scripts/check-article-requests.js`

```javascript
const mongoose = require('mongoose');
const { exec } = require('child_process');
const ArticleRequest = require('../src/models/articleRequest');

async function checkPendingRequests() {
  await mongoose.connect(process.env.MONGODB_URI);

  // Find pending requests
  const pending = await ArticleRequest.find({ status: 'pending' })
    .sort({ requestedAt: 1 }) // Oldest first
    .limit(1);

  if (pending.length === 0) {
    console.log('No pending article requests');
    return;
  }

  const request = pending[0];

  // Update status to "processing"
  request.status = 'processing';
  request.startedAt = new Date();
  await request.save();

  console.log(`Processing request: ${request._id}`);
  console.log(`Prompt: ${request.prompt}`);

  // Launch Claude Code
  const claudePrompt = `
You are a professional real estate content writer for jpsrealtor.com.

TASK: ${request.prompt}

REQUIREMENTS:
1. Read the style guide: cat docs/VPS_CLAUDE_CONTENT_WRITER.md
2. Review 3-5 existing articles to learn the tone
3. Write a comprehensive MDX article with frontmatter
4. Save to src/posts/${new Date().getFullYear()}/[slug].mdx
5. Include proper frontmatter:
   - title, excerpt, date, category: "${request.category}"
   - tags, status: "draft", featuredImage (placeholder)
   - seo metadata, author info
6. Commit and push to GitHub:
   git add src/posts/...
   git commit -m "Draft article: [title]"
   git push origin main
7. When done, update the article request status to "completed" in MongoDB

Category: ${request.category}
Keywords: ${request.keywords?.join(', ')}

START NOW.
`;

  const promptFile = `/tmp/claude-prompt-${request._id}.txt`;
  require('fs').writeFileSync(promptFile, claudePrompt);

  // Execute Claude Code
  exec(`nohup claude --prompt "$(cat ${promptFile})" > /tmp/claude-${request._id}.log 2>&1 &`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Error launching Claude: ${error}`);
        request.status = 'failed';
        request.error = error.message;
        request.save();
      } else {
        console.log(`Claude session started for request ${request._id}`);
      }
    }
  );

  await mongoose.disconnect();
}

checkPendingRequests().catch(console.error);
```

### VPS: Claude's Workflow

**What Claude does when launched:**

```bash
# 1. Read style guide
cat docs/VPS_CLAUDE_CONTENT_WRITER.md

# 2. Review existing articles
ls src/posts/2024/*.mdx | head -5 | xargs cat

# 3. Draft article
cat > src/posts/2025/palm-desert-golf-investment.mdx << 'EOF'
---
title: "Palm Desert Golf Communities: The Ultimate Investment Guide"
excerpt: "Discover why Palm Desert golf communities offer exceptional ROI..."
date: "2025-01-29"
category: "market-insights"
tags: ["palm desert", "golf communities", "investment", "ROI"]
status: "draft"
featured: false
featuredImage:
  url: "/images/articles/placeholder-golf.jpg"
  alt: "Palm Desert golf course with mountain views"
seo:
  title: "Palm Desert Golf Communities Investment Guide | Joseph Sardella"
  description: "Complete analysis of ROI and lifestyle benefits..."
  keywords: ["palm desert golf", "golf community investment", "ROI"]
author:
  name: "Joseph Sardella"
  email: "josephsardella@gmail.com"
---

# Palm Desert Golf Communities: The Ultimate Investment Guide

[Full article content in MDX format]
EOF

# 4. Git workflow
git add src/posts/2025/palm-desert-golf-investment.mdx

git commit -m "Draft article: Palm Desert Golf Communities Investment Guide

Category: market-insights
Status: draft
AI-generated via VPS Claude Code

Investment guide covering ROI, amenities, and market trends for
Palm Desert golf communities. Target keywords: palm desert golf,
golf community investment, ROI.

Ready for review in admin CMS.
"

git push origin main

# 5. Update request status
node -e "
const mongoose = require('mongoose');
const ArticleRequest = require('./src/models/articleRequest');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await ArticleRequest.findByIdAndUpdate('$REQUEST_ID', {
    status: 'completed',
    completedAt: new Date(),
    resultFilePath: 'src/posts/2025/palm-desert-golf-investment.mdx'
  });
  await mongoose.disconnect();
})();
"
```

### Notification System

#### Option 1: Polling (Simple)

**Admin panel polls for new drafts:**

```typescript
// In admin articles page
useEffect(() => {
  const interval = setInterval(async () => {
    const response = await fetch('/api/articles/check-new-drafts');
    const { newDrafts } = await response.json();

    newDrafts.forEach(draft => {
      toast.success(
        <div>
          <p className="font-bold">✨ New Draft Article Ready!</p>
          <p>{draft.title}</p>
          <p className="text-sm text-gray-500">Category: {draft.category}</p>
          <button onClick={() => router.push(`/admin/articles/${draft.slug}`)}>
            View Article
          </button>
        </div>,
        { duration: 30000 }
      );
    });
  }, 30000); // Check every 30 seconds

  return () => clearInterval(interval);
}, []);
```

#### Option 2: GitHub Webhooks (Advanced)

**Setup webhook in GitHub repo:**

```
Webhook URL: https://jpsrealtor.com/api/webhooks/github
Events: Push events
```

**API Handler:** `src/app/api/webhooks/github/route.ts`

```typescript
export async function POST(request: Request) {
  const payload = await request.json();

  // Verify GitHub signature
  const signature = request.headers.get('x-hub-signature-256');
  if (!verifyGitHubSignature(payload, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Check if commit is a draft article
  const commits = payload.commits || [];

  for (const commit of commits) {
    if (commit.message.startsWith('Draft article:')) {
      // Parse article info from commit
      const titleMatch = commit.message.match(/Draft article: (.+)/);
      const title = titleMatch?.[1]?.split('\n')[0];

      const addedFiles = commit.added || [];
      const articleFile = addedFiles.find(f => f.startsWith('src/posts/'));

      if (articleFile && title) {
        // Broadcast notification to active admin sessions
        await broadcastNotification({
          type: 'new_draft_article',
          title,
          filePath: articleFile,
          timestamp: new Date()
        });
      }
    }
  }

  return NextResponse.json({ success: true });
}
```

#### Option 3: Server-Sent Events (Real-time)

**Admin panel subscribes to SSE:**

```typescript
useEffect(() => {
  const eventSource = new EventSource('/api/notifications/stream');

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'new_draft_article') {
      toast.success(
        <div>
          <p className="font-bold">✨ New Draft Article Ready!</p>
          <p>{data.title}</p>
          <button onClick={() => router.push(`/admin/articles/edit/${data.slug}`)}>
            View Article
          </button>
        </div>,
        { duration: 30000 }
      );
    }
  };

  return () => eventSource.close();
}, []);
```

---

## Database Models

### ArticleRequest Model

**Location:** `src/models/articleRequest.ts`

```typescript
import mongoose from 'mongoose';

interface IArticleRequest {
  prompt: string;
  category: 'articles' | 'market-insights' | 'real-estate-tips';
  keywords: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';

  requestedBy: mongoose.Types.ObjectId; // User ID
  requestedAt: Date;

  startedAt?: Date;
  completedAt?: Date;

  resultFilePath?: string; // e.g., "src/posts/2025/article-slug.mdx"
  error?: string;
}

const ArticleRequestSchema = new mongoose.Schema<IArticleRequest>({
  prompt: { type: String, required: true },
  category: {
    type: String,
    enum: ['articles', 'market-insights', 'real-estate-tips'],
    required: true
  },
  keywords: [String],
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestedAt: { type: Date, default: Date.now },
  startedAt: Date,
  completedAt: Date,
  resultFilePath: String,
  error: String
}, { timestamps: true });

export default mongoose.models.ArticleRequest ||
  mongoose.model<IArticleRequest>('ArticleRequest', ArticleRequestSchema);
```

---

## Configuration

### Environment Variables

```bash
# VPS Credentials
VPS_HOST=147.182.236.138
VPS_PORT=22
VPS_USERNAME=root
VPS_PASSWORD=YOUR_VPS_PASSWORD

# GitHub (for webhook verification)
GITHUB_WEBHOOK_SECRET=your-webhook-secret

# MongoDB
MONGODB_URI=your-connection-string
```

### VPS Setup

1. **Install Claude Code:**
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. **Setup cron job:**
   ```bash
   # Edit crontab
   sudo crontab -e

   # Add line:
   */5 * * * * /usr/local/bin/claude-article-writer.sh >> /var/log/claude-article-writer.log 2>&1
   ```

3. **Create service script:**
   ```bash
   sudo nano /usr/local/bin/claude-article-writer.sh
   # Add content from above

   sudo chmod +x /usr/local/bin/claude-article-writer.sh
   ```

---

## Benefits

### vs. Manual Writing
- **Before:** 2-4 hours per article
- **After:** 5-10 minutes (just review)
- **Savings:** 95% time reduction

### vs. API Approach
- **Cost:** $0 (uses Claude Code CLI, no API charges)
- **Access:** Full codebase and database access
- **Style:** Learns from existing articles automatically
- **Workflow:** Fully automated (no copy-paste)

### vs. Other CMS Tools
- **Integration:** Native to your stack
- **Customization:** Follows your exact style guide
- **Control:** You own the entire pipeline
- **Scalability:** Can process multiple requests in queue

---

## Future Enhancements

- [ ] **Real-time progress updates** - Stream Claude's writing progress
- [ ] **Article templates** - Pre-defined article structures
- [ ] **Batch requests** - Queue multiple articles at once
- [ ] **Scheduled publishing** - Auto-publish at specified time
- [ ] **A/B testing** - Generate multiple versions for testing
- [ ] **SEO scoring** - Auto-analyze and improve SEO
- [ ] **Image suggestions** - Claude recommends Cloudinary images
- [ ] **Social media posts** - Auto-generate accompanying tweets/posts
- [ ] **Email notifications** - Get notified via email when draft ready

---

## Troubleshooting

### Request stuck in "pending"
- Check VPS cron job is running: `sudo service cron status`
- Check logs: `tail -f /var/log/claude-article-writer.log`
- Manually run: `/usr/local/bin/claude-article-writer.sh`

### Claude not pushing to GitHub
- Verify Git credentials on VPS
- Check Git remote: `git remote -v`
- Test manual push: `git push origin main`

### Notifications not appearing
- Check polling interval (default: 30s)
- Verify webhook secret matches
- Check browser console for errors

---

**Last Updated:** January 29, 2025
**Status:** Ready to implement
**Estimated Setup Time:** 2-3 hours
